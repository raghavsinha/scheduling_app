import { CoverRequestStatus } from '@prisma/client';
import { DatabaseClient } from '../../database/database-client.type';
import { ConflictError } from '../../common/errors/conflict.error';
import { NotFoundError } from '../../common/errors/not-found.error';
import { ValidationError } from '../../common/errors/validation.error';
import { CoverRequestView } from './cover-request.types';
import { coverRequestInclude,mapCoverRequest } from './cover-request.mapper';
import { createCoverEvent } from './cover-request.utils';
export async function declineCoverRequest(db:DatabaseClient,input:{storeId:string;coverRequestId:string;actorUserId:string}):Promise<CoverRequestView>{
  return db.$transaction(async tx=>{
    const r=await tx.coverRequest.findFirst({where:{id:input.coverRequestId,storeId:input.storeId}});
    if(!r)throw new NotFoundError('Cover request not found.');
    if(r.coveringUserId!==input.actorUserId)throw new ValidationError('Only the directed recipient may decline.');
    const result=await tx.coverRequest.updateMany({where:{id:r.id,status:CoverRequestStatus.PENDING_USER,coveringUserId:input.actorUserId},data:{status:CoverRequestStatus.DECLINED}});
    if(result.count!==1)throw new ConflictError('Request is no longer pending your response.');
    await createCoverEvent(tx,{storeId:input.storeId,coverRequestId:r.id,actorUserId:input.actorUserId,eventType:'DECLINED'});
    return mapCoverRequest(await tx.coverRequest.findUniqueOrThrow({where:{id:r.id},include:coverRequestInclude}));
  });
}
