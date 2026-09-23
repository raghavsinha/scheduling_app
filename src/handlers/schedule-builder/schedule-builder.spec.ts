import { createMockDatabase,MockDatabaseClient } from '../../test/database.mock';
import { getScheduleBuilder } from './get-schedule-builder.handler';
import { getAssignmentEligibility } from './get-assignment-eligibility.handler';
import { validateSchedule } from './validate-schedule.handler';
import { NotFoundError } from '../../common/errors/not-found.error';

describe('Schedule builder',()=>{
 let db:MockDatabaseClient;
 const date=new Date('2030-08-05T00:00:00.000Z');
 const at=(s:string)=>new Date(`1970-01-01T${s}:00.000Z`);
 const day={id:'day',storeId:'store',scheduleWeekId:'week',date,dayOfWeek:'MONDAY',adminNotes:null,employeeNotes:null};
 const assignment={id:'shift',storeId:'store',scheduleDayId:'day',userId:'bob',workTypeId:'tea',shiftTypeId:'morning',startTime:at('10:00'),endTime:at('14:00'),assignedBy:'alice',createdAt:date,updatedAt:date};
 beforeEach(()=>{db=createMockDatabase();});
 it('rejects eligibility lookups for unknown assignments',async()=>{
   db.shiftAssignment.findFirst.mockResolvedValue(null);
   await expect(getAssignmentEligibility(db,{storeId:'store',assignmentId:'none'})).rejects.toBeInstanceOf(NotFoundError);
 });
 it('marks an unqualified member ineligible without treating missing availability as a blocker',async()=>{
   db.shiftAssignment.findFirst.mockResolvedValue({...assignment,scheduleDay:{...day,scheduleWeek:{id:'week',scheduleId:'schedule'}}} as any);
   db.storeUser.findMany.mockResolvedValue([{storeId:'store',userId:'bob',userType:'EMPLOYEE',joinedAt:date,archivedAt:null,user:{id:'bob',name:'Bob',username:'bob',email:'bob@example.com',phoneNumber:null}}] as any);
   db.storeUserWorkType.findMany.mockResolvedValue([]);
   db.shiftAssignment.findMany.mockResolvedValue([]);
   db.userAvailability.findFirst.mockResolvedValue(null);
   const candidates=await getAssignmentEligibility(db,{storeId:'store',assignmentId:'shift'});
   expect(candidates).toHaveLength(1);
   expect(candidates[0]).toMatchObject({qualified:false,available:true,eligible:false,reasons:['NOT_QUALIFIED']});
 });
 it('returns an unfilled-assignment error',async()=>{
   db.schedule.findFirst.mockResolvedValue({id:'schedule',storeId:'store',weeks:[{days:[{...day,assignments:[{...assignment,userId:null}]}]}]} as any);
   db.storeUser.findMany.mockResolvedValue([]);
   db.storeUserWorkType.findMany.mockResolvedValue([]);
   const result=await validateSchedule(db,{storeId:'store',scheduleId:'schedule'});
   expect(result.valid).toBe(false);
   expect(result.errors[0].code).toBe('UNFILLED_ASSIGNMENT');
 });
 it('keeps availability warning non-blocking',async()=>{
   db.schedule.findFirst.mockResolvedValue({id:'schedule',storeId:'store',weeks:[{days:[{...day,assignments:[assignment]}]}]} as any);
   db.storeUser.findMany.mockResolvedValue([{userId:'bob'}] as any);
   db.storeUserWorkType.findMany.mockResolvedValue([{userId:'bob',workTypeId:'tea'}] as any);
   db.userAvailability.findFirst.mockResolvedValue({dayAvailability:[],shiftPreferences:[]} as any);
   const result=await validateSchedule(db,{storeId:'store',scheduleId:'schedule'});
   expect(result.valid).toBe(true);
   expect(result.warnings.map(w=>w.code)).toContain('OUTSIDE_AVAILABILITY');
 });
});
