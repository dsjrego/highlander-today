import type { ReporterInterviewSafetyFlagType } from '@prisma/client';

export interface InterviewSafetyFlagSeed {
  flagType: ReporterInterviewSafetyFlagType;
  headline: string;
  detail: string;
  evidenceSpan: string;
  blockerCode: string;
  blockerMessage: string;
  sortOrder: number;
}

const SAFETY_PATTERNS: Array<{
  flagType: ReporterInterviewSafetyFlagType;
  blockerCode: string;
  headline: string;
  pattern: RegExp;
}> = [
  {
    flagType: 'ACCUSATION_OF_WRONGDOING',
    blockerCode: 'INTERVIEW_FLAG_ACCUSATION',
    headline: 'Accusation of wrongdoing mentioned',
    pattern: /\b(accused|stole|fraud|corrupt|assaulted|abused|harassed|criminal|illegal activity)\b/i,
  },
  {
    flagType: 'MINOR_MENTION',
    blockerCode: 'INTERVIEW_FLAG_MINOR',
    headline: 'Possible minor mentioned',
    pattern: /\b(minor|child|children|kid|teen|teenager|underage|juvenile)\b/i,
  },
  {
    flagType: 'SELF_HARM_OR_VIOLENCE',
    blockerCode: 'INTERVIEW_FLAG_VIOLENCE',
    headline: 'Violence or self-harm signal mentioned',
    pattern: /\b(self-harm|suicide|kill myself|hurt myself|shoot|stab|violent|threatened to kill|domestic violence)\b/i,
  },
  {
    flagType: 'MEDICAL_CLAIM',
    blockerCode: 'INTERVIEW_FLAG_MEDICAL',
    headline: 'Medical claim mentioned',
    pattern: /\b(diagnosed|medical condition|hospitalized|treatment|prescribed|health issue|injury claim)\b/i,
  },
  {
    flagType: 'LEGAL_EXPOSURE',
    blockerCode: 'INTERVIEW_FLAG_LEGAL',
    headline: 'Legal exposure mentioned',
    pattern: /\b(lawsuit|sue|attorney|lawyer|court case|restraining order|legal action)\b/i,
  },
  {
    flagType: 'DOXXING_RISK',
    blockerCode: 'INTERVIEW_FLAG_DOXXING',
    headline: 'Possible private-address disclosure',
    pattern: /\b\d{2,5}\s+[A-Za-z0-9.\-'\s]+(?:street|st\.|avenue|ave\.|road|rd\.|drive|dr\.|lane|ln\.|court|ct\.)\b/i,
  },
  {
    flagType: 'ANONYMITY_REQUEST',
    blockerCode: 'INTERVIEW_FLAG_ANONYMITY',
    headline: 'Anonymity request mentioned',
    pattern: /\b(off the record|anonymous|do not use my name|keep my name out|not for attribution)\b/i,
  },
];

export function buildInterviewSafetyFlags(params: {
  turns: Array<{ answerText: string | null | undefined }>;
  intervieweeName: string;
}) {
  const combinedText = params.turns
    .map((turn) => turn.answerText?.trim())
    .filter(Boolean)
    .join('\n\n');

  if (!combinedText) {
    return [];
  }

  const flags: InterviewSafetyFlagSeed[] = [];

  SAFETY_PATTERNS.forEach((candidate) => {
    const match = combinedText.match(candidate.pattern);
    if (!match) {
      return;
    }

    const evidence = match[0];
    flags.push({
      flagType: candidate.flagType,
      headline: candidate.headline,
      detail: `${params.intervieweeName} mentioned content that may require editorial review before use.`,
      evidenceSpan: evidence,
      blockerCode: candidate.blockerCode,
      blockerMessage: `${candidate.headline} in interview with ${params.intervieweeName}: "${evidence}"`,
      sortOrder: flags.length,
    });
  });

  return flags;
}
