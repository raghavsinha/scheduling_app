import { DatabaseClient } from '../../database/database-client.type';
import { StoreUser } from '../../domain/store-user.model';

import { mapStoreUser, storeUserInclude } from './store-user.mapper';

export interface ListStoreUsersInput {
  storeId: string;
  includeArchived?: boolean;
}

export async function listStoreUsers(
  db: DatabaseClient,
  input: ListStoreUsersInput,
): Promise<StoreUser[]> {
  const memberships = await db.storeUser.findMany({
    where: {
      storeId: input.storeId,
      ...(input.includeArchived
        ? {}
        : {
            archivedAt: null,
          }),
    },
    include: storeUserInclude,
    orderBy: {
      joinedAt: 'asc',
    },
  });

  return memberships.map((membership) =>
    mapStoreUser(membership as any),
  );
}
