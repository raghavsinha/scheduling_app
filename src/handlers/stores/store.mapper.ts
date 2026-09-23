import { Store as PrismaStore } from '@prisma/client';
import { Store } from '../../domain/store.model';

export function mapStore(store: PrismaStore): Store {
  return {
    id: store.id,
    name: store.name,
    ownerUserId: store.ownerUserId,
    createdAt: store.createdAt.toISOString(),
  };
}
