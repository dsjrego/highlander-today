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
  /** Helper text shown below the drop zone */
  helperText?: string;
  /** Whether to show a circular preview (for profile photos) */
  circular?: boolean;
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
  helperText,
  circular = false,
  compact = false,
}: ImageUploadProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [error, setError] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const inputId = useId();

  const canAddMore = value.length < maxFiles;

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

  // ── Single circular preview (profile photo style) ──────────────
  if (circular && value.length > 0) {
    return (
      <div>
        {label && (
          <label className="block text-sm font-semibold text-gray-700 mb-2">{label}</label>
        )}
        <div className="flex items-center gap-4">
          <div className="relative w-20 h-20 rounded-full overflow-hidden border-2 border-gray-200">
            <img src={value[0]} alt="Profile" className="w-full h-full object-cover" />
            {onRemove && (
              <button
                type="button"
                onClick={() => onRemove(value[0])}
                className="!p-0 absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            )}
          </div>
          <button
            type="button"
            onClick={() => inputRef.current?.showPicker?.() ?? inputRef.current?.click()}
            disabled={isUploading}
            className="!px-4 !py-2 text-sm font-medium border border-gray-300 rounded-lg hover:bg-gray-50 transition disabled:opacity-50"
          >
            {isUploading ? 'Uploading...' : 'Change Photo'}
          </button>
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
    <div>
      {label && (
        <label className="block text-sm font-semibold text-gray-700 mb-2">{label}</label>
      )}

      {/* Existing image previews */}
      {value.length > 0 && (
        <div className={`mb-3 ${maxFiles > 1 ? 'grid grid-cols-2 sm:grid-cols-3 gap-3' : ''}`}>
          {value.map((url) => (
            <div key={url} className="relative group rounded-lg overflow-hidden border border-gray-200">
              <img
                src={url}
                alt="Uploaded"
                className={`w-full object-cover ${maxFiles > 1 ? 'h-28' : 'h-48'}`}
              />
              {onRemove && (
                <button
                  type="button"
                  onClick={() => onRemove(url)}
                  className="!p-0 absolute top-2 right-2 w-7 h-7 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600"
                >
                  &times;
                </button>
              )}
            </div>
          ))}
        </div>
      )}

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
          <input
            id={inputId}
            ref={inputRef}
            type="file"
            accept={ACCEPT_ATTRIBUTE}
            multiple={maxFiles > 1}
            onChange={handleChange}
            className="sr-only"
          />

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
