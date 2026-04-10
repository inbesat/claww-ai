# 1. Use Node 20
FROM node:20-slim

# 2. Install Ghostscript and GraphicsMagick
RUN apt-get update && apt-get install -y \
    graphicsmagick \
    ghostscript \
    && rm -rf /var/lib/apt/lists/*

# 3. Create app directory
WORKDIR /app

# 4. Copy backend package files and install
COPY package*.json ./
RUN npm install

# 5. Copy the rest of the backend code
COPY . .

# 6. Expose the port
EXPOSE 3001

# 7. Start the engine
CMD ["node", "server.js"]