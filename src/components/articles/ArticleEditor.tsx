'use client';

import React, { useState } from 'react';

interface ArticleEditorProps {
  initialContent?: string;
  onSave: (content: string) => Promise<void>;
  onCancel: () => void;
  isLoading?: boolean;
}

export const ArticleEditor: React.FC<ArticleEditorProps> = ({
  initialContent = '',
  onSave,
  onCancel,
  isLoading = false
}) => {
  const [content, setContent] = useState(initialContent);

  const applyStyle = (style: string) => {
    const textarea = document.getElementById('article-content') as HTMLTextAreaElement;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = textarea.value;
    const selectedContent = text.substring(start, end);

    if (!selectedContent) return;

    let formattedContent = selectedContent;
    switch (style) {
      case 'bold':
        formattedContent = `**${selectedContent}**`;
        break;
      case 'italic':
        formattedContent = `*${selectedContent}*`;
        break;
      case 'link':
        formattedContent = `[${selectedContent}](url)`;
        break;
      case 'h1':
        formattedContent = `# ${selectedContent}`;
        break;
      case 'h2':
        formattedContent = `## ${selectedContent}`;
        break;
      default:
        break;
    }

    const newContent = text.substring(0, start) + formattedContent + text.substring(end);
    setContent(newContent);
  };

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    const file = files[0];
    // In a real app, this would upload to storage and return a URL
    const imageUrl = URL.createObjectURL(file);
    const markdownImage = `![${file.name}](${imageUrl})`;
    setContent(content + '\n' + markdownImage);
  };

  const handleVideoEmbed = () => {
    const url = prompt('Enter YouTube or Vimeo URL:');
    if (!url) return;

    let embedCode = '';
    if (url.includes('youtube.com') || url.includes('youtu.be')) {
      const videoId = extractYoutubeId(url);
      embedCode = `[YouTube Video: ${videoId}](${url})`;
    } else if (url.includes('vimeo.com')) {
      embedCode = `[Vimeo Video](${url})`;
    }

    if (embedCode) {
      setContent(content + '\n' + embedCode);
    }
  };

  const extractYoutubeId = (url: string): string => {
    const regex = /(?:youtube\.com\/watch\?v=|youtu\.be\/)([^\s&]+)/;
    const match = url.match(regex);
    return match ? match[1] : 'invalid';
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h2 className="text-2xl font-bold mb-6">Article Editor</h2>

      {/* Toolbar */}
      <div className="bg-gray-50 border border-gray-200 rounded-t-lg p-4 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => applyStyle('bold')}
          className="px-3 py-2 bg-white border border-gray-300 rounded hover:bg-gray-100 font-bold text-sm"
          title="Bold"
        >
          B
        </button>
        <button
          type="button"
          onClick={() => applyStyle('italic')}
          className="px-3 py-2 bg-white border border-gray-300 rounded hover:bg-gray-100 italic text-sm"
          title="Italic"
        >
          I
        </button>
        <button
          type="button"
          onClick={() => applyStyle('h1')}
          className="px-3 py-2 bg-white border border-gray-300 rounded hover:bg-gray-100 font-bold text-sm"
          title="Heading 1"
        >
          H1
        </button>
        <button
          type="button"
          onClick={() => applyStyle('h2')}
          className="px-3 py-2 bg-white border border-gray-300 rounded hover:bg-gray-100 font-bold text-sm"
          title="Heading 2"
        >
          H2
        </button>
        <button
          type="button"
          onClick={() => applyStyle('link')}
          className="px-3 py-2 bg-white border border-gray-300 rounded hover:bg-gray-100 text-sm"
          title="Link"
        >
          🔗
        </button>

        <div className="border-l border-gray-300 mx-1"></div>

        <label className="px-3 py-2 bg-white border border-gray-300 rounded hover:bg-gray-100 cursor-pointer text-sm">
          <input
            type="file"
            accept="image/*"
            onChange={handleImageUpload}
            className="hidden"
          />
          📷 Image
        </label>

        <button
          type="button"
          onClick={handleVideoEmbed}
          className="px-3 py-2 bg-white border border-gray-300 rounded hover:bg-gray-100 text-sm"
          title="Embed Video"
        >
          🎥 Video
        </button>
      </div>

      {/* Editor Textarea */}
      <textarea
        id="article-content"
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder="Write your article content here... Use markdown formatting."
        className="w-full h-96 p-4 border-l border-r border-b border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
      />

      {/* Preview Section */}
      <div className="mt-6 mb-6">
        <h3 className="text-lg font-semibold mb-2">Preview</h3>
        <div className="bg-gray-50 border border-gray-200 rounded p-4 max-h-64 overflow-y-auto text-sm text-gray-700 whitespace-pre-wrap">
          {content || 'Your content will appear here...'}
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-3 justify-end">
        <button
          type="button"
          onClick={onCancel}
          disabled={isLoading}
          className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 font-medium"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={() => onSave(content)}
          disabled={isLoading}
          className="px-6 py-2 text-white rounded-lg font-medium disabled:opacity-50"
          style={{ backgroundcolor: 'var(--brand-primary)' }}
        >
          {isLoading ? 'Saving...' : 'Save Article'}
        </button>
      </div>
    </div>
  );
};
