import { getTenantThemeManifest } from './registry';
import { ResolvedTheme, ThemeIdentity, ThemeMode } from './types';

interface ResolveTenantThemeOptions {
  tenantSlug?: string | null;
  manifestSlug?: string | null;
  previewTenantSlug?: string | null;
  mode?: string | null;
  siteName?: string | null;
}

function normalizeMode(mode?: string | null): ThemeMode | null {
  if (mode === 'light' || mode === 'dark') {
    return mode;
  }

  return null;
}

export function resolveTenantTheme(options: ResolveTenantThemeOptions = {}): ResolvedTheme {
  const effectiveThemeSlug =
    options.previewTenantSlug?.trim() || options.manifestSlug?.trim() || options.tenantSlug;
  const manifest = getTenantThemeManifest(effectiveThemeSlug);
  const requestedMode = normalizeMode(options.mode);
  const mode =
    requestedMode && manifest.supports.includes(requestedMode)
      ? requestedMode
      : manifest.defaultMode;

  const identity: ThemeIdentity = {
    ...manifest.identity,
    siteName:
      options.previewTenantSlug?.trim() ? manifest.identity.siteName : options.siteName?.trim() || manifest.identity.siteName,
  };

  return {
    manifest,
    mode,
    identity,
    tokens: manifest.modes[mode],
  };
}
