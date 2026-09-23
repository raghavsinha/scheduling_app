import { DatabaseClient } from '../../database/database-client.type';
import { UserAvailability } from '../../domain/availability.model';
import { NotFoundError } from '../../common/errors/not-found.error';
import { mapUserAvailability,userAvailabilityInclude } from './user-availability.mapper';
export interface GetUserAvailabilityInput {storeId:string;availabilityPeriodId:string;userId:string}
export async function getUserAvailability(db:DatabaseClient,input:GetUserAvailabilityInput):Promise<UserAvailability>{
 const row=await db.userAvailability.findFirst({where:{storeId:input.storeId,availabilityPeriodId:input.availabilityPeriodId,userId:input.userId},include:userAvailabilityInclude});
 if(!row)throw new NotFoundError('User availability submission not found.');
 return mapUserAvailability(row);
}
