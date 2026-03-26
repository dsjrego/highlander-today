'use client';

import React, { useState, useRef, useCallback, useId } from 'react';

interface UploadedImage {
  url: string;
  filename: string;
  size: number;
}

const ACCEPTED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const ACCEPT_ATTRIBUTE = '.jpg,.jpeg,.png,.webp,.gif';

interface ImageUploadProps {
  /** Called when an image is successfully uploaded */
  onUpload: (image: UploadedImage) => void;
  /** Called when an image is removed */
  onRemove?: (url: string) => void;
  /** Upload context for organizing files (article, profile, event, marketplace, help-wanted) */
  context?: 'article' | 'profile' | 'event' | 'marketplace' | 'help-wanted';
  /** Max number of images allowed (1 for single image, more for multi) */
  maxFiles?: number;
  /** Currently uploaded image URLs (for controlled mode) */
  value?: string[];
  /** Label text */
  label?: string;
  /** Optional label class override */
  labelClassName?: string;
  /** Helper text shown below the drop zone */
  helperText?: string;
  /** Whether to show a circular preview (for profile photos) */
  circular?: boolean;
  /** Whether to show the single-image card maintenance UI */
  singleCard?: boolean;
  /** Compact mode — smaller drop zone, no grid */
  compact?: boolean;
}

