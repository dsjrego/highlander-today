'use client';

import { useCallback, useEffect, useState } from 'react';
import { REPORTER_SUPPORTED_LANGUAGE_OPTIONS } from '@/lib/reporter/interview';

interface InterviewSessionClientProps {
  interviewId: string;
  interviewTitle: string;
  intervieweeName: string;
  purpose: string;
  suggestedLanguage: string;
  nativeLanguage: string | null;
}

interface SessionPayload {
  session: {
    id: string;
    status: string;
    language: string;
    turns: Array<{
      id: string;
      sortOrder: number;
      questionText: string;
      answerText: string | null;
    }>;
    transcriptText?: string | null;
    englishSummary?: string | null;
  } | null;
  currentQuestion: {
    key: string | null;
    text: string;
    language: string;
  } | null;
  answeredCount: number;
  questionCount: number;
  isComplete: boolean;
}

export default function InterviewSessionClient({
  interviewId,
  interviewTitle,
  intervieweeName,
  purpose,
  suggestedLanguage,
  nativeLanguage,
}: InterviewSessionClientProps) {
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [answerText, setAnswerText] = useState('');
  const [sessionState, setSessionState] = useState<SessionPayload | null>(null);
  const [selectedLanguage, setSelectedLanguage] = useState(
    nativeLanguage || suggestedLanguage || 'ENGLISH'
  );

  const loadSession = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const response = await fetch(`/api/reporter/interviews/${interviewId}/session`, {
        cache: 'no-store',
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data.error || 'Failed to load interview session');
      }
      setSessionState(data);
    } catch (sessionError) {
      setError(
        sessionError instanceof Error
          ? sessionError.message
          : 'Failed to load interview session'
      );
    } finally {
      setLoading(false);
    }
  }, [interviewId]);

  useEffect(() => {
    void loadSession();
  }, [loadSession]);

  async function handleStart() {
    setStarting(true);
    setError('');
    try {
      const response = await fetch(`/api/reporter/interviews/${interviewId}/session`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ language: selectedLanguage }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data.error || 'Failed to start interview');
      }
      setSessionState(data);
    } catch (startError) {
      setError(startError instanceof Error ? startError.message : 'Failed to start interview');
    } finally {
      setStarting(false);
    }
  }

  async function handleSubmitAnswer(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError('');
    try {
      const response = await fetch(
        `/api/reporter/interviews/${interviewId}/session/answer`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ answerText }),
        }
      );
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data.error || 'Failed to submit answer');
      }
      setSessionState(data);
      setAnswerText('');
    } catch (submitError) {
      setError(
        submitError instanceof Error ? submitError.message : 'Failed to submit answer'
      );
    } finally {
      setSubmitting(false);
    }
  }

  const hasSession = Boolean(sessionState?.session);
  const canAnswer = Boolean(sessionState?.currentQuestion) && !sessionState?.isComplete;
  const submitLabel =
    submitting
      ? 'Saving...'
      : 'Save Response';

  return (
    <div className="space-y-6">
      <section className="overflow-hidden rounded-[32px] border border-white/10 bg-[linear-gradient(145deg,rgba(10,32,51,0.96),rgba(18,67,107,0.92))] px-6 py-8 text-white shadow-[0_28px_70px_rgba(7,17,26,0.2)]">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-cyan-100/74">
          Interview Session
        </p>
        <h1 className="mt-3 text-3xl font-black tracking-[-0.05em]">
          {interviewTitle}
        </h1>
        <p className="mt-4 max-w-3xl text-sm leading-7 text-white/78">
          This interview is for {intervieweeName}. The reporter agent will ask one question at a time, adapt to your answers, and preserve your responses for newsroom review.
        </p>
        <p className="mt-3 max-w-3xl text-sm leading-7 text-white/78">
          Please go into as much detail as possible. The more concrete detail you can share about what happened, what you saw, who was involved, and what remains uncertain, the more useful this interview will be for reporting.
        </p>
        <div className="mt-5 flex flex-wrap gap-3 text-xs font-semibold uppercase tracking-[0.14em] text-white/64">
          <span>Suggested language {suggestedLanguage}</span>
          {sessionState?.session?.language ? (
            <span>Interview language {sessionState.session.language}</span>
          ) : null}
          {sessionState ? (
            <span>
              {sessionState.answeredCount} of {sessionState.questionCount} answered
            </span>
          ) : null}
        </div>
      </section>

      <section className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-[0_18px_42px_rgba(15,23,42,0.08)]">
        <h2 className="text-lg font-bold text-slate-950">Before you begin</h2>
        <p className="mt-3 text-sm leading-7 text-slate-600">{purpose}</p>
        <p className="mt-3 text-sm leading-7 text-slate-600">
          Answer as clearly as you can. Separate what you personally know from what you were told by others, and include names, dates, and locations when you have them.
        </p>
        <p className="mt-3 text-sm leading-7 text-slate-600">
          Please give detailed answers rather than short replies. Include chronology, descriptions, people, places, records, and anything else that could help a reporter understand or verify your account.
        </p>
        {!hasSession ? (
          <label className="mt-5 block">
            <span className="mb-2 block text-sm font-semibold text-slate-900">
              Confirm interview language
            </span>
            <select
              className="w-full rounded-[18px] border border-slate-300 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-900"
              value={selectedLanguage}
              onChange={(event) => setSelectedLanguage(event.target.value)}
              disabled={starting}
            >
              {REPORTER_SUPPORTED_LANGUAGE_OPTIONS.map((language) => (
                <option key={language} value={language}>
                  {language}
                </option>
              ))}
            </select>
            <p className="mt-2 text-xs leading-6 text-slate-500">
              Suggested by staff: {suggestedLanguage}
              {nativeLanguage ? ` • Native language on file: ${nativeLanguage}` : ''}
            </p>
          </label>
        ) : null}
      </section>

      {error ? (
        <section className="rounded-[24px] border border-rose-200 bg-rose-50 px-5 py-4 text-sm text-rose-900">
          {error}
        </section>
      ) : null}

      {loading ? (
        <section className="rounded-[24px] border border-slate-200 bg-white px-5 py-4 text-sm text-slate-600">
          Loading interview session...
        </section>
      ) : !hasSession ? (
        <section className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-[0_18px_42px_rgba(15,23,42,0.08)]">
          <h2 className="text-lg font-bold text-slate-950">Ready to begin</h2>
          <p className="mt-3 text-sm leading-7 text-slate-600">
            When you start, the interview will open in this browser and ask one adaptive follow-up at a time.
          </p>
          <button
            type="button"
            className="mt-5 inline-flex rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
            onClick={handleStart}
            disabled={starting}
          >
            {starting ? 'Starting...' : 'Start Interview'}
          </button>
        </section>
      ) : sessionState?.isComplete ? (
        <section className="space-y-4 rounded-[28px] border border-emerald-200 bg-emerald-50 p-6">
          <div>
            <h2 className="text-xl font-bold text-emerald-950">Interview complete</h2>
            <p className="mt-2 text-sm leading-7 text-emerald-900">
              Your responses have been saved for internal newsroom review.
            </p>
          </div>
          {sessionState.session?.englishSummary ? (
            <div className="rounded-[22px] border border-emerald-200 bg-white px-4 py-4 text-sm leading-7 text-slate-700">
              {sessionState.session.englishSummary}
            </div>
          ) : null}
        </section>
      ) : (
        <section className="space-y-5 rounded-[28px] border border-slate-200 bg-white p-6 shadow-[0_18px_42px_rgba(15,23,42,0.08)]">
          {sessionState?.currentQuestion ? (
            <div className="rounded-[24px] border border-sky-200 bg-sky-50 px-5 py-5">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-sky-800">
                Question {sessionState.answeredCount + 1} of {sessionState.questionCount}
              </p>
              <h2 className="mt-3 text-xl font-bold text-slate-950">
                {sessionState.currentQuestion.text}
              </h2>
            </div>
          ) : null}

          <form className="space-y-4" onSubmit={handleSubmitAnswer}>
            <label className="block">
              <span className="mb-2 block text-sm font-semibold text-slate-800">
                Your answer
              </span>
              <textarea
                className="min-h-[200px] w-full rounded-[22px] border border-slate-300 px-4 py-4 text-sm leading-7 text-slate-900 outline-none transition focus:border-slate-900"
                value={answerText}
                onChange={(event) => setAnswerText(event.target.value)}
                disabled={!canAnswer || submitting}
                placeholder="Answer in as much detail as possible. Include names, dates, places, timeline, what you personally know, what others told you, and anything a reporter should verify."
              />
            </label>
            <div className="flex justify-end">
              <button
                type="submit"
                className="inline-flex rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                disabled={!canAnswer || submitting || !answerText.trim()}
              >
                {submitLabel}
              </button>
            </div>
          </form>
        </section>
      )}
    </div>
  );
}
