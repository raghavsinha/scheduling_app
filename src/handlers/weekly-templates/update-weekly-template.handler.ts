import { DatabaseClient } from '../../database/database-client.type';
import { WeeklyTemplate } from '../../domain/weekly-template.model';
import { ConflictError } from '../../common/errors/conflict.error';
import { NotFoundError } from '../../common/errors/not-found.error';
import { ValidationError } from '../../common/errors/validation.error';
import { mapWeeklyTemplate, weeklyTemplateInclude } from './weekly-template.mapper';
import { WeeklyRequirementInput,validateRequirements,validateRequirementReferences } from './weekly-template-validation.utils';
export interface UpdateWeeklyTemplateInput {
  storeId:string; weeklyTemplateId:string; name?:string; isDefault?:boolean;
  requirements?:WeeklyRequirementInput[];
}
export async function updateWeeklyTemplate(db:DatabaseClient,input:UpdateWeeklyTemplateInput):Promise<WeeklyTemplate>{
  const current=await db.weeklyTemplate.findFirst({where:{id:input.weeklyTemplateId,storeId:input.storeId}});
  if(!current) throw new NotFoundError('Weekly template not found.');
  if(current.archived) throw new ValidationError('Cannot edit an archived template.');
  const name=input.name?.trim();
  if(input.name !== undefined && !name) throw new ValidationError('Weekly template name is required.');
  if(name && name!==current.name){
    const duplicate=await db.weeklyTemplate.findUnique({where:{storeId_name:{storeId:input.storeId,name}}});
    if(duplicate && duplicate.id!==current.id) throw new ConflictError('Weekly template name is already in use.');
  }
  if(input.requirements !== undefined){
    validateRequirements(input.requirements);
    await validateRequirementReferences(db,input.storeId,input.requirements);
  }
  const updated=await db.$transaction(async tx=>{
    if(input.isDefault === true) await tx.weeklyTemplate.updateMany({where:{storeId:input.storeId,isDefault:true,id:{not:current.id}},data:{isDefault:false}});
    if(input.requirements!==undefined){
      await tx.weekShiftRequirement.deleteMany({where:{weeklyTemplateId:current.id}});
      if(input.requirements.length) await tx.weekShiftRequirement.createMany({data:input.requirements.map(r=>({
        storeId:input.storeId,weeklyTemplateId:current.id,dayOfWeek:r.dayOfWeek,
        shiftTypeId:r.shiftTypeId,workTypeId:r.workTypeId,requiredCount:r.requiredCount,
      }))});
    }
    return tx.weeklyTemplate.update({where:{id:current.id},data:{
      ...(name!==undefined?{name}:{}),
      ...(input.isDefault!==undefined?{isDefault:input.isDefault}:{}),
    },include:weeklyTemplateInclude});
  });
  return mapWeeklyTemplate(updated);
}
