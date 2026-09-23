import { DatabaseClient } from '../../database/database-client.type';
import { ScheduleValidationIssue,ScheduleValidationResult } from './schedule-builder.types';
import { loadBuilderSchedule,loadAvailability,availabilitySignals,overlaps } from './schedule-builder.utils';

export async function validateSchedule(db:DatabaseClient,input:{storeId:string;scheduleId:string}):Promise<ScheduleValidationResult> {
  const schedule=await loadBuilderSchedule(db,input.storeId,input.scheduleId);
  const [members,qualifications]=await Promise.all([
    db.storeUser.findMany({where:{storeId:input.storeId,archivedAt:null}}),
    db.storeUserWorkType.findMany({where:{storeId:input.storeId}}),
  ]);
  const active=new Set(members.map(m=>m.userId));
  const qualified=new Set(qualifications.map(q=>`${q.userId}:${q.workTypeId}`));
  const errors:ScheduleValidationIssue[]=[];
  const warnings:ScheduleValidationIssue[]=[];
  function issue(level:ScheduleValidationIssue['level'],code:ScheduleValidationIssue['code'],message:string,assignmentId:string,userId:string|null) {
    const item:ScheduleValidationIssue={level,code,message,assignmentId,userId};
    (level==='ERROR'?errors:warnings).push(item);
  }
  for(const week of schedule.weeks) for(const day of week.days) {
    for(const assignment of day.assignments) {
      const userId=assignment.userId;
      if(!userId){issue('ERROR','UNFILLED_ASSIGNMENT','Assignment has no employee.',assignment.id,null);continue;}
      if(!active.has(userId)) issue('ERROR','EMPLOYEE_NOT_ACTIVE','Assigned employee is not an active store member.',assignment.id,userId);
      if(!qualified.has(`${userId}:${assignment.workTypeId}`)) issue('ERROR','EMPLOYEE_NOT_QUALIFIED','Assigned employee is not qualified for this work type.',assignment.id,userId);
      if(day.assignments.some(other=>other.id!==assignment.id&&other.userId===userId&&overlaps(other.startTime,other.endTime,assignment.startTime,assignment.endTime))) issue('ERROR','OVERLAPPING_ASSIGNMENTS','Employee has overlapping shifts in this schedule.',assignment.id,userId);
      const submitted=await loadAvailability(db,input.storeId,userId,day.date);
      const signals=availabilitySignals(submitted,day.date,assignment.startTime,assignment.endTime,day.dayOfWeek,assignment.shiftTypeId);
      if(submitted&&!signals.available) issue('WARNING','OUTSIDE_AVAILABILITY','Assignment is outside submitted employee availability.',assignment.id,userId);
      if(submitted&&!signals.preferred) issue('WARNING','EMPLOYEE_NOT_PREFERRED','Assignment is not a preferred shift.',assignment.id,userId);
    }
  }
  return {valid:errors.length===0,errors,warnings};
}
