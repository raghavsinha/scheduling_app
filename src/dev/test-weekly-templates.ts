import 'dotenv/config';
import {DayType} from '@prisma/client';
import {prisma} from '../database/prisma.client';
import {createWeeklyTemplate} from '../handlers/weekly-templates/create-weekly-template.handler';
import {getWeeklyTemplate} from '../handlers/weekly-templates/get-weekly-template.handler';
import {listWeeklyTemplates} from '../handlers/weekly-templates/list-weekly-templates.handler';
import {updateWeeklyTemplate} from '../handlers/weekly-templates/update-weekly-template.handler';
import {deleteWeeklyTemplate} from '../handlers/weekly-templates/delete-weekly-template.handler';

async function main(){
 const store=await prisma.store.findFirst({where:{name:'Sample Tea Shop'}});
 if(!store) throw new Error('Sample Tea Shop not found. Seed the DB.');
 const shiftType=await prisma.shiftType.findFirst({where:{storeId:store.id,archived:false}});
 const workType=await prisma.workType.findFirst({where:{storeId:store.id,archived:false}});
 if(!shiftType||!workType) throw new Error('Requires an active shift type and work type.');
 const name=`Recovery smoke ${Date.now()}`;
 const created=await createWeeklyTemplate(prisma,{storeId:store.id,name,requirements:[{
   dayOfWeek:DayType.MONDAY,shiftTypeId:shiftType.id,workTypeId:workType.id,requiredCount:2,
 }]});
 try {
   const fetched=await getWeeklyTemplate(prisma,{storeId:store.id,weeklyTemplateId:created.id});
   if(fetched.requirements.length!==1) throw new Error('Requirement not persisted.');
   const updated=await updateWeeklyTemplate(prisma,{storeId:store.id,weeklyTemplateId:created.id,requirements:[{
     dayOfWeek:DayType.TUESDAY,shiftTypeId:shiftType.id,workTypeId:workType.id,requiredCount:3,
   }]});
   if(updated.requirements[0]?.requiredCount!==3) throw new Error('Requirement not updated.');
   const listed=await listWeeklyTemplates(prisma,{storeId:store.id});
   if(!listed.some(t=>t.id===created.id)) throw new Error('Template not listed.');
   await deleteWeeklyTemplate(prisma,{storeId:store.id,weeklyTemplateId:created.id});
   const archived=await getWeeklyTemplate(prisma,{storeId:store.id,weeklyTemplateId:created.id});
   if(!archived.archived) throw new Error('Archive not persisted.');
   console.log('Weekly Templates smoke test passed.');
 }finally{
   // Test creates an isolated, unreferenced template; clean up in reverse FK order.
   await prisma.weekShiftRequirement.deleteMany({where:{weeklyTemplateId:created.id}});
   await prisma.weeklyTemplate.delete({where:{id:created.id}});
 }
}
main().catch(e=>{console.error(e);process.exitCode=1;}).finally(()=>prisma.$disconnect());
