export type AdminContentSurface = {
  title: string;
  description: string;
  examples: string[];
};

export type AdminContentModel = {
  name: string;
  summary: string;
  likelyHomes: string[];
  guidance: string;
};

export type AdminCategoryMappingExample = {
  section: string;
  subsection: string;
  primaryModel: string;
  guidance: string;
};

export type PlannedContentArea = {
  name: string;
  status: string;
  guidance: string;
};

export type CategoryGuidance = {
  sectionLabel: string;
  modelLabel: string;
  summary: string;
  caution?: string;
};

export const CATEGORY_CONTENT_MODELS = [
  'ARTICLE',
  'RECIPE',
  'EVENT',
  'HELP_WANTED',
  'MARKETPLACE',
  'MIXED',
  'PLANNED',
] as const;

export type CategoryContentModel = (typeof CATEGORY_CONTENT_MODELS)[number];

export const CATEGORY_CONTENT_MODEL_LABELS: Record<CategoryContentModel, string> = {
  ARTICLE: 'Article',
  RECIPE: 'Recipe',
  EVENT: 'Event',
  HELP_WANTED: 'Help Wanted',
  MARKETPLACE: 'Marketplace / Store',
  MIXED: 'Mixed',
  PLANNED: 'Planned',
};

export const ADMIN_CONTENT_SURFACES: AdminContentSurface[] = [
  {
    title: 'Local Life',
    description:
      'The active, discovery-heavy surface for things people use in day-to-day local life. It is intentionally mixed-model.',
    examples: ['Local news', 'Events', 'Help Wanted', 'Marketplace and store discovery', 'Future real estate'],
  },
  {
    title: 'Community',
    description:
      'The place-based surface for identity, memory, orientation, and understanding the area beyond what is happening today.',
    examples: ['History', 'Moving To', 'What To Do', 'Memoriam'],
  },
];

export const ADMIN_CONTENT_MODELS: AdminContentModel[] = [
  {
    name: 'Article',
    summary: 'Editorial, explanatory, historical, guide, memory, and general informational content.',
    likelyHomes: [
      'Most of Community',
      'Local News',
      'History',
      'Moving To',
      'What To Do guides',
      'Memoriam if it stays article-based',
    ],
    guidance: 'Use Article when the user-facing need is to read and understand something, not attend it, apply for it, or buy it.',
  },
  {
    name: 'Recipe',
    summary: 'Structured recipe content with typed ingredients, steps, timing, notes, and optional editorial intro text.',
    likelyHomes: ['Local Life -> Recipes & Food', 'Future grocery-linked food surfaces'],
    guidance: 'Use Recipe when the primary user need is to cook, follow ingredients, or use structured food data. Keep long descriptive copy as recipe intro/editorial text, not the primary record.',
  },
  {
    name: 'Event',
    summary: 'Time-bound happenings with dates, timing, venue, and event-specific discovery needs.',
    likelyHomes: ['Local Life -> Events', 'Future event-driven subsections elsewhere'],
    guidance: 'Use Event for scheduled happenings. Do not model a dated happening as an article category just because it needs editorial promotion.',
  },
  {
    name: 'HelpWantedPost',
    summary: 'Jobs, hiring, paid opportunities, service requests, and short-term work.',
    likelyHomes: ['Local Life -> Help Wanted'],
    guidance: 'Use Help Wanted for hiring and work requests, not general announcements or editorial notices.',
  },
  {
    name: 'MarketplaceListing / Store',
    summary: 'Goods, services, local sellers, storefronts, and commerce discovery.',
    likelyHomes: ['Local Life -> Market', 'Future service/provider discovery'],
    guidance: 'Use marketplace models when the goal is transaction or seller discovery. Do not force businesses into Article categories just to make them visible.',
  },
];

export const ADMIN_CATEGORY_MAPPING_EXAMPLES: AdminCategoryMappingExample[] = [
  {
    section: 'Community',
    subsection: 'History',
    primaryModel: 'Article',
    guidance: 'Historical explainers, community memory, and archival storytelling should map to Article-first content.',
  },
  {
    section: 'Community',
    subsection: 'Moving To',
    primaryModel: 'Article',
    guidance: 'Orientation guides, newcomer explainers, and area overviews belong here as informational content.',
  },
  {
    section: 'Local Life',
    subsection: 'Recipes & Food',
    primaryModel: 'Recipe',
    guidance: 'Structured cooking content should use the Recipe model even when it carries article-like story or local grocery context.',
  },
  {
    section: 'Local Life',
    subsection: 'Events',
    primaryModel: 'Event',
    guidance: 'Scheduled happenings should stay on the Event model even if they are promoted editorially elsewhere.',
  },
  {
    section: 'Local Life',
    subsection: 'Help Wanted',
    primaryModel: 'HelpWantedPost',
    guidance: 'Jobs and service requests should route through Help Wanted, not Article or Marketplace.',
  },
  {
    section: 'Local Life',
    subsection: 'Market',
    primaryModel: 'MarketplaceListing / Store',
    guidance: 'Goods, services, and local seller discovery should use the marketplace/store models.',
  },
];

