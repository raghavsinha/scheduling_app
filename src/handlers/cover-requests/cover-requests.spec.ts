import { CoverRequestStatus as Status, CoverRequestType as Type, ScheduleStatus, UserType } from '@prisma/client';
import { createMockDatabase, MockDatabaseClient } from '../../test/database.mock';
import { ConflictError } from '../../common/errors/conflict.error';
import { ValidationError } from '../../common/errors/validation.error';
import { validateCoverRequest } from './validate-cover-request.handler';
import { createCoverRequest } from './create-cover-request.handler';
import { acceptCoverRequest } from './accept-cover-request.handler';
import { declineCoverRequest } from './decline-cover-request.handler';
import { redirectCoverRequest } from './redirect-cover-request.handler';
import { makeCoverRequestOpen } from './make-cover-request-open.handler';
import { cancelCoverRequest } from './cancel-cover-request.handler';
import { getCoverRequest } from './get-cover-request.handler';
import { listCoverRequests } from './list-cover-requests.handler';

const t=(s:string)=>new Date(`1970-01-01T${s}:00.000Z`);
const date=new Date('2031-09-15T00:00:00.000Z');
const now=new Date('2031-09-01T00:00:00.000Z');
const source={id:'source',storeId:'store',scheduleDayId:'day',userId:'requester',workTypeId:'work',shiftTypeId:null,
 startTime:t('10:00'),endTime:t('14:00'),assignedBy:'admin',createdAt:now,updatedAt:now,
 scheduleDay:{date,dayOfWeek:'MONDAY',scheduleWeek:{schedule:{status:ScheduleStatus.PUBLISHED}}}};
const other={...source,id:'other',userId:'target',startTime:t('14:00'),endTime:t('18:00')};
const requester={id:'requester',name:'Requester',username:'requester',email:'r@example.com',phoneNumber:null,createdAt:now};
const target={id:'target',name:'Target',username:'target',email:'t@example.com',phoneNumber:null,createdAt:now};
const request={id:'req',storeId:'store',shiftAssignmentId:'source',swapAssignmentId:null,requestingUserId:'requester',
 coveringUserId:'target',requestType:Type.COVER,status:Status.PENDING_USER,createdAt:now,resolvedAt:null};
const full=(status:Status=Status.PENDING_USER,extra:Record<string,unknown>={})=>({
 ...request,status,...extra,requester,coveringUser:target,events:[{id:'evt',actorUserId:'requester',eventType:'CREATED',createdAt:now}],
});
const member=(userId:string,userType:UserType=UserType.EMPLOYEE)=>({storeId:'store',userId,userType,joinedAt:now,archivedAt:null});

