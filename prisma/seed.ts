import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Starting database seed...');

  // 1. Create Community
  const community = await prisma.community.upsert({
    where: { slug: 'highlander-today' },
    update: {},
    create: {
      name: 'Highlander Today',
      slug: 'highlander-today',
      colorPrimary: '#46A8CC',
      colorAccent: '#A51E30',
      description: 'Community news for Patton, Hastings & Carrolltown, PA',
    },
  });
  console.log('✓ Community created:', community.name);

  // 2. Create Admin User
  const passwordHash = await bcrypt.hash('admin123', 10);

  const adminUser = await prisma.user.upsert({
    where: { email: 'admin@highlandertoday.com' },
    update: {},
    create: {
      email: 'admin@highlandertoday.com',
      passwordHash,
      firstName: 'Admin',
      lastName: 'Highlander',
      trustLevel: 'TRUSTED',
      isIdentityLocked: true,
    },
  });
  console.log('✓ Admin user created:', adminUser.email);

  // 3. Create Admin Membership
  await prisma.userCommunityMembership.upsert({
    where: {
      userId_communityId: {
        userId: adminUser.id,
        communityId: community.id,
      },
    },
    update: {},
    create: {
      userId: adminUser.id,
      communityId: community.id,
      role: 'ADMIN',
    },
  });
  console.log('✓ Admin membership created');

  // 4. Create Default Categories
  // Two top-level sections: "Local Life" (text-based content) and
  // "Experiences" (activity/event-based content). Children are the
  // subcategories that will drive nav dropdowns and DB queries.
  const categoryHierarchy = [
    {
      name: 'Local Life',
      slug: 'local-life',
      children: [
        { name: 'Recipes & Food Traditions', slug: 'recipes-food' },
        { name: 'Local Stories',             slug: 'local-stories' },
        { name: 'People of the Community',   slug: 'people' },
        { name: 'Guides & How-Tos',          slug: 'guides' },
        { name: 'Outdoors Tips',             slug: 'outdoors-tips' },
        { name: 'History & Heritage',         slug: 'history-heritage' },
        { name: 'Arts & Creativity',          slug: 'arts-creativity' },
        { name: 'Opinion & Commentary',       slug: 'opinion-commentary' },
      ],
    },
    {
      name: 'Experiences',
      slug: 'experiences',
      children: [
        { name: 'Events',                    slug: 'events' },
        { name: 'Outdoor Recreation',        slug: 'outdoor-recreation' },
        { name: 'Sports & Activities',       slug: 'sports-activities' },
        { name: 'Classes & Workshops',       slug: 'classes-workshops' },
        { name: 'Tours & Attractions',       slug: 'tours-attractions' },
        { name: 'Rentals & Getaways',        slug: 'rentals-getaways' },
        { name: 'Entertainment & Nightlife', slug: 'entertainment-nightlife' },
        { name: 'Seasonal Activities',       slug: 'seasonal' },
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

  // 5. Create Homepage Sections
  const sectionTypes = [
    'FEATURED_ARTICLES',
    'LATEST_NEWS',
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

  // 6. Create Default Site Setting
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

  console.log('\n✓ Database seed completed successfully!');
  console.log('  Admin login: admin@highlandertoday.com / admin123');
}

main()
  .catch((e) => {
    console.error('Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
