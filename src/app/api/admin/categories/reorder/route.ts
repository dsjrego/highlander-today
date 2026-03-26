import { NextRequest, NextResponse } from 'next/server';
import { revalidateTag } from 'next/cache';
import { z } from 'zod';
import { db } from '@/lib/db';
import { checkPermission } from '@/lib/permissions';

const ReorderPayloadSchema = z.object({
  updates: z.array(
    z.object({
      id: z.string().uuid(),
      sortOrder: z.number().int().min(0),
    })
  ).min(2),
});

export async function POST(request: NextRequest) {
  try {
    const userRole = request.headers.get('x-user-role') || '';

    if (!checkPermission(userRole, 'articles:approve')) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const body = await request.json();
    const validated = ReorderPayloadSchema.parse(body);

    const ids = validated.updates.map((update) => update.id);
    const categories = await db.category.findMany({
      where: { id: { in: ids } },
      select: { id: true, parentCategoryId: true },
    });

    if (categories.length !== ids.length) {
      return NextResponse.json({ error: 'One or more categories were not found' }, { status: 404 });
    }

    const parentIds = new Set(categories.map((category) => category.parentCategoryId ?? 'root'));
    if (parentIds.size !== 1) {
      return NextResponse.json(
        { error: 'Bulk reorder updates must target sibling categories with the same parent' },
        { status: 400 }
      );
    }

    await db.$transaction(
      validated.updates.map((update) =>
        db.category.update({
          where: { id: update.id },
          data: { sortOrder: update.sortOrder },
        })
      )
    );

    revalidateTag('categories');

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0]?.message || 'Invalid input' }, { status: 400 });
    }

    console.error('Error reordering categories:', error);
    return NextResponse.json({ error: 'Failed to reorder categories' }, { status: 500 });
  }
}
