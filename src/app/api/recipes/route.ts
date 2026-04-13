import { NextRequest, NextResponse } from 'next/server';
import { Prisma, RecipeStatus } from '@prisma/client';
import { z } from 'zod';
import { db } from '@/lib/db';
import { checkPermission } from '@/lib/permissions';
import { logActivity } from '@/lib/activity-log';
import {
  buildRecipeSlug,
  normalizeRecipePayload,
  RecipePayloadSchema,
  serializeRecipe,
} from '@/lib/recipes';
import { getRecipeVideoProvider } from '@/lib/recipe-media';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const categorySlug = searchParams.get('category');
    const authorId = searchParams.get('authorId');
    const statusFilter = searchParams.get('status') as RecipeStatus | null;
    const communityId = request.headers.get('x-community-id') || '';

    const community = communityId
      ? await db.community.findUnique({ where: { id: communityId } })
      : await db.community.findFirst();

    if (!community) {
      return NextResponse.json({
        recipes: [],
        pagination: { page, limit, total: 0, pages: 0 },
      });
    }

    const where: Prisma.RecipeWhereInput = {
      communityId: community.id,
      status: RecipeStatus.PUBLISHED,
    };

    if (authorId && statusFilter) {
      where.authorUserId = authorId;
      where.status = statusFilter;
    }

    if (categorySlug) {
      where.category = { slug: categorySlug };
    }

    const [total, recipes] = await Promise.all([
      db.recipe.count({ where }),
      db.recipe.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        include: {
          author: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              profilePhotoUrl: true,
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
        orderBy: { publishedAt: 'desc' },
      }),
    ]);

    return NextResponse.json({
      recipes: recipes.map((recipe) => serializeRecipe(recipe)),
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Error fetching recipes:', error);
    return NextResponse.json(
      { error: 'Failed to fetch recipes' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id');
    const userRole = request.headers.get('x-user-role') || '';

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!checkPermission(userRole, 'articles:create')) {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const parsed = RecipePayloadSchema.parse(body);
    const validated = normalizeRecipePayload(parsed);

    if (validated.steps.length === 0) {
      return NextResponse.json(
        { error: 'Recipe must include at least one instruction step.' },
        { status: 400 }
      );
    }

    if (!validated.ingredientSections.some((section) => section.items.length > 0)) {
      return NextResponse.json(
        { error: 'Recipe must include at least one ingredient.' },
        { status: 400 }
      );
    }

    const communityId = request.headers.get('x-community-id') || '';
    const community = communityId
      ? await db.community.findUnique({ where: { id: communityId } })
      : await db.community.findFirst();

    if (!community) {
      return NextResponse.json({ error: 'Community not found' }, { status: 404 });
    }

    if (validated.categoryId) {
      const category = await db.category.findFirst({
        where: {
          id: validated.categoryId,
          OR: [{ communityId: community.id }, { communityId: null }],
        },
        select: { id: true },
      });

      if (!category) {
        return NextResponse.json({ error: 'Category not found' }, { status: 404 });
      }
    }

    const baseSlug = buildRecipeSlug(validated.title);
    const existingSlug = await db.recipe.findUnique({
      where: { communityId_slug: { communityId: community.id, slug: baseSlug } },
      select: { id: true },
    });
    const slug = existingSlug ? `${baseSlug}-${Date.now().toString(36)}` : baseSlug;

    const nextStatus = checkPermission(userRole, 'articles:approve')
      ? validated.status
      : validated.status === RecipeStatus.PUBLISHED || validated.status === RecipeStatus.UNPUBLISHED
        ? RecipeStatus.PENDING_REVIEW
        : validated.status;

    const created = await db.$transaction(async (tx) => {
      const recipe = await tx.recipe.create({
        data: {
          communityId: community.id,
          authorUserId: userId,
          title: validated.title,
          slug,
          excerpt: validated.excerpt || null,
          introHtml: validated.introHtml || null,
          featuredImageUrl: validated.featuredImageUrl || null,
          featuredImageCaption: validated.featuredImageCaption || null,
          status: nextStatus,
          categoryId: validated.categoryId,
          yieldLabel: validated.yieldLabel || null,
          prepMinutes: validated.prepMinutes,
          cookMinutes: validated.cookMinutes,
          totalMinutes: validated.totalMinutes,
          servings: validated.servings,
          sourceName: validated.sourceName || null,
          sourceUrl: validated.sourceUrl || null,
          structuredInputRaw: validated.structuredInputRaw as Prisma.InputJsonValue | undefined,
          publishedAt: nextStatus === RecipeStatus.PUBLISHED ? new Date() : null,
        },
      });

      for (let sectionIndex = 0; sectionIndex < validated.ingredientSections.length; sectionIndex += 1) {
        const section = validated.ingredientSections[sectionIndex];
        const createdSection = await tx.recipeIngredientSection.create({
          data: {
            recipeId: recipe.id,
            title: section.title || null,
            sortOrder: sectionIndex,
          },
        });

        for (let ingredientIndex = 0; ingredientIndex < section.items.length; ingredientIndex += 1) {
          const item = section.items[ingredientIndex];
          await tx.recipeIngredient.create({
            data: {
              recipeId: recipe.id,
              sectionId: createdSection.id,
              sortOrder: ingredientIndex,
              amount: item.amount || null,
              unit: item.unit || null,
              ingredientName: item.ingredientName,
              preparationNote: item.preparationNote || null,
              isOptional: item.isOptional,
              substitutionNote: item.substitutionNote || null,
            },
          });
        }
      }

      for (let stepIndex = 0; stepIndex < validated.steps.length; stepIndex += 1) {
        const step = validated.steps[stepIndex];
        const createdStep = await tx.recipeInstructionStep.create({
          data: {
            recipeId: recipe.id,
            sortOrder: stepIndex,
            title: step.title || null,
            body: step.body,
            timerMinutes: step.timerMinutes,
          },
        });

        if (step.imageUrl) {
          await tx.recipeMedia.create({
            data: {
              recipeId: recipe.id,
              stepId: createdStep.id,
              type: 'IMAGE',
              imageUrl: step.imageUrl,
              caption: step.mediaCaption || null,
              altText: step.title || null,
              sortOrder: 0,
            },
          });
        }

        if (step.videoUrl) {
          await tx.recipeMedia.create({
            data: {
              recipeId: recipe.id,
              stepId: createdStep.id,
              type: 'VIDEO_EMBED',
              provider: getRecipeVideoProvider(step.videoUrl),
              embedUrl: step.videoUrl,
              caption: step.mediaCaption || null,
              altText: step.title || null,
              sortOrder: step.imageUrl ? 1 : 0,
            },
          });
        }
      }

      for (let noteIndex = 0; noteIndex < validated.notes.length; noteIndex += 1) {
        const note = validated.notes[noteIndex];
        await tx.recipeNote.create({
          data: {
            recipeId: recipe.id,
            sortOrder: noteIndex,
            kind: note.kind,
            title: note.title || null,
            body: note.body,
          },
        });
      }

      for (let mediaIndex = 0; mediaIndex < validated.media.length; mediaIndex += 1) {
        const media = validated.media[mediaIndex];
        await tx.recipeMedia.create({
          data: {
            recipeId: recipe.id,
            type: media.type,
            provider: media.provider || null,
            imageUrl: media.imageUrl || null,
            embedUrl: media.embedUrl || null,
            caption: media.caption || null,
            altText: media.altText || null,
            sortOrder: mediaIndex,
          },
        });
      }

      return tx.recipe.findUniqueOrThrow({
        where: { id: recipe.id },
        include: {
          author: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              profilePhotoUrl: true,
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
    });

    const ipAddress = request.headers.get('x-client-ip');
    logActivity({
      userId,
      action: 'CREATE',
      resourceType: 'RECIPE',
      resourceId: created.id,
      ipAddress,
      metadata: { title: created.title, status: created.status },
    }).catch(() => {});

    return NextResponse.json(serializeRecipe(created), { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      );
    }

    console.error('Error creating recipe:', error);
    return NextResponse.json(
      { error: 'Failed to create recipe' },
      { status: 500 }
    );
  }
}
