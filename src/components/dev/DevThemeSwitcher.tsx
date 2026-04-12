'use client';

import { useEffect, useState } from 'react';
import { listTenantThemeManifests } from '@/lib/theme/registry';

type ThemeModeOption = 'default' | 'light' | 'dark';
type ThemeTenantOption = 'default' | string;

const MODE_COOKIE_NAME = 'theme-mode';
const TENANT_COOKIE_NAME = 'theme-tenant-preview';
const MODE_OPTIONS: Array<{ label: string; value: ThemeModeOption }> = [
  { label: 'Default', value: 'default' },
  { label: 'Light', value: 'light' },
  { label: 'Dark', value: 'dark' },
];
const TENANT_OPTIONS: Array<{ label: string; value: ThemeTenantOption }> = [
  { label: 'Resolved', value: 'default' },
  ...listTenantThemeManifests().map((manifest) => ({
    label: manifest.themeName,
    value: manifest.tenantSlug,
  })),
];

function readThemeModeCookie(): ThemeModeOption {
  if (typeof document === 'undefined') {
    return 'default';
  }

  const match = document.cookie
    .split('; ')
    .find((entry) => entry.startsWith(`${MODE_COOKIE_NAME}=`));
  const value = match?.split('=')[1];

  if (value === 'light' || value === 'dark') {
    return value;
  }

  return 'default';
}

function readThemeTenantCookie(): ThemeTenantOption {
  if (typeof document === 'undefined') {
    return 'default';
  }

  const match = document.cookie
    .split('; ')
    .find((entry) => entry.startsWith(`${TENANT_COOKIE_NAME}=`));
  const value = match?.split('=')[1];

  if (!value) {
    return 'default';
  }

  return TENANT_OPTIONS.some((option) => option.value === value) ? value : 'default';
}

export default function DevThemeSwitcher() {
  const [activeMode, setActiveMode] = useState<ThemeModeOption>('default');
  const [activeTenant, setActiveTenant] = useState<ThemeTenantOption>('default');

  useEffect(() => {
    setActiveMode(readThemeModeCookie());
    setActiveTenant(readThemeTenantCookie());
  }, []);

  if (process.env.NODE_ENV !== 'development') {
    return null;
  }

  return (
    <div className="dev-theme-switcher">
      <p className="dev-theme-switcher-label">Theme Preview</p>
      <div className="dev-theme-switcher-group">
        <p className="dev-theme-switcher-group-label">Tenant</p>
        <div className="dev-theme-switcher-options">
          {TENANT_OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => {
                if (option.value === 'default') {
                  document.cookie = `${TENANT_COOKIE_NAME}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT`;
                } else {
                  document.cookie = `${TENANT_COOKIE_NAME}=${option.value}; path=/; max-age=31536000; SameSite=Lax`;
                }

                setActiveTenant(option.value);
                window.location.reload();
              }}
              className={`dev-theme-switcher-option ${activeTenant === option.value ? 'dev-theme-switcher-option-active' : ''}`.trim()}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>
      <div className="dev-theme-switcher-group">
        <p className="dev-theme-switcher-group-label">Mode</p>
      <div className="dev-theme-switcher-options">
        {MODE_OPTIONS.map((option) => (
          <button
            key={option.value}
            type="button"
            onClick={() => {
              if (option.value === 'default') {
                document.cookie = `${MODE_COOKIE_NAME}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT`;
              } else {
                document.cookie = `${MODE_COOKIE_NAME}=${option.value}; path=/; max-age=31536000; SameSite=Lax`;
              }

              setActiveMode(option.value);
              window.location.reload();
            }}
            className={`dev-theme-switcher-option ${activeMode === option.value ? 'dev-theme-switcher-option-active' : ''}`.trim()}
          >
            {option.label}
          </button>
        ))}
      </div>
      </div>
    </div>
  );
}
