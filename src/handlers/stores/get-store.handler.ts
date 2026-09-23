import { DatabaseClient } from '../../database/database-client.type';
import { Store } from '../../domain/store.model';
import { NotFoundError } from '../../common/errors/not-found.error';
import { mapStore } from './store.mapper';

export interface GetStoreInput { storeId: string; }
export async function getStore(db: DatabaseClient, input: GetStoreInput): Promise<Store> {
  const store = await db.store.findUnique({ where: { id: input.storeId } });
  if (!store) throw new NotFoundError('Store not found.');
  return mapStore(store);
}