export const ADMIN_PLANNED_CONTENT_AREAS: PlannedContentArea[] = [
  {
    name: 'Real Estate',
    status: 'Planned, not live',
    guidance: 'Do not invent ad hoc categories for this yet. It is expected to become its own structured listing model.',
  },
  {
    name: 'Directory / Organization',
    status: 'Planned, not live',
    guidance: 'Treat this as a future first-class organization/directory domain rather than forcing it into Articles or Stores.',
  },
  {
    name: 'Creator / Show Network',
    status: 'Planned, not live',
    guidance: 'Media discovery is planned as a structured creator/show/episode system, not a loose article taxonomy.',
  },
  {
    name: 'Obituary / Memorial-specific models',
    status: 'Planned direction under review',
    guidance: 'Memoriam may start article-first, but stronger obituary/memorial-specific structure is likely later. Avoid overcommitting categories too early.',
  },
];

export const ADMIN_CONTENT_REFERENCE_DOCS = [
  'ADMIN-CONTENT-REFERENCE-PLAN.md',
  'COMMUNITY-SECTION-PLAN.md',
  'DIRECTORY-PLAN.md',
  'LOCAL-CREATOR-NETWORK-PLAN.md',
  'OBITUARIES-PLAN.md',
];

export function getCategoryGuidance(
  slug: string,
  parentSlug?: string | null,
  contentModel?: CategoryContentModel | null
): CategoryGuidance {
  const normalizedSlug = slug.trim().toLowerCase();
  const normalizedParentSlug = parentSlug?.trim().toLowerCase() ?? null;

  if (contentModel) {
    return {
      sectionLabel:
        normalizedSlug === 'community' || normalizedParentSlug === 'community'
          ? 'Community'
          : normalizedSlug === 'local-life' || normalizedParentSlug === 'local-life'
            ? 'Local Life'
            : normalizedParentSlug
              ? 'Nested category'
              : 'Top-level category',
      modelLabel: CATEGORY_CONTENT_MODEL_LABELS[contentModel],
      summary: `This category is explicitly mapped to the ${CATEGORY_CONTENT_MODEL_LABELS[contentModel]} model.`,
      caution:
        contentModel === 'MIXED'
          ? 'Use Mixed only when the category is intentionally a cross-model discovery surface rather than a single submission/storage type.'
          : contentModel === 'PLANNED'
            ? 'Planned means the taxonomy exists before the underlying content workflow is fully live.'
            : 'Keep the category label, submission path, and moderation flow aligned with this model choice.',
    };
  }

  if (normalizedSlug === 'local-life' || normalizedParentSlug === 'local-life') {
    if (normalizedSlug === 'local-stores') {
      return {
        sectionLabel: 'Local Life',
        modelLabel: 'MarketplaceListing / Store',
        summary: 'Use marketplace and store models for seller discovery, goods, and services.',
        caution: 'Do not create article-first taxonomy for business discovery just to make it appear in nav.',
      };
    }

    if (normalizedSlug === 'events') {
      return {
        sectionLabel: 'Local Life',
        modelLabel: 'Event',
        summary: 'Use Event for scheduled happenings with dates, venue, and time-specific discovery.',
        caution: 'Promotional coverage may exist as Article content, but the primary record should stay an Event.',
      };
    }

    if (normalizedSlug === 'help-wanted') {
      return {
        sectionLabel: 'Local Life',
        modelLabel: 'HelpWantedPost',
        summary: 'Use Help Wanted for jobs, paid opportunities, and service requests.',
        caution: 'Do not route hiring through Article or Marketplace categories.',
      };
    }

    if (normalizedSlug === 'recipes-food') {
      return {
        sectionLabel: 'Local Life',
        modelLabel: 'Recipe',
        summary: 'Use Recipe for structured cooking content with ingredients, steps, timing, and notes.',
        caution: 'Keep descriptive or editorial copy as recipe intro text rather than storing the recipe itself as an article body.',
      };
    }

    return {
      sectionLabel: 'Local Life',
      modelLabel: 'Article',
      summary: 'Most Local Life editorial taxonomy should map to Article content unless the subsection is explicitly event, hiring, or marketplace driven.',
      caution: 'Keep section purpose separate from the underlying storage model.',
    };
  }

  if (normalizedSlug === 'community' || normalizedParentSlug === 'community') {
    if (normalizedSlug === 'memoriam') {
      return {
        sectionLabel: 'Community',
        modelLabel: 'Article (for now)',
        summary: 'Memoriam is likely article-first today, with stronger memorial-specific structure possible later.',
        caution: 'Avoid overcommitting taxonomy before obituary and memorial models are finalized.',
      };
    }

    return {
      sectionLabel: 'Community',
      modelLabel: 'Article',
      summary: 'Community is the place-based orientation and memory surface, so categories here are usually article-heavy.',
      caution: 'Community is a purpose layer, not a permanent promise that every future subtype will stay Article forever.',
    };
  }

  return {
    sectionLabel: normalizedParentSlug ? 'Nested category' : 'Top-level category',
    modelLabel: 'Needs review',
    summary: 'Confirm the section purpose and intended model boundary before treating this category as a navigation or submission bucket.',
    caution: 'If this category will shape nav or submissions, align it with Content Architecture first.',
  };
}
