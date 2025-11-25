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

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --include=dev

# Copy source code
COPY . .

# Build TypeScript
RUN npm run build

# Run database migrations
RUN npm run migrate

# Expose port
EXPOSE 3000

# Start the application
CMD ["npm", "start"]

