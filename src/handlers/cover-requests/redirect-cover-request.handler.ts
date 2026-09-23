import { CoverRequestStatus,CoverRequestType } from '@prisma/client';
import { DatabaseClient } from '../../database/database-client.type';
import { ConflictError } from '../../common/errors/conflict.error';
import { NotFoundError } from '../../common/errors/not-found.error';
import { ValidationError } from '../../common/errors/validation.error';
import { coverRequestInclude,mapCoverRequest } from './cover-request.mapper';
import { CoverRequestView } from './cover-request.types';
import { createCoverEvent } from './cover-request.utils';
import { validateCoverRequest } from './validate-cover-request.handler';
export async function redirectCoverRequest(db:DatabaseClient,input:{storeId:string;coverRequestId:string;actorUserId:string;coveringUserId:string;requestType:CoverRequestType;swapAssignmentId?:string}):Promise<CoverRequestView>{
  const r=await db.coverRequest.findFirst({where:{id:input.coverRequestId,storeId:input.storeId}});
  if(!r)throw new NotFoundError('Cover request not found.');
  if(r.requestingUserId!==input.actorUserId)throw new ValidationError('Only the requester can redirect.');
  const redirectableStatuses:CoverRequestStatus[]=[CoverRequestStatus.PENDING_USER,CoverRequestStatus.DECLINED];
  if(!redirectableStatuses.includes(r.status))throw new ConflictError('Request cannot be redirected in its current state.');
  const check=await validateCoverRequest(db,{storeId:input.storeId,shiftAssignmentId:r.shiftAssignmentId,requestingUserId:r.requestingUserId,coveringUserId:input.coveringUserId,requestType:input.requestType,swapAssignmentId:input.swapAssignmentId});
  if(!check.allowed)throw new ValidationError(check.reasons.join(' '));
  return db.$transaction(async tx=>{
    const claimed=await tx.coverRequest.updateMany({where:{id:r.id,status:r.status},data:{status:CoverRequestStatus.PENDING_USER,coveringUserId:input.coveringUserId,requestType:input.requestType,swapAssignmentId:input.requestType===CoverRequestType.SWAP?input.swapAssignmentId:null}});
    if(claimed.count!==1)throw new ConflictError('Request was changed.');
    await createCoverEvent(tx,{storeId:input.storeId,coverRequestId:r.id,actorUserId:input.actorUserId,eventType:'REDIRECTED'});
    return mapCoverRequest(await tx.coverRequest.findUniqueOrThrow({where:{id:r.id},include:coverRequestInclude}));
  });
}
