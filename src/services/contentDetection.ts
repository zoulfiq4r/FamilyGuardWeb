/**
 * Google Cloud Vision AI - Adult Content Detection Service
 * 
 * Uses Vision API SafeSearch to detect inappropriate content in screenshots
 * captured from child devices.
 */

import vision from '@google-cloud/vision';
import { Storage } from '@google-cloud/storage';

// Initialize clients
const visionClient = new vision.ImageAnnotatorClient({
  keyFilename: process.env.REACT_APP_GOOGLE_CREDENTIALS_PATH,
});

const storageClient = new Storage({
  keyFilename: process.env.REACT_APP_GOOGLE_CREDENTIALS_PATH,
});

const BUCKET_NAME = 'familyguard-screenshots'; // Create this bucket in GCP

export interface ContentAnalysisResult {
  isAdult: boolean;
  isViolent: boolean;
  isRacy: boolean;
  adult: string; // VERY_LIKELY, LIKELY, POSSIBLE, UNLIKELY, VERY_UNLIKELY
  violence: string;
  racy: string;
  medical: string;
  spoof: string;
  riskScore: number; // 0-1
  shouldBlock: boolean;
}

/**
 * Analyze image for adult/inappropriate content using Google Vision AI
 */
export async function analyzeContentSafety(
  imageBase64: string
): Promise<ContentAnalysisResult> {
  try {
    console.log('[AI] Analyzing content with Google Vision API...');

    const [result] = await visionClient.safeSearchDetection({
      image: { content: imageBase64 },
    });

    const detections = result.safeSearchAnnotation;

    if (!detections) {
      throw new Error('No SafeSearch data returned from Vision API');
    }

    // Calculate risk score (0-1)
    const riskScore = calculateRiskScore(detections);

    // Determine if content should be blocked
    const shouldBlock =
      detections.adult === 'LIKELY' ||
      detections.adult === 'VERY_LIKELY' ||
      detections.racy === 'VERY_LIKELY' ||
      detections.violence === 'LIKELY' ||
      detections.violence === 'VERY_LIKELY';

    return {
      isAdult:
        detections.adult === 'LIKELY' || detections.adult === 'VERY_LIKELY',
      isViolent:
        detections.violence === 'LIKELY' ||
        detections.violence === 'VERY_LIKELY',
      isRacy:
        detections.racy === 'LIKELY' || detections.racy === 'VERY_LIKELY',
      adult: String(detections.adult || 'UNKNOWN'),
      violence: String(detections.violence || 'UNKNOWN'),
      racy: String(detections.racy || 'UNKNOWN'),
      medical: String(detections.medical || 'UNKNOWN'),
      spoof: String(detections.spoof || 'UNKNOWN'),
      riskScore,
      shouldBlock,
    };
  } catch (error) {
    console.error('[AI] Vision API error:', error);
    throw new Error(`Content analysis failed: ${error}`);
  }
}

/**
 * Calculate risk score from SafeSearch detections
 */
function calculateRiskScore(detections: any): number {
  const weights = {
    VERY_LIKELY: 1.0,
    LIKELY: 0.7,
    POSSIBLE: 0.4,
    UNLIKELY: 0.2,
    VERY_UNLIKELY: 0.0,
  };

  const adultScore = weights[detections.adult as keyof typeof weights] || 0;
  const violenceScore =
    weights[detections.violence as keyof typeof weights] || 0;
  const racyScore = weights[detections.racy as keyof typeof weights] || 0;

  // Weighted average (adult content weighted more heavily)
  return (adultScore * 0.5 + violenceScore * 0.3 + racyScore * 0.2);
}

/**
 * Upload screenshot to Google Cloud Storage for parent review
 */
export async function uploadScreenshot(
  imageBase64: string,
  childId: string,
  alertId: string
): Promise<string> {
  try {
    const bucket = storageClient.bucket(BUCKET_NAME);
    const fileName = `${childId}/${alertId}_${Date.now()}.jpg`;
    const file = bucket.file(fileName);

    // Convert base64 to buffer
    const imageBuffer = Buffer.from(imageBase64, 'base64');

    await file.save(imageBuffer, {
      metadata: {
        contentType: 'image/jpeg',
        metadata: {
          childId,
          alertId,
          uploadedAt: new Date().toISOString(),
        },
      },
      public: false, // Keep private
    });

    // Generate signed URL valid for 7 days
    const [signedUrl] = await file.getSignedUrl({
      action: 'read',
      expires: Date.now() + 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    console.log('[Storage] Screenshot uploaded:', fileName);
    return signedUrl;
  } catch (error) {
    console.error('[Storage] Upload failed:', error);
    throw new Error(`Screenshot upload failed: ${error}`);
  }
}

/**
 * Delete old screenshots (cleanup job)
 */
export async function deleteOldScreenshots(daysOld: number = 30): Promise<number> {
  try {
    const bucket = storageClient.bucket(BUCKET_NAME);
    const [files] = await bucket.getFiles();

    const cutoffDate = Date.now() - daysOld * 24 * 60 * 60 * 1000;
    let deletedCount = 0;

    for (const file of files) {
      const [metadata] = await file.getMetadata();
      const createdDate = new Date(metadata.timeCreated || Date.now()).getTime();

      if (createdDate < cutoffDate) {
        await file.delete();
        deletedCount++;
      }
    }

    console.log(`[Cleanup] Deleted ${deletedCount} old screenshots`);
    return deletedCount;
  } catch (error) {
    console.error('[Cleanup] Failed:', error);
    return 0;
  }
}

/**
 * Cost estimation helper
 */
export function estimateCost(imagesPerMonth: number): number {
  // Google Vision API pricing: $1.50 per 1000 images (first 1000 free)
  const pricePerThousand = 1.5;
  const freeQuota = 1000;

  const billableImages = Math.max(0, imagesPerMonth - freeQuota);
  const cost = (billableImages / 1000) * pricePerThousand;

  return parseFloat(cost.toFixed(2));
}
