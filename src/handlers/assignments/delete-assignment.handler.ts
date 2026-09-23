import { DatabaseClient } from '../../database/database-client.type';
import { NotFoundError } from '../../common/errors/not-found.error';
import { ConflictError } from '../../common/errors/conflict.error';
import { getEditableScheduleDay, validateAdminActor } from './assignment-validation.utils';
export interface DeleteAssignmentInput { storeId: string; assignmentId: string; actorUserId: string }
export async function deleteAssignment(db: DatabaseClient, input: DeleteAssignmentInput):Promise<void> {
  const a = await db.shiftAssignment.findFirst({where:{id:input.assignmentId,storeId:input.storeId}});
  if(!a) throw new NotFoundError('Assignment not found.');
  await getEditableScheduleDay(db,input.storeId,a.scheduleDayId);
  await validateAdminActor(db,input.storeId,input.actorUserId);
  const linked = await db.coverRequest.findFirst({where:{OR:[{shiftAssignmentId:a.id},{swapAssignmentId:a.id}]},select:{id:true}});
  if(linked) throw new ConflictError('Cannot delete an assignment referenced by a cover request.');
  await db.shiftAssignment.delete({where:{id:a.id}});
}
