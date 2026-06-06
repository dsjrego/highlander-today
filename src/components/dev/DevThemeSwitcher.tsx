'use client';

import { useEffect, useRef, useState } from 'react';

type ThemeModeOption = 'default' | 'light' | 'dark';
type ThemeTenantOption = 'default' | string;
type ThemeManifestOption = {
  tenantSlug: string;
  themeName: string;
};

const MODE_COOKIE_NAME = 'theme-mode';
const TENANT_COOKIE_NAME = 'theme-tenant-preview';
const COLLAPSED_STORAGE_KEY = 'dev-theme-switcher-collapsed';
const POSITION_STORAGE_KEY = 'dev-theme-switcher-position';

type SwitcherPosition = {
  x: number;
  y: number;
};
const MODE_OPTIONS: Array<{ label: string; value: ThemeModeOption }> = [
  { label: 'Default', value: 'default' },
  { label: 'Light', value: 'light' },
  { label: 'Dark', value: 'dark' },
];

function buildTenantOptions(manifests: ThemeManifestOption[]) {
  return [
    { label: 'Resolved', value: 'default' as ThemeTenantOption },
    ...manifests.map((manifest) => ({
      label: manifest.themeName,
      value: manifest.tenantSlug as ThemeTenantOption,
    })),
  ];
}

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

  return (
    document.documentElement.dataset.themeTenantPreview as ThemeTenantOption | undefined
  ) ?? 'default';
}

function readThemeTenantCookieWithOptions(
  tenantOptions: Array<{ label: string; value: ThemeTenantOption }>
) {
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

  return tenantOptions.some((option) => option.value === value) ? value : 'default';
}

function readStoredPosition(): SwitcherPosition | null {
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    const raw = window.localStorage.getItem(POSITION_STORAGE_KEY);
    if (!raw) {
      return null;
    }

    const parsed = JSON.parse(raw) as Partial<SwitcherPosition>;
    if (typeof parsed.x === 'number' && typeof parsed.y === 'number') {
      return parsed as SwitcherPosition;
    }
  } catch {
    // Ignore malformed local state and fall back to the default position.
  }

  return null;
}

function clampPosition(position: SwitcherPosition, size: { width: number; height: number }) {
  if (typeof window === 'undefined') {
    return position;
  }

  const margin = 12;

  return {
    x: Math.min(Math.max(margin, position.x), Math.max(margin, window.innerWidth - size.width - margin)),
    y: Math.min(Math.max(margin, position.y), Math.max(margin, window.innerHeight - size.height - margin)),
  };
}

export default function DevThemeSwitcher() {
  const [activeMode, setActiveMode] = useState<ThemeModeOption>('default');
  const [activeTenant, setActiveTenant] = useState<ThemeTenantOption>('default');
  const [tenantManifests, setTenantManifests] = useState<ThemeManifestOption[]>([]);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [position, setPosition] = useState<SwitcherPosition | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const dragOffsetRef = useRef<SwitcherPosition>({ x: 0, y: 0 });
  const latestPositionRef = useRef<SwitcherPosition | null>(null);
  const switcherRef = useRef<HTMLDivElement | null>(null);

  const tenantOptions = buildTenantOptions(tenantManifests);

  useEffect(() => {
    setActiveMode(readThemeModeCookie());
    setActiveTenant(readThemeTenantCookie());
    setIsCollapsed(window.localStorage.getItem(COLLAPSED_STORAGE_KEY) === 'true');
    setPosition(readStoredPosition());

    let ignore = false;

    async function loadTenantManifests() {
      try {
        const response = await fetch('/api/dev/theme-manifests', {
          credentials: 'same-origin',
          cache: 'no-store',
        });

        if (!response.ok) {
          return;
        }

        const data = (await response.json()) as { manifests?: ThemeManifestOption[] };
        const manifests = Array.isArray(data.manifests) ? data.manifests : [];

        if (ignore) {
          return;
        }

        setTenantManifests(manifests);
        setActiveTenant(readThemeTenantCookieWithOptions(buildTenantOptions(manifests)));
      } catch {
        // Dev-only helper: silent failure is acceptable.
      }
    }

    void loadTenantManifests();

    return () => {
      ignore = true;
    };
  }, []);

  useEffect(() => {
    latestPositionRef.current = position;
  }, [position]);

  useEffect(() => {
    if (!position || typeof window === 'undefined') {
      return;
    }

    const handleResize = () => {
      if (!switcherRef.current) {
        return;
      }

      const next = clampPosition(position, {
        width: switcherRef.current.offsetWidth,
        height: switcherRef.current.offsetHeight,
      });

      setPosition(next);
      window.localStorage.setItem(POSITION_STORAGE_KEY, JSON.stringify(next));
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, [position]);

  function handleCollapsedChange(nextValue: boolean) {
    setIsCollapsed(nextValue);
    window.localStorage.setItem(COLLAPSED_STORAGE_KEY, nextValue ? 'true' : 'false');
  }

  function handlePointerDown(event: React.PointerEvent<HTMLDivElement>) {
    if ((event.target as HTMLElement).closest('button')) {
      return;
    }

    if (!switcherRef.current) {
      return;
    }

    const rect = switcherRef.current.getBoundingClientRect();
    const nextPosition = position ?? { x: rect.left, y: rect.top };
    dragOffsetRef.current = {
      x: event.clientX - nextPosition.x,
      y: event.clientY - nextPosition.y,
    };

    setPosition(nextPosition);
    setIsDragging(true);
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function handlePointerMove(event: React.PointerEvent<HTMLDivElement>) {
    if (!isDragging || !switcherRef.current) {
      return;
    }

    const next = clampPosition(
      {
        x: event.clientX - dragOffsetRef.current.x,
        y: event.clientY - dragOffsetRef.current.y,
      },
      {
        width: switcherRef.current.offsetWidth,
        height: switcherRef.current.offsetHeight,
      }
    );

    setPosition(next);
    latestPositionRef.current = next;
  }

  function handlePointerUp(event: React.PointerEvent<HTMLDivElement>) {
    if (!isDragging) {
      return;
    }

    setIsDragging(false);
    event.currentTarget.releasePointerCapture(event.pointerId);

    if (latestPositionRef.current) {
      window.localStorage.setItem(POSITION_STORAGE_KEY, JSON.stringify(latestPositionRef.current));
    }
  }

  if (process.env.NODE_ENV !== 'development') {
    return null;
  }

  return (
    <div
      ref={switcherRef}
      className={`dev-theme-switcher ${isCollapsed ? 'is-collapsed' : ''} ${isDragging ? 'is-dragging' : ''}`.trim()}
      style={position ? { left: `${position.x}px`, top: `${position.y}px`, right: 'auto', bottom: 'auto' } : undefined}
    >
      <div
        className="dev-theme-switcher-header"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
      >
        <p className="dev-theme-switcher-label">Theme Preview</p>
        <button
          type="button"
          className="dev-theme-switcher-toggle"
          onClick={() => handleCollapsedChange(!isCollapsed)}
          aria-expanded={!isCollapsed}
          aria-controls="dev-theme-switcher-body"
        >
          {isCollapsed ? 'Open' : 'Hide'}
        </button>
      </div>
      {!isCollapsed ? (
        <div id="dev-theme-switcher-body" className="dev-theme-switcher-body">
          <div className="dev-theme-switcher-group">
            <p className="dev-theme-switcher-group-label">Tenant</p>
            <div className="dev-theme-switcher-options">
              {tenantOptions.map((option) => (
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
      ) : null}
    </div>
  );
}
