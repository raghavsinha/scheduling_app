import { AvailabilityEntryMode } from '@prisma/client';
import { DatabaseClient } from '../../database/database-client.type';
import { AvailabilityPeriod } from '../../domain/availability.model';
import { ConflictError } from '../../common/errors/conflict.error';
import { ValidationError } from '../../common/errors/validation.error';
import { mapAvailabilityPeriod } from './availability-period.mapper';
import { assertDateRange, parseDateOnly, requirePeriod } from './availability-period.utils';
export interface UpdateAvailabilityPeriodInput {
  storeId: string; availabilityPeriodId: string;
  startDate?: string; endDate?: string; entryMode?: AvailabilityEntryMode; isOpen?: boolean;
}
export async function updateAvailabilityPeriod(db: DatabaseClient, input: UpdateAvailabilityPeriodInput): Promise<AvailabilityPeriod> {
  const current = await requirePeriod(db, input.storeId, input.availabilityPeriodId);
  const startDate = input.startDate === undefined ? current.startDate : parseDateOnly(input.startDate);
  const endDate = input.endDate === undefined ? current.endDate : parseDateOnly(input.endDate);
  assertDateRange(startDate, endDate);
  const changedDefinition = startDate.getTime() !== current.startDate.getTime() || endDate.getTime() !== current.endDate.getTime() || (input.entryMode !== undefined && input.entryMode !== current.entryMode);
  if (changedDefinition) {
    const submitted = await db.userAvailability.count({where: {availabilityPeriodId: current.id}});
    if (submitted > 0) throw new ValidationError('Cannot alter dates or entry mode after submissions; open or close the period instead.');
    const overlap = await db.availabilityPeriod.findFirst({where: {storeId: input.storeId, id: {not: current.id}, startDate: {lte: endDate}, endDate: {gte: startDate}}});
    if (overlap) throw new ConflictError('Availability period overlaps an existing period for this store.');
  }
  return mapAvailabilityPeriod(await db.availabilityPeriod.update({where: {id: current.id}, data: {startDate, endDate, ...(input.entryMode === undefined ? {} : {entryMode: input.entryMode}), ...(input.isOpen === undefined ? {} : {isOpen: input.isOpen})}}));
}
