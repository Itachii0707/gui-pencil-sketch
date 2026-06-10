# Artify AI - Project Overview

## What is my Backend and Frontend?

### Frontend
- **Web Application:** Built using **Next.js** (React) and styled with **Tailwind CSS**. It is deployed on **Vercel**. It provides a sleek, modern, glassmorphic UI for users to upload images or use their live webcam.
- **Desktop Application:** A local GUI built using **PyQt6**, providing a native Windows experience with the exact same image processing capabilities.

### Backend
- **API Server:** Built using **FastAPI** (Python). It handles the heavy computational lifting (image processing, AI stylization).
- **Deployment:** The backend is containerized using Docker and deployed on **Hugging Face Spaces**. It exposes REST API endpoints for image processing and WebSocket endpoints for live video streaming.

---

## Why was this created and what is the purpose?

### The Purpose
**Artify AI** was created to democratize AI art generation by providing an accessible, real-time creative studio. The goal is to allow users to instantly transform their ordinary photos and webcam feeds into stunning, high-quality artworks without needing expensive hardware or complex software like Photoshop. 

### Why this specific architecture?
The project separates the frontend (Next.js) from the backend (FastAPI). This decoupled architecture allows the UI to remain incredibly fast and responsive on Vercel, while delegating the CPU-intensive AI model processing to a dedicated environment on Hugging Face Spaces. It also allows the same backend logic (`core` folder) to be shared seamlessly with the Desktop app.

---

## Why were these specific softwares, libraries, and models used?

### Core Technologies
- **OpenCV (`cv2`):** Chosen as the core image processing engine because it is highly optimized, fast (written in C++ under the hood), and natively supports deep learning inference without needing the massive overhead of PyTorch or TensorFlow.
- **FastAPI:** Selected for the backend because it is one of the fastest Python web frameworks available. It natively supports asynchronous requests and WebSockets, which is crucial for handling real-time video feeds from the webcam.
- **Next.js & Tailwind CSS:** Used for the frontend to create a highly responsive, modern, and interactive user interface. Next.js handles routing and API integrations flawlessly, while Tailwind allows for rapid, beautiful UI styling.

### AI Models & Algorithms
- **Neural Style Transfer (`.t7` models):** We use pre-trained Torch models (like Mosaic, Candy, Starry Night, Udnie) loaded directly into OpenCV's DNN module. This allows us to apply complex artistic styles to images in milliseconds rather than seconds.
- **Custom OpenCV Filters:** For styles like Cartoon, Pencil, and Anime, we use native OpenCV algorithms (Bilateral Filtering, Adaptive Thresholding, Gaussian Blurs). These are used because they are computationally cheap, run instantly on any hardware, and produce crisp, reliable results.
- **Rembg (U-2-Net):** Used for the "AI Background Removal" feature because it provides state-of-the-art salient object detection, accurately cleanly removing backgrounds from portraits and objects.
- **ESPCN_x4:** An Efficient Sub-Pixel Convolutional Neural Network used for the "Super Resolution" feature. It was chosen because it provides high-quality 4x upscaling while remaining lightweight enough to run quickly on CPUs.

---

## Live Access Links

- **Live Web Application:** [https://web-three-sigma-12.vercel.app/](https://web-three-sigma-12.vercel.app/)
- **Live API Documentation (Swagger UI):** [https://ayush7986-pencil-sketch-api.hf.space/docs](https://ayush7986-pencil-sketch-api.hf.space/docs)
- **Hugging Face Space:** [https://huggingface.co/spaces/ayush7986/pencil-sketch-api](https://huggingface.co/spaces/ayush7986/pencil-sketch-api)
- **GitHub Repository:** [https://github.com/Itachii0707/gui-pencil-sketch](https://github.com/Itachii0707/gui-pencil-sketch)
