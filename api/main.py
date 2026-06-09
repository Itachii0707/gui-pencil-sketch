import os
import sys
from fastapi import FastAPI, UploadFile, File, Form, HTTPException, WebSocket, WebSocketDisconnect
from fastapi.responses import Response
from fastapi.middleware.cors import CORSMiddleware
from typing import List
import cv2
import numpy as np

# Add the parent directory to sys.path to import the core module
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from core import apply_effect, bytes_to_cv2, cv2_to_bytes

app = FastAPI(title="Pencil Sketch Advanced API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.post("/api/process")
async def process_image(
    file: UploadFile = File(...),
    effect: str = Form(...),
    blur_size: int = Form(21),
    do_bg_remove: bool = Form(False),
    do_super_res: bool = Form(False)
):
    try:
        image_bytes = await file.read()
        image_cv2 = bytes_to_cv2(image_bytes)
        
        processed_cv2 = apply_effect(
            image_np=image_cv2, 
            effect=effect, 
            blur_size=blur_size, 
            do_bg_remove=do_bg_remove, 
            do_super_res=do_super_res
        )
        
        processed_bytes = cv2_to_bytes(processed_cv2, ext=".jpg")
        return Response(content=processed_bytes, media_type="image/jpeg")
    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")

# Basic batch processing endpoint. In a real app, this might return a ZIP file.
# For simplicity, we just process and return a list of sizes or success messages.
@app.post("/api/batch")
async def process_batch(
    files: List[UploadFile] = File(...),
    effect: str = Form(...),
    watermark_text: str = Form("")
):
    results = []
    for file in files:
        try:
            image_bytes = await file.read()
            image_cv2 = bytes_to_cv2(image_bytes)
            
            processed = apply_effect(image_cv2, effect)
            
            # Simple Watermark
            if watermark_text:
                h, w = processed.shape[:2]
                cv2.putText(processed, watermark_text, (w - 150, h - 20), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (255, 255, 255), 2)
            
            # Here we could save them to a directory and return URLs.
            # We'll just return a success log for this demo.
            results.append({"filename": file.filename, "status": "success"})
        except Exception as e:
            results.append({"filename": file.filename, "status": "error", "detail": str(e)})
            
    return {"results": results}

@app.websocket("/api/stream")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    
    # Receive initial config
    config = await websocket.receive_json()
    effect = config.get("effect", "pencil")
    blur_size = config.get("blur_size", 21)
    
    try:
        while True:
            # Receive frame as bytes
            data = await websocket.receive_bytes()
            
            # Decode frame
            np_arr = np.frombuffer(data, np.uint8)
            frame = cv2.imdecode(np_arr, cv2.IMREAD_COLOR)
            
            if frame is not None:
                # Process frame
                processed = apply_effect(frame, effect=effect, blur_size=blur_size)
                
                # Encode and send back
                _, encoded = cv2.imencode('.jpg', processed, [int(cv2.IMWRITE_JPEG_QUALITY), 60])
                await websocket.send_bytes(encoded.tobytes())
                
    except WebSocketDisconnect:
        print("Client disconnected")
    except Exception as e:
        print(f"WebSocket error: {e}")
        await websocket.close()

@app.get("/")
@app.get("/api/health")
async def health_check():
    return {"status": "ok"}
