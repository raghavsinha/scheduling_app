import 'dotenv/config';
import { CoverRequestStatus, CoverRequestType, DayType, ScheduleStatus, UserType } from '@prisma/client';
import { prisma } from '../database/prisma.client';
import { createCoverRequest } from '../handlers/cover-requests/create-cover-request.handler';
import { validateCoverRequest } from '../handlers/cover-requests/validate-cover-request.handler';
import { declineCoverRequest } from '../handlers/cover-requests/decline-cover-request.handler';
import { makeCoverRequestOpen } from '../handlers/cover-requests/make-cover-request-open.handler';
import { acceptCoverRequest } from '../handlers/cover-requests/accept-cover-request.handler';

const date=(s:string)=>new Date(`${s}T00:00:00.000Z`);
const time=(s:string)=>new Date(`1970-01-01T${s}:00.000Z`);
function assert(value:unknown,msg:string):asserts value { if(!value)throw new Error(msg); }
async function main(){
  const store=await prisma.store.findFirst({where:{name:'Sample Tea Shop'}});
  if(!store)throw new Error('Seed Sample Tea Shop first.');
  const admin=await prisma.storeUser.findFirst({where:{storeId:store.id,userType:UserType.ADMIN,archivedAt:null}});
  if(!admin)throw new Error('Seed admin first.');
  const qs=await prisma.storeUserWorkType.findMany({where:{storeId:store.id},include:{user:true}});
  let requester:string|undefined,target:string|undefined,workTypeId:string|undefined;
  for(const a of qs){
    if(a.userId===admin.userId)continue;
    for(const b of qs){
      if(b.userId===a.userId||b.userId===admin.userId||b.workTypeId!==a.workTypeId)continue;
      const members=await prisma.storeUser.findMany({where:{storeId:store.id,userId:{in:[a.userId,b.userId]},archivedAt:null}});
      if(members.length===2){requester=a.userId;target=b.userId;workTypeId=a.workTypeId;break;}
    }
    if(requester)break;
  }
  if(!requester||!target||!workTypeId)throw new Error('Need two active non-admin users qualified for one shared work type.');
  // Date chosen well outside existing seed fixture dates; verify no competing published shifts.
  const monday=date('2032-09-13');
  const tuesday=date('2032-09-14');
  const schedule=await prisma.schedule.create({data:{storeId:store.id,createdBy:admin.userId,status:ScheduleStatus.DRAFT}});
  const ids:string[]=[];
  try{
    const week=await prisma.scheduleWeek.create({data:{storeId:store.id,scheduleId:schedule.id,weekStartDate:monday}});
    const mon=await prisma.scheduleDay.create({data:{storeId:store.id,scheduleWeekId:week.id,date:monday,dayOfWeek:DayType.MONDAY}});
    const tue=await prisma.scheduleDay.create({data:{storeId:store.id,scheduleWeekId:week.id,date:tuesday,dayOfWeek:DayType.TUESDAY}});
    const make=(dayId:string,userId:string,start:string,end:string)=>prisma.shiftAssignment.create({data:{storeId:store.id,scheduleDayId:dayId,userId,workTypeId,startTime:time(start),endTime:time(end),assignedBy:admin.userId}});
    const first=await make(mon.id,requester,'10:00','14:00');
    const second=await make(tue.id,requester,'10:00','14:00');
    const third=await make(tue.id,target,'14:00','18:00');
    await prisma.schedule.update({where:{id:schedule.id},data:{status:ScheduleStatus.PUBLISHED,publishedBy:admin.userId,publishedAt:new Date()}});

    const directed=await createCoverRequest(prisma,{storeId:store.id,shiftAssignmentId:first.id,requestingUserId:requester,coveringUserId:target,requestType:CoverRequestType.COVER});ids.push(directed.id);
    assert(directed.status===CoverRequestStatus.PENDING_USER,'Directed request must be PENDING_USER');
    const declined=await declineCoverRequest(prisma,{storeId:store.id,coverRequestId:directed.id,actorUserId:target});
    assert(declined.status===CoverRequestStatus.DECLINED,'Decline failed');
    const opened=await makeCoverRequestOpen(prisma,{storeId:store.id,coverRequestId:directed.id,actorUserId:requester});
    assert(opened.status===CoverRequestStatus.OPEN,'Make-open failed');
    const accepted=await acceptCoverRequest(prisma,{storeId:store.id,coverRequestId:directed.id,actorUserId:target});
    assert(accepted.status===CoverRequestStatus.ACCEPTED,'Accept failed');
    assert((await prisma.shiftAssignment.findUniqueOrThrow({where:{id:first.id}})).userId===target,'One-way transfer failed');
    console.log('PASS: directed cover → decline → make open → accept');

    const probe=await validateCoverRequest(prisma,{storeId:store.id,shiftAssignmentId:second.id,requestingUserId:requester,coveringUserId:target,requestType:CoverRequestType.COVER});
    assert(!probe.allowed&&probe.requiresSwap,'Same-day rule not enforced');
    assert(probe.sameDayAssignments.some(a=>a.id===third.id),'Same-day candidate not returned');
    console.log('PASS: same-day one-way cover requires swap');
    const swap=await createCoverRequest(prisma,{storeId:store.id,shiftAssignmentId:second.id,requestingUserId:requester,coveringUserId:target,requestType:CoverRequestType.SWAP,swapAssignmentId:third.id});ids.push(swap.id);
    const swapped=await acceptCoverRequest(prisma,{storeId:store.id,coverRequestId:swap.id,actorUserId:target});
    assert(swapped.status===CoverRequestStatus.ACCEPTED,'Swap failed');
    const [s,t]=await Promise.all([prisma.shiftAssignment.findUniqueOrThrow({where:{id:second.id}}),prisma.shiftAssignment.findUniqueOrThrow({where:{id:third.id}})]);
    assert(s.userId===target&&t.userId===requester,'Swap did not exchange owners');
    const events=await prisma.coverRequestEvent.findMany({where:{coverRequestId:{in:ids}}});
    assert(events.length>=6,'Expected event trail for transitions');
    console.log('PASS: same-day swap and persisted event trail');
  }finally{
    // Cleanup in foreign-key order; only affects this smoke test's new schedule.
    try{
      const weeks=await prisma.scheduleWeek.findMany({where:{scheduleId:schedule.id},select:{id:true}});
      const dayRows=await prisma.scheduleDay.findMany({where:{scheduleWeekId:{in:weeks.map(w=>w.id)}},select:{id:true}});
      const assignmentRows=await prisma.shiftAssignment.findMany({where:{scheduleDayId:{in:dayRows.map(d=>d.id)}},select:{id:true}});
      const requestRows=await prisma.coverRequest.findMany({where:{OR:[{shiftAssignmentId:{in:assignmentRows.map(a=>a.id)}},{swapAssignmentId:{in:assignmentRows.map(a=>a.id)}}]},select:{id:true}});
      await prisma.coverRequestEvent.deleteMany({where:{coverRequestId:{in:requestRows.map(r=>r.id)}}});
      await prisma.coverRequest.deleteMany({where:{id:{in:requestRows.map(r=>r.id)}}});
      await prisma.shiftAssignment.deleteMany({where:{scheduleDayId:{in:dayRows.map(d=>d.id)}}});
      await prisma.scheduleDay.deleteMany({where:{scheduleWeekId:{in:weeks.map(w=>w.id)}}});
      await prisma.scheduleWeek.deleteMany({where:{scheduleId:schedule.id}});
      await prisma.schedule.delete({where:{id:schedule.id}});
    }catch(e){console.error('Smoke test cleanup failed; test schedule ID:',schedule.id,e);process.exitCode=1;}
  }
}
main().catch(e=>{console.error(e);process.exitCode=1;}).finally(()=>prisma.$disconnect());
