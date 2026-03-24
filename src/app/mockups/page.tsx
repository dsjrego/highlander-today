import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Design Mockups | Highlander Today',
  description:
    'Standalone design explorations for a more modern Highlander Today visual direction.',
};

const navItems = ['Home', 'Local Life', 'Experiences', 'Market', 'Help Wanted', 'About'];

const featureCards = [
  {
    eyebrow: 'Local Life',
    title: 'The stories people here actually care about',
    body:
      'Town updates, local reporting, school events, public notices, and community voices in one place.',
  },
  {
    eyebrow: 'Trust',
    title: 'Identity that means something',
    body:
      'Real people, visible accountability, and a trust model built for a healthier local network.',
  },
  {
    eyebrow: 'Opportunity',
    title: 'A better loop for jobs, help, and local commerce',
    body:
      'More useful than a classifieds board, more grounded than a generic feed, and built around participation.',
  },
];

const quickStats = [
  { label: 'Core idea', value: 'Civic infrastructure' },
  { label: 'Tone', value: 'Young, grounded, credible' },
  { label: 'Audience', value: 'Residents, families, local businesses' },
];

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-xs font-semibold uppercase tracking-[0.32em] text-current/70">
      {children}
    </p>
  );
}

function BrowserFrame({
  children,
  chromeTone,
}: {
  children: React.ReactNode;
  chromeTone: string;
}) {
  return (
    <div className="overflow-hidden rounded-[28px] border border-black/10 bg-white shadow-[0_28px_90px_rgba(15,23,42,0.12)]">
      <div className={`flex items-center gap-2 border-b border-black/5 px-5 py-3 ${chromeTone}`}>
        <span className="h-3 w-3 rounded-full bg-[#ff5f57]" />
        <span className="h-3 w-3 rounded-full bg-[#febc2e]" />
        <span className="h-3 w-3 rounded-full bg-[#28c840]" />
        <div className="ml-3 rounded-full bg-white/70 px-4 py-1 text-xs text-slate-500">
          highlander.today
        </div>
      </div>
      {children}
    </div>
  );
}

function PhoneFrame({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto w-[320px] rounded-[34px] border-[10px] border-slate-950 bg-slate-950 p-2 shadow-[0_30px_80px_rgba(15,23,42,0.24)]">
      <div className="mb-2 flex justify-center">
        <div className="h-1.5 w-24 rounded-full bg-slate-700" />
      </div>
      <div className="overflow-hidden rounded-[24px] bg-white">{children}</div>
    </div>
  );
}

function CivicModernMockup() {
  return (
    <BrowserFrame chromeTone="bg-[#e9f0f5]">
      <div className="bg-[#f5f7fb] text-slate-900">
        <div className="border-b border-slate-200/80 bg-white/90 px-6 py-4 backdrop-blur">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="font-serif text-3xl leading-none text-[#0f172a]">Highlander Today</p>
              <p className="mt-2 text-sm tracking-[0.16em] text-slate-500 uppercase">
                Cambria Heights community platform
              </p>
            </div>
            <div className="flex flex-wrap gap-3 text-sm font-medium text-slate-700">
              {navItems.map((item) => (
                <span key={item} className="rounded-full bg-slate-100 px-4 py-2">
                  {item}
                </span>
              ))}
            </div>
          </div>
        </div>

        <div className="px-6 py-8 md:px-10 md:py-10">
          <section className="grid gap-8 rounded-[30px] bg-[radial-gradient(circle_at_top_left,#ffffff_0%,#eef4f8_48%,#dfe9ef_100%)] p-8 md:grid-cols-[1.25fr_0.75fr] md:p-10">
            <div>
              <SectionLabel>Concept 1 / Civic Modern</SectionLabel>
              <h1 className="mt-4 max-w-3xl font-serif text-4xl leading-[1.02] text-slate-950 md:text-6xl">
                Local information should feel essential, calm, and worth coming back to.
              </h1>
              <p className="mt-5 max-w-2xl text-base leading-8 text-slate-600 md:text-lg">
                This direction keeps credibility high but removes the older municipal feel. It
                leans editorial, cleaner typography, softer surfaces, and a more premium sense of
                space.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <span className="rounded-full bg-[#8f1d2c] px-5 py-3 text-sm font-semibold text-white">
                  Read Local Life
                </span>
                <span className="rounded-full border border-slate-300 px-5 py-3 text-sm font-semibold text-slate-700">
                  Explore the Mission
                </span>
              </div>
            </div>

            <div className="grid gap-3 rounded-[26px] border border-white/60 bg-white/80 p-5 shadow-[0_20px_50px_rgba(15,23,42,0.08)]">
              {quickStats.map((stat) => (
                <div
                  key={stat.label}
                  className="rounded-2xl border border-slate-200 bg-white px-4 py-4"
                >
                  <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">
                    {stat.label}
                  </p>
                  <p className="mt-2 text-lg font-semibold text-slate-900">{stat.value}</p>
                </div>
              ))}
            </div>
          </section>

          <section className="mt-8 grid gap-5 md:grid-cols-3">
            {featureCards.map((card) => (
              <article
                key={card.title}
                className="rounded-[24px] border border-slate-200 bg-white p-6 shadow-[0_10px_30px_rgba(15,23,42,0.05)]"
              >
                <p className="text-sm font-semibold uppercase tracking-[0.24em] text-[#8f1d2c]">
                  {card.eyebrow}
                </p>
                <h2 className="mt-4 text-2xl font-semibold leading-tight text-slate-950">
                  {card.title}
                </h2>
                <p className="mt-4 text-sm leading-7 text-slate-600">{card.body}</p>
              </article>
            ))}
          </section>
        </div>
      </div>
    </BrowserFrame>
  );
}

