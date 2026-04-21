import type { ReporterProviderAdapter } from './provider-adapter';
import {
  REPORTER_DRAFT_TYPE,
  type ReporterDraftGenerationInput,
  type ReporterProviderDraftResult,
} from './types';
import { buildFallbackDraft } from './provider-adapter';

export class OpenAIReporterProvider implements ReporterProviderAdapter {
  readonly provider = 'openai';
  readonly model: string;

  constructor(model = process.env.REPORTER_MODEL_NAME || 'gpt-5.4-mini') {
    this.model = model;
  }

  async generateDraft(
    input: ReporterDraftGenerationInput
  ): Promise<ReporterProviderDraftResult> {
    if (!process.env.OPENAI_API_KEY) {
      return buildFallbackDraft(this.provider, this.model, {
        ...input,
        draftType: input.draftType ?? REPORTER_DRAFT_TYPE.ARTICLE_DRAFT,
      });
    }

    return buildFallbackDraft(this.provider, this.model, input);
  }
}
