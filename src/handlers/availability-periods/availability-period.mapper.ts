import { AvailabilityPeriod as PeriodRecord } from '@prisma/client';
import { AvailabilityPeriod } from '../../domain/availability.model';
export function mapAvailabilityPeriod(record: PeriodRecord): AvailabilityPeriod {
  return {
    id: record.id,
    storeId: record.storeId,
    startDate: record.startDate.toISOString().slice(0, 10),
    endDate: record.endDate.toISOString().slice(0, 10),
    entryMode: record.entryMode,
    isOpen: record.isOpen,
  };
}
