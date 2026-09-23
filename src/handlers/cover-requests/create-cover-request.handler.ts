import { CoverRequestStatus,CoverRequestType } from '@prisma/client';
import { DatabaseClient } from '../../database/database-client.type';
import { ValidationError } from '../../common/errors/validation.error';
import { CoverRequestView } from './cover-request.types';
import { coverRequestInclude,mapCoverRequest } from './cover-request.mapper';
import { createCoverEvent,validateNoExistingActiveRequest } from './cover-request.utils';
import { validateCoverRequest,ValidateCoverRequestInput } from './validate-cover-request.handler';
export async function createCoverRequest(db:DatabaseClient,input:ValidateCoverRequestInput):Promise<CoverRequestView>{
  await validateNoExistingActiveRequest(db,input.shiftAssignmentId);
  const preflight=await validateCoverRequest(db,input);
  if(!preflight.allowed)throw new ValidationError(preflight.reasons.join(' '));
  const status=input.coveringUserId?CoverRequestStatus.PENDING_USER:CoverRequestStatus.OPEN;
  return db.$transaction(async tx=>{
    // Recheck inside the transaction; a DB uniqueness/serialization strategy is still needed for robust simultaneous creates.
    await validateNoExistingActiveRequest(tx,input.shiftAssignmentId);
    const request=await tx.coverRequest.create({data:{storeId:input.storeId,shiftAssignmentId:input.shiftAssignmentId,
      swapAssignmentId:input.requestType===CoverRequestType.SWAP?input.swapAssignmentId:null,
      requestingUserId:input.requestingUserId,coveringUserId:input.coveringUserId??null,requestType:input.requestType,status}});
    await createCoverEvent(tx,{storeId:input.storeId,coverRequestId:request.id,actorUserId:input.requestingUserId,eventType:'CREATED'});
    return mapCoverRequest(await tx.coverRequest.findUniqueOrThrow({where:{id:request.id},include:coverRequestInclude}));
  });
}
