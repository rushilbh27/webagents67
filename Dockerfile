# Production Dockerfile for Coolify/VPS
FROM node:20-slim

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy source
COPY . .

# Build frontend
RUN npm run build

# Expose port (as defined in server/index.js)
EXPOSE 3000

# Start server
CMD ["npm", "start"]
