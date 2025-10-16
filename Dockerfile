FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY package.json ./
COPY server/ ./server/
COPY frontend/package.json ./frontend/

# Install backend dependencies
RUN npm install --production

# Install frontend dependencies and build
WORKDIR /app/frontend
RUN npm install
COPY frontend/ ./
RUN npm run build

# Go back to app root
WORKDIR /app

# Create data directory
RUN mkdir -p /app/data

# Expose port
EXPOSE 4000

# Start server
CMD ["node", "server/index.js"]
