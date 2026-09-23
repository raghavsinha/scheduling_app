import { CoverRequestStatus,CoverRequestType } from '@prisma/client';
import { DatabaseClient } from '../../database/database-client.type';
import { ConflictError } from '../../common/errors/conflict.error';
import { NotFoundError } from '../../common/errors/not-found.error';
import { ValidationError } from '../../common/errors/validation.error';
import { CoverRequestView } from './cover-request.types';
import { coverRequestInclude,mapCoverRequest } from './cover-request.mapper';
import { assertRequesterOwnsAssignment,createCoverEvent,getPublishedAssignment,getSameDayAssignments,validateNoResultingOverlap,validateQualification } from './cover-request.utils';
export async function acceptCoverRequest(db:DatabaseClient,input:{storeId:string;coverRequestId:string;actorUserId:string}):Promise<CoverRequestView>{
  return db.$transaction(async tx=>{
    const request=await tx.coverRequest.findFirst({where:{id:input.coverRequestId,storeId:input.storeId}});
    if(!request)throw new NotFoundError('Cover request not found.');
    if(request.status!==CoverRequestStatus.OPEN&&request.status!==CoverRequestStatus.PENDING_USER)throw new ConflictError('Cover request is not available.');
    if(input.actorUserId===request.requestingUserId)throw new ValidationError('Requester cannot accept their own request.');
    if(request.coveringUserId&&request.coveringUserId!==input.actorUserId)throw new ValidationError('Cover request is directed to a different employee.');
    const source=await getPublishedAssignment(tx,input.storeId,request.shiftAssignmentId);
    assertRequesterOwnsAssignment(source.userId,request.requestingUserId);
    await validateQualification(tx,input.storeId,input.actorUserId,source.workTypeId);
    if(request.requestType===CoverRequestType.COVER){
      const sameDay=await getSameDayAssignments(tx,{storeId:input.storeId,userId:input.actorUserId,date:source.scheduleDay.date});
      if(sameDay.length)throw new ValidationError('You already work that day; request a SWAP instead.');
      await validateNoResultingOverlap(tx,{storeId:input.storeId,userId:input.actorUserId,date:source.scheduleDay.date,startTime:source.startTime,endTime:source.endTime});
    }else{
      if(request.status!==CoverRequestStatus.PENDING_USER||!request.swapAssignmentId||request.coveringUserId!==input.actorUserId)
        throw new ValidationError('A swap must be directed to the employee who owns the target shift.');
      const target=await getPublishedAssignment(tx,input.storeId,request.swapAssignmentId);
      if(target.userId!==input.actorUserId)throw new ConflictError('Target shift ownership has changed.');
      await validateQualification(tx,input.storeId,request.requestingUserId,target.workTypeId);
      await validateNoResultingOverlap(tx,{storeId:input.storeId,userId:input.actorUserId,date:source.scheduleDay.date,startTime:source.startTime,endTime:source.endTime,excludeIds:[source.id,target.id]});
      await validateNoResultingOverlap(tx,{storeId:input.storeId,userId:request.requestingUserId,date:target.scheduleDay.date,startTime:target.startTime,endTime:target.endTime,excludeIds:[source.id,target.id]});
      const claimed=await tx.coverRequest.updateMany({where:{id:request.id,status:request.status,coveringUserId:input.actorUserId},data:{status:CoverRequestStatus.ACCEPTED,resolvedAt:new Date()}});
      if(claimed.count!==1)throw new ConflictError('Cover request was already changed.');
      await tx.shiftAssignment.update({where:{id:source.id},data:{userId:input.actorUserId}});
      await tx.shiftAssignment.update({where:{id:target.id},data:{userId:request.requestingUserId}});
    }
    if(request.requestType===CoverRequestType.COVER){
      const claimed=await tx.coverRequest.updateMany({where:{id:request.id,status:request.status,coveringUserId:request.coveringUserId},data:{status:CoverRequestStatus.ACCEPTED,coveringUserId:input.actorUserId,resolvedAt:new Date()}});
      if(claimed.count!==1)throw new ConflictError('Cover request was already claimed.');
      await tx.shiftAssignment.update({where:{id:source.id},data:{userId:input.actorUserId}});
    }
    await createCoverEvent(tx,{storeId:input.storeId,coverRequestId:request.id,actorUserId:input.actorUserId,eventType:'ACCEPTED'});
    return mapCoverRequest(await tx.coverRequest.findUniqueOrThrow({where:{id:request.id},include:coverRequestInclude}));
  });
}
