import { Prisma, RecipeStatus } from '@prisma/client';

export const ADMIN_RECIPE_TABS = {
  drafts: {
    label: 'Drafts',
    status: RecipeStatus.DRAFT,
  },
  pending: {
    label: 'Pending',
    status: RecipeStatus.PENDING_REVIEW,
  },
  approved: {
    label: 'Approved',
    status: RecipeStatus.PUBLISHED,
  },
  archived: {
    label: 'Archived',
    status: RecipeStatus.UNPUBLISHED,
  },
} as const;

export type AdminRecipeTab = keyof typeof ADMIN_RECIPE_TABS;
export type AdminRecipeScope = 'tenant' | 'all';

function isValidAdminRecipeTab(value: string): value is AdminRecipeTab {
  return value in ADMIN_RECIPE_TABS;
}

export function parseAdminRecipeTab(value?: string | string[] | null): AdminRecipeTab {
  const normalizedValue = Array.isArray(value) ? value[0] : value;

  if (normalizedValue && isValidAdminRecipeTab(normalizedValue)) {
    return normalizedValue;
  }

  return 'drafts';
}

export function parseAdminRecipeScope(
  value?: string | string[] | null,
  allowAllTenants = false
): AdminRecipeScope {
  const normalizedValue = Array.isArray(value) ? value[0] : value;

  if (allowAllTenants && normalizedValue === 'all') {
    return 'all';
  }

  return 'tenant';
}

export function buildAdminRecipesQuery(params: {
  tab: AdminRecipeTab;
  page?: number;
  scope?: AdminRecipeScope;
}) {
  const searchParams = new URLSearchParams();
  searchParams.set('tab', params.tab);

  if (params.page && params.page > 1) {
    searchParams.set('page', String(params.page));
  }

  if (params.scope === 'all') {
    searchParams.set('scope', 'all');
  }

  return searchParams.toString();
}

export function buildAdminRecipesWhere(
  tab: AdminRecipeTab,
  communityId?: string
): Prisma.RecipeWhereInput {
  return {
    status: ADMIN_RECIPE_TABS[tab].status,
    ...(communityId ? { communityId } : {}),
  };
}
