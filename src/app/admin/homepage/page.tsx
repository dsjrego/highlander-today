'use client';

import { useEffect, useMemo, useState } from 'react';
import { LayoutTemplate, MoveVertical, PanelsTopLeft, Search } from 'lucide-react';
import { AdminChip } from '@/components/admin/AdminChip';
import { AdminPage } from '@/components/admin/AdminPage';
import type { HomepageBoxData, HomepageBoxType, HomepageContentItem } from '@/lib/homepage';

type HomepageBox = HomepageBoxData;
type HomepageItem = HomepageContentItem;

interface HomepageBoxesResponse {
  boxes: HomepageBox[];
  articleCandidates: HomepageItem[];
  recipeCandidates: HomepageItem[];
  eventCandidates: HomepageItem[];
  marketplaceCandidates: HomepageItem[];
}

function getItemKey(item: Pick<HomepageItem, 'contentType' | 'contentId'>) {
  return `${item.contentType}:${item.contentId}`;
}

function getBoxCandidates(
  boxType: HomepageBoxType,
  candidatePools: HomepageBoxesResponse
) {
  switch (boxType) {
    case 'ARTICLES':
      return candidatePools.articleCandidates;
    case 'RECIPES':
      return candidatePools.recipeCandidates;
    case 'EVENTS':
      return candidatePools.eventCandidates;
    case 'MARKETPLACE':
      return candidatePools.marketplaceCandidates;
  }
}

