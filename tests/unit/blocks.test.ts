import { toUserBlockStatus } from '@/lib/blocks';

describe('toUserBlockStatus', () => {
  it('returns no block flags when there are no matching relationships', () => {
    expect(
      toUserBlockStatus('viewer-1', 'target-1', [])
    ).toEqual({
      blockedByViewer: false,
      blockedViewer: false,
    });
  });

  it('detects when the viewer blocked the target', () => {
    expect(
      toUserBlockStatus('viewer-1', 'target-1', [
        {
          blockerUserId: 'viewer-1',
          blockedUserId: 'target-1',
        },
      ])
    ).toEqual({
      blockedByViewer: true,
      blockedViewer: false,
    });
  });

  it('detects when the target blocked the viewer', () => {
    expect(
      toUserBlockStatus('viewer-1', 'target-1', [
        {
          blockerUserId: 'target-1',
          blockedUserId: 'viewer-1',
        },
      ])
    ).toEqual({
      blockedByViewer: false,
      blockedViewer: true,
    });
  });
});
