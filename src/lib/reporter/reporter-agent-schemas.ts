import { z } from 'zod';

export const InterviewStepDecisionSchema = z.object({
  shouldComplete: z.boolean(),
  questionKey: z.string().nullable(),
  questionText: z.string().nullable(),
  rationale: z.string().nullable(),
});

export const ReporterDraftOutputSchema = z.object({
  headline: z.string().nullable(),
  dek: z.string().nullable(),
  body: z.string().min(1),
  generationNotes: z.string().nullable(),
});

export const SourcePacketAnalysisOutputSchema = ReporterDraftOutputSchema;

export const InterviewFactExtractionItemSchema = z.object({
  factType: z.string(),
  summary: z.string(),
  detail: z.string().nullable().optional(),
  sourceLabel: z.string().nullable().optional(),
});

export const InterviewFactExtractionOutputSchema = z.object({
  facts: z.array(InterviewFactExtractionItemSchema),
});

export const TriageSummarySchema = z.object({
  summary: z.string(),
  classifications: z.array(z.string()),
  nextSteps: z.array(z.string()).optional(),
});
