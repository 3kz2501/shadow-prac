FROM python:3.12-slim

RUN apt-get update && apt-get install -y --no-install-recommends \
    ffmpeg \
    curl \
    unzip \
    espeak-ng \
    && rm -rf /var/lib/apt/lists/*

# Install deno (needed by yt-dlp for YouTube JS challenge solving)
RUN curl -fsSL https://deno.land/install.sh | DENO_INSTALL=/usr/local sh

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

RUN mkdir -p data/audio data/tts data/recordings data/piper

# Download piper voice model
RUN curl -sL "https://huggingface.co/rhasspy/piper-voices/resolve/main/en/en_US/lessac/medium/en_US-lessac-medium.onnx" \
    -o data/piper/en_US-lessac-medium.onnx && \
    curl -sL "https://huggingface.co/rhasspy/piper-voices/resolve/main/en/en_US/lessac/medium/en_US-lessac-medium.onnx.json" \
    -o data/piper/en_US-lessac-medium.onnx.json

EXPOSE 8000

CMD ["python", "main.py"]
