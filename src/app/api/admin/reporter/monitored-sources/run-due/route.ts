import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { handleRunDueRequest, runDueSchema, runDueQuerySchema } from './_handler';

export async function GET(request: NextRequest) {
  try {
    const searchParams = new URL(request.url).searchParams;
    const payload = runDueQuerySchema.parse({
      limit: searchParams.get('limit') ?? undefined,
      communityId: searchParams.get('communityId') ?? undefined,
      communitySlug: searchParams.get('communitySlug') ?? undefined,
    });

    return await handleRunDueRequest(request, payload);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      );
    }

    if (error instanceof Error) {
      const status = error.message === 'Insufficient permissions' ? 403 : 400;
      return NextResponse.json({ error: error.message }, { status });
    }

    console.error('Error running due monitored sources:', error);
    return NextResponse.json(
      { error: 'Failed to run due monitored sources' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const payload = runDueSchema.parse(body);

    return await handleRunDueRequest(request, payload);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      );
    }

    if (error instanceof Error) {
      const status = error.message === 'Insufficient permissions' ? 403 : 400;
      return NextResponse.json({ error: error.message }, { status });
    }

    console.error('Error running due monitored sources:', error);
    return NextResponse.json(
      { error: 'Failed to run due monitored sources' },
      { status: 500 }
    );
  }
}
