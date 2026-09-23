import { DatabaseClient } from '../../database/database-client.type';
import { NotFoundError } from '../../common/errors/not-found.error';
import { ValidationError } from '../../common/errors/validation.error';
import { ConflictError } from '../../common/errors/conflict.error';

export interface DeleteStoreInput { storeId: string; actorUserId: string; }
export async function deleteStore(db: DatabaseClient, input: DeleteStoreInput): Promise<void> {
  const store = await db.store.findUnique({ where: { id: input.storeId } });
  if (!store) throw new NotFoundError('Store not found.');
  if (store.ownerUserId !== input.actorUserId) {
    throw new ValidationError('Only the store owner may delete the store.');
  }
  // Never silently cascade away historical schedules or staffing records.
  const [workTypes, shiftTypes, templates, schedules, availability, requests, members] = await Promise.all([
    db.workType.count({ where: { storeId: store.id } }),
    db.shiftType.count({ where: { storeId: store.id } }),
    db.weeklyTemplate.count({ where: { storeId: store.id } }),
    db.schedule.count({ where: { storeId: store.id } }),
    db.availabilityPeriod.count({ where: { storeId: store.id } }),
    db.coverRequest.count({ where: { storeId: store.id } }),
    db.storeUser.count({ where: { storeId: store.id, userId: { not: store.ownerUserId } } }),
  ]);
  if (workTypes || shiftTypes || templates || schedules || availability || requests || members) {
    throw new ConflictError('Cannot delete a store containing configuration, staff, or historical records.');
  }
  await db.$transaction(async tx => {
    await tx.storeUser.deleteMany({ where: { storeId: store.id, userId: store.ownerUserId } });
    await tx.store.delete({ where: { id: store.id } });
  });
}
