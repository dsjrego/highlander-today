import type { TenantThemeManifest } from './types';
import * as manifestModule0 from './manifests/highlander-today';
import * as manifestModule1 from './manifests/river-valley-local';

type ManifestModule = Record<string, unknown>;

function isThemeMode(value: unknown): value is 'light' | 'dark' {
  return value === 'light' || value === 'dark';
}

function isTenantThemeManifest(value: unknown): value is TenantThemeManifest {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const candidate = value as Partial<TenantThemeManifest>;

  return (
    typeof candidate.tenantSlug === 'string' &&
    candidate.tenantSlug.length > 0 &&
    typeof candidate.themeName === 'string' &&
    candidate.themeName.length > 0 &&
    isThemeMode(candidate.defaultMode) &&
    Array.isArray(candidate.supports) &&
    candidate.supports.every(isThemeMode) &&
    !!candidate.identity &&
    typeof candidate.identity.siteName === 'string' &&
    !!candidate.modes &&
    typeof candidate.modes === 'object'
  );
}

function extractTenantThemeManifest(module: ManifestModule, modulePath: string): TenantThemeManifest {
  const manifest = Object.values(module).find(isTenantThemeManifest);

  if (!manifest) {
    throw new Error(`Theme manifest module ${modulePath} does not export a valid manifest.`);
  }

  return manifest;
}

export const generatedThemeManifests: TenantThemeManifest[] = [
  extractTenantThemeManifest(manifestModule0, './manifests/highlander-today'),
  extractTenantThemeManifest(manifestModule1, './manifests/river-valley-local'),
];
