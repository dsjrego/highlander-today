import { RecipeMediaType, RecipeNoteKind, RecipeStatus } from '@prisma/client';
import { z } from 'zod';
import { sanitizeArticleHtml, stripHtmlToText } from './sanitize';
import { getRecipeVideoProvider, isSupportedRecipeVideoUrl } from './recipe-media';

const optionalTrimmedString = z
  .string()
  .optional()
  .nullable()
  .transform((value) => {
    const trimmed = value?.trim();
    return trimmed ? trimmed : undefined;
  });

const optionalUrlString = z
  .string()
  .trim()
  .url()
  .optional()
  .or(z.literal(''))
  .transform((value) => {
    const trimmed = value?.trim();
    return trimmed ? trimmed : undefined;
  });

const RecipeIngredientInputSchema = z.object({
  amount: optionalTrimmedString,
  unit: optionalTrimmedString,
  ingredientName: z.string().trim().min(1).max(160),
  preparationNote: optionalTrimmedString,
  isOptional: z.boolean().optional().default(false),
  substitutionNote: optionalTrimmedString,
});

const RecipeIngredientSectionInputSchema = z.object({
  title: optionalTrimmedString,
  items: z.array(RecipeIngredientInputSchema).default([]),
});

const RecipeInstructionStepInputSchema = z.object({
  title: optionalTrimmedString,
  body: z.string().trim().min(1).max(4000),
  timerMinutes: z.coerce.number().int().min(1).max(24 * 60).optional(),
  imageUrl: optionalTrimmedString,
  videoUrl: z
    .string()
    .trim()
    .optional()
    .nullable()
    .refine((value) => !value || isSupportedRecipeVideoUrl(value), {
      message: 'Step video URL must be a YouTube or Vimeo link.',
    })
    .transform((value) => {
      const trimmed = value?.trim();
      return trimmed ? trimmed : undefined;
    }),
  mediaCaption: optionalTrimmedString,
});

const RecipeNoteInputSchema = z.object({
  kind: z.nativeEnum(RecipeNoteKind).default(RecipeNoteKind.COOK_NOTE),
  title: optionalTrimmedString,
  body: z.string().trim().min(1).max(4000),
});

const RecipeMediaInputSchema = z.object({
  type: z.nativeEnum(RecipeMediaType),
  imageUrl: optionalTrimmedString,
  embedUrl: z
    .string()
    .trim()
    .optional()
    .nullable()
    .refine((value) => !value || isSupportedRecipeVideoUrl(value), {
      message: 'Recipe video URL must be a YouTube or Vimeo link.',
    })
    .transform((value) => {
      const trimmed = value?.trim();
      return trimmed ? trimmed : undefined;
    }),
  caption: optionalTrimmedString,
  altText: optionalTrimmedString,
});

export const RecipePayloadSchema = z.object({
  title: z.string().trim().min(3).max(255),
  excerpt: optionalTrimmedString,
  introHtml: optionalTrimmedString,
  categoryId: z.string().uuid().optional(),
  featuredImageUrl: optionalTrimmedString,
  featuredImageCaption: z
    .string()
    .trim()
    .max(300)
    .optional()
    .nullable()
    .transform((value) => {
      const trimmed = value?.trim();
      return trimmed ? trimmed : undefined;
    }),
  yieldLabel: optionalTrimmedString,
  prepMinutes: z.coerce.number().int().min(0).max(24 * 60).optional(),
  cookMinutes: z.coerce.number().int().min(0).max(24 * 60).optional(),
  totalMinutes: z.coerce.number().int().min(0).max(24 * 60).optional(),
  servings: z.coerce.number().int().min(1).max(200).optional(),
  sourceName: optionalTrimmedString,
  sourceUrl: optionalUrlString,
  ingredientSections: z.array(RecipeIngredientSectionInputSchema).default([]),
  steps: z.array(RecipeInstructionStepInputSchema).min(1),
  notes: z.array(RecipeNoteInputSchema).default([]),
  media: z.array(RecipeMediaInputSchema).default([]),
  structuredInputRaw: z.unknown().optional(),
  status: z.nativeEnum(RecipeStatus).optional().default(RecipeStatus.DRAFT),
});

export const RecipeImportSchema = z.union([
  RecipePayloadSchema,
  z.string().transform((value, ctx) => {
    try {
      return RecipePayloadSchema.parse(JSON.parse(value));
    } catch (error) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: error instanceof Error ? error.message : 'Invalid JSON payload.',
      });
      return z.NEVER;
    }
  }),
]);

export type RecipePayload = z.infer<typeof RecipePayloadSchema>;
export type NormalizedRecipePayload = ReturnType<typeof normalizeRecipePayload>;

function normalizeIntroHtml(value?: string) {
  if (!value) return undefined;
  const sanitized = sanitizeArticleHtml(value);
  return stripHtmlToText(sanitized) ? sanitized : undefined;
}

function normalizeIngredientSections(
  sections: RecipePayload['ingredientSections']
) {
  const normalizedSections = sections
    .map((section) => ({
      title: section.title?.trim() || undefined,
      items: section.items
        .map((item) => ({
          amount: item.amount?.trim() || undefined,
          unit: item.unit?.trim() || undefined,
          ingredientName: item.ingredientName.trim(),
          preparationNote: item.preparationNote?.trim() || undefined,
          isOptional: Boolean(item.isOptional),
          substitutionNote: item.substitutionNote?.trim() || undefined,
        }))
        .filter((item) => item.ingredientName.length > 0),
    }))
    .filter((section) => section.items.length > 0);

  if (normalizedSections.length > 0) {
    return normalizedSections;
  }

  return [
    {
      title: undefined,
      items: [],
    },
  ];
}

