'use client';

import Link from 'next/link';
import { useEffect, useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import ImageUpload from '@/components/shared/ImageUpload';
import TipTapEditor from '@/components/articles/TipTapEditor';
import ReporterHeroImageGenerator from '@/components/articles/ReporterHeroImageGenerator';

type Article = { id: string; slug: string; status: string; updatedAt: string };
export default function ReviewStoryClient({
  runId,
  draftId,
  initialRunVersion,
  initialArticle,
  initialTitle,
  initialBody,
  initialCategoryId,
  initialFeaturedImageUrl,
  initialFeaturedImageCaption,
  categories,
  canSave,
  canPublish,
  canRerun,
  problems,
  warnings,
  sources,
  criticalIssues,
  interviewReviewRequired,
}: {
  runId: string;
  draftId: string;
  initialRunVersion: string;
  initialArticle: Article | null;
  initialTitle: string;
  initialBody: string;
  initialCategoryId: string;
  initialFeaturedImageUrl: string | null;
  initialFeaturedImageCaption: string | null;
  categories: Array<{ id: string; name: string }>;
  canSave: boolean;
  canPublish: boolean;
  canRerun: boolean;
  interviewReviewRequired: boolean;
  criticalIssues: Array<{ id: string; message: string }>;
  problems: string[];
  warnings: string[];
  sources: Array<{
    id: string;
    title: string;
    url: string | null;
    text: string;
    reliability: string;
  }>;
}) {
  const [title, setTitle] = useState(initialTitle);
  const [body, setBody] = useState(initialBody);
  const [categoryId, setCategoryId] = useState(initialCategoryId);
  const [featuredImageUrl, setFeaturedImageUrl] = useState(initialFeaturedImageUrl || '');
  const [featuredImageCaption, setFeaturedImageCaption] = useState(initialFeaturedImageCaption || '');
  const [uploadingImage, setUploadingImage] = useState(false);
  const [generatingImage, setGeneratingImage] = useState(false);
  const [article, setArticle] = useState(initialArticle);
  const [runVersion, setRunVersion] = useState(initialRunVersion);
  const [addressed, setAddressed] = useState<string[]>([]);
  const [resolved, setResolved] = useState<string[]>([]);
  const remainingIssues = criticalIssues.filter(
    (issue) => !resolved.includes(issue.id)
  );
  const router = useRouter();
  const [refreshing, startRefresh] = useTransition();
  const [action, setAction] = useState<'save' | 'publish' | 'rerun' | null>(null);
  const busy = action !== null || refreshing || uploadingImage || generatingImage;
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const published = article?.status === 'PUBLISHED';
  const previousDraftId = useRef(draftId);
  const headlineInput = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (refreshing || previousDraftId.current === draftId) return;
    previousDraftId.current = draftId;
    setTitle(initialTitle);
    setBody(initialBody);
    setArticle(initialArticle);
    setRunVersion(initialRunVersion);
    setAddressed([]);
    setResolved([]);
    setError('');
    setNotice('Draft recreated. Review it before saving or publishing.');
    requestAnimationFrame(() => headlineInput.current?.focus());
  }, [draftId, initialTitle, initialBody, initialArticle, initialRunVersion, refreshing]);
  async function rerun() {
    setAction('rerun');
    setError('');
    setNotice('');
    try {
      const response = await fetch(`/api/reporter/runs/${runId}/draft`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ draftType: 'ARTICLE_DRAFT', forceRefresh: true }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Unable to recreate the draft.');
      startRefresh(() => router.refresh());
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : 'Unable to recreate the draft.');
    } finally {
      setAction(null);
    }
  }
  async function save(intent: 'save' | 'publish') {
    setAction(intent);
    setError('');
    setNotice('');
    try {
      const response = await fetch(`/api/reporter/runs/${runId}/editorial`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          intent,
          title,
          body,
          categoryId: categoryId || null,
          featuredImageUrl: featuredImageUrl || null,
          featuredImageCaption: featuredImageCaption.trim() || null,
          draftId,
          runVersion,
          articleVersion: article?.updatedAt || null,
          resolvedIssueIds: addressed,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Unable to save story.');
      setArticle(data.article);
      setBody(data.article.body);
      setRunVersion(data.runVersion);
      setResolved((current) => [...current, ...addressed]);
      setAddressed([]);
      setNotice(
        intent === 'publish'
          ? 'Story published.'
          : 'Draft saved. It has not been published.'
      );
    } catch (failure) {
      setError(
        failure instanceof Error ? failure.message : 'Unable to save story.'
      );
    } finally {
      setAction(null);
    }
  }
  return (
    <div className="admin-card">
      <div className="admin-card-body space-y-5">
        {notice ? <p role="status">{notice}</p> : null}
        {action === 'rerun' || refreshing ? (
          <p role="status">Researching sources and recreating the draft…</p>
        ) : null}
        {error ? (
          <p role="alert" className="admin-list-error">
            {error}
          </p>
        ) : null}
        {published ? (
          <p>
            This story is published.{' '}
            <Link
              className="admin-list-link"
              href={`/local-life/${article.id}`}
            >
              View published story
            </Link>
          </p>
        ) : (
          <>
            <p>
              Review the story and its sources, make any edits, then publish.
            </p>
            {problems.length ? (
              <div role="alert">
                <strong>Before publishing</strong>
                <ul>
                  {problems.map((problem, index) => (
                    <li key={index}>{problem}</li>
                  ))}
                </ul>
                <Link
                  className="admin-list-link"
                  href={`/admin/reporter/${runId}?view=${interviewReviewRequired ? 'interviews' : 'blockers'}`}
                >
                  {interviewReviewRequired
                    ? 'Review interview notes'
                    : 'Resolve reporting issues'}
                </Link>
              </div>
            ) : null}
            {remainingIssues.length ? (
              <section aria-label="Required corrections">
                <h2 className="form-label">
                  Correct these issues before publishing
                </h2>
                <p>
                  Check each item after correcting the story and checking its
                  sources.
                </p>
                {remainingIssues.map((issue) => (
                  <label key={issue.id} className="flex items-start gap-2">
                    <input
                      type="checkbox"
                      disabled={!canSave || busy}
                      checked={addressed.includes(issue.id)}
                      onChange={(event) =>
                        setAddressed((current) =>
                          event.target.checked
                            ? [...current, issue.id]
                            : current.filter((id) => id !== issue.id)
                        )
                      }
                    />
                    <span>I corrected: {issue.message}</span>
                  </label>
                ))}
              </section>
            ) : null}
            {warnings.length ? (
              <details>
                <summary>Review notes ({warnings.length})</summary>
                <ul>
                  {warnings.map((warning, index) => (
                    <li key={index}>{warning}</li>
                  ))}
                </ul>
              </details>
            ) : null}
            <fieldset disabled={busy || !canSave} className="space-y-4">
              <div>
                <label className="form-label" htmlFor="story-headline">
                  Headline (required)
                </label>
                <input
                  id="story-headline"
                  ref={headlineInput}
                  className="form-input"
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  maxLength={255}
                />
              </div>
              <div>
                <label className="form-label" htmlFor="story-category">
                  Category (required to publish)
                </label>
                <select
                  id="story-category"
                  className="form-input"
                  value={categoryId}
                  onChange={(event) => setCategoryId(event.target.value)}
                >
                  <option value="">Choose a category</option>
                  {categories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>
              </div>
            </fieldset>
            <fieldset disabled={busy || !canSave} className="space-y-3">
              <legend className="form-label">Article image (optional)</legend>
              {canSave ? (
                <ReporterHeroImageGenerator
                  key={draftId}
                  runId={runId}
                  draftId={draftId}
                  title={title}
                  body={body}
                  disabled={busy}
                  onGeneratingChange={setGeneratingImage}
                  onSelect={(image) => {
                    setFeaturedImageUrl(image.url);
                    setFeaturedImageCaption(image.caption);
                    setNotice('Hero image selected. Save to keep it with this draft.');
                  }}
                />
              ) : null}
              <ImageUpload
                label="Featured image (optional)"
                labelClassName="form-label"
                context="article"
                compact
                value={featuredImageUrl ? [featuredImageUrl] : []}
                disabled={busy || !canSave}
                onUploadingChange={setUploadingImage}
                onUpload={(image) => { setFeaturedImageUrl(image.url); setFeaturedImageCaption(''); }}
                onRemove={() => { setFeaturedImageUrl(''); setFeaturedImageCaption(''); }}
                helperText="JPG, PNG or WebP, up to 5MB. Shown at the top of the article and in story previews."
              />
              {featuredImageUrl ? (
                <div>
                  <label className="form-label" htmlFor="story-image-caption">Caption / photo credit (optional)</label>
                  <textarea id="story-image-caption" className="form-input" rows={2} maxLength={300}
                    value={featuredImageCaption} onChange={(event) => setFeaturedImageCaption(event.target.value)} />
                </div>
              ) : null}
              {uploadingImage ? <p role="status">Uploading article image…</p> : null}
              <p>Use the image button in the Story toolbar to add more images within the story. Save to keep your attachments. Re-Run retains the featured image and caption.</p>
            </fieldset>
            <section aria-label="Story text">
              <h2 className="form-label">Story (required)</h2>
              {canSave && !busy ? (
                <TipTapEditor content={body} onChange={setBody} label="Story" />
              ) : (
                <div
                  className="prose max-w-none"
                  dangerouslySetInnerHTML={{ __html: body }}
                />
              )}
            </section>
          </>
        )}
        <section aria-label="Story sources">
          <h2 className="form-label">Sources ({sources.length})</h2>
          {sources.map((source) => (
            <details key={source.id}>
              <summary>
                {source.title} —{' '}
                {source.reliability === 'UNVERIFIED'
                  ? 'Not yet verified'
                  : source.reliability.toLowerCase()}
              </summary>
              {source.url && /^https?:\/\//i.test(source.url) ? (
                <a
                  className="admin-list-link"
                  href={source.url}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Read original source
                </a>
              ) : null}
              <p className="whitespace-pre-wrap">{source.text}</p>
            </details>
          ))}
        </section>
        {!published ? (
          <div className="flex flex-wrap justify-end gap-3" role="group" aria-label="Story actions">
            <Link href="/admin/reporter" className="btn btn-ghost">
              Cancel
            </Link>
            {canRerun ? (
              <button
                type="button"
                className="btn btn-secondary"
                disabled={busy || problems.length > 0}
                onClick={rerun}
                title="Recreate this draft using the current reporting process. Replaces the text in this editor."
              >
                {action === 'rerun' || refreshing ? 'Re-Running…' : 'Re-Run'}
              </button>
            ) : null}
            {canSave ? (
              <button
                type="button"
                className="btn btn-secondary"
                disabled={busy}
                onClick={() => save('save')}
              >
                {action === 'save' ? 'Saving…' : 'Save'}
              </button>
            ) : (
              <p>An editor must save or publish this story.</p>
            )}
            {canSave && canPublish ? (
              <button
                type="button"
                className="btn btn-primary"
                disabled={
                  busy ||
                  problems.length > 0 ||
                  remainingIssues.some(
                    (issue) => !addressed.includes(issue.id)
                  ) ||
                  !categoryId
                }
                onClick={() => save('publish')}
              >
                {action === 'publish' ? 'Publishing…' : 'Publish'}
              </button>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}
