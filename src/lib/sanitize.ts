import sanitizeHtml from 'sanitize-html';

/**
 * Sanitize HTML content for safe storage and rendering.
 * Allows standard article formatting tags that TipTap produces.
 * Strips scripts, event handlers, and dangerous attributes.
 */
export function sanitizeArticleHtml(dirty: string): string {
  return sanitizeHtml(dirty, {
    allowedTags: [
      // Block elements
      'p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
      'blockquote', 'pre', 'code', 'hr', 'br',
      // Lists
      'ul', 'ol', 'li',
      // Inline formatting
      'strong', 'em', 'u', 's', 'del', 'sub', 'sup', 'mark',
      // Links & media
      'a', 'img',
      // Tables (for future use)
      'table', 'thead', 'tbody', 'tr', 'th', 'td',
      // Misc
      'figure', 'figcaption', 'div', 'span',
    ],
    allowedAttributes: {
      a: ['href', 'target', 'rel'],
      img: ['src', 'alt', 'width', 'height'],
      ol: ['start', 'type'],
      td: ['colspan', 'rowspan'],
      th: ['colspan', 'rowspan'],
      p: ['style'],
      h2: ['style'],
      h3: ['style'],
      '*': ['class', 'id'],
    },
    allowedStyles: {
      p: {
        'text-align': [/^left$/, /^center$/, /^right$/, /^justify$/],
      },
      h2: {
        'text-align': [/^left$/, /^center$/, /^right$/, /^justify$/],
      },
      h3: {
        'text-align': [/^left$/, /^center$/, /^right$/, /^justify$/],
      },
    },
    allowedSchemes: ['http', 'https', 'mailto'],
    // Don't allow data: URIs (prevents base64 payloads)
    allowedSchemesByTag: {
      img: ['http', 'https'],
    },
    // Force noopener on links
    transformTags: {
      a: sanitizeHtml.simpleTransform('a', { rel: 'noopener noreferrer nofollow', target: '_blank' }),
    },
  });
}

export function stripHtmlToText(dirty: string): string {
  return sanitizeHtml(dirty, {
    allowedTags: [],
    allowedAttributes: {},
  })
    .replace(/\s+/g, ' ')
    .trim();
}
