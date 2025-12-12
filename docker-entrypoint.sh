#!/bin/sh
# Docker entrypoint script to handle Cloud Run PORT environment variable

# Cloud Run uses PORT env variable (defaults to 8080)
# We need to update nginx config to listen on the specified port
PORT=${PORT:-8080}

# Replace the port in nginx config
sed -i "s/listen 8080;/listen ${PORT};/" /etc/nginx/nginx.conf

# Execute the command passed to the script
exec "$@"
