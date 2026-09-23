import { DatabaseClient } from '../../database/database-client.type';
import { AvailabilityPeriod } from '../../domain/availability.model';
import { mapAvailabilityPeriod } from './availability-period.mapper';
import { requirePeriod } from './availability-period.utils';
export interface CloseAvailabilityPeriodInput {storeId: string; availabilityPeriodId: string;}
export async function closeAvailabilityPeriod(db: DatabaseClient, input: CloseAvailabilityPeriodInput): Promise<AvailabilityPeriod> {
  const current = await requirePeriod(db, input.storeId, input.availabilityPeriodId);
  return mapAvailabilityPeriod(await db.availabilityPeriod.update({where: {id: current.id}, data: {isOpen: false}}));
}
