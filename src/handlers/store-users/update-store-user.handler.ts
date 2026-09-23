import { UserType } from '@prisma/client';

import { DatabaseClient } from '../../database/database-client.type';
import { StoreUser } from '../../domain/store-user.model';

import { NotFoundError } from '../../common/errors/not-found.error';
import { ValidationError } from '../../common/errors/validation.error';

import { mapStoreUser, storeUserInclude } from './store-user.mapper';

export interface UpdateStoreUserInput {
  storeId: string;
  userId: string;
  userType: UserType;
}

export async function updateStoreUser(
  db: DatabaseClient,
  input: UpdateStoreUserInput,
): Promise<StoreUser> {
  const membership = await db.storeUser.findUnique({
    where: {
      storeId_userId: {
        storeId: input.storeId,
        userId: input.userId,
      },
    },
  });

  if (!membership) {
    throw new NotFoundError('Store user not found.');
  }

  const store = await db.store.findUnique({
    where: {
      id: input.storeId,
    },
  });

  if (!store) {
    throw new NotFoundError('Store not found.');
  }

  if (
    store.ownerUserId === input.userId &&
    input.userType !== UserType.ADMIN
  ) {
    throw new ValidationError(
      'The store owner must remain an admin.',
    );
  }

  await db.storeUser.update({
    where: {
      storeId_userId: {
        storeId: input.storeId,
        userId: input.userId,
      },
    },
    data: {
      userType: input.userType,
    },
  });

  const updated = await db.storeUser.findUniqueOrThrow({
    where: {
      storeId_userId: {
        storeId: input.storeId,
        userId: input.userId,
      },
    },
    include: storeUserInclude,
  });

  return mapStoreUser(updated as any);
}
