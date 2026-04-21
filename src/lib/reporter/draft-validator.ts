import {
  REPORTER_VALIDATION_SEVERITY,
  type ReporterGeneratedDraft,
  type ReporterSourcePacket,
  type ReporterValidationResult,
} from './types';

const advisoryPatterns = [
  /\byou should\b/i,
  /\byou need to\b/i,
  /\bconsider\b/i,
  /\bthe best thing to do\b/i,
  /\bhere'?s what to do\b/i,
];

const chatbotPatterns = [
  /\blet me know if you'd like\b/i,
  /\bi can help with\b/i,
  /\bwould you like me to\b/i,
  /\bif you want, i can\b/i,
];

const analysisSectionPatterns = [
  /(^|\n)What we know\b/i,
  /(^|\n)Missing information\b/i,
  /(^|\n)Reporting gaps\b/i,
  /(^|\n)Editorial angle\b/i,
  /(^|\n)Next steps\b/i,
];

const genericAnalysisPhrases = [
  /additional sourcing may still be needed/i,
  /review the strongest source items/i,
  /identify missing primary-source confirmation/i,
  /decide whether the run is ready/i,
];

export function validateReporterDraft(
  draft: ReporterGeneratedDraft,
  packet: ReporterSourcePacket
): ReporterValidationResult {
  const issues = [];

  if (!draft.body.trim()) {
    issues.push({
      code: 'EMPTY_BODY',
      severity: REPORTER_VALIDATION_SEVERITY.CRITICAL,
      message: 'Draft body is empty.',
      evidenceSpan: null,
    });
  }

  if (draft.draftType === 'ARTICLE_DRAFT' && !draft.headline?.trim()) {
    issues.push({
      code: 'HEADLINE_MISSING',
      severity: REPORTER_VALIDATION_SEVERITY.WARNING,
      message: 'Article draft is missing a headline.',
      evidenceSpan: null,
    });
  }

  if (draft.draftType === 'SOURCE_PACKET_SUMMARY') {
    for (const pattern of analysisSectionPatterns) {
      if (!pattern.test(draft.body)) {
        issues.push({
          code: 'ANALYSIS_STRUCTURE_MISSING',
          severity: REPORTER_VALIDATION_SEVERITY.CRITICAL,
          message:
            'Reporter Agent analysis must include the required internal section headings.',
          evidenceSpan: pattern.toString(),
        });
        break;
      }
    }

    for (const pattern of genericAnalysisPhrases) {
      const match = draft.body.match(pattern);
      if (match) {
        issues.push({
          code: 'ANALYSIS_GENERIC',
          severity: REPORTER_VALIDATION_SEVERITY.CRITICAL,
          message:
            'Reporter Agent analysis contains generic filler instead of story-specific newsroom guidance.',
          evidenceSpan: match[0],
        });
        break;
      }
    }
  }

  for (const pattern of advisoryPatterns) {
    const match = draft.body.match(pattern);
    if (match) {
      issues.push({
        code: 'ADVISORY_DRIFT',
        severity: REPORTER_VALIDATION_SEVERITY.CRITICAL,
        message: 'Draft contains advisory or coaching language.',
        evidenceSpan: match[0],
      });
      break;
    }
  }

  for (const pattern of chatbotPatterns) {
    const match = draft.body.match(pattern);
    if (match) {
      issues.push({
        code: 'CHATBOT_STYLE',
        severity: REPORTER_VALIDATION_SEVERITY.CRITICAL,
        message: 'Draft contains chatbot-style filler.',
        evidenceSpan: match[0],
      });
      break;
    }
  }

  if (packet.sources.length === 0) {
    issues.push({
      code: 'SOURCE_PACKET_EMPTY',
      severity: REPORTER_VALIDATION_SEVERITY.CRITICAL,
      message: 'Draft generation requires at least one source packet item.',
      evidenceSpan: null,
    });
  }

  return {
    issues,
    hasCriticalIssues: issues.some(
      (issue) => issue.severity === REPORTER_VALIDATION_SEVERITY.CRITICAL
    ),
  };
}
