import { NextRequest, NextResponse } from 'next/server';
import { revalidateTag } from 'next/cache';
import { z } from 'zod';
import { db } from '@/lib/db';
import { checkPermission } from '@/lib/permissions';

const UpdateCategorySchema = z.object({
  name: z.string().trim().min(1).max(120).optional(),
  slug: z.string().trim().min(1).max(120).regex(/^[a-z0-9-]+$/).optional(),
  parentCategoryId: z.string().uuid().nullable().optional(),
  sortOrder: z.number().int().min(0).optional(),
  isArchived: z.boolean().optional(),
});

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const userRole = request.headers.get('x-user-role') || '';

    if (!checkPermission(userRole, 'articles:approve')) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const existingCategory = await db.category.findUnique({
      where: { id: params.id },
      select: { id: true, slug: true },
    });

    if (!existingCategory) {
      return NextResponse.json({ error: 'Category not found' }, { status: 404 });
    }

    const body = await request.json();
    const validated = UpdateCategorySchema.parse({
      ...body,
      ...(body.slug || body.name ? { slug: slugify(body.slug || body.name) } : {}),
    });

    if (validated.slug && validated.slug !== existingCategory.slug) {
      const duplicate = await db.category.findFirst({
        where: {
          slug: validated.slug,
          NOT: { id: params.id },
        },
        select: { id: true },
      });

      if (duplicate) {
        return NextResponse.json({ error: 'A category with this slug already exists' }, { status: 409 });
      }
    }

    if (validated.parentCategoryId === params.id) {
      return NextResponse.json({ error: 'A category cannot be its own parent' }, { status: 400 });
    }

    if (validated.parentCategoryId) {
      const descendants = new Set<string>();
      const queue = [params.id];

      while (queue.length > 0) {
        const currentId = queue.shift()!;
        const children = await db.category.findMany({
          where: { parentCategoryId: currentId },
          select: { id: true },
        });

        for (const child of children) {
          if (!descendants.has(child.id)) {
            descendants.add(child.id);
            queue.push(child.id);
          }
        }
      }

      if (descendants.has(validated.parentCategoryId)) {
        return NextResponse.json(
          { error: 'A category cannot be moved beneath one of its descendants' },
          { status: 400 }
        );
      }
    }

    const category = await db.category.update({
      where: { id: params.id },
      data: {
        ...(validated.name !== undefined ? { name: validated.name } : {}),
        ...(validated.slug !== undefined ? { slug: validated.slug } : {}),
        ...(validated.parentCategoryId !== undefined ? { parentCategoryId: validated.parentCategoryId } : {}),
        ...(validated.sortOrder !== undefined ? { sortOrder: validated.sortOrder } : {}),
        ...(validated.isArchived !== undefined ? { isArchived: validated.isArchived } : {}),
      },
    });

    revalidateTag('categories');

    return NextResponse.json({ category });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0]?.message || 'Invalid input' }, { status: 400 });
    }

    console.error('Error updating category:', error);
    return NextResponse.json({ error: 'Failed to update category' }, { status: 500 });
  }
}
