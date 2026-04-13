'use client';

import {
  useEffect,
  useMemo,
  useState,
  type DragEvent,
  type ReactNode,
} from 'react';
import {
  Grip,
  LayoutTemplate,
  MoveVertical,
  Newspaper,
  PanelsTopLeft,
  Search,
} from 'lucide-react';
import type {
  HomepageContentItem,
  HomepageSectionData,
} from '@/lib/homepage';

type HomepageSection = HomepageSectionData;
type HomepageItem = HomepageContentItem;
type ArticleBucketType = 'FEATURED_ARTICLES' | 'LATEST_NEWS';
type DragSource = 'article-pool' | 'hero' | 'latest' | 'recipe-pool' | 'recipe-lane';

interface HomepageSectionsResponse {
  sections: HomepageSection[];
  articleCandidates: HomepageItem[];
  recipeCandidates: HomepageItem[];
}

interface DraggedContentItem {
  item: HomepageItem;
  source: DragSource;
  index: number | null;
}

function getItemKey(item: HomepageItem) {
  return `${item.contentType}:${item.contentId}`;
}

function matchesArticleFilter(item: HomepageItem, filterValue: string) {
  if (!filterValue) {
    return true;
  }

  const searchText = item.searchText ?? `${item.title} ${item.metadata ?? ''}`;
  return searchText.toLowerCase().includes(filterValue);
}

function getSectionByType(
  sections: HomepageSection[],
  sectionType: HomepageSection['sectionType']
) {
  return sections.find((section) => section.sectionType === sectionType) ?? null;
}

function SectionItemCard({
  item,
  actionLabel,
  actionClassName,
  onAction,
  disabled = false,
  children,
}: {
  item: HomepageItem;
  actionLabel: string;
  actionClassName: string;
  onAction: () => void;
  disabled?: boolean;
  children?: ReactNode;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50/65 p-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 space-y-1">
          <p className="font-semibold text-slate-900">{item.title}</p>
          {item.metadata ? <p className="text-xs text-slate-500">{item.metadata}</p> : null}
          {item.description ? (
            <p className="line-clamp-2 text-sm text-slate-600">{item.description}</p>
          ) : null}
        </div>
        <button
          type="button"
          onClick={onAction}
          disabled={disabled}
          className={actionClassName}
        >
          {actionLabel}
        </button>
      </div>
      {children ? <div className="mt-3">{children}</div> : null}
    </div>
  );
}

