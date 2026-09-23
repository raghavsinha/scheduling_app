import { DatabaseClient } from '../../database/database-client.type';
import { NotFoundError } from '../../common/errors/not-found.error';
import { assignmentInclude, mapAssignment } from './assignment.mapper';
import { time, validateTimeRange, getEditableScheduleDay, validateAdminActor, validateWorkType, validateShiftType, validateEmployeeForWorkType, validateNoOverlap } from './assignment-validation.utils';
export interface UpdateAssignmentInput {
  storeId: string; assignmentId: string; actorUserId: string;
  userId?: string | null; workTypeId?: string; shiftTypeId?: string | null;
  startTime?: string; endTime?: string;
}
export async function updateAssignment(db: DatabaseClient, input: UpdateAssignmentInput) {
  const prior = await db.shiftAssignment.findFirst({where:{id:input.assignmentId,storeId:input.storeId}});
  if(!prior) throw new NotFoundError('Assignment not found.');
  const day = await getEditableScheduleDay(db,input.storeId,prior.scheduleDayId);
  await validateAdminActor(db,input.storeId,input.actorUserId);
  const userId = input.userId === undefined ? prior.userId : input.userId;
  const workTypeId = input.workTypeId ?? prior.workTypeId;
  const shiftTypeId = input.shiftTypeId === undefined ? prior.shiftTypeId : input.shiftTypeId;
  const start = input.startTime === undefined ? prior.startTime : time(input.startTime);
  const end = input.endTime === undefined ? prior.endTime : time(input.endTime);
  validateTimeRange(start,end);
  await validateWorkType(db,input.storeId,workTypeId);
  await validateShiftType(db,input.storeId,shiftTypeId);
  if(userId){
    await validateEmployeeForWorkType(db,input.storeId,userId,workTypeId);
    await validateNoOverlap(db,{storeId:input.storeId,scheduleId:day.scheduleWeek.scheduleId,
      scheduleDate:day.date,userId,startTime:start,endTime:end,excludeAssignmentId:prior.id});
  }
  const updated = await db.shiftAssignment.update({where:{id:prior.id},data:{userId,workTypeId,shiftTypeId,startTime:start,endTime:end,assignedBy:input.actorUserId},include:assignmentInclude});
  return mapAssignment(updated);
}
