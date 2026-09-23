import { DatabaseClient } from '../../database/database-client.type';
import { NotFoundError } from '../../common/errors/not-found.error';
import { ScheduleStatus } from '@prisma/client';

export const isoDay = (d: Date) => d.toISOString().slice(0,10);
export const minute = (d: Date) => d.getUTCHours()*60+d.getUTCMinutes();
export function overlaps(aStart:Date,aEnd:Date,bStart:Date,bEnd:Date) {
  return aStart < bEnd && aEnd > bStart;
}
export async function loadBuilderSchedule(db:DatabaseClient,storeId:string,scheduleId:string) {
  const schedule=await db.schedule.findFirst({where:{id:scheduleId,storeId},include:{weeks:{include:{days:{include:{assignments:true}}}}}});
  if(!schedule) throw new NotFoundError('Schedule not found.');
  return schedule;
}
export async function loadAvailability(db:DatabaseClient,storeId:string,userId:string,date:Date) {
  // Prefer the period covering this date; don't misrepresent a past or future period as current.
  return db.userAvailability.findFirst({where:{storeId,userId,availabilityPeriod:{startDate:{lte:date},endDate:{gte:date}}},include:{dayAvailability:true,shiftPreferences:true}});
}
export function availabilitySignals(availability:Awaited<ReturnType<typeof loadAvailability>>,date:Date,start:Date,end:Date,dayOfWeek:string,shiftTypeId:string|null) {
  // A missing submission is unknown, not an explicit "unavailable" declaration.
  if(!availability) return {available:true,preferred:true,hasSubmission:false};
  const ranges=availability.dayAvailability.filter(x=>isoDay(x.date)===isoDay(date));
  const available=ranges.some(x=>minute(x.startTime)<=minute(start)&&minute(x.endTime)>=minute(end));
  const prefs=availability.shiftPreferences;
  const preferred=!shiftTypeId || prefs.length===0 || prefs.some(x=>x.dayOfWeek===dayOfWeek && x.shiftTypeId===shiftTypeId);
  return {available,preferred,hasSubmission:true};
}
