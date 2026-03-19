"use client";

import { useState } from "react";

interface Category {
  id: string;
  name: string;
  type: "articles" | "events" | "marketplace";
  description: string;
  active: boolean;
  itemCount: number;
}

export default function CategoryManagerPage() {
  const [categories, setCategories] = useState<Category[]>([
    {
      id: "1",
      name: "News",
      type: "articles",
      description: "Breaking news and updates",
      active: true,
      itemCount: 145,
    },
    {
      id: "2",
      name: "Community",
      type: "articles",
      description: "Community events and announcements",
      active: true,
      itemCount: 89,
    },
    {
      id: "3",
      name: "Education",
      type: "articles",
      description: "Education-related content",
      active: true,
      itemCount: 34,
    },
    {
      id: "4",
      name: "Community",
      type: "events",
      description: "Community gatherings and events",
      active: true,
      itemCount: 45,
    },
    {
      id: "5",
      name: "Sports",
      type: "events",
      description: "Sports and recreation events",
      active: true,
      itemCount: 28,
    },
    {
      id: "6",
      name: "Electronics",
      type: "marketplace",
      description: "Electronics and gadgets",
      active: true,
      itemCount: 234,
    },
    {
      id: "7",
      name: "Furniture",
      type: "marketplace",
      description: "Furniture and home decor",
      active: true,
      itemCount: 156,
    },
  ]);

  const [newCategory, setNewCategory] = useState({
    name: "",
    type: "articles",
    description: "",
  });

  const toggleCategory = (id: string) => {
    setCategories(
      categories.map((cat) =>
        cat.id === id ? { ...cat, active: !cat.active } : cat
      )
    );
  };

  const handleAddCategory = (e: React.FormEvent) => {
    e.preventDefault();
    if (newCategory.name.trim()) {
      setCategories([
        ...categories,
        {
          id: Date.now().toString(),
          name: newCategory.name,
          type: newCategory.type as Category["type"],
          description: newCategory.description,
          active: true,
          itemCount: 0,
        },
      ]);
      setNewCategory({ name: "", type: "articles", description: "" });
    }
  };

  const categoryTypes = ["articles", "events", "marketplace"];

  return (
    <div>
      <h1 className="text-4xl font-bold mb-8 text-[#46A8CC]">
        Category Management
      </h1>

      {/* Add New Category */}
      <div className="bg-white p-6 rounded-lg border border-gray-200 mb-8">
        <h2 className="text-2xl font-bold mb-4">Add New Category</h2>
        <form onSubmit={handleAddCategory} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <input
              type="text"
              value={newCategory.name}
              onChange={(e) =>
                setNewCategory({ ...newCategory, name: e.target.value })
              }
              placeholder="Category name"
              className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#46A8CC]"
            />
            <select
              value={newCategory.type}
              onChange={(e) =>
                setNewCategory({
                  ...newCategory,
                  type: e.target.value,
                })
              }
              className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#46A8CC]"
            >
              {categoryTypes.map((type) => (
                <option key={type} value={type}>
                  {type.charAt(0).toUpperCase() + type.slice(1)}
                </option>
              ))}
            </select>
            <textarea
              value={newCategory.description}
              onChange={(e) =>
                setNewCategory({ ...newCategory, description: e.target.value })
              }
              placeholder="Description"
              className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#46A8CC]"
            />
          </div>
          <button
            type="submit"
            className="px-6 py-2 bg-[#46A8CC] text-white rounded-lg hover:bg-blue-700 transition font-semibold"
          >
            Add Category
          </button>
        </form>
      </div>

      {/* Categories by Type */}
      <div className="space-y-8">
        {categoryTypes.map((type) => {
          const typeCategories = categories.filter((c) => c.type === type);
          return (
            <div key={type}>
              <h2 className="text-2xl font-bold mb-4 capitalize">
                {type} Categories
              </h2>
              <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                <table className="w-full">
                  <thead>
                    <tr className="border-b bg-gray-50">
                      <th className="px-6 py-3 text-left text-sm font-bold">
                        Name
                      </th>
                      <th className="px-6 py-3 text-left text-sm font-bold">
                        Description
                      </th>
                      <th className="px-6 py-3 text-left text-sm font-bold">
                        Items
                      </th>
                      <th className="px-6 py-3 text-left text-sm font-bold">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-sm font-bold">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {typeCategories.map((cat) => (
                      <tr key={cat.id} className="border-b hover:bg-gray-50">
                        <td className="px-6 py-3 font-semibold">{cat.name}</td>
                        <td className="px-6 py-3 text-sm text-gray-600">
                          {cat.description}
                        </td>
                        <td className="px-6 py-3 text-sm">{cat.itemCount}</td>
                        <td className="px-6 py-3">
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={cat.active}
                              onChange={() => toggleCategory(cat.id)}
                              className="w-5 h-5 rounded border-gray-300 text-[#46A8CC]"
                            />
                            <span className="text-sm">
                              {cat.active ? "Active" : "Inactive"}
                            </span>
                          </label>
                        </td>
                        <td className="px-6 py-3 text-sm space-x-2">
                          <button className="text-[#46A8CC] hover:underline">
                            Edit
                          </button>
                          <span className="text-gray-300">•</span>
                          <button className="text-red-600 hover:underline">
                            Delete
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
