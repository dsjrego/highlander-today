import { renderToStaticMarkup } from 'react-dom/server';
import ReporterRunsClient from '@/app/admin/reporter/ReporterRunsClient';

jest.mock('next/navigation', () => ({
  useRouter: () => ({ replace: jest.fn(), push: jest.fn() }),
  usePathname: () => '/admin/reporter',
  useSearchParams: () => new URLSearchParams('section=assigned'),
}));

describe('assigned story navigation', () => {
  test.each([
    ['NEW', 0, 0, false],
    ['BLOCKED', 0, 0, true],
    ['BLOCKED', 0, 1, true],
    ['DRAFT_CREATED', 1, 0, true],
  ])('opens %s stories with %i drafts and %i blockers (canPrepare=%s)', (status, drafts, blockers, canPrepare) => {
    const html = renderToStaticMarkup(
      <ReporterRunsClient
        runs={[{
          id: 'story-1', status, mode: 'RESEARCH', requestType: 'EDITOR_ASSIGNMENT',
          topic: 'Bridge repair', title: null, subjectName: null,
          requesterName: null, requesterEmail: null,
          createdAt: '2026-11-07T12:00:00Z', updatedAt: '2026-11-07T12:00:00Z',
          assignedTo: { id: 'reporter-1', firstName: 'Staff', lastName: 'Reporter' },
          _count: { sources: 1, blockers, drafts, interviewRequests: 0 },
        }]}
        assignees={[]}
        canPrepare={canPrepare}
      />
    );

    expect(html).toMatch(/<a[^>]*href="\/admin\/reporter\/story-1\?view=details"[^>]*>Bridge repair<\/a>/);
    expect(html).toMatch(/<a[^>]*aria-label="Open story"[^>]*href="\/admin\/reporter\/story-1\?view=details"/);
    if (drafts) {
      expect(html).toContain('href="/admin/reporter/story-1/review"');
    }
  });
});
