# Docker & GCP Cloud Run Deployment Guide

## Overview

This React web dashboard has been Dockerized for deployment to Google Cloud Run. The setup uses:
- **Node.js 18 Alpine** for building the React app (production build)
- **Nginx Alpine** for serving static files efficiently
- **Multi-stage Docker build** to minimize image size
- **Cloud Run compatible** with PORT environment variable support

---

## Files Created

### 1. **Dockerfile**
- **Stage 1**: Builds the React app using Node.js
- **Stage 2**: Serves the build output using Nginx
- Listens on port 8080 (Cloud Run default)
- Includes health check endpoint at `/health`

### 2. **docker-compose.yml**
- Exposes the app on port 3000 (mapped to container port 8080)
- Supports environment variables for Firebase configuration
- Includes health checks
- Auto-restarts on failure

### 3. **.dockerignore**
- Excludes unnecessary files from Docker build context
- Reduces image size and build time
- Excludes node_modules, git files, build artifacts, etc.

### 4. **nginx.conf**
- Optimized Nginx configuration for React SPA routing
- Serves static assets with long-lived cache headers
- Compresses responses with gzip
- Includes security headers (denies access to hidden files)
- Routes all non-file requests to index.html (SPA routing)

### 5. **docker-entrypoint.sh**
- Handles Cloud Run's PORT environment variable
- Allows dynamic port configuration

---

## Prerequisites

### Local Development
- Docker Desktop installed
- Docker Compose installed
- GCP account with billing enabled

### GCP Deployment
- `gcloud` CLI installed and authenticated
- GCP project created
- Cloud Run API enabled

---

## Running Locally

### Option 1: Using Docker Compose (Recommended)

1. **Create a `.env.local` file** with your Firebase credentials:
```bash
REACT_APP_FIREBASE_API_KEY=your_api_key
REACT_APP_FIREBASE_AUTH_DOMAIN=your_auth_domain
REACT_APP_FIREBASE_PROJECT_ID=your_project_id
REACT_APP_FIREBASE_STORAGE_BUCKET=your_storage_bucket
REACT_APP_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
REACT_APP_FIREBASE_APP_ID=your_app_id
REACT_APP_FIREBASE_MEASUREMENT_ID=your_measurement_id
```

2. **Start the application**:
```bash
docker-compose up
```

3. **Access the app**:
- Open http://localhost:3000 in your browser

4. **Stop the application**:
```bash
docker-compose down
```

### Option 2: Using Docker Directly

```bash
# Build the image
docker build -t parent-dashboard:latest .

# Run with environment variables
docker run \
  -p 3000:8080 \
  -e REACT_APP_FIREBASE_API_KEY=your_api_key \
  -e REACT_APP_FIREBASE_AUTH_DOMAIN=your_auth_domain \
  -e REACT_APP_FIREBASE_PROJECT_ID=your_project_id \
  -e REACT_APP_FIREBASE_STORAGE_BUCKET=your_storage_bucket \
  -e REACT_APP_FIREBASE_MESSAGING_SENDER_ID=your_sender_id \
  -e REACT_APP_FIREBASE_APP_ID=your_app_id \
  parent-dashboard:latest
```

---

## Deploying to Google Cloud Run

### Step 1: Set Up GCP Project

```bash
# Set your GCP project ID
export PROJECT_ID=your-gcp-project-id

# Set the default project
gcloud config set project $PROJECT_ID

# Enable required APIs
gcloud services enable run.googleapis.com
gcloud services enable artifactregistry.googleapis.com
gcloud services enable cloudbuild.googleapis.com
```

### Step 2: Build and Push Docker Image

```bash
# Set your image name and region
export IMAGE_NAME=parent-dashboard
export REGION=us-central1  # Change as needed

# Build the Docker image locally
docker build -t ${IMAGE_NAME}:latest .

# Tag the image for Google Cloud
docker tag ${IMAGE_NAME}:latest gcr.io/${PROJECT_ID}/${IMAGE_NAME}:latest

# Configure Docker to use gcloud as credential helper (one time only)
gcloud auth configure-docker

# Push the image to Google Container Registry
docker push gcr.io/${PROJECT_ID}/${IMAGE_NAME}:latest
```

### Step 3: Deploy to Cloud Run

```bash
# Deploy with environment variables
gcloud run deploy ${IMAGE_NAME} \
  --image gcr.io/${PROJECT_ID}/${IMAGE_NAME}:latest \
  --platform managed \
  --region ${REGION} \
  --allow-unauthenticated \
  --port 8080 \
  --set-env-vars \
REACT_APP_FIREBASE_API_KEY=your_api_key,\
REACT_APP_FIREBASE_AUTH_DOMAIN=your_auth_domain,\
REACT_APP_FIREBASE_PROJECT_ID=your_project_id,\
REACT_APP_FIREBASE_STORAGE_BUCKET=your_storage_bucket,\
REACT_APP_FIREBASE_MESSAGING_SENDER_ID=your_sender_id,\
REACT_APP_FIREBASE_APP_ID=your_app_id,\
REACT_APP_FIREBASE_MEASUREMENT_ID=your_measurement_id \
  --min-instances 1 \
  --max-instances 10
```

