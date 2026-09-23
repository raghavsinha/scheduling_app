import { DatabaseClient } from '../../database/database-client.type';
import { AvailabilityPeriod } from '../../domain/availability.model';
import { mapAvailabilityPeriod } from './availability-period.mapper';
export interface ListAvailabilityPeriodsInput {storeId: string; onlyOpen?: boolean;}
export async function listAvailabilityPeriods(db: DatabaseClient, input: ListAvailabilityPeriodsInput): Promise<AvailabilityPeriod[]> {
  const records = await db.availabilityPeriod.findMany({where: {storeId: input.storeId, ...(input.onlyOpen ? {isOpen: true} : {})}, orderBy: {startDate: 'desc'}});
  return records.map(mapAvailabilityPeriod);
}
