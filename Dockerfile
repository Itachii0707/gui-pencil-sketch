FROM python:3.10-slim

# Set up a new user named "user" with user ID 1000
# Hugging Face Spaces requires the app to run as a non-root user
RUN useradd -m -u 1000 user
USER user
ENV PATH="/home/user/.local/bin:$PATH"

WORKDIR /app

# Copy the requirements file and install dependencies
COPY --chown=user requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy the rest of the application
COPY --chown=user . .

# Expose port 7860 which is required by Hugging Face Spaces
EXPOSE 7860

# Run the FastAPI app on port 7860
CMD ["uvicorn", "api.main:app", "--host", "0.0.0.0", "--port", "7860"]
