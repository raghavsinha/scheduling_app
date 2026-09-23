import { CoverRequestView } from './cover-request.types';
export const coverRequestInclude={requester:true,coveringUser:true,events:{orderBy:{createdAt:'asc' as const}}};
export function mapCoverRequest(r:any):CoverRequestView {
  const person=(u:any)=>u?({id:u.id,name:u.name,username:u.username,email:u.email,phoneNumber:u.phoneNumber}):null;
  return {id:r.id,storeId:r.storeId,requestType:r.requestType,shiftAssignmentId:r.shiftAssignmentId,
    swapAssignmentId:r.swapAssignmentId,requestingUserId:r.requestingUserId,coveringUserId:r.coveringUserId,
    status:r.status,createdAt:r.createdAt.toISOString(),resolvedAt:r.resolvedAt?.toISOString()??null,
    requester:person(r.requester)!,coveringUser:person(r.coveringUser),
    events:r.events.map((e:any)=>({id:e.id,actorUserId:e.actorUserId,eventType:e.eventType,createdAt:e.createdAt.toISOString()}))};
}
