import { DayType, ISODate, ISOTimestamp, LocalTime, UUID } from './common.types';
import { WorkType } from './work-type.model';
import { ShiftType } from './shift-type.model';

export type ScheduleStatus = 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
export interface ShiftAssignment {
  id: UUID;
  userId: UUID | null;
  workType: WorkType;
  shiftType: ShiftType | null;
  startTime: LocalTime;
  endTime: LocalTime;
  assignedBy: UUID | null;
  createdAt: ISOTimestamp;
  updatedAt: ISOTimestamp;
}
export interface ScheduleDay {
  id: UUID;
  date: ISODate;
  dayOfWeek: DayType;
  adminNotes: string | null;
  employeeNotes: string | null;
  assignments: ShiftAssignment[];
}
export interface ScheduleWeek {
  id: UUID;
  weekStartDate: ISODate;
  weeklyTemplateId: UUID | null;
  days: ScheduleDay[];
}
export interface Schedule {
  id: UUID;
  storeId: UUID;
  status: ScheduleStatus;
  createdBy: UUID;
  publishedBy: UUID | null;
  publishedAt: ISOTimestamp | null;
  createdAt: ISOTimestamp;
  updatedAt: ISOTimestamp;
  weeks: ScheduleWeek[];
}