function CivicModernMobileMockup() {
  return (
    <PhoneFrame>
      <div className="bg-[#f5f7fb] text-slate-900">
        <div className="border-b border-slate-200 bg-white/95 px-4 py-4">
          <p className="font-serif text-2xl leading-none text-[#0f172a]">Highlander Today</p>
          <p className="mt-1 text-[11px] uppercase tracking-[0.18em] text-slate-500">
            Cambria Heights community platform
          </p>
          <div className="mt-4 flex gap-2 overflow-x-auto pb-1 text-xs font-medium text-slate-700">
            {navItems.slice(0, 4).map((item) => (
              <span key={item} className="whitespace-nowrap rounded-full bg-slate-100 px-3 py-1.5">
                {item}
              </span>
            ))}
          </div>
        </div>

        <div className="space-y-4 px-4 py-4">
          <section className="rounded-[24px] bg-[radial-gradient(circle_at_top_left,#ffffff_0%,#eef4f8_48%,#dfe9ef_100%)] p-5">
            <SectionLabel>Concept 1 / Civic Modern</SectionLabel>
            <h3 className="mt-3 font-serif text-3xl leading-[1.02] text-slate-950">
              Local information should feel essential.
            </h3>
            <p className="mt-3 text-sm leading-7 text-slate-600">
              Clean editorial surfaces, less noise, and a more premium sense of space.
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <span className="rounded-full bg-[#8f1d2c] px-4 py-2 text-xs font-semibold text-white">
                Read Local Life
              </span>
              <span className="rounded-full border border-slate-300 px-4 py-2 text-xs font-semibold text-slate-700">
                Mission
              </span>
            </div>
          </section>

          {featureCards.slice(0, 2).map((card) => (
            <article key={card.title} className="rounded-[20px] border border-slate-200 bg-white p-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#8f1d2c]">
                {card.eyebrow}
              </p>
              <h4 className="mt-3 text-xl font-semibold leading-tight text-slate-950">
                {card.title}
              </h4>
              <p className="mt-3 text-sm leading-6 text-slate-600">{card.body}</p>
            </article>
          ))}
        </div>
      </div>
    </PhoneFrame>
  );
}

