'use client';

import { useEffect, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';

const MODE_COOKIE_NAME = 'theme-mode';
type ThemeMode = 'light' | 'dark';

function SunIcon() {
  return (
    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M12 3v2.25M12 18.75V21M4.97 4.97l1.59 1.59M17.44 17.44l1.59 1.59M3 12h2.25M18.75 12H21M4.97 19.03l1.59-1.59M17.44 6.56l1.59-1.59M15.75 12A3.75 3.75 0 1112 8.25 3.75 3.75 0 0115.75 12z"
      />
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M21 12.79A9 9 0 1111.21 3c-.01.14-.01.29-.01.43A7.5 7.5 0 0018.57 10.8c.14 0 .29 0 .43-.01Z"
      />
    </svg>
  );
}

function readCurrentMode(): ThemeMode {
  if (typeof document === 'undefined') {
    return 'dark';
  }

  return document.documentElement.dataset.themeMode === 'light' ? 'light' : 'dark';
}

export default function ThemeModeToggle() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [mode, setMode] = useState<ThemeMode>('dark');

  useEffect(() => {
    setMode(readCurrentMode());
  }, []);

  const nextMode: ThemeMode = mode === 'dark' ? 'light' : 'dark';
  const label = mode === 'dark' ? 'Dark' : 'Light';

  return (
    <button
      type="button"
      aria-label={`Switch to ${nextMode} mode`}
      title={`Switch to ${nextMode} mode`}
      disabled={isPending}
      onClick={() => {
        document.cookie = `${MODE_COOKIE_NAME}=${nextMode}; path=/; max-age=31536000; SameSite=Lax`;
        setMode(nextMode);
        startTransition(() => {
          router.refresh();
        });
      }}
      className="masthead-utility-button flex h-[2.125rem] w-[2.125rem] items-center justify-center md:h-auto md:w-auto md:gap-1 md:px-3 md:py-2 md:text-sm md:font-medium"
    >
      {mode === 'dark' ? <MoonIcon /> : <SunIcon />}
      <span className="sr-only md:not-sr-only">{label}</span>
    </button>
  );
}
