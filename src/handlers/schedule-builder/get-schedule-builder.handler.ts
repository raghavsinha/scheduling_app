import { DatabaseClient } from '../../database/database-client.type';
import { getSchedule } from '../schedules/get-schedule.handler';
import { ScheduleBuilderView } from './schedule-builder.types';
export async function getScheduleBuilder(db:DatabaseClient,input:{storeId:string;scheduleId:string}):Promise<ScheduleBuilderView> {
  const [schedule, members]=await Promise.all([
    getSchedule(db,input),
    db.storeUser.findMany({where:{storeId:input.storeId,archivedAt:null},include:{user:true},orderBy:{joinedAt:'asc'}}),
  ]);
  return {schedule,employees:members.map(m=>({userId:m.userId,name:m.user.name,username:m.user.username,email:m.user.email,phoneNumber:m.user.phoneNumber,userType:m.userType}))};
}
