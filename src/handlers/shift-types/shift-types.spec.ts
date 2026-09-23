import { DayType } from '@prisma/client';
import { createMockDatabase, MockDatabaseClient } from '../../test/database.mock';
import { ConflictError } from '../../common/errors/conflict.error';
import { NotFoundError } from '../../common/errors/not-found.error';
import { ValidationError } from '../../common/errors/validation.error';
import { createShiftType } from './create-shift-type.handler';
import { getShiftType } from './get-shift-type.handler';
import { listShiftTypes } from './list-shift-types.handler';
import { updateShiftType } from './update-shift-type.handler';
import { deleteShiftType } from './delete-shift-type.handler';
import { validateDayTimes } from './shift-type-validation.utils';

describe('Shift Type handlers', () => {
  let db: MockDatabaseClient;
  const now = new Date('2026-09-07T00:00:00.000Z');
  const time = (hhmm: string) => new Date(`1970-01-01T${hhmm}:00.000Z`);
  const store = { id:'store-1', name:'Sample Tea Shop', ownerUserId:'owner-1', createdAt:now };
  const row = {
    id: 'shift-1', storeId:'store-1', name:'Morning', description:null, archived:false,
    dayTimes: [{
      id:'daytime-1', storeId:'store-1', shiftTypeId:'shift-1', dayOfWeek:DayType.MONDAY,
      startTime:time('10:00'), endTime:time('14:00'),
    }],
  };
  beforeEach(() => {
    db = createMockDatabase();
    db.$transaction.mockImplementation(async (fn: any) => fn(db));
  });
  it('creates a shift type and maps day/time rules', async () => {
    db.store.findUnique.mockResolvedValue(store);
    db.shiftType.findUnique.mockResolvedValue(null);
    db.shiftType.create.mockResolvedValue(row as any);
    const result = await createShiftType(db, {
      storeId:'store-1', name:' Morning ',
      dayTimes:[{dayOfWeek:DayType.MONDAY,startTime:'10:00',endTime:'14:00'}],
    });
    expect(result.name).toBe('Morning');
    expect(result.dayTimes[0]).toEqual({dayOfWeek:'MONDAY', startTime:'10:00', endTime:'14:00'});
    expect(db.shiftType.create).toHaveBeenCalledWith(expect.objectContaining({
      data:expect.objectContaining({name:'Morning', dayTimes: {create:[expect.objectContaining({
        dayOfWeek:DayType.MONDAY, startTime:time('10:00'), endTime:time('14:00'),
      })]}}),
    }));
  });
  it('rejects duplicate store-specific shift type names', async () => {
    db.store.findUnique.mockResolvedValue(store);
    db.shiftType.findUnique.mockResolvedValue(row as any);
    await expect(createShiftType(db,{storeId:'store-1',name:'Morning'})).rejects.toBeInstanceOf(ConflictError);
  });
  it('rejects empty names', async () => {
    await expect(createShiftType(db,{storeId:'store-1',name:' '})).rejects.toBeInstanceOf(ValidationError);
  });
  it('rejects duplicate weekdays and invalid time ranges', () => {
    expect(()=>validateDayTimes([
      {dayOfWeek:DayType.MONDAY,startTime:'10:00',endTime:'14:00'},
      {dayOfWeek:DayType.MONDAY,startTime:'14:00',endTime:'18:00'},
    ])).toThrow(ValidationError);
    expect(()=>validateDayTimes([
      {dayOfWeek:DayType.TUESDAY,startTime:'18:00',endTime:'10:00'},
    ])).toThrow(ValidationError);
  });
  it('retrieves and lists shift types', async () => {
    db.shiftType.findFirst.mockResolvedValue(row as any);
    db.shiftType.findMany.mockResolvedValue([row as any]);
    expect((await getShiftType(db,{storeId:'store-1',shiftTypeId:'shift-1'})).id).toBe('shift-1');
    expect(await listShiftTypes(db,{storeId:'store-1'})).toHaveLength(1);
    expect(db.shiftType.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where:{storeId:'store-1',archived:false},
    }));
  });
  it('throws for missing shift types', async () => {
    db.shiftType.findFirst.mockResolvedValue(null);
    await expect(getShiftType(db,{storeId:'store-1',shiftTypeId:'missing'})).rejects.toBeInstanceOf(NotFoundError);
  });
  it('replaces weekday definitions transactionally', async () => {
    db.shiftType.findFirst.mockResolvedValue(row as any);
    db.shiftTypeDayTime.deleteMany.mockResolvedValue({count:1});
    db.shiftTypeDayTime.createMany.mockResolvedValue({count:1});
    db.shiftType.update.mockResolvedValue({...row,name:'Afternoon',dayTimes:[{
      ...row.dayTimes[0], startTime:time('14:00'), endTime:time('18:00'),
    }]} as any);
    const updated = await updateShiftType(db,{
      storeId:'store-1',shiftTypeId:'shift-1',name:'Afternoon',
      dayTimes:[{dayOfWeek:DayType.MONDAY,startTime:'14:00',endTime:'18:00'}],
    });
    expect(updated.name).toBe('Afternoon');
    expect(db.shiftTypeDayTime.deleteMany).toHaveBeenCalledWith({where:{shiftTypeId:'shift-1'}});
    expect(db.shiftTypeDayTime.createMany).toHaveBeenCalled();
  });
  it('archives instead of deleting', async () => {
    db.shiftType.findFirst.mockResolvedValue(row as any);
    db.shiftType.update.mockResolvedValue({...row,archived:true} as any);
    await deleteShiftType(db,{storeId:'store-1',shiftTypeId:'shift-1'});
    expect(db.shiftType.update).toHaveBeenCalledWith({where:{id:'shift-1'},data:{archived:true}});
  });
});
