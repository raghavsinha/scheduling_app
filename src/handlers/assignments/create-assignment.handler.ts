import { DatabaseClient } from '../../database/database-client.type';
import { mapAssignment, assignmentInclude } from './assignment.mapper';
import { time, validateTimeRange, getEditableScheduleDay, validateAdminActor, validateWorkType, validateShiftType, validateEmployeeForWorkType, validateNoOverlap } from './assignment-validation.utils';

export interface CreateAssignmentInput {
  storeId: string; scheduleDayId: string; actorUserId: string;
  userId?: string | null; workTypeId: string; shiftTypeId?: string | null;
  startTime: string; endTime: string;
}
export async function createAssignment(db: DatabaseClient, input: CreateAssignmentInput) {
  const day = await getEditableScheduleDay(db, input.storeId, input.scheduleDayId);
  await validateAdminActor(db, input.storeId, input.actorUserId);
  await validateWorkType(db, input.storeId, input.workTypeId);
  await validateShiftType(db, input.storeId, input.shiftTypeId);
  const start = time(input.startTime), end = time(input.endTime);
  validateTimeRange(start, end);
  if (input.userId) {
    await validateEmployeeForWorkType(db, input.storeId, input.userId, input.workTypeId);
    await validateNoOverlap(db, { storeId: input.storeId, scheduleId: day.scheduleWeek.scheduleId,
      scheduleDate: day.date, userId: input.userId, startTime: start, endTime: end });
  }
  const created = await db.shiftAssignment.create({
    data: { storeId: input.storeId, scheduleDayId: input.scheduleDayId,
      userId: input.userId ?? null, workTypeId: input.workTypeId,
      shiftTypeId: input.shiftTypeId ?? null, startTime: start, endTime: end,
      assignedBy: input.actorUserId }, include: assignmentInclude,
  });
  return mapAssignment(created);
}
