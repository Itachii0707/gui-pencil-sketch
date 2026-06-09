"use client";

import { useState, useRef, useEffect } from "react";
import { UploadCloud, ImageIcon, Download, Loader2, Sparkles, RefreshCcw, Camera, Settings2 } from "lucide-react";

export default function Home() {
  const [activeTab, setActiveTab] = useState<"image" | "camera">("image");
  
  // Image Tab State
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [processedUrl, setProcessedUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Settings State
  const [effect, setEffect] = useState<string>("pencil");
  const [blurSize, setBlurSize] = useState<number>(21);
  const [bgRemove, setBgRemove] = useState<boolean>(false);
  const [superRes, setSuperRes] = useState<boolean>(false);

  // Camera Tab State
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const [camActive, setCamActive] = useState(false);
  const [liveResult, setLiveResult] = useState<string | null>(null);

  // --- Image Processing Logic ---

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      setFile(selectedFile);
      setPreviewUrl(URL.createObjectURL(selectedFile));
      setProcessedUrl(null);
      setError(null);
    }
  };

  const processImage = async () => {
    if (!file) return;
    setLoading(true);
    setError(null);

    const formData = new FormData();
    formData.append("file", file);
    formData.append("effect", effect);
    formData.append("blur_size", blurSize.toString());
    formData.append("do_bg_remove", bgRemove ? "true" : "false");
    formData.append("do_super_res", superRes ? "true" : "false");

    try {
      const res = await fetch("https://ayush7986-pencil-sketch-api.hf.space/api/process", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) throw new Error(await res.text());

      const blob = await res.blob();
      setProcessedUrl(URL.createObjectURL(blob));
    } catch (err: any) {
      setError(err.message || "Failed to process image");
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    setFile(null);
    setPreviewUrl(null);
    setProcessedUrl(null);
    setError(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // --- Webcam Logic ---

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
      setCamActive(true);
      
      // Connect WS
      wsRef.current = new WebSocket("wss://ayush7986-pencil-sketch-api.hf.space/api/stream");
      wsRef.current.onopen = () => {
        wsRef.current?.send(JSON.stringify({ effect, blur_size: blurSize }));
        sendFrame(); // Start sending loop
      };
      
      wsRef.current.onmessage = async (event) => {
        const blob = new Blob([event.data], { type: "image/jpeg" });
        setLiveResult(URL.createObjectURL(blob));
      };

    } catch (err) {
      setError("Failed to access camera.");
    }
  };

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
    }
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    setCamActive(false);
    setLiveResult(null);
  };

  const sendFrame = () => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN || !camActive) return;
    
    if (videoRef.current && canvasRef.current) {
      const context = canvasRef.current.getContext("2d");
      canvasRef.current.width = videoRef.current.videoWidth;
      canvasRef.current.height = videoRef.current.videoHeight;
      context?.drawImage(videoRef.current, 0, 0);
      
      canvasRef.current.toBlob((blob) => {
        if (blob) wsRef.current?.send(blob);
        // Request next frame after small delay
        setTimeout(sendFrame, 100); 
      }, "image/jpeg", 0.7);
    } else {
      setTimeout(sendFrame, 100);
    }
  };

  // Update WS config when settings change
  useEffect(() => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      // Hack: we don't have a specific config endpoint in WS, so we rely on reconnect or ignoring live update for now.
      // In a robust implementation, the WS loop would handle text config frames.
    }
  }, [effect, blurSize]);

  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 font-sans selection:bg-indigo-500/30">
      {/* Background gradients */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-indigo-600/20 blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-fuchsia-600/20 blur-[120px]" />
      </div>

      <main className="relative max-w-7xl mx-auto px-6 py-12 flex flex-col gap-8">
        
        <header className="text-center space-y-4 pt-4">
          <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-fuchsia-400 to-rose-400">
            Advanced Artistic Engine
          </h1>
        </header>

        {/* Tab Navigation */}
        <div className="flex justify-center gap-4">
          <button 
            onClick={() => { setActiveTab("image"); stopCamera(); }}
            className={`px-6 py-3 rounded-2xl font-bold flex items-center gap-2 transition-all ${activeTab === "image" ? "bg-white text-black" : "bg-white/10 hover:bg-white/20"}`}
          >
            <ImageIcon className="w-5 h-5" /> Image Processing
          </button>
          <button 
            onClick={() => setActiveTab("camera")}
            className={`px-6 py-3 rounded-2xl font-bold flex items-center gap-2 transition-all ${activeTab === "camera" ? "bg-white text-black" : "bg-white/10 hover:bg-white/20"}`}
          >
            <Camera className="w-5 h-5" /> Live Camera
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* Controls Sidebar */}
          <aside className="lg:col-span-4 p-6 rounded-3xl bg-white/[0.02] border border-white/10 backdrop-blur-xl shadow-2xl flex flex-col gap-6">
            
            {/* Effect Selection */}
            <div>
              <h2 className="text-xl font-semibold mb-4 text-white flex items-center gap-2"><Settings2 className="w-5 h-5" /> Effect Style</h2>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { id: 'pencil', label: 'Pencil' },
                  { id: 'color_pencil', label: 'Color Sketch' },
                  { id: 'watercolor', label: 'Watercolor' },
                  { id: 'cartoon', label: 'Cartoon' },
                  { id: 'style_mosaic', label: 'Mosaic (AI)' },
                  { id: 'style_candy', label: 'Candy (AI)' }
                ].map((eff) => (
                  <button
                    key={eff.id}
                    onClick={() => setEffect(eff.id)}
                    className={`p-3 rounded-xl text-sm font-medium transition-all duration-200 ${
                      effect === eff.id 
                        ? 'bg-indigo-500 text-white shadow-lg shadow-indigo-500/25 ring-1 ring-indigo-400' 
                        : 'bg-white/5 text-slate-300 hover:bg-white/10'
                    }`}
                  >
                    {eff.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="h-px w-full bg-gradient-to-r from-transparent via-white/10 to-transparent" />

            {/* Parameter Sliders */}
            <div className="space-y-4">
              <h2 className="text-xl font-semibold text-white">Dynamic Parameters</h2>
              
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Blur Amount (Detail)</span>
                  <span className="text-indigo-400 font-mono">{blurSize}</span>
                </div>
                <input 
                  type="range" min="3" max="51" step="2"
                  value={blurSize}
                  onChange={(e) => setBlurSize(parseInt(e.target.value))}
                  className="w-full accent-indigo-500"
                />
              </div>

              {activeTab === "image" && (
                <div className="space-y-3 pt-4">
                  <h3 className="text-md font-medium text-slate-300">AI Pre-Processing (Heavy)</h3>
                  
                  <label className="flex items-center gap-3 cursor-pointer group">
                    <div className={`w-6 h-6 rounded flex items-center justify-center border transition-colors ${bgRemove ? 'bg-fuchsia-500 border-fuchsia-500' : 'border-slate-600 group-hover:border-slate-400'}`}>
                      {bgRemove && <Sparkles className="w-4 h-4 text-white" />}
                    </div>
                    <span className="select-none">Remove Background (rembg)</span>
                    <input type="checkbox" className="hidden" checked={bgRemove} onChange={(e) => setBgRemove(e.target.checked)} />
                  </label>

                  <label className="flex items-center gap-3 cursor-pointer group">
                    <div className={`w-6 h-6 rounded flex items-center justify-center border transition-colors ${superRes ? 'bg-fuchsia-500 border-fuchsia-500' : 'border-slate-600 group-hover:border-slate-400'}`}>
                      {superRes && <Sparkles className="w-4 h-4 text-white" />}
                    </div>
                    <span className="select-none">Super Resolution (ESPCN)</span>
                    <input type="checkbox" className="hidden" checked={superRes} onChange={(e) => setSuperRes(e.target.checked)} />
                  </label>
                </div>
              )}
            </div>

            <div className="h-px w-full bg-gradient-to-r from-transparent via-white/10 to-transparent" />

            {activeTab === "image" && (
              <div>
                <button
                  onClick={processImage}
                  disabled={!file || loading}
                  className="w-full py-4 rounded-xl font-bold flex items-center justify-center gap-2 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed bg-gradient-to-r from-indigo-500 to-fuchsia-500 hover:from-indigo-400 hover:to-fuchsia-400 text-white shadow-lg shadow-indigo-500/25"
                >
                  {loading ? <><Loader2 className="w-5 h-5 animate-spin" /> Processing...</> : <><Sparkles className="w-5 h-5" /> Generate Art</>}
                </button>
              </div>
            )}
            {error && <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">{error}</div>}
          </aside>

          {/* Main Display Area */}
          <section className="lg:col-span-8 flex flex-col gap-6">
            
            {activeTab === "image" ? (
              // IMAGE TAB CONTENT
              !previewUrl ? (
                <div onClick={() => fileInputRef.current?.click()} className="h-[500px] w-full rounded-3xl border-2 border-dashed border-white/20 bg-white/[0.02] hover:bg-white/[0.04] flex flex-col items-center justify-center gap-6 cursor-pointer group">
                  <div className="p-6 rounded-full bg-indigo-500/10 text-indigo-400 group-hover:scale-110 group-hover:bg-indigo-500/20 transition-all"><UploadCloud className="w-12 h-12" /></div>
                  <h3 className="text-2xl font-semibold text-white">Upload your photo</h3>
                </div>
              ) : (
                <div className="flex flex-col gap-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="flex flex-col gap-3">
                      <span className="text-sm font-medium text-slate-400 flex items-center gap-2"><ImageIcon className="w-4 h-4" /> Original</span>
                      <div className="relative aspect-[4/3] rounded-3xl overflow-hidden bg-black/40 border border-white/10">
                        <img src={previewUrl} alt="Original" className="object-contain w-full h-full" />
                      </div>
                    </div>

                    <div className="flex flex-col gap-3">
                      <span className="text-sm font-medium text-indigo-400 flex items-center gap-2"><Sparkles className="w-4 h-4" /> Result</span>
                      <div className="relative aspect-[4/3] rounded-3xl overflow-hidden bg-black/40 border border-white/10 flex items-center justify-center">
                        {processedUrl ? <img src={processedUrl} alt="Processed" className="object-contain w-full h-full" /> : 
                          loading ? <Loader2 className="w-8 h-8 animate-spin text-indigo-400" /> : <span className="text-slate-600">Waiting to process</span>}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-4 p-4 rounded-2xl bg-white/[0.02] border border-white/10">
                    <button onClick={reset} className="px-6 py-2.5 rounded-xl text-sm font-medium hover:bg-white/10 flex items-center gap-2"><RefreshCcw className="w-4 h-4" /> Start Over</button>
                    {processedUrl && <a href={processedUrl} download={`art_${effect}.jpg`} className="px-6 py-2.5 rounded-xl text-sm font-semibold bg-white text-black hover:bg-slate-200 flex items-center gap-2"><Download className="w-4 h-4" /> Download Art</a>}
                  </div>
                </div>
              )
            ) : (
              // CAMERA TAB CONTENT
              <div className="flex flex-col gap-6">
                {!camActive ? (
                  <div className="h-[500px] w-full rounded-3xl border border-white/10 bg-black/40 flex flex-col items-center justify-center gap-6">
                    <Camera className="w-16 h-16 text-slate-600" />
                    <button onClick={startCamera} className="px-8 py-4 rounded-xl font-bold bg-indigo-500 hover:bg-indigo-400 text-white">Activate Webcam</button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="flex flex-col gap-3">
                      <span className="text-sm font-medium text-slate-400">Raw Feed</span>
                      <div className="relative aspect-[4/3] rounded-3xl overflow-hidden bg-black">
                        <video ref={videoRef} className="w-full h-full object-cover scale-x-[-1]" muted />
                        <canvas ref={canvasRef} className="hidden" />
                      </div>
                    </div>
                    <div className="flex flex-col gap-3">
                      <span className="text-sm font-medium text-indigo-400">Live AI Rendering</span>
                      <div className="relative aspect-[4/3] rounded-3xl overflow-hidden bg-black flex items-center justify-center border border-indigo-500/30 shadow-[0_0_30px_rgba(99,102,241,0.2)]">
                        {liveResult ? <img src={liveResult} className="w-full h-full object-cover scale-x-[-1]" alt="Live Render" /> : <Loader2 className="w-8 h-8 animate-spin text-indigo-400" />}
                      </div>
                    </div>
                  </div>
                )}
                {camActive && (
                  <div className="flex justify-center">
                    <button onClick={stopCamera} className="px-8 py-3 rounded-xl font-bold bg-red-500/20 text-red-400 hover:bg-red-500/30 border border-red-500/30">Stop Camera</button>
                  </div>
                )}
              </div>
            )}

            <input type="file" className="hidden" ref={fileInputRef} onChange={handleFileChange} accept="image/*" />
          </section>
        </div>
      </main>
    </div>
  );
}
