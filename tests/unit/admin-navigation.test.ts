import { getVisibleAdminNavSections, normalizeAdminNavSections } from '@/lib/admin-navigation';

test('Reporter submenu follows its parent through persisted section ordering', () => {
  const sections = normalizeAdminNavSections(getVisibleAdminNavSections(false), {
    preferredOrder: { '/admin/reporter': { section: 'Overview', index: 0 } },
    preferredSectionOrder: [],
  });
  const reporter = sections.find((section) => section.title === 'Overview')?.items[0];
  expect(reporter?.href).toBe('/admin/reporter');
  expect(reporter?.children).toEqual([
    { href: '/admin/reporter/sources', label: 'Source Monitor' },
    { href: '/report-a-story', label: 'Public Intake' },
  ]);
  expect(sections.flatMap((section) => section.items).filter((item) => item.href === '/admin/reporter')).toHaveLength(1);
});