export default function ImageUpload({
  onUpload,
  onRemove,
  context = 'article',
  maxFiles = 1,
  value = [],
  label,
  labelClassName,
  helperText,
  circular = false,
  singleCard = false,
  compact = false,
}: ImageUploadProps) {
  const resolvedLabelClassName = labelClassName ?? 'mb-2 block text-sm font-semibold text-gray-700';

  const [isUploading, setIsUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [error, setError] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const inputId = useId();

  const canAddMore = value.length < maxFiles;
  const openPicker = () => inputRef.current?.showPicker?.() ?? inputRef.current?.click();

  const uploadFile = useCallback(
    async (file: File) => {
      setError('');

      // Client-side validation
      if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
        setError('Only JPG, PNG, WebP, and GIF images are allowed. HEIC/HEIF files are not supported yet.');
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        setError('Image must be under 5MB.');
        return;
      }

      setIsUploading(true);
      try {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('context', context);

        const res = await fetch('/api/upload', {
          method: 'POST',
          body: formData,
        });

        if (!res.ok) {
          const data = await res.json();
          setError(data.error || 'Upload failed');
          return;
        }

        const data = await res.json();
        onUpload({ url: data.url, filename: data.filename, size: data.size });
      } catch {
        setError('Upload failed. Please try again.');
      } finally {
        setIsUploading(false);
      }
    },
    [context, onUpload]
  );

  const handleFiles = useCallback(
    (files: FileList) => {
      const remaining = maxFiles - value.length;
      const toUpload = Array.from(files).slice(0, remaining);
      toUpload.forEach(uploadFile);
    },
    [maxFiles, value.length, uploadFile]
  );

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(e.type === 'dragenter' || e.type === 'dragover');
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files?.length) handleFiles(e.dataTransfer.files);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.length) handleFiles(e.target.files);
    // Reset input so same file can be re-selected
    e.target.value = '';
  };

  // Single-image card uploader: use the same maintenance pattern as the
  // profile photo surface, with a stable preview/placeholder and explicit
  // change/remove actions instead of the generic drop zone.
  if (circular || singleCard) {
    const hasImage = value.length > 0;
    const imageLabel = label ?? 'Image';
    const uploadLabel = circular ? 'Photo' : 'Image';

    return (
      <div className="w-full">
        {label && (
          <label htmlFor={inputId} className={resolvedLabelClassName}>
            {label}
          </label>
        )}
        <div className="flex flex-col items-center gap-4 rounded-2xl border border-slate-200 bg-slate-50 p-5 text-center">
          <div
            className={`relative overflow-hidden border-2 border-slate-200 bg-slate-200 ${
              circular ? 'h-32 w-32 rounded-full' : 'aspect-[4/3] w-full rounded-[24px]'
            }`}
          >
            {hasImage ? (
              <div
                aria-label={`${imageLabel} preview`}
                className="h-full w-full bg-cover bg-center bg-no-repeat"
                style={{ backgroundImage: `url("${value[0]}")` }}
              />
            ) : (
              <div
                aria-hidden="true"
                className={`flex h-full w-full items-center justify-center text-slate-500 ${
                  circular
                    ? 'bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.95),rgba(203,213,225,0.9))]'
                    : 'bg-[linear-gradient(180deg,rgba(255,255,255,0.9),rgba(226,232,240,0.95))]'
                }`}
              >
                {circular ? (
                  <svg className="h-10 w-10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6.75a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0ZM4.5 19.125a7.5 7.5 0 0115 0" />
                  </svg>
                ) : (
                  <svg className="h-10 w-10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
                    <rect x="3.75" y="5.25" width="16.5" height="13.5" rx="2.25" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="m7.5 15 3.2-3.2a1.5 1.5 0 0 1 2.121 0L16.5 15.5" />
                    <circle cx="9" cy="9" r="1.25" />
                  </svg>
                )}
              </div>
            )}
            {hasImage && onRemove && (
              <button
                type="button"
                onClick={() => onRemove(value[0])}
                className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 transition-opacity hover:opacity-100"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            )}
          </div>
          <div className="w-full">
            <p className="text-sm font-semibold text-slate-800">
              {hasImage
                ? circular
                  ? 'Current photo'
                  : `Current ${imageLabel.toLowerCase()}`
                : circular
                  ? 'No profile photo yet'
                  : `No ${imageLabel.toLowerCase()} yet`}
            </p>
            <p className="mt-1 text-xs text-slate-500">
              {helperText || 'JPG, PNG, WebP, or GIF only.'}
            </p>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <button
              type="button"
              onClick={openPicker}
              disabled={isUploading}
              className="btn btn-primary"
            >
              {isUploading ? 'Uploading...' : hasImage ? `Change ${uploadLabel}` : `Upload ${uploadLabel}`}
            </button>
            {hasImage && onRemove && (
              <button
                type="button"
                onClick={() => onRemove(value[0])}
                className="btn btn-danger"
              >
                Remove
              </button>
            )}
          </div>
          <input
            id={inputId}
            ref={inputRef}
            type="file"
            accept={ACCEPT_ATTRIBUTE}
            onChange={handleChange}
            className="sr-only"
          />
        </div>
        {error && <p className="text-xs text-red-500 mt-2">{error}</p>}
      </div>
    );
  }

  return (
    <div className="w-full">
      {label && (
        <label htmlFor={inputId} className={resolvedLabelClassName}>
          {label}
        </label>
      )}

      {/* Existing image previews */}
      {value.length > 0 && (
        <div className={`mb-3 ${maxFiles > 1 ? 'grid grid-cols-2 gap-3 sm:grid-cols-3' : ''}`}>
          {value.map((url) => (
            <div
              key={url}
              className={`group relative overflow-hidden rounded-xl border border-slate-200 bg-slate-100 ${
                maxFiles > 1 ? 'aspect-square' : 'aspect-[4/3] w-full max-w-xl'
              }`}
            >
              <div
                aria-label="Uploaded image preview"
                className="h-full w-full bg-cover bg-center bg-no-repeat"
                style={{ backgroundImage: `url("${url}")` }}
              />
              {onRemove && (
                <button
                  type="button"
                  onClick={() => onRemove(url)}
                  className="absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-full bg-red-500 text-white opacity-0 transition-opacity hover:bg-red-600 group-hover:opacity-100"
                >
                  &times;
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      <input
        id={inputId}
        ref={inputRef}
        type="file"
        accept={ACCEPT_ATTRIBUTE}
        multiple={maxFiles > 1}
        onChange={handleChange}
        className="sr-only"
      />

      {/* Drop zone */}
      {canAddMore && (
        <label
          htmlFor={inputId}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          className={`border-2 border-dashed rounded-lg text-center cursor-pointer transition-colors ${
            dragActive
              ? 'border-[#46A8CC] bg-blue-50'
              : 'border-gray-300 bg-gray-50 hover:border-gray-400'
          } ${compact ? 'p-4' : 'p-6'}`}
        >
          {isUploading ? (
            <div className="flex items-center justify-center gap-2 text-sm text-gray-500">
              <svg className="animate-spin h-5 w-5 text-[#46A8CC]" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Uploading...
            </div>
          ) : (
            <>
              <svg
                className={`mx-auto text-gray-400 ${compact ? 'h-8 w-8 mb-1' : 'h-10 w-10 mb-2'}`}
                fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 16.5V9.75m0 0l3 3m-3-3l-3 3M6.75 19.5a4.5 4.5 0 01-1.41-8.775 5.25 5.25 0 0110.338-2.226 3 3 0 013.182 2.925A4.5 4.5 0 0118 19.5H6.75z" />
              </svg>
              <p className={`font-medium text-gray-600 ${compact ? 'text-xs' : 'text-sm'}`}>
                {dragActive ? 'Drop image here' : 'Drag & drop or click to upload'}
              </p>
              <p className="text-xs text-gray-400 mt-1">
                {helperText || `JPG, PNG, WebP, GIF only (no HEIC) up to 5MB${maxFiles > 1 ? ` (${value.length}/${maxFiles})` : ''}`}
              </p>
            </>
          )}
        </label>
      )}

      {error && <p className="text-xs text-red-500 mt-2">{error}</p>}
    </div>
  );
}
