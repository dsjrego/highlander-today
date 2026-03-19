import {
  DEFAULT_ROADMAP_WEIGHT_MULTIPLIER_PERCENT,
  MAX_ROADMAP_WEIGHT_MULTIPLIER_PERCENT,
  MIN_ROADMAP_WEIGHT_MULTIPLIER_PERCENT,
  ROADMAP_WEIGHT_DOMAIN,
  UpdateRoadmapWeightSchema,
  matchesRoadmapWeightActivityForCommunity,
} from '@/lib/roadmap-weighting';

describe('roadmap weighting policy', () => {
  it('allows the default roadmap weight without a rationale', () => {
    const result = UpdateRoadmapWeightSchema.parse({
      userId: '11111111-1111-1111-1111-111111111111',
      multiplierPercent: DEFAULT_ROADMAP_WEIGHT_MULTIPLIER_PERCENT,
      rationale: '',
    });

    expect(result.multiplierPercent).toBe(DEFAULT_ROADMAP_WEIGHT_MULTIPLIER_PERCENT);
  });

  it('requires a rationale for non-default roadmap weights', () => {
    const parsed = UpdateRoadmapWeightSchema.safeParse({
      userId: '11111111-1111-1111-1111-111111111111',
      multiplierPercent: MAX_ROADMAP_WEIGHT_MULTIPLIER_PERCENT,
      rationale: '   ',
    });

    expect(parsed.success).toBe(false);
    if (parsed.success) {
      return;
    }

    expect(parsed.error.issues[0]?.path).toEqual(['rationale']);
  });

  it('matches only roadmap weighting entries for the active community when communityId is present', () => {
    expect(
      matchesRoadmapWeightActivityForCommunity(
        {
          domain: ROADMAP_WEIGHT_DOMAIN,
          communityId: 'community-a',
        },
        'community-a'
      )
    ).toBe(true);

    expect(
      matchesRoadmapWeightActivityForCommunity(
        {
          domain: ROADMAP_WEIGHT_DOMAIN,
          communityId: 'community-b',
        },
        'community-a'
      )
    ).toBe(false);
  });

  it('rejects values outside the configured roadmap multiplier bounds', () => {
    expect(
      UpdateRoadmapWeightSchema.safeParse({
        userId: '11111111-1111-1111-1111-111111111111',
        multiplierPercent: MIN_ROADMAP_WEIGHT_MULTIPLIER_PERCENT - 1,
        rationale: 'Too low',
      }).success
    ).toBe(false);

    expect(
      UpdateRoadmapWeightSchema.safeParse({
        userId: '11111111-1111-1111-1111-111111111111',
        multiplierPercent: MAX_ROADMAP_WEIGHT_MULTIPLIER_PERCENT + 1,
        rationale: 'Too high',
      }).success
    ).toBe(false);
  });
});
