import { DayType as PrismaDayType, Prisma } from '@prisma/client';
import { DayType } from '../../domain/common.types';
import { ShiftType } from '../../domain/shift-type.model';

export const shiftTypeInclude = { dayTimes: { orderBy: { dayOfWeek: 'asc' as const } } };
export type ShiftTypeWithTimes = Prisma.ShiftTypeGetPayload<{ include: { dayTimes: true } }>;
export function mapShiftType(row: ShiftTypeWithTimes): ShiftType {
  return {
    id: row.id, storeId: row.storeId, name: row.name,
    description: row.description, archived: row.archived,
    dayTimes: row.dayTimes.map(t => ({
      dayOfWeek: t.dayOfWeek as unknown as DayType,
      startTime: t.startTime.toISOString().slice(11, 16),
      endTime: t.endTime.toISOString().slice(11, 16),
    })),
  };
}
