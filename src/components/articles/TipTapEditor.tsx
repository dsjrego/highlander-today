'use client';

import { useEditor, EditorContent, BubbleMenu } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';
import Image from '@tiptap/extension-image';
import Underline from '@tiptap/extension-underline';
import Placeholder from '@tiptap/extension-placeholder';
import TextAlign from '@tiptap/extension-text-align';
import React, { useCallback, useEffect, useRef, useState } from 'react';

interface TipTapEditorProps {
  content: string;
  onChange: (html: string) => void;
  placeholder?: string;
}

function unwrapElement(element: Element) {
  const parent = element.parentNode;
  if (!parent) return;

  while (element.firstChild) {
    parent.insertBefore(element.firstChild, element);
  }

  parent.removeChild(element);
}

function normalizeImportedHtml(rawHtml: string): string {
  if (typeof window === 'undefined') {
    return rawHtml;
  }

  const parser = new DOMParser();
  const document = parser.parseFromString(rawHtml, 'text/html');
  const root = document.body;

  root
    .querySelectorAll('script, style, meta, link, title, noscript, iframe, object, embed')
    .forEach((node) => node.remove());

  root
    .querySelectorAll('.header-band, .hero, .footer-band, .section-rule, .article-header')
    .forEach((node) => node.remove());
  root.querySelectorAll('.article-body, .closing, .page-shell, .editor-content').forEach((node) => unwrapElement(node));

  root.querySelectorAll('.dropcap').forEach((node) => {
    node.classList.remove('dropcap');
    node.classList.add('editorial-dropcap');
  });

  root.querySelectorAll('.pullquote').forEach((node) => {
    const quote = document.createElement('blockquote');
    quote.className = 'editorial-pullquote';
    quote.innerHTML = node.innerHTML;
    node.replaceWith(quote);
  });

  root.querySelectorAll('.recipe-card').forEach((node) => {
    node.classList.remove('recipe-card');
    node.classList.add('editorial-recipe-card');
  });

  root.querySelectorAll('.recipe-title').forEach((node) => {
    const heading = document.createElement('h3');
    heading.className = 'editorial-recipe-card-title';
    heading.innerHTML = node.innerHTML;
    node.replaceWith(heading);
  });

  root.querySelectorAll('.recipe-subtitle').forEach((node) => {
    const subtitle = document.createElement('p');
    subtitle.className = 'editorial-recipe-card-subtitle';
    subtitle.innerHTML = node.innerHTML;
    node.replaceWith(subtitle);
  });

  root.querySelectorAll('.recipe-meta').forEach((node) => {
    node.classList.remove('recipe-meta');
    node.classList.add('editorial-recipe-card-meta');
  });

  root.querySelectorAll('.meta-item').forEach((node) => {
    node.classList.remove('meta-item');
    node.classList.add('editorial-recipe-card-meta-item');
  });

  root.querySelectorAll('.meta-label').forEach((node) => {
    const label = document.createElement('span');
    label.className = 'editorial-recipe-card-meta-label';
    label.innerHTML = node.innerHTML;
    node.replaceWith(label);
  });

  root.querySelectorAll('.meta-value').forEach((node) => {
    const value = document.createElement('span');
    value.className = 'editorial-recipe-card-meta-value';
    value.innerHTML = node.innerHTML;
    node.replaceWith(value);
  });

  root.querySelectorAll('.recipe-section-head').forEach((node) => {
    const heading = document.createElement('h4');
    heading.className = 'editorial-recipe-card-section-head';
    heading.innerHTML = node.innerHTML;
    node.replaceWith(heading);
  });

  root.querySelectorAll('.ingredient-amount').forEach((node) => {
    const strong = document.createElement('strong');
    strong.className = 'editorial-recipe-card-amount';
    strong.innerHTML = node.innerHTML;
    node.replaceWith(strong);
  });

  root.querySelectorAll('.recipe-notes').forEach((node) => {
    node.classList.remove('recipe-notes');
    node.classList.add('editorial-note-box');
  });

  root.querySelectorAll('.recipe-notes h4').forEach((node) => {
    node.className = 'editorial-note-box-title';
  });

  return root.innerHTML.trim();
}

