/**
 * Core enums and constants for Highlander Today
 */

export enum TrustLevel {
  ANONYMOUS = 'ANONYMOUS',
  REGISTERED = 'REGISTERED',
  TRUSTED = 'TRUSTED',
  SUSPENDED = 'SUSPENDED',
}

export enum UserRole {
  READER = 'READER',
  CONTRIBUTOR = 'CONTRIBUTOR',
  STAFF_WRITER = 'STAFF_WRITER',
  EDITOR = 'EDITOR',
  ADMIN = 'ADMIN',
  SUPER_ADMIN = 'SUPER_ADMIN',
}

export enum ArticleStatus {
  DRAFT = 'DRAFT',
  PENDING_REVIEW = 'PENDING_REVIEW',
  PUBLISHED = 'PUBLISHED',
  UNPUBLISHED = 'UNPUBLISHED',
}

export enum EventStatus {
  PENDING_REVIEW = 'PENDING_REVIEW',
  PUBLISHED = 'PUBLISHED',
  UNPUBLISHED = 'UNPUBLISHED',
}

export enum HelpWantedPostingType {
  EMPLOYMENT = 'EMPLOYMENT',
  SERVICE_REQUEST = 'SERVICE_REQUEST',
  GIG_TASK = 'GIG_TASK',
}

export enum HelpWantedCompensationType {
  HOURLY = 'HOURLY',
  SALARY = 'SALARY',
  FIXED = 'FIXED',
  NEGOTIABLE = 'NEGOTIABLE',
  VOLUNTEER = 'VOLUNTEER',
  UNSPECIFIED = 'UNSPECIFIED',
}

export enum HelpWantedStatus {
  DRAFT = 'DRAFT',
  PENDING_REVIEW = 'PENDING_REVIEW',
  PUBLISHED = 'PUBLISHED',
  FILLED = 'FILLED',
  CLOSED = 'CLOSED',
  REJECTED = 'REJECTED',
}

export enum ListingStatus {
  DRAFT = 'DRAFT',
  ACTIVE = 'ACTIVE',
  SOLD = 'SOLD',
  ARCHIVED = 'ARCHIVED',
  REMOVED = 'REMOVED',
}

export enum CommentStatus {
  VISIBLE = 'VISIBLE',
  HIDDEN = 'HIDDEN',
  REMOVED = 'REMOVED',
  MODERATED = 'MODERATED',
}

export enum MarketplaceStatus {
  DRAFT = 'DRAFT',
  PENDING = 'PENDING',
  ACTIVE = 'ACTIVE',
  SOLD = 'SOLD',
  ARCHIVED = 'ARCHIVED',
  EXPIRED = 'EXPIRED',
  REMOVED = 'REMOVED',
}

export enum MarketplaceListingType {
  PRODUCT = 'PRODUCT',
  FOOD = 'FOOD',
  SERVICE = 'SERVICE',
}

export enum StoreStatus {
  PENDING_APPROVAL = 'PENDING_APPROVAL',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  SUSPENDED = 'SUSPENDED',
}

export enum StoreMemberRole {
  OWNER = 'OWNER',
  MANAGER = 'MANAGER',
}

/**
 * Category hierarchy for Highlander Today
 */
export const DEFAULT_CATEGORIES = {
  news: {
    name: 'News',
    slug: 'news',
    subcategories: {
      local: { name: 'Local News', slug: 'local' },
      regional: { name: 'Regional News', slug: 'regional' },
      world: { name: 'World News', slug: 'world' },
      politics: { name: 'Politics', slug: 'politics' },
      business: { name: 'Business', slug: 'business' },
      tech: { name: 'Technology', slug: 'tech' },
      science: { name: 'Science', slug: 'science' },
      health: { name: 'Health', slug: 'health' },
      environment: { name: 'Environment', slug: 'environment' },
    },
  },
  events: {
    name: 'Events',
    slug: 'events',
    subcategories: {
      community: { name: 'Community Events', slug: 'community' },
      cultural: { name: 'Cultural Events', slug: 'cultural' },
      sports: { name: 'Sports', slug: 'sports' },
      entertainment: { name: 'Entertainment', slug: 'entertainment' },
      education: { name: 'Education', slug: 'education' },
      fundraiser: { name: 'Fundraisers', slug: 'fundraiser' },
    },
  },
  marketplace: {
    name: 'Market',
    slug: 'marketplace',
    subcategories: {
      local_goods: { name: 'Local Goods', slug: 'local-goods' },
      handmade: { name: 'Handmade', slug: 'handmade' },
      vintage: { name: 'Vintage', slug: 'vintage' },
      books: { name: 'Books', slug: 'books' },
      art: { name: 'Art & Collectibles', slug: 'art' },
    },
  },
  directory: {
    name: 'Directory',
    slug: 'directory',
    subcategories: {
      businesses: { name: 'Businesses', slug: 'businesses' },
      nonprofits: { name: 'Non-profits', slug: 'nonprofits' },
      government: { name: 'Government', slug: 'government' },
      organizations: { name: 'Organizations', slug: 'organizations' },
      schools: { name: 'Schools', slug: 'schools' },
    },
  },
};

/**
 * Rate limiting configuration (requests per minute)
 */
export const RATE_LIMITS = {
  authenticated: 100,
  anonymous: 30,
} as const;

/**
 * File upload configuration
 */
export const FILE_LIMITS = {
  maxFileSize: 10485760, // 10MB in bytes
  maxPhotosPerListing: 20,
} as const;

/**
 * Brand colors for Highlander Today
 */
export const BRAND_COLORS = {
  primary: '#46A8CC',
  accent: '#A51E30',
} as const;

/**
 * Image processing defaults
 */
export const IMAGE_PROCESSING = {
  maxWidth: 2000,
  quality: 80,
} as const;

/**
 * Trust system configuration
 */
export const TRUST_CONFIG = {
  maxVouchesPerUser: 10,
  maxVouchesReceivedPerUser: 50,
  vouchExpiryDays: 365,
} as const;
