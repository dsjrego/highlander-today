import { RecipeMediaType, RecipeVideoProvider } from '@prisma/client';

export function getRecipeVideoProvider(url: string): RecipeVideoProvider | null {
  const normalized = url.trim().toLowerCase();
  if (normalized.includes('youtube.com/') || normalized.includes('youtu.be/')) {
    return RecipeVideoProvider.YOUTUBE;
  }
  if (normalized.includes('vimeo.com/')) {
    return RecipeVideoProvider.VIMEO;
  }
  return null;
}

export function isSupportedRecipeVideoUrl(url: string) {
  return getRecipeVideoProvider(url) !== null;
}

export function getRecipeEmbedUrl(url: string): string | null {
  const trimmed = url.trim();
  const provider = getRecipeVideoProvider(trimmed);

  if (provider === RecipeVideoProvider.YOUTUBE) {
    const match = trimmed.match(
      /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^?&/]+)/
    );
    return match?.[1] ? `https://www.youtube.com/embed/${match[1]}` : null;
  }

  if (provider === RecipeVideoProvider.VIMEO) {
    const match = trimmed.match(/vimeo\.com\/(?:video\/)?(\d+)/);
    return match?.[1] ? `https://player.vimeo.com/video/${match[1]}` : null;
  }

  return null;
}

export function getRecipeMediaDisplayUrl(media: {
  type: RecipeMediaType;
  imageUrl: string | null;
  embedUrl: string | null;
}) {
  if (media.type === RecipeMediaType.IMAGE) {
    return media.imageUrl;
  }

  if (media.type === RecipeMediaType.VIDEO_EMBED && media.embedUrl) {
    return getRecipeEmbedUrl(media.embedUrl);
  }

  return null;
}
