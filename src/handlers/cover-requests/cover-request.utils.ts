import { CoverRequestStatus, ScheduleStatus, UserType } from '@prisma/client';
import { DatabaseExecutor } from '../../database/database-client.type';
import { ConflictError } from '../../common/errors/conflict.error';
import { NotFoundError } from '../../common/errors/not-found.error';
import { ValidationError } from '../../common/errors/validation.error';
import { SameDayAssignmentSummary } from './cover-request.types';
export type CoverDb=DatabaseExecutor;
export const ACTIVE_REQUEST_STATUSES:CoverRequestStatus[]=[CoverRequestStatus.OPEN,CoverRequestStatus.PENDING_USER,CoverRequestStatus.DECLINED];
export async function validateActiveStoreUser(db:CoverDb,storeId:string,userId:string) {
  const member=await db.storeUser.findUnique({where:{storeId_userId:{storeId,userId}}});
  if(!member||member.archivedAt) throw new ValidationError('User is not an active member of this store.');
  return member;
}
export async function validateAdmin(db:CoverDb,storeId:string,userId:string){
  const member=await validateActiveStoreUser(db,storeId,userId);
  if(member.userType!==UserType.ADMIN) throw new ValidationError('Only an active store administrator can access this view.');
}
export async function getPublishedAssignment(db:CoverDb,storeId:string,id:string){
  const a=await db.shiftAssignment.findFirst({where:{id,storeId},include:{scheduleDay:{include:{scheduleWeek:{include:{schedule:true}}}}}});
  if(!a) throw new NotFoundError('Assignment not found.');
  if(a.scheduleDay.scheduleWeek.schedule.status!==ScheduleStatus.PUBLISHED) throw new ValidationError('Cover requests require a published schedule.');
  return a;
}
export async function validateQualification(db:CoverDb,storeId:string,userId:string,workTypeId:string){
  await validateActiveStoreUser(db,storeId,userId);
  const q=await db.storeUserWorkType.findFirst({where:{storeId,userId,workTypeId}});
  if(!q) throw new ValidationError('Employee is not qualified for this work type.');
}
export async function getSameDayAssignments(db:CoverDb,args:{storeId:string;userId:string;date:Date;excludeIds?:string[]}){
  return db.shiftAssignment.findMany({where:{storeId:args.storeId,userId:args.userId,
    ...(args.excludeIds?.length?{id:{notIn:args.excludeIds}}:{}),
    scheduleDay:{date:args.date,scheduleWeek:{schedule:{status:ScheduleStatus.PUBLISHED}}}},
    include:{scheduleDay:true}});
}
export function sameDaySummary(rows:Awaited<ReturnType<typeof getSameDayAssignments>>):SameDayAssignmentSummary[]{
  return rows.map(a=>({id:a.id,date:a.scheduleDay.date.toISOString().slice(0,10),startTime:a.startTime.toISOString(),endTime:a.endTime.toISOString(),workTypeId:a.workTypeId,shiftTypeId:a.shiftTypeId}));
}
export async function validateNoResultingOverlap(db:CoverDb,args:{storeId:string;userId:string;date:Date;startTime:Date;endTime:Date;excludeIds?:string[]}){
  const rows=await getSameDayAssignments(db,args);
  if(rows.some(a=>a.startTime<args.endTime&&a.endTime>args.startTime)) throw new ValidationError('Employee would have overlapping published shifts.');
}
export async function validateNoExistingActiveRequest(db:CoverDb,shiftAssignmentId:string,excludeRequestId?:string){
  const existing=await db.coverRequest.findFirst({where:{shiftAssignmentId,status:{in:ACTIVE_REQUEST_STATUSES},...(excludeRequestId?{NOT:{id:excludeRequestId}}:{})}});
  if(existing) throw new ConflictError('There is already an unresolved cover request for this assignment.');
}
export async function createCoverEvent(db:CoverDb,args:{storeId:string;coverRequestId:string;actorUserId:string;eventType:string}){
  await db.coverRequestEvent.create({data:args});
}
export function assertRequesterOwnsAssignment(userId:string|null,requestingUserId:string){
  if(userId!==requestingUserId) throw new ValidationError('Requester must own the source assignment.');
}
