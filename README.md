# Pencil Sketch App (Desktop & Web)

This is a production-grade application for applying various sketch and cartoon effects to images. It features a shared image processing core and two separate interfaces: a PyQt6 Desktop application and a Next.js + FastAPI Web application.

## Prerequisites
- Python 3.10+
- Node.js 18+

## Structure
- `core/`: Shared image processing logic using OpenCV.
- `desktop/`: PyQt6 native desktop application.
- `api/`: FastAPI backend server for the web interface.
- `web/`: Next.js frontend application.

## Setup Python Environment
```bash
python -m venv venv
# Windows
.\venv\Scripts\activate
# Linux/Mac
source venv/bin/activate

pip install -r requirements.txt
```

## Running the Desktop Application
```bash
python desktop/main.py
```

## Running the Web Application
1. **Start the API Server**
```bash
uvicorn api.main:app --reload
```
The API will run on http://localhost:8000. Swagger docs are at http://localhost:8000/docs.

2. **Start the Frontend Server**
```bash
cd web
npm install
npm run dev
```
The web app will run on http://localhost:3000.
