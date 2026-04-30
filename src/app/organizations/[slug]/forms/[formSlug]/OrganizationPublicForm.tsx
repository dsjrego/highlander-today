'use client';

import { FormEvent, useState } from 'react';

type Question = {
  id: string;
  prompt: string;
  helpText: string | null;
  type: 'TEXT_SHORT' | 'TEXT_LONG' | 'SINGLE_CHOICE' | 'MULTIPLE_CHOICE';
  isRequired: boolean;
  options: {
    id: string;
    label: string;
  }[];
};

interface OrganizationPublicFormProps {
  actionUrl: string;
  allowsAnonymousResponses: boolean;
  questions: Question[];
}

export default function OrganizationPublicForm({ actionUrl, allowsAnonymousResponses, questions }: OrganizationPublicFormProps) {
  const [answers, setAnswers] = useState<Record<string, string | string[]>>({});
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  function setTextAnswer(questionId: string, value: string) {
    setAnswers((current) => ({ ...current, [questionId]: value }));
  }

  function setSingleChoiceAnswer(questionId: string, value: string) {
    setAnswers((current) => ({ ...current, [questionId]: value }));
  }

  function toggleMultiChoiceAnswer(questionId: string, optionId: string, checked: boolean) {
    setAnswers((current) => {
      const existing = Array.isArray(current[questionId]) ? current[questionId] : [];
      const next = checked ? [...existing, optionId] : existing.filter((entry) => entry !== optionId);
      return { ...current, [questionId]: next };
    });
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setSuccess('');
    setIsSubmitting(true);

    try {
      const response = await fetch(actionUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ answers }),
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to submit form');
      }

      setSuccess('Form submitted.');
    } catch (submissionError) {
      setError(submissionError instanceof Error ? submissionError.message : 'Failed to submit form');
    } finally {
      setIsSubmitting(false);
    }
  }

  if (success) {
    return (
      <section className="rounded-[28px] border border-emerald-200 bg-emerald-50 p-6">
        <h2 className="text-xl font-bold text-emerald-950">Submission received</h2>
        <p className="mt-2 text-sm leading-6 text-emerald-900">
          {allowsAnonymousResponses
            ? 'Your answers have been saved.'
            : 'Your answers have been saved. This form allows one submission per signed-in user.'}
        </p>
      </section>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {questions.map((question, index) => (
        <div key={question.id} className="rounded-2xl border border-slate-200 bg-slate-50/60 p-4">
          <div className="flex flex-wrap items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
            <span>Question {index + 1}</span>
            <span>{question.isRequired ? 'Required' : 'Optional'}</span>
          </div>
          <h3 className="mt-2 text-base font-semibold text-slate-950">{question.prompt}</h3>
          {question.helpText ? <p className="mt-1 text-sm text-slate-600">{question.helpText}</p> : null}

          {(question.type === 'TEXT_SHORT' || question.type === 'TEXT_LONG') ? (
            question.type === 'TEXT_LONG' ? (
              <textarea
                value={typeof answers[question.id] === 'string' ? answers[question.id] : ''}
                onChange={(event) => setTextAnswer(question.id, event.target.value)}
                className="mt-3 form-textarea border-slate-300 bg-white text-slate-950"
                rows={5}
              />
            ) : (
              <input
                type="text"
                value={typeof answers[question.id] === 'string' ? answers[question.id] : ''}
                onChange={(event) => setTextAnswer(question.id, event.target.value)}
                className="mt-3 form-input"
              />
            )
          ) : null}

          {question.type === 'SINGLE_CHOICE' ? (
            <div className="mt-3 space-y-2">
              {question.options.map((option) => (
                <label key={option.id} className="flex items-start gap-3 rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm text-slate-700">
                  <input
                    type="radio"
                    name={question.id}
                    checked={answers[question.id] === option.id}
                    onChange={() => setSingleChoiceAnswer(question.id, option.id)}
                    className="mt-0.5 h-4 w-4 border-slate-300 text-slate-950 focus:ring-slate-300"
                  />
                  <span>{option.label}</span>
                </label>
              ))}
            </div>
          ) : null}

          {question.type === 'MULTIPLE_CHOICE' ? (
            <div className="mt-3 space-y-2">
              {question.options.map((option) => {
                const selectedValues = Array.isArray(answers[question.id]) ? answers[question.id] : [];

                return (
                  <label key={option.id} className="flex items-start gap-3 rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm text-slate-700">
                    <input
                      type="checkbox"
                      checked={selectedValues.includes(option.id)}
                      onChange={(event) => toggleMultiChoiceAnswer(question.id, option.id, event.target.checked)}
                      className="mt-0.5 h-4 w-4 rounded border-slate-300 text-slate-950 focus:ring-slate-300"
                    />
                    <span>{option.label}</span>
                  </label>
                );
              })}
            </div>
          ) : null}
        </div>
      ))}

      {error ? <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">{error}</div> : null}

      <button
        type="submit"
        disabled={isSubmitting}
        className="inline-flex items-center rounded-full bg-slate-950 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isSubmitting ? 'Submitting...' : 'Submit Form'}
      </button>
    </form>
  );
}
