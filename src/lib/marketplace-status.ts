export const SELLER_MANAGED_STATUSES = ['PENDING', 'ACTIVE', 'SOLD'] as const;
export const PUBLIC_VIEWABLE_STATUSES = ['ACTIVE', 'PENDING', 'SOLD'] as const;

export const SELLER_STATUS_TRANSITIONS: Record<
  (typeof SELLER_MANAGED_STATUSES)[number] | 'DRAFT',
  readonly (typeof SELLER_MANAGED_STATUSES)[number][]
> = {
  DRAFT: ['PENDING', 'ACTIVE'],
  PENDING: ['ACTIVE', 'SOLD'],
  ACTIVE: ['PENDING', 'SOLD'],
  SOLD: ['ACTIVE'],
};

export type SellerManagedMarketplaceStatus =
  (typeof SELLER_MANAGED_STATUSES)[number];

export function isSellerManagedMarketplaceStatus(
  status: string
): status is SellerManagedMarketplaceStatus {
  return SELLER_MANAGED_STATUSES.includes(
    status as SellerManagedMarketplaceStatus
  );
}

export function canTransitionSellerMarketplaceStatus(
  currentStatus: string,
  nextStatus: string
) {
  const allowedTargets =
    SELLER_STATUS_TRANSITIONS[
      currentStatus as keyof typeof SELLER_STATUS_TRANSITIONS
    ];

  return Boolean(
    allowedTargets &&
      isSellerManagedMarketplaceStatus(nextStatus) &&
      allowedTargets.includes(nextStatus)
  );
}

export function isPublicMarketplaceStatus(status: string) {
  return PUBLIC_VIEWABLE_STATUSES.includes(
    status as (typeof PUBLIC_VIEWABLE_STATUSES)[number]
  );
}
