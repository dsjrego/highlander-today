import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import {
  ADMIN_SIDEBAR_ORDER_SETTING_KEY,
  parseAdminSidebarOrder,
} from '@/lib/admin-navigation';
import type { AdminSidebarOrder } from '@/lib/admin-navigation';
import { getCurrentCommunity } from '@/lib/community';
import { db } from '@/lib/db';

const OrderEntrySchema = z.object({
  section: z.string().trim().min(1).max(80),
  index: z.number().int().min(0).max(200),
});

const SidebarOrderSchema = z.object({
  preferredOrder: z.record(z.string().trim().min(1).max(200), OrderEntrySchema),
  preferredSectionOrder: z.array(z.string().trim().min(1).max(80)).max(40),
});

export async function GET(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id');

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const currentCommunity = await getCurrentCommunity({ headers: request.headers });
    if (!currentCommunity) {
      return NextResponse.json({ error: 'Community context required' }, { status: 400 });
    }

    const setting = await db.siteSetting.findUnique({
      where: {
        communityId_key: {
          communityId: currentCommunity.id,
          key: ADMIN_SIDEBAR_ORDER_SETTING_KEY,
        },
      },
      select: {
        value: true,
      },
    });

    return NextResponse.json(parseAdminSidebarOrder(setting?.value));
  } catch (error) {
    console.error('Error fetching admin sidebar order:', error);
    return NextResponse.json({ error: 'Failed to fetch admin sidebar order' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id');
    const userRole = request.headers.get('x-user-role');

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (userRole !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const currentCommunity = await getCurrentCommunity({ headers: request.headers });
    if (!currentCommunity) {
      return NextResponse.json({ error: 'Community context required' }, { status: 400 });
    }

    const body = await request.json();
    const validated: AdminSidebarOrder = SidebarOrderSchema.parse(body);

    await db.siteSetting.upsert({
      where: {
        communityId_key: {
          communityId: currentCommunity.id,
          key: ADMIN_SIDEBAR_ORDER_SETTING_KEY,
        },
      },
      update: {
        value: JSON.stringify(validated),
      },
      create: {
        communityId: currentCommunity.id,
        key: ADMIN_SIDEBAR_ORDER_SETTING_KEY,
        value: JSON.stringify(validated),
      },
    });

    return NextResponse.json(validated);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      );
    }

    console.error('Error updating admin sidebar order:', error);
    return NextResponse.json({ error: 'Failed to update admin sidebar order' }, { status: 500 });
  }
}
