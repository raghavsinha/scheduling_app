import { DatabaseClient } from '../../database/database-client.type';
import { WeeklyTemplate } from '../../domain/weekly-template.model';
import { NotFoundError } from '../../common/errors/not-found.error';
import { mapWeeklyTemplate, weeklyTemplateInclude } from './weekly-template.mapper';
export interface GetWeeklyTemplateInput { storeId:string; weeklyTemplateId:string; }
export async function getWeeklyTemplate(db:DatabaseClient,input:GetWeeklyTemplateInput):Promise<WeeklyTemplate> {
  const record = await db.weeklyTemplate.findFirst({where:{id:input.weeklyTemplateId,storeId:input.storeId},include:weeklyTemplateInclude});
  if (!record) throw new NotFoundError('Weekly template not found.');
  return mapWeeklyTemplate(record);
}
