export const PRIVATE_PATH =
  /^\/(?:admin|api|messages|profile|login|register|verify|reset-password|forgot-password|interviews)(?:\/|$)/;

/** Never persist arbitrary search strings, fragments, or private resource IDs. */
export function safeAnalyticsPath(input: string): string | null {
  if (!input.startsWith("/") || input.startsWith("//") || input.includes("\\"))
    return null;
  const path = input.split(/[?#]/)[0].slice(0, 400);
  let decoded: string;
  try {
    decoded = decodeURIComponent(path);
  } catch {
    return null;
  }
  if (
    decoded.startsWith("//") ||
    /[\x00-\x1f]/.test(decoded) ||
    PRIVATE_PATH.test(decoded) ||
    /\/(?:submit|create|edit|drafts|manage|workspace)(?:\/|$)/.test(decoded)
  )
    return null;
  if (
    PRIVATE_PATH.test(path) ||
    /\/(?:submit|create|edit|drafts|manage|workspace)(?:\/|$)/.test(path)
  )
    return null;
  return path;
}
