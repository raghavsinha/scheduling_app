import { DatabaseClient } from '../../database/database-client.type';
import { Store } from '../../domain/store.model';
import { mapStore } from './store.mapper';

export interface ListStoresInput { userId: string; }
export async function listStores(db: DatabaseClient, input: ListStoresInput): Promise<Store[]> {
  const stores = await db.store.findMany({
    where: { OR: [
      { ownerUserId: input.userId },
      { users: { some: { userId: input.userId, archivedAt: null } } },
    ] },
    orderBy: { name: 'asc' },
  });
  return stores.map(mapStore);
}
