import { loadEnvConfig } from '@next/env';
import { CategoryContentModel, PrismaClient } from '@prisma/client';
import { seedPlaces } from './place-seed';

loadEnvConfig(process.cwd());

const prisma = new PrismaClient();

type SeedCategoryNode = {
  name: string;
  slug: string;
  children: Array<{
    name: string;
    slug: string;
    contentModel: CategoryContentModel;
  }>;
};

async function main() {
  console.log('Starting database seed...');
  const primaryDomain = process.env.PRIMARY_COMMUNITY_DOMAIN?.trim().toLowerCase() || null;

  // 1. Create Community
  const community = await prisma.community.upsert({
    where: { slug: 'highlander-today' },
    update: {
      domain: primaryDomain,
    },
    create: {
      name: 'Highlander Today',
      slug: 'highlander-today',
      domain: primaryDomain,
      colorPrimary: '#46A8CC',
      colorAccent: '#A51E30',
      description: 'Community news for Patton, Hastings & Carrolltown, PA',
    },
  });
  console.log('✓ Community created:', community.name);

  if (primaryDomain) {
    await prisma.tenantDomain.upsert({
      where: { domain: primaryDomain },
      update: {
        communityId: community.id,
        isPrimary: true,
        status: 'ACTIVE',
      },
      create: {
        communityId: community.id,
        domain: primaryDomain,
        isPrimary: true,
        status: 'ACTIVE',
      },
    });
    console.log('✓ Primary tenant domain created:', primaryDomain);
  }

  // 2. Create Default Categories
  // Two top-level sections: "Local Life" (text-based content) and
  // "Experiences" (activity/event-based content). Children are the
  // subcategories that will drive nav dropdowns and DB queries.
  const categoryHierarchy: SeedCategoryNode[] = [
    {
      name: 'Local Life',
      slug: 'local-life',
      children: [
        { name: 'Local Stores',             slug: 'local-stores', contentModel: 'MARKETPLACE' as const },
        { name: 'Our People',               slug: 'people', contentModel: 'ARTICLE' as const },
        { name: 'Recipes & Food',           slug: 'recipes-food', contentModel: 'RECIPE' as const },
        { name: 'Gardening & Nature',       slug: 'outdoors-tips', contentModel: 'ARTICLE' as const },
        { name: 'Arts & Music',             slug: 'arts-creativity', contentModel: 'ARTICLE' as const },
        { name: 'History & Heritage',       slug: 'history-heritage', contentModel: 'ARTICLE' as const },
        { name: 'Guides & How-Tos',         slug: 'guides', contentModel: 'ARTICLE' as const },
        { name: 'Opinion',                  slug: 'opinion-commentary', contentModel: 'ARTICLE' as const },
      ],
    },
    {
      name: 'Experiences',
      slug: 'experiences',
      children: [
        { name: 'Events',                    slug: 'events', contentModel: 'EVENT' as const },
        { name: 'Outdoor Recreation',        slug: 'outdoor-recreation', contentModel: 'PLANNED' as const },
        { name: 'Sports & Activities',       slug: 'sports-activities', contentModel: 'PLANNED' as const },
        { name: 'Classes & Workshops',       slug: 'classes-workshops', contentModel: 'PLANNED' as const },
        { name: 'Tours & Attractions',       slug: 'tours-attractions', contentModel: 'PLANNED' as const },
        { name: 'Rentals & Getaways',        slug: 'rentals-getaways', contentModel: 'PLANNED' as const },
        { name: 'Entertainment & Nightlife', slug: 'entertainment-nightlife', contentModel: 'PLANNED' as const },
        { name: 'Seasonal Activities',       slug: 'seasonal', contentModel: 'PLANNED' as const },
      ],
    },
  ];

  let sortOrder = 0;
  for (const parentCat of categoryHierarchy) {
    // Check if parent category already exists
    let parent = await prisma.category.findFirst({
      where: { slug: parentCat.slug, communityId: community.id },
    });

    if (!parent) {
      parent = await prisma.category.create({
        data: {
          name: parentCat.name,
          slug: parentCat.slug,
          communityId: community.id,
          sortOrder: sortOrder,
        },
      });
    }
    sortOrder++;

    let childSortOrder = 0;
    for (const child of parentCat.children) {
      const existing = await prisma.category.findFirst({
        where: { slug: child.slug, communityId: community.id },
      });

      if (!existing) {
        await prisma.category.create({
          data: {
            name: child.name,
            slug: child.slug,
            contentModel: child.contentModel,
            communityId: community.id,
            parentCategoryId: parent.id,
            sortOrder: childSortOrder,
          },
        });
      }
      childSortOrder++;
    }
  }
  console.log('✓ Default categories created');

  // 3. Create Homepage Sections
  const sectionTypes = [
    'FEATURED_ARTICLES',
    'LATEST_NEWS',
    'FEATURED_RECIPES',
    'UPCOMING_EVENTS',
    'RECENT_MARKETPLACE',
  ] as const;

  for (let i = 0; i < sectionTypes.length; i++) {
    const existing = await prisma.homepageSection.findFirst({
      where: { communityId: community.id, sectionType: sectionTypes[i] },
    });

    if (!existing) {
      await prisma.homepageSection.create({
        data: {
          communityId: community.id,
          sectionType: sectionTypes[i],
          sortOrder: i,
          isVisible: true,
        },
      });
    }
  }
  console.log('✓ Homepage sections created');

  // 4. Create Default Site Setting
  await prisma.siteSetting.upsert({
    where: {
      communityId_key: {
        communityId: community.id,
        key: 'comment_default_status',
      },
    },
    update: {},
    create: {
      communityId: community.id,
      key: 'comment_default_status',
      value: 'approved',
    },
  });
  console.log('✓ Default site settings created');

  // 5. Seed canonical places
  const placeSeedSummary = await seedPlaces(prisma);
  console.log(
    `✓ Seeded places: ${placeSeedSummary.countiesSeeded} PA counties and ${placeSeedSummary.municipalitiesSeeded} initial municipalities`
  );

  console.log('\n✓ Database seed completed successfully!');
  console.log('  Seeded structural data only (no user accounts created).');
}

main()
  .catch((e) => {
    console.error('Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
