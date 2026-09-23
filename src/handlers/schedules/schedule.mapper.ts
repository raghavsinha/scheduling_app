import { Prisma } from '@prisma/client';
import { Schedule } from '../../domain/schedule.model';
import { DayType } from '../../domain/common.types';
import { mapShiftType } from '../shift-types/shift-type.mapper';
import { localDate, localTime } from '../shared';

export const scheduleInclude = {
  weeks: {
    orderBy: { weekStartDate: 'asc' as const },
    include: {
      days: {
        orderBy: { date: 'asc' as const },
        include: {
          assignments: {
            orderBy: { startTime: 'asc' as const },
            include: {
              workType: true,
              shiftType: { include: { dayTimes: true } },
            },
          },
        },
      },
    },
  },
} satisfies Prisma.ScheduleInclude;

export type ScheduleRecord = Prisma.ScheduleGetPayload<{
  include: typeof scheduleInclude;
}>;

export function mapSchedule(record: ScheduleRecord): Schedule {
  return {
    id: record.id,
    storeId: record.storeId,
    status: record.status,
    createdBy: record.createdBy,
    publishedBy: record.publishedBy,
    publishedAt: record.publishedAt?.toISOString() ?? null,
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
    weeks: record.weeks.map((week) => ({
      id: week.id,
      weekStartDate: localDate(week.weekStartDate),
      weeklyTemplateId: week.weeklyTemplateId,
      days: week.days.map((day) => ({
        id: day.id,
        date: localDate(day.date),
        dayOfWeek: day.dayOfWeek as DayType,
        adminNotes: day.adminNotes,
        employeeNotes: day.employeeNotes,
        assignments: day.assignments.map((assignment) => ({
          id: assignment.id,
          userId: assignment.userId,
          workType: {
            id: assignment.workType.id,
            storeId: assignment.workType.storeId,
            name: assignment.workType.name,
            description: assignment.workType.description,
            displayOrder: assignment.workType.displayOrder,
            archived: assignment.workType.archived,
          },
          shiftType: assignment.shiftType
            ? mapShiftType(assignment.shiftType)
            : null,
          startTime: localTime(assignment.startTime),
          endTime: localTime(assignment.endTime),
          assignedBy: assignment.assignedBy,
          createdAt: assignment.createdAt.toISOString(),
          updatedAt: assignment.updatedAt.toISOString(),
        })),
      })),
    })),
  };
}