function ArticleCard({
  item,
  originLabel,
  draggable = false,
  onDragStart,
  onRemove,
}: {
  item: HomepageItem;
  originLabel: string;
  draggable?: boolean;
  onDragStart?: (event: DragEvent<HTMLDivElement>) => void;
  onRemove?: () => void;
}) {
  return (
    <div
      draggable={draggable}
      onDragStart={onDragStart}
      className={`rounded-xl border border-slate-200 bg-white p-3 shadow-sm ${
        draggable ? 'cursor-grab active:cursor-grabbing' : ''
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 space-y-1">
          <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
            <Grip className="h-3.5 w-3.5" />
            {originLabel}
          </div>
          <p className="font-semibold leading-6 text-slate-900">{item.title}</p>
          {item.metadata ? <p className="text-xs text-slate-500">{item.metadata}</p> : null}
          {item.description ? (
            <p className="line-clamp-2 text-sm text-slate-600">{item.description}</p>
          ) : null}
        </div>
        {onRemove ? (
          <button
            type="button"
            onClick={onRemove}
            className="text-sm font-medium text-slate-500 transition hover:text-slate-900"
          >
            Remove
          </button>
        ) : null}
      </div>
    </div>
  );
}

function ArticleBucket({
  title,
  description,
  countLabel,
  isVisible,
  onVisibleChange,
  onDrop,
  children,
}: {
  title: string;
  description: string;
  countLabel: string;
  isVisible: boolean;
  onVisibleChange: (checked: boolean) => void;
  onDrop: (event: DragEvent<HTMLDivElement>) => void;
  children: ReactNode;
}) {
  return (
    <div
      className="rounded-xl border border-slate-200 bg-slate-50/55 p-4"
      onDragOver={(event) => event.preventDefault()}
      onDrop={onDrop}
    >
      <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h3 className="text-base font-bold text-slate-900">{title}</h3>
          <p className="mt-1 text-sm text-slate-500">{description}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-full border border-slate-300 bg-white px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
            {countLabel}
          </span>
          <label className="inline-flex items-center gap-2 rounded-full border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700">
            <input
              type="checkbox"
              checked={isVisible}
              onChange={(event) => onVisibleChange(event.target.checked)}
              className="h-4 w-4"
            />
            Visible
          </label>
        </div>
      </div>
      {children}
    </div>
  );
}

export default function HomepageCurationPage() {
  const [sections, setSections] = useState<HomepageSection[]>([]);
  const [articleCandidates, setArticleCandidates] = useState<HomepageItem[]>([]);
  const [recipeCandidates, setRecipeCandidates] = useState<HomepageItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [articleFilter, setArticleFilter] = useState('');
  const [recipeFilter, setRecipeFilter] = useState('');
  const [draggedItem, setDraggedItem] = useState<DraggedContentItem | null>(null);

  useEffect(() => {
    async function fetchSections() {
      setIsLoading(true);
      setError(null);

      try {
        const response = await fetch('/api/homepage/sections');
        const data: HomepageSectionsResponse | { error: string } = await response.json();

        if (
          !response.ok ||
          !('sections' in data) ||
          !('articleCandidates' in data) ||
          !('recipeCandidates' in data)
        ) {
          throw new Error('Failed to load homepage sections');
        }

        setSections(data.sections.sort((a, b) => a.sortOrder - b.sortOrder));
        setArticleCandidates(data.articleCandidates);
        setRecipeCandidates(data.recipeCandidates);
      } catch (fetchError) {
        console.error(fetchError);
        setError('Failed to load homepage curation data.');
      } finally {
        setIsLoading(false);
      }
    }

    fetchSections();
  }, []);

  const featuredSection = getSectionByType(sections, 'FEATURED_ARTICLES');
  const latestNewsSection = getSectionByType(sections, 'LATEST_NEWS');
  const recipeSection = getSectionByType(sections, 'FEATURED_RECIPES');
  const otherSections = sections.filter(
    (section) =>
      section.sectionType !== 'FEATURED_ARTICLES' &&
      section.sectionType !== 'LATEST_NEWS' &&
      section.sectionType !== 'FEATURED_RECIPES'
  );

  const normalizedArticleFilter = articleFilter.trim().toLowerCase();
  const assignedArticleKeys = useMemo(() => {
    const assignedKeys = new Set<string>();

    if (featuredSection) {
      featuredSection.pinnedItems.forEach((item) => assignedKeys.add(getItemKey(item)));
    }

    if (latestNewsSection) {
      latestNewsSection.pinnedItems.forEach((item) => assignedKeys.add(getItemKey(item)));
    }

    return assignedKeys;
  }, [featuredSection, latestNewsSection]);

  const sourceArticles = useMemo(
    () =>
      articleCandidates.filter(
        (item) =>
          !assignedArticleKeys.has(getItemKey(item)) &&
          matchesArticleFilter(item, normalizedArticleFilter)
      ),
    [articleCandidates, assignedArticleKeys, normalizedArticleFilter]
  );

  const normalizedRecipeFilter = recipeFilter.trim().toLowerCase();
  const assignedRecipeKeys = useMemo(() => {
    const assignedKeys = new Set<string>();

    if (recipeSection) {
      recipeSection.pinnedItems.forEach((item) => assignedKeys.add(getItemKey(item)));
    }

    return assignedKeys;
  }, [recipeSection]);

  const sourceRecipes = useMemo(
    () =>
      recipeCandidates.filter(
        (item) =>
          !assignedRecipeKeys.has(getItemKey(item)) &&
          matchesArticleFilter(item, normalizedRecipeFilter)
      ),
    [recipeCandidates, assignedRecipeKeys, normalizedRecipeFilter]
  );

  const updateSection = (
    sectionId: string,
    updater: (section: HomepageSection) => HomepageSection
  ) => {
    setSections((currentSections) =>
      currentSections.map((section) => (section.id === sectionId ? updater(section) : section))
    );
  };

  const moveOtherSection = (sectionId: string, direction: 'up' | 'down') => {
    setSections((currentSections) => {
      const sorted = [...currentSections].sort((a, b) => a.sortOrder - b.sortOrder);
      const staticSections = sorted.filter(
        (section) =>
          section.sectionType === 'FEATURED_ARTICLES' || section.sectionType === 'LATEST_NEWS'
      );
      const movableSections = sorted.filter(
        (section) =>
          section.sectionType !== 'FEATURED_ARTICLES' && section.sectionType !== 'LATEST_NEWS'
      );
      const index = movableSections.findIndex((section) => section.id === sectionId);
      const targetIndex = direction === 'up' ? index - 1 : index + 1;

      if (index < 0 || targetIndex < 0 || targetIndex >= movableSections.length) {
        return currentSections;
      }

      [movableSections[index], movableSections[targetIndex]] = [
        movableSections[targetIndex],
        movableSections[index],
      ];

      return [...staticSections, ...movableSections].map((section, updatedIndex) => ({
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
      [pinnedItems[itemIndex], pinnedItems[nextIndex]] = [
        pinnedItems[nextIndex],
        pinnedItems[itemIndex],
      ];

      return {
        ...section,
        pinnedItems,
      };
    });
  };

  const moveArticleToBucket = (
    item: HomepageItem,
    targetBucket: ArticleBucketType,
    targetIndex?: number
  ) => {
    setSections((currentSections) => {
      const featured = getSectionByType(currentSections, 'FEATURED_ARTICLES');
      const latest = getSectionByType(currentSections, 'LATEST_NEWS');

      if (!featured || !latest) {
        return currentSections;
      }

      const itemKey = getItemKey(item);
      const featuredItems = featured.pinnedItems.filter(
        (pinnedItem) => getItemKey(pinnedItem) !== itemKey
      );
      const latestItems = latest.pinnedItems.filter(
        (pinnedItem) => getItemKey(pinnedItem) !== itemKey
      );

      let nextFeaturedItems = featuredItems;
      let nextLatestItems = latestItems;

      if (targetBucket === 'FEATURED_ARTICLES') {
        nextFeaturedItems = [item];
      } else {
        const insertIndex =
          targetIndex === undefined
            ? nextLatestItems.length
            : Math.max(0, Math.min(targetIndex, nextLatestItems.length));

        if (nextLatestItems.length >= latest.maxItems) {
          return currentSections;
        }

        nextLatestItems = [
          ...nextLatestItems.slice(0, insertIndex),
          item,
          ...nextLatestItems.slice(insertIndex),
        ];
      }

      return currentSections.map((section) => {
        if (section.sectionType === 'FEATURED_ARTICLES') {
          return {
            ...section,
            pinnedItems: nextFeaturedItems,
          };
        }

        if (section.sectionType === 'LATEST_NEWS') {
          return {
            ...section,
            pinnedItems: nextLatestItems,
          };
        }

        return section;
      });
    });
  };

  const removeArticleFromBuckets = (item: HomepageItem) => {
    setSections((currentSections) =>
      currentSections.map((section) => {
        if (
          section.sectionType !== 'FEATURED_ARTICLES' &&
          section.sectionType !== 'LATEST_NEWS'
        ) {
          return section;
        }

        return {
          ...section,
          pinnedItems: section.pinnedItems.filter(
            (pinnedItem) => getItemKey(pinnedItem) !== getItemKey(item)
          ),
        };
      })
    );
  };

  const reorderLatestArticle = (fromIndex: number, toIndex: number) => {
    if (!latestNewsSection || fromIndex === toIndex) {
      return;
    }

    updateSection(latestNewsSection.id, (section) => {
      const nextItems = [...section.pinnedItems];
      const [movedItem] = nextItems.splice(fromIndex, 1);

      if (!movedItem) {
        return section;
      }

      nextItems.splice(toIndex, 0, movedItem);

      return {
        ...section,
        pinnedItems: nextItems,
      };
    });
  };

  const handleContentDragStart = (
    item: HomepageItem,
    source: DragSource,
    index: number | null
  ) => {
    setDraggedItem({ item, source, index });
  };

  const handleHeroDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();

    if (!draggedItem) {
      return;
    }

    moveArticleToBucket(draggedItem.item, 'FEATURED_ARTICLES');
    setDraggedItem(null);
  };

  const handleLatestDrop = (
    event: DragEvent<HTMLDivElement>,
    targetIndex?: number
  ) => {
    event.preventDefault();

    if (!draggedItem) {
      return;
    }

    if (
      draggedItem.source === 'latest' &&
      draggedItem.index !== null &&
      targetIndex !== undefined
    ) {
      reorderLatestArticle(draggedItem.index, targetIndex);
    } else {
      moveArticleToBucket(draggedItem.item, 'LATEST_NEWS', targetIndex);
    }

    setDraggedItem(null);
  };

  const handleApprovedStoriesDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();

    if (!draggedItem || draggedItem.source === 'article-pool') {
      return;
    }

    removeArticleFromBuckets(draggedItem.item);
    setDraggedItem(null);
  };

  const moveRecipeToLane = (item: HomepageItem, targetIndex?: number) => {
    if (!recipeSection) {
      return;
    }

    updateSection(recipeSection.id, (section) => {
      const nextPinnedItems = section.pinnedItems.filter(
        (pinnedItem) => getItemKey(pinnedItem) !== getItemKey(item)
      );
      const insertIndex =
        targetIndex === undefined
          ? nextPinnedItems.length
          : Math.max(0, Math.min(targetIndex, nextPinnedItems.length));
      const isAlreadyPinned = section.pinnedItems.some(
        (pinnedItem) => getItemKey(pinnedItem) === getItemKey(item)
      );

      if (!isAlreadyPinned && section.pinnedItems.length >= section.maxItems) {
        return section;
      }

      nextPinnedItems.splice(insertIndex, 0, item);

      return {
        ...section,
        pinnedItems: nextPinnedItems,
      };
    });
  };

  const removeRecipeFromLane = (item: HomepageItem) => {
    if (!recipeSection) {
      return;
    }

    updateSection(recipeSection.id, (section) => ({
      ...section,
      pinnedItems: section.pinnedItems.filter(
        (pinnedItem) => getItemKey(pinnedItem) !== getItemKey(item)
      ),
    }));
  };

  const reorderRecipeLane = (fromIndex: number, toIndex: number) => {
    if (!recipeSection || fromIndex === toIndex) {
      return;
    }

    updateSection(recipeSection.id, (section) => {
      const nextItems = [...section.pinnedItems];
      const [movedItem] = nextItems.splice(fromIndex, 1);

      if (!movedItem) {
        return section;
      }

      nextItems.splice(toIndex, 0, movedItem);

      return {
        ...section,
        pinnedItems: nextItems,
      };
    });
  };

  const handleRecipeLaneDrop = (event: DragEvent<HTMLDivElement>, targetIndex?: number) => {
    event.preventDefault();

    if (!draggedItem) {
      return;
    }

    if (
      draggedItem.source === 'recipe-lane' &&
      draggedItem.index !== null &&
      targetIndex !== undefined
    ) {
      reorderRecipeLane(draggedItem.index, targetIndex);
    } else {
      moveRecipeToLane(draggedItem.item, targetIndex);
    }

    setDraggedItem(null);
  };

  const handleRecipePoolDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();

    if (!draggedItem || draggedItem.source === 'recipe-pool') {
      return;
    }

    removeRecipeFromLane(draggedItem.item);
    setDraggedItem(null);
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

      if (
        !response.ok ||
        !('sections' in data) ||
        !('articleCandidates' in data) ||
        !('recipeCandidates' in data)
      ) {
        throw new Error('Failed to save homepage sections');
      }

      setSections(data.sections.sort((a, b) => a.sortOrder - b.sortOrder));
      setArticleCandidates(data.articleCandidates);
      setRecipeCandidates(data.recipeCandidates);
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
    <div className="space-y-4">
      <div className="admin-card">
        <div className="admin-card-header">
          <div className="flex items-center gap-0">
            <div className="admin-card-header-icon" aria-hidden="true">
              <LayoutTemplate className="h-4 w-4" />
            </div>
            <div className="admin-card-header-label">Homepage Curation</div>
          </div>
          <div className="admin-card-header-actions">Homepage</div>
        </div>
        <div className="admin-card-body">
          <p className="text-sm text-slate-600">
            Curate the homepage hero, latest news, and the dedicated recipe lane here. Article buckets stay article-only, while recipes are pinned in their own homepage section.
          </p>

          {error ? (
            <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
              {error}
            </div>
          ) : null}

          {successMessage ? (
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
              {successMessage}
            </div>
          ) : null}
        </div>
        <div className="admin-card-footer">
          <div className="admin-card-footer-label">
            Featured runs as a single hero story. Latest News supports up to five ordered titles.
          </div>
          <div className="admin-card-footer-actions">
            <button
              type="button"
              onClick={handleSave}
              disabled={isSaving}
              className="rounded-full bg-[#A51E30] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#8f1929] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isSaving ? 'Saving...' : 'Save Homepage Curation'}
            </button>
          </div>
        </div>
      </div>

      {featuredSection && latestNewsSection ? (
        <section className="admin-card">
          <div className="admin-card-header">
            <div className="flex items-center gap-0">
              <div className="admin-card-header-icon" aria-hidden="true">
                <Newspaper className="h-4 w-4" />
              </div>
              <div className="admin-card-header-label">Article Buckets</div>
            </div>
            <div className="admin-card-header-actions">Drag and drop</div>
          </div>
          <div className="admin-card-body">
            <div className="grid gap-4 xl:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)]">
              <div
                className="rounded-xl border border-slate-200 bg-slate-50/55 p-4"
                onDragOver={(event) => event.preventDefault()}
                onDrop={handleApprovedStoriesDrop}
              >
                <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <h3 className="text-base font-bold text-slate-900">Approved Stories</h3>
                    <p className="mt-1 text-sm text-slate-500">
                      Published articles available for the homepage article buckets.
                    </p>
                  </div>
                  <span className="rounded-full border border-slate-300 bg-white px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                    {sourceArticles.length} available
                  </span>
                </div>

                <label className="admin-list-filter mb-4">
                  <span className="admin-list-filter-label">Filter: Title, Author</span>
                  <span className="relative">
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      value={articleFilter}
                      onChange={(event) => setArticleFilter(event.target.value)}
                      placeholder="Search by title or author last name"
                      className="admin-list-filter-input pl-9"
                    />
                  </span>
                </label>

                {sourceArticles.length === 0 ? (
                  <div className="rounded-lg border border-dashed border-slate-300 bg-white p-4 text-sm text-slate-500">
                    No approved stories match the current filter.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {sourceArticles.map((item) => (
                      <ArticleCard
                        key={getItemKey(item)}
                        item={item}
                        originLabel="Approved stories"
                        draggable
                        onDragStart={(event) => {
                          event.dataTransfer.effectAllowed = 'move';
                          handleContentDragStart(item, 'article-pool', null);
                        }}
                      />
                    ))}
                  </div>
                )}
              </div>

              <div className="space-y-4">
                <ArticleBucket
                  title="Hero"
                  description="Single top story at the top of the homepage."
                  countLabel={`${featuredSection.pinnedItems.length}/1`}
                  isVisible={featuredSection.isVisible}
                  onVisibleChange={(checked) =>
                    updateSection(featuredSection.id, (section) => ({
                      ...section,
                      isVisible: checked,
                    }))
                  }
                  onDrop={handleHeroDrop}
                >
                  {featuredSection.pinnedItems.length === 0 ? (
                    <div className="rounded-lg border border-dashed border-slate-300 bg-white p-4 text-sm text-slate-500">
                      Drag one approved story here to set the hero article.
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {featuredSection.pinnedItems.map((item) => (
                        <ArticleCard
                          key={getItemKey(item)}
                          item={item}
                          originLabel="Hero"
                          draggable
                          onDragStart={(event) => {
                            event.dataTransfer.effectAllowed = 'move';
                              handleContentDragStart(item, 'hero', 0);
                          }}
                          onRemove={() => removeArticleFromBuckets(item)}
                        />
                      ))}
                    </div>
                  )}
                </ArticleBucket>

                <ArticleBucket
                  title="Latest News"
                  description="Ordered article titles directly below the hero story."
                  countLabel={`${latestNewsSection.pinnedItems.length}/5`}
                  isVisible={latestNewsSection.isVisible}
                  onVisibleChange={(checked) =>
                    updateSection(latestNewsSection.id, (section) => ({
                      ...section,
                      isVisible: checked,
                    }))
                  }
                  onDrop={(event) => handleLatestDrop(event)}
                >
                  {latestNewsSection.pinnedItems.length === 0 ? (
                    <div className="rounded-lg border border-dashed border-slate-300 bg-white p-4 text-sm text-slate-500">
                      Drag up to five approved stories here. Drop between cards to order them.
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {latestNewsSection.pinnedItems.map((item, index) => (
                        <div
                          key={getItemKey(item)}
                          onDragOver={(event) => event.preventDefault()}
                          onDrop={(event) => handleLatestDrop(event, index)}
                        >
                          <ArticleCard
                            item={item}
                            originLabel={`Latest news ${index + 1}`}
                            draggable
                            onDragStart={(event) => {
                              event.dataTransfer.effectAllowed = 'move';
                              handleContentDragStart(item, 'latest', index);
                            }}
                            onRemove={() => removeArticleFromBuckets(item)}
                          />
                        </div>
                      ))}
                      {latestNewsSection.pinnedItems.length < latestNewsSection.maxItems ? (
                        <div
                          className="rounded-lg border border-dashed border-slate-300 bg-white px-4 py-3 text-sm text-slate-500"
                          onDragOver={(event) => event.preventDefault()}
                          onDrop={(event) =>
                            handleLatestDrop(event, latestNewsSection.pinnedItems.length)
                          }
                        >
                          Drop here to append another latest-news story.
                        </div>
                      ) : null}
                    </div>
                  )}
                </ArticleBucket>
              </div>
            </div>
          </div>
          <div className="admin-card-footer">
            <div className="admin-card-footer-label">
              Dragging a story into Hero automatically removes it from Latest News, and vice versa.
            </div>
            <div className="admin-card-footer-actions">
              <span className="inline-flex items-center gap-1 text-xs text-slate-500">
                <MoveVertical className="h-3.5 w-3.5" />
                Drop back into Approved Stories to remove from a bucket.
              </span>
            </div>
          </div>
        </section>
      ) : null}

      {recipeSection ? (
        <section className="admin-card">
          <div className="admin-card-header">
            <div className="flex items-center gap-0">
              <div className="admin-card-header-icon" aria-hidden="true">
                <PanelsTopLeft className="h-4 w-4" />
              </div>
              <div className="admin-card-header-label">Recipe Lane</div>
            </div>
            <div className="admin-card-header-actions">Drag and drop</div>
          </div>
          <div className="admin-card-body">
            <div className="grid gap-4 xl:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)]">
              <div
                className="rounded-xl border border-slate-200 bg-slate-50/55 p-4"
                onDragOver={(event) => event.preventDefault()}
                onDrop={handleRecipePoolDrop}
              >
                <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <h3 className="text-base font-bold text-slate-900">Published Recipes</h3>
                    <p className="mt-1 text-sm text-slate-500">
                      Published recipes available for the homepage recipe lane.
                    </p>
                  </div>
                  <span className="rounded-full border border-slate-300 bg-white px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                    {sourceRecipes.length} available
                  </span>
                </div>

                <label className="admin-list-filter mb-4">
                  <span className="admin-list-filter-label">Filter: Title, Author</span>
                  <span className="relative">
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      value={recipeFilter}
                      onChange={(event) => setRecipeFilter(event.target.value)}
                      placeholder="Search by title or author last name"
                      className="admin-list-filter-input pl-9"
                    />
                  </span>
                </label>

                {sourceRecipes.length === 0 ? (
                  <div className="rounded-lg border border-dashed border-slate-300 bg-white p-4 text-sm text-slate-500">
                    No published recipes match the current filter.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {sourceRecipes.map((item) => (
                      <ArticleCard
                        key={getItemKey(item)}
                        item={item}
                        originLabel="Published recipes"
                        draggable
                        onDragStart={(event) => {
                          event.dataTransfer.effectAllowed = 'move';
                          handleContentDragStart(item, 'recipe-pool', null);
                        }}
                      />
                    ))}
                  </div>
                )}
              </div>

              <ArticleBucket
                title="Homepage Recipe Lane"
                description="Ordered recipe cards shown in the dedicated homepage Recipes & Food section."
                countLabel={`${recipeSection.pinnedItems.length}/${recipeSection.maxItems}`}
                isVisible={recipeSection.isVisible}
                onVisibleChange={(checked) =>
                  updateSection(recipeSection.id, (section) => ({
                    ...section,
                    isVisible: checked,
                  }))
                }
                onDrop={(event) => handleRecipeLaneDrop(event)}
              >
                {recipeSection.pinnedItems.length === 0 ? (
                  <div className="rounded-lg border border-dashed border-slate-300 bg-white p-4 text-sm text-slate-500">
                    Drag up to {recipeSection.maxItems} recipes here. Drop between cards to order them.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {recipeSection.pinnedItems.map((item, index) => (
                      <div
                        key={getItemKey(item)}
                        onDragOver={(event) => event.preventDefault()}
                        onDrop={(event) => handleRecipeLaneDrop(event, index)}
                      >
                        <ArticleCard
                          item={item}
                          originLabel={`Recipe lane ${index + 1}`}
                          draggable
                          onDragStart={(event) => {
                            event.dataTransfer.effectAllowed = 'move';
                            handleContentDragStart(item, 'recipe-lane', index);
                          }}
                          onRemove={() => removeRecipeFromLane(item)}
                        />
                      </div>
                    ))}
                    {recipeSection.pinnedItems.length < recipeSection.maxItems ? (
                      <div
                        className="rounded-lg border border-dashed border-slate-300 bg-white px-4 py-3 text-sm text-slate-500"
                        onDragOver={(event) => event.preventDefault()}
                        onDrop={(event) => handleRecipeLaneDrop(event, recipeSection.pinnedItems.length)}
                      >
                        Drop here to append another homepage recipe.
                      </div>
                    ) : null}
                  </div>
                )}
              </ArticleBucket>
            </div>
          </div>
          <div className="admin-card-footer">
            <div className="admin-card-footer-label">
              Drop a recipe back into Published Recipes to remove it from the homepage lane.
            </div>
            <div className="admin-card-footer-actions">
              <span className="inline-flex items-center gap-1 text-xs text-slate-500">
                <MoveVertical className="h-3.5 w-3.5" />
                Reorder recipes directly inside the lane.
              </span>
            </div>
          </div>
        </section>
      ) : null}

      <div className="space-y-4">
        {otherSections
          .sort((a, b) => a.sortOrder - b.sortOrder)
          .map((section, sectionIndex) => (
            <section key={section.id} className="admin-card">
              <div className="admin-card-header">
                <div className="flex items-center gap-0">
                  <div className="admin-card-header-icon" aria-hidden="true">
                    <PanelsTopLeft className="h-4 w-4" />
                  </div>
                  <div className="admin-card-header-label">{section.title}</div>
                </div>
                <div className="admin-card-header-actions">
                  {section.maxItems} max pinned
                </div>
              </div>

              <div className="admin-card-body">
                <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
                  <p className="text-sm text-slate-500">
                    Showing up to {section.maxItems} pinned items on the public homepage.
                  </p>
                  <div className="flex flex-wrap items-center gap-2">
                    <label className="inline-flex items-center gap-2 rounded-full border border-slate-300 bg-slate-50 px-3 py-1.5 text-sm font-medium text-slate-700">
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
                      onClick={() => moveOtherSection(section.id, 'up')}
                      disabled={sectionIndex === 0}
                      className="rounded-full border border-slate-300 px-3 py-1.5 text-sm text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Move Up
                    </button>
                    <button
                      type="button"
                      onClick={() => moveOtherSection(section.id, 'down')}
                      disabled={sectionIndex === otherSections.length - 1}
                      className="rounded-full border border-slate-300 px-3 py-1.5 text-sm text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Move Down
                    </button>
                  </div>
                </div>

                <div className="grid gap-4 xl:grid-cols-2">
                  <div className="rounded-xl border border-slate-200 p-4">
                    <div className="mb-3 flex items-center justify-between gap-3">
                      <h3 className="text-base font-bold text-slate-900">Pinned Items</h3>
                      <span className="text-xs font-medium uppercase tracking-[0.08em] text-slate-500">
                        {section.pinnedItems.length}/{section.maxItems}
                      </span>
                    </div>
                    {section.pinnedItems.length === 0 ? (
                      <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-500">
                        No items pinned. This section will fall back to recent content until you add items.
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {section.pinnedItems.map((item, itemIndex) => (
                          <SectionItemCard
                            key={getItemKey(item)}
                            item={item}
                            actionLabel="Remove"
                            onAction={() => removePinnedItem(section.id, item)}
                            actionClassName="text-sm font-medium text-red-700 transition hover:text-red-800"
                          >
                            <div className="flex gap-2">
                              <button
                                type="button"
                                onClick={() => movePinnedItem(section.id, itemIndex, 'up')}
                                disabled={itemIndex === 0}
                                className="rounded-full border border-slate-300 px-3 py-1 text-sm text-slate-700 transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-50"
                              >
                                Up
                              </button>
                              <button
                                type="button"
                                onClick={() => movePinnedItem(section.id, itemIndex, 'down')}
                                disabled={itemIndex === section.pinnedItems.length - 1}
                                className="rounded-full border border-slate-300 px-3 py-1 text-sm text-slate-700 transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-50"
                              >
                                Down
                              </button>
                            </div>
                          </SectionItemCard>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="rounded-xl border border-slate-200 p-4">
                    <div className="mb-3 flex items-center justify-between gap-3">
                      <h3 className="text-base font-bold text-slate-900">Available Content</h3>
                      <span className="inline-flex items-center gap-1 text-xs font-medium uppercase tracking-[0.08em] text-slate-500">
                        <MoveVertical className="h-3.5 w-3.5" />
                        Pin into section
                      </span>
                    </div>
                    <div className="space-y-3">
                      {section.availableItems.map((item) => {
                        const isAtLimit = section.pinnedItems.length >= section.maxItems;
                        return (
                          <SectionItemCard
                            key={getItemKey(item)}
                            item={item}
                            actionLabel="Add"
                            onAction={() => addPinnedItem(section.id, item)}
                            disabled={isAtLimit}
                            actionClassName="text-sm font-medium text-[#46A8CC] transition hover:text-[#2d89ab] disabled:cursor-not-allowed disabled:opacity-50"
                          />
                        );
                      })}
                      {section.availableItems.length === 0 ? (
                        <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-500">
                          No additional content is available for this section right now.
                        </div>
                      ) : null}
                    </div>
                  </div>
                </div>
              </div>
            </section>
          ))}
      </div>
    </div>
  );
}
