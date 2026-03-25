export interface SupportNavItem {
  label: string;
  href: string;
  description: string;
}

export const SUPPORT_NAV_ITEMS: SupportNavItem[] = [
  {
    label: 'FAQ',
    href: '/support/faq',
    description: 'Placeholder answers for common platform questions.',
  },
  {
    label: 'How To',
    href: '/support/how-to',
    description: 'Placeholder guides for common tasks and workflows.',
  },
  {
    label: 'Report A Problem',
    href: '/support/report-a-problem',
    description: 'Placeholder intake space for bugs, broken flows, and urgent issues.',
  },
  {
    label: 'Contact Us',
    href: '/support/contact-us',
    description: 'Placeholder contact information and outreach options.',
  },
];
