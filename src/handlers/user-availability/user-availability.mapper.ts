import { Prisma } from '@prisma/client';
import { DayType } from '../../domain/common.types';
import { UserAvailability } from '../../domain/availability.model';

export const userAvailabilityInclude = {
  dayAvailability: { orderBy: [{ date: 'asc' }, { startTime: 'asc' }] },
  shiftPreferences: { orderBy: [{ dayOfWeek: 'asc' }, { shiftTypeId: 'asc' }] },
} as const satisfies Prisma.UserAvailabilityInclude;

type AvailabilityRecord = Prisma.UserAvailabilityGetPayload<{
  include: typeof userAvailabilityInclude;
}>;

function timeString(date: Date): string {
  return date.toISOString().slice(11, 16);
}

export function mapUserAvailability(row: AvailabilityRecord): UserAvailability {
  const byDate = new Map<string, Array<{ startTime: string; endTime: string }>>();
  for (const range of row.dayAvailability) {
    const date = range.date.toISOString().slice(0, 10);
    const items = byDate.get(date) ?? [];
    items.push({ startTime: timeString(range.startTime), endTime: timeString(range.endTime) });
    byDate.set(date, items);
  }
  return {
    id: row.id,
    storeId: row.storeId,
    availabilityPeriodId: row.availabilityPeriodId,
    userId: row.userId,
    preferredNumShifts: row.preferredNumShifts,
    days: [...byDate].map(([date, ranges]) => ({ date, ranges })),
    preferredShifts: row.shiftPreferences.map(({ dayOfWeek, shiftTypeId }) => ({
      dayOfWeek: dayOfWeek as DayType, shiftTypeId,
    })),
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}
