/* eslint-disable @next/next/no-img-element */

'use client';

import React, { useState } from 'react';

interface ImageFile {
  file: File;
  preview: string;
}

interface ImageUploaderProps {
  onImagesSelect: (files: File[]) => void;
  maxFiles?: number;
  maxSizePerFile?: number; // in bytes
}

export const ImageUploader: React.FC<ImageUploaderProps> = ({
  onImagesSelect,
  maxFiles = 5,
  maxSizePerFile = 10 * 1024 * 1024 // 10MB
}) => {
  const [images, setImages] = useState<ImageFile[]>([]);
  const [dragActive, setDragActive] = useState(false);

  const handleFiles = (fileList: FileList) => {
    const newImages: ImageFile[] = [];

    Array.from(fileList).forEach((file) => {
      // Check if file is an image
      if (!file.type.startsWith('image/')) {
        return;
      }

      // Check file size
      if (file.size > maxSizePerFile) {
        return;
      }

      const reader = new FileReader();
      reader.onloadend = () => {
        newImages.push({
          file,
          preview: reader.result as string
        });

        const combined = [...images, ...newImages];
        if (combined.length <= maxFiles) {
          setImages(combined);
          onImagesSelect(combined.map((img) => img.file));
        }
      };
      reader.readAsDataURL(file);
    });
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFiles(e.dataTransfer.files);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      handleFiles(e.target.files);
    }
  };

  const removeImage = (index: number) => {
    const newImages = images.filter((_, i) => i !== index);
    setImages(newImages);
    onImagesSelect(newImages.map((img) => img.file));
  };

  const canAddMore = images.length < maxFiles;

  return (
    <div className="w-full">
      {/* Drop Zone */}
      {canAddMore && (
        <div
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors cursor-pointer ${
            dragActive ? 'border-blue-500 bg-[var(--article-card-badge-bg)]' : 'border-gray-300 bg-gray-50'
          }`}
        >
          <input
            type="file"
            id="image-upload"
            multiple
            accept="image/*"
            onChange={handleChange}
            className="hidden"
          />
          <label htmlFor="image-upload" className="cursor-pointer">
            <svg className="mx-auto h-12 w-12 text-gray-400 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            <p className="text-sm font-medium text-gray-700">
              Drag and drop images here or click to select
            </p>
            <p className="text-xs text-gray-500 mt-1">
              PNG, JPG, GIF up to 10MB ({images.length}/{maxFiles})
            </p>
          </label>
        </div>
      )}

      {/* Image Previews */}
      {images.length > 0 && (
        <div className="mt-6 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {images.map((image, index) => (
            <div key={index} className="relative group">
              <img
                src={image.preview}
                alt={`Preview ${index + 1}`}
                className="w-full h-24 object-cover rounded-lg border border-gray-200"
              />
              <button
                type="button"
                onClick={() => removeImage(index)}
                className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
