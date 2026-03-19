import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import {
  resolveSearchCommunityId,
  searchContentPage,
  type SearchResultType,
} from '@/lib/search';

const SearchQuerySchema = z.object({
  q: z.string().trim().min(2).max(100),
  type: z.enum(['article', 'event', 'marketplace']).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(12),
});

export async function GET(request: NextRequest) {
  try {
    const parsed = SearchQuerySchema.safeParse({
      q: request.nextUrl.searchParams.get('q') ?? '',
      type: request.nextUrl.searchParams.get('type') ?? undefined,
      page: request.nextUrl.searchParams.get('page') ?? '1',
      limit: request.nextUrl.searchParams.get('limit') ?? '12',
    });

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Query must be between 2 and 100 characters' },
        { status: 400 }
      );
    }

    const communityId = await resolveSearchCommunityId({
      communityId: request.headers.get('x-community-id'),
      communityDomain: request.headers.get('x-community-domain'),
      host: request.headers.get('host'),
    });

    const payload = await searchContentPage(parsed.data.q, {
      communityId,
      page: parsed.data.page,
      limit: parsed.data.limit,
      type: parsed.data.type as SearchResultType | undefined,
    });

    return NextResponse.json(payload);
  } catch (error) {
    console.error('Error searching:', error);
    return NextResponse.json({ error: 'Search failed' }, { status: 500 });
  }
}
