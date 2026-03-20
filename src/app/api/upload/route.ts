import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';
import { isCloudflareR2Configured, uploadFile } from '@/lib/upload';

/**
 * POST /api/upload
 * Upload an image file. Saves to local filesystem for development.
 * Swap to R2/S3 in production by replacing the storage section below.
 *
 * Accepts: multipart/form-data with a "file" field
 * Optional form field: "context" — one of "article", "profile", "event", "marketplace", "help-wanted"
 * Returns: { success, url, filename, size, type }
 */
export async function POST(request: NextRequest) {
  try {
    // Auth via middleware headers (same pattern as article routes)
    const userId = request.headers.get('x-user-id');
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File;
    const context = (formData.get('context') as string) || 'general';

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: 'Invalid file type. Allowed: JPG, PNG, WebP, GIF.' },
        { status: 400 }
      );
    }

    // Validate file size (5MB max)
    const MAX_SIZE = 5 * 1024 * 1024;
    if (file.size > MAX_SIZE) {
      return NextResponse.json(
        { error: 'File size exceeds 5MB limit' },
        { status: 400 }
      );
    }

    // Generate unique filename
    const ext = file.name.split('.').pop() || 'jpg';
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8);
    const safeFilename = `${timestamp}-${random}.${ext}`;

    const subfolder = ['article', 'profile', 'event', 'marketplace', 'help-wanted'].includes(context)
      ? context
      : 'general';
    const buffer = Buffer.from(await file.arrayBuffer());

    if (process.env.NODE_ENV === 'production') {
      if (!isCloudflareR2Configured()) {
        return NextResponse.json(
          { error: 'Upload storage is not configured for production' },
          { status: 500 }
        );
      }

      const key = `${subfolder}/${safeFilename}`;
      const uploaded = await uploadFile(buffer, key, {
        contentType: file.type,
        metadata: {
          uploadedBy: userId,
          originalFilename: file.name,
        },
      });

      return NextResponse.json(
        {
          success: true,
          url: uploaded.url,
          filename: safeFilename,
          size: file.size,
          type: file.type,
        },
        { status: 201 }
      );
    }

    // ── Storage: Local filesystem for development ───────────────────

    const uploadDir = path.join(process.cwd(), 'public', 'uploads', subfolder);
    await mkdir(uploadDir, { recursive: true });
    const filePath = path.join(uploadDir, safeFilename);
    await writeFile(filePath, buffer);

    // URL that the browser can fetch (from /public)
    const url = `/uploads/${subfolder}/${safeFilename}`;
    // ── End storage section ──────────────────────────────────────────

    return NextResponse.json(
      {
        success: true,
        url,
        filename: safeFilename,
        size: file.size,
        type: file.type,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error uploading file:', error);
    return NextResponse.json(
      { error: 'Failed to upload file' },
      { status: 500 }
    );
  }
}
