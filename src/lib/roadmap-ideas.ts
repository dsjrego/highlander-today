import type { RoadmapIdeaStatus } from '@prisma/client';

export const ROADMAP_PUBLIC_STATUSES: RoadmapIdeaStatus[] = [
  'APPROVED_FOR_RANKING',
  'PLANNED',
  'IN_PROGRESS',
  'SHIPPED',
];

export const ROADMAP_REVIEW_QUEUE_STATUSES: RoadmapIdeaStatus[] = [
  'SUBMITTED',
  'UNDER_REVIEW',
];

export const ROADMAP_AUTHOR_EDITABLE_STATUSES: RoadmapIdeaStatus[] = [
  'SUBMITTED',
  'UNDER_REVIEW',
  'DECLINED',
];

export const ROADMAP_AUTHOR_DELETEABLE_STATUSES: RoadmapIdeaStatus[] = [
  'SUBMITTED',
  'DECLINED',
];

export const ROADMAP_STATUS_LABELS: Record<RoadmapIdeaStatus, string> = {
  SUBMITTED: 'Submitted',
  UNDER_REVIEW: 'Under Review',
  APPROVED_FOR_RANKING: 'Open for Ranking',
  DECLINED: 'Declined',
  MERGED: 'Merged',
  PLANNED: 'Planned',
  IN_PROGRESS: 'In Progress',
  SHIPPED: 'Shipped',
};

export const ROADMAP_STATUS_STYLES: Record<RoadmapIdeaStatus, string> = {
  SUBMITTED: 'bg-slate-100 text-slate-700',
  UNDER_REVIEW: 'bg-amber-100 text-amber-800',
  APPROVED_FOR_RANKING: 'bg-sky-100 text-sky-800',
  DECLINED: 'bg-rose-100 text-rose-800',
  MERGED: 'bg-violet-100 text-violet-800',
  PLANNED: 'bg-indigo-100 text-indigo-800',
  IN_PROGRESS: 'bg-orange-100 text-orange-800',
  SHIPPED: 'bg-emerald-100 text-emerald-800',
};

export function isRoadmapIdeaPublic(status: RoadmapIdeaStatus) {
  return ROADMAP_PUBLIC_STATUSES.includes(status);
}

export function isRoadmapIdeaAuthorEditable(status: RoadmapIdeaStatus) {
  return ROADMAP_AUTHOR_EDITABLE_STATUSES.includes(status);
}

export function isRoadmapIdeaAuthorDeleteable(status: RoadmapIdeaStatus) {
  return ROADMAP_AUTHOR_DELETEABLE_STATUSES.includes(status);
}
