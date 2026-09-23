import 'dotenv/config';
import { DayType, PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { createShiftType } from '../handlers/shift-types/create-shift-type.handler';
import { getShiftType } from '../handlers/shift-types/get-shift-type.handler';
import { listShiftTypes } from '../handlers/shift-types/list-shift-types.handler';
import { updateShiftType } from '../handlers/shift-types/update-shift-type.handler';
import { deleteShiftType } from '../handlers/shift-types/delete-shift-type.handler';
const db = new PrismaClient({adapter:new PrismaPg({connectionString:process.env.DATABASE_URL!})});
async function main() {
  const suffix=`${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const user=await db.user.create({data:{
    username:`shift-test-${suffix}`,email:`shift-test-${suffix}@example.invalid`,
    name:'Shift Test Owner',passwordHash:'TEST_ONLY_NOT_A_PASSWORD_HASH',
  }});
  let storeId:string|undefined;
  try {
    const store=await db.store.create({data:{name:`Shift Test ${suffix}`,ownerUserId:user.id}});
    storeId=store.id;
    console.log('--- CREATE SHIFT TYPE ---');
    const created=await createShiftType(db,{
      storeId,name:' Morning ',description:'Morning service',
      dayTimes:[{dayOfWeek:DayType.MONDAY,startTime:'10:00',endTime:'14:00'}],
    });
    if(created.name!=='Morning'||created.dayTimes[0].startTime!=='10:00') throw new Error('Create/map mismatch');
    if((await getShiftType(db,{storeId,shiftTypeId:created.id})).id!==created.id) throw new Error('Get mismatch');
    console.log('--- UPDATE DAY TIMES ---');
    const updated=await updateShiftType(db,{
      storeId,shiftTypeId:created.id,name:'Early',
      dayTimes:[{dayOfWeek:DayType.TUESDAY,startTime:'09:00',endTime:'13:00'}],
    });
    if(updated.dayTimes.length!==1||updated.dayTimes[0].dayOfWeek!=='TUESDAY') throw new Error('Replacement failed');
    if(!(await listShiftTypes(db,{storeId})).some(s=>s.id===created.id)) throw new Error('Not listed');
    console.log('--- ARCHIVE SHIFT TYPE ---');
    await deleteShiftType(db,{storeId,shiftTypeId:created.id});
    if((await listShiftTypes(db,{storeId})).some(s=>s.id===created.id)) throw new Error('Archive missing');
    if(!(await listShiftTypes(db,{storeId,includeArchived:true})).some(s=>s.id===created.id&&s.archived)) throw new Error('Archive read missing');
    console.log('Shift Types integration test complete.');
  } finally {
    if(storeId){
      await db.shiftTypeDayTime.deleteMany({where:{storeId}});
      await db.shiftType.deleteMany({where:{storeId}});
      await db.store.delete({where:{id:storeId}});
    }
    await db.user.delete({where:{id:user.id}});
  }
}
main().catch(err=>{console.error('Shift Types integration test failed:',err);process.exitCode=1;})
  .finally(async()=>{await db.$disconnect();});
