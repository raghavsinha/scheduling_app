import 'dotenv/config';
import { AvailabilityEntryMode } from '@prisma/client';
import { prisma } from '../database/prisma.client';
import { submitUserAvailability } from '../handlers/user-availability/submit-user-availability.handler';
import { getUserAvailability } from '../handlers/user-availability/get-user-availability.handler';
import { deleteUserAvailability } from '../handlers/user-availability/delete-user-availability.handler';
async function main() {
 const store=await prisma.store.findFirst({where:{name:'Sample Tea Shop'}});
 if(!store) throw new Error('Sample Tea Shop not found; run seed first.');
 const member=await prisma.storeUser.findFirst({where:{storeId:store.id,userType:'EMPLOYEE',archivedAt:null}});
 if(!member) throw new Error('No active employee found.');
 // Use a new far-future period, leaving existing seeded availability untouched.
 const period=await prisma.availabilityPeriod.create({data:{storeId:store.id,startDate:new Date('2037-09-07T00:00:00.000Z'),endDate:new Date('2037-09-13T00:00:00.000Z'),entryMode:AvailabilityEntryMode.TIME,isOpen:true}});
 try {
  const first=await submitUserAvailability(prisma,{storeId:store.id,availabilityPeriodId:period.id,userId:member.userId,preferredNumShifts:3,days:[{date:'2037-09-07',ranges:[{startTime:'10:00',endTime:'14:00'}]}]});
  if(first.days.length!==1) throw new Error('Submission missing expected day.');
  const second=await submitUserAvailability(prisma,{storeId:store.id,availabilityPeriodId:period.id,userId:member.userId,preferredNumShifts:2,days:[{date:'2037-09-07',ranges:[{startTime:'12:00',endTime:'17:00'}]}]});
  if(second.days[0]?.ranges[0]?.startTime!=='12:00' || second.days[0].ranges.length!==1) throw new Error('Replacement did not apply.');
  const fetched=await getUserAvailability(prisma,{storeId:store.id,availabilityPeriodId:period.id,userId:member.userId});
  if(fetched.preferredNumShifts!==2) throw new Error('Preferred number of shifts not persisted.');
  await deleteUserAvailability(prisma,{storeId:store.id,availabilityPeriodId:period.id,userId:member.userId});
  const remaining=await prisma.userAvailability.count({where:{availabilityPeriodId:period.id}});
  if(remaining!==0) throw new Error('Submission not deleted.');
  console.log('PASS — user availability submit / replace / get / delete');
 } finally {
  // Cleanup even if assertion fails.
  const rows=await prisma.userAvailability.findMany({where:{availabilityPeriodId:period.id},select:{id:true}});
  const ids=rows.map(r=>r.id);
  if(ids.length){await prisma.dayAvailability.deleteMany({where:{userAvailabilityId:{in:ids}}});await prisma.availabilityShiftPreference.deleteMany({where:{userAvailabilityId:{in:ids}}});await prisma.userAvailability.deleteMany({where:{id:{in:ids}}});}
  await prisma.availabilityPeriod.delete({where:{id:period.id}});
 }
}
main().catch(e=>{console.error(e);process.exitCode=1;}).finally(async()=>{await prisma.$disconnect();});
