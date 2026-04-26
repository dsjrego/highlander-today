/* eslint-disable @next/next/no-img-element */
import Link from 'next/link';

interface Props {
  page: {
    id: string;
    slug: string;
    title: string;
    pageType: 'DEATH_NOTICE' | 'MEMORIAL_PAGE' | string;
    shortSummary: string | null;
    serviceDetails: string | null;
    publishedAt: Date | string | null;
    heroImageUrl: string | null;
    memorialPerson: {
      fullName: string;
      preferredName: string | null;
      birthDate: Date | string | null;
      deathDate: Date | string | null;
      townName: string | null;
    };
  };
  size: 'default' | 'lg' | 'xl';
}

function years(b: Date | string | null, d: Date | string | null) {
  const by = b ? new Date(b).getFullYear() : null;
  const dy = d ? new Date(d).getFullYear() : null;
  return [by, dy].filter(Boolean).join(' — ');
}

export default function MemoriamCard({ page, size }: Props) {
  const display = page.memorialPerson.preferredName || page.memorialPerson.fullName;
  const lede = page.shortSummary?.trim() || page.serviceDetails?.trim() || '';
  const isNotice = page.pageType === 'DEATH_NOTICE';

  return (
    <Link
      href={`/memoriam/${page.slug}`}
      className={`memoriam-card${size === 'lg' ? ' size-lg' : size === 'xl' ? ' size-xl' : ''}`}
    >
      <div className="memoriam-card-img">
        {page.heroImageUrl ? <img src={page.heroImageUrl} alt="" /> : null}
      </div>
      <div className={`memoriam-card-tag${isNotice ? ' is-notice' : ''}`}>
        {isNotice ? 'Notice' : 'A Life'} · {page.memorialPerson.townName ?? 'Local'}
      </div>
      <h3 className="memoriam-card-title">{display}</h3>
      <p className="memoriam-card-meta">
        {years(page.memorialPerson.birthDate, page.memorialPerson.deathDate)}
      </p>
      {lede ? <p className="memoriam-card-lede">{lede}</p> : null}
    </Link>
  );
}