function ItemCard({
  item,
  actionLabel,
  actionClassName,
  onAction,
  disabled = false,
  secondaryActionLabel,
  secondaryActionClassName,
  onSecondaryAction,
  secondaryDisabled = false,
}: {
  item: HomepageItem;
  actionLabel: string;
  actionClassName: string;
  onAction: () => void;
  disabled?: boolean;
  secondaryActionLabel?: string;
  secondaryActionClassName?: string;
  onSecondaryAction?: () => void;
  secondaryDisabled?: boolean;
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
        <div className="flex shrink-0 flex-col items-end gap-2">
          <button
            type="button"
            onClick={onAction}
            disabled={disabled}
            className={actionClassName}
          >
            {actionLabel}
          </button>
          {secondaryActionLabel && onSecondaryAction ? (
            <button
              type="button"
              onClick={onSecondaryAction}
              disabled={secondaryDisabled}
              className={secondaryActionClassName}
            >
              {secondaryActionLabel}
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}

const primaryActionButtonClass =
  'inline-flex items-center justify-center rounded-full bg-[var(--hl-admin-accent)] px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50';

const neutralActionButtonClass =
  'inline-flex items-center justify-center rounded-full border border-[var(--hl-admin-border)] bg-[var(--hl-admin-surface-muted)] px-3 py-1.5 text-sm font-semibold text-[var(--hl-admin-text)] transition hover:border-[var(--hl-admin-border-strong)] hover:bg-[var(--hl-admin-row-hover)] disabled:cursor-not-allowed disabled:opacity-50';

export default function HomepageCurationPage() {
  const [boxes, setBoxes] = useState<HomepageBox[]>([]);
  const [candidatePools, setCandidatePools] = useState<HomepageBoxesResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [filters, setFilters] = useState<Record<HomepageBoxType, string>>({
    ARTICLES: '',
    RECIPES: '',
    EVENTS: '',
    MARKETPLACE: '',
  });

  useEffect(() => {
    async function fetchBoxes() {
      setIsLoading(true);
      setError(null);

      try {
        const response = await fetch('/api/homepage/sections');
        const data: HomepageBoxesResponse | { error: string } = await response.json();

        if (
          !response.ok ||
          !('boxes' in data) ||
          !('articleCandidates' in data) ||
          !('recipeCandidates' in data) ||
          !('eventCandidates' in data) ||
          !('marketplaceCandidates' in data)
        ) {
          throw new Error('Failed to load homepage boxes');
        }

        const sortedBoxes = data.boxes.sort((a, b) => a.sortOrder - b.sortOrder);
        setBoxes(sortedBoxes);
        setCandidatePools({
          boxes: sortedBoxes,
          articleCandidates: data.articleCandidates,
          recipeCandidates: data.recipeCandidates,
          eventCandidates: data.eventCandidates,
          marketplaceCandidates: data.marketplaceCandidates,
        });
      } catch (fetchError) {
        console.error(fetchError);
        setError('Failed to load homepage curation data.');
      } finally {
        setIsLoading(false);
      }
    }

    fetchBoxes();
  }, []);

  const updateBox = (boxType: HomepageBoxType, updater: (box: HomepageBox) => HomepageBox) => {
    setBoxes((currentBoxes) =>
      currentBoxes.map((box) => (box.boxType === boxType ? updater(box) : box))
    );
  };

  const moveBox = (boxType: HomepageBoxType, direction: 'up' | 'down') => {
    setBoxes((currentBoxes) => {
      const sorted = [...currentBoxes].sort((a, b) => a.sortOrder - b.sortOrder);
      const index = sorted.findIndex((box) => box.boxType === boxType);
      const targetIndex = direction === 'up' ? index - 1 : index + 1;

      if (index < 0 || targetIndex < 0 || targetIndex >= sorted.length) {
        return currentBoxes;
      }

      [sorted[index], sorted[targetIndex]] = [sorted[targetIndex], sorted[index]];

      return sorted.map((box, orderIndex) => ({
        ...box,
        sortOrder: orderIndex + 1,
      }));
    });
  };

  const setHeroItem = (boxType: HomepageBoxType, item: HomepageItem) => {
    updateBox(boxType, (box) => ({
      ...box,
      heroItem: item,
      linkItems: box.linkItems.filter((linkItem) => getItemKey(linkItem) !== getItemKey(item)),
    }));
  };

  const removeHeroItem = (boxType: HomepageBoxType) => {
    updateBox(boxType, (box) => ({
      ...box,
      heroItem: null,
      linkItems: [],
    }));
  };

  const addLinkItem = (boxType: HomepageBoxType, item: HomepageItem) => {
    updateBox(boxType, (box) => {
      if (!box.heroItem || box.linkItems.some((linkItem) => getItemKey(linkItem) === getItemKey(item))) {
        return box;
      }

      const maxLinks = box.maxLinks;
      if (box.linkItems.length >= maxLinks || getItemKey(box.heroItem) === getItemKey(item)) {
        return box;
      }

      return {
        ...box,
        linkItems: [...box.linkItems, item],
      };
    });
  };

  const removeLinkItem = (boxType: HomepageBoxType, item: HomepageItem) => {
    updateBox(boxType, (box) => ({
      ...box,
      linkItems: box.linkItems.filter((linkItem) => getItemKey(linkItem) !== getItemKey(item)),
    }));
  };

  const moveLinkItem = (boxType: HomepageBoxType, index: number, direction: 'up' | 'down') => {
    updateBox(boxType, (box) => {
      const nextIndex = direction === 'up' ? index - 1 : index + 1;
      if (nextIndex < 0 || nextIndex >= box.linkItems.length) {
        return box;
      }

      const nextLinks = [...box.linkItems];
      [nextLinks[index], nextLinks[nextIndex]] = [nextLinks[nextIndex], nextLinks[index]];

      return {
        ...box,
        linkItems: nextLinks,
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
          boxes: boxes
            .sort((a, b) => a.sortOrder - b.sortOrder)
            .map((box, index) => ({
              boxType: box.boxType,
              sortOrder: index + 1,
              isVisible: box.isVisible,
              heroItem: box.heroItem
                ? {
                    contentType: box.heroItem.contentType,
                    contentId: box.heroItem.contentId,
                  }
                : null,
              linkItems: box.linkItems.map((item) => ({
                contentType: item.contentType,
                contentId: item.contentId,
              })),
            })),
        }),
      });

      const data: HomepageBoxesResponse | { error: string } = await response.json();

      if (
        !response.ok ||
        !('boxes' in data) ||
        !('articleCandidates' in data) ||
        !('recipeCandidates' in data) ||
        !('eventCandidates' in data) ||
        !('marketplaceCandidates' in data)
      ) {
        throw new Error('Failed to save homepage boxes');
      }

      const sortedBoxes = data.boxes.sort((a, b) => a.sortOrder - b.sortOrder);
      setBoxes(sortedBoxes);
      setCandidatePools({
        boxes: sortedBoxes,
        articleCandidates: data.articleCandidates,
        recipeCandidates: data.recipeCandidates,
        eventCandidates: data.eventCandidates,
        marketplaceCandidates: data.marketplaceCandidates,
      });
      setSuccessMessage('Homepage curation saved.');
    } catch (saveError) {
      console.error(saveError);
      setError(saveError instanceof Error ? saveError.message : 'Failed to save homepage curation.');
    } finally {
      setIsSaving(false);
    }
  };

  const sortedBoxes = useMemo(
    () => [...boxes].sort((a, b) => a.sortOrder - b.sortOrder),
    [boxes]
  );

  if (isLoading) {
    return (
      <AdminPage title="Homepage" count={boxes.length}>
        <div className="admin-section-card">
          <p className="text-sm text-slate-500">Loading homepage curation...</p>
        </div>
      </AdminPage>
    );
  }

  return (
    <AdminPage
      title="Homepage"
      count={sortedBoxes.length}
      actions={
        <button
          type="button"
          onClick={handleSave}
          disabled={isSaving}
          className={primaryActionButtonClass}
        >
          {isSaving ? 'Saving...' : 'Save Curation'}
        </button>
      }
    >
      <div className="admin-section-card">
        <div className="admin-section-card-head">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-[var(--hl-admin-border)] bg-[var(--hl-admin-surface-muted)] text-[var(--hl-admin-link)]">
              <LayoutTemplate className="h-4 w-4" />
            </div>
            <div>
              <h2 className="admin-section-card-title">Homepage Curation</h2>
              <p className="mt-1 text-sm text-slate-500">
                Ordered boxes drive the public homepage flow on desktop and mobile.
              </p>
            </div>
          </div>
          <AdminChip tone="role">Ordered Boxes</AdminChip>
        </div>
        <div className="space-y-3">
          <p className="text-sm text-slate-600">
            Each box gets one hero item and optional supporting links. Set the box order first, then choose the hero and supporting links inside each box.
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
        <div className="mt-4 flex flex-col gap-3 border-t border-[var(--hl-admin-border)] pt-4 md:flex-row md:items-center md:justify-between">
          <p className="text-sm text-slate-500">
            Save after reordering boxes or changing hero and supporting-link assignments.
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <AdminChip tone="neu">{sortedBoxes.length} boxes</AdminChip>
            <button
              type="button"
              onClick={handleSave}
              disabled={isSaving}
              className={primaryActionButtonClass}
            >
              {isSaving ? 'Saving...' : 'Save Curation'}
            </button>
          </div>
        </div>
      </div>

      {sortedBoxes.map((box, boxIndex) => {
        const candidates = candidatePools ? getBoxCandidates(box.boxType, candidatePools) : [];
        const selectedKeys = new Set(
          [box.heroItem, ...box.linkItems].filter(Boolean).map((item) => getItemKey(item as HomepageItem))
        );
        const filterValue = filters[box.boxType].trim().toLowerCase();
        const filteredCandidates = candidates.filter((item) => {
          const searchText = `${item.title} ${item.metadata ?? ''} ${item.searchText ?? ''}`.toLowerCase();
          return searchText.includes(filterValue);
        });
        const availableCandidates = filteredCandidates.filter(
          (item) => !selectedKeys.has(getItemKey(item))
        );
        const maxLinks = box.maxLinks;

        return (
          <section key={box.boxType} className="admin-section-card">
            <div className="admin-section-card-head">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-[var(--hl-admin-border)] bg-[var(--hl-admin-surface-muted)] text-[var(--hl-admin-link)]">
                  <PanelsTopLeft className="h-4 w-4" />
                </div>
                <div>
                  <h2 className="admin-section-card-title">{box.title}</h2>
                  <p className="mt-1 text-sm text-slate-500">{box.description}</p>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <AdminChip tone="role">{box.boxType}</AdminChip>
                <AdminChip tone={box.isVisible ? 'ok' : 'neu'}>{box.isVisible ? 'Visible' : 'Hidden'}</AdminChip>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
                <div className="flex flex-wrap items-center gap-2">
                  <AdminChip tone="neu">1 hero + up to {maxLinks} links</AdminChip>
                  <AdminChip tone="neu">{availableCandidates.length} available</AdminChip>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <label className="inline-flex items-center gap-2 rounded-full border border-[var(--hl-admin-border)] bg-[var(--hl-admin-surface-muted)] px-3 py-1.5 text-sm font-medium text-[var(--hl-admin-text)]">
                    <input
                      type="checkbox"
                      checked={box.isVisible}
                      onChange={(event) =>
                        updateBox(box.boxType, (currentBox) => ({
                          ...currentBox,
                          isVisible: event.target.checked,
                        }))
                      }
                      className="h-4 w-4"
                    />
                    Visible
                  </label>
                  <button
                    type="button"
                    onClick={() => moveBox(box.boxType, 'up')}
                    disabled={boxIndex === 0}
                    className={neutralActionButtonClass}
                  >
                    Move Up
                  </button>
                  <button
                    type="button"
                    onClick={() => moveBox(box.boxType, 'down')}
                    disabled={boxIndex === sortedBoxes.length - 1}
                    className={neutralActionButtonClass}
                  >
                    Move Down
                  </button>
                </div>
              </div>

              <div className="grid gap-4 xl:grid-cols-2">
                <div className="space-y-4">
                  <div className="rounded-2xl border border-[var(--hl-admin-border)] bg-[var(--hl-admin-surface)] p-4">
                    <div className="mb-3 flex items-center justify-between gap-3">
                      <h3 className="text-base font-bold text-slate-900">Hero Item</h3>
                      <AdminChip tone="pend">Required for links</AdminChip>
                    </div>

                    {box.heroItem ? (
                      <ItemCard
                        item={box.heroItem}
                        actionLabel="Remove"
                        onAction={() => removeHeroItem(box.boxType)}
                        actionClassName="text-sm font-medium text-red-700 transition hover:text-red-800"
                      />
                    ) : (
                      <div className="rounded-xl border border-dashed border-[var(--hl-admin-border)] bg-[var(--hl-admin-surface)] p-4 text-sm text-slate-500">
                        No hero selected yet.
                      </div>
                    )}
                  </div>

                  <div className="rounded-2xl border border-[var(--hl-admin-border)] bg-[var(--hl-admin-surface)] p-4">
                    <div className="mb-3 flex items-center justify-between gap-3">
                      <h3 className="text-base font-bold text-slate-900">Supporting Links</h3>
                      <span className="inline-flex items-center gap-1 text-xs font-medium uppercase tracking-[0.08em] text-slate-500">
                        <MoveVertical className="h-3.5 w-3.5" />
                        {box.linkItems.length}/{maxLinks}
                      </span>
                    </div>

                    {box.linkItems.length === 0 ? (
                      <div className="rounded-xl border border-dashed border-[var(--hl-admin-border)] bg-[var(--hl-admin-surface)] p-4 text-sm text-slate-500">
                        No supporting links selected.
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {box.linkItems.map((item, index) => (
                          <div
                            key={getItemKey(item)}
                            className="rounded-xl border border-[var(--hl-admin-border)] bg-[var(--hl-admin-surface)] p-3"
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0 space-y-1">
                                <p className="font-semibold text-slate-900">{item.title}</p>
                                {item.metadata ? <p className="text-xs text-slate-500">{item.metadata}</p> : null}
                              </div>
                              <button
                                type="button"
                                onClick={() => removeLinkItem(box.boxType, item)}
                                className="text-sm font-medium text-red-700 transition hover:text-red-800"
                              >
                                Remove
                              </button>
                            </div>
                            <div className="mt-3 flex gap-2">
                              <button
                                type="button"
                                onClick={() => moveLinkItem(box.boxType, index, 'up')}
                                disabled={index === 0}
                                className={neutralActionButtonClass}
                              >
                                Up
                              </button>
                              <button
                                type="button"
                                onClick={() => moveLinkItem(box.boxType, index, 'down')}
                                disabled={index === box.linkItems.length - 1}
                                className={neutralActionButtonClass}
                              >
                                Down
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <div className="rounded-2xl border border-[var(--hl-admin-border)] bg-[var(--hl-admin-surface)] p-4">
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <h3 className="text-base font-bold text-slate-900">Available Content</h3>
                    <AdminChip tone="neu">{availableCandidates.length} available</AdminChip>
                  </div>

                  <label className="admin-list-filter mb-4">
                    <span className="admin-list-filter-label">Filter</span>
                    <span className="relative">
                      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                      <input
                        type="text"
                        value={filters[box.boxType]}
                        onChange={(event) =>
                          setFilters((currentFilters) => ({
                            ...currentFilters,
                            [box.boxType]: event.target.value,
                          }))
                        }
                        placeholder="Search title or metadata"
                        className="admin-list-filter-input pl-9"
                      />
                    </span>
                  </label>

                  {availableCandidates.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-[var(--hl-admin-border)] bg-[var(--hl-admin-surface)] p-4 text-sm text-slate-500">
                      No available content matches the current filter.
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {availableCandidates.map((item) => (
                        <ItemCard
                          key={getItemKey(item)}
                          item={item}
                          actionLabel={box.heroItem ? 'Replace Hero' : 'Set Hero'}
                          onAction={() => setHeroItem(box.boxType, item)}
                          actionClassName="text-sm font-medium text-[var(--hl-admin-accent)] transition hover:opacity-80"
                          secondaryActionLabel="Add Link"
                          onSecondaryAction={() => addLinkItem(box.boxType, item)}
                          secondaryDisabled={!box.heroItem || box.linkItems.length >= maxLinks}
                          secondaryActionClassName="text-sm font-medium text-[var(--hl-admin-link)] transition hover:opacity-80 disabled:cursor-not-allowed disabled:opacity-50"
                        />
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </section>
        );
      })}
    </AdminPage>
  );
}