### Step 4: View Your Deployment

```bash
# Get the service URL
gcloud run services describe ${IMAGE_NAME} --region ${REGION} --format='value(status.url)'

# View logs
gcloud run services logs read ${IMAGE_NAME} --region ${REGION} --limit 50

# View deployment details
gcloud run services describe ${IMAGE_NAME} --region ${REGION}
```

### Step 5: Update Deployment (After Code Changes)

```bash
# Rebuild the image
docker build -t gcr.io/${PROJECT_ID}/${IMAGE_NAME}:latest .

# Push to registry
docker push gcr.io/${PROJECT_ID}/${IMAGE_NAME}:latest

# Redeploy
gcloud run deploy ${IMAGE_NAME} \
  --image gcr.io/${PROJECT_ID}/${IMAGE_NAME}:latest \
  --region ${REGION}
```

---

## Automated Deployment with Cloud Build (Optional)

Create a `cloudbuild.yaml` in the root directory:

```yaml
steps:
  # Build the Docker image
  - name: 'gcr.io/cloud-builders/docker'
    args: ['build', '-t', 'gcr.io/$PROJECT_ID/parent-dashboard:$SHORT_SHA', '-t', 'gcr.io/$PROJECT_ID/parent-dashboard:latest', '.']

  # Push to Container Registry
  - name: 'gcr.io/cloud-builders/docker'
    args: ['push', 'gcr.io/$PROJECT_ID/parent-dashboard:$SHORT_SHA']

  # Deploy to Cloud Run
  - name: 'gcr.io/cloud-builders/run'
    args: [
      'deploy',
      'parent-dashboard',
      '--image', 'gcr.io/$PROJECT_ID/parent-dashboard:$SHORT_SHA',
      '--region', 'us-central1',
      '--platform', 'managed',
      '--allow-unauthenticated'
    ]

images:
  - 'gcr.io/$PROJECT_ID/parent-dashboard:$SHORT_SHA'
  - 'gcr.io/$PROJECT_ID/parent-dashboard:latest'
```

Then trigger deployment:
```bash
gcloud builds submit --config cloudbuild.yaml
```

---

## Environment Variables

All Firebase configuration variables are **client-side public credentials**. They are safe to include in the Docker image and committed to version control (they don't contain secrets).

If you need to add secret management for sensitive data:
```bash
# Use Cloud Secret Manager
gcloud secrets create firebase-api-key --data-file=-
gcloud run deploy parent-dashboard --update-secrets REACT_APP_FIREBASE_API_KEY=firebase-api-key:latest
```

---

## Monitoring & Troubleshooting

### Check Container Logs
```bash
gcloud run logs read parent-dashboard --region us-central1 --limit 50
```

### Test the Health Endpoint
```bash
curl https://your-cloud-run-url/health
```

### View Resource Usage
```bash
gcloud run services describe parent-dashboard --region us-central1
```

### Adjust Resources
```bash
gcloud run deploy parent-dashboard \
  --region us-central1 \
  --memory 512Mi \
  --cpu 1 \
  --min-instances 0 \
  --max-instances 100
```

---

## Performance Tips

1. **Caching**: Static assets (.js, .css, .png, etc.) are cached for 1 year with immutable headers
2. **Compression**: Gzip enabled for text-based content
3. **Min Instances**: Set to 0 for cost optimization (requests may take 1-2s to start)
4. **Memory**: Default 256MB is sufficient; increase if needed for larger builds
5. **CDN**: Consider adding Cloud CDN in front of Cloud Run for global distribution

---

## Cleanup

### Delete Cloud Run Service
```bash
gcloud run services delete parent-dashboard --region us-central1
```

### Delete Container Image
```bash
gcloud container images delete gcr.io/$PROJECT_ID/parent-dashboard
```

---

## Architecture Summary

```
Local Machine
    ↓
Docker Build (Node.js + npm build)
    ↓
Docker Image (Nginx serving React build)
    ↓
Google Container Registry (gcr.io)
    ↓
Google Cloud Run (Managed, Serverless)
    ↓
Internet → Your Dashboard
```

---

## References

- [Cloud Run Documentation](https://cloud.google.com/run/docs)
- [Container Registry](https://cloud.google.com/container-registry/docs)
- [gcloud CLI Reference](https://cloud.google.com/sdk/gcloud/reference)
