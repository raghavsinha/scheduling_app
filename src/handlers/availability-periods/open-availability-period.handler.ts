import { DatabaseClient } from '../../database/database-client.type';
import { AvailabilityPeriod } from '../../domain/availability.model';
import { mapAvailabilityPeriod } from './availability-period.mapper';
import { requirePeriod } from './availability-period.utils';
export interface OpenAvailabilityPeriodInput {storeId: string; availabilityPeriodId: string;}
export async function openAvailabilityPeriod(db: DatabaseClient, input: OpenAvailabilityPeriodInput): Promise<AvailabilityPeriod> {
  const current = await requirePeriod(db, input.storeId, input.availabilityPeriodId);
  return mapAvailabilityPeriod(await db.availabilityPeriod.update({where: {id: current.id}, data: {isOpen: true}}));
}
