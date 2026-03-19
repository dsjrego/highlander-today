import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();
const DEFAULT_COMMUNITY_SLUG = 'highlander-today';
const MIN_PASSWORD_LENGTH = 12;

function requireEnv(name: 'SUPER_ADMIN_EMAIL' | 'SUPER_ADMIN_PASSWORD'): string {
  const value = process.env[name]?.trim();

  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}

function validatePassword(password: string): void {
  const checks = [
    /[a-z]/.test(password),
    /[A-Z]/.test(password),
    /\d/.test(password),
    /[^A-Za-z0-9]/.test(password),
    password.length >= MIN_PASSWORD_LENGTH,
  ];

  if (checks.every(Boolean)) {
    return;
  }

  throw new Error(
    `SUPER_ADMIN_PASSWORD must be at least ${MIN_PASSWORD_LENGTH} characters and include uppercase, lowercase, number, and special character.`,
  );
}

async function main() {
  const email = requireEnv('SUPER_ADMIN_EMAIL').toLowerCase();
  const password = requireEnv('SUPER_ADMIN_PASSWORD');

  validatePassword(password);

  const community = await prisma.community.findUnique({
    where: { slug: DEFAULT_COMMUNITY_SLUG },
    select: { id: true, slug: true, name: true },
  });

  if (!community) {
    throw new Error(
      `Community "${DEFAULT_COMMUNITY_SLUG}" was not found. Run \`npx prisma db seed\` before creating the initial super admin.`,
    );
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const existingUser = await prisma.user.findUnique({
    where: { email },
    select: { id: true, firstName: true, lastName: true },
  });

  const user = existingUser
    ? await prisma.user.update({
        where: { email },
        data: {
          passwordHash,
          trustLevel: 'TRUSTED',
          isIdentityLocked: true,
        },
      })
    : await prisma.user.create({
        data: {
          email,
          passwordHash,
          firstName: 'Super',
          lastName: 'Admin',
          trustLevel: 'TRUSTED',
          isIdentityLocked: true,
        },
      });

  await prisma.userCommunityMembership.upsert({
    where: {
      userId_communityId: {
        userId: user.id,
        communityId: community.id,
      },
    },
    update: {
      role: 'SUPER_ADMIN',
    },
    create: {
      userId: user.id,
      communityId: community.id,
      role: 'SUPER_ADMIN',
    },
  });

  console.log(`✓ Super Admin ready for ${community.name} (${community.slug})`);
  console.log(`  Email: ${email}`);
  console.log(
    existingUser
      ? '  Existing user promoted to SUPER_ADMIN and password updated.'
      : '  New SUPER_ADMIN account created.',
  );
}

main()
  .catch((error) => {
    console.error('create-super-admin error:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
