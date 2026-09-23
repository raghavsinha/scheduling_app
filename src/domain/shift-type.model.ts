import { DayType, LocalTime, UUID } from './common.types';

export interface ShiftTypeDayTime {
  dayOfWeek: DayType;
  startTime: LocalTime;
  endTime: LocalTime;
}
export interface ShiftType {
  id: UUID;
  storeId: UUID;
  name: string;
  description: string | null;
  archived: boolean;
  dayTimes: ShiftTypeDayTime[];
}
