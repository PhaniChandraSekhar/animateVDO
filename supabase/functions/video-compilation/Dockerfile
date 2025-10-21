# Custom Dockerfile for video-compilation edge function with FFmpeg support
FROM denoland/deno:1.37.0

# Install FFmpeg and dependencies
RUN apt-get update && apt-get install -y \
    ffmpeg \
    && rm -rf /var/lib/apt/lists/*

# Verify FFmpeg installation
RUN ffmpeg -version

# Set working directory
WORKDIR /app

# Copy function files
COPY . .

# Cache dependencies
RUN deno cache index.ts

# Run the function
CMD ["deno", "run", "--allow-all", "index.ts"]
