# Multi-stage Dockerfile for React Dashboard
# Stage 1: Build the React application
FROM node:18-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy source code
COPY . .

# Build the React app for production
RUN npm run build

# Stage 2: Serve with Nginx
FROM nginx:alpine

# Copy nginx configuration
COPY nginx.conf /etc/nginx/nginx.conf

# Copy the built React app from builder stage
COPY --from=builder /app/build /usr/share/nginx/html

# Create a startup script to handle environment variables
RUN mkdir -p /app/scripts
COPY docker-entrypoint.sh /app/scripts/docker-entrypoint.sh
RUN chmod +x /app/scripts/docker-entrypoint.sh

# Expose port 80 (Cloud Run uses PORT env variable, defaults to 8080)
EXPOSE 8080

# Set the entrypoint script
ENTRYPOINT ["/app/scripts/docker-entrypoint.sh"]
CMD ["nginx", "-g", "daemon off;"]
