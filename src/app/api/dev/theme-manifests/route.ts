import { NextResponse } from 'next/server';
import { listTenantThemeManifests } from '@/lib/theme/registry';

export async function GET() {
  if (process.env.NODE_ENV !== 'development') {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const manifests = listTenantThemeManifests().map((manifest) => ({
    tenantSlug: manifest.tenantSlug,
    themeName: manifest.themeName,
  }));

  return NextResponse.json({ manifests });
}
