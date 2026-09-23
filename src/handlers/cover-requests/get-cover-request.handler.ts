import { UserType } from '@prisma/client';
import { DatabaseClient } from '../../database/database-client.type';
import { NotFoundError } from '../../common/errors/not-found.error';
import { ValidationError } from '../../common/errors/validation.error';
import { CoverRequestView } from './cover-request.types';
import { coverRequestInclude,mapCoverRequest } from './cover-request.mapper';
import { validateActiveStoreUser } from './cover-request.utils';
export async function getCoverRequest(db:DatabaseClient,input:{storeId:string;coverRequestId:string;actorUserId:string}):Promise<CoverRequestView>{
  const request=await db.coverRequest.findFirst({where:{id:input.coverRequestId,storeId:input.storeId},include:coverRequestInclude});
  if(!request)throw new NotFoundError('Cover request not found.');
  const member=await validateActiveStoreUser(db,input.storeId,input.actorUserId);
  if(member.userType!==UserType.ADMIN&&input.actorUserId!==request.requestingUserId&&input.actorUserId!==request.coveringUserId&&request.status!=='OPEN')
    throw new ValidationError('You may not view this cover request.');
  return mapCoverRequest(request);
}
