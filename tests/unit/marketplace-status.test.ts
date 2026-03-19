import {
  canTransitionSellerMarketplaceStatus,
  isPublicMarketplaceStatus,
  isSellerManagedMarketplaceStatus,
  SELLER_STATUS_TRANSITIONS,
} from '@/lib/marketplace-status';

describe('Marketplace listing status rules', () => {
  describe('seller-managed transitions', () => {
    it('allows the intended seller lifecycle transitions', () => {
      expect(canTransitionSellerMarketplaceStatus('DRAFT', 'ACTIVE')).toBe(true);
      expect(canTransitionSellerMarketplaceStatus('DRAFT', 'PENDING')).toBe(true);
      expect(canTransitionSellerMarketplaceStatus('ACTIVE', 'PENDING')).toBe(true);
      expect(canTransitionSellerMarketplaceStatus('ACTIVE', 'SOLD')).toBe(true);
      expect(canTransitionSellerMarketplaceStatus('PENDING', 'ACTIVE')).toBe(true);
      expect(canTransitionSellerMarketplaceStatus('PENDING', 'SOLD')).toBe(true);
      expect(canTransitionSellerMarketplaceStatus('SOLD', 'ACTIVE')).toBe(true);
    });

    it('rejects invalid seller transitions', () => {
      expect(canTransitionSellerMarketplaceStatus('SOLD', 'PENDING')).toBe(false);
      expect(canTransitionSellerMarketplaceStatus('ACTIVE', 'ACTIVE')).toBe(false);
      expect(canTransitionSellerMarketplaceStatus('PENDING', 'REMOVED')).toBe(false);
      expect(canTransitionSellerMarketplaceStatus('ACTIVE', 'ARCHIVED')).toBe(false);
      expect(canTransitionSellerMarketplaceStatus('REMOVED', 'ACTIVE')).toBe(false);
    });

    it('keeps the allowed target map explicit', () => {
      expect(SELLER_STATUS_TRANSITIONS.DRAFT).toEqual(['PENDING', 'ACTIVE']);
      expect(SELLER_STATUS_TRANSITIONS.ACTIVE).toEqual(['PENDING', 'SOLD']);
      expect(SELLER_STATUS_TRANSITIONS.PENDING).toEqual(['ACTIVE', 'SOLD']);
      expect(SELLER_STATUS_TRANSITIONS.SOLD).toEqual(['ACTIVE']);
    });
  });

  describe('status classification', () => {
    it('recognizes seller-managed statuses only', () => {
      expect(isSellerManagedMarketplaceStatus('ACTIVE')).toBe(true);
      expect(isSellerManagedMarketplaceStatus('PENDING')).toBe(true);
      expect(isSellerManagedMarketplaceStatus('SOLD')).toBe(true);
      expect(isSellerManagedMarketplaceStatus('ARCHIVED')).toBe(false);
      expect(isSellerManagedMarketplaceStatus('REMOVED')).toBe(false);
    });

    it('exposes the intended public marketplace statuses', () => {
      expect(isPublicMarketplaceStatus('ACTIVE')).toBe(true);
      expect(isPublicMarketplaceStatus('PENDING')).toBe(true);
      expect(isPublicMarketplaceStatus('SOLD')).toBe(true);
      expect(isPublicMarketplaceStatus('DRAFT')).toBe(false);
      expect(isPublicMarketplaceStatus('ARCHIVED')).toBe(false);
      expect(isPublicMarketplaceStatus('REMOVED')).toBe(false);
    });
  });
});
