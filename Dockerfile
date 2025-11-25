# Use Node.js 20 with Alpine (includes Python and build tools)
FROM node:20-alpine

# Install Python and build dependencies for better-sqlite3
RUN apk add --no-cache \
    python3 \
    make \
    g++ \
    sqlite-dev

# Set working directory
WORKDIR /app

# Copy package files and patches
COPY package*.json ./
COPY patches ./patches

# Install dependencies (postinstall will apply patches automatically)
RUN npm ci --include=dev

# Copy source code
COPY . .

# Build TypeScript
RUN npm run build

# Create data directory
RUN mkdir -p /app/data

# Make start script executable
RUN chmod +x start.sh

# Set environment variables
ENV NODE_ENV=production
ENV PORT=3000
ENV DATABASE_PATH=/app/data/index-rebalancer.db

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/api/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Start the application
CMD ["./start.sh"]

