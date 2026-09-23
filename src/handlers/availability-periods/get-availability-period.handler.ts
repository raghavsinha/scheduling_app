import { DatabaseClient } from '../../database/database-client.type';
import { AvailabilityPeriod } from '../../domain/availability.model';
import { mapAvailabilityPeriod } from './availability-period.mapper';
import { requirePeriod } from './availability-period.utils';
export interface GetAvailabilityPeriodInput {storeId: string; availabilityPeriodId: string;}
export async function getAvailabilityPeriod(db: DatabaseClient, input: GetAvailabilityPeriodInput): Promise<AvailabilityPeriod> {
  return mapAvailabilityPeriod(await requirePeriod(db, input.storeId, input.availabilityPeriodId));
}
