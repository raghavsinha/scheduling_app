import { UserType } from '@prisma/client';
import { DatabaseClient } from '../../database/database-client.type';
import { Store } from '../../domain/store.model';
import { NotFoundError } from '../../common/errors/not-found.error';
import { ValidationError } from '../../common/errors/validation.error';
import { mapStore } from './store.mapper';

export interface CreateStoreInput {
  name: string;
  ownerUserId: string;
}

export async function createStore(db: DatabaseClient, input: CreateStoreInput): Promise<Store> {
  const name = input.name.trim();
  if (!name) throw new ValidationError('Store name is required.');
  const owner = await db.user.findUnique({ where: { id: input.ownerUserId } });
  if (!owner) throw new NotFoundError('Owner user not found.');

  // A newly created store must always start with its owner as an active admin.
  const created = await db.$transaction(async tx => {
    const store = await tx.store.create({ data: { name, ownerUserId: input.ownerUserId } });
    await tx.storeUser.create({ data: {
      storeId: store.id, userId: input.ownerUserId, userType: UserType.ADMIN,
    } });
    return store;
  });
  return mapStore(created);
}