// ─── Toolbar button ────────────────────────────────────────────────
function ToolbarButton({
  onClick,
  isActive = false,
  disabled = false,
  title,
  children,
}: {
  onClick: () => void;
  isActive?: boolean;
  disabled?: boolean;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={`!p-0 w-8 h-8 flex items-center justify-center rounded text-sm transition-colors ${
        isActive
          ? 'bg-[#A51E30] text-white'
          : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-200'
      } ${disabled ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'}`}
    >
      {children}
    </button>
  );
}

// ─── Separator ─────────────────────────────────────────────────────
function Sep() {
  return <div className="w-px h-6 bg-gray-300 mx-1" />;
}

// ─── Main component ────────────────────────────────────────────────
export default function TipTapEditor({ content, onChange, placeholder }: TipTapEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [2, 3] },
        bulletList: { keepMarks: true },
        orderedList: { keepMarks: true },
      }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: { rel: 'noopener noreferrer nofollow', target: '_blank' },
      }),
      Image.configure({
        inline: false,
        allowBase64: false,
      }),
      Underline,
      Placeholder.configure({
        placeholder: placeholder || 'Write your article here...',
      }),
      TextAlign.configure({
        types: ['heading', 'paragraph'],
      }),
    ],
    content,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
    editorProps: {
      attributes: {
        class:
          'prose prose-lg max-w-none focus:outline-none min-h-[320px] px-4 py-3',
      },
    },
  });

  // Sync external content changes (e.g. loading a draft)
  useEffect(() => {
    if (editor && content !== editor.getHTML()) {
      editor.commands.setContent(content, false);
    }
    // Only react to content prop changes, not editor updates
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [content]);

  // ── Link insertion ─────────────────────────────────────────────
  const setLink = useCallback(() => {
    if (!editor) return;
    const previousUrl = editor.getAttributes('link').href;
    const url = window.prompt('URL', previousUrl);

    if (url === null) return; // cancelled
    if (url === '') {
      editor.chain().focus().extendMarkRange('link').unsetLink().run();
      return;
    }
    editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
  }, [editor]);

  // ── Image upload + insertion ────────────────────────────────────
  const imageInputRef = useRef<HTMLInputElement>(null);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [isImportHtmlOpen, setIsImportHtmlOpen] = useState(false);
  const [htmlImportValue, setHtmlImportValue] = useState('');

  const handleImageUpload = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      if (!editor || !e.target.files?.length) return;
      const file = e.target.files[0];

      // Client-side checks
      if (!file.type.startsWith('image/')) return;
      if (file.size > 5 * 1024 * 1024) {
        alert('Image must be under 5MB.');
        return;
      }

      setIsUploadingImage(true);
      try {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('context', 'article');

        const res = await fetch('/api/upload', { method: 'POST', body: formData });
        if (res.ok) {
          const data = await res.json();
          editor.chain().focus().setImage({ src: data.url }).run();
        } else {
          const data = await res.json().catch(() => ({}));
          alert(data.error || 'Image upload failed.');
        }
      } catch {
        alert('Image upload failed. Please try again.');
      } finally {
        setIsUploadingImage(false);
        // Reset input so same file can be re-selected
        if (imageInputRef.current) imageInputRef.current.value = '';
      }
    },
    [editor]
  );

  const addImage = useCallback(() => {
    imageInputRef.current?.click();
  }, []);

  const openImportHtml = useCallback(() => {
    if (!editor) return;
    setHtmlImportValue(editor.getHTML());
    setIsImportHtmlOpen(true);
  }, [editor]);

  const handleImportHtml = useCallback(() => {
    if (!editor) return;

    const normalizedHtml = normalizeImportedHtml(htmlImportValue);
    const nextContent = normalizedHtml.length > 0 ? normalizedHtml : '<p></p>';
    editor.commands.setContent(nextContent, true);
    onChange(editor.getHTML());
    setIsImportHtmlOpen(false);
  }, [editor, htmlImportValue, onChange]);

  if (!editor) return null;

  return (
    <div className="border border-gray-300 rounded-lg overflow-hidden focus-within:ring-2 focus-within:ring-[#46A8CC] focus-within:border-transparent">
      {/* ── Toolbar ────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-1 px-3 py-2 bg-gray-50 border-b border-gray-200">
        {/* Text style */}
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleBold().run()}
          isActive={editor.isActive('bold')}
          title="Bold (Ctrl+B)"
        >
          <strong>B</strong>
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleItalic().run()}
          isActive={editor.isActive('italic')}
          title="Italic (Ctrl+I)"
        >
          <em>I</em>
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleUnderline().run()}
          isActive={editor.isActive('underline')}
          title="Underline (Ctrl+U)"
        >
          <span className="underline">U</span>
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleStrike().run()}
          isActive={editor.isActive('strike')}
          title="Strikethrough"
        >
          <s>S</s>
        </ToolbarButton>

        <Sep />

        {/* Headings */}
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          isActive={editor.isActive('heading', { level: 2 })}
          title="Heading 2"
        >
          H2
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
          isActive={editor.isActive('heading', { level: 3 })}
          title="Heading 3"
        >
          H3
        </ToolbarButton>

        <Sep />

        {/* Lists */}
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          isActive={editor.isActive('bulletList')}
          title="Bullet List"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="9" y1="6" x2="20" y2="6"/><line x1="9" y1="12" x2="20" y2="12"/><line x1="9" y1="18" x2="20" y2="18"/><circle cx="4" cy="6" r="1.5" fill="currentColor"/><circle cx="4" cy="12" r="1.5" fill="currentColor"/><circle cx="4" cy="18" r="1.5" fill="currentColor"/></svg>
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          isActive={editor.isActive('orderedList')}
          title="Numbered List"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="10" y1="6" x2="20" y2="6"/><line x1="10" y1="12" x2="20" y2="12"/><line x1="10" y1="18" x2="20" y2="18"/><text x="2" y="8" fontSize="8" fill="currentColor" stroke="none" fontFamily="serif">1</text><text x="2" y="14" fontSize="8" fill="currentColor" stroke="none" fontFamily="serif">2</text><text x="2" y="20" fontSize="8" fill="currentColor" stroke="none" fontFamily="serif">3</text></svg>
        </ToolbarButton>

        <Sep />

        {/* Block styles */}
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
          isActive={editor.isActive('blockquote')}
          title="Blockquote"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 21c3 0 7-1 7-8V5c0-1.25-.756-2.017-2-2H4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2 1 0 1 0 1 1v1c0 1-1 2-2 2s-1 .008-1 1.031V21z"/><path d="M15 21c3 0 7-1 7-8V5c0-1.25-.757-2.017-2-2h-4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2h.75c0 2.25.25 4-2.75 4v3z"/></svg>
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().setHorizontalRule().run()}
          title="Horizontal Rule"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="3" y1="12" x2="21" y2="12"/></svg>
        </ToolbarButton>

        <Sep />

        {/* Link & Image */}
        <ToolbarButton
          onClick={setLink}
          isActive={editor.isActive('link')}
          title="Insert Link"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>
        </ToolbarButton>
        <ToolbarButton
          onClick={addImage}
          disabled={isUploadingImage}
          title={isUploadingImage ? 'Uploading...' : 'Upload Image'}
        >
          {isUploadingImage ? (
            <svg className="animate-spin" width="16" height="16" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
          ) : (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
          )}
        </ToolbarButton>
        <ToolbarButton
          onClick={openImportHtml}
          title="Import HTML"
        >
          <span className="text-[10px] font-semibold tracking-[0.08em]">HTML</span>
        </ToolbarButton>

        <Sep />

        {/* Undo / Redo */}
        <ToolbarButton
          onClick={() => editor.chain().focus().undo().run()}
          disabled={!editor.can().undo()}
          title="Undo (Ctrl+Z)"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"/></svg>
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().redo().run()}
          disabled={!editor.can().redo()}
          title="Redo (Ctrl+Shift+Z)"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>
        </ToolbarButton>
      </div>

      {/* ── Bubble menu (selection toolbar) ─────────────────────── */}
      <BubbleMenu editor={editor} tippyOptions={{ duration: 100 }}>
        <div className="flex items-center gap-1 bg-white shadow-lg rounded-lg border border-gray-200 px-2 py-1">
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleBold().run()}
            isActive={editor.isActive('bold')}
            title="Bold"
          >
            <strong>B</strong>
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleItalic().run()}
            isActive={editor.isActive('italic')}
            title="Italic"
          >
            <em>I</em>
          </ToolbarButton>
          <ToolbarButton
            onClick={setLink}
            isActive={editor.isActive('link')}
            title="Link"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>
          </ToolbarButton>
        </div>
      </BubbleMenu>

      {/* Hidden file input for image uploads */}
      <input
        ref={imageInputRef}
        type="file"
        accept="image/*"
        onChange={handleImageUpload}
        className="hidden"
      />

      {/* ── Editor content area ─────────────────────────────────── */}
      <EditorContent editor={editor} />

      {isImportHtmlOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-labelledby="import-html-title"
        >
          <div className="w-full max-w-3xl rounded-[28px] border border-white/10 bg-white p-6 shadow-[0_28px_80px_rgba(2,8,23,0.35)]">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 id="import-html-title" className="text-xl font-semibold tracking-tight text-slate-950">
                  Import HTML
                </h2>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
                  Paste raw HTML here to replace the current editor content. The importer strips
                  document-level markup and normalizes some editorial patterns before the normal
                  save sanitization runs.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsImportHtmlOpen(false)}
                className="rounded-full border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-600 transition hover:border-slate-300 hover:text-slate-950"
              >
                Close
              </button>
            </div>

            <textarea
              value={htmlImportValue}
              onChange={(e) => setHtmlImportValue(e.target.value)}
              spellCheck={false}
              className="mt-5 h-80 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 font-mono text-sm leading-6 text-slate-900 outline-none transition focus:border-sky-400 focus:bg-white focus:ring-2 focus:ring-sky-200"
              placeholder="<p>Paste HTML here...</p>"
            />

            <div className="mt-5 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setIsImportHtmlOpen(false)}
                className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-600 transition hover:border-slate-300 hover:text-slate-950"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleImportHtml}
                className="rounded-full bg-slate-950 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
              >
                Import HTML
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {/* ── Editor styles ──────────────────────────────────────── */}
      <style jsx global>{`
        .tiptap p.is-editor-empty:first-child::before {
          content: attr(data-placeholder);
          float: left;
          color: #9ca3af;
          pointer-events: none;
          height: 0;
        }
        .tiptap:focus {
          outline: none;
        }
        .tiptap img {
          max-width: 100%;
          height: auto;
          border-radius: 0.5rem;
          margin: 1rem 0;
        }
        .tiptap img.ProseMirror-selectednode {
          outline: 2px solid #46A8CC;
          outline-offset: 2px;
        }
        .tiptap blockquote {
          border-left: 3px solid #A51E30;
          padding-left: 1rem;
          margin: 1rem 0;
          color: #4b5563;
        }
        .tiptap hr {
          border: none;
          border-top: 2px solid #e5e7eb;
          margin: 1.5rem 0;
        }
        .tiptap a {
          color: #46A8CC;
          text-decoration: underline;
        }
        .tiptap ul, .tiptap ol {
          padding-left: 1.5rem;
        }
        .tiptap ul {
          list-style-type: disc;
        }
        .tiptap ol {
          list-style-type: decimal;
        }
      `}</style>
    </div>
  );
}
