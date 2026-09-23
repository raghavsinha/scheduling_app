import { DatabaseClient } from '../../database/database-client.type';
import { NotFoundError } from '../../common/errors/not-found.error';
import { assignmentInclude, mapAssignment } from './assignment.mapper';
export interface GetAssignmentInput { storeId: string; assignmentId: string }
export async function getAssignment(db: DatabaseClient, input: GetAssignmentInput) {
  const a = await db.shiftAssignment.findFirst({where:{id:input.assignmentId,storeId:input.storeId},include:assignmentInclude});
  if(!a) throw new NotFoundError('Assignment not found.');
  return mapAssignment(a);
}
