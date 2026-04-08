'use client';

import Link from 'next/link';
import { FormEvent, Fragment, useEffect, useMemo, useState } from 'react';
import { ExternalLink, ListChecks, Plus, Save, Trash2 } from 'lucide-react';
import { CrudActionButton } from '@/components/shared/CrudAction';
import type { TrustLevelValue } from '@/lib/trust-access';
import {
  formatOrganizationFormQuestionTypeLabel,
  formatOrganizationFormStatusLabel,
  ORGANIZATION_FORM_MINIMUM_TRUST_OPTIONS,
  ORGANIZATION_FORM_QUESTION_TYPE_OPTIONS,
  ORGANIZATION_FORM_STATUS_OPTIONS,
  type OrganizationFormMinimumTrustLevel,
  type OrganizationFormQuestionType,
  type OrganizationFormStatus,
} from '@/lib/organization-forms';

interface FormOptionRecord {
  id: string;
  label: string;
  value: string;
  sortOrder: number;
}

interface FormQuestionRecord {
  id: string;
  prompt: string;
  helpText: string | null;
  type: OrganizationFormQuestionType;
  isRequired: boolean;
  sortOrder: number;
  options: FormOptionRecord[];
}

interface OrganizationFormRecord {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  status: OrganizationFormStatus;
  isPubliclyListed: boolean;
  minimumTrustLevel: TrustLevelValue;
  opensAt: string | Date | null;
  closesAt: string | Date | null;
  publishedAt: string | Date | null;
  closedAt: string | Date | null;
  createdAt: string | Date;
  updatedAt: string | Date;
  _count: {
    questions: number;
    submissions: number;
  };
  questions: FormQuestionRecord[];
  submissions: {
    id: string;
    submittedAt: string | Date;
    user: {
      id: string;
      firstName: string;
      lastName: string;
      email: string;
    };
    answers: {
      id: string;
      questionId: string;
      selectedOptionId: string | null;
      textValue: string | null;
    }[];
  }[];
}

interface OrganizationFormsManagerProps {
  organizationId: string;
  organizationSlug: string;
  forms: OrganizationFormRecord[];
}

const ORGANIZATION_FORM_SUBTABS = ['forms', 'create'] as const;
type OrganizationFormSubtab = (typeof ORGANIZATION_FORM_SUBTABS)[number];

interface OrganizationFormState {
  title: string;
  description: string;
  status: OrganizationFormStatus;
  isPubliclyListed: boolean;
  minimumTrustLevel: OrganizationFormMinimumTrustLevel;
  opensAt: string;
  closesAt: string;
}

interface OrganizationFormQuestionState {
  prompt: string;
  helpText: string;
  type: OrganizationFormQuestionType;
  isRequired: boolean;
  sortOrder: string;
  optionsText: string;
}

const ORGANIZATION_FORM_CARD_TABS = ['edit', 'questions', 'results', 'create-question'] as const;
type OrganizationFormCardTab = (typeof ORGANIZATION_FORM_CARD_TABS)[number];

function formatDateTimeForInput(value: string | Date | null) {
  if (!value) {
    return '';
  }

  const date = new Date(value);
  const offset = date.getTimezoneOffset();
  const normalized = new Date(date.getTime() - offset * 60_000);
  return normalized.toISOString().slice(0, 16);
}

