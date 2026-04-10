# 1. Use a professional Node.js 20 image
FROM node:20-slim

# 2. Install the "Eyes" (GraphicsMagick and Ghostscript)
RUN apt-get update && apt-get install -y \
    graphicsmagick \
    ghostscript \
    && rm -rf /var/lib/apt/lists/*

# 3. Create the app directory
WORKDIR /app

# 4. Copy backend files
COPY backend/package*.json ./backend/
RUN cd backend && npm install

# 5. Copy the rest of the backend code
COPY backend/ ./backend/

# 6. Expose the port
EXPOSE 3001

# 7. Start the engine
CMD ["node", "backend/server.js"]