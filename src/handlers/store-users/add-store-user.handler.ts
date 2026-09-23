import { UserType } from '@prisma/client';

import { DatabaseClient } from '../../database/database-client.type';
import { StoreUser } from '../../domain/store-user.model';

import { ConflictError } from '../../common/errors/conflict.error';
import { NotFoundError } from '../../common/errors/not-found.error';

import { mapStoreUser, storeUserInclude } from './store-user.mapper';

export interface AddStoreUserInput {
  storeId: string;
  userId: string;
  userType: UserType;
}

export async function addStoreUser(
  db: DatabaseClient,
  input: AddStoreUserInput,
): Promise<StoreUser> {
  const store = await db.store.findUnique({
    where: {
      id: input.storeId,
    },
  });

  if (!store) {
    throw new NotFoundError('Store not found.');
  }

  const user = await db.user.findUnique({
    where: {
      id: input.userId,
    },
  });

  if (!user) {
    throw new NotFoundError('User not found.');
  }

  const existing = await db.storeUser.findUnique({
    where: {
      storeId_userId: {
        storeId: input.storeId,
        userId: input.userId,
      },
    },
  });

  if (existing) {
    throw new ConflictError(
      'User is already a member of this store.',
    );
  }

  await db.storeUser.create({
    data: {
      storeId: input.storeId,
      userId: input.userId,
      userType: input.userType,
    },
  });

  const created = await db.storeUser.findUniqueOrThrow({
    where: {
      storeId_userId: {
        storeId: input.storeId,
        userId: input.userId,
      },
    },
    include: storeUserInclude,
  });

  return mapStoreUser(created as any);
}
