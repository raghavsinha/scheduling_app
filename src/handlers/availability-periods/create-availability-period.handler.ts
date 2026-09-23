import { AvailabilityEntryMode } from '@prisma/client';
import { DatabaseClient } from '../../database/database-client.type';
import { AvailabilityPeriod } from '../../domain/availability.model';
import { ConflictError } from '../../common/errors/conflict.error';
import { mapAvailabilityPeriod } from './availability-period.mapper';
import { assertDateRange, parseDateOnly, requireStore } from './availability-period.utils';

export interface CreateAvailabilityPeriodInput {
  storeId: string;
  startDate: string;
  endDate: string;
  entryMode: AvailabilityEntryMode;
  isOpen?: boolean;
}
export async function createAvailabilityPeriod(db: DatabaseClient, input: CreateAvailabilityPeriodInput): Promise<AvailabilityPeriod> {
  await requireStore(db, input.storeId);
  const startDate = parseDateOnly(input.startDate);
  const endDate = parseDateOnly(input.endDate);
  assertDateRange(startDate, endDate);
  const existing = await db.availabilityPeriod.findFirst({where: {storeId: input.storeId, startDate: {lte: endDate}, endDate: {gte: startDate}}});
  if (existing) throw new ConflictError('Availability period overlaps an existing period for this store.');
  const record = await db.availabilityPeriod.create({data: {storeId: input.storeId, startDate, endDate, entryMode: input.entryMode, isOpen: input.isOpen ?? true}});
  return mapAvailabilityPeriod(record);
}
