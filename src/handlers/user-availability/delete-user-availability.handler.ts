import { DatabaseClient } from '../../database/database-client.type';
import { NotFoundError } from '../../common/errors/not-found.error';
import { ValidationError } from '../../common/errors/validation.error';
import { requireActiveMember,requireAvailabilityPeriod } from './user-availability.utils';
export interface DeleteUserAvailabilityInput {storeId:string;availabilityPeriodId:string;userId:string}
export async function deleteUserAvailability(db:DatabaseClient,input:DeleteUserAvailabilityInput):Promise<void>{
 const period=await requireAvailabilityPeriod(db,input.storeId,input.availabilityPeriodId);
 await requireActiveMember(db,input.storeId,input.userId);
 if(!period.isOpen) throw new ValidationError('Availability period is closed.');
 const row=await db.userAvailability.findUnique({where:{availabilityPeriodId_userId:{availabilityPeriodId:input.availabilityPeriodId,userId:input.userId}}});
 if(!row || row.storeId!==input.storeId) throw new NotFoundError('User availability submission not found.');
 await db.$transaction(async tx=>{
  await tx.dayAvailability.deleteMany({where:{userAvailabilityId:row.id}});
  await tx.availabilityShiftPreference.deleteMany({where:{userAvailabilityId:row.id}});
  await tx.userAvailability.delete({where:{id:row.id}});
 });
}
