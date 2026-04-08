'use client';

import { FormEvent, useMemo, useState } from 'react';
import { ExternalLink, FileText, ListChecks, Plus, Save, Trash2 } from 'lucide-react';
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
}

interface OrganizationFormsManagerProps {
  organizationId: string;
  organizationSlug: string;
  forms: OrganizationFormRecord[];
}

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
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isCreatingQuestion, setIsCreatingQuestion] = useState(false);
  const previewPath = `/organizations/${organizationSlug}/forms/${form.slug}`;
  const requiresQuestionOptions = questionState.type === 'SINGLE_CHOICE' || questionState.type === 'MULTIPLE_CHOICE';
  const sortedQuestions = useMemo(
    () => [...form.questions].sort((a, b) => (a.sortOrder === b.sortOrder ? a.prompt.localeCompare(b.prompt) : a.sortOrder - b.sortOrder)),
    [form.questions]
  );

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
      <form onSubmit={handleSaveForm}>
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
            <div className="flex flex-wrap items-center gap-3 text-xs font-medium uppercase tracking-[0.16em] text-slate-400">
              <span>Share Path: {previewPath}</span>
              <span>Updated {formatDisplayDate(form.updatedAt)}</span>
              <span>{form.isPubliclyListed ? 'Listed on org page' : 'Direct link only'}</span>
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            <CrudActionButton type="submit" variant="primary" icon={Save} label="Save form" disabled={isSaving}>
              {isSaving ? 'Saving...' : 'Save Form'}
            </CrudActionButton>
            <CrudActionButton type="button" variant="secondary" icon={ExternalLink} label="Copy share path" onClick={() => navigator.clipboard.writeText(previewPath)}>
              Copy Path
            </CrudActionButton>
            <CrudActionButton type="button" variant="danger" icon={Trash2} label="Delete form" onClick={handleDeleteForm} disabled={isDeleting}>
              {isDeleting ? 'Deleting...' : 'Delete Form'}
            </CrudActionButton>
          </div>
        </div>

        <div className="mt-5 grid gap-4 lg:grid-cols-2">
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
      </form>

      {error ? <p className="mt-4 text-sm font-medium text-rose-600">{error}</p> : null}
      {success ? <p className="mt-4 text-sm font-medium text-emerald-600">{success}</p> : null}

      <div className="mt-6 border-t border-slate-200 pt-6">
        <div className="flex items-center gap-3">
          <div className="rounded-full border border-slate-200 p-2 text-slate-600">
            <ListChecks className="h-4 w-4" />
          </div>
          <div>
            <h4 className="text-sm font-bold uppercase tracking-[0.16em] text-slate-500">Questions</h4>
            <p className="text-sm text-slate-600">Question ordering is manual for now through `Sort Order` fields.</p>
          </div>
        </div>

        <div className="mt-4 space-y-4">
          {sortedQuestions.length ? (
            sortedQuestions.map((question) => (
              <div key={question.id} className="space-y-2">
                <div className="flex flex-wrap items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                  <span>{question.sortOrder}</span>
                  <span>{formatOrganizationFormQuestionTypeLabel(question.type)}</span>
                  <span>{question.isRequired ? 'Required' : 'Optional'}</span>
                </div>
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
                  onDelete={(questionId) =>
                    onUpdate({
                      ...form,
                      questions: form.questions.filter((entry) => entry.id !== questionId),
                      _count: {
                        ...form._count,
                        questions: Math.max(0, form._count.questions - 1),
                      },
                    })
                  }
                />
              </div>
            ))
          ) : (
            <div className="rounded-2xl border border-dashed border-slate-300 px-4 py-6 text-sm text-slate-500">
              No questions yet. Start with a text prompt or a simple choice list.
            </div>
          )}
        </div>

        <form onSubmit={handleCreateQuestion} className="mt-5 space-y-3 rounded-2xl border border-dashed border-slate-300 p-4">
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
      </div>
    </section>
  );
}

export default function OrganizationFormsManager({
  organizationId,
  organizationSlug,
  forms: initialForms,
}: OrganizationFormsManagerProps) {
  const [forms, setForms] = useState(initialForms);
  const [createState, setCreateState] = useState<OrganizationFormState>(() => buildFormState());
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isCreating, setIsCreating] = useState(false);

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
      <div className="flex items-start gap-3">
        <div className="rounded-full border border-slate-200 p-2 text-slate-600">
          <FileText className="h-4 w-4" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-slate-950">Forms</h2>
          <p className="mt-1 text-sm text-slate-600">
            Create organization-owned forms, define access rules, and begin building question sets for public submission routes.
          </p>
        </div>
      </div>

      {error ? <p className="mt-4 text-sm font-medium text-rose-600">{error}</p> : null}
      {success ? <p className="mt-4 text-sm font-medium text-emerald-600">{success}</p> : null}

      <form onSubmit={handleCreateForm} className="mt-5 space-y-3 rounded-2xl border border-dashed border-slate-300 p-4">
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

      <div className="mt-6 space-y-4">
        {forms.length ? (
          forms.map((form) => (
            <OrganizationFormCard
              key={form.id}
              organizationId={organizationId}
              organizationSlug={organizationSlug}
              form={form}
              onUpdate={(nextForm) =>
                setForms((current) =>
                  current.map((entry) => (entry.id === nextForm.id ? nextForm : entry))
                )
              }
              onDelete={(formId) => setForms((current) => current.filter((entry) => entry.id !== formId))}
            />
          ))
        ) : (
          <div className="rounded-2xl border border-dashed border-slate-300 px-4 py-8 text-sm text-slate-500">
            No forms yet. Start with a draft intake or signup form and build the questions inside the card after creation.
          </div>
        )}
      </div>
    </section>
  );
}
