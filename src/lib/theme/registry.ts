import { highlanderTodayTheme } from './manifests/highlander-today';
import { riverValleyLocalTheme } from './manifests/river-valley-local';
import { TenantThemeManifest } from './types';

const themeRegistry = new Map<string, TenantThemeManifest>([
  [highlanderTodayTheme.tenantSlug, highlanderTodayTheme],
  [riverValleyLocalTheme.tenantSlug, riverValleyLocalTheme],
]);

const themeManifests = [highlanderTodayTheme, riverValleyLocalTheme];

export function getTenantThemeManifest(tenantSlug?: string | null) {
  if (!tenantSlug) {
    return highlanderTodayTheme;
  }

  return themeRegistry.get(tenantSlug) ?? highlanderTodayTheme;
}

export function hasTenantThemeManifest(tenantSlug?: string | null) {
  if (!tenantSlug) {
    return false;
  }

  return themeRegistry.has(tenantSlug);
}

export function listTenantThemeManifests() {
  return themeManifests;
}
