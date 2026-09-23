import { Prisma, ScheduleStatus, UserType } from '@prisma/client';
import { DatabaseExecutor } from '../../database/database-client.type';
import { NotFoundError } from '../../common/errors/not-found.error';
import { ValidationError } from '../../common/errors/validation.error';
import { requireMembership, time } from '../shared';

export type AssignmentDb = DatabaseExecutor;
export { time };

export function validateTimeRange(start: Date, end: Date): void {
  if (start >= end) throw new ValidationError('Assignment end must be after start (overnight assignments are not supported).');
}

export async function getEditableScheduleDay(db: AssignmentDb, storeId: string, scheduleDayId: string) {
  const day = await db.scheduleDay.findFirst({
    where: { id: scheduleDayId, storeId },
    include: { scheduleWeek: { include: { schedule: true } } },
  });
  if (!day) throw new NotFoundError('Schedule day not found.');
  if (day.scheduleWeek.schedule.status !== ScheduleStatus.DRAFT) throw new ValidationError('Assignments may be edited only on draft schedules.');
  return day;
}

export async function validateAdminActor(db: AssignmentDb, storeId: string, actorUserId: string) {
  const member = await requireMembership(db, storeId, actorUserId);
  if (member.userType !== UserType.ADMIN) throw new ValidationError('Only an active store admin may edit assignments.');
  return member;
}

export async function validateWorkType(db: AssignmentDb, storeId: string, workTypeId: string) {
  const workType = await db.workType.findFirst({ where: { id: workTypeId, storeId, archived: false } });
  if (!workType) throw new ValidationError('Work type does not belong to this store or is archived.');
  return workType;
}

export async function validateShiftType(db: AssignmentDb, storeId: string, shiftTypeId: string | null | undefined) {
  if (!shiftTypeId) return null;
  const shiftType = await db.shiftType.findFirst({ where: { id: shiftTypeId, storeId, archived: false } });
  if (!shiftType) throw new ValidationError('Shift type does not belong to this store or is archived.');
  return shiftType;
}

export async function validateEmployeeForWorkType(db: AssignmentDb, storeId: string, userId: string, workTypeId: string) {
  await requireMembership(db, storeId, userId);
  const qualification = await db.storeUserWorkType.findFirst({ where: { storeId, userId, workTypeId } });
  if (!qualification) throw new ValidationError('Employee is not qualified for this work type.');
  return qualification;
}

export interface OverlapInput {
  storeId: string;
  scheduleId: string;
  scheduleDate: Date;
  userId: string;
  startTime: Date;
  endTime: Date;
  excludeAssignmentId?: string;
}
export async function validateNoOverlap(db: AssignmentDb, input: OverlapInput): Promise<void> {
  const existing = await db.shiftAssignment.findFirst({
    where: {
      storeId: input.storeId, userId: input.userId,
      ...(input.excludeAssignmentId ? { id: { not: input.excludeAssignmentId } } : {}),
      scheduleDay: {
        date: input.scheduleDate,
        scheduleWeek: { scheduleId: input.scheduleId },
      },
      startTime: { lt: input.endTime },
      endTime: { gt: input.startTime },
    },
    select: { id: true },
  });
  if (existing) throw new ValidationError('Employee already has an overlapping assignment in this schedule.');
}
