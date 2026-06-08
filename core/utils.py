import cv2
import numpy as np

def bytes_to_cv2(image_bytes: bytes) -> np.ndarray:
    """
    Converts raw image bytes to an OpenCV numpy array (BGR format).
    """
    try:
        # Convert bytes to numpy array
        np_arr = np.frombuffer(image_bytes, np.uint8)
        # Decode the image
        img = cv2.imdecode(np_arr, cv2.IMREAD_COLOR)
        if img is None:
            raise ValueError("Failed to decode image from bytes.")
        return img
    except Exception as e:
        raise ValueError(f"Error reading image: {str(e)}")

def cv2_to_bytes(image_np: np.ndarray, ext: str = '.jpg') -> bytes:
    """
    Converts an OpenCV numpy array to raw image bytes.
    """
    try:
        success, encoded_image = cv2.imencode(ext, image_np)
        if not success:
            raise ValueError(f"Failed to encode image to {ext} format.")
        return encoded_image.tobytes()
    except Exception as e:
        raise ValueError(f"Error encoding image: {str(e)}")