function normalizeSteps(steps: RecipePayload['steps']) {
  return steps
    .map((step) => ({
      title: step.title?.trim() || undefined,
      body: step.body.trim(),
      timerMinutes: step.timerMinutes,
      imageUrl: step.imageUrl?.trim() || undefined,
      videoUrl: step.videoUrl?.trim() || undefined,
      mediaCaption: step.mediaCaption?.trim() || undefined,
    }))
    .filter((step) => step.body.length > 0);
}

function normalizeNotes(notes: RecipePayload['notes']) {
  return notes
    .map((note) => ({
      kind: note.kind,
      title: note.title?.trim() || undefined,
      body: note.body.trim(),
    }))
    .filter((note) => note.body.length > 0);
}

function normalizeMedia(media: RecipePayload['media']) {
  return media
    .map((item) => ({
      type: item.type,
      imageUrl: item.imageUrl?.trim() || undefined,
      embedUrl: item.embedUrl?.trim() || undefined,
      caption: item.caption?.trim() || undefined,
      altText: item.altText?.trim() || undefined,
      provider: item.embedUrl ? getRecipeVideoProvider(item.embedUrl) || undefined : undefined,
    }))
    .filter((item) =>
      item.type === RecipeMediaType.IMAGE ? Boolean(item.imageUrl) : Boolean(item.embedUrl)
    );
}

export function normalizeRecipePayload(payload: RecipePayload) {
  const ingredientSections = normalizeIngredientSections(payload.ingredientSections);
  const steps = normalizeSteps(payload.steps);
  const notes = normalizeNotes(payload.notes);
  const media = normalizeMedia(payload.media);

  const computedTotalMinutes =
    payload.totalMinutes !== undefined
      ? payload.totalMinutes
      : payload.prepMinutes !== undefined || payload.cookMinutes !== undefined
        ? (payload.prepMinutes || 0) + (payload.cookMinutes || 0)
        : undefined;

  return {
    title: payload.title.trim(),
    excerpt: payload.excerpt?.trim() || undefined,
    introHtml: normalizeIntroHtml(payload.introHtml),
    categoryId: payload.categoryId,
    featuredImageUrl: payload.featuredImageUrl?.trim() || undefined,
    featuredImageCaption: payload.featuredImageCaption?.trim() || undefined,
    yieldLabel: payload.yieldLabel?.trim() || undefined,
    prepMinutes: payload.prepMinutes,
    cookMinutes: payload.cookMinutes,
    totalMinutes: computedTotalMinutes,
    servings: payload.servings,
    sourceName: payload.sourceName?.trim() || undefined,
    sourceUrl: payload.sourceUrl?.trim() || undefined,
    ingredientSections,
    steps,
    notes,
    media,
    structuredInputRaw: payload.structuredInputRaw,
    status: payload.status,
  };
}

export function buildRecipeSlug(title: string) {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

export function formatRecipeTimeLabel(minutes?: number | null) {
  if (!minutes && minutes !== 0) return null;
  if (minutes < 60) return `${minutes} min`;

  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  if (!remainder) {
    return `${hours} hr${hours === 1 ? '' : 's'}`;
  }
  return `${hours} hr ${remainder} min`;
}

export function serializeRecipe(recipe: {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  introHtml: string | null;
  featuredImageUrl: string | null;
  featuredImageCaption: string | null;
  status: RecipeStatus;
  category: { id: string; name: string; slug: string; parentCategoryId: string | null } | null;
  publishedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  yieldLabel: string | null;
  prepMinutes: number | null;
  cookMinutes: number | null;
  totalMinutes: number | null;
  servings: number | null;
  sourceName: string | null;
  sourceUrl: string | null;
  author: {
    id: string;
    firstName: string;
    lastName: string;
    profilePhotoUrl: string | null;
    bio?: string | null;
    trustLevel?: string;
  };
  ingredientSections: Array<{
    id: string;
    title: string | null;
    sortOrder: number;
    ingredients: Array<{
      id: string;
      amount: string | null;
      unit: string | null;
      ingredientName: string;
      preparationNote: string | null;
      isOptional: boolean;
      substitutionNote: string | null;
      sortOrder: number;
    }>;
  }>;
  instructionSteps: Array<{
    id: string;
    title: string | null;
    body: string;
    timerMinutes: number | null;
    sortOrder: number;
  }>;
  notes: Array<{
    id: string;
    kind: RecipeNoteKind;
    title: string | null;
    body: string;
    sortOrder: number;
  }>;
  media: Array<{
    id: string;
    stepId: string | null;
    type: RecipeMediaType;
    provider: string | null;
    imageUrl: string | null;
    embedUrl: string | null;
    caption: string | null;
    altText: string | null;
    sortOrder: number;
  }>;
}) {
  return {
    ...recipe,
    media: recipe.media.sort((a, b) => a.sortOrder - b.sortOrder),
    ingredientSections: recipe.ingredientSections
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map((section) => ({
        ...section,
        ingredients: section.ingredients.sort((a, b) => a.sortOrder - b.sortOrder),
      })),
    instructionSteps: recipe.instructionSteps
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map((step) => ({
        ...step,
        media: recipe.media
          .filter((media) => media.stepId === step.id)
          .sort((a, b) => a.sortOrder - b.sortOrder),
      })),
    notes: recipe.notes.sort((a, b) => a.sortOrder - b.sortOrder),
  };
}
