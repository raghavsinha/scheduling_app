import { DatabaseClient } from '../../database/database-client.type';
import { StoreUser } from '../../domain/store-user.model';

import { NotFoundError } from '../../common/errors/not-found.error';

import { mapStoreUser, storeUserInclude } from './store-user.mapper';

export interface GetStoreUserInput {
  storeId: string;
  userId: string;
}

export async function getStoreUser(
  db: DatabaseClient,
  input: GetStoreUserInput,
): Promise<StoreUser> {
  const membership = await db.storeUser.findUnique({
    where: {
      storeId_userId: {
        storeId: input.storeId,
        userId: input.userId,
      },
    },
    include: storeUserInclude,
  });

  if (!membership) {
    throw new NotFoundError('Store user not found.');
  }

  return mapStoreUser(membership as any);
}
