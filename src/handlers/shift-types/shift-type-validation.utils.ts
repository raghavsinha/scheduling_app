import { DayType } from '@prisma/client';
import { ValidationError } from '../../common/errors/validation.error';

export interface ShiftTypeDayTimeInput {
  dayOfWeek: DayType;
  startTime: string;
  endTime: string;
}
const LOCAL_TIME = /^([01]\d|2[0-3]):[0-5]\d$/;
export function parseTime(value: string): Date {
  if (!LOCAL_TIME.test(value)) throw new ValidationError('Time must use HH:mm format.');
  return new Date(`1970-01-01T${value}:00.000Z`);
}
export function validateDayTimes(times: ShiftTypeDayTimeInput[]): void {
  const days = new Set<DayType>();
  for (const entry of times) {
    if (!Object.values(DayType).includes(entry.dayOfWeek)) {
      throw new ValidationError('Unknown day of week.');
    }
    if (days.has(entry.dayOfWeek)) throw new ValidationError('Duplicate day of week.');
    days.add(entry.dayOfWeek);
    if (parseTime(entry.startTime) >= parseTime(entry.endTime)) {
      throw new ValidationError('Shift end time must be after start time.');
    }
  }
}
