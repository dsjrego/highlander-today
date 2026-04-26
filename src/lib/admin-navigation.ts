export type AdminNavItem = {
  href: string;
  label: string;
};

export type AdminNavSection = {
  title: string;
  items: ReadonlyArray<AdminNavItem>;
};

export type AdminSidebarOrder = {
  preferredOrder: Record<string, { section: string; index: number }>;
  preferredSectionOrder: string[];
};

export const ADMIN_SIDEBAR_ORDER_SETTING_KEY = 'admin_sidebar_order';

export const defaultAdminNavSections = [
  {
    title: 'Overview',
    items: [
      { href: '/admin', label: 'Dashboard' },
      { href: '/admin/homepage', label: 'Homepage' },
      { href: '/admin/analytics', label: 'Analytics' },
    ],
  },
  {
    title: 'Publishing',
    items: [
      { href: '/admin/content', label: 'Content Approvals' },
      { href: '/admin/articles', label: 'Articles' },
      { href: '/admin/memoriam', label: 'Memoriam' },
      { href: '/admin/reporter', label: 'Reporter' },
      { href: '/admin/recipes', label: 'Recipes' },
      { href: '/admin/events', label: 'Events' },
      { href: '/admin/organizations', label: 'Organizations' },
      { href: '/admin/categories', label: 'Navigation' },
    ],
  },
  {
    title: 'Community',
    items: [
      { href: '/admin/users', label: 'Users' },
      { href: '/admin/trust', label: 'Trust' },
      { href: '/admin/bans', label: 'Bans' },
      { href: '/admin/stores', label: 'Stores' },
    ],
  },
  {
    title: 'Platform',
    items: [
      { href: '/admin/sites', label: 'Sites' },
      { href: '/admin/content-architecture', label: 'Content Architecture' },
      { href: '/admin/audit', label: 'Audit Log' },
      { href: '/admin/settings', label: 'Settings' },
    ],
  },
] as const satisfies ReadonlyArray<AdminNavSection>;

const superAdminNavSection = {
  title: 'Super Admin',
  items: [
    { href: '/admin/places', label: 'Places' },
    { href: '/admin/coverage', label: 'Coverage' },
    { href: '/admin/geography', label: 'Geography' },
    { href: '/admin/observed-geo', label: 'Observed Geo' },
    { href: '/admin/roadmap', label: 'Roadmap' },
  ],
} as const satisfies AdminNavSection;

export function getVisibleAdminNavSections(isSuperAdmin: boolean): ReadonlyArray<AdminNavSection> {
  return isSuperAdmin ? [...defaultAdminNavSections, superAdminNavSection] : defaultAdminNavSections;
}

export function normalizeAdminNavSections(
  sourceSections: ReadonlyArray<AdminNavSection>,
  sidebarOrder: AdminSidebarOrder
): AdminNavSection[] {
  const originalSectionByHref = new Map<string, string>();
  const allItems = new Map<string, AdminNavItem>();
  const visibleSectionTitles = new Set(sourceSections.map((section) => section.title));

  for (const section of sourceSections) {
    for (const item of section.items) {
      originalSectionByHref.set(item.href, section.title);
      allItems.set(item.href, item);
    }
  }

  function getVisiblePreferredSection(href: string) {
    const preferredSection = sidebarOrder.preferredOrder[href]?.section;
    return preferredSection && visibleSectionTitles.has(preferredSection) ? preferredSection : undefined;
  }

  const normalizedSections = sourceSections.map((section) => {
    const items = [...allItems.values()]
      .filter((item) => {
        const preferredSection = getVisiblePreferredSection(item.href);
        const fallbackSection = originalSectionByHref.get(item.href);
        return (preferredSection ?? fallbackSection) === section.title;
      })
      .sort((a, b) => {
        const left = sidebarOrder.preferredOrder[a.href];
        const right = sidebarOrder.preferredOrder[b.href];
        const leftSection = getVisiblePreferredSection(a.href);
        const rightSection = getVisiblePreferredSection(b.href);

        if (leftSection === section.title && rightSection === section.title) {
          return left.index - right.index;
        }

        if (leftSection === section.title) return -1;
        if (rightSection === section.title) return 1;

        return (
          section.items.findIndex((item) => item.href === a.href) -
          section.items.findIndex((item) => item.href === b.href)
        );
      });

    return {
      title: section.title,
      items,
    };
  });

  return [...normalizedSections].sort((a, b) => {
    const leftIndex = sidebarOrder.preferredSectionOrder.indexOf(a.title);
    const rightIndex = sidebarOrder.preferredSectionOrder.indexOf(b.title);

    if (leftIndex >= 0 && rightIndex >= 0) {
      return leftIndex - rightIndex;
    }

    if (leftIndex >= 0) return -1;
    if (rightIndex >= 0) return 1;

    return (
      sourceSections.findIndex((section) => section.title === a.title) -
      sourceSections.findIndex((section) => section.title === b.title)
    );
  });
}

function isSidebarOrder(value: unknown): value is AdminSidebarOrder {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return false;
  }

  const candidate = value as {
    preferredOrder?: unknown;
    preferredSectionOrder?: unknown;
  };

  if (
    !candidate.preferredOrder ||
    typeof candidate.preferredOrder !== 'object' ||
    Array.isArray(candidate.preferredOrder) ||
    !Array.isArray(candidate.preferredSectionOrder)
  ) {
    return false;
  }

  return Object.values(candidate.preferredOrder).every((entry) => {
    if (!entry || typeof entry !== 'object' || Array.isArray(entry)) {
      return false;
    }

    const orderEntry = entry as { section?: unknown; index?: unknown };
    return typeof orderEntry.section === 'string' && Number.isInteger(orderEntry.index);
  }) && candidate.preferredSectionOrder.every((title) => typeof title === 'string');
}

export function parseAdminSidebarOrder(value: string | null | undefined): AdminSidebarOrder {
  if (!value) {
    return {
      preferredOrder: {},
      preferredSectionOrder: [],
    };
  }

  try {
    const parsed = JSON.parse(value) as unknown;
    if (isSidebarOrder(parsed)) {
      return parsed;
    }
  } catch {
    // Ignore malformed persisted settings and fall back to the default order.
  }

  return {
    preferredOrder: {},
    preferredSectionOrder: [],
  };
}
