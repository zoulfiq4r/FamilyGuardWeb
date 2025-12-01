# Google Cloud Platform Setup for AI Content Detection

## Step 1: Enable Required APIs

1. Go to Google Cloud Console: https://console.cloud.google.com
2. Select project: `familyguard-2c198`
3. Enable these APIs:
   - **Cloud Vision API**: https://console.cloud.google.com/apis/library/vision.googleapis.com
   - **Cloud Storage API**: https://console.cloud.google.com/apis/library/storage.googleapis.com

## Step 2: Create Service Account

1. Go to IAM & Admin > Service Accounts: https://console.cloud.google.com/iam-admin/serviceaccounts
2. Click "Create Service Account"
3. Name: `familyguard-vision-api`
4. Description: `Service account for Vision AI content detection`
5. Click "Create and Continue"
6. Add these roles:
   - `Cloud Vision API User`
   - `Storage Object Admin`
7. Click "Done"

## Step 3: Generate Service Account Key

1. Click on the service account you just created
2. Go to "Keys" tab
3. Click "Add Key" > "Create new key"
4. Choose JSON format
5. Download the JSON file
6. **IMPORTANT**: Rename it to `google-credentials.json` and place it in the project root
7. **SECURITY**: Add `google-credentials.json` to `.gitignore` (never commit this!)

## Step 4: Create Cloud Storage Bucket

1. Go to Cloud Storage: https://console.cloud.google.com/storage/browser
2. Click "Create Bucket"
3. Name: `familyguard-screenshots`
4. Location: Choose region closest to your users
5. Storage class: `Standard`
6. Access control: `Fine-grained` (with IAM)
7. Encryption: `Google-managed`
8. Click "Create"

## Step 5: Configure Environment Variables

1. Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```

2. Update `.env` with your actual Firebase values

3. Ensure `google-credentials.json` path is correct

## Step 6: Update .gitignore

Add these lines to `.gitignore`:
```
google-credentials.json
.env
```

## Cost Estimates (with $300 free credit)

### Vision API Pricing
- First 1,000 images/month: **FREE**
- 1,001+ images: **$1.50 per 1,000 images**

### Storage Pricing
- Storage: **$0.020 per GB/month**
- Bandwidth: **$0.12 per GB**

### Example Usage Scenarios:

**Light usage** (1 child, 100 screenshots/day):
- 3,000 images/month
- Cost: ~$3/month
- Your $300 credit = **100 months of use**

**Moderate usage** (3 children, 200 screenshots/day each):
- 18,000 images/month
- Cost: ~$25/month
- Your $300 credit = **12 months of use**

**Heavy usage** (5 children, 500 screenshots/day each):
- 75,000 images/month
- Cost: ~$110/month
- Your $300 credit = **2.7 months of use**

## Testing the Integration

Run this test to verify setup:

```bash
npm run test:vision-api
```

Or manually test:
```javascript
import { analyzeContentSafety } from './src/services/contentDetection';

const testImage = 'base64_encoded_image_here';
const result = await analyzeContentSafety(testImage);
console.log(result);
```

## Monitoring Usage & Costs

1. GCP Console > Billing: https://console.cloud.google.com/billing
2. View API usage: https://console.cloud.google.com/apis/dashboard
3. Set up budget alerts to avoid surprises

## Security Checklist

- [ ] Service account key stored securely
- [ ] `google-credentials.json` in `.gitignore`
- [ ] `.env` in `.gitignore`
- [ ] Storage bucket is NOT public
- [ ] IAM permissions are minimal (principle of least privilege)
- [ ] Billing alerts configured
- [ ] Screenshots auto-deleted after 30 days

## Next Steps

1. Complete GCP setup above
2. Test content detection with sample images
3. Integrate with mobile app (mobile agent will handle screenshot capture)
4. Add ContentMonitoring component to dashboard
5. Configure alert thresholds and notification preferences
