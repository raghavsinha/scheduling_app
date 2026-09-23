import { CoverRequestStatus } from '@prisma/client';
import { DatabaseClient } from '../../database/database-client.type';
import { ConflictError } from '../../common/errors/conflict.error';
import { NotFoundError } from '../../common/errors/not-found.error';
import { ValidationError } from '../../common/errors/validation.error';
import { coverRequestInclude,mapCoverRequest } from './cover-request.mapper';
import { CoverRequestView } from './cover-request.types';
import { createCoverEvent } from './cover-request.utils';
export async function cancelCoverRequest(db:DatabaseClient,input:{storeId:string;coverRequestId:string;actorUserId:string}):Promise<CoverRequestView>{
  return db.$transaction(async tx=>{
    const r=await tx.coverRequest.findFirst({where:{id:input.coverRequestId,storeId:input.storeId}});
    if(!r)throw new NotFoundError('Cover request not found.');
    if(r.requestingUserId!==input.actorUserId)throw new ValidationError('Only the requester can cancel.');
    const cancellableStatuses:CoverRequestStatus[]=[CoverRequestStatus.OPEN,CoverRequestStatus.PENDING_USER,CoverRequestStatus.DECLINED];
    if(!cancellableStatuses.includes(r.status))throw new ConflictError('Request is already resolved.');
    const claimed=await tx.coverRequest.updateMany({where:{id:r.id,status:r.status},data:{status:CoverRequestStatus.CANCELLED,resolvedAt:new Date()}});
    if(claimed.count!==1)throw new ConflictError('Request was changed.');
    await createCoverEvent(tx,{storeId:input.storeId,coverRequestId:r.id,actorUserId:input.actorUserId,eventType:'CANCELLED'});
    return mapCoverRequest(await tx.coverRequest.findUniqueOrThrow({where:{id:r.id},include:coverRequestInclude}));
  });
}
