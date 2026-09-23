import { CoverRequestStatus,CoverRequestType } from '@prisma/client';
import { DatabaseClient } from '../../database/database-client.type';
import { CoverRequestView } from './cover-request.types';
import { coverRequestInclude,mapCoverRequest } from './cover-request.mapper';
import { validateActiveStoreUser,validateAdmin } from './cover-request.utils';
export interface ListCoverRequestsInput {storeId:string;actorUserId:string;mode:'MY_REQUESTS'|'AVAILABLE'|'ADMIN';status?:CoverRequestStatus;requestType?:CoverRequestType;}
export async function listCoverRequests(db:DatabaseClient,input:ListCoverRequestsInput):Promise<CoverRequestView[]>{
  await validateActiveStoreUser(db,input.storeId,input.actorUserId);
  if(input.mode==='ADMIN')await validateAdmin(db,input.storeId,input.actorUserId);
  const where={storeId:input.storeId,...(input.status?{status:input.status}:{}),...(input.requestType?{requestType:input.requestType}:{}),
    ...(input.mode==='MY_REQUESTS'?{OR:[{requestingUserId:input.actorUserId},{coveringUserId:input.actorUserId}]}:
      input.mode==='AVAILABLE'?{status:CoverRequestStatus.OPEN,requestType:CoverRequestType.COVER,requestingUserId:{not:input.actorUserId}}:{})};
  const requests=await db.coverRequest.findMany({where,include:coverRequestInclude,orderBy:{createdAt:'desc'}});
  return requests.map(mapCoverRequest);
}
