import { DatabaseClient } from '../../database/database-client.type';
import { NotFoundError } from '../../common/errors/not-found.error';
import { ValidationError } from '../../common/errors/validation.error';
export interface DeleteWeeklyTemplateInput {storeId:string;weeklyTemplateId:string;}
export async function deleteWeeklyTemplate(db:DatabaseClient,input:DeleteWeeklyTemplateInput):Promise<void>{
  const current=await db.weeklyTemplate.findFirst({where:{id:input.weeklyTemplateId,storeId:input.storeId}});
  if(!current) throw new NotFoundError('Weekly template not found.');
  if(current.isDefault) throw new ValidationError('Choose another default before archiving this template.');
  await db.weeklyTemplate.update({where:{id:current.id},data:{archived:true}});
}
