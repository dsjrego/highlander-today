import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { normalizeRecipePayload, RecipeImportSchema } from '@/lib/recipes';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = RecipeImportSchema.parse(body.payload ?? body);
    const normalized = normalizeRecipePayload(parsed);

    return NextResponse.json({
      recipe: normalized,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      );
    }

    console.error('Error importing recipe payload:', error);
    return NextResponse.json(
      { error: 'Failed to import recipe payload' },
      { status: 500 }
    );
  }
}