function formatDisplayDate(value: string | Date | null) {
  if (!value) {
    return 'Not set';
  }

  return new Date(value).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function buildFormState(form?: OrganizationFormRecord): OrganizationFormState {
  return {
    title: form?.title || '',
    description: form?.description || '',
    status: form?.status || 'DRAFT',
    isPubliclyListed: form?.isPubliclyListed ?? false,
    minimumTrustLevel: form?.minimumTrustLevel === 'TRUSTED' ? 'TRUSTED' : 'REGISTERED',
    opensAt: formatDateTimeForInput(form?.opensAt || null),
    closesAt: formatDateTimeForInput(form?.closesAt || null),
  };
}

function buildQuestionState(question?: FormQuestionRecord): OrganizationFormQuestionState {
  return {
    prompt: question?.prompt || '',
    helpText: question?.helpText || '',
    type: question?.type || 'TEXT_SHORT',
    isRequired: question?.isRequired ?? false,
    sortOrder: String(question?.sortOrder ?? 0),
    optionsText: question?.options.map((option) => option.label).join('\n') || '',
  };
}

function normalizeDateTimeValue(value: string) {
  if (!value.trim()) {
    return '';
  }

  return new Date(value).toISOString();
}

function normalizeOptions(optionsText: string) {
  return optionsText
    .split('\n')
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function stripHtml(value: string | null) {
  if (!value) {
    return '';
  }

  return value.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

function formatUserName(firstName: string, lastName: string) {
  const fullName = [lastName, firstName].filter(Boolean).join(', ');
  return fullName || 'Unnamed user';
}

function formatResponseValue(question: FormQuestionRecord, answers: OrganizationFormRecord['submissions'][number]['answers']) {
  if (question.type === 'TEXT_SHORT' || question.type === 'TEXT_LONG') {
    const textValues = answers
      .map((answer) => answer.textValue?.trim())
      .filter((value): value is string => Boolean(value));

    return textValues.length > 0 ? textValues.join(' | ') : 'No answer';
  }

  const selectedLabels = answers
    .map((answer) => question.options.find((option) => option.id === answer.selectedOptionId)?.label)
    .filter((value): value is string => Boolean(value));

  return selectedLabels.length > 0 ? selectedLabels.join(', ') : 'No answer';
}

function FormQuestionEditor({
  organizationId,
  formId,
  question,
  onUpdate,
  onDelete,
}: {
  organizationId: string;
  formId: string;
  question: FormQuestionRecord;
  onUpdate: (question: FormQuestionRecord) => void;
  onDelete: (questionId: string) => void;
}) {
  const [formState, setFormState] = useState<OrganizationFormQuestionState>(() => buildQuestionState(question));
  const [error, setError] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const requiresOptions = formState.type === 'SINGLE_CHOICE' || formState.type === 'MULTIPLE_CHOICE';

  async function handleSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setIsSaving(true);

    try {
      const response = await fetch(`/api/admin/organizations/${organizationId}/forms/${formId}/questions/${question.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: formState.prompt,
          helpText: formState.helpText,
          type: formState.type,
          isRequired: formState.isRequired,
          sortOrder: Number(formState.sortOrder || 0),
          options: requiresOptions ? normalizeOptions(formState.optionsText) : [],
        }),
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update question');
      }

      onUpdate(data.question);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to update question');
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDelete() {
    setError('');
    setIsDeleting(true);

    try {
      const response = await fetch(`/api/admin/organizations/${organizationId}/forms/${formId}/questions/${question.id}`, {
        method: 'DELETE',
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to delete question');
      }

      onDelete(question.id);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to delete question');
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <form onSubmit={handleSave} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
      <div className="grid gap-3 lg:grid-cols-2">
        <div className="lg:col-span-2">
          <label className="form-label text-slate-500">Prompt</label>
          <input
            value={formState.prompt}
            onChange={(event) => setFormState((current) => ({ ...current, prompt: event.target.value }))}
            className="form-input"
          />
        </div>
        <div>
          <label className="form-label text-slate-500">Type</label>
          <select
            value={formState.type}
            onChange={(event) =>
              setFormState((current) => ({
                ...current,
                type: event.target.value as OrganizationFormQuestionType,
              }))
            }
            className="form-input"
          >
            {ORGANIZATION_FORM_QUESTION_TYPE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="form-label text-slate-500">Sort Order</label>
          <input
            value={formState.sortOrder}
            onChange={(event) => setFormState((current) => ({ ...current, sortOrder: event.target.value }))}
            className="form-input"
          />
        </div>
        <div className="lg:col-span-2">
          <label className="form-label text-slate-500">Help Text</label>
          <textarea
            value={formState.helpText}
            onChange={(event) => setFormState((current) => ({ ...current, helpText: event.target.value }))}
            className="form-input min-h-[96px]"
          />
        </div>
        {requiresOptions ? (
          <div className="lg:col-span-2">
            <label className="form-label text-slate-500">Options</label>
            <textarea
              value={formState.optionsText}
              onChange={(event) => setFormState((current) => ({ ...current, optionsText: event.target.value }))}
              className="form-input min-h-[120px]"
              placeholder={'One option per line'}
            />
          </div>
        ) : null}
        <label className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3">
          <input
            type="checkbox"
            checked={formState.isRequired}
            onChange={(event) => setFormState((current) => ({ ...current, isRequired: event.target.checked }))}
            className="h-4 w-4 rounded border-slate-300 text-slate-950 focus:ring-slate-300"
          />
          <span className="text-sm font-medium text-slate-700">Required question</span>
        </label>
      </div>

      {error ? <p className="mt-3 text-sm font-medium text-rose-600">{error}</p> : null}

      <div className="mt-4 flex flex-wrap gap-3">
        <CrudActionButton type="submit" variant="primary" icon={Save} label="Save question" disabled={isSaving}>
          {isSaving ? 'Saving...' : 'Save Question'}
        </CrudActionButton>
        <CrudActionButton type="button" variant="danger" icon={Trash2} label="Delete question" onClick={handleDelete} disabled={isDeleting}>
          {isDeleting ? 'Deleting...' : 'Delete Question'}
        </CrudActionButton>
      </div>
    </form>
  );
}

function OrganizationFormCard({
  organizationId,
  organizationSlug,
  form,
  onUpdate,
  onDelete,
}: {
  organizationId: string;
  organizationSlug: string;
  form: OrganizationFormRecord;
  onUpdate: (form: OrganizationFormRecord) => void;
  onDelete: (formId: string) => void;
}) {
  const [formState, setFormState] = useState<OrganizationFormState>(() => buildFormState(form));
  const [questionState, setQuestionState] = useState<OrganizationFormQuestionState>(() => buildQuestionState());
  const [activeTab, setActiveTab] = useState<OrganizationFormCardTab>('edit');
  const [expandedQuestionId, setExpandedQuestionId] = useState<string | null>(null);
  const [origin, setOrigin] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isCreatingQuestion, setIsCreatingQuestion] = useState(false);
  const previewPath = `/organizations/${organizationSlug}/forms/${form.slug}`;
  const shareUrl = origin ? new URL(previewPath, origin).toString() : previewPath;
  const requiresQuestionOptions = questionState.type === 'SINGLE_CHOICE' || questionState.type === 'MULTIPLE_CHOICE';
  const sortedQuestions = useMemo(
    () => [...form.questions].sort((a, b) => (a.sortOrder === b.sortOrder ? a.prompt.localeCompare(b.prompt) : a.sortOrder - b.sortOrder)),
    [form.questions]
  );
  const sortedSubmissions = useMemo(
    () => [...form.submissions].sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime()),
    [form.submissions]
  );

  useEffect(() => {
    setOrigin(window.location.origin);
  }, []);

  async function handleSaveForm(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setSuccess('');
    setIsSaving(true);

    try {
      const response = await fetch(`/api/admin/organizations/${organizationId}/forms/${form.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: formState.title,
          description: formState.description,
          status: formState.status,
          isPubliclyListed: formState.isPubliclyListed,
          minimumTrustLevel: formState.minimumTrustLevel,
          opensAt: normalizeDateTimeValue(formState.opensAt),
          closesAt: normalizeDateTimeValue(formState.closesAt),
        }),
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to save form');
      }

      onUpdate(data.form);
      setSuccess('Form updated.');
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to save form');
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDeleteForm() {
    setError('');
    setSuccess('');
    setIsDeleting(true);

    try {
      const response = await fetch(`/api/admin/organizations/${organizationId}/forms/${form.id}`, {
        method: 'DELETE',
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to delete form');
      }

      onDelete(form.id);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to delete form');
    } finally {
      setIsDeleting(false);
    }
  }

  async function handleCreateQuestion(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setSuccess('');
    setIsCreatingQuestion(true);

    try {
      const response = await fetch(`/api/admin/organizations/${organizationId}/forms/${form.id}/questions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: questionState.prompt,
          helpText: questionState.helpText,
          type: questionState.type,
          isRequired: questionState.isRequired,
          sortOrder: Number(questionState.sortOrder || 0),
          options: requiresQuestionOptions ? normalizeOptions(questionState.optionsText) : [],
        }),
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to add question');
      }

      onUpdate({
        ...form,
        questions: [...form.questions, data.question].sort((a, b) => a.sortOrder - b.sortOrder),
        _count: {
          ...form._count,
          questions: form._count.questions + 1,
        },
      });
      setExpandedQuestionId(data.question.id);
      setQuestionState(buildQuestionState());
      setSuccess('Question added.');
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to add question');
    } finally {
      setIsCreatingQuestion(false);
    }
  }

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-lg font-bold text-slate-950">{form.title}</h3>
            <span className="rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
              {formatOrganizationFormStatusLabel(form.status)}
            </span>
            <span className="rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
              {form._count.questions} questions
            </span>
            <span className="rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
              {form._count.submissions} responses
            </span>
          </div>
          <p className="text-sm text-slate-600">
            {stripHtml(form.description) || 'No description yet.'}
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <CrudActionButton type="button" variant="secondary" icon={ExternalLink} label="Copy share URL" onClick={() => navigator.clipboard.writeText(origin ? shareUrl : previewPath)}>
            Copy URL
          </CrudActionButton>
          <CrudActionButton type="button" variant="danger" icon={Trash2} label="Delete form" onClick={handleDeleteForm} disabled={isDeleting}>
            {isDeleting ? 'Deleting...' : 'Delete Form'}
          </CrudActionButton>
        </div>
      </div>

      <div className="relative top-[2px] mt-5 flex flex-wrap gap-0 pb-0 pl-2">
        {ORGANIZATION_FORM_CARD_TABS.map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => setActiveTab(tab)}
            className={`admin-card-tab scale-[0.95] ${activeTab === tab ? 'admin-card-tab-active' : 'admin-card-tab-inactive'}`}
          >
            {tab === 'edit' ? 'Details' : tab === 'questions' ? 'Questions' : tab === 'results' ? 'Results' : (
              <span className="inline-flex items-center gap-2">
                <Plus className="h-4 w-4" />
                <span>Question</span>
              </span>
            )}
          </button>
        ))}
      </div>

      <div className="rounded-2xl border border-slate-200 bg-slate-50/40 p-4">
        {activeTab === 'edit' ? (
          <form onSubmit={handleSaveForm}>
            <div className="grid gap-4 lg:grid-cols-2">
              <div>
                <label className="form-label text-slate-500">Title</label>
                <input
                  value={formState.title}
                  onChange={(event) => setFormState((current) => ({ ...current, title: event.target.value }))}
                  className="form-input"
                />
              </div>
              <div>
                <label className="form-label text-slate-500">Status</label>
                <select
                  value={formState.status}
                  onChange={(event) =>
                    setFormState((current) => ({
                      ...current,
                      status: event.target.value as OrganizationFormStatus,
                    }))
                  }
                  className="form-input"
                >
                  {ORGANIZATION_FORM_STATUS_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="form-label text-slate-500">Minimum Access</label>
                <select
                  value={formState.minimumTrustLevel}
                  onChange={(event) =>
                    setFormState((current) => ({
                      ...current,
                      minimumTrustLevel: event.target.value as OrganizationFormMinimumTrustLevel,
                    }))
                  }
                  className="form-input"
                >
                  {ORGANIZATION_FORM_MINIMUM_TRUST_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="form-label text-slate-500">Open At</label>
                <input
                  type="datetime-local"
                  value={formState.opensAt}
                  onChange={(event) => setFormState((current) => ({ ...current, opensAt: event.target.value }))}
                  className="form-input"
                />
              </div>
              <div>
                <label className="form-label text-slate-500">Close At</label>
                <input
                  type="datetime-local"
                  value={formState.closesAt}
                  onChange={(event) => setFormState((current) => ({ ...current, closesAt: event.target.value }))}
                  className="form-input"
                />
              </div>
              <label className="flex items-center gap-3 rounded-xl border border-slate-200 px-4 py-3">
                <input
                  type="checkbox"
                  checked={formState.isPubliclyListed}
                  onChange={(event) => setFormState((current) => ({ ...current, isPubliclyListed: event.target.checked }))}
                  className="h-4 w-4 rounded border-slate-300 text-slate-950 focus:ring-slate-300"
                />
                <span className="text-sm font-medium text-slate-700">Show on the public organization page</span>
              </label>
              <div className="lg:col-span-2">
                <label className="form-label text-slate-500">Description</label>
                <textarea
                  value={formState.description}
                  onChange={(event) => setFormState((current) => ({ ...current, description: event.target.value }))}
                  className="form-input min-h-[120px]"
                />
              </div>
            </div>

            <div className="mt-4">
              <CrudActionButton type="submit" variant="primary" icon={Save} label="Save form" disabled={isSaving}>
                {isSaving ? 'Saving...' : 'Save Form'}
              </CrudActionButton>
            </div>
          </form>
        ) : activeTab === 'questions' ? (
          <div>
            <div className="flex items-center gap-3">
              <div className="rounded-full border border-slate-200 p-2 text-slate-600">
                <ListChecks className="h-4 w-4" />
              </div>
              <div>
                <h4 className="text-sm font-bold uppercase tracking-[0.16em] text-slate-500">Questions</h4>
                <p className="text-sm text-slate-600">Question ordering is manual for now through `Sort Order` fields.</p>
              </div>
            </div>

            <div className="admin-list mt-4">
              {sortedQuestions.length ? (
                <div className="admin-list-table-wrap">
                  <table className="admin-list-table">
                    <thead className="admin-list-head">
                      <tr>
                        <th className="admin-list-header-cell">Question</th>
                        <th className="admin-list-header-cell">Type</th>
                        <th className="admin-list-header-cell">Required</th>
                        <th className="admin-list-header-cell">Sort</th>
                        <th className="admin-list-header-cell">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sortedQuestions.map((question) => {
                        const isExpanded = expandedQuestionId === question.id;

                        return (
                          <Fragment key={question.id}>
                            <tr className="admin-list-row">
                              <td className="admin-list-cell">
                                <button
                                  type="button"
                                  onClick={() => setExpandedQuestionId(isExpanded ? null : question.id)}
                                  className="admin-list-link text-left"
                                >
                                  {question.prompt}
                                </button>
                              </td>
                              <td className="admin-list-cell">{formatOrganizationFormQuestionTypeLabel(question.type)}</td>
                              <td className="admin-list-cell">{question.isRequired ? 'Required' : 'Optional'}</td>
                              <td className="admin-list-cell">{question.sortOrder}</td>
                              <td className="admin-list-cell">
                                <CrudActionButton
                                  type="button"
                                  variant="inline"
                                  icon={ListChecks}
                                  label={isExpanded ? 'Close question' : 'Manage question'}
                                  onClick={() => setExpandedQuestionId(isExpanded ? null : question.id)}
                                >
                                  {isExpanded ? 'Close' : 'Manage'}
                                </CrudActionButton>
                              </td>
                            </tr>

                            {isExpanded ? (
                              <tr className="admin-list-row bg-slate-50">
                                <td className="admin-list-cell" colSpan={5}>
                                  <FormQuestionEditor
                                    organizationId={organizationId}
                                    formId={form.id}
                                    question={question}
                                    onUpdate={(nextQuestion) =>
                                      onUpdate({
                                        ...form,
                                        questions: form.questions.map((entry) => (entry.id === nextQuestion.id ? nextQuestion : entry)),
                                      })
                                    }
                                    onDelete={(questionId) => {
                                      onUpdate({
                                        ...form,
                                        questions: form.questions.filter((entry) => entry.id !== questionId),
                                        _count: {
                                          ...form._count,
                                          questions: Math.max(0, form._count.questions - 1),
                                        },
                                      });
                                      setExpandedQuestionId((current) => (current === questionId ? null : current));
                                    }}
                                  />
                                </td>
                              </tr>
                            ) : null}
                          </Fragment>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="rounded-2xl border border-dashed border-slate-300 px-4 py-6 text-sm text-slate-500">
                  No questions yet. Start with `+ Question`.
                </div>
              )}
            </div>
          </div>
        ) : activeTab === 'results' ? (
          <div className="space-y-5">
            <div className="grid gap-3 md:grid-cols-3">
              <div className="rounded-2xl border border-slate-200 bg-white p-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">Responses</p>
                <p className="mt-2 text-2xl font-bold text-slate-950">{form._count.submissions}</p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-white p-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">Questions</p>
                <p className="mt-2 text-2xl font-bold text-slate-950">{form._count.questions}</p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-white p-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">Latest Response</p>
                <p className="mt-2 text-sm font-semibold text-slate-950">
                  {sortedSubmissions[0] ? formatDisplayDate(sortedSubmissions[0].submittedAt) : 'No responses yet'}
                </p>
              </div>
            </div>

            {sortedQuestions.length > 0 ? (
              <div className="space-y-4">
                {sortedQuestions.map((question, index) => {
                  const answeredSubmissions = sortedSubmissions.filter((submission) =>
                    submission.answers.some((answer) => answer.questionId === question.id)
                  );

                  return (
                    <section key={question.id} className="rounded-2xl border border-slate-200 bg-white p-4">
                      <div className="flex flex-wrap items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                        <span>Question {index + 1}</span>
                        <span>{question.isRequired ? 'Required' : 'Optional'}</span>
                        <span>{answeredSubmissions.length} answered</span>
                      </div>
                      <h4 className="mt-2 text-base font-semibold text-slate-950">{question.prompt}</h4>
                      {question.helpText ? <p className="mt-1 text-sm text-slate-600">{question.helpText}</p> : null}

                      <div className="mt-4 space-y-2">
                        {answeredSubmissions.length > 0 ? (
                          answeredSubmissions.map((submission) => (
                            <div key={`${question.id}-${submission.id}`} className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-3">
                              <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                                <span>{formatUserName(submission.user.firstName, submission.user.lastName)}</span>
                                <span>{formatDisplayDate(submission.submittedAt)}</span>
                              </div>
                              <p className="mt-2 text-sm text-slate-800">
                                {formatResponseValue(
                                  question,
                                  submission.answers.filter((answer) => answer.questionId === question.id)
                                )}
                              </p>
                            </div>
                          ))
                        ) : (
                          <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-3 py-4 text-sm text-slate-500">
                            No responses yet for this question.
                          </div>
                        )}
                      </div>
                    </section>
                  );
                })}
              </div>
            ) : (
              <div className="rounded-xl border border-dashed border-slate-300 bg-white px-4 py-6 text-sm text-slate-500">
                No questions have been added to this form yet.
              </div>
            )}
          </div>
        ) : (
          <form onSubmit={handleCreateQuestion} className="space-y-3 rounded-2xl border border-dashed border-slate-300 bg-white p-4">
            <h4 className="text-sm font-semibold uppercase tracking-[0.16em] text-slate-500">Add Question</h4>
            <div className="grid gap-3 lg:grid-cols-2">
              <div className="lg:col-span-2">
                <label className="form-label text-slate-500">Prompt</label>
                <input
                  value={questionState.prompt}
                  onChange={(event) => setQuestionState((current) => ({ ...current, prompt: event.target.value }))}
                  className="form-input"
                />
              </div>
              <div>
                <label className="form-label text-slate-500">Type</label>
                <select
                  value={questionState.type}
                  onChange={(event) =>
                    setQuestionState((current) => ({
                      ...current,
                      type: event.target.value as OrganizationFormQuestionType,
                    }))
                  }
                  className="form-input"
                >
                  {ORGANIZATION_FORM_QUESTION_TYPE_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="form-label text-slate-500">Sort Order</label>
                <input
                  value={questionState.sortOrder}
                  onChange={(event) => setQuestionState((current) => ({ ...current, sortOrder: event.target.value }))}
                  className="form-input"
                />
              </div>
              <div className="lg:col-span-2">
                <label className="form-label text-slate-500">Help Text</label>
                <textarea
                  value={questionState.helpText}
                  onChange={(event) => setQuestionState((current) => ({ ...current, helpText: event.target.value }))}
                  className="form-input min-h-[96px]"
                />
              </div>
              {requiresQuestionOptions ? (
                <div className="lg:col-span-2">
                  <label className="form-label text-slate-500">Options</label>
                  <textarea
                    value={questionState.optionsText}
                    onChange={(event) => setQuestionState((current) => ({ ...current, optionsText: event.target.value }))}
                    className="form-input min-h-[120px]"
                    placeholder={'One option per line'}
                  />
                </div>
              ) : null}
              <label className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3">
                <input
                  type="checkbox"
                  checked={questionState.isRequired}
                  onChange={(event) => setQuestionState((current) => ({ ...current, isRequired: event.target.checked }))}
                  className="h-4 w-4 rounded border-slate-300 text-slate-950 focus:ring-slate-300"
                />
                <span className="text-sm font-medium text-slate-700">Required question</span>
              </label>
            </div>

            <CrudActionButton type="submit" variant="primary" icon={Plus} label="Add question" disabled={isCreatingQuestion}>
              {isCreatingQuestion ? 'Adding...' : 'Add Question'}
            </CrudActionButton>
          </form>
        )}
      </div>

      {error ? <p className="mt-4 text-sm font-medium text-rose-600">{error}</p> : null}
      {success ? <p className="mt-4 text-sm font-medium text-emerald-600">{success}</p> : null}
    </section>
  );
}

export default function OrganizationFormsManager({
  organizationId,
  organizationSlug,
  forms: initialForms,
}: OrganizationFormsManagerProps) {
  const [forms, setForms] = useState(initialForms);
  const [activeSubtab, setActiveSubtab] = useState<OrganizationFormSubtab>('forms');
  const [createState, setCreateState] = useState<OrganizationFormState>(() => buildFormState());
  const [expandedFormId, setExpandedFormId] = useState<string | null>(null);
  const [filterValue, setFilterValue] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const normalizedFilter = filterValue.trim().toLowerCase();
  const filteredForms = useMemo(() => {
    const sortedForms = [...forms].sort((a, b) => a.title.localeCompare(b.title));

    if (!normalizedFilter) {
      return sortedForms;
    }

    return sortedForms.filter((form) => {
      const descriptionText = stripHtml(form.description).toLowerCase();
      return (
        form.title.toLowerCase().includes(normalizedFilter) ||
        form.slug.toLowerCase().includes(normalizedFilter) ||
        descriptionText.includes(normalizedFilter)
      );
    });
  }, [forms, normalizedFilter]);

  async function handleCreateForm(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setSuccess('');
    setIsCreating(true);

    try {
      const response = await fetch(`/api/admin/organizations/${organizationId}/forms`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: createState.title,
          description: createState.description,
          status: createState.status,
          isPubliclyListed: createState.isPubliclyListed,
          minimumTrustLevel: createState.minimumTrustLevel,
          opensAt: normalizeDateTimeValue(createState.opensAt),
          closesAt: normalizeDateTimeValue(createState.closesAt),
        }),
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create form');
      }

      setForms((current) => [data.form, ...current]);
      setExpandedFormId(data.form.id);
      setActiveSubtab('forms');
      setCreateState(buildFormState());
      setSuccess('Form created.');
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to create form');
    } finally {
      setIsCreating(false);
    }
  }

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5">
      {error ? <p className="text-sm font-medium text-rose-600">{error}</p> : null}
      {success ? <p className="text-sm font-medium text-emerald-600">{success}</p> : null}

      <div className="space-y-0">
        <div className="relative top-[2px] flex flex-wrap gap-0 pb-0 pl-2">
          {ORGANIZATION_FORM_SUBTABS.map((tab) => {
            const isActive = tab === activeSubtab;
            const label = tab === 'create' ? '+ Form' : 'List';

            return (
              <button
                key={tab}
                type="button"
                onClick={() => setActiveSubtab(tab)}
                className={`admin-card-tab scale-[0.97] ${isActive ? 'admin-card-tab-active' : 'admin-card-tab-inactive'}`}
              >
                {label}
              </button>
            );
          })}
        </div>

        <div className="rounded-2xl border border-slate-200 bg-slate-50/40 p-4">
          {activeSubtab === 'create' ? (
            <form onSubmit={handleCreateForm} className="space-y-3 rounded-2xl border border-dashed border-slate-300 bg-white p-4">
              <h3 className="text-sm font-semibold uppercase tracking-[0.16em] text-slate-500">Create Form</h3>
              <div className="grid gap-3 lg:grid-cols-2">
                <div className="lg:col-span-2">
                  <label className="form-label text-slate-500">Title</label>
                  <input
                    value={createState.title}
                    onChange={(event) => setCreateState((current) => ({ ...current, title: event.target.value }))}
                    className="form-input"
                  />
                </div>
                <div>
                  <label className="form-label text-slate-500">Status</label>
                  <select
                    value={createState.status}
                    onChange={(event) =>
                      setCreateState((current) => ({
                        ...current,
                        status: event.target.value as OrganizationFormStatus,
                      }))
                    }
                    className="form-input"
                  >
                    {ORGANIZATION_FORM_STATUS_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="form-label text-slate-500">Minimum Access</label>
                  <select
                    value={createState.minimumTrustLevel}
                    onChange={(event) =>
                      setCreateState((current) => ({
                        ...current,
                        minimumTrustLevel: event.target.value as OrganizationFormMinimumTrustLevel,
                      }))
                    }
                    className="form-input"
                  >
                    {ORGANIZATION_FORM_MINIMUM_TRUST_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="form-label text-slate-500">Open At</label>
                  <input
                    type="datetime-local"
                    value={createState.opensAt}
                    onChange={(event) => setCreateState((current) => ({ ...current, opensAt: event.target.value }))}
                    className="form-input"
                  />
                </div>
                <div>
                  <label className="form-label text-slate-500">Close At</label>
                  <input
                    type="datetime-local"
                    value={createState.closesAt}
                    onChange={(event) => setCreateState((current) => ({ ...current, closesAt: event.target.value }))}
                    className="form-input"
                  />
                </div>
                <label className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3">
                  <input
                    type="checkbox"
                    checked={createState.isPubliclyListed}
                    onChange={(event) => setCreateState((current) => ({ ...current, isPubliclyListed: event.target.checked }))}
                    className="h-4 w-4 rounded border-slate-300 text-slate-950 focus:ring-slate-300"
                  />
                  <span className="text-sm font-medium text-slate-700">Show on the public organization page when published</span>
                </label>
                <div className="lg:col-span-2">
                  <label className="form-label text-slate-500">Description</label>
                  <textarea
                    value={createState.description}
                    onChange={(event) => setCreateState((current) => ({ ...current, description: event.target.value }))}
                    className="form-input min-h-[120px]"
                  />
                </div>
              </div>

              <CrudActionButton type="submit" variant="primary" icon={Plus} label="Create form" disabled={isCreating}>
                {isCreating ? 'Creating...' : 'Create Form'}
              </CrudActionButton>
            </form>
          ) : (
            <div className="admin-list">
              <div className="admin-list-toolbar">
                <label className="admin-list-filter">
                  <span className="admin-list-filter-label">Filter: Title, Slug</span>
                  <input
                    type="text"
                    value={filterValue}
                    onChange={(event) => setFilterValue(event.target.value)}
                    placeholder="Search by form title or slug"
                    className="admin-list-filter-input"
                  />
                </label>
              </div>

              <div className="admin-list-table-wrap">
                <table className="admin-list-table">
                  <thead className="admin-list-head">
                    <tr>
                      <th className="admin-list-header-cell">Title</th>
                      <th className="admin-list-header-cell">Slug</th>
                      <th className="admin-list-header-cell">Status</th>
                      <th className="admin-list-header-cell">Questions</th>
                      <th className="admin-list-header-cell">Responses</th>
                      <th className="admin-list-header-cell">Updated</th>
                      <th className="admin-list-header-cell">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredForms.length ? (
                      filteredForms.map((form) => {
                        const isExpanded = expandedFormId === form.id;
                        const previewPath = `/organizations/${organizationSlug}/forms/${form.slug}`;

                        return (
                          <Fragment key={form.id}>
                            <tr className="admin-list-row">
                              <td className="admin-list-cell">
                                <button
                                  type="button"
                                  onClick={() => setExpandedFormId(isExpanded ? null : form.id)}
                                  className="admin-list-cell-button text-left"
                                >
                                  {form.title}
                                </button>
                              </td>
                              <td className="admin-list-cell text-xs text-slate-500">{form.slug}</td>
                              <td className="admin-list-cell">{formatOrganizationFormStatusLabel(form.status)}</td>
                              <td className="admin-list-cell">{form._count.questions}</td>
                              <td className="admin-list-cell">{form._count.submissions}</td>
                              <td className="admin-list-cell">{formatDisplayDate(form.updatedAt)}</td>
                              <td className="admin-list-cell">
                                <div className="flex flex-wrap items-center gap-3">
                                  <CrudActionButton
                                    type="button"
                                    variant="inline"
                                    icon={ListChecks}
                                    label={isExpanded ? 'Close form' : 'Manage form'}
                                    onClick={() => setExpandedFormId(isExpanded ? null : form.id)}
                                  >
                                    {isExpanded ? 'Close' : 'Manage'}
                                  </CrudActionButton>
                                  <Link href={previewPath} target="_blank" className="admin-list-link text-xs">
                                    <ExternalLink className="h-4 w-4" aria-hidden="true" />
                                    <span className="sr-only">Open public form</span>
                                  </Link>
                                </div>
                              </td>
                            </tr>

                            {isExpanded ? (
                              <tr className="admin-list-row bg-slate-50">
                                <td className="admin-list-cell" colSpan={7}>
                                  <OrganizationFormCard
                                    organizationId={organizationId}
                                    organizationSlug={organizationSlug}
                                    form={form}
                                    onUpdate={(nextForm) =>
                                      setForms((current) =>
                                        current.map((entry) => (entry.id === nextForm.id ? nextForm : entry))
                                      )
                                    }
                                    onDelete={(formId) => {
                                      setForms((current) => current.filter((entry) => entry.id !== formId));
                                      setExpandedFormId((current) => (current === formId ? null : current));
                                    }}
                                  />
                                </td>
                              </tr>
                            ) : null}
                          </Fragment>
                        );
                      })
                    ) : (
                      <tr>
                        <td className="admin-list-empty" colSpan={7}>
                          No forms match the current filter. Use `+ Form` to create one, then manage it from this list.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              <div className="admin-list-pagination">
                <div className="admin-list-pagination-label">
                  {filteredForms.length} form{filteredForms.length === 1 ? '' : 's'}
                </div>
                <div className="admin-list-pagination-actions" />
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
