import { DayType, Prisma } from '@prisma/client';
import { DatabaseClient } from '../../database/database-client.type';
import { NotFoundError } from '../../common/errors/not-found.error';
import { ValidationError } from '../../common/errors/validation.error';
import { parseDateOnly } from '../availability-periods/availability-period.utils';

type Db = DatabaseClient | Prisma.TransactionClient;
const dayNames: DayType[] = [DayType.SUNDAY,DayType.MONDAY,DayType.TUESDAY,DayType.WEDNESDAY,DayType.THURSDAY,DayType.FRIDAY,DayType.SATURDAY];

export function parseTime(value: string): Date {
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(value)) {
    throw new ValidationError('Time must use HH:mm (24-hour clock).');
  }
  return new Date(`1970-01-01T${value}:00.000Z`);
}
export async function requireActiveMember(db: Db, storeId: string, userId: string) {
  const row = await db.storeUser.findUnique({where:{storeId_userId:{storeId,userId}}});
  if (!row || row.archivedAt) throw new ValidationError('User is not an active store member.');
  return row;
}
export async function requireAvailabilityPeriod(db: Db, storeId: string, periodId: string) {
  const row = await db.availabilityPeriod.findFirst({where:{id:periodId,storeId}});
  if (!row) throw new NotFoundError('Availability period not found.');
  return row;
}
export type DayInput = { date:string; ranges:Array<{startTime:string;endTime:string}> };
export type PreferenceInput = { dayOfWeek:DayType; shiftTypeId:string };
export function validateDays(days:DayInput[], startDate:Date, endDate:Date) {
  const result: Array<{date:Date;startTime:Date;endTime:Date}> = [];
  for (const day of days) {
    const date = parseDateOnly(day.date);
    if (date < startDate || date > endDate) throw new ValidationError('Availability date is outside period.');
    for (const range of day.ranges) {
      const startTime = parseTime(range.startTime),endTime=parseTime(range.endTime);
      if (startTime >= endTime) throw new ValidationError('Availability range must start before it ends.');
      result.push({date,startTime,endTime});
    }
  }
  result.sort((a,b)=>a.date.getTime()-b.date.getTime() || a.startTime.getTime()-b.startTime.getTime());
  for (let i=1;i<result.length;i++) {
    if (result[i].date.getTime()===result[i-1].date.getTime() && result[i].startTime<result[i-1].endTime) {
      throw new ValidationError('Availability ranges cannot overlap on the same date.');
    }
  }
  return result;
}
export async function validatePreferences(db:Db,storeId:string,preferences:PreferenceInput[]) {
  const keys = new Set<string>();
  for(const item of preferences) {
    if (!Object.values(DayType).includes(item.dayOfWeek)) throw new ValidationError('Invalid day of week.');
    const key=`${item.dayOfWeek}:${item.shiftTypeId}`;
    if(keys.has(key)) throw new ValidationError('Duplicate shift preference.');
    keys.add(key);
  }
  const shiftTypeIds=[...new Set(preferences.map(p=>p.shiftTypeId))];
  if (shiftTypeIds.length) {
    const types=await db.shiftType.findMany({where:{storeId,id:{in:shiftTypeIds},archived:false},select:{id:true}});
    if(types.length!==shiftTypeIds.length) throw new ValidationError('Shift preference references an invalid or archived shift type.');
    // Each chosen shift must have configured hours on the corresponding weekday.
    const configured=await db.shiftTypeDayTime.findMany({where:{storeId,shiftTypeId:{in:shiftTypeIds}},select:{shiftTypeId:true,dayOfWeek:true}});
    const configuredKeys=new Set(configured.map(t=>`${t.dayOfWeek}:${t.shiftTypeId}`));
    if (preferences.some(p=>!configuredKeys.has(`${p.dayOfWeek}:${p.shiftTypeId}`))) {
      throw new ValidationError('Shift type is not configured on one or more chosen days.');
    }
  }
}
