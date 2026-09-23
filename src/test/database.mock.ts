import { DeepMockProxy, mockDeep } from 'jest-mock-extended';
import { PrismaClient } from '@prisma/client';

export type MockDatabaseClient = DeepMockProxy<PrismaClient>;
export function createMockDatabase(): MockDatabaseClient {
  return mockDeep<PrismaClient>();
}
