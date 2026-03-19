import {
  DeleteObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import sharp from 'sharp';
import { FILE_LIMITS, IMAGE_PROCESSING } from './constants';

const s3Client = new S3Client({
  region: 'auto',
  credentials: {
    accessKeyId: process.env.CLOUDFLARE_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.CLOUDFLARE_SECRET_ACCESS_KEY || '',
  },
  endpoint: process.env.CLOUDFLARE_R2_ENDPOINT || '',
});

const BUCKET_NAME = process.env.CLOUDFLARE_BUCKET_NAME || 'highlander-today';
const CDN_URL = process.env.CLOUDFLARE_CDN_URL || '';

export function validateFileSize(size: number): void {
  if (size > FILE_LIMITS.maxFileSize) {
    throw new Error(
      `File size exceeds limit of ${FILE_LIMITS.maxFileSize / 1024 / 1024}MB`
    );
  }
}

export async function processImage(
  buffer: Buffer,
  options?: {
    maxWidth?: number;
    quality?: number;
  }
): Promise<Buffer> {
  const maxWidth = options?.maxWidth || IMAGE_PROCESSING.maxWidth;
  const quality = options?.quality || IMAGE_PROCESSING.quality;

  try {
    return await sharp(buffer)
      .resize(maxWidth, undefined, {
        withoutEnlargement: true,
        fit: 'inside',
      })
      .jpeg({ quality })
      .toBuffer();
  } catch (error) {
    throw new Error(`Failed to process image: ${String(error)}`);
  }
}

interface UploadOptions {
  contentType?: string;
  metadata?: Record<string, string>;
}

async function toBuffer(file: Buffer | Blob): Promise<Buffer> {
  if (Buffer.isBuffer(file)) {
    return file;
  }

  return Buffer.from(await file.arrayBuffer());
}

export async function uploadFile(
  file: Buffer | Blob,
  path: string,
  options: UploadOptions = {}
): Promise<{
  key: string;
  url: string;
  size: number;
}> {
  const buffer = await toBuffer(file);
  validateFileSize(buffer.length);

  const key = path.startsWith('/') ? path.slice(1) : path;

  try {
    await s3Client.send(
      new PutObjectCommand({
        Bucket: BUCKET_NAME,
        Key: key,
        Body: buffer,
        ContentType: options.contentType || 'application/octet-stream',
        Metadata: options.metadata,
      })
    );

    return {
      key,
      url: getPublicUrl(key),
      size: buffer.length,
    };
  } catch (error) {
    throw new Error(`Failed to upload file: ${String(error)}`);
  }
}

export async function uploadImage(
  file: Buffer | Blob,
  path: string,
  options: UploadOptions = {}
) {
  const buffer = await toBuffer(file);
  const processedBuffer = await processImage(buffer);

  return uploadFile(processedBuffer, path, {
    ...options,
    contentType: options.contentType || 'image/jpeg',
  });
}

export function getPublicUrl(key: string): string {
  if (!CDN_URL) {
    throw new Error('CDN URL not configured');
  }

  return `${CDN_URL.replace(/\/$/, '')}/${key}`;
}

export async function getSignedDownloadUrl(key: string, expiresIn = 3600): Promise<string> {
  void key;
  void expiresIn;
  throw new Error(
    'Signed download URLs are not available until the R2 presigner dependency is installed.'
  );
}

export async function deleteFile(key: string): Promise<void> {
  try {
    await s3Client.send(
      new DeleteObjectCommand({
        Bucket: BUCKET_NAME,
        Key: key,
      })
    );
  } catch (error) {
    throw new Error(`Failed to delete file: ${String(error)}`);
  }
}

function generateStoragePath(scope: string, entityId: string, filename: string): string {
  const timestamp = Date.now();
  return `${scope}/${entityId}/${timestamp}-${filename}`;
}

export function generateArticleImagePath(articleId: string, filename: string): string {
  return generateStoragePath('articles', articleId, filename);
}

export function generateEventImagePath(eventId: string, filename: string): string {
  return generateStoragePath('events', eventId, filename);
}

export function generateListingImagePath(listingId: string, filename: string): string {
  return generateStoragePath('listings', listingId, filename);
}

export function generateMarketplaceImagePath(listingId: string, filename: string): string {
  return generateStoragePath('marketplace', listingId, filename);
}
