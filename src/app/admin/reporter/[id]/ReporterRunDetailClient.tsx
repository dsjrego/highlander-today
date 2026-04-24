'use client';

import Link from 'next/link';
import { useEffect, useId, useRef, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { AdminViewTabs } from '@/components/admin/AdminViewTabs';
import { useDialogAccessibility } from '@/components/shared/useDialogAccessibility';
import {
  REPORTER_INTERVIEW_PRIORITY_OPTIONS,
  REPORTER_INTERVIEW_REQUEST_STATUS_OPTIONS,
  REPORTER_INTERVIEW_TYPE_OPTIONS,
  REPORTER_SUPPORTED_LANGUAGE_OPTIONS,
  getReporterInterviewAccessState,
} from '@/lib/reporter/interview';
import {
  canAddReporterSource,
  canAssignReporterRun,
  canConvertReporterToArticle,
  canEditReporterRun,
  canGenerateReporterDraft,
} from '@/lib/reporter/permissions';

type TabKey = 'details' | 'interviews' | 'sources' | 'blockers' | 'analysis' | 'drafts';
type PreviewDialogState =
  | { kind: 'draft'; id: string }
  | { kind: 'analysis'; id: string }
  | null;

interface ReporterRunDetailClientProps {
  run: any;
  assignees: { id: string; firstName: string; lastName: string }[];
  userRole: string;
}

const TABS: Array<{ key: TabKey; label: string }> = [
  { key: 'details', label: 'Details' },
  { key: 'interviews', label: 'Interviews' },
  { key: 'sources', label: 'Sources' },
  { key: 'blockers', label: 'Blockers' },
  { key: 'analysis', label: 'Analysis' },
  { key: 'drafts', label: 'Drafts' },
];

const EMPTY_SOURCE_FORM = {
  sourceType: 'STAFF_NOTE',
  title: '',
  url: '',
  publisher: '',
  author: '',
  excerpt: '',
  note: '',
  contentText: '',
  reliabilityTier: 'UNVERIFIED',
};

const BLOCKER_CODE_OPTIONS = [
  'SOURCE_GAP',
  'CORROBORATION_NEEDED',
  'TIMEFRAME_UNCLEAR',
  'SUBJECT_UNCLEAR',
  'AWAITING_RESPONSE',
  'MISSING_PRIMARY_SOURCE',
  'LEGAL_REVIEW',
  'EDITORIAL_REVIEW',
  'OTHER',
] as const;

const EMPTY_INTERVIEW_FORM = {
  status: 'DRAFT',
  interviewType: 'GENERAL_SOURCE',
  priority: 'NORMAL',
  intervieweeName: '',
  intervieweeUserId: '',
  inviteEmail: '',
  relationshipToStory: '',
  purpose: '',
  editorBrief: '',
  mustLearn: '',
  knownContext: '',
  sensitivityNotes: '',
  suggestedLanguage: 'ENGLISH',
  nativeLanguage: '',
  interviewLanguage: '',
  requiresTranslationSupport: false,
  scheduledFor: '',
};

function normalizeOptionalUrl(value: string) {
  const trimmed = value.trim();
  if (!trimmed) {
    return '';
  }
  if (/^https?:\/\//i.test(trimmed)) {
    return trimmed;
  }
  return `https://${trimmed}`;
}

function EditIcon() {
  return <span aria-hidden="true" className="text-sm font-semibold leading-none">✎</span>;
}

function DeleteIcon() {
  return <span aria-hidden="true" className="text-sm font-semibold leading-none">✕</span>;
}

function ResolveIcon() {
  return <span aria-hidden="true" className="text-sm font-semibold leading-none">✓</span>;
}

function ReopenIcon() {
  return <span aria-hidden="true" className="text-sm font-semibold leading-none">↺</span>;
}

function getDraftDisplayLabel(drafts: any[], draftId: string | null) {
  if (!draftId) {
    return null;
  }

  const index = drafts.findIndex((draft: any) => draft.id === draftId);

  if (index === -1) {
    return null;
  }

  return `Draft ${drafts.length - index}`;
}

function getInterviewStatusGuidance(interview: any) {
  if (!interview.intervieweeUserId && !interview.inviteEmail) {
    return 'Add an account or invite email before sending the session link.';
  }
  if (interview.status === 'DRAFT') {
    return 'Setup is still internal only. Send invite when details are ready.';
  }
  if (interview.status === 'INVITED') {
    return 'Invite is ready to share. The interviewee can open the browser session.';
  }
  if (interview.status === 'READY') {
    return 'Linked account is ready. Share the session link directly.';
  }
  if (interview.status === 'IN_PROGRESS') {
    return 'Interview is actively underway in the browser flow.';
  }
  if (interview.status === 'COMPLETED') {
    return 'Interview finished. Review transcript, facts, and any safety flags below.';
  }
  if (interview.status === 'BLOCKED') {
    return 'Interview output is blocked pending editorial review or follow-up.';
  }
  if (interview.status === 'DECLINED' || interview.status === 'NO_SHOW') {
    return 'Reopen when you want to reissue the session link.';
  }
  if (interview.status === 'CANCELLED') {
    return 'Cancelled requests stay closed until you reopen them.';
  }
  return 'Review setup details before sharing the interview link.';
}

export default function ReporterRunDetailClient({
  run,
  assignees,
  userRole,
}: ReporterRunDetailClientProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const previewDialogTitleId = useId();
  const previewDialogRef = useRef<HTMLDivElement | null>(null);
  const previewDialogCloseRef = useRef<HTMLButtonElement | null>(null);
  const activeTab = (searchParams.get('view') as TabKey) || 'details';
  const [currentRun, setCurrentRun] = useState(run);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [saving, setSaving] = useState(false);
  const [sourceForm, setSourceForm] = useState(EMPTY_SOURCE_FORM);
  const [editingSourceId, setEditingSourceId] = useState<string | null>(null);
  const [savingSource, setSavingSource] = useState(false);
  const [deletingSourceId, setDeletingSourceId] = useState<string | null>(null);
  const [interviewForm, setInterviewForm] = useState(EMPTY_INTERVIEW_FORM);
  const [editingInterviewId, setEditingInterviewId] = useState<string | null>(null);
  const [savingInterview, setSavingInterview] = useState(false);
  const [interviewActionId, setInterviewActionId] = useState<string | null>(null);
  const [copiedInterviewId, setCopiedInterviewId] = useState<string | null>(null);
  const [reviewingSessionId, setReviewingSessionId] = useState<string | null>(null);
  const [blockerForm, setBlockerForm] = useState({
    code: 'SOURCE_GAP',
    message: '',
  });
  const [isGeneratingDraft, setIsGeneratingDraft] = useState(false);
  const [isGeneratingAnalysis, setIsGeneratingAnalysis] = useState(false);
  const [isConvertingDraft, setIsConvertingDraft] = useState<string | null>(null);
  const [previewDialog, setPreviewDialog] = useState<PreviewDialogState>(null);
  const articleDrafts = currentRun.drafts.filter((draft: any) => draft.draftType === 'ARTICLE_DRAFT');
  const analysisDrafts = currentRun.drafts.filter(
    (draft: any) => draft.draftType === 'SOURCE_PACKET_SUMMARY'
  );
  const [selectedDraftId, setSelectedDraftId] = useState<string | null>(
    run.drafts?.find((draft: any) => draft.draftType === 'ARTICLE_DRAFT')?.id || null
  );
  const [selectedAnalysisId, setSelectedAnalysisId] = useState<string | null>(
    run.drafts?.find((draft: any) => draft.draftType === 'SOURCE_PACKET_SUMMARY')?.id || null
  );
  const openBlockers = currentRun.blockers.filter((blocker: any) => !blocker.isResolved);
  const unresolvedValidationIssues = (currentRun.validationIssues || []).filter(
    (issue: any) => !issue.isResolved
  );
  const hasSources = currentRun.sources.length > 0;
  const canEditRun = canEditReporterRun(userRole);
  const canAssignRun = canAssignReporterRun(userRole);
  const canManageSources = canAddReporterSource(userRole);
  const canGenerateDraft = canGenerateReporterDraft(userRole);
  const canConvertDraft = canConvertReporterToArticle(userRole);
  const interviews = currentRun.interviewRequests || [];
  const completedInterviewSessions = interviews.flatMap((interview: any) =>
    (interview.sessions || [])
      .filter((session: any) => session.status === 'COMPLETED')
      .map((session: any) => ({
        interview,
        session,
      }))
  );
  const unreviewedCompletedInterviewSessions = completedInterviewSessions.filter(
    ({ session }: any) => !session.reviewedAt
  );
  const isConvertedRun =
    currentRun.status === 'CONVERTED_TO_ARTICLE' || Boolean(currentRun.linkedArticle);
  const selectedDraft =
    articleDrafts.find((draft: any) => draft.id === selectedDraftId) || articleDrafts[0] || null;
  const selectedAnalysis =
    analysisDrafts.find((draft: any) => draft.id === selectedAnalysisId) || analysisDrafts[0] || null;
  const draftGenerationBlockedReason = !hasSources
    ? 'Draft generation is unavailable until the run has source material.'
    : openBlockers.length > 0
      ? 'Draft generation is unavailable until all open blockers are resolved.'
      : unreviewedCompletedInterviewSessions.length > 0
        ? 'Draft generation is unavailable until completed interview output has been reviewed.'
      : currentRun.status === 'ARCHIVED'
          ? 'This run is archived. Reopen it before generating another draft.'
          : 'Draft generation is unavailable for the current run state.';
  const canDraftNow =
    canGenerateDraft &&
    hasSources &&
    openBlockers.length === 0 &&
    unreviewedCompletedInterviewSessions.length === 0 &&
    currentRun.status !== 'ARCHIVED';
  const readinessTone = isConvertedRun
    ? 'border-sky-200 bg-sky-50 text-sky-900'
    : !hasSources
      ? 'border-amber-200 bg-amber-50 text-amber-900'
      : openBlockers.length > 0
        ? 'border-red-200 bg-red-50 text-red-900'
        : unreviewedCompletedInterviewSessions.length > 0
          ? 'border-amber-200 bg-amber-50 text-amber-900'
        : unresolvedValidationIssues.length > 0
          ? 'border-amber-200 bg-amber-50 text-amber-900'
          : 'border-emerald-200 bg-emerald-50 text-emerald-900';
  const readinessLabel = isConvertedRun
    ? 'Linked article exists'
    : !hasSources
      ? 'Needs source packet'
      : openBlockers.length > 0
        ? 'Blocked'
        : unreviewedCompletedInterviewSessions.length > 0
          ? 'Interview review required'
        : unresolvedValidationIssues.length > 0
          ? 'Validation issues to review'
          : canGenerateDraft
            ? 'Ready for draft'
            : 'Ready for editorial review';
  const readinessDescription = isConvertedRun
    ? canGenerateDraft && hasSources && openBlockers.length === 0
      ? 'This run already has a linked article draft, and you can still generate additional drafts for comparison or revision.'
      : 'This run already has a linked article draft. Continue editing from the article workflow or resolve any remaining blockers before generating another draft.'
    : !hasSources
      ? 'Add at least one source before drafting.'
      : openBlockers.length > 0
        ? `${openBlockers.length} open blocker${openBlockers.length === 1 ? '' : 's'} must be resolved before drafting.`
        : unreviewedCompletedInterviewSessions.length > 0
          ? `${unreviewedCompletedInterviewSessions.length} completed interview session${unreviewedCompletedInterviewSessions.length === 1 ? '' : 's'} still need editorial review.`
        : unresolvedValidationIssues.length > 0
          ? `${unresolvedValidationIssues.length} validation issue${unresolvedValidationIssues.length === 1 ? '' : 's'} remain on the current run.`
          : canGenerateDraft
            ? 'Source packet is assembled and this run can move into draft generation.'
            : 'Source packet looks usable, but this role cannot generate drafts.';

  function updateSearchParams(updates: Record<string, string | null>) {
    const next = new URLSearchParams(searchParams.toString());

    Object.entries(updates).forEach(([key, value]) => {
      if (value === null || value === '') {
        next.delete(key);
      } else {
        next.set(key, value);
      }
    });

    const queryString = next.toString();
    router.replace(queryString ? `${pathname}?${queryString}` : pathname);
  }

  function handleSelectDraft(draftId: string) {
    setSelectedDraftId(draftId);
    setPreviewDialog({ kind: 'draft', id: draftId });
  }

  function handleSelectAnalysis(draftId: string) {
    setSelectedAnalysisId(draftId);
    setPreviewDialog({ kind: 'analysis', id: draftId });
  }

  useEffect(() => {
    if (!previewDialog) {
      return;
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setPreviewDialog(null);
      }
    }

    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [previewDialog]);

  const dialogDraft =
    previewDialog?.kind === 'draft'
      ? articleDrafts.find((draft: any) => draft.id === previewDialog.id) || selectedDraft
      : previewDialog?.kind === 'analysis'
        ? analysisDrafts.find((draft: any) => draft.id === previewDialog.id) || selectedAnalysis
        : null;
  const dialogLabel =
    previewDialog?.kind === 'draft'
      ? getDraftDisplayLabel(articleDrafts, dialogDraft?.id || null)
      : previewDialog?.kind === 'analysis'
        ? getDraftDisplayLabel(analysisDrafts, dialogDraft?.id || null)?.replace('Draft', 'Analysis')
        : null;

  useDialogAccessibility({
    isOpen: Boolean(previewDialog && dialogDraft),
    onClose: () => setPreviewDialog(null),
    containerRef: previewDialogRef,
    initialFocusRef: previewDialogCloseRef,
  });

  async function patchRun(payload: Record<string, unknown>) {
    setSaving(true);
    setError('');
    try {
      const response = await fetch(`/api/reporter/runs/${currentRun.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data.error || 'Failed to update reporter run');
      }
      setCurrentRun((prev: any) => ({ ...prev, ...data }));
    } catch (updateError) {
      setError(updateError instanceof Error ? updateError.message : 'Failed to update run');
    } finally {
      setSaving(false);
    }
  }

  function populateSourceForm(source: any) {
    setSourceForm({
      sourceType: source.sourceType || 'STAFF_NOTE',
      title: source.title || '',
      url: source.url || '',
      publisher: source.publisher || '',
      author: source.author || '',
      excerpt: source.excerpt || '',
      note: source.note || '',
      contentText: source.contentText || '',
      reliabilityTier: source.reliabilityTier || 'UNVERIFIED',
    });
    setEditingSourceId(source.id);
  }

  function resetSourceForm() {
    setSourceForm(EMPTY_SOURCE_FORM);
    setEditingSourceId(null);
    setDeletingSourceId(null);
  }

  function populateInterviewForm(interview: any) {
    setInterviewForm({
      status: interview.status || 'DRAFT',
      interviewType: interview.interviewType || 'GENERAL_SOURCE',
      priority: interview.priority || 'NORMAL',
      intervieweeName: interview.intervieweeName || '',
      intervieweeUserId: interview.intervieweeUserId || '',
      inviteEmail: interview.inviteEmail || '',
      relationshipToStory: interview.relationshipToStory || '',
      purpose: interview.purpose || '',
      editorBrief: interview.editorBrief || '',
      mustLearn: interview.mustLearn || '',
      knownContext: interview.knownContext || '',
      sensitivityNotes: interview.sensitivityNotes || '',
      suggestedLanguage: interview.suggestedLanguage || 'ENGLISH',
      nativeLanguage: interview.nativeLanguage || '',
      interviewLanguage: interview.interviewLanguage || '',
      requiresTranslationSupport: Boolean(interview.requiresTranslationSupport),
      scheduledFor: interview.scheduledFor
        ? new Date(interview.scheduledFor).toISOString().slice(0, 16)
        : '',
    });
    setEditingInterviewId(interview.id);
  }

  function resetInterviewForm() {
    setInterviewForm(EMPTY_INTERVIEW_FORM);
    setEditingInterviewId(null);
  }

  async function handleSaveInterview(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setSavingInterview(true);
    setNotice('');
    try {
      const payload = {
        ...interviewForm,
        intervieweeUserId: interviewForm.intervieweeUserId || null,
        inviteEmail: interviewForm.inviteEmail || null,
        relationshipToStory: interviewForm.relationshipToStory || null,
        editorBrief: interviewForm.editorBrief || null,
        mustLearn: interviewForm.mustLearn || null,
        knownContext: interviewForm.knownContext || null,
        sensitivityNotes: interviewForm.sensitivityNotes || null,
        nativeLanguage: interviewForm.nativeLanguage || null,
        interviewLanguage: interviewForm.interviewLanguage || null,
        scheduledFor: interviewForm.scheduledFor
          ? new Date(interviewForm.scheduledFor).toISOString()
          : null,
      };
      const isEditing = Boolean(editingInterviewId);
      const response = await fetch(
        isEditing
          ? `/api/reporter/interviews/${editingInterviewId}`
          : `/api/reporter/runs/${currentRun.id}/interviews`,
        {
          method: isEditing ? 'PATCH' : 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        }
      );
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(
          data.error || `Failed to ${isEditing ? 'update' : 'create'} interview request`
        );
      }
      setCurrentRun((prev: any) => ({
        ...prev,
        interviewRequests: isEditing
          ? prev.interviewRequests.map((interview: any) =>
              interview.id === data.id ? data : interview
            )
          : [data, ...(prev.interviewRequests || [])],
      }));
      resetInterviewForm();
      updateSearchParams({ view: 'interviews' });
    } catch (interviewError) {
      setError(
        interviewError instanceof Error
          ? interviewError.message
          : `Failed to ${editingInterviewId ? 'update' : 'create'} interview request`
      );
    } finally {
      setSavingInterview(false);
    }
  }

  async function handleInterviewAction(interviewId: string, action: 'invite' | 'reopen') {
    setError('');
    setNotice('');
    setInterviewActionId(interviewId);
    try {
      const response = await fetch(`/api/reporter/interviews/${interviewId}/${action}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(
          data.error || `Failed to ${action === 'invite' ? 'send invite' : 'reopen interview'}`
        );
      }
      setCurrentRun((prev: any) => ({
        ...prev,
        interviewRequests: prev.interviewRequests.map((interview: any) =>
          interview.id === data.id ? data : interview
        ),
      }));
      if (data.inviteDeliveryMessage) {
        setNotice(data.inviteDeliveryMessage);
      } else {
        setNotice(
          action === 'invite'
            ? 'Interview invite state updated.'
            : 'Interview request reopened.'
        );
      }
    } catch (actionError) {
      setError(
        actionError instanceof Error
          ? actionError.message
          : `Failed to ${action === 'invite' ? 'send invite' : 'reopen interview'}`
      );
    } finally {
      setInterviewActionId(null);
    }
  }

  async function handleCopyInterviewLink(interviewId: string) {
    setError('');
    setNotice('');
    try {
      const url = `${window.location.origin}/interviews/${interviewId}`;
      await navigator.clipboard.writeText(url);
      setCopiedInterviewId(interviewId);
      setNotice('Interview link copied.');
      window.setTimeout(() => {
        setCopiedInterviewId((current) => (current === interviewId ? null : current));
      }, 2000);
    } catch (copyError) {
      setError(
        copyError instanceof Error
          ? copyError.message
          : 'Failed to copy interview link'
      );
    }
  }

  async function handleReviewInterviewSession(sessionId: string) {
    setError('');
    setNotice('');
    setReviewingSessionId(sessionId);
    try {
      const response = await fetch(`/api/reporter/interview-sessions/${sessionId}/review`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data.error || 'Failed to mark interview session reviewed');
      }
      setCurrentRun((prev: any) => ({
        ...prev,
        interviewRequests: prev.interviewRequests.map((interview: any) => ({
          ...interview,
          sessions: (interview.sessions || []).map((session: any) =>
            session.id === data.id ? data : session
          ),
        })),
      }));
      setNotice('Interview session marked reviewed.');
    } catch (reviewError) {
      setError(
        reviewError instanceof Error
          ? reviewError.message
          : 'Failed to mark interview session reviewed'
      );
    } finally {
      setReviewingSessionId(null);
    }
  }

  async function handleAddSource(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setSavingSource(true);
    try {
      const payload = {
        ...sourceForm,
        url: normalizeOptionalUrl(sourceForm.url),
      };
      const isEditing = Boolean(editingSourceId);
      const response = await fetch(
        isEditing
          ? `/api/reporter/sources/${editingSourceId}`
          : `/api/reporter/runs/${currentRun.id}/sources`,
        {
          method: isEditing ? 'PATCH' : 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        }
      );
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(
          data.error || `Failed to ${isEditing ? 'update' : 'add'} source`
        );
      }
      setCurrentRun((prev: any) => ({
        ...prev,
        sources: isEditing
          ? prev.sources.map((source: any) => (source.id === data.id ? data : source))
          : [...prev.sources, data],
      }));
      resetSourceForm();
    } catch (sourceError) {
      setError(
        sourceError instanceof Error
          ? sourceError.message
          : `Failed to ${editingSourceId ? 'update' : 'add'} source`
      );
    } finally {
      setSavingSource(false);
    }
  }

  async function handleDeleteSource(sourceId: string) {
    setError('');
    setDeletingSourceId(sourceId);
    try {
      const response = await fetch(`/api/reporter/sources/${sourceId}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data.error || 'Failed to delete source');
      }
      setCurrentRun((prev: any) => ({
        ...prev,
        sources: prev.sources.filter((source: any) => source.id !== sourceId),
      }));
      if (editingSourceId === sourceId) {
        resetSourceForm();
      } else {
        setDeletingSourceId(null);
      }
    } catch (sourceError) {
      setError(sourceError instanceof Error ? sourceError.message : 'Failed to delete source');
      setDeletingSourceId(null);
    }
  }

  async function handleResolveBlocker(blockerId: string, isResolved: boolean) {
    setError('');
    try {
      const response = await fetch(`/api/reporter/blockers/${blockerId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isResolved }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data.error || 'Failed to update blocker');
      }
      setCurrentRun((prev: any) => ({
        ...prev,
        blockers: prev.blockers.map((blocker: any) =>
          blocker.id === blockerId ? data : blocker
        ),
      }));
    } catch (blockerError) {
      setError(blockerError instanceof Error ? blockerError.message : 'Failed to update blocker');
    }
  }

  async function handleAddBlocker(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    try {
      const response = await fetch(`/api/reporter/runs/${currentRun.id}/blockers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(blockerForm),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data.error || 'Failed to add blocker');
      }
      setCurrentRun((prev: any) => ({
        ...prev,
        status: 'BLOCKED',
        blockers: [data, ...prev.blockers],
      }));
      setBlockerForm({ code: 'SOURCE_GAP', message: '' });
    } catch (blockerError) {
      setError(blockerError instanceof Error ? blockerError.message : 'Failed to add blocker');
    }
  }

  async function handleGenerateDraft() {
    setError('');
    setIsGeneratingDraft(true);
    try {
      const response = await fetch(`/api/reporter/runs/${currentRun.id}/draft`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ draftType: 'ARTICLE_DRAFT' }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data.error || 'Failed to generate draft');
      }
      setCurrentRun((prev: any) => ({
        ...prev,
        status: data.validation?.hasCriticalIssues
          ? 'BLOCKED'
          : prev.linkedArticle
            ? 'CONVERTED_TO_ARTICLE'
            : 'DRAFT_CREATED',
        drafts: [data.draft, ...(prev.drafts || [])],
      }));
      setSelectedDraftId(data.draft.id);
    } catch (draftError) {
      setError(draftError instanceof Error ? draftError.message : 'Failed to generate draft');
    } finally {
      setIsGeneratingDraft(false);
    }
  }

  async function handleGenerateAnalysis() {
    setError('');
    setIsGeneratingAnalysis(true);
    try {
      const response = await fetch(`/api/reporter/runs/${currentRun.id}/draft`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ draftType: 'SOURCE_PACKET_SUMMARY' }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data.error || 'Failed to generate reporter analysis');
      }
      setCurrentRun((prev: any) => ({
        ...prev,
        status: data.validation?.hasCriticalIssues ? 'BLOCKED' : prev.status,
        drafts: [data.draft, ...(prev.drafts || [])],
      }));
      setSelectedAnalysisId(data.draft.id);
      updateSearchParams({ view: 'analysis' });
    } catch (analysisError) {
      setError(
        analysisError instanceof Error
          ? analysisError.message
          : 'Failed to generate reporter analysis'
      );
    } finally {
      setIsGeneratingAnalysis(false);
    }
  }

  async function handleConvertDraft(draftId: string) {
    setError('');
    setIsConvertingDraft(draftId);
    try {
      const response = await fetch(
        `/api/reporter/runs/${currentRun.id}/convert-to-article`,
        { method: 'POST' }
      );
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data.error || 'Failed to convert draft');
      }
      window.location.href = `/local-life/submit?edit=${data.id}`;
    } catch (convertError) {
      setError(
        convertError instanceof Error ? convertError.message : 'Failed to convert draft'
      );
    } finally {
      setIsConvertingDraft(null);
    }
  }

  return (
    <div className="space-y-4">
      <AdminViewTabs
        defaultView="details"
        views={TABS.map((tab) => ({
          key: tab.key,
          label: tab.label,
        }))}
      />

      <div className="space-y-4">
        {error ? <div className="admin-list-error">{error}</div> : null}
        {notice ? (
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
            {notice}
          </div>
        ) : null}

        <section className="grid gap-3 lg:grid-cols-5">
          <div className="rounded-3xl border border-slate-200 bg-slate-50 px-4 py-3">
            <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
              Status
            </div>
            <div className="mt-2 text-sm font-semibold text-slate-900">{currentRun.status}</div>
          </div>
          <div className="rounded-3xl border border-slate-200 bg-slate-50 px-4 py-3">
            <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
              Assignee
            </div>
            <div className="mt-2 text-sm font-semibold text-slate-900">
              {currentRun.assignedTo
                ? `${currentRun.assignedTo.firstName} ${currentRun.assignedTo.lastName}`
                : 'Unassigned'}
            </div>
          </div>
          <div className="rounded-3xl border border-slate-200 bg-slate-50 px-4 py-3">
            <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
              Interviews
            </div>
            <div className="mt-2 text-sm font-semibold text-slate-900">
              {interviews.length}
            </div>
          </div>
          <div className="rounded-3xl border border-slate-200 bg-slate-50 px-4 py-3">
            <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
              Sources
            </div>
            <div className="mt-2 text-sm font-semibold text-slate-900">
              {currentRun.sources.length}
            </div>
          </div>
          <div className="rounded-3xl border border-slate-200 bg-slate-50 px-4 py-3">
            <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
              Open Blockers
            </div>
            <div className="mt-2 text-sm font-semibold text-slate-900">
              {openBlockers.length}
            </div>
          </div>
          <div className="rounded-3xl border border-slate-200 bg-slate-50 px-4 py-3">
            <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
              Drafts
            </div>
            <div className="mt-2 text-sm font-semibold text-slate-900">
              {currentRun.drafts.length}
            </div>
          </div>
        </section>

        <section className={`rounded-3xl border px-4 py-4 ${readinessTone}`}>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em]">
                Run Readiness
              </p>
              <h2 className="mt-1 text-base font-semibold">{readinessLabel}</h2>
              <p className="mt-1 text-sm opacity-90">{readinessDescription}</p>
            </div>
            <div className="text-sm font-medium">
              {currentRun.linkedArticle ? 'Linked to article draft' : 'Pre-publication workflow'}
            </div>
          </div>
        </section>

        {activeTab === 'details' ? (
          <div className="grid gap-4 lg:grid-cols-2">
            <section className="admin-list rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="space-y-4">
                <label className="admin-list-filter">
                  <span className="admin-list-filter-label">Topic</span>
                  <input
                    className="admin-list-filter-input"
                    defaultValue={currentRun.topic}
                    onBlur={(event) => {
                      if (event.target.value !== currentRun.topic) {
                        patchRun({ topic: event.target.value });
                      }
                    }}
                  />
                </label>
                <label className="admin-list-filter">
                  <span className="admin-list-filter-label">Title</span>
                  <input
                    className="admin-list-filter-input"
                    defaultValue={currentRun.title || ''}
                    onBlur={(event) => patchRun({ title: event.target.value })}
                  />
                </label>
                <label className="admin-list-filter">
                  <span className="admin-list-filter-label">Subject</span>
                  <input
                    className="admin-list-filter-input"
                    defaultValue={currentRun.subjectName || ''}
                    onBlur={(event) => patchRun({ subjectName: event.target.value })}
                  />
                </label>
                <label className="admin-list-filter">
                  <span className="admin-list-filter-label">Status</span>
                  <select
                    className="admin-list-cell-select"
                    value={currentRun.status}
                    onChange={(event) => patchRun({ status: event.target.value })}
                    disabled={saving || !canEditRun}
                  >
                    {[
                      'NEW',
                      'NEEDS_REVIEW',
                      'SOURCE_PACKET_IN_PROGRESS',
                      'READY_FOR_DRAFT',
                      'BLOCKED',
                      'DRAFT_CREATED',
                      'ARCHIVED',
                    ].map((status) => (
                      <option key={status} value={status}>
                        {status}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="admin-list-filter">
                  <span className="admin-list-filter-label">Assignee</span>
                  <select
                    className="admin-list-cell-select"
                    value={currentRun.assignedToUserId || ''}
                    onChange={(event) =>
                      patchRun({ assignedToUserId: event.target.value || null })
                    }
                    disabled={saving || !canAssignRun}
                  >
                    <option value="">Unassigned</option>
                    {assignees.map((assignee) => (
                      <option key={assignee.id} value={assignee.id}>
                        {assignee.firstName} {assignee.lastName}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
            </section>

            <section className="admin-list rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="space-y-4">
                <label className="admin-list-filter">
                  <span className="admin-list-filter-label">Request Summary</span>
                  <textarea
                    className="admin-list-filter-input min-h-[140px]"
                    defaultValue={currentRun.requestSummary || ''}
                    onBlur={(event) => patchRun({ requestSummary: event.target.value })}
                  />
                </label>
                <label className="admin-list-filter">
                  <span className="admin-list-filter-label">Editor Notes</span>
                  <textarea
                    className="admin-list-filter-input min-h-[140px]"
                    defaultValue={currentRun.editorNotes || ''}
                    onBlur={(event) => patchRun({ editorNotes: event.target.value })}
                  />
                </label>
                {currentRun.linkedArticle ? (
                <div className="text-sm text-slate-600">
                  Linked article:{' '}
                    <Link
                      href={`/local-life/submit?edit=${currentRun.linkedArticle.id}`}
                      className="admin-list-link"
                    >
                      {currentRun.linkedArticle.title}
                    </Link>
                  </div>
                ) : null}
                {!canAssignRun ? (
                  <div className="text-xs text-slate-500">
                    This role can review the assignee, but assignment changes require editor access.
                  </div>
                ) : null}
              </div>
            </section>
          </div>
        ) : null}

        {activeTab === 'interviews' ? (
          <div className="space-y-4">
            <section className="admin-list rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="mb-4 flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-sm font-semibold text-slate-900">Interview Requests</h3>
                  <p className="text-xs text-slate-500">
                    Queue setup-driven interviews against this run before any browser session exists.
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    `Invite` moves the request into a shareable state. `Copy Link` gives staff the exact browser-session URL to send once the request is openable.
                  </p>
                </div>
                {!canEditRun ? (
                  <div className="text-xs text-slate-500">
                    This role can review interview setup but cannot change it.
                  </div>
                ) : null}
              </div>
              <div className="admin-list-table-wrap">
                <table className="admin-list-table">
                  <thead className="admin-list-head">
                    <tr>
                      <th className="admin-list-header-cell">Interviewee</th>
                      <th className="admin-list-header-cell">Type</th>
                      <th className="admin-list-header-cell">Priority</th>
                      <th className="admin-list-header-cell">Status</th>
                      <th className="admin-list-header-cell">Language</th>
                      <th className="admin-list-header-cell">Schedule</th>
                      <th className="admin-list-header-cell">Session</th>
                      <th className="admin-list-header-cell">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {interviews.length === 0 ? (
                      <tr className="admin-list-row">
                        <td className="admin-list-empty" colSpan={8}>
                          No interview requests yet.
                        </td>
                      </tr>
                    ) : (
                      interviews.map((interview: any) => {
                        const latestSession = interview.sessions?.[0] || null;
                        const interviewAccessState = getReporterInterviewAccessState(interview.status);
                        const hasInviteTarget = Boolean(interview.intervieweeUserId || interview.inviteEmail);
                        return (
                          <tr key={interview.id} className="admin-list-row">
                            <td className="admin-list-cell">
                              <div
                                className="max-w-[220px] truncate text-sm font-medium text-slate-900 md:max-w-[280px]"
                                title={interview.intervieweeName}
                              >
                                {interview.intervieweeName}
                              </div>
                              <div className="text-xs text-slate-500">
                                {interview.relationshipToStory || interview.inviteEmail || 'No relationship note'}
                              </div>
                            </td>
                            <td className="admin-list-cell">{interview.interviewType}</td>
                            <td className="admin-list-cell">{interview.priority}</td>
                            <td className="admin-list-cell">
                              <div>{interview.status}</div>
                              <div className="text-xs text-slate-500">
                                {interviewAccessState.canOpenSession ? 'Openable' : 'Draft only'}
                              </div>
                              <div
                                className="mt-1 max-w-[220px] text-xs leading-5 text-slate-500"
                                title={getInterviewStatusGuidance(interview)}
                              >
                                {getInterviewStatusGuidance(interview)}
                              </div>
                            </td>
                            <td className="admin-list-cell">
                              {interview.interviewLanguage || interview.suggestedLanguage}
                            </td>
                            <td className="admin-list-cell">
                              {interview.scheduledFor
                                ? new Date(interview.scheduledFor).toLocaleString('en-US', {
                                    month: 'short',
                                    day: 'numeric',
                                    year: 'numeric',
                                    hour: 'numeric',
                                    minute: '2-digit',
                                  })
                                : 'Unscheduled'}
                            </td>
                            <td className="admin-list-cell">
                              {latestSession ? (
                                <div className="space-y-1">
                                  <div>
                                    {latestSession.status}
                                    {latestSession.language ? ` • ${latestSession.language}` : ''}
                                  </div>
                                  {latestSession.status === 'COMPLETED' ? (
                                    <div className="text-xs text-slate-500">
                                      {(latestSession.turns || []).length} turns • {(latestSession.facts || []).length} facts
                                      {(latestSession.safetyFlags || []).length
                                        ? ` • ${(latestSession.safetyFlags || []).length} safety flag${(latestSession.safetyFlags || []).length === 1 ? '' : 's'}`
                                        : ''}
                                    </div>
                                  ) : null}
                                </div>
                              ) : (
                                'No session'
                              )}
                            </td>
                            <td className="admin-list-cell">
                              {canEditRun ? (
                                <div className="flex min-w-[44px] items-center justify-end gap-2">
                                  {interviewAccessState.canOpenSession ? (
                                    <Link
                                      href={`/interviews/${interview.id}`}
                                      className="inline-flex h-9 shrink-0 items-center justify-center rounded-full border border-sky-300 bg-sky-50 px-3 text-xs font-semibold uppercase tracking-[0.12em] text-sky-700 shadow-sm transition hover:border-sky-600 hover:bg-sky-100 hover:text-sky-800"
                                      title="Open interview session"
                                    >
                                      Open
                                    </Link>
                                  ) : null}
                                  {interviewAccessState.canOpenSession ? (
                                    <button
                                      type="button"
                                      className={`inline-flex h-9 shrink-0 items-center justify-center rounded-full border px-3 text-xs font-semibold uppercase tracking-[0.12em] shadow-sm transition ${
                                        copiedInterviewId === interview.id
                                          ? 'border-emerald-300 bg-emerald-50 text-emerald-700'
                                          : 'border-slate-300 bg-slate-50 text-slate-700 hover:border-slate-600 hover:bg-slate-100 hover:text-slate-900'
                                      }`}
                                      onClick={() => handleCopyInterviewLink(interview.id)}
                                      title="Copy interview session link"
                                    >
                                      {copiedInterviewId === interview.id ? 'Copied' : 'Copy Link'}
                                    </button>
                                  ) : null}
                                  {!interviewAccessState.canOpenSession && hasInviteTarget ? (
                                    <button
                                      type="button"
                                      className="inline-flex h-9 shrink-0 items-center justify-center rounded-full border border-emerald-300 bg-emerald-50 px-3 text-xs font-semibold uppercase tracking-[0.12em] text-emerald-700 shadow-sm transition hover:border-emerald-600 hover:bg-emerald-100 hover:text-emerald-800 disabled:cursor-not-allowed disabled:opacity-50"
                                      onClick={() => handleInterviewAction(interview.id, 'invite')}
                                      disabled={interviewActionId === interview.id}
                                    >
                                      Invite
                                    </button>
                                  ) : null}
                                  {(interview.status === 'COMPLETED' ||
                                    interview.status === 'BLOCKED' ||
                                    interview.status === 'NO_SHOW' ||
                                    interview.status === 'DECLINED') &&
                                  hasInviteTarget ? (
                                    <button
                                      type="button"
                                      className="inline-flex h-9 shrink-0 items-center justify-center rounded-full border border-amber-300 bg-amber-50 px-3 text-xs font-semibold uppercase tracking-[0.12em] text-amber-700 shadow-sm transition hover:border-amber-600 hover:bg-amber-100 hover:text-amber-800 disabled:cursor-not-allowed disabled:opacity-50"
                                      onClick={() => handleInterviewAction(interview.id, 'reopen')}
                                      disabled={interviewActionId === interview.id}
                                    >
                                      Reopen
                                    </button>
                                  ) : null}
                                  <button
                                    type="button"
                                    className="inline-flex h-9 shrink-0 items-center justify-center rounded-full border border-slate-300 bg-slate-50 px-3 text-xs font-semibold uppercase tracking-[0.12em] text-slate-700 shadow-sm transition hover:border-slate-600 hover:bg-slate-100 hover:text-slate-900"
                                    onClick={() => populateInterviewForm(interview)}
                                  >
                                    Edit
                                  </button>
                                </div>
                              ) : (
                                <span className="text-xs text-slate-500">View only</span>
                              )}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </section>

            {completedInterviewSessions.length > 0 ? (
              <section className="admin-list rounded-3xl border border-emerald-200 bg-emerald-50 p-4 shadow-sm">
                <div className="mb-4">
                  <h3 className="text-sm font-semibold text-emerald-950">Completed Interview Output</h3>
                  <p className="text-xs text-emerald-900/80">
                    Completed browser interviews now return transcript-backed source material into this reporter run.
                  </p>
                </div>
                <div className="space-y-4">
                  {completedInterviewSessions.map(({ interview, session }: any) => (
                    <div
                      key={session.id}
                      className="rounded-[24px] border border-emerald-200 bg-white px-4 py-4"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <div className="text-sm font-semibold text-slate-950">
                            {interview.intervieweeName}
                          </div>
                          <div className="text-xs text-slate-500">
                            {interview.interviewType} • {session.language} • {(session.turns || []).length} turns • {(session.facts || []).length} facts
                          </div>
                          <div className="mt-1 text-xs text-slate-500">
                            {session.reviewedAt
                              ? `Reviewed by ${session.reviewedBy ? `${session.reviewedBy.firstName} ${session.reviewedBy.lastName}` : 'staff'}`
                              : 'Editorial review still required'}
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-2">
                          <div className="text-xs text-slate-500">
                            {session.completedAt
                              ? new Date(session.completedAt).toLocaleString('en-US', {
                                  month: 'short',
                                  day: 'numeric',
                                  year: 'numeric',
                                  hour: 'numeric',
                                  minute: '2-digit',
                                })
                              : 'Completed'}
                          </div>
                          {canEditRun ? (
                            <button
                              type="button"
                              className={`inline-flex h-8 shrink-0 items-center justify-center rounded-full border px-3 text-[11px] font-semibold uppercase tracking-[0.12em] shadow-sm transition disabled:cursor-not-allowed disabled:opacity-50 ${
                                session.reviewedAt
                                  ? 'border-emerald-300 bg-emerald-50 text-emerald-700'
                                  : 'border-slate-300 bg-slate-50 text-slate-700 hover:border-slate-600 hover:bg-slate-100 hover:text-slate-900'
                              }`}
                              onClick={() => handleReviewInterviewSession(session.id)}
                              disabled={Boolean(session.reviewedAt) || reviewingSessionId === session.id}
                            >
                              {session.reviewedAt
                                ? 'Reviewed'
                                : reviewingSessionId === session.id
                                  ? 'Reviewing...'
                                  : 'Mark Reviewed'}
                            </button>
                          ) : null}
                        </div>
                      </div>

                      {session.englishSummary ? (
                        <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm leading-6 text-slate-700">
                          {session.englishSummary}
                        </div>
                      ) : null}

                      {session.facts?.length ? (
                        <div className="mt-4">
                          <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                            Facts And Follow-Ups
                          </div>
                          <div className="space-y-2">
                            {session.facts.map((fact: any) => (
                              <div
                                key={fact.id}
                                className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3"
                              >
                                <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                                  {fact.factType}
                                  {fact.sourceLabel ? ` • ${fact.sourceLabel}` : ''}
                                </div>
                                <div className="mt-1 text-sm font-medium text-slate-900">
                                  {fact.summary}
                                </div>
                                {fact.detail ? (
                                  <div className="mt-1 text-sm leading-6 text-slate-600">
                                    {fact.detail}
                                  </div>
                                ) : null}
                              </div>
                            ))}
                          </div>
                        </div>
                      ) : null}

                      {session.safetyFlags?.length ? (
                        <div className="mt-4">
                          <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-rose-700">
                            Safety Review Flags
                          </div>
                          <div className="space-y-2">
                            {session.safetyFlags.map((flag: any) => (
                              <div
                                key={flag.id}
                                className="rounded-2xl border border-rose-200 bg-rose-50 px-3 py-3"
                              >
                                {(() => {
                                  const linkedBlocker = currentRun.blockers.find(
                                    (blocker: any) => blocker.id === flag.blockerId
                                  );

                                  return (
                                    <>
                                <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-rose-700">
                                  {flag.flagType}
                                </div>
                                <div className="mt-1 text-sm font-medium text-rose-950">
                                  {flag.headline}
                                </div>
                                {flag.evidenceSpan ? (
                                  <div className="mt-1 text-sm text-rose-900">
                                    Evidence: &quot;{flag.evidenceSpan}&quot;
                                  </div>
                                ) : null}
                                {flag.detail ? (
                                  <div className="mt-1 text-sm leading-6 text-rose-900/90">
                                    {flag.detail}
                                  </div>
                                ) : null}
                                <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
                                  <div className="text-xs text-rose-700">
                                    {flag.blockerId
                                      ? linkedBlocker?.isResolved
                                        ? 'Linked blocker resolved'
                                        : 'Linked blocker created on reporter run'
                                      : 'No linked blocker'}
                                  </div>
                                  {flag.blockerId && linkedBlocker && canEditRun ? (
                                    <button
                                      type="button"
                                      className={`inline-flex h-8 shrink-0 items-center justify-center rounded-full border px-3 text-[11px] font-semibold uppercase tracking-[0.12em] shadow-sm transition ${
                                        linkedBlocker.isResolved
                                          ? 'border-amber-300 bg-amber-50 text-amber-700 hover:border-amber-500 hover:bg-amber-100 hover:text-amber-800'
                                          : 'border-emerald-300 bg-emerald-50 text-emerald-700 hover:border-emerald-600 hover:bg-emerald-100 hover:text-emerald-800'
                                      }`}
                                      onClick={() =>
                                        handleResolveBlocker(
                                          linkedBlocker.id,
                                          !linkedBlocker.isResolved
                                        )
                                      }
                                    >
                                      {linkedBlocker.isResolved ? 'Reopen blocker' : 'Resolve blocker'}
                                    </button>
                                  ) : null}
                                </div>
                                    </>
                                  );
                                })()}
                              </div>
                            ))}
                          </div>
                        </div>
                      ) : null}

                      {session.transcriptText ? (
                        <details className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                          <summary className="cursor-pointer text-sm font-semibold text-slate-900">
                            Transcript
                          </summary>
                          <div className="mt-3 whitespace-pre-wrap text-sm leading-6 text-slate-700">
                            {session.transcriptText}
                          </div>
                        </details>
                      ) : null}
                    </div>
                  ))}
                </div>
              </section>
            ) : null}

            {canEditRun ? (
              <section className="admin-list rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="mb-4 flex items-center justify-between gap-3">
                  <div>
                    <h3 className="text-sm font-semibold text-slate-900">
                      {editingInterviewId ? 'Edit Interview Request' : 'Add Interview Request'}
                    </h3>
                    <p className="text-xs text-slate-500">
                      Capture who should be interviewed, why they matter, and what the newsroom needs to learn.
                    </p>
                  </div>
                  {editingInterviewId ? (
                    <button
                      type="button"
                      className="admin-list-cell-button"
                      onClick={resetInterviewForm}
                    >
                      Cancel Edit
                    </button>
                  ) : null}
                </div>
                <form className="grid gap-4 md:grid-cols-2" onSubmit={handleSaveInterview}>
                  <label className="admin-list-filter">
                    <span className="admin-list-filter-label">Interviewee</span>
                    <input
                      className="admin-list-filter-input"
                      value={interviewForm.intervieweeName}
                      onChange={(event) =>
                        setInterviewForm((prev) => ({
                          ...prev,
                          intervieweeName: event.target.value,
                        }))
                      }
                      required
                    />
                  </label>
                  <label className="admin-list-filter">
                    <span className="admin-list-filter-label">Invite Email</span>
                    <input
                      className="admin-list-filter-input"
                      type="email"
                      value={interviewForm.inviteEmail}
                      onChange={(event) =>
                        setInterviewForm((prev) => ({
                          ...prev,
                          inviteEmail: event.target.value,
                        }))
                      }
                    />
                  </label>
                  <label className="admin-list-filter">
                    <span className="admin-list-filter-label">Interview Type</span>
                    <select
                      className="admin-list-cell-select"
                      value={interviewForm.interviewType}
                      onChange={(event) =>
                        setInterviewForm((prev) => ({
                          ...prev,
                          interviewType: event.target.value,
                        }))
                      }
                    >
                      {REPORTER_INTERVIEW_TYPE_OPTIONS.map((type) => (
                        <option key={type} value={type}>
                          {type}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="admin-list-filter">
                    <span className="admin-list-filter-label">Priority</span>
                    <select
                      className="admin-list-cell-select"
                      value={interviewForm.priority}
                      onChange={(event) =>
                        setInterviewForm((prev) => ({
                          ...prev,
                          priority: event.target.value,
                        }))
                      }
                    >
                      {REPORTER_INTERVIEW_PRIORITY_OPTIONS.map((priority) => (
                        <option key={priority} value={priority}>
                          {priority}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="admin-list-filter">
                    <span className="admin-list-filter-label">Status</span>
                    <select
                      className="admin-list-cell-select"
                      value={interviewForm.status}
                      onChange={(event) =>
                        setInterviewForm((prev) => ({ ...prev, status: event.target.value }))
                      }
                    >
                      {REPORTER_INTERVIEW_REQUEST_STATUS_OPTIONS.map((status) => (
                        <option key={status} value={status}>
                          {status}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="admin-list-filter">
                    <span className="admin-list-filter-label">Relationship To Story</span>
                    <input
                      className="admin-list-filter-input"
                      value={interviewForm.relationshipToStory}
                      onChange={(event) =>
                        setInterviewForm((prev) => ({
                          ...prev,
                          relationshipToStory: event.target.value,
                        }))
                      }
                    />
                  </label>
                  <label className="admin-list-filter">
                    <span className="admin-list-filter-label">Suggested Language</span>
                    <select
                      className="admin-list-cell-select"
                      value={interviewForm.suggestedLanguage}
                      onChange={(event) =>
                        setInterviewForm((prev) => ({
                          ...prev,
                          suggestedLanguage: event.target.value,
                        }))
                      }
                    >
                      {REPORTER_SUPPORTED_LANGUAGE_OPTIONS.map((language) => (
                        <option key={language} value={language}>
                          {language}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="admin-list-filter">
                    <span className="admin-list-filter-label">Native Language</span>
                    <select
                      className="admin-list-cell-select"
                      value={interviewForm.nativeLanguage}
                      onChange={(event) =>
                        setInterviewForm((prev) => ({
                          ...prev,
                          nativeLanguage: event.target.value,
                        }))
                      }
                    >
                      <option value="">Unspecified</option>
                      {REPORTER_SUPPORTED_LANGUAGE_OPTIONS.map((language) => (
                        <option key={language} value={language}>
                          {language}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="admin-list-filter">
                    <span className="admin-list-filter-label">Interview Language</span>
                    <select
                      className="admin-list-cell-select"
                      value={interviewForm.interviewLanguage}
                      onChange={(event) =>
                        setInterviewForm((prev) => ({
                          ...prev,
                          interviewLanguage: event.target.value,
                        }))
                      }
                    >
                      <option value="">Confirm in session</option>
                      {REPORTER_SUPPORTED_LANGUAGE_OPTIONS.map((language) => (
                        <option key={language} value={language}>
                          {language}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="admin-list-filter">
                    <span className="admin-list-filter-label">Scheduled For</span>
                    <input
                      className="admin-list-filter-input"
                      type="datetime-local"
                      value={interviewForm.scheduledFor}
                      onChange={(event) =>
                        setInterviewForm((prev) => ({
                          ...prev,
                          scheduledFor: event.target.value,
                        }))
                      }
                    />
                  </label>
                  <label className="admin-list-filter md:col-span-2">
                    <span className="admin-list-filter-label">Purpose</span>
                    <textarea
                      className="admin-list-filter-input min-h-[100px]"
                      value={interviewForm.purpose}
                      onChange={(event) =>
                        setInterviewForm((prev) => ({ ...prev, purpose: event.target.value }))
                      }
                      required
                    />
                  </label>
                  <label className="admin-list-filter md:col-span-2">
                    <span className="admin-list-filter-label">Must Learn</span>
                    <textarea
                      className="admin-list-filter-input min-h-[100px]"
                      value={interviewForm.mustLearn}
                      onChange={(event) =>
                        setInterviewForm((prev) => ({ ...prev, mustLearn: event.target.value }))
                      }
                    />
                  </label>
                  <label className="admin-list-filter md:col-span-2">
                    <span className="admin-list-filter-label">Editor Brief</span>
                    <textarea
                      className="admin-list-filter-input min-h-[100px]"
                      value={interviewForm.editorBrief}
                      onChange={(event) =>
                        setInterviewForm((prev) => ({ ...prev, editorBrief: event.target.value }))
                      }
                    />
                  </label>
                  <label className="admin-list-filter md:col-span-2">
                    <span className="admin-list-filter-label">Known Context</span>
                    <textarea
                      className="admin-list-filter-input min-h-[100px]"
                      value={interviewForm.knownContext}
                      onChange={(event) =>
                        setInterviewForm((prev) => ({ ...prev, knownContext: event.target.value }))
                      }
                    />
                  </label>
                  <label className="admin-list-filter md:col-span-2">
                    <span className="admin-list-filter-label">Sensitivity Notes</span>
                    <textarea
                      className="admin-list-filter-input min-h-[100px]"
                      value={interviewForm.sensitivityNotes}
                      onChange={(event) =>
                        setInterviewForm((prev) => ({
                          ...prev,
                          sensitivityNotes: event.target.value,
                        }))
                      }
                    />
                  </label>
                  <label className="admin-list-filter md:col-span-2">
                    <span className="flex items-center gap-3 text-sm font-medium text-slate-700">
                      <input
                        type="checkbox"
                        checked={interviewForm.requiresTranslationSupport}
                        onChange={(event) =>
                          setInterviewForm((prev) => ({
                            ...prev,
                            requiresTranslationSupport: event.target.checked,
                          }))
                        }
                      />
                      Translation support likely needed
                    </span>
                  </label>
                  <div className="md:col-span-2 flex justify-end">
                    <button
                      type="submit"
                      className="page-header-action"
                      disabled={savingInterview}
                    >
                      {savingInterview
                        ? editingInterviewId
                          ? 'Saving...'
                          : 'Adding...'
                        : editingInterviewId
                          ? 'Save Interview Request'
                          : 'Add Interview Request'}
                    </button>
                  </div>
                </form>
              </section>
            ) : null}
          </div>
        ) : null}

        {activeTab === 'sources' ? (
          <div className="space-y-4">
            <section className="admin-list rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="admin-list-table-wrap">
                <table className="admin-list-table">
                  <thead className="admin-list-head">
                    <tr>
                      <th className="admin-list-header-cell">Type</th>
                      <th className="admin-list-header-cell">Title</th>
                      <th className="admin-list-header-cell">Reliability</th>
                      <th className="admin-list-header-cell">Source</th>
                      <th className="admin-list-header-cell">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {currentRun.sources.length === 0 ? (
                      <tr className="admin-list-row">
                        <td className="admin-list-empty" colSpan={5}>
                          No sources yet.
                        </td>
                      </tr>
                    ) : (
                      currentRun.sources.map((source: any) => (
                        <tr key={source.id} className="admin-list-row">
                          <td className="admin-list-cell">{source.sourceType}</td>
                          <td className="admin-list-cell">
                            <div
                              className="max-w-[280px] truncate text-sm font-medium text-slate-900 md:max-w-[360px] lg:max-w-[440px]"
                              title={
                                source.title || source.note || source.contentText || 'Untitled source'
                              }
                            >
                              {source.title || source.note || source.contentText || 'Untitled source'}
                            </div>
                          </td>
                          <td className="admin-list-cell">{source.reliabilityTier}</td>
                          <td className="admin-list-cell">
                            {source.url ? (
                              <a
                                href={source.url}
                                target="_blank"
                                rel="noreferrer"
                                className="admin-list-link"
                              >
                                Link
                              </a>
                            ) : (
                              'Inline note'
                            )}
                          </td>
                          <td className="admin-list-cell">
                            {canManageSources ? (
                              <div className="flex min-w-[88px] items-center justify-end gap-2">
                                <button
                                  type="button"
                                  className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-slate-400 bg-slate-100 text-slate-700 shadow-sm transition hover:border-slate-900 hover:bg-slate-200 hover:text-slate-950 disabled:cursor-not-allowed disabled:opacity-50"
                                  onClick={() => populateSourceForm(source)}
                                  disabled={!canManageSources}
                                  aria-label={`Edit source ${source.title || source.id}`}
                                  title="Edit source"
                                >
                                  <EditIcon />
                                </button>
                                <button
                                  type="button"
                                  className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-rose-300 bg-rose-50 text-rose-700 shadow-sm transition hover:border-rose-600 hover:bg-rose-100 hover:text-rose-800 disabled:cursor-not-allowed disabled:opacity-50"
                                  onClick={() => handleDeleteSource(source.id)}
                                  disabled={!canManageSources || deletingSourceId === source.id}
                                  aria-label={`Delete source ${source.title || source.id}`}
                                  title="Delete source"
                                >
                                  <DeleteIcon />
                                </button>
                              </div>
                            ) : (
                              <span className="text-xs text-slate-500">View only</span>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </section>

            {canManageSources ? (
            <section className="admin-list rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="mb-4 flex items-center justify-between gap-3">
                <div>
                  <h3 className="text-sm font-semibold text-slate-900">
                    {editingSourceId ? 'Edit Source' : 'Add Source'}
                  </h3>
                  <p className="text-xs text-slate-500">
                    Track the source packet with notes, links, and reliability context.
                  </p>
                </div>
                {editingSourceId ? (
                  <button
                    type="button"
                    className="admin-list-cell-button"
                    onClick={resetSourceForm}
                  >
                    Cancel Edit
                  </button>
                ) : null}
              </div>
              <form className="grid gap-4 md:grid-cols-2" onSubmit={handleAddSource}>
                <label className="admin-list-filter">
                  <span className="admin-list-filter-label">Source Type</span>
                  <select
                    className="admin-list-cell-select"
                    value={sourceForm.sourceType}
                    onChange={(event) =>
                      setSourceForm((prev) => ({ ...prev, sourceType: event.target.value }))
                    }
                  >
                    {[
                      'STAFF_NOTE',
                      'USER_NOTE',
                      'OFFICIAL_URL',
                      'NEWS_ARTICLE',
                      'DOCUMENT',
                      'TRANSCRIPT_EXCERPT',
                    ].map((sourceType) => (
                      <option key={sourceType} value={sourceType}>
                        {sourceType}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="admin-list-filter">
                  <span className="admin-list-filter-label">Reliability</span>
                  <select
                    className="admin-list-cell-select"
                    value={sourceForm.reliabilityTier}
                    onChange={(event) =>
                      setSourceForm((prev) => ({
                        ...prev,
                        reliabilityTier: event.target.value,
                      }))
                    }
                  >
                    {['UNVERIFIED', 'LOW', 'MEDIUM', 'HIGH', 'PRIMARY'].map((tier) => (
                      <option key={tier} value={tier}>
                        {tier}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="admin-list-filter md:col-span-2">
                  <span className="admin-list-filter-label">Title</span>
                  <input
                    className="admin-list-filter-input"
                    value={sourceForm.title}
                    onChange={(event) =>
                      setSourceForm((prev) => ({ ...prev, title: event.target.value }))
                    }
                  />
                </label>
                <label className="admin-list-filter">
                  <span className="admin-list-filter-label">Publisher</span>
                  <input
                    className="admin-list-filter-input"
                    value={sourceForm.publisher}
                    onChange={(event) =>
                      setSourceForm((prev) => ({ ...prev, publisher: event.target.value }))
                    }
                  />
                </label>
                <label className="admin-list-filter">
                  <span className="admin-list-filter-label">Author</span>
                  <input
                    className="admin-list-filter-input"
                    value={sourceForm.author}
                    onChange={(event) =>
                      setSourceForm((prev) => ({ ...prev, author: event.target.value }))
                    }
                  />
                </label>
                <label className="admin-list-filter md:col-span-2">
                  <span className="admin-list-filter-label">URL</span>
                  <input
                    className="admin-list-filter-input"
                    value={sourceForm.url}
                    onChange={(event) =>
                      setSourceForm((prev) => ({ ...prev, url: event.target.value }))
                    }
                    placeholder="example.com/story or https://example.com/story"
                  />
                </label>
                <label className="admin-list-filter md:col-span-2">
                  <span className="admin-list-filter-label">Excerpt</span>
                  <textarea
                    className="admin-list-filter-input min-h-[100px]"
                    value={sourceForm.excerpt}
                    onChange={(event) =>
                      setSourceForm((prev) => ({ ...prev, excerpt: event.target.value }))
                    }
                  />
                </label>
                <label className="admin-list-filter md:col-span-2">
                  <span className="admin-list-filter-label">Staff Note</span>
                  <textarea
                    className="admin-list-filter-input min-h-[100px]"
                    value={sourceForm.note}
                    onChange={(event) =>
                      setSourceForm((prev) => ({ ...prev, note: event.target.value }))
                    }
                  />
                </label>
                <label className="admin-list-filter md:col-span-2">
                  <span className="admin-list-filter-label">Content / Note</span>
                  <textarea
                    className="admin-list-filter-input min-h-[140px]"
                    value={sourceForm.contentText}
                    onChange={(event) =>
                      setSourceForm((prev) => ({ ...prev, contentText: event.target.value }))
                    }
                  />
                </label>
                <div className="md:col-span-2 flex justify-end">
                  <button
                    type="submit"
                    className="page-header-action"
                    disabled={savingSource}
                  >
                    {savingSource
                      ? editingSourceId
                        ? 'Saving...'
                        : 'Adding...'
                      : editingSourceId
                        ? 'Save Source'
                        : 'Add Source'}
                  </button>
                </div>
              </form>
            </section>
            ) : (
              <section className="rounded-3xl border border-slate-200 bg-slate-50 px-4 py-4 text-sm text-slate-600">
                This role can view the source packet but cannot change sources.
              </section>
            )}
          </div>
        ) : null}

        {activeTab === 'blockers' ? (
          <div className="space-y-4">
            <section className="admin-list rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="admin-list-table-wrap">
                <table className="admin-list-table">
                  <thead className="admin-list-head">
                    <tr>
                      <th className="admin-list-header-cell">Code</th>
                      <th className="admin-list-header-cell">Message</th>
                      <th className="admin-list-header-cell">State</th>
                      <th className="admin-list-header-cell">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {currentRun.blockers.length === 0 ? (
                      <tr className="admin-list-row">
                        <td className="admin-list-empty" colSpan={4}>
                          No blockers yet.
                        </td>
                      </tr>
                    ) : (
                      currentRun.blockers.map((blocker: any) => (
                        <tr key={blocker.id} className="admin-list-row">
                          <td className="admin-list-cell">{blocker.code}</td>
                          <td className="admin-list-cell">
                            <div
                              className="max-w-[320px] truncate text-sm text-slate-700 md:max-w-[420px] lg:max-w-[520px]"
                              title={blocker.message}
                            >
                              {blocker.message}
                            </div>
                          </td>
                          <td className="admin-list-cell">
                            {blocker.isResolved ? 'Resolved' : 'Open'}
                          </td>
                          <td className="admin-list-cell">
                            {canEditRun ? (
                              <div className="flex min-w-[44px] items-center justify-end">
                                <button
                                  type="button"
                                  className={`inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border shadow-sm transition disabled:cursor-not-allowed disabled:opacity-50 ${
                                    blocker.isResolved
                                      ? 'border-amber-300 bg-amber-50 text-amber-700 hover:border-amber-500 hover:bg-amber-100 hover:text-amber-800'
                                      : 'border-emerald-300 bg-emerald-50 text-emerald-700 hover:border-emerald-600 hover:bg-emerald-100 hover:text-emerald-800'
                                  }`}
                                  onClick={() =>
                                    handleResolveBlocker(blocker.id, !blocker.isResolved)
                                  }
                                  disabled={!canEditRun}
                                  aria-label={blocker.isResolved ? 'Reopen blocker' : 'Resolve blocker'}
                                  title={blocker.isResolved ? 'Reopen blocker' : 'Resolve blocker'}
                                >
                                  {blocker.isResolved ? <ReopenIcon /> : <ResolveIcon />}
                                </button>
                              </div>
                            ) : (
                              <span className="text-xs text-slate-500">View only</span>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </section>

            {canEditRun ? (
            <section className="admin-list rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
              <form className="space-y-4" onSubmit={handleAddBlocker}>
                <label className="admin-list-filter">
                  <span className="admin-list-filter-label">Blocker Code</span>
                  <select
                    className="admin-list-cell-select"
                    value={blockerForm.code}
                    onChange={(event) =>
                      setBlockerForm((prev) => ({ ...prev, code: event.target.value }))
                    }
                  >
                    {BLOCKER_CODE_OPTIONS.map((code) => (
                      <option key={code} value={code}>
                        {code}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="admin-list-filter">
                  <span className="admin-list-filter-label">Message</span>
                  <textarea
                    className="admin-list-filter-input min-h-[140px]"
                    value={blockerForm.message}
                    onChange={(event) =>
                      setBlockerForm((prev) => ({ ...prev, message: event.target.value }))
                    }
                    placeholder="Describe the specific reporting gap or hold."
                  />
                </label>
                <div className="flex justify-end">
                  <button type="submit" className="page-header-action">
                    Add Blocker
                  </button>
                </div>
              </form>
            </section>
            ) : null}
          </div>
        ) : null}

        {activeTab === 'analysis' ? (
          <div className="space-y-4">
            <section className="admin-list rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="mb-4 flex justify-end">
                <button
                  type="button"
                  className="page-header-action"
                  onClick={handleGenerateAnalysis}
                  disabled={!hasSources || isGeneratingAnalysis}
                >
                  {isGeneratingAnalysis ? 'Analyzing...' : 'Generate Analysis'}
                </button>
              </div>
              {!hasSources ? (
                <div className="mb-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                  Add at least one source before generating Reporter Agent analysis.
                </div>
              ) : null}
              <div className="admin-list-table-wrap">
                <table className="admin-list-table">
                  <thead className="admin-list-head">
                    <tr>
                      <th className="admin-list-header-cell">Analysis</th>
                      <th className="admin-list-header-cell">Headline</th>
                      <th className="admin-list-header-cell">Model</th>
                      <th className="admin-list-header-cell">Created</th>
                      <th className="admin-list-header-cell">Preview</th>
                      <th className="admin-list-header-cell">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {analysisDrafts.length === 0 ? (
                      <tr className="admin-list-row">
                        <td className="admin-list-empty" colSpan={6}>
                          No Reporter Agent analysis yet.
                        </td>
                      </tr>
                    ) : (
                      analysisDrafts.map((draft: any, index: number) => (
                        <tr
                          key={draft.id}
                          className={`admin-list-row ${
                            selectedAnalysis?.id === draft.id ? 'bg-sky-50/70' : ''
                          }`}
                        >
                          <td className="admin-list-cell">
                            <span
                              className={`font-semibold ${
                                selectedAnalysis?.id === draft.id ? 'text-sky-900' : 'text-slate-900'
                              }`}
                            >
                              Analysis {analysisDrafts.length - index}
                            </span>
                          </td>
                          <td className="admin-list-cell">
                            <div
                              className="max-w-[260px] truncate text-sm font-medium text-slate-900 md:max-w-[340px] lg:max-w-[420px]"
                              title={draft.headline || 'Reporter Agent Analysis'}
                            >
                              {draft.headline || 'Reporter Agent Analysis'}
                            </div>
                          </td>
                          <td className="admin-list-cell">
                            <div className="max-w-[180px] truncate text-sm text-slate-700">
                              {draft.modelProvider ? (
                                <span title={[draft.modelProvider, draft.modelName].filter(Boolean).join(' • ')}>
                                  {draft.modelProvider}
                                  {draft.modelName ? ` • ${draft.modelName}` : ''}
                                </span>
                              ) : (
                                <span className="text-slate-500">Fallback</span>
                              )}
                            </div>
                          </td>
                          <td className="admin-list-cell">
                            {draft.createdAt
                              ? new Date(draft.createdAt).toLocaleString('en-US', {
                                  month: 'short',
                                  day: 'numeric',
                                  year: 'numeric',
                                  hour: 'numeric',
                                  minute: '2-digit',
                                })
                              : '—'}
                          </td>
                          <td className="admin-list-cell">
                            <div
                              className="max-w-[260px] truncate text-sm text-slate-700 md:max-w-[340px] lg:max-w-[420px]"
                              title={draft.body}
                            >
                              {draft.body}
                            </div>
                          </td>
                          <td className="admin-list-cell">
                            <div className="flex min-w-[44px] items-center justify-end">
                              <button
                                type="button"
                                className={`inline-flex h-9 shrink-0 items-center justify-center rounded-full border px-3 text-xs font-semibold uppercase tracking-[0.12em] shadow-sm transition ${
                                  selectedAnalysis?.id === draft.id
                                    ? 'border-slate-700 bg-slate-900 text-white'
                                    : 'border-slate-300 bg-slate-50 text-slate-700 hover:border-slate-600 hover:bg-slate-100 hover:text-slate-900'
                                }`}
                                onClick={() => handleSelectAnalysis(draft.id)}
                                aria-label="View Reporter Agent analysis"
                                title="View Reporter Agent analysis"
                              >
                                View
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </section>

          </div>
        ) : null}

        {activeTab === 'drafts' ? (
          <div className="space-y-4">
            <section className="admin-list rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="mb-4 flex justify-end">
                <button
                  type="button"
                  className="page-header-action"
                  onClick={handleGenerateDraft}
                  disabled={!canDraftNow || isGeneratingDraft}
                >
                  {isGeneratingDraft ? 'Generating...' : 'Generate Draft'}
                </button>
              </div>
              {!canGenerateDraft ? (
                <div className="mb-4 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
                  This role can review drafts but cannot generate them.
                </div>
              ) : null}
              {canGenerateDraft && !canDraftNow ? (
                <div className="mb-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                  {draftGenerationBlockedReason}
                </div>
              ) : null}
              <div className="mb-4 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
                `View` opens the selected reporter draft in a dialog. `Article` opens the linked article editor in `/local-life/submit`.
              </div>
              <div className="admin-list-table-wrap">
                <table className="admin-list-table">
                  <thead className="admin-list-head">
                    <tr>
                      <th className="admin-list-header-cell">Draft</th>
                      <th className="admin-list-header-cell">Headline</th>
                      <th className="admin-list-header-cell">Type</th>
                      <th className="admin-list-header-cell">Status</th>
                      <th className="admin-list-header-cell">Model</th>
                      <th className="admin-list-header-cell">Created</th>
                      <th className="admin-list-header-cell">Preview</th>
                      <th className="admin-list-header-cell">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {articleDrafts.length === 0 ? (
                      <tr className="admin-list-row">
                        <td className="admin-list-empty" colSpan={8}>
                          No reporter drafts yet.
                        </td>
                      </tr>
                    ) : (
                      articleDrafts.map((draft: any, index: number) => (
                        <tr
                          key={draft.id}
                          className={`admin-list-row ${
                            selectedDraft?.id === draft.id ? 'bg-sky-50/70' : ''
                          }`}
                        >
                          <td className="admin-list-cell">
                            <span
                              className={`font-semibold ${
                                selectedDraft?.id === draft.id ? 'text-sky-900' : 'text-slate-900'
                              }`}
                            >
                              Draft {articleDrafts.length - index}
                            </span>
                          </td>
                          <td className="admin-list-cell">
                            <div
                              className="max-w-[260px] truncate text-sm font-medium text-slate-900 md:max-w-[340px] lg:max-w-[420px]"
                              title={draft.headline || 'Untitled draft'}
                            >
                              {draft.headline || 'Untitled draft'}
                            </div>
                          </td>
                          <td className="admin-list-cell">{draft.draftType}</td>
                          <td className="admin-list-cell">{draft.status}</td>
                          <td className="admin-list-cell">
                            <div className="max-w-[180px] truncate text-sm text-slate-700">
                              {draft.modelProvider ? (
                                <span title={[draft.modelProvider, draft.modelName].filter(Boolean).join(' • ')}>
                                  {draft.modelProvider}
                                  {draft.modelName ? ` • ${draft.modelName}` : ''}
                                </span>
                              ) : (
                                <span className="text-slate-500">Fallback</span>
                              )}
                            </div>
                          </td>
                          <td className="admin-list-cell">
                            {draft.createdAt
                              ? new Date(draft.createdAt).toLocaleString('en-US', {
                                  month: 'short',
                                  day: 'numeric',
                                  year: 'numeric',
                                  hour: 'numeric',
                                  minute: '2-digit',
                                })
                              : '—'}
                          </td>
                          <td className="admin-list-cell">
                            <div
                              className="max-w-[260px] truncate text-sm text-slate-700 md:max-w-[340px] lg:max-w-[420px]"
                              title={draft.body}
                            >
                              {draft.body}
                            </div>
                          </td>
                          <td className="admin-list-cell">
                            <div className="flex min-w-[148px] items-center justify-end gap-2">
                              <button
                                type="button"
                                className={`inline-flex h-9 shrink-0 items-center justify-center rounded-full border px-3 text-xs font-semibold uppercase tracking-[0.12em] shadow-sm transition ${
                                  selectedDraft?.id === draft.id
                                    ? 'border-slate-700 bg-slate-900 text-white'
                                    : 'border-slate-300 bg-slate-50 text-slate-700 hover:border-slate-600 hover:bg-slate-100 hover:text-slate-900'
                                }`}
                                onClick={() => handleSelectDraft(draft.id)}
                                aria-label="View reporter draft"
                                title="View reporter draft"
                              >
                                View
                              </button>
                              {currentRun.linkedArticle ? (
                                <Link
                                  href={`/local-life/submit?edit=${currentRun.linkedArticle.id}`}
                                  className="inline-flex h-9 shrink-0 items-center justify-center rounded-full border border-slate-300 bg-slate-50 px-3 text-xs font-semibold uppercase tracking-[0.12em] text-slate-700 shadow-sm transition hover:border-slate-600 hover:bg-slate-100 hover:text-slate-900"
                                  aria-label="Open linked article"
                                  title="Open linked article"
                                >
                                  Article
                                </Link>
                              ) : canConvertDraft ? (
                                <button
                                  type="button"
                                  className="inline-flex h-9 shrink-0 items-center justify-center rounded-full border border-sky-300 bg-sky-50 px-3 text-xs font-semibold uppercase tracking-[0.12em] text-sky-700 shadow-sm transition hover:border-sky-600 hover:bg-sky-100 hover:text-sky-800 disabled:cursor-not-allowed disabled:opacity-50"
                                  onClick={() => handleConvertDraft(draft.id)}
                                  disabled={
                                    !canConvertDraft ||
                                    Boolean(currentRun.linkedArticle) ||
                                    isConvertingDraft === draft.id
                                  }
                                  aria-label="Convert draft to article"
                                  title="Convert to article"
                                >
                                  Convert
                                </button>
                              ) : null}
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </section>

            {currentRun.validationIssues?.length ? (
              <section className="admin-list rounded-3xl border border-amber-200 bg-amber-50 p-4 shadow-sm">
                <div className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-amber-800">
                  Validation Issues
                </div>
                <div className="admin-list-table-wrap">
                  <table className="admin-list-table">
                    <thead className="admin-list-head">
                      <tr>
                        <th className="admin-list-header-cell">Severity</th>
                        <th className="admin-list-header-cell">Code</th>
                        <th className="admin-list-header-cell">Message</th>
                        <th className="admin-list-header-cell">Evidence</th>
                      </tr>
                    </thead>
                    <tbody>
                      {currentRun.validationIssues.map((issue: any) => (
                        <tr key={issue.id} className="admin-list-row">
                          <td className="admin-list-cell">{issue.severity}</td>
                          <td className="admin-list-cell">
                            <span className="font-mono text-xs text-slate-600">{issue.code}</span>
                          </td>
                          <td className="admin-list-cell">
                            <div
                              className="max-w-[320px] truncate text-sm text-slate-700 md:max-w-[420px] lg:max-w-[520px]"
                              title={issue.message}
                            >
                              {issue.message}
                            </div>
                          </td>
                          <td className="admin-list-cell">
                            {issue.evidenceSpan || '—'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            ) : null}
          </div>
        ) : null}
      </div>

      {previewDialog && dialogDraft ? (
        <div
          className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-950/70 px-4 py-6"
          role="dialog"
          aria-modal="true"
          aria-labelledby={previewDialogTitleId}
          onClick={() => setPreviewDialog(null)}
        >
          <div
            ref={previewDialogRef}
            className="max-h-[90vh] w-full max-w-5xl overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl"
            tabIndex={-1}
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-5 py-4">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  {dialogLabel ? (
                    <span className="rounded-full border border-sky-200 bg-sky-50 px-2 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-sky-800">
                      {dialogLabel}
                    </span>
                  ) : null}
                  <h2
                    id={previewDialogTitleId}
                    className="text-base font-semibold text-slate-900"
                  >
                    {dialogDraft.headline ||
                      (previewDialog.kind === 'analysis'
                        ? 'Reporter Agent Analysis'
                        : 'Untitled draft')}
                  </h2>
                </div>
                <p className="mt-1 text-xs text-slate-500">
                  {previewDialog.kind === 'draft'
                    ? `${dialogDraft.draftType} • ${dialogDraft.status}`
                    : 'SOURCE_PACKET_SUMMARY'}
                  {dialogDraft.modelProvider
                    ? ` • ${dialogDraft.modelProvider}${dialogDraft.modelName ? ` • ${dialogDraft.modelName}` : ''}`
                    : ' • Fallback'}
                </p>
              </div>
              <button
                ref={previewDialogCloseRef}
                type="button"
                className="inline-flex h-9 shrink-0 items-center justify-center rounded-full border border-slate-300 bg-slate-50 px-3 text-xs font-semibold uppercase tracking-[0.12em] text-slate-700 shadow-sm transition hover:border-slate-600 hover:bg-slate-100 hover:text-slate-900"
                onClick={() => setPreviewDialog(null)}
              >
                Close
              </button>
            </div>

            <div className="max-h-[calc(90vh-86px)] overflow-y-auto px-5 py-5">
              {dialogDraft.createdAt ? (
                <div className="mb-4 text-xs text-slate-500">
                  {new Date(dialogDraft.createdAt).toLocaleString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                    hour: 'numeric',
                    minute: '2-digit',
                  })}
                </div>
              ) : null}
              {dialogDraft.dek ? (
                <p className="mb-4 text-sm font-medium text-slate-700">{dialogDraft.dek}</p>
              ) : null}
              <div className="whitespace-pre-wrap rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-sm leading-6 text-slate-700">
                {dialogDraft.body}
              </div>
              {dialogDraft.generationNotes ? (
                <p className="mt-3 text-xs text-slate-500">{dialogDraft.generationNotes}</p>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
