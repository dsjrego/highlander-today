import { jest } from '@jest/globals';

/**
 * Mock Prisma client for unit tests
 * This provides a basic mock structure for Prisma queries
 */

export const prismaMock = {
  $transaction: jest.fn(),
  user: {
    create: jest.fn(),
    findUnique: jest.fn(),
    findMany: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    deleteMany: jest.fn(),
  },
  userCommunityMembership: {
    create: jest.fn(),
    findUnique: jest.fn(),
    findFirst: jest.fn(),
    upsert: jest.fn(),
    findMany: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    deleteMany: jest.fn(),
  },
  vouchRecord: {
    create: jest.fn(),
    findUnique: jest.fn(),
    findMany: jest.fn(),
    count: jest.fn(),
    delete: jest.fn(),
    deleteMany: jest.fn(),
  },
  trustAuditLog: {
    create: jest.fn(),
    findMany: jest.fn(),
    deleteMany: jest.fn(),
  },
  bannedEmail: {
    create: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    deleteMany: jest.fn(),
  },
  userBlock: {
    create: jest.fn(),
    findUnique: jest.fn(),
    findMany: jest.fn(),
    delete: jest.fn(),
    deleteMany: jest.fn(),
  },
  article: {
    create: jest.fn(),
    findUnique: jest.fn(),
    findMany: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    deleteMany: jest.fn(),
  },
  community: {
    create: jest.fn(),
    findUnique: jest.fn(),
    findMany: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    deleteMany: jest.fn(),
  },
  event: {
    create: jest.fn(),
    findMany: jest.fn(),
    update: jest.fn(),
    deleteMany: jest.fn(),
  },
  marketplaceListing: {
    create: jest.fn(),
    findMany: jest.fn(),
    deleteMany: jest.fn(),
  },
  comment: {
    create: jest.fn(),
    findMany: jest.fn(),
    deleteMany: jest.fn(),
  },
  conversation: {
    create: jest.fn(),
    findUnique: jest.fn(),
    findMany: jest.fn(),
    deleteMany: jest.fn(),
  },
  conversationParticipant: {
    create: jest.fn(),
    findUnique: jest.fn(),
    deleteMany: jest.fn(),
  },
  message: {
    create: jest.fn(),
    findMany: jest.fn(),
    deleteMany: jest.fn(),
  },
  messageAttachment: {
    create: jest.fn(),
    deleteMany: jest.fn(),
  },
  homepageSection: {
    create: jest.fn(),
    findMany: jest.fn(),
    deleteMany: jest.fn(),
  },
  homepagePinnedItem: {
    create: jest.fn(),
    findMany: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    deleteMany: jest.fn(),
  },
  category: {
    create: jest.fn(),
    findUnique: jest.fn(),
    deleteMany: jest.fn(),
  },
  tag: {
    create: jest.fn(),
    deleteMany: jest.fn(),
  },
};

export const prisma = prismaMock as any;
