import { DatabaseClient } from '../../database/database-client.type';
import { UserAvailability } from '../../domain/availability.model';
import { mapUserAvailability,userAvailabilityInclude } from './user-availability.mapper';
import { requireAvailabilityPeriod } from './user-availability.utils';
export interface ListUserAvailabilityInput {storeId:string;availabilityPeriodId:string;userId?:string}
export async function listUserAvailability(db:DatabaseClient,input:ListUserAvailabilityInput):Promise<UserAvailability[]>{
 await requireAvailabilityPeriod(db,input.storeId,input.availabilityPeriodId);
 const rows=await db.userAvailability.findMany({where:{storeId:input.storeId,availabilityPeriodId:input.availabilityPeriodId,...(input.userId?{userId:input.userId}:{})},include:userAvailabilityInclude,orderBy:{createdAt:'asc'}});
 return rows.map(mapUserAvailability);
}
