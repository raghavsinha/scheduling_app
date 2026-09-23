import { DatabaseClient } from '../../database/database-client.type';
import { WeeklyTemplate } from '../../domain/weekly-template.model';
import { mapWeeklyTemplate, weeklyTemplateInclude } from './weekly-template.mapper';
export interface ListWeeklyTemplatesInput { storeId:string; includeArchived?:boolean; }
export async function listWeeklyTemplates(db:DatabaseClient,input:ListWeeklyTemplatesInput):Promise<WeeklyTemplate[]> {
  const records = await db.weeklyTemplate.findMany({
    where:{storeId:input.storeId,...(input.includeArchived?{}:{archived:false})},
    include:weeklyTemplateInclude,orderBy:[{isDefault:'desc'},{name:'asc'}],
  });
  return records.map(mapWeeklyTemplate);
}