function YouthLocalMockup() {
  return (
    <BrowserFrame chromeTone="bg-[#15191f]">
      <div className="overflow-hidden bg-[#07111a] text-white">
        <div className="relative border-b border-white/10 bg-[linear-gradient(135deg,#091a28_0%,#0f2941_36%,#8f1d2c_100%)] px-6 py-5">
          <div className="absolute inset-0 opacity-30 [background-image:radial-gradient(circle_at_20%_10%,rgba(255,255,255,0.18),transparent_28%),radial-gradient(circle_at_85%_25%,rgba(70,168,204,0.35),transparent_24%),radial-gradient(circle_at_70%_90%,rgba(255,255,255,0.12),transparent_16%)]" />
          <div className="relative flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-4xl font-black tracking-[-0.04em] text-white md:text-5xl">
                Highlander Today
              </p>
              <p className="mt-2 text-sm font-medium uppercase tracking-[0.28em] text-cyan-100/80">
                News, events, trust, opportunity
              </p>
            </div>
            <div className="flex flex-wrap gap-2 text-sm font-semibold">
              {navItems.map((item) => (
                <span
                  key={item}
                  className="rounded-full border border-white/15 bg-white/10 px-4 py-2 text-white/90 backdrop-blur"
                >
                  {item}
                </span>
              ))}
            </div>
          </div>
        </div>

        <div className="relative px-6 py-8 md:px-10 md:py-10">
          <div className="absolute inset-x-0 top-0 h-72 bg-[radial-gradient(circle_at_top,rgba(70,168,204,0.22),transparent_58%)]" />
          <section className="relative grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
            <div className="rounded-[32px] border border-white/10 bg-[linear-gradient(145deg,rgba(143,29,44,0.95),rgba(10,32,51,0.94))] p-8 shadow-[0_35px_80px_rgba(0,0,0,0.35)] md:p-10">
              <SectionLabel>Concept 2 / Youth Local</SectionLabel>
              <h1 className="mt-4 max-w-3xl text-4xl font-black leading-[0.94] tracking-[-0.05em] text-white md:text-7xl">
                Make local feel alive, social, and impossible to ignore.
              </h1>
              <p className="mt-5 max-w-2xl text-base leading-8 text-white/80 md:text-lg">
                This direction is more energetic and more magnetic for younger residents. It keeps
                the community mission, but gives the brand more confidence, edge, and momentum.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <span className="rounded-full bg-white px-5 py-3 text-sm font-bold text-slate-950">
                  Open the feed
                </span>
                <span className="rounded-full border border-white/30 px-5 py-3 text-sm font-bold text-white">
                  See what&apos;s happening
                </span>
              </div>
            </div>

            <div className="grid gap-4">
              <div className="rounded-[28px] border border-cyan-300/20 bg-[#0d1824] p-6 shadow-[0_24px_50px_rgba(0,0,0,0.25)]">
                <p className="text-xs font-semibold uppercase tracking-[0.28em] text-cyan-200/70">
                  Why it works
                </p>
                <ul className="mt-4 space-y-4 text-sm leading-7 text-white/80">
                  <li>Stronger visual identity in the header and hero.</li>
                  <li>Less “government website,” more “local platform people want to use.”</li>
                  <li>Room for motion, live cards, badges, and activity without losing trust.</li>
                </ul>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-[24px] border border-white/10 bg-white/5 p-5 backdrop-blur">
                  <p className="text-3xl font-black text-cyan-200">24/7</p>
                  <p className="mt-2 text-sm leading-6 text-white/75">
                    A daily-use community utility, not a static brochure.
                  </p>
                </div>
                <div className="rounded-[24px] border border-white/10 bg-white/5 p-5 backdrop-blur">
                  <p className="text-3xl font-black text-pink-200">Real</p>
                  <p className="mt-2 text-sm leading-6 text-white/75">
                    Identity, trust, and accountability made visually visible.
                  </p>
                </div>
              </div>
            </div>
          </section>

          <section className="relative mt-8 grid gap-4 md:grid-cols-3">
            {featureCards.map((card, index) => (
              <article
                key={card.title}
                className="rounded-[26px] border border-white/10 p-6 shadow-[0_20px_40px_rgba(0,0,0,0.22)]"
                style={{
                  background:
                    index === 0
                      ? 'linear-gradient(160deg, rgba(17,34,52,0.95), rgba(8,20,33,0.95))'
                      : index === 1
                        ? 'linear-gradient(160deg, rgba(27,28,53,0.95), rgba(13,18,36,0.95))'
                        : 'linear-gradient(160deg, rgba(57,20,34,0.95), rgba(20,13,24,0.95))',
                }}
              >
                <p className="text-xs font-semibold uppercase tracking-[0.3em] text-white/55">
                  {card.eyebrow}
                </p>
                <h2 className="mt-4 text-2xl font-bold leading-tight text-white">{card.title}</h2>
                <p className="mt-4 text-sm leading-7 text-white/72">{card.body}</p>
              </article>
            ))}
          </section>
        </div>
      </div>
    </BrowserFrame>
  );
}

