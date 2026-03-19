import { z } from 'zod';

export const ROADMAP_WEIGHT_DOMAIN = 'ROADMAP_FEATURE_PRIORITIZATION' as const;
export const DEFAULT_ROADMAP_WEIGHT_MULTIPLIER_PERCENT = 100;
export const MIN_ROADMAP_WEIGHT_MULTIPLIER_PERCENT = 90;
export const MAX_ROADMAP_WEIGHT_MULTIPLIER_PERCENT = 110;

export interface RoadmapWeightConstraints {
  domain: typeof ROADMAP_WEIGHT_DOMAIN;
  defaultMultiplierPercent: typeof DEFAULT_ROADMAP_WEIGHT_MULTIPLIER_PERCENT;
  minMultiplierPercent: typeof MIN_ROADMAP_WEIGHT_MULTIPLIER_PERCENT;
  maxMultiplierPercent: typeof MAX_ROADMAP_WEIGHT_MULTIPLIER_PERCENT;
}

export interface RoadmapWeightActivityMetadata {
  domain: typeof ROADMAP_WEIGHT_DOMAIN;
  communityId?: string;
  targetUserId?: string;
  targetUserName?: string;
  previousMultiplierPercent?: number;
  multiplierPercent?: number;
  rationale?: string | null;
}

export const ROADMAP_WEIGHT_CONSTRAINTS: RoadmapWeightConstraints = {
  domain: ROADMAP_WEIGHT_DOMAIN,
  defaultMultiplierPercent: DEFAULT_ROADMAP_WEIGHT_MULTIPLIER_PERCENT,
  minMultiplierPercent: MIN_ROADMAP_WEIGHT_MULTIPLIER_PERCENT,
  maxMultiplierPercent: MAX_ROADMAP_WEIGHT_MULTIPLIER_PERCENT,
};

export const UpdateRoadmapWeightSchema = z
  .object({
    userId: z.string().uuid(),
    multiplierPercent: z
      .number()
      .int()
      .min(MIN_ROADMAP_WEIGHT_MULTIPLIER_PERCENT)
      .max(MAX_ROADMAP_WEIGHT_MULTIPLIER_PERCENT),
    rationale: z.string().trim().max(1000).nullable().optional(),
  })
  .superRefine((value, context) => {
    const normalizedRationale = value.rationale?.trim() ?? '';

    if (
      value.multiplierPercent !== DEFAULT_ROADMAP_WEIGHT_MULTIPLIER_PERCENT &&
      normalizedRationale.length === 0
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'A rationale is required for any non-default roadmap weight.',
        path: ['rationale'],
      });
    }
  });

export function isNonDefaultRoadmapWeight(multiplierPercent: number) {
  return multiplierPercent !== DEFAULT_ROADMAP_WEIGHT_MULTIPLIER_PERCENT;
}

export function isRoadmapWeightActivityMetadata(
  value: unknown
): value is RoadmapWeightActivityMetadata {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const metadata = value as Record<string, unknown>;
  return metadata.domain === ROADMAP_WEIGHT_DOMAIN;
}

export function matchesRoadmapWeightActivityForCommunity(
  value: unknown,
  communityId: string
) {
  if (!isRoadmapWeightActivityMetadata(value)) {
    return false;
  }

  return !value.communityId || value.communityId === communityId;
}
