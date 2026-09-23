import 'dotenv/config';
import { PrismaClient, UserType } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { createSchedule } from '../handlers/schedules/create-schedule.handler';
import { createAssignment } from '../handlers/assignments/create-assignment.handler';
import { updateAssignment } from '../handlers/assignments/update-assignment.handler';
import { deleteAssignment } from '../handlers/assignments/delete-assignment.handler';

const db=new PrismaClient({adapter:new PrismaPg({connectionString:process.env.DATABASE_URL!})});
async function main(){
  const store=await db.store.findFirst({where:{name:'Sample Tea Shop'}});
  if(!store) throw new Error('Seed Sample Tea Shop first');
  const admin=await db.storeUser.findFirst({where:{storeId:store.id,userType:UserType.ADMIN,archivedAt:null}});
  const workType=await db.workType.findFirst({where:{storeId:store.id,archived:false}});
  if(!admin||!workType) throw new Error('Seed an active admin and work type first');
  // Isolated future week; always clean up the records created by this test.
  const schedule=await createSchedule(db,{storeId:store.id,createdBy:admin.userId,weeks:[{weekStartDate:'2035-09-03'}]});
  try {
    const scheduleDay=schedule.weeks[0].days[0];
    const created=await createAssignment(db,{storeId:store.id,scheduleDayId:scheduleDay.id,
      actorUserId:admin.userId,workTypeId:workType.id,startTime:'10:00',endTime:'14:00'});
    if(created.userId!==null)throw new Error('Expected unassigned slot');
    const changed=await updateAssignment(db,{storeId:store.id,assignmentId:created.id,actorUserId:admin.userId,startTime:'11:00'});
    if(changed.startTime!=='11:00') throw new Error('Update failed');
    await deleteAssignment(db,{storeId:store.id,assignmentId:created.id,actorUserId:admin.userId});
    console.log('Assignment create/update/delete smoke test passed');
  }finally{
    const weeks=await db.scheduleWeek.findMany({where:{scheduleId:schedule.id},select:{id:true}});
    const weekIds=weeks.map(w=>w.id);
    const days=await db.scheduleDay.findMany({where:{scheduleWeekId:{in:weekIds}},select:{id:true}});
    await db.shiftAssignment.deleteMany({where:{scheduleDayId:{in:days.map(d=>d.id)}}});
    await db.scheduleDay.deleteMany({where:{scheduleWeekId:{in:weekIds}}});
    await db.scheduleWeek.deleteMany({where:{scheduleId:schedule.id}});
    await db.schedule.delete({where:{id:schedule.id}});
  }
}
main().catch(e=>{console.error(e);process.exitCode=1}).finally(async()=>db.$disconnect());