function YouthLocalMobileMockup() {
  return (
    <PhoneFrame>
      <div className="bg-[#07111a] text-white">
        <div className="relative overflow-hidden border-b border-white/10 bg-[linear-gradient(135deg,#091a28_0%,#0f2941_36%,#8f1d2c_100%)] px-4 py-5">
          <div className="absolute inset-0 opacity-30 [background-image:radial-gradient(circle_at_20%_10%,rgba(255,255,255,0.18),transparent_28%),radial-gradient(circle_at_85%_25%,rgba(70,168,204,0.35),transparent_24%)]" />
          <div className="relative">
            <p className="text-3xl font-black tracking-[-0.05em] text-white">Highlander Today</p>
            <p className="mt-2 text-[11px] uppercase tracking-[0.28em] text-cyan-100/80">
              News, events, trust
            </p>
            <div className="mt-4 flex gap-2 overflow-x-auto pb-1 text-xs font-semibold">
              {navItems.slice(0, 4).map((item) => (
                <span
                  key={item}
                  className="whitespace-nowrap rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-white/90"
                >
                  {item}
                </span>
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-4 px-4 py-4">
          <section className="rounded-[24px] border border-white/10 bg-[linear-gradient(145deg,rgba(143,29,44,0.95),rgba(10,32,51,0.94))] p-5 shadow-[0_20px_40px_rgba(0,0,0,0.28)]">
            <SectionLabel>Concept 2 / Youth Local</SectionLabel>
            <h3 className="mt-3 text-4xl font-black leading-[0.95] tracking-[-0.05em] text-white">
              Make local feel alive.
            </h3>
            <p className="mt-3 text-sm leading-7 text-white/80">
              Higher energy, stronger identity, and more pull for younger residents.
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <span className="rounded-full bg-white px-4 py-2 text-xs font-bold text-slate-950">
                Open feed
              </span>
              <span className="rounded-full border border-white/30 px-4 py-2 text-xs font-bold text-white">
                See events
              </span>
            </div>
          </section>

          {featureCards.slice(0, 2).map((card, index) => (
            <article
              key={card.title}
              className="rounded-[22px] border border-white/10 p-4"
              style={{
                background:
                  index === 0
                    ? 'linear-gradient(160deg, rgba(17,34,52,0.95), rgba(8,20,33,0.95))'
                    : 'linear-gradient(160deg, rgba(57,20,34,0.95), rgba(20,13,24,0.95))',
              }}
            >
              <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-white/55">
                {card.eyebrow}
              </p>
              <h4 className="mt-3 text-xl font-bold leading-tight text-white">{card.title}</h4>
              <p className="mt-3 text-sm leading-6 text-white/72">{card.body}</p>
            </article>
          ))}
        </div>
      </div>
    </PhoneFrame>
  );
}

function UtilityMinimalMockup() {
  return (
    <BrowserFrame chromeTone="bg-[#eef0f3]">
      <div className="bg-[#f7f8fa] text-slate-900">
        <div className="border-b border-slate-200 bg-white px-6 py-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#0f172a] text-sm font-black text-white">
                HT
              </div>
              <div>
                <p className="text-lg font-semibold text-slate-950">Highlander Today</p>
                <p className="text-sm text-slate-500">Built for daily local use</p>
              </div>
            </div>
            <div className="flex flex-wrap gap-4 text-sm font-medium text-slate-600">
              {navItems.map((item) => (
                <span key={item}>{item}</span>
              ))}
            </div>
          </div>
        </div>

        <div className="px-6 py-8 md:px-10 md:py-10">
          <section className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
            <div className="rounded-[30px] bg-white p-8 shadow-[0_16px_40px_rgba(15,23,42,0.06)] ring-1 ring-slate-200 md:p-10">
              <SectionLabel>Concept 3 / Utility Minimal</SectionLabel>
              <h1 className="mt-4 max-w-3xl text-4xl font-semibold leading-tight tracking-[-0.04em] text-slate-950 md:text-6xl">
                Strip away the old ornament. Make the product feel faster, clearer, and more useful.
              </h1>
              <p className="mt-5 max-w-2xl text-base leading-8 text-slate-600 md:text-lg">
                This is the most restrained option. It feels current and app-like, while still
                leaving room for warmth through photography, local stories, and people-focused
                content.
              </p>

              <div className="mt-8 grid gap-3 sm:grid-cols-3">
                <div className="rounded-2xl bg-slate-100 p-4">
                  <p className="text-sm font-semibold text-slate-500">Feed quality</p>
                  <p className="mt-2 text-2xl font-semibold text-slate-950">High signal</p>
                </div>
                <div className="rounded-2xl bg-slate-100 p-4">
                  <p className="text-sm font-semibold text-slate-500">Trust</p>
                  <p className="mt-2 text-2xl font-semibold text-slate-950">Visible status</p>
                </div>
                <div className="rounded-2xl bg-slate-100 p-4">
                  <p className="text-sm font-semibold text-slate-500">Tone</p>
                  <p className="mt-2 text-2xl font-semibold text-slate-950">Calm confidence</p>
                </div>
              </div>
            </div>

            <div className="rounded-[30px] bg-[#0f172a] p-6 text-white shadow-[0_20px_50px_rgba(15,23,42,0.18)]">
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-cyan-200/70">
                Example stack
              </p>
              <div className="mt-5 space-y-4">
                <article className="rounded-2xl bg-white/8 p-5">
                  <p className="text-sm font-semibold text-cyan-200">Top story</p>
                  <h2 className="mt-2 text-xl font-semibold text-white">
                    Borough council meeting recap
                  </h2>
                  <p className="mt-2 text-sm leading-6 text-white/70">
                    Fast access to the updates residents actually need, without noisy layout clutter.
                  </p>
                </article>
                <article className="rounded-2xl bg-white/8 p-5">
                  <p className="text-sm font-semibold text-cyan-200">Events</p>
                  <h2 className="mt-2 text-xl font-semibold text-white">
                    Fish fry, track meet, library workshop
                  </h2>
                  <p className="mt-2 text-sm leading-6 text-white/70">
                    Dense, usable cards that feel more like a product and less like a brochure.
                  </p>
                </article>
              </div>
            </div>
          </section>

          <section className="mt-8 grid gap-4 md:grid-cols-3">
            {featureCards.map((card) => (
              <article key={card.title} className="rounded-[26px] bg-white p-6 ring-1 ring-slate-200">
                <p className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-500">
                  {card.eyebrow}
                </p>
                <h2 className="mt-4 text-2xl font-semibold leading-tight text-slate-950">
                  {card.title}
                </h2>
                <p className="mt-4 text-sm leading-7 text-slate-600">{card.body}</p>
              </article>
            ))}
          </section>
        </div>
      </div>
    </BrowserFrame>
  );
}

function UtilityMinimalMobileMockup() {
  return (
    <PhoneFrame>
      <div className="bg-[#f7f8fa] text-slate-900">
        <div className="border-b border-slate-200 bg-white px-4 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#0f172a] text-xs font-black text-white">
              HT
            </div>
            <div>
              <p className="text-base font-semibold text-slate-950">Highlander Today</p>
              <p className="text-xs text-slate-500">Built for daily local use</p>
            </div>
          </div>
          <div className="mt-4 flex gap-3 overflow-x-auto pb-1 text-xs font-medium text-slate-600">
            {navItems.slice(0, 4).map((item) => (
              <span key={item} className="whitespace-nowrap">
                {item}
              </span>
            ))}
          </div>
        </div>

        <div className="space-y-4 px-4 py-4">
          <section className="rounded-[24px] bg-white p-5 ring-1 ring-slate-200">
            <SectionLabel>Concept 3 / Utility Minimal</SectionLabel>
            <h3 className="mt-3 text-3xl font-semibold leading-tight tracking-[-0.04em] text-slate-950">
              Clear, fast, useful.
            </h3>
            <p className="mt-3 text-sm leading-7 text-slate-600">
              The most restrained option. Product-first, modern, and easy to scan.
            </p>
            <div className="mt-4 grid grid-cols-2 gap-2">
              <div className="rounded-2xl bg-slate-100 p-3">
                <p className="text-[11px] font-semibold text-slate-500">Feed quality</p>
                <p className="mt-1 text-sm font-semibold text-slate-950">High signal</p>
              </div>
              <div className="rounded-2xl bg-slate-100 p-3">
                <p className="text-[11px] font-semibold text-slate-500">Trust</p>
                <p className="mt-1 text-sm font-semibold text-slate-950">Visible</p>
              </div>
            </div>
          </section>

          {featureCards.slice(0, 2).map((card) => (
            <article key={card.title} className="rounded-[20px] bg-white p-4 ring-1 ring-slate-200">
              <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">
                {card.eyebrow}
              </p>
              <h4 className="mt-3 text-xl font-semibold leading-tight text-slate-950">
                {card.title}
              </h4>
              <p className="mt-3 text-sm leading-6 text-slate-600">{card.body}</p>
            </article>
          ))}
        </div>
      </div>
    </PhoneFrame>
  );
}

export default function MockupsPage() {
  return (
    <div className="space-y-8 pb-6">
      <section className="rounded-[32px] border border-slate-200 bg-[linear-gradient(180deg,#ffffff_0%,#f6f8fb_100%)] p-8 shadow-sm md:p-10">
        <SectionLabel>Design Lab</SectionLabel>
        <h1 className="mt-4 max-w-4xl text-4xl font-semibold tracking-[-0.04em] text-slate-950 md:text-6xl">
          Mockups for a younger, sharper Highlander Today.
        </h1>
        <p className="mt-5 max-w-3xl text-base leading-8 text-slate-600 md:text-lg">
          These are concept comps only. They do not replace the current site. The goal is to
          explore visual direction before we commit to real component and CSS work.
        </p>
        <div className="mt-6 flex flex-wrap gap-3 text-sm font-semibold">
          <Link
            href="/about"
            className="rounded-full border border-slate-300 px-5 py-3 text-slate-700 no-underline hover:bg-slate-100"
          >
            Current About page
          </Link>
          <Link
            href="/"
            className="rounded-full border border-slate-300 px-5 py-3 text-slate-700 no-underline hover:bg-slate-100"
          >
            Current homepage
          </Link>
        </div>
      </section>

      <section className="space-y-4">
        <div className="flex items-end justify-between gap-4">
          <div>
            <h2 className="text-2xl font-semibold tracking-[-0.03em] text-slate-950">
              Concept A: Civic Modern
            </h2>
            <p className="mt-2 max-w-2xl text-sm leading-7 text-slate-600">
              Editorial, trustworthy, cleaner, and much more current without feeling trendy for its
              own sake.
            </p>
          </div>
        </div>
        <CivicModernMockup />
        <div>
          <h3 className="mb-4 text-lg font-semibold text-slate-900">Phone Preview</h3>
          <CivicModernMobileMockup />
        </div>
      </section>

      <section className="space-y-4">
        <div>
          <h2 className="text-2xl font-semibold tracking-[-0.03em] text-slate-950">
            Concept B: Youth Local
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-7 text-slate-600">
            Bolder, more social, and more magnetic. This is the strongest move if you want to pull
            the brand away from “old town website” and toward “modern local platform.”
            </p>
        </div>
        <YouthLocalMockup />
        <div>
          <h3 className="mb-4 text-lg font-semibold text-slate-900">Phone Preview</h3>
          <YouthLocalMobileMockup />
        </div>
      </section>

      <section className="space-y-4">
        <div>
          <h2 className="text-2xl font-semibold tracking-[-0.03em] text-slate-950">
            Concept C: Utility Minimal
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-7 text-slate-600">
            Calm, app-like, and clean. Lower visual drama, higher product clarity.
            </p>
        </div>
        <UtilityMinimalMockup />
        <div>
          <h3 className="mb-4 text-lg font-semibold text-slate-900">Phone Preview</h3>
          <UtilityMinimalMobileMockup />
        </div>
      </section>
    </div>
  );
}
