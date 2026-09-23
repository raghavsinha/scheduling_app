import { DatabaseClient } from '../../database/database-client.type';
import { Store } from '../../domain/store.model';
import { NotFoundError } from '../../common/errors/not-found.error';
import { ValidationError } from '../../common/errors/validation.error';
import { mapStore } from './store.mapper';

export interface UpdateStoreInput { storeId: string; name: string; actorUserId: string; }
export async function updateStore(db: DatabaseClient, input: UpdateStoreInput): Promise<Store> {
  const name = input.name.trim();
  if (!name) throw new ValidationError('Store name is required.');
  const store = await db.store.findUnique({ where: { id: input.storeId } });
  if (!store) throw new NotFoundError('Store not found.');
  if (store.ownerUserId !== input.actorUserId) {
    throw new ValidationError('Only the store owner may update the store.');
  }
  return mapStore(await db.store.update({ where: { id: store.id }, data: { name } }));
}
