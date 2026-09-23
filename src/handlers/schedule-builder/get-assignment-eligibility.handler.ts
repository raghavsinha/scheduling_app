import { DatabaseClient } from '../../database/database-client.type';
import { NotFoundError } from '../../common/errors/not-found.error';
import { EligibilityCandidate } from './schedule-builder.types';
import { availabilitySignals,loadAvailability,overlaps } from './schedule-builder.utils';

export async function getAssignmentEligibility(db:DatabaseClient,input:{storeId:string;assignmentId:string}):Promise<EligibilityCandidate[]> {
  const assignment=await db.shiftAssignment.findFirst({where:{id:input.assignmentId,storeId:input.storeId},include:{scheduleDay:{include:{scheduleWeek:true}}}});
  if(!assignment) throw new NotFoundError('Assignment not found.');
  const [members,qualifications,otherAssignments]=await Promise.all([
    db.storeUser.findMany({where:{storeId:input.storeId,archivedAt:null},include:{user:true}}),
    db.storeUserWorkType.findMany({where:{storeId:input.storeId,workTypeId:assignment.workTypeId}}),
    db.shiftAssignment.findMany({where:{storeId:input.storeId,scheduleDay:{date:assignment.scheduleDay.date,scheduleWeek:{scheduleId:assignment.scheduleDay.scheduleWeek.scheduleId}},userId:{not:null},id:{not:assignment.id}}}),
  ]);
  const qualified=new Set(qualifications.map(q=>q.userId));
  return Promise.all(members.map(async m=>{
    const hasQualification=qualified.has(m.userId);
    const conflicting=otherAssignments.some(other=>other.userId===m.userId&&overlaps(other.startTime,other.endTime,assignment.startTime,assignment.endTime));
    const submission=await loadAvailability(db,input.storeId,m.userId,assignment.scheduleDay.date);
    const availability=availabilitySignals(submission,assignment.scheduleDay.date,assignment.startTime,assignment.endTime,assignment.scheduleDay.dayOfWeek,assignment.shiftTypeId);
    const reasons:EligibilityCandidate['reasons']=[];
    if(!hasQualification) reasons.push('NOT_QUALIFIED');
    if(conflicting) reasons.push('OVERLAPPING_ASSIGNMENT');
    // Availability/preference are advisory, not assignment blockers.
    if(!availability.available) reasons.push('OUTSIDE_AVAILABILITY');
    return {userId:m.userId,name:m.user.name,username:m.user.username,email:m.user.email,phoneNumber:m.user.phoneNumber,qualified:hasQualification,available:availability.available,preferred:availability.preferred,overlapping:conflicting,eligible:hasQualification&&!conflicting,reasons};
  }));
}
