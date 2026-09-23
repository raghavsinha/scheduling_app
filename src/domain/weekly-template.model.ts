import { DayType, ISOTimestamp, UUID } from './common.types';
export interface WeekShiftRequirement {
  id: UUID;
  dayOfWeek: DayType;
  shiftTypeId: UUID;
  workTypeId: UUID;
  requiredCount: number;
}
export interface WeeklyTemplate {
  id: UUID;
  storeId: UUID;
  name: string;
  isDefault: boolean;
  archived: boolean;
  requirements: WeekShiftRequirement[];
  createdAt: ISOTimestamp;
  updatedAt: ISOTimestamp;
}
