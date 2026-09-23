import { AvailabilityEntryMode,DayType,UserType } from '@prisma/client';
import { createMockDatabase,MockDatabaseClient } from '../../test/database.mock';
import { submitUserAvailability } from './submit-user-availability.handler';
import { getUserAvailability } from './get-user-availability.handler';
import { listUserAvailability } from './list-user-availability.handler';
import { deleteUserAvailability } from './delete-user-availability.handler';
import { ValidationError } from '../../common/errors/validation.error';
import { NotFoundError } from '../../common/errors/not-found.error';

describe('User Availability handlers',()=>{
 let db:MockDatabaseClient;
 const now=new Date('2026-09-07T00:00:00.000Z');
 const period={id:'p',storeId:'s',startDate:new Date('2026-09-07T00:00:00Z'),endDate:new Date('2026-09-13T00:00:00Z'),entryMode:AvailabilityEntryMode.TIME,isOpen:true,createdAt:now,updatedAt:now};
 const member={storeId:'s',userId:'u',userType:UserType.EMPLOYEE,joinedAt:now,archivedAt:null};
 const parent={id:'a',storeId:'s',availabilityPeriodId:'p',userId:'u',preferredNumShifts:3,createdAt:now,updatedAt:now};
 const complete={...parent,dayAvailability:[{id:'d',storeId:'s',userAvailabilityId:'a',date:new Date('2026-09-07T00:00:00Z'),startTime:new Date('1970-01-01T10:00:00Z'),endTime:new Date('1970-01-01T14:00:00Z')}],shiftPreferences:[]};
 beforeEach(()=>{
  db=createMockDatabase();
  db.$transaction.mockImplementation(async (callback:any)=>callback(db));
  db.availabilityPeriod.findFirst.mockResolvedValue(period);
  db.storeUser.findUnique.mockResolvedValue(member);
 });
 it('replaces time availability and groups ranges by day',async()=>{
  db.userAvailability.upsert.mockResolvedValue(parent);
  db.dayAvailability.deleteMany.mockResolvedValue({count:0});
  db.availabilityShiftPreference.deleteMany.mockResolvedValue({count:0});
  db.dayAvailability.createMany.mockResolvedValue({count:1});
  db.userAvailability.findUniqueOrThrow.mockResolvedValue(complete as any);
  const result=await submitUserAvailability(db,{storeId:'s',availabilityPeriodId:'p',userId:'u',preferredNumShifts:3,days:[{date:'2026-09-07',ranges:[{startTime:'10:00',endTime:'14:00'}]}]});
  expect(result.days).toEqual([{date:'2026-09-07',ranges:[{startTime:'10:00',endTime:'14:00'}]}]);
  expect(db.dayAvailability.createMany).toHaveBeenCalledTimes(1);
 });
 it('rejects overlapping ranges before writing',async()=>{
  await expect(submitUserAvailability(db,{storeId:'s',availabilityPeriodId:'p',userId:'u',days:[{date:'2026-09-07',ranges:[{startTime:'10:00',endTime:'13:00'},{startTime:'12:00',endTime:'14:00'}]}]})).rejects.toBeInstanceOf(ValidationError);
  expect(db.$transaction).not.toHaveBeenCalled();
 });
 it('rejects submission to closed periods',async()=>{
  db.availabilityPeriod.findFirst.mockResolvedValue({...period,isOpen:false});
  await expect(submitUserAvailability(db,{storeId:'s',availabilityPeriodId:'p',userId:'u'})).rejects.toBeInstanceOf(ValidationError);
 });
 it('validates shift preferences against configured shift type day times',async()=>{
  db.availabilityPeriod.findFirst.mockResolvedValue({...period,entryMode:AvailabilityEntryMode.SHIFT});
  db.shiftType.findMany.mockResolvedValue([{id:'shift'}] as any);
  db.shiftTypeDayTime.findMany.mockResolvedValue([{shiftTypeId:'shift',dayOfWeek:DayType.MONDAY}] as any);
  db.userAvailability.upsert.mockResolvedValue(parent);
  db.dayAvailability.deleteMany.mockResolvedValue({count:0});
  db.availabilityShiftPreference.deleteMany.mockResolvedValue({count:0});
  db.availabilityShiftPreference.createMany.mockResolvedValue({count:1});
  db.userAvailability.findUniqueOrThrow.mockResolvedValue({...parent,dayAvailability:[],shiftPreferences:[{dayOfWeek:DayType.MONDAY,shiftTypeId:'shift'}]} as any);
  const result=await submitUserAvailability(db,{storeId:'s',availabilityPeriodId:'p',userId:'u',preferredShifts:[{dayOfWeek:DayType.MONDAY,shiftTypeId:'shift'}]});
  expect(result.preferredShifts).toHaveLength(1);
 });
 it('reads an existing submission',async()=>{
  db.userAvailability.findFirst.mockResolvedValue(complete as any);
  const result=await getUserAvailability(db,{storeId:'s',availabilityPeriodId:'p',userId:'u'});
  expect(result.days).toHaveLength(1);
 });
 it('throws on absent submission',async()=>{
  db.userAvailability.findFirst.mockResolvedValue(null);
  await expect(getUserAvailability(db,{storeId:'s',availabilityPeriodId:'p',userId:'u'})).rejects.toBeInstanceOf(NotFoundError);
 });
 it('lists submissions for a period',async()=>{
  db.userAvailability.findMany.mockResolvedValue([complete] as any);
  const rows=await listUserAvailability(db,{storeId:'s',availabilityPeriodId:'p'});
  expect(rows).toHaveLength(1);
 });
 it('deletes a submission with child records',async()=>{
  db.userAvailability.findUnique.mockResolvedValue(parent);
  db.dayAvailability.deleteMany.mockResolvedValue({count:1});
  db.availabilityShiftPreference.deleteMany.mockResolvedValue({count:0});
  db.userAvailability.delete.mockResolvedValue(parent);
  await deleteUserAvailability(db,{storeId:'s',availabilityPeriodId:'p',userId:'u'});
  expect(db.userAvailability.delete).toHaveBeenCalledTimes(1);
 });
});
