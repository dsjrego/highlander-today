'use client';

import React, { useState } from 'react';

interface Category {
  id: string;
  name: string;
  slug: string;
  parentId?: string;
  order: number;
  archived: boolean;
  description?: string;
}

interface CategoryManagerProps {
  categories: Category[];
  onSave: (categories: Category[]) => Promise<void>;
  onDelete?: (categoryId: string) => Promise<void>;
  isLoading?: boolean;
}

export const CategoryManager: React.FC<CategoryManagerProps> = ({
  categories,
  onSave,
  onDelete,
  isLoading = false
}) => {
  const [updatedCategories, setUpdatedCategories] = useState<Category[]>(categories);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [newCategory, setNewCategory] = useState({
    name: '',
    description: ''
  });

  const handleAddCategory = () => {
    if (!newCategory.name.trim()) return;

    const category: Category = {
      id: Math.random().toString(),
      name: newCategory.name,
      slug: newCategory.name.toLowerCase().replace(/\s+/g, '-'),
      order: updatedCategories.length,
      archived: false,
      description: newCategory.description
    };

    setUpdatedCategories([...updatedCategories, category]);
    setNewCategory({ name: '', description: '' });
  };

  const handleToggleArchive = (id: string) => {
    setUpdatedCategories(
      updatedCategories.map((cat) =>
        cat.id === id ? { ...cat, archived: !cat.archived } : cat
      )
    );
  };

  const handleMoveUp = (id: string) => {
    const index = updatedCategories.findIndex((c) => c.id === id);
    if (index > 0) {
      const newCategories = [...updatedCategories];
      [newCategories[index], newCategories[index - 1]] = [
        newCategories[index - 1],
        newCategories[index]
      ];
      newCategories.forEach((cat, idx) => (cat.order = idx));
      setUpdatedCategories(newCategories);
    }
  };

  const handleMoveDown = (id: string) => {
    const index = updatedCategories.findIndex((c) => c.id === id);
    if (index < updatedCategories.length - 1) {
      const newCategories = [...updatedCategories];
      [newCategories[index], newCategories[index + 1]] = [
        newCategories[index + 1],
        newCategories[index]
      ];
      newCategories.forEach((cat, idx) => (cat.order = idx));
      setUpdatedCategories(newCategories);
    }
  };

  const handleEditToggle = (id: string) => {
    setEditingId(editingId === id ? null : id);
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold">Category Manager</h2>
        <button
          onClick={() => onSave(updatedCategories)}
          disabled={isLoading}
          className="px-6 py-2 text-white rounded-lg font-medium disabled:opacity-50"
          style={{ backgroundcolor: 'var(--brand-primary)' }}
        >
          {isLoading ? 'Saving...' : 'Save Changes'}
        </button>
      </div>

      {/* Add New Category */}
      <div className="mb-8 p-4 bg-gray-50 rounded-lg border border-gray-200">
        <h3 className="font-semibold text-gray-900 mb-4">Add New Category</h3>
        <div className="space-y-3">
          <div>
            <label htmlFor="catName" className="block text-sm font-medium text-gray-700 mb-1">
              Category Name
            </label>
            <input
              type="text"
              id="catName"
              value={newCategory.name}
              onChange={(e) => setNewCategory({ ...newCategory, name: e.target.value })}
              placeholder="e.g., Electronics"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label htmlFor="catDesc" className="block text-sm font-medium text-gray-700 mb-1">
              Description
            </label>
            <textarea
              id="catDesc"
              value={newCategory.description}
              onChange={(e) => setNewCategory({ ...newCategory, description: e.target.value })}
              placeholder="Brief description..."
              rows={2}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <button
            onClick={handleAddCategory}
            disabled={!newCategory.name.trim()}
            className="w-full px-4 py-2 text-white rounded-lg font-medium disabled:opacity-50"
            style={{ backgroundcolor: 'var(--brand-primary)' }}
          >
            Add Category
          </button>
        </div>
      </div>

      {/* Categories List */}
      <div className="space-y-2">
        {updatedCategories.map((category) => (
          <div
            key={category.id}
            className={`p-4 rounded-lg border transition-all ${
              editingId === category.id
                ? 'border-blue-500 bg-[var(--article-card-badge-bg)]'
                : 'border-gray-200 hover:border-gray-300'
            }`}
          >
            {editingId === category.id ? (
              // Edit Mode
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Name
                  </label>
                  <input
                    type="text"
                    value={category.name}
                    onChange={(e) => {
                      setUpdatedCategories(
                        updatedCategories.map((c) =>
                          c.id === category.id
                            ? { ...c, name: e.target.value }
                            : c
                        )
                      );
                    }}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Description
                  </label>
                  <textarea
                    value={category.description || ''}
                    onChange={(e) => {
                      setUpdatedCategories(
                        updatedCategories.map((c) =>
                          c.id === category.id
                            ? { ...c, description: e.target.value }
                            : c
                        )
                      );
                    }}
                    rows={2}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <button
                  onClick={() => handleEditToggle(category.id)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 font-medium"
                >
                  Done Editing
                </button>
              </div>
            ) : (
              // View Mode
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h4 className="font-semibold text-gray-900">{category.name}</h4>
                  <p className="text-xs text-gray-500 mt-1">Slug: {category.slug}</p>
                  {category.description && (
                    <p className="text-sm text-gray-600 mt-1">{category.description}</p>
                  )}
                </div>

                {/* Actions */}
                <div className="flex gap-2 flex-shrink-0">
                  <button
                    onClick={() => handleMoveUp(category.id)}
                    disabled={category.order === 0}
                    className="p-2 text-gray-600 hover:text-gray-900 disabled:opacity-50"
                  >
                    ↑
                  </button>
                  <button
                    onClick={() => handleMoveDown(category.id)}
                    disabled={
                      category.order === updatedCategories.length - 1
                    }
                    className="p-2 text-gray-600 hover:text-gray-900 disabled:opacity-50"
                  >
                    ↓
                  </button>
                  <button
                    onClick={() => handleEditToggle(category.id)}
                    className="p-2 text-blue-600 hover:text-blue-900"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleToggleArchive(category.id)}
                    className={`p-2 font-medium text-xs rounded ${
                      category.archived
                        ? 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    {category.archived ? 'Unarchive' : 'Archive'}
                  </button>
                  {onDelete && (
                    <button
                      onClick={() => onDelete(category.id)}
                      className="p-2 text-red-600 hover:text-red-900"
                    >
                      Delete
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {updatedCategories.length === 0 && (
        <p className="text-center text-gray-500 py-8">
          No categories yet. Add one to get started!
        </p>
      )}
    </div>
  );
};
