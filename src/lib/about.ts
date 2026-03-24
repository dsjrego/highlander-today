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
    description: 'Why Highlander Today exists and how it thinks about community infrastructure.',
  },
  {
    label: 'Roadmap',
    href: '/about/roadmap',
    description: 'What the platform has already built and what comes next.',
  },
  {
    label: 'Journal',
    href: '/about/journal',
    description: 'An evolving public record of the product and organizational point of view.',
  },
];

export const ABOUT_PILLARS: AboutPillar[] = [
  {
    title: 'Local technology should behave like shared infrastructure',
    body:
      'Communication, discovery, coordination, and market access increasingly shape whether a town feels connected or fragmented. Highlander Today treats those tools as local infrastructure, not as disposable engagement software.',
  },
  {
    title: 'Accountability matters more than raw reach',
    body:
      'The platform is designed around real people, visible moderation, trust progression, and durable identity. The goal is not anonymous scale. The goal is a healthier local loop where actions and relationships persist over time.',
  },
  {
    title: 'Usefulness comes before expansion',
    body:
      'The first obligation is to make one community feel tangibly better informed and better connected. Expansion only makes sense after the core loops are producing repeat local value in the current community.',
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
      'A public framing for why local communication and coordination tools should be treated as accountable infrastructure.',
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
