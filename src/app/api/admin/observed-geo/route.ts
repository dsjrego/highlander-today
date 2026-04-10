import { NextRequest, NextResponse } from 'next/server';
import { getObservedGeoLocations, syncObservedGeoLocations } from '@/lib/observed-geo';

function isSuperAdmin(request: NextRequest) {
  return request.headers.get('x-user-role') === 'SUPER_ADMIN';
}

export async function GET(request: NextRequest) {
  try {
    if (!isSuperAdmin(request)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const shouldSync = request.nextUrl.searchParams.get('sync') === 'true';
    if (shouldSync) {
      await syncObservedGeoLocations();
    }

    const observedGeo = await getObservedGeoLocations(100);
    return NextResponse.json({ observedGeo });
  } catch (error) {
    console.error('Error fetching observed geo:', error);
    return NextResponse.json({ error: 'Failed to fetch observed geo' }, { status: 500 });
  }
}
