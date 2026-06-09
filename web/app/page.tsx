"use client";

import { useState, useRef, useEffect } from "react";
import { UploadCloud, ImageIcon, Download, Loader2, Sparkles, RefreshCcw, Camera, Settings2, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function Home() {
  const [activeTab, setActiveTab] = useState<"image" | "camera">("image");
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  
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
      // On mobile, automatically open settings when file is chosen
      if (window.innerWidth < 1024) setIsMobileMenuOpen(true);
    }
  };

  const processImage = async () => {
    if (!file) return;
    setLoading(true);
    setError(null);
    setIsMobileMenuOpen(false); // Close mobile menu while generating

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
      
      wsRef.current = new WebSocket("wss://ayush7986-pencil-sketch-api.hf.space/api/stream");
      wsRef.current.onopen = () => {
        wsRef.current?.send(JSON.stringify({ effect, blur_size: blurSize }));
        sendFrame();
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
        setTimeout(sendFrame, 100); 
      }, "image/jpeg", 0.7);
    } else {
      setTimeout(sendFrame, 100);
    }
  };

  useEffect(() => {
    return () => { stopCamera(); };
  }, []);

  const ControlsPanel = () => (
    <div className="flex flex-col gap-8">
      {/* Effect Selection */}
      <div>
        <h2 className="text-xl font-semibold mb-4 text-white flex items-center gap-2">
          <Settings2 className="w-5 h-5 text-indigo-400" /> Style
        </h2>
        <div className="grid grid-cols-2 gap-3">
          {[
            { id: 'pencil', label: 'Pencil' },
            { id: 'color_pencil', label: 'Color Sketch' },
            { id: 'watercolor', label: 'Watercolor' },
            { id: 'cartoon', label: 'Cartoon' },
            { id: 'style_mosaic', label: 'Mosaic (AI)' },
            { id: 'style_candy', label: 'Candy (AI)' }
          ].map((eff) => (
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              key={eff.id}
              onClick={() => setEffect(eff.id)}
              className={`p-3 rounded-2xl text-sm font-medium transition-all duration-300 border ${
                effect === eff.id 
                  ? 'bg-indigo-500/20 text-indigo-300 border-indigo-500/50 shadow-[0_0_15px_rgba(99,102,241,0.2)]' 
                  : 'bg-white/5 text-slate-400 border-transparent hover:bg-white/10 hover:text-white'
              }`}
            >
              {eff.label}
            </motion.button>
          ))}
        </div>
      </div>

      <div className="h-px w-full bg-gradient-to-r from-transparent via-white/10 to-transparent" />

      {/* Parameter Sliders */}
      <div className="space-y-6">
        <h2 className="text-xl font-semibold text-white">Refinement</h2>
        
        <div className="space-y-3 bg-white/5 p-4 rounded-2xl border border-white/5">
          <div className="flex justify-between text-sm">
            <span className="text-slate-300">Blur Amount (Detail)</span>
            <span className="text-indigo-400 font-mono bg-indigo-500/10 px-2 py-0.5 rounded">{blurSize}</span>
          </div>
          <input 
            type="range" min="3" max="51" step="2"
            value={blurSize}
            onChange={(e) => setBlurSize(parseInt(e.target.value))}
            className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-500"
          />
        </div>

        {activeTab === "image" && (
          <div className="space-y-3 pt-2">
            <h3 className="text-sm font-medium text-slate-400 uppercase tracking-wider mb-4">AI Enhancements</h3>
            
            <label className="flex items-center justify-between p-4 rounded-2xl bg-white/5 border border-white/5 cursor-pointer hover:bg-white/10 transition-colors group">
              <span className="text-slate-200 select-none">Remove Background</span>
              <div className={`w-12 h-6 rounded-full transition-colors relative flex items-center ${bgRemove ? 'bg-fuchsia-500' : 'bg-slate-700'}`}>
                <motion.div layout className={`w-4 h-4 bg-white rounded-full mx-1 ${bgRemove ? 'ml-auto' : ''}`} />
              </div>
              <input type="checkbox" className="hidden" checked={bgRemove} onChange={(e) => setBgRemove(e.target.checked)} />
            </label>

            <label className="flex items-center justify-between p-4 rounded-2xl bg-white/5 border border-white/5 cursor-pointer hover:bg-white/10 transition-colors group">
              <span className="text-slate-200 select-none">Super Resolution</span>
              <div className={`w-12 h-6 rounded-full transition-colors relative flex items-center ${superRes ? 'bg-fuchsia-500' : 'bg-slate-700'}`}>
                <motion.div layout className={`w-4 h-4 bg-white rounded-full mx-1 ${superRes ? 'ml-auto' : ''}`} />
              </div>
              <input type="checkbox" className="hidden" checked={superRes} onChange={(e) => setSuperRes(e.target.checked)} />
            </label>
          </div>
        )}
      </div>

      <div className="h-px w-full bg-gradient-to-r from-transparent via-white/10 to-transparent hidden lg:block" />

      {activeTab === "image" && (
        <div className="pt-4 pb-8 lg:pb-0">
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={processImage}
            disabled={!file || loading}
            className="w-full py-4 rounded-2xl font-bold flex items-center justify-center gap-2 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed bg-gradient-to-r from-indigo-500 to-fuchsia-500 hover:from-indigo-400 hover:to-fuchsia-400 text-white shadow-[0_0_30px_rgba(99,102,241,0.3)]"
          >
            {loading ? <><Loader2 className="w-5 h-5 animate-spin" /> Rendering Art...</> : <><Sparkles className="w-5 h-5" /> Generate Masterpiece</>}
          </motion.button>
        </div>
      )}
      {error && <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm text-center">{error}</div>}
    </div>
  );

  return (
    <div className="min-h-screen selection:bg-indigo-500/30 pb-24 lg:pb-0 relative">
      {/* Background gradients */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] rounded-full bg-indigo-600/20 blur-[150px]" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] rounded-full bg-fuchsia-600/20 blur-[150px]" />
      </div>

      <main className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 py-8 flex flex-col gap-8">
        
        <header className="text-center space-y-4 pt-4">
          <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="inline-block">
            <span className="px-4 py-1.5 rounded-full bg-white/5 border border-white/10 text-sm font-medium text-indigo-300 mb-4 inline-block">AI Vision System</span>
          </motion.div>
          <motion.h1 initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-4xl md:text-6xl font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-fuchsia-400 to-rose-400">
            Advanced Artistic Engine
          </motion.h1>
        </header>

        {/* Tab Navigation */}
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="flex justify-center gap-3 p-1.5 bg-white/5 rounded-3xl w-fit mx-auto border border-white/10 backdrop-blur-md">
          <button 
            onClick={() => { setActiveTab("image"); stopCamera(); }}
            className={`px-6 py-3 rounded-2xl font-bold flex items-center gap-2 transition-all duration-300 relative`}
          >
            {activeTab === "image" && <motion.div layoutId="activeTab" className="absolute inset-0 bg-white rounded-2xl" />}
            <span className={`relative z-10 flex items-center gap-2 ${activeTab === "image" ? "text-slate-900" : "text-slate-400 hover:text-white"}`}>
              <ImageIcon className="w-5 h-5" /> Image
            </span>
          </button>
          <button 
            onClick={() => setActiveTab("camera")}
            className={`px-6 py-3 rounded-2xl font-bold flex items-center gap-2 transition-all duration-300 relative`}
          >
            {activeTab === "camera" && <motion.div layoutId="activeTab" className="absolute inset-0 bg-white rounded-2xl" />}
            <span className={`relative z-10 flex items-center gap-2 ${activeTab === "camera" ? "text-slate-900" : "text-slate-400 hover:text-white"}`}>
              <Camera className="w-5 h-5" /> Live Camera
            </span>
          </button>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start mt-4">
          
          {/* Desktop Controls Sidebar */}
          <aside className="hidden lg:flex lg:col-span-4 p-8 rounded-[2rem] bg-white/[0.02] border border-white/10 backdrop-blur-2xl shadow-2xl flex-col gap-6 sticky top-8">
            <ControlsPanel />
          </aside>

          {/* Main Display Area */}
          <section className="lg:col-span-8 flex flex-col gap-6">
            <AnimatePresence mode="wait">
              {activeTab === "image" ? (
                <motion.div key="image" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="flex flex-col gap-6">
                  {!previewUrl ? (
                    <motion.div whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }} onClick={() => fileInputRef.current?.click()} className="h-[400px] md:h-[500px] w-full rounded-[2.5rem] border-2 border-dashed border-white/20 bg-white/[0.02] hover:bg-white/[0.05] hover:border-indigo-500/50 flex flex-col items-center justify-center gap-6 cursor-pointer group transition-all backdrop-blur-sm">
                      <div className="p-6 rounded-full bg-indigo-500/10 text-indigo-400 group-hover:scale-110 group-hover:bg-indigo-500/20 group-hover:shadow-[0_0_30px_rgba(99,102,241,0.3)] transition-all duration-500"><UploadCloud className="w-12 h-12" /></div>
                      <h3 className="text-2xl font-semibold text-white">Upload your photo</h3>
                      <p className="text-slate-400">Click or drag & drop</p>
                    </motion.div>
                  ) : (
                    <div className="flex flex-col gap-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="flex flex-col gap-3">
                          <span className="text-sm font-medium text-slate-400 flex items-center gap-2"><ImageIcon className="w-4 h-4" /> Original</span>
                          <div className="relative aspect-[4/3] rounded-[2rem] overflow-hidden bg-black/40 border border-white/10 shadow-xl">
                            <img src={previewUrl} alt="Original" className="object-cover w-full h-full" />
                          </div>
                        </div>

                        <div className="flex flex-col gap-3">
                          <span className="text-sm font-medium text-indigo-400 flex items-center gap-2"><Sparkles className="w-4 h-4" /> Result</span>
                          <div className="relative aspect-[4/3] rounded-[2rem] overflow-hidden bg-black/40 border border-indigo-500/30 flex items-center justify-center shadow-[0_0_30px_rgba(99,102,241,0.1)]">
                            {processedUrl ? (
                              <motion.img initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} src={processedUrl} alt="Processed" className="object-cover w-full h-full" />
                            ) : loading ? (
                              <div className="flex flex-col items-center gap-4 text-indigo-400">
                                <Loader2 className="w-10 h-10 animate-spin" />
                                <span className="font-medium animate-pulse">Rendering...</span>
                              </div>
                            ) : (
                              <span className="text-slate-600 font-medium">Waiting to process</span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center justify-center sm:justify-end gap-4 p-4 rounded-3xl bg-white/[0.02] border border-white/10 backdrop-blur-md">
                        <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={reset} className="px-6 py-3 rounded-2xl text-sm font-medium text-slate-300 hover:text-white hover:bg-white/10 flex items-center gap-2 transition-colors"><RefreshCcw className="w-4 h-4" /> Start Over</motion.button>
                        {processedUrl && (
                          <motion.a whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} href={processedUrl} download={`art_${effect}.jpg`} className="px-6 py-3 rounded-2xl text-sm font-bold bg-white text-black shadow-lg hover:shadow-xl flex items-center gap-2 transition-all"><Download className="w-4 h-4" /> Download Masterpiece</motion.a>
                        )}
                        {/* Mobile trigger for settings if image is uploaded */}
                        <button onClick={() => setIsMobileMenuOpen(true)} className="lg:hidden px-6 py-3 rounded-2xl text-sm font-bold bg-indigo-500 text-white shadow-lg flex items-center gap-2"><Settings2 className="w-4 h-4" /> Adjust Settings</button>
                      </div>
                    </div>
                  )}
                </motion.div>
              ) : (
                <motion.div key="camera" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="flex flex-col gap-6">
                  {!camActive ? (
                    <div className="h-[400px] md:h-[500px] w-full rounded-[2.5rem] border border-white/10 bg-black/40 flex flex-col items-center justify-center gap-8 backdrop-blur-sm shadow-xl">
                      <div className="p-8 rounded-full bg-white/5"><Camera className="w-16 h-16 text-slate-500" /></div>
                      <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={startCamera} className="px-8 py-4 rounded-2xl font-bold bg-indigo-500 text-white shadow-[0_0_30px_rgba(99,102,241,0.4)] hover:bg-indigo-400">Activate Webcam</motion.button>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="flex flex-col gap-3">
                        <span className="text-sm font-medium text-slate-400">Raw Feed</span>
                        <div className="relative aspect-[4/3] rounded-[2rem] overflow-hidden bg-black shadow-xl">
                          <video ref={videoRef} className="w-full h-full object-cover scale-x-[-1]" muted />
                          <canvas ref={canvasRef} className="hidden" />
                        </div>
                      </div>
                      <div className="flex flex-col gap-3">
                        <span className="text-sm font-medium text-indigo-400 flex items-center gap-2"><Sparkles className="w-4 h-4" /> Live AI Render</span>
                        <div className="relative aspect-[4/3] rounded-[2rem] overflow-hidden bg-black flex items-center justify-center border border-indigo-500/40 shadow-[0_0_40px_rgba(99,102,241,0.2)]">
                          {liveResult ? <img src={liveResult} className="w-full h-full object-cover scale-x-[-1]" alt="Live Render" /> : <Loader2 className="w-10 h-10 animate-spin text-indigo-400" />}
                        </div>
                      </div>
                    </div>
                  )}
                  {camActive && (
                    <div className="flex justify-center p-4">
                      <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={stopCamera} className="px-8 py-3 rounded-2xl font-bold bg-red-500/10 text-red-400 hover:bg-red-500/20 border border-red-500/20 backdrop-blur-md">Stop Camera</motion.button>
                      <button onClick={() => setIsMobileMenuOpen(true)} className="lg:hidden ml-4 px-6 py-3 rounded-2xl text-sm font-bold bg-white/10 text-white shadow-lg flex items-center gap-2 border border-white/10"><Settings2 className="w-4 h-4" /> Settings</button>
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>

            <input type="file" className="hidden" ref={fileInputRef} onChange={handleFileChange} accept="image/*" />
          </section>
        </div>
      </main>

      {/* Mobile Sticky Bottom Bar / Bottom Sheet */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <>
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setIsMobileMenuOpen(false)}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden"
            />
            <motion.div 
              initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="fixed bottom-0 left-0 right-0 max-h-[85vh] overflow-y-auto bg-slate-900 border-t border-white/10 z-50 rounded-t-[2.5rem] p-6 lg:hidden shadow-[0_-10px_40px_rgba(0,0,0,0.5)]"
            >
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold">Settings</h2>
                <button onClick={() => setIsMobileMenuOpen(false)} className="p-2 bg-white/5 rounded-full"><X className="w-5 h-5" /></button>
              </div>
              <ControlsPanel />
            </motion.div>
          </>
        )}
      </AnimatePresence>

    </div>
  );
}