describe('Cover request handlers — recovered tests adapted to Batch 5A',()=>{
 let db:MockDatabaseClient;
 beforeEach(()=>{
  db=createMockDatabase();
  db.$transaction.mockImplementation((async (cb:any)=>cb(db)) as any);
  db.userAvailability.findFirst.mockResolvedValue(null);
 });
 const published=()=>db.shiftAssignment.findFirst.mockResolvedValue(source as any);
 const qualified=()=>{
  db.storeUser.findUnique.mockImplementation((async(args:any)=>member(args.where.storeId_userId.userId)) as any);
  db.storeUserWorkType.findFirst.mockResolvedValue({storeId:'store',userId:'target',workTypeId:'work'} as any);
 };
 const done=(status:Status,extra:Record<string,unknown>={})=>{
  db.coverRequest.findUniqueOrThrow.mockResolvedValue(full(status,extra) as any);
  db.coverRequest.updateMany.mockResolvedValue({count:1});
  db.coverRequestEvent.create.mockResolvedValue({id:'evt2',storeId:'store',coverRequestId:'req',actorUserId:'target',eventType:'CHANGED',createdAt:now} as any);
 };
 it('rejects directed COVER if recipient has another shift on the same day, even adjacent',async()=>{
  published();qualified();db.shiftAssignment.findMany.mockResolvedValue([other] as any);
  const v=await validateCoverRequest(db,{storeId:'store',shiftAssignmentId:'source',requestingUserId:'requester',coveringUserId:'target',requestType:Type.COVER});
  expect(v.allowed).toBe(false);expect(v.requiresSwap).toBe(true);
  expect(v.sameDayAssignments.map(x=>x.id)).toContain('other');
 });
 it('allows directed COVER with no other shifts and no availability submission',async()=>{
  published();qualified();db.shiftAssignment.findMany.mockResolvedValue([]);
  const v=await validateCoverRequest(db,{storeId:'store',shiftAssignmentId:'source',requestingUserId:'requester',coveringUserId:'target',requestType:Type.COVER});
  expect(v.allowed).toBe(true);expect(v.requiresSwap).toBe(false);expect(v.warnings).toEqual([]);
 });
 it('allows same-day SWAP when both parties qualify and have no additional overlaps',async()=>{
  db.shiftAssignment.findFirst.mockResolvedValueOnce(source as any).mockResolvedValueOnce(other as any);
  qualified();db.shiftAssignment.findMany.mockResolvedValue([other] as any).mockResolvedValueOnce([other] as any).mockResolvedValueOnce([]).mockResolvedValueOnce([]);
  const v=await validateCoverRequest(db,{storeId:'store',shiftAssignmentId:'source',requestingUserId:'requester',coveringUserId:'target',requestType:Type.SWAP,swapAssignmentId:'other'});
  expect(v.allowed).toBe(true);
 });
 it('creates directed cover and its CREATED event atomically',async()=>{
  db.coverRequest.findFirst.mockResolvedValue(null);published();qualified();db.shiftAssignment.findMany.mockResolvedValue([]);
  db.coverRequest.create.mockResolvedValue(request as any);done(Status.PENDING_USER);
  const r=await createCoverRequest(db,{storeId:'store',shiftAssignmentId:'source',requestingUserId:'requester',coveringUserId:'target',requestType:Type.COVER});
  expect(r.status).toBe(Status.PENDING_USER);
  expect(db.coverRequestEvent.create).toHaveBeenCalledWith({data:expect.objectContaining({eventType:'CREATED'})});
 });
 it('declines a directed request without preventing a later redirect',async()=>{
  db.coverRequest.findFirst.mockResolvedValue(request as any);done(Status.DECLINED);
  const r=await declineCoverRequest(db,{storeId:'store',coverRequestId:'req',actorUserId:'target'});
  expect(r.status).toBe(Status.DECLINED);
  expect(db.coverRequest.updateMany).toHaveBeenCalledWith(expect.objectContaining({data:{status:Status.DECLINED}}));
 });
 it('converts declined request into open one, clearing prior target',async()=>{
  db.coverRequest.findFirst.mockResolvedValue({...request,status:Status.DECLINED} as any);done(Status.OPEN,{coveringUserId:null,coveringUser:null});
  const r=await makeCoverRequestOpen(db,{storeId:'store',coverRequestId:'req',actorUserId:'requester'});
  expect(r.status).toBe(Status.OPEN);expect(r.coveringUserId).toBeNull();
  expect(db.coverRequest.updateMany).toHaveBeenCalledWith(expect.objectContaining({data:expect.objectContaining({coveringUserId:null,swapAssignmentId:null,requestType:Type.COVER})}));
 });
 it('redirects a declined request to another employee',async()=>{
  db.coverRequest.findFirst.mockResolvedValue({...request,status:Status.DECLINED} as any);
  published();qualified();db.shiftAssignment.findMany.mockResolvedValue([]);done(Status.PENDING_USER);
  const r=await redirectCoverRequest(db,{storeId:'store',coverRequestId:'req',actorUserId:'requester',coveringUserId:'target',requestType:Type.COVER});
  expect(r.status).toBe(Status.PENDING_USER);
  expect(db.coverRequestEvent.create).toHaveBeenCalledWith({data:expect.objectContaining({eventType:'REDIRECTED'})});
 });
 it('accepts a directed COVER by conditionally claiming it before reassigning shift',async()=>{
  db.coverRequest.findFirst.mockResolvedValue(request as any);published();qualified();db.shiftAssignment.findMany.mockResolvedValue([]);done(Status.ACCEPTED,{resolvedAt:now});
  db.shiftAssignment.update.mockResolvedValue({...source,userId:'target'} as any);
  const r=await acceptCoverRequest(db,{storeId:'store',coverRequestId:'req',actorUserId:'target'});
  expect(r.status).toBe(Status.ACCEPTED);
  expect(db.coverRequest.updateMany).toHaveBeenCalledWith(expect.objectContaining({where:expect.objectContaining({id:'req',status:Status.PENDING_USER})}));
  expect(db.shiftAssignment.update).toHaveBeenCalledWith(expect.objectContaining({where:{id:'source'},data:{userId:'target'}}));
 });
 it('accepts a SWAP and switches both assignment owners',async()=>{
  db.coverRequest.findFirst.mockResolvedValue({...request,requestType:Type.SWAP,swapAssignmentId:'other'} as any);
  db.shiftAssignment.findFirst.mockResolvedValueOnce(source as any).mockResolvedValueOnce(other as any);
  qualified();db.shiftAssignment.findMany.mockResolvedValue([]);done(Status.ACCEPTED,{requestType:Type.SWAP,swapAssignmentId:'other'});
  db.shiftAssignment.update.mockResolvedValue(source as any);
  await acceptCoverRequest(db,{storeId:'store',coverRequestId:'req',actorUserId:'target'});
  expect(db.shiftAssignment.update).toHaveBeenNthCalledWith(1,{where:{id:'source'},data:{userId:'target'}});
  expect(db.shiftAssignment.update).toHaveBeenNthCalledWith(2,{where:{id:'other'},data:{userId:'requester'}});
 });
 it('rejects a stale claim when another actor has already claimed request',async()=>{
  db.coverRequest.findFirst.mockResolvedValue(request as any);published();qualified();db.shiftAssignment.findMany.mockResolvedValue([]);
  db.coverRequest.updateMany.mockResolvedValue({count:0});
  await expect(acceptCoverRequest(db,{storeId:'store',coverRequestId:'req',actorUserId:'target'})).rejects.toBeInstanceOf(ConflictError);
  expect(db.shiftAssignment.update).not.toHaveBeenCalled();
 });
 it('rejects accepting a resolved request',async()=>{
  db.coverRequest.findFirst.mockResolvedValue({...request,status:Status.ACCEPTED} as any);
  await expect(acceptCoverRequest(db,{storeId:'store',coverRequestId:'req',actorUserId:'target'})).rejects.toBeInstanceOf(ConflictError);
 });
 it('lets requester cancel unresolved requests',async()=>{
  db.coverRequest.findFirst.mockResolvedValue(request as any);done(Status.CANCELLED,{resolvedAt:now});
  const r=await cancelCoverRequest(db,{storeId:'store',coverRequestId:'req',actorUserId:'requester'});
  expect(r.status).toBe(Status.CANCELLED);
 });
 it('lets an admin inspect any request',async()=>{
  db.coverRequest.findFirst.mockResolvedValue(full() as any);
  db.storeUser.findUnique.mockResolvedValue(member('admin',UserType.ADMIN));
  const r=await getCoverRequest(db,{storeId:'store',coverRequestId:'req',actorUserId:'admin'});
  expect(r.id).toBe('req');
 });
 it('restricts ADMIN list to administrators',async()=>{
  db.storeUser.findUnique.mockResolvedValue(member('target'));
  await expect(listCoverRequests(db,{storeId:'store',actorUserId:'target',mode:'ADMIN'})).rejects.toBeInstanceOf(ValidationError);
 });
 it('lists ADMIN requests for an administrator',async()=>{
  db.storeUser.findUnique.mockResolvedValue(member('admin',UserType.ADMIN));
  db.coverRequest.findMany.mockResolvedValue([full()] as any);
  expect(await listCoverRequests(db,{storeId:'store',actorUserId:'admin',mode:'ADMIN'})).toHaveLength(1);
 });
});
