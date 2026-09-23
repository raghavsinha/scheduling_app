import {DayType} from '@prisma/client';
import {createMockDatabase,MockDatabaseClient} from '../../test/database.mock';
import {createWeeklyTemplate} from './create-weekly-template.handler';
import {getWeeklyTemplate} from './get-weekly-template.handler';
import {listWeeklyTemplates} from './list-weekly-templates.handler';
import {updateWeeklyTemplate} from './update-weekly-template.handler';
import {deleteWeeklyTemplate} from './delete-weekly-template.handler';
import {ConflictError} from '../../common/errors/conflict.error';
import {NotFoundError} from '../../common/errors/not-found.error';
import {ValidationError} from '../../common/errors/validation.error';

describe('Weekly templates',()=>{
 let db:MockDatabaseClient;
 const now=new Date('2026-09-07T00:00:00Z');
 const store={id:'store-1',name:'Sample Tea Shop',ownerUserId:'owner-1',createdAt:now};
 const template={id:'template-1',storeId:'store-1',name:'Standard',isDefault:false,archived:false,createdAt:now,updatedAt:now,requirements:[]};
 const requirement={dayOfWeek:DayType.MONDAY,shiftTypeId:'shift-1',workTypeId:'work-1',requiredCount:2};
 beforeEach(()=>{
   db=createMockDatabase();
   db.$transaction.mockImplementation(async (cb:any)=>cb(db));
 });
 it('creates template and sets default inside transaction',async()=>{
   db.store.findUnique.mockResolvedValue(store);
   db.weeklyTemplate.findUnique.mockResolvedValue(null);
   db.shiftType.count.mockResolvedValue(1);
   db.workType.count.mockResolvedValue(1);
   db.weeklyTemplate.updateMany.mockResolvedValue({count:1});
   db.weeklyTemplate.create.mockResolvedValue({...template,isDefault:true,requirements:[{id:'requirement-1',storeId:'store-1',weeklyTemplateId:'template-1',...requirement}]} as any);
   const result=await createWeeklyTemplate(db,{storeId:'store-1',name:' Standard ',isDefault:true,requirements:[requirement]});
   expect(result.isDefault).toBe(true);
   expect(result.requirements).toHaveLength(1);
   expect(db.weeklyTemplate.updateMany).toHaveBeenCalledWith({where:{storeId:'store-1',isDefault:true},data:{isDefault:false}});
 });
 it('rejects repeated requirement key',async()=>{
   await expect(createWeeklyTemplate(db,{storeId:'store-1',name:'Standard',requirements:[requirement,requirement]})).rejects.toBeInstanceOf(ValidationError);
 });
 it('rejects duplicate name',async()=>{
   db.store.findUnique.mockResolvedValue(store);
   db.weeklyTemplate.findUnique.mockResolvedValue(template);
   await expect(createWeeklyTemplate(db,{storeId:'store-1',name:'Standard'})).rejects.toBeInstanceOf(ConflictError);
 });
 it('retrieves a template by store',async()=>{
   db.weeklyTemplate.findFirst.mockResolvedValue(template as any);
   expect((await getWeeklyTemplate(db,{storeId:'store-1',weeklyTemplateId:'template-1'})).name).toBe('Standard');
 });
 it('throws when template missing',async()=>{
   db.weeklyTemplate.findFirst.mockResolvedValue(null);
   await expect(getWeeklyTemplate(db,{storeId:'store-1',weeklyTemplateId:'none'})).rejects.toBeInstanceOf(NotFoundError);
 });
 it('lists nonarchived templates',async()=>{
   db.weeklyTemplate.findMany.mockResolvedValue([template] as any);
   expect(await listWeeklyTemplates(db,{storeId:'store-1'})).toHaveLength(1);
   expect(db.weeklyTemplate.findMany).toHaveBeenCalledWith(expect.objectContaining({where:{storeId:'store-1',archived:false}}));
 });
 it('updates requirements by replacement',async()=>{
   db.weeklyTemplate.findFirst.mockResolvedValue(template);
   db.shiftType.count.mockResolvedValue(1);
   db.workType.count.mockResolvedValue(1);
   db.weekShiftRequirement.deleteMany.mockResolvedValue({count:0});
   db.weekShiftRequirement.createMany.mockResolvedValue({count:1});
   db.weeklyTemplate.update.mockResolvedValue({...template,requirements:[{id:'r-1',weeklyTemplateId:template.id,storeId:'store-1',...requirement}]} as any);
   const result=await updateWeeklyTemplate(db,{storeId:'store-1',weeklyTemplateId:template.id,requirements:[requirement]});
   expect(result.requirements).toHaveLength(1);
   expect(db.weekShiftRequirement.deleteMany).toHaveBeenCalled();
 });
 it('does not archive default',async()=>{
   db.weeklyTemplate.findFirst.mockResolvedValue({...template,isDefault:true});
   await expect(deleteWeeklyTemplate(db,{storeId:'store-1',weeklyTemplateId:template.id})).rejects.toBeInstanceOf(ValidationError);
 });
 it('archives a nondefault template',async()=>{
   db.weeklyTemplate.findFirst.mockResolvedValue(template);
   db.weeklyTemplate.update.mockResolvedValue({...template,archived:true});
   await deleteWeeklyTemplate(db,{storeId:'store-1',weeklyTemplateId:template.id});
   expect(db.weeklyTemplate.update).toHaveBeenCalledWith({where:{id:template.id},data:{archived:true}});
 });
});
