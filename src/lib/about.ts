export interface AboutNavItem {
  label: string;
  href: string;
  description: string;
}

export interface AboutPillar {
  title: string;
  body: string;
}

export interface AboutRoadmapStage {
  title: string;
  body: string;
  status: 'live' | 'current' | 'next';
}

export interface AboutJournalEntry {
  slug: string;
  title: string;
  summary: string;
  publishedOn: string;
  href: string;
  status: 'published' | 'planned';
}

export const ABOUT_NAV_ITEMS: AboutNavItem[] = [
  {
    label: 'Mission',
    href: '/about/mission',
    description: 'Why we\u2019re building this and what we believe communities deserve.',
  },
  {
    label: 'Roadmap',
    href: '/about/roadmap',
    description: 'What the platform has already built and what comes next.',
  },
  {
    label: 'Blog',
    href: '/about/journal',
    description: 'An evolving public record of the product and organizational point of view.',
  },
];

export const ABOUT_PILLARS: AboutPillar[] = [
  {
    title: 'Community tools should work like community infrastructure',
    body:
      'Finding local news, discovering businesses, showing up to events, asking neighbors for help \u2014 these aren\u2019t luxuries. They\u2019re how a town stays a town. We build and run these tools with the same care you\u2019d expect from any essential local service: reliably, transparently, and for the community\u2019s benefit.',
  },
  {
    title: 'Trust you can actually see',
    body:
      'We\u2019re building around real people, real names, and accountability that grows over time. Not because anonymity is always bad, but because a healthy community runs on people being willing to stand behind what they say and do.',
  },
  {
    title: 'Get it right here first',
    body:
      'We\u2019re starting right here in the highlands of Cambria County because building for one community with honesty and care is harder \u2014 and more valuable \u2014 than building for everywhere at once. The promise is simple: make life here genuinely better before we try to bring this anywhere else.',
  },
];

export const ABOUT_ROADMAP_STAGES: AboutRoadmapStage[] = [
  {
    title: 'Live now: core community loops',
    status: 'live',
    body:
      'Highlander Today already supports local content, events, store-based marketplace discovery, Help Wanted posting, private messaging, trust progression, and community roadmap input with bounded weighting.',
  },
  {
    title: 'Current track: institutional voice',
    status: 'current',
    body:
      'The active product track is the About section itself: giving the platform a stable public place to explain its mission, priorities, and evolving worldview instead of leaving that context implicit.',
  },
  {
    title: 'Next up: richer publishing inside About',
    status: 'next',
    body:
      'After the first About release, the likely next layer is richer editorial publishing for the Journal and a more developed public roadmap narrative that ties shipped work, open questions, and future bets together.',
  },
];

export const ABOUT_JOURNAL_ENTRIES: AboutJournalEntry[] = [
  {
    slug: 'why-highlander-today-exists',
    title: 'Why Highlander Today exists',
    summary:
      'Why the digital tools that shape daily life in a community should work for the people who live there \u2014 and what we\u2019re doing about it.',
    publishedOn: 'March 24, 2026',
    href: '/about/mission',
    status: 'published',
  },
  {
    slug: 'what-we-are-building-next',
    title: 'What we are building next',
    summary:
      'A concise explanation of the current roadmap direction and why institutional clarity matters before new marketplace expansion.',
    publishedOn: 'March 24, 2026',
    href: '/about/roadmap',
    status: 'published',
  },
  {
    slug: 'journal-editorial-voice',
    title: 'Journal editorial voice',
    summary:
      'The Journal will become the place where Highlander Today records product decisions, lessons, and changes in thinking over time.',
    publishedOn: 'Planned',
    href: '/about/journal',
    status: 'planned',
  },
];
