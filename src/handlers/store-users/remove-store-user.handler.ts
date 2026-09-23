import { DatabaseClient } from '../../database/database-client.type';

import { NotFoundError } from '../../common/errors/not-found.error';
import { ValidationError } from '../../common/errors/validation.error';

export interface RemoveStoreUserInput {
  storeId: string;
  userId: string;
}

export async function removeStoreUser(
  db: DatabaseClient,
  input: RemoveStoreUserInput,
): Promise<void> {
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

  if (store.ownerUserId === input.userId) {
    throw new ValidationError(
      'The store owner cannot be removed from the store.',
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
      archivedAt: new Date(),
    },
  });
}
