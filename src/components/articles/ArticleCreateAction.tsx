'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useSession } from 'next-auth/react';

interface ArticleCreateActionProps {
  href?: string;
}

const TRUST_REQUIRED_MESSAGE =
  'You must be a trusted user to write and submit articles for Local Life.';

export default function ArticleCreateAction({
  href = '/local-life/submit',
}: ArticleCreateActionProps) {
  const { data: session } = useSession();
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  if (!session?.user) {
    return null;
  }

  const trustLevel = session.user.trust_level;
  const isTrustedUser = trustLevel === 'TRUSTED';

  const content = (
    <>
      <svg
        aria-hidden="true"
        viewBox="0 0 16 16"
        className="h-3.5 w-3.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      >
        <path d="M8 3.25v9.5M3.25 8h9.5" />
      </svg>
      <span className="page-header-action-label">Article</span>
    </>
  );

  return (
    <>
      {isTrustedUser ? (
        <Link
          href={href}
          aria-label="Add article"
          title="Add article"
          className="page-header-action border-white bg-white text-slate-950 hover:opacity-90"
        >
          {content}
        </Link>
      ) : (
        <button
          type="button"
          onClick={() => setIsDialogOpen(true)}
          aria-label="Add article"
          title="Add article"
          className="page-header-action border-white bg-white text-slate-950 hover:opacity-90"
        >
          {content}
        </button>
      )}

      {isDialogOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-labelledby="trusted-article-dialog-title"
          aria-describedby="trusted-article-dialog-description"
        >
          <div className="w-full max-w-md rounded-[28px] border border-white/10 bg-[linear-gradient(165deg,rgba(17,34,52,0.98),rgba(10,24,38,0.98))] p-6 text-white shadow-[0_28px_80px_rgba(2,8,23,0.55)]">
            <p className="mb-3 text-xs font-semibold uppercase tracking-[0.28em] text-cyan-200/72">
              Local Life
            </p>
            <h2
              id="trusted-article-dialog-title"
              className="mb-3 text-2xl font-semibold tracking-tight text-white"
            >
              Trusted users only
            </h2>
            <p
              id="trusted-article-dialog-description"
              className="text-sm leading-7 text-cyan-50/78"
            >
              {TRUST_REQUIRED_MESSAGE}
            </p>
            <div className="mt-5 rounded-2xl border border-cyan-300/20 bg-cyan-300/8 px-4 py-3 text-sm leading-6 text-cyan-100/86">
              Registered accounts can browse and participate, but publishing into Local Life
              opens once your account has been vouched into trusted status.
            </div>
            <div className="mt-6 flex justify-end">
              <button
                type="button"
                onClick={() => setIsDialogOpen(false)}
                className="rounded-full border border-cyan-300/35 bg-white/[0.06] px-4 py-2 text-sm font-medium text-cyan-100 transition hover:border-cyan-300/60 hover:bg-white/[0.1] hover:text-white"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
