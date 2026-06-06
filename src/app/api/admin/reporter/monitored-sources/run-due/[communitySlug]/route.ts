import { NextRequest } from 'next/server';
import { z } from 'zod';
import { handleRunDueRequest } from '../_handler';

const pathRunDueSchema = z.object({
  limit: z.coerce.number().int().min(1).max(50).optional(),
});

export async function GET(
  request: NextRequest,
  { params }: { params: { communitySlug: string } }
) {
  try {
    const searchParams = new URL(request.url).searchParams;
    const payload = pathRunDueSchema.parse({
      limit: searchParams.get('limit') ?? undefined,
    });

    return await handleRunDueRequest(request, {
      ...payload,
      communitySlug: params.communitySlug,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return Response.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      );
    }

    if (error instanceof Error) {
      const status = error.message === 'Insufficient permissions' ? 403 : 400;
      return Response.json({ error: error.message }, { status });
    }

    console.error('Error running due monitored sources:', error);
    return Response.json(
      { error: 'Failed to run due monitored sources' },
      { status: 500 }
    );
  }
}
