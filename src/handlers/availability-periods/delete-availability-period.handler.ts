import { DatabaseClient } from '../../database/database-client.type';
import { ConflictError } from '../../common/errors/conflict.error';
import { requirePeriod } from './availability-period.utils';
export interface DeleteAvailabilityPeriodInput {storeId: string; availabilityPeriodId: string;}
export async function deleteAvailabilityPeriod(db: DatabaseClient, input: DeleteAvailabilityPeriodInput): Promise<void> {
  const current = await requirePeriod(db, input.storeId, input.availabilityPeriodId);
  const submissions = await db.userAvailability.count({where: {availabilityPeriodId: current.id}});
  if (submissions > 0) throw new ConflictError('Cannot delete an availability period with employee submissions.');
  await db.availabilityPeriod.delete({where: {id: current.id}});
}
