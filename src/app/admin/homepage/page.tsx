'use client';

import { useEffect, useState } from 'react';
import type {
  HomepageContentItem,
  HomepageSectionData,
} from '@/lib/homepage';

type HomepageSection = HomepageSectionData;
type HomepageItem = HomepageContentItem;

interface HomepageSectionsResponse {
  sections: HomepageSection[];
}

export default function HomepageCurationPage() {
  const [sections, setSections] = useState<HomepageSection[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    async function fetchSections() {
      setIsLoading(true);
      setError(null);

      try {
        const response = await fetch('/api/homepage/sections');
        const data: HomepageSectionsResponse | { error: string } = await response.json();

        if (!response.ok || !('sections' in data)) {
          throw new Error('Failed to load homepage sections');
        }

        setSections(data.sections.sort((a, b) => a.sortOrder - b.sortOrder));
      } catch (fetchError) {
        console.error(fetchError);
        setError('Failed to load homepage curation data.');
      } finally {
        setIsLoading(false);
      }
    }

    fetchSections();
  }, []);

  const updateSection = (sectionId: string, updater: (section: HomepageSection) => HomepageSection) => {
    setSections((currentSections) =>
      currentSections.map((section) => (section.id === sectionId ? updater(section) : section))
    );
  };

  const moveSection = (sectionId: string, direction: 'up' | 'down') => {
    setSections((currentSections) => {
      const sorted = [...currentSections].sort((a, b) => a.sortOrder - b.sortOrder);
      const index = sorted.findIndex((section) => section.id === sectionId);
      const targetIndex = direction === 'up' ? index - 1 : index + 1;

      if (index < 0 || targetIndex < 0 || targetIndex >= sorted.length) {
        return currentSections;
      }

      [sorted[index], sorted[targetIndex]] = [sorted[targetIndex], sorted[index]];

      return sorted.map((section, updatedIndex) => ({
        ...section,
        sortOrder: updatedIndex + 1,
      }));
    });
  };

  const addPinnedItem = (sectionId: string, item: HomepageItem) => {
    updateSection(sectionId, (section) => {
      if (
        section.pinnedItems.some(
          (pinnedItem) =>
            pinnedItem.contentType === item.contentType && pinnedItem.contentId === item.contentId
        ) ||
        section.pinnedItems.length >= section.maxItems
      ) {
        return section;
      }

      return {
        ...section,
        pinnedItems: [...section.pinnedItems, item],
        availableItems: section.availableItems.filter(
          (availableItem) =>
            !(
              availableItem.contentType === item.contentType &&
              availableItem.contentId === item.contentId
            )
        ),
      };
    });
  };

  const removePinnedItem = (sectionId: string, item: HomepageItem) => {
    updateSection(sectionId, (section) => ({
      ...section,
      pinnedItems: section.pinnedItems.filter(
        (pinnedItem) =>
          !(
            pinnedItem.contentType === item.contentType && pinnedItem.contentId === item.contentId
          )
      ),
      availableItems: [...section.availableItems, item],
    }));
  };

  const movePinnedItem = (sectionId: string, itemIndex: number, direction: 'up' | 'down') => {
    updateSection(sectionId, (section) => {
      const nextIndex = direction === 'up' ? itemIndex - 1 : itemIndex + 1;
      if (nextIndex < 0 || nextIndex >= section.pinnedItems.length) {
        return section;
      }

      const pinnedItems = [...section.pinnedItems];
      [pinnedItems[itemIndex], pinnedItems[nextIndex]] = [pinnedItems[nextIndex], pinnedItems[itemIndex]];

      return {
        ...section,
        pinnedItems,
      };
    });
  };

  const handleSave = async () => {
    setIsSaving(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const response = await fetch('/api/homepage/sections', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sections: sections
            .sort((a, b) => a.sortOrder - b.sortOrder)
            .map((section, index) => ({
              id: section.id,
              sectionType: section.sectionType,
              sortOrder: index + 1,
              isVisible: section.isVisible,
              pinnedItems: section.pinnedItems.map((item) => ({
                contentType: item.contentType,
                contentId: item.contentId,
              })),
            })),
        }),
      });

      const data: HomepageSectionsResponse | { error: string } = await response.json();

      if (!response.ok || !('sections' in data)) {
        throw new Error('Failed to save homepage sections');
      }

      setSections(data.sections.sort((a, b) => a.sortOrder - b.sortOrder));
      setSuccessMessage('Homepage curation saved.');
    } catch (saveError) {
      console.error(saveError);
      setError('Failed to save homepage curation.');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return <p className="text-gray-500">Loading homepage curation...</p>;
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-3 text-[#46A8CC]">Homepage Curation</h1>
        <p className="text-gray-600">
          Reorder homepage sections, toggle visibility, and pin exactly what appears on the public homepage.
        </p>
      </div>

      {error && (
        <div className="mb-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {error}
        </div>
      )}

      {successMessage && (
        <div className="mb-6 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">
          {successMessage}
        </div>
      )}

      <div className="space-y-8">
        {sections
          .sort((a, b) => a.sortOrder - b.sortOrder)
          .map((section, sectionIndex) => (
            <section key={section.id} className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between mb-6">
                <div>
                  <h2 className="text-2xl font-bold">{section.title}</h2>
                  <p className="text-sm text-gray-500 mt-1">
                    Showing up to {section.maxItems} pinned items on the public homepage.
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
                    <input
                      type="checkbox"
                      checked={section.isVisible}
                      onChange={(event) =>
                        updateSection(section.id, (currentSection) => ({
                          ...currentSection,
                          isVisible: event.target.checked,
                        }))
                      }
                      className="h-4 w-4"
                    />
                    Visible
                  </label>
                  <button
                    type="button"
                    onClick={() => moveSection(section.id, 'up')}
                    disabled={sectionIndex === 0}
                    className="rounded-lg border border-gray-300 px-3 py-2 text-sm disabled:opacity-50"
                  >
                    Move Up
                  </button>
                  <button
                    type="button"
                    onClick={() => moveSection(section.id, 'down')}
                    disabled={sectionIndex === sections.length - 1}
                    className="rounded-lg border border-gray-300 px-3 py-2 text-sm disabled:opacity-50"
                  >
                    Move Down
                  </button>
                </div>
              </div>

              <div className="grid gap-6 lg:grid-cols-2">
                <div>
                  <h3 className="text-lg font-bold mb-3">Pinned Items</h3>
                  {section.pinnedItems.length === 0 ? (
                    <div className="rounded-lg border border-dashed border-gray-300 bg-gray-50 p-4 text-sm text-gray-500">
                      No items pinned. This section will fall back to recent content until you add items.
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {section.pinnedItems.map((item, itemIndex) => (
                        <div key={`${item.contentType}-${item.contentId}`} className="rounded-lg border border-gray-200 p-4">
                          <div className="flex items-start justify-between gap-4">
                            <div>
                              <p className="font-semibold">{item.title}</p>
                              {item.metadata && <p className="text-xs text-gray-500 mt-1">{item.metadata}</p>}
                              {item.description && (
                                <p className="text-sm text-gray-600 mt-2 line-clamp-2">{item.description}</p>
                              )}
                            </div>
                            <button
                              type="button"
                              onClick={() => removePinnedItem(section.id, item)}
                              className="text-sm text-red-700 hover:underline"
                            >
                              Remove
                            </button>
                          </div>
                          <div className="mt-3 flex gap-2">
                            <button
                              type="button"
                              onClick={() => movePinnedItem(section.id, itemIndex, 'up')}
                              disabled={itemIndex === 0}
                              className="rounded-lg border border-gray-300 px-3 py-1 text-sm disabled:opacity-50"
                            >
                              Up
                            </button>
                            <button
                              type="button"
                              onClick={() => movePinnedItem(section.id, itemIndex, 'down')}
                              disabled={itemIndex === section.pinnedItems.length - 1}
                              className="rounded-lg border border-gray-300 px-3 py-1 text-sm disabled:opacity-50"
                            >
                              Down
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div>
                  <h3 className="text-lg font-bold mb-3">Available Content</h3>
                  <div className="space-y-3">
                    {section.availableItems.map((item) => {
                      const isAtLimit = section.pinnedItems.length >= section.maxItems;
                      return (
                        <div key={`${item.contentType}-${item.contentId}`} className="rounded-lg border border-gray-200 p-4">
                          <div className="flex items-start justify-between gap-4">
                            <div>
                              <p className="font-semibold">{item.title}</p>
                              {item.metadata && <p className="text-xs text-gray-500 mt-1">{item.metadata}</p>}
                              {item.description && (
                                <p className="text-sm text-gray-600 mt-2 line-clamp-2">{item.description}</p>
                              )}
                            </div>
                            <button
                              type="button"
                              onClick={() => addPinnedItem(section.id, item)}
                              disabled={isAtLimit}
                              className="text-sm font-medium text-[#46A8CC] hover:underline disabled:opacity-50"
                            >
                              Add
                            </button>
                          </div>
                        </div>
                      );
                    })}
                    {section.availableItems.length === 0 && (
                      <div className="rounded-lg border border-dashed border-gray-300 bg-gray-50 p-4 text-sm text-gray-500">
                        No additional content is available for this section right now.
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </section>
          ))}
      </div>

      <div className="mt-8 flex gap-4">
        <button
          type="button"
          onClick={handleSave}
          disabled={isSaving}
          className="rounded-full px-6 py-3 text-sm font-semibold text-white disabled:opacity-50"
          style={{ backgroundColor: '#A51E30' }}
        >
          {isSaving ? 'Saving...' : 'Save Homepage Curation'}
        </button>
      </div>
    </div>
  );
}
