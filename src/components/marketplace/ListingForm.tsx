/* eslint-disable @next/next/no-img-element */

'use client';

import React, { useState } from 'react';

interface ListingFormData {
  title: string;
  category: string;
  description: string;
  price: number;
  condition: 'new' | 'like-new' | 'good' | 'fair';
  photos: File[];
  photoUrls: string[];
}

interface ListingFormProps {
  categories: string[];
  onSubmit: (data: ListingFormData) => Promise<void>;
  onCancel: () => void;
  initialData?: Partial<ListingFormData>;
  isLoading?: boolean;
}

export const ListingForm: React.FC<ListingFormProps> = ({
  categories,
  onSubmit,
  onCancel,
  initialData = {},
  isLoading = false
}) => {
  const [formData, setFormData] = useState<ListingFormData>({
    title: initialData.title || '',
    category: initialData.category || categories[0] || '',
    description: initialData.description || '',
    price: initialData.price || 0,
    condition: initialData.condition || 'good',
    photos: [],
    photoUrls: initialData.photoUrls || []
  });

  const [photoPreviews, setPhotoPreviews] = useState<string[]>(initialData.photoUrls || []);

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value, type } = e.target;
    setFormData({
      ...formData,
      [name]: type === 'number' ? parseFloat(value) : value
    });
  };

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    const newPhotos = Array.from(files);
    setFormData({
      ...formData,
      photos: [...formData.photos, ...newPhotos]
    });

    Array.from(newPhotos).forEach((file) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhotoPreviews((prev) => [...prev, reader.result as string]);
      };
      reader.readAsDataURL(file);
    });
  };

  const removePhoto = (index: number) => {
    const newPhotos = formData.photos.filter((_, i) => i !== index);
    const newPreviews = photoPreviews.filter((_, i) => i !== index);
    setFormData({ ...formData, photos: newPhotos });
    setPhotoPreviews(newPreviews);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-md p-6 max-w-2xl mx-auto">
      <h2 className="text-2xl font-bold mb-6">Create Listing</h2>

      {/* Title */}
      <div className="mb-6">
        <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-2">
          Title *
        </label>
        <input
          type="text"
          id="title"
          name="title"
          value={formData.title}
          onChange={handleInputChange}
          required
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="e.g., Vintage Coffee Table"
          maxLength={100}
        />
        <p className="text-xs text-gray-500 mt-1">{formData.title.length}/100</p>
      </div>

      {/* Category & Price */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div>
          <label htmlFor="category" className="block text-sm font-medium text-gray-700 mb-2">
            Category *
          </label>
          <select
            id="category"
            name="category"
            value={formData.category}
            onChange={handleInputChange}
            required
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {categories.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="price" className="block text-sm font-medium text-gray-700 mb-2">
            Price (USD) *
          </label>
          <input
            type="number"
            id="price"
            name="price"
            value={formData.price}
            onChange={handleInputChange}
            required
            min="0"
            step="0.01"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="0.00"
          />
        </div>
      </div>

      {/* Condition */}
      <div className="mb-6">
        <label htmlFor="condition" className="block text-sm font-medium text-gray-700 mb-2">
          Condition *
        </label>
        <select
          id="condition"
          name="condition"
          value={formData.condition}
          onChange={handleInputChange}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="new">New</option>
          <option value="like-new">Like New</option>
          <option value="good">Good</option>
          <option value="fair">Fair</option>
        </select>
      </div>

      {/* Description */}
      <div className="mb-6">
        <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2">
          Description *
        </label>
        <textarea
          id="description"
          name="description"
          value={formData.description}
          onChange={handleInputChange}
          required
          rows={6}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="Describe the item in detail. Include measurements, defects, etc."
          maxLength={2000}
        />
        <p className="text-xs text-gray-500 mt-1">{formData.description.length}/2000</p>
      </div>

      {/* Photos */}
      <div className="mb-6">
        <label htmlFor="photos" className="block text-sm font-medium text-gray-700 mb-2">
          Photos (Up to 5)
        </label>
        <input
          type="file"
          id="photos"
          name="photos"
          accept="image/*"
          multiple
          onChange={handlePhotoChange}
          disabled={photoPreviews.length >= 5}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
        />
        <p className="text-xs text-gray-500 mt-1">{photoPreviews.length}/5 photos</p>

        {/* Photo Previews */}
        {photoPreviews.length > 0 && (
          <div className="mt-4 grid grid-cols-3 gap-3">
            {photoPreviews.map((preview, index) => (
              <div key={index} className="relative group">
                <img
                  src={preview}
                  alt={`Photo ${index + 1}`}
                  className="w-full h-24 object-cover rounded-lg"
                />
                <button
                  type="button"
                  onClick={() => removePhoto(index)}
                  className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div className="flex gap-3 justify-end">
        <button
          type="button"
          onClick={onCancel}
          disabled={isLoading}
          className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 font-medium"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isLoading}
          className="px-6 py-2 text-white rounded-lg font-medium disabled:opacity-50"
          style={{ backgroundcolor: 'var(--brand-primary)' }}
        >
          {isLoading ? 'Creating...' : 'Create Listing'}
        </button>
      </div>
    </form>
  );
};
