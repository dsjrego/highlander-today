import 'server-only';

import { generatedThemeManifests } from './generated-manifests';
import { TenantThemeManifest } from './types';

const DEFAULT_MANIFEST_SLUG = 'highlander-today';

const themeManifests = [...generatedThemeManifests];

if (themeManifests.length === 0) {
  throw new Error(
    'No tenant theme manifests are registered. Run `node scripts/generate-theme-manifests.js`.'
  );
}

const themeRegistry = new Map<string, TenantThemeManifest>(
  themeManifests.map((manifest) => [manifest.tenantSlug, manifest])
);
const fallbackManifest = themeRegistry.get(DEFAULT_MANIFEST_SLUG) ?? themeManifests[0];

export function getTenantThemeManifest(tenantSlug?: string | null) {
  if (!tenantSlug) {
    return fallbackManifest;
  }

  return themeRegistry.get(tenantSlug) ?? fallbackManifest;
}

export function hasTenantThemeManifest(tenantSlug?: string | null) {
  if (!tenantSlug) {
    return false;
  }

  return themeRegistry.has(tenantSlug);
}

export function listTenantThemeManifests() {
  return [...themeManifests];
}
