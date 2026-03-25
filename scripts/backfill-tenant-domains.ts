import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const communities = await prisma.community.findMany({
    where: {
      domain: {
        not: null,
      },
    },
    select: {
      id: true,
      slug: true,
      domain: true,
    },
  });

  let created = 0;

  for (const community of communities) {
    const normalizedDomain = community.domain?.trim().toLowerCase();

    if (!normalizedDomain) {
      continue;
    }

    await prisma.tenantDomain.upsert({
      where: { domain: normalizedDomain },
      update: {
        communityId: community.id,
        isPrimary: true,
        status: 'ACTIVE',
      },
      create: {
        communityId: community.id,
        domain: normalizedDomain,
        isPrimary: true,
        status: 'ACTIVE',
      },
    });

    created += 1;
    console.log(`✓ Backfilled tenant domain for ${community.slug}: ${normalizedDomain}`);
  }

  console.log(`\n✓ Tenant domain backfill complete (${created} communities processed)`);
}

main()
  .catch((error) => {
    console.error('backfill-tenant-domains error:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
