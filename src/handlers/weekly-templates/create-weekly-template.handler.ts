import { DatabaseClient } from '../../database/database-client.type';
import { WeeklyTemplate } from '../../domain/weekly-template.model';
import { ConflictError } from '../../common/errors/conflict.error';
import { NotFoundError } from '../../common/errors/not-found.error';
import { ValidationError } from '../../common/errors/validation.error';
import { mapWeeklyTemplate, weeklyTemplateInclude } from './weekly-template.mapper';
import { WeeklyRequirementInput, validateRequirements, validateRequirementReferences } from './weekly-template-validation.utils';

export interface CreateWeeklyTemplateInput {
  storeId: string;
  name: string;
  isDefault?: boolean;
  requirements?: WeeklyRequirementInput[];
}

export async function createWeeklyTemplate(db: DatabaseClient, input: CreateWeeklyTemplateInput): Promise<WeeklyTemplate> {
  const name = input.name.trim();
  if (!name) throw new ValidationError('Weekly template name is required.');
  const requirements = input.requirements ?? [];
  validateRequirements(requirements);
  const store = await db.store.findUnique({ where: {id: input.storeId} });
  if (!store) throw new NotFoundError('Store not found.');
  const duplicate = await db.weeklyTemplate.findUnique({where:{storeId_name:{storeId:input.storeId,name}}});
  if (duplicate) throw new ConflictError('Weekly template name is already in use.');
  await validateRequirementReferences(db,input.storeId,requirements);
  const created = await db.$transaction(async tx => {
    if (input.isDefault) await tx.weeklyTemplate.updateMany({where:{storeId:input.storeId,isDefault:true},data:{isDefault:false}});
    return tx.weeklyTemplate.create({data:{
      storeId:input.storeId, name, isDefault:input.isDefault ?? false,
      requirements:{create:requirements.map(r=>({storeId:input.storeId, dayOfWeek:r.dayOfWeek, shiftTypeId:r.shiftTypeId,workTypeId:r.workTypeId,requiredCount:r.requiredCount}))},
    },include:weeklyTemplateInclude});
  });
  return mapWeeklyTemplate(created);
}
