import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { checkPermission } from '@/lib/permissions';
import { serializeRecipe } from '@/lib/recipes';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const recipe = await db.recipe.findUnique({
      where: { id: params.id },
      include: {
        author: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            profilePhotoUrl: true,
            bio: true,
            trustLevel: true,
          },
        },
        category: {
          select: { id: true, name: true, slug: true, parentCategoryId: true },
        },
        ingredientSections: {
          include: {
            ingredients: {
              orderBy: { sortOrder: 'asc' },
            },
          },
          orderBy: { sortOrder: 'asc' },
        },
        instructionSteps: {
          orderBy: { sortOrder: 'asc' },
        },
        notes: {
          orderBy: { sortOrder: 'asc' },
        },
        media: {
          orderBy: [{ stepId: 'asc' }, { sortOrder: 'asc' }],
        },
      },
    });

    if (!recipe) {
      return NextResponse.json({ error: 'Recipe not found' }, { status: 404 });
    }

    if (recipe.status !== 'PUBLISHED') {
      const userId = request.headers.get('x-user-id');
      const userRole = request.headers.get('x-user-role') || '';
      const isAuthor = userId === recipe.authorUserId;
      const hasEditorRole = checkPermission(userRole, 'articles:approve');

      if (!isAuthor && !hasEditorRole) {
        return NextResponse.json({ error: 'Recipe not found' }, { status: 404 });
      }
    }

    return NextResponse.json(serializeRecipe(recipe));
  } catch (error) {
    console.error('Error fetching recipe:', error);
    return NextResponse.json(
      { error: 'Failed to fetch recipe' },
      { status: 500 }
    );
  }
}

const UpdateRecipeSchema = z
  .object({
    status: z.enum(['DRAFT', 'PENDING_REVIEW', 'PUBLISHED', 'UNPUBLISHED']).optional(),
    categoryId: z.string().uuid().nullable().optional(),
  })
  .refine((value) => value.status !== undefined || value.categoryId !== undefined, {
    message: 'At least one field must be provided.',
  });

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const userId = request.headers.get('x-user-id');
    const userRole = request.headers.get('x-user-role') || '';

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const recipe = await db.recipe.findUnique({
      where: { id: params.id },
      select: { id: true, authorUserId: true, status: true },
    });

    if (!recipe) {
      return NextResponse.json({ error: 'Recipe not found' }, { status: 404 });
    }

    const isAuthor = recipe.authorUserId === userId;
    const hasEditorRole = checkPermission(userRole, 'articles:approve');

    if (!isAuthor && !hasEditorRole) {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const validated = UpdateRecipeSchema.parse(body);

    if (!hasEditorRole && validated.status === 'PUBLISHED') {
      return NextResponse.json(
        { error: 'Only editors can publish recipes directly.' },
        { status: 403 }
      );
    }

    if (validated.categoryId !== undefined) {
      if (!hasEditorRole) {
        return NextResponse.json(
          { error: 'Only editors can update recipe categories directly.' },
          { status: 403 }
        );
      }

      if (validated.categoryId) {
        const currentRecipe = await db.recipe.findUnique({
          where: { id: params.id },
          select: { communityId: true },
        });

        if (!currentRecipe) {
          return NextResponse.json({ error: 'Recipe not found' }, { status: 404 });
        }

        const category = await db.category.findFirst({
          where: {
            id: validated.categoryId,
            contentModel: 'RECIPE',
            OR: [{ communityId: currentRecipe.communityId }, { communityId: null }],
          },
          select: { id: true },
        });

        if (!category) {
          return NextResponse.json({ error: 'Category not found' }, { status: 404 });
        }
      }
    }

    const updated = await db.recipe.update({
      where: { id: params.id },
      data: {
        ...(validated.status
          ? {
              status: validated.status,
              publishedAt: validated.status === 'PUBLISHED' ? new Date() : null,
            }
          : {}),
        ...(validated.categoryId !== undefined ? { categoryId: validated.categoryId } : {}),
      },
      include: {
        author: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            profilePhotoUrl: true,
            bio: true,
            trustLevel: true,
          },
        },
        category: {
          select: { id: true, name: true, slug: true, parentCategoryId: true },
        },
        ingredientSections: {
          include: {
            ingredients: {
              orderBy: { sortOrder: 'asc' },
            },
          },
          orderBy: { sortOrder: 'asc' },
        },
        instructionSteps: {
          orderBy: { sortOrder: 'asc' },
        },
        notes: {
          orderBy: { sortOrder: 'asc' },
        },
        media: {
          orderBy: [{ stepId: 'asc' }, { sortOrder: 'asc' }],
        },
      },
    });

    return NextResponse.json(serializeRecipe(updated));
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      );
    }

    console.error('Error updating recipe:', error);
    return NextResponse.json(
      { error: 'Failed to update recipe' },
      { status: 500 }
    );
  }
}
