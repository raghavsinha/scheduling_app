import { CoverRequestStatus,CoverRequestType } from '@prisma/client';
import { DatabaseClient } from '../../database/database-client.type';
import { ConflictError } from '../../common/errors/conflict.error';
import { NotFoundError } from '../../common/errors/not-found.error';
import { ValidationError } from '../../common/errors/validation.error';
import { coverRequestInclude,mapCoverRequest } from './cover-request.mapper';
import { CoverRequestView } from './cover-request.types';
import { createCoverEvent } from './cover-request.utils';
export async function makeCoverRequestOpen(db:DatabaseClient,input:{storeId:string;coverRequestId:string;actorUserId:string}):Promise<CoverRequestView>{
  return db.$transaction(async tx=>{
    const r=await tx.coverRequest.findFirst({where:{id:input.coverRequestId,storeId:input.storeId}});
    if(!r)throw new NotFoundError('Cover request not found.');
    if(r.requestingUserId!==input.actorUserId)throw new ValidationError('Only the requester can make a request open.');
    const openableStatuses:CoverRequestStatus[]=[CoverRequestStatus.PENDING_USER,CoverRequestStatus.DECLINED];
    if(!openableStatuses.includes(r.status))throw new ConflictError('Request cannot be opened in its current state.');
    const claimed=await tx.coverRequest.updateMany({where:{id:r.id,status:r.status},data:{status:CoverRequestStatus.OPEN,requestType:CoverRequestType.COVER,coveringUserId:null,swapAssignmentId:null}});
    if(claimed.count!==1)throw new ConflictError('Request was changed.');
    await createCoverEvent(tx,{storeId:input.storeId,coverRequestId:r.id,actorUserId:input.actorUserId,eventType:'MADE_OPEN'});
    return mapCoverRequest(await tx.coverRequest.findUniqueOrThrow({where:{id:r.id},include:coverRequestInclude}));
  });
}
