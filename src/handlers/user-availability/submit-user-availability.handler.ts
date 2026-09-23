import { AvailabilityEntryMode, DayType } from '@prisma/client';
import { DatabaseClient } from '../../database/database-client.type';
import { UserAvailability } from '../../domain/availability.model';
import { ValidationError } from '../../common/errors/validation.error';
import { mapUserAvailability, userAvailabilityInclude } from './user-availability.mapper';
import { DayInput, PreferenceInput, requireActiveMember, requireAvailabilityPeriod, validateDays, validatePreferences } from './user-availability.utils';

export interface SubmitUserAvailabilityInput {
  storeId: string;
  availabilityPeriodId: string;
  userId: string;
  preferredNumShifts?: number | null;
  days?: DayInput[];
  preferredShifts?: PreferenceInput[];
}

export async function submitUserAvailability(db:DatabaseClient,input:SubmitUserAvailabilityInput):Promise<UserAvailability> {
  const period=await requireAvailabilityPeriod(db,input.storeId,input.availabilityPeriodId);
  await requireActiveMember(db,input.storeId,input.userId);
  if(!period.isOpen) throw new ValidationError('Availability period is closed.');
  if(input.preferredNumShifts!==undefined && input.preferredNumShifts!==null && (!Number.isInteger(input.preferredNumShifts) || input.preferredNumShifts<0 || input.preferredNumShifts>31)) {
    throw new ValidationError('Preferred number of shifts must be a non-negative integer up to 31.');
  }
  if(period.entryMode===AvailabilityEntryMode.TIME && input.preferredShifts?.length) throw new ValidationError('This period accepts time ranges rather than shift preferences.');
  if(period.entryMode===AvailabilityEntryMode.SHIFT && input.days?.some(d=>d.ranges.length)) throw new ValidationError('This period accepts shift preferences rather than time ranges.');
  const ranges=validateDays(input.days ?? [],period.startDate,period.endDate);
  const preferences=(input.preferredShifts ?? []) as Array<{dayOfWeek:DayType;shiftTypeId:string}>;
  if(period.entryMode===AvailabilityEntryMode.SHIFT) await validatePreferences(db,input.storeId,preferences);
  // A submission replaces the employee's prior submission for this period, including its child records.
  // Run all writes in a single transaction so partial replacements are never persisted.
  const row=await db.$transaction(async tx=>{
    const parent=await tx.userAvailability.upsert({
      where:{availabilityPeriodId_userId:{availabilityPeriodId:input.availabilityPeriodId,userId:input.userId}},
      create:{storeId:input.storeId,availabilityPeriodId:input.availabilityPeriodId,userId:input.userId,preferredNumShifts:input.preferredNumShifts ?? null},
      update:{preferredNumShifts:input.preferredNumShifts ?? null},
    });
    await tx.dayAvailability.deleteMany({where:{userAvailabilityId:parent.id}});
    await tx.availabilityShiftPreference.deleteMany({where:{userAvailabilityId:parent.id}});
    if(ranges.length) await tx.dayAvailability.createMany({data:ranges.map(r=>({storeId:input.storeId,userAvailabilityId:parent.id,...r}))});
    if(preferences.length) await tx.availabilityShiftPreference.createMany({data:preferences.map(p=>({storeId:input.storeId,userAvailabilityId:parent.id,...p}))});
    return tx.userAvailability.findUniqueOrThrow({where:{id:parent.id},include:userAvailabilityInclude});
  });
  return mapUserAvailability(row);
}
