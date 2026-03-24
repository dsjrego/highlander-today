import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

function requireEnv(name: 'TARGET_USER_EMAIL' | 'DATE_OF_BIRTH'): string {
  const value = process.env[name]?.trim();

  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}

function parseDateOfBirth(value: string): Date {
  const parsed = new Date(value);

  if (Number.isNaN(parsed.getTime())) {
    throw new Error('DATE_OF_BIRTH must be a valid ISO date such as 1980-04-15');
  }

  return parsed;
}

async function main() {
  const email = requireEnv('TARGET_USER_EMAIL').toLowerCase();
  const dateOfBirth = parseDateOfBirth(requireEnv('DATE_OF_BIRTH'));

  const updated = await prisma.user.update({
    where: { email },
    data: { dateOfBirth },
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      dateOfBirth: true,
      isIdentityLocked: true,
      trustLevel: true,
    },
  });

  console.log(`✓ Date of birth updated for ${updated.email}`);
  console.log(
    `  Name: ${updated.firstName} ${updated.lastName} | Locked: ${updated.isIdentityLocked} | Trust: ${updated.trustLevel}`
  );
  console.log(`  DOB: ${updated.dateOfBirth?.toISOString().split('T')[0]}`);
}

main()
  .catch((error) => {
    console.error('set-user-dob error:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
