import cv2
import numpy as np
from .models_downloader import ensure_model
try:
    from rembg import remove
except ImportError:
    remove = None

def remove_background(image_np: np.ndarray) -> np.ndarray:
    """Removes the background using rembg."""
    if remove is None:
        raise ValueError("rembg is not installed.")
    
    # rembg expects RGB or RGBA, cv2 uses BGR. We'll pass BGR directly 
    # but technically rembg works best with bytes or PIL. Let's convert to bytes and back.
    success, encoded = cv2.imencode('.png', image_np)
    if not success:
        raise ValueError("Failed to encode image for background removal")
        
    result_bytes = remove(encoded.tobytes())
    np_arr = np.frombuffer(result_bytes, np.uint8)
    return cv2.imdecode(np_arr, cv2.IMREAD_UNCHANGED)

def super_resolve(image_np: np.ndarray) -> np.ndarray:
    """Upscales image using ESPCN_x4."""
    model_path = ensure_model("espcn_x4")
    
    sr = cv2.dnn_superres.DnnSuperResImpl_create()
    sr.readModel(model_path)
    sr.setModel("espcn", 4)
    
    return sr.upsample(image_np)

def apply_style_transfer(image_np: np.ndarray, style: str = "style_mosaic") -> np.ndarray:
    """Applies Neural Style Transfer."""
    model_path = ensure_model(style)
    
    net = cv2.dnn.readNetFromTorch(model_path)
    h, w = image_np.shape[:2]
    
    blob = cv2.dnn.blobFromImage(image_np, 1.0, (w, h), (103.939, 116.779, 123.680), swapRB=False, crop=False)
    net.setInput(blob)
    out = net.forward()
    
    # Post-process the output
    out = out.reshape((3, out.shape[2], out.shape[3]))
    out[0] += 103.939
    out[1] += 116.779
    out[2] += 123.680
    out /= 255.0
    out = out.transpose(1, 2, 0)
    out = np.clip(out, 0.0, 1.0)
    return (out * 255.0).astype(np.uint8)

def apply_pencil_sketch(image_np: np.ndarray, blur_size: int = 21, **kwargs) -> np.ndarray:
    if blur_size % 2 == 0:
        blur_size += 1 # Must be odd
    gray = cv2.cvtColor(image_np, cv2.COLOR_BGR2GRAY)
    inverted_gray = cv2.bitwise_not(gray)
    blurred = cv2.GaussianBlur(inverted_gray, (blur_size, blur_size), 0)
    inverted_blurred = cv2.bitwise_not(blurred)
    sketch = cv2.divide(gray, inverted_blurred, scale=256.0)
    return cv2.cvtColor(sketch, cv2.COLOR_GRAY2BGR)

def apply_color_sketch(image_np: np.ndarray, blur_size: int = 21, **kwargs) -> np.ndarray:
    gray_sketch = apply_pencil_sketch(image_np, blur_size)
    gray_single = cv2.cvtColor(gray_sketch, cv2.COLOR_BGR2GRAY)
    smoothed = cv2.bilateralFilter(image_np, d=9, sigmaColor=75, sigmaSpace=75)
    color_sketch = np.zeros_like(image_np)
    for c in range(3):
        color_sketch[:, :, c] = cv2.multiply(smoothed[:, :, c], gray_single, scale=1/255.0)
    return color_sketch

def apply_watercolor(image_np: np.ndarray, sigma_s: float = 60, sigma_r: float = 0.6, **kwargs) -> np.ndarray:
    return cv2.stylization(image_np, sigma_s=sigma_s, sigma_r=sigma_r)

def apply_cartoon(image_np: np.ndarray, **kwargs) -> np.ndarray:
    gray = cv2.cvtColor(image_np, cv2.COLOR_BGR2GRAY)
    gray = cv2.medianBlur(gray, 5)
    edges = cv2.adaptiveThreshold(gray, 255, cv2.ADAPTIVE_THRESH_MEAN_C, cv2.THRESH_BINARY, 9, 9)
    color = cv2.bilateralFilter(image_np, 9, 300, 300)
    cartoon = cv2.bitwise_and(color, color, mask=edges)
    return cartoon

def apply_anime(image_np: np.ndarray, **kwargs) -> np.ndarray:
    # Smooth the image heavily to remove texture but keep edges
    color = cv2.bilateralFilter(image_np, 9, 250, 250)
    
    # Increase color saturation
    hsv = cv2.cvtColor(color, cv2.COLOR_BGR2HSV).astype(np.float32)
    hsv[:,:,1] = np.clip(hsv[:,:,1] * 1.5, 0, 255) # boost saturation
    hsv[:,:,2] = np.clip(hsv[:,:,2] * 1.1, 0, 255) # slightly boost brightness
    color = cv2.cvtColor(hsv.astype(np.uint8), cv2.HSV2BGR)
    
    # Detect edges to draw anime-style outlines
    gray = cv2.cvtColor(image_np, cv2.COLOR_BGR2GRAY)
    gray = cv2.medianBlur(gray, 5)
    edges = cv2.adaptiveThreshold(gray, 255, cv2.ADAPTIVE_THRESH_MEAN_C, cv2.THRESH_BINARY, 9, 7)
    
    # Combine edges with the smoothed colors
    anime = cv2.bitwise_and(color, color, mask=edges)
    return anime

def apply_effect(
    image_np: np.ndarray, 
    effect: str, 
    blur_size: int = 21,
    do_bg_remove: bool = False,
    do_super_res: bool = False
) -> np.ndarray:
    """Dispatcher to apply effects with AI pre-processing."""
    
    # 1. Background removal
    if do_bg_remove:
        image_np = remove_background(image_np)
        
        # If the result has alpha, blend it onto a white background to avoid 
        # issues with sketching algorithms that expect 3 channels
        if image_np.shape[2] == 4:
            alpha_channel = image_np[:, :, 3] / 255.0
            white_bg = np.ones_like(image_np[:, :, :3], dtype=np.uint8) * 255
            for c in range(3):
                white_bg[:, :, c] = alpha_channel * image_np[:, :, c] + (1 - alpha_channel) * white_bg[:, :, c]
            image_np = white_bg

    # 2. Super Resolution
    if do_super_res:
        image_np = super_resolve(image_np)

    # 3. Main Effect
    effects = {
        "pencil": apply_pencil_sketch,
        "color_pencil": apply_color_sketch,
        "watercolor": apply_watercolor,
        "cartoon": apply_cartoon,
        "style_mosaic": lambda img, **k: apply_style_transfer(img, "style_mosaic"),
        "style_candy": lambda img, **k: apply_style_transfer(img, "style_candy"),
        "style_starry_night": lambda img, **k: apply_style_transfer(img, "style_starry_night"),
        "style_anime": apply_anime,
        "style_3d": lambda img, **k: apply_style_transfer(img, "style_3d")
    }
    
    if effect != "none":
        if effect not in effects:
            raise ValueError(f"Unknown effect: {effect}")
        image_np = effects[effect](image_np, blur_size=blur_size)
        
    return image_np
