import { DayType, ISODate, ISOTimestamp, LocalTime, UUID } from './common.types';

export type AvailabilityEntryMode = 'TIME' | 'SHIFT';
export interface AvailabilityPeriod {
  id: UUID;
  storeId: UUID;
  startDate: ISODate;
  endDate: ISODate;
  entryMode: AvailabilityEntryMode;
  isOpen: boolean;
}
export interface AvailabilityDay {
  date: ISODate;
  ranges: Array<{ startTime: LocalTime; endTime: LocalTime }>;
}
export interface PreferredShift {
  dayOfWeek: DayType;
  shiftTypeId: UUID;
}
export interface UserAvailability {
  id: UUID;
  storeId: UUID;
  availabilityPeriodId: UUID;
  userId: UUID;
  preferredNumShifts: number | null;
  days: AvailabilityDay[];
  preferredShifts: PreferredShift[];
  createdAt: ISOTimestamp;
  updatedAt: ISOTimestamp;
}
