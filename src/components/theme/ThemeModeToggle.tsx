'use client';

import { useEffect, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';

const MODE_COOKIE_NAME = 'theme-mode';
type ThemeMode = 'light' | 'dark';

function SunIcon() {
  return (
    <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="3.5" fill="currentColor" />
      <path
        d="M12 2.75v3M12 18.25v3M21.25 12h-3M5.75 12h-3M18.54 5.46l-2.12 2.12M7.58 16.42l-2.12 2.12M18.54 18.54l-2.12-2.12M7.58 7.58 5.46 5.46"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="1.8"
      />
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M21 12.79A9 9 0 1111.21 3c-.01.14-.01.29-.01.43A7.5 7.5 0 0018.57 10.8c.14 0 .29 0 .43-.01Z"
        fill="currentColor"
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

export default function ThemeModeToggle({
  className,
  labelMode = 'desktop',
}: {
  className?: string;
  labelMode?: 'desktop' | 'always' | 'hidden';
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [mode, setMode] = useState<ThemeMode>('dark');

  useEffect(() => {
    setMode(readCurrentMode());
  }, []);

  const nextMode: ThemeMode = mode === 'dark' ? 'light' : 'dark';
  const label = mode === 'dark' ? 'Dark' : 'Light';
  const mobileGlyph = mode === 'dark' ? '◐' : '☼';
  const buttonClassName = [
    'masthead-utility-button flex h-[2.125rem] w-[2.125rem] items-center justify-center md:h-auto md:w-auto md:gap-1 md:px-3 md:py-2 md:text-sm md:font-medium',
    className,
  ]
    .filter(Boolean)
    .join(' ');

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
      className={buttonClassName}
    >
      <span className="md:hidden" aria-hidden="true">
        {mobileGlyph}
      </span>
      <span className="hidden md:inline-flex">
        {mode === 'dark' ? <MoonIcon /> : <SunIcon />}
      </span>
      <span className="sr-only">{label}</span>
      {labelMode === 'always' ? <span>{label}</span> : null}
      {labelMode === 'desktop' ? <span className="hidden md:inline">{label}</span> : null}
    </button>
  );
}
