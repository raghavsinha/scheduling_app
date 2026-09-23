import { AvailabilityEntryMode } from '@prisma/client';
import { createMockDatabase, MockDatabaseClient } from '../../test/database.mock';
import { ConflictError } from '../../common/errors/conflict.error';
import { ValidationError } from '../../common/errors/validation.error';
import { createAvailabilityPeriod } from './create-availability-period.handler';
import { getAvailabilityPeriod } from './get-availability-period.handler';
import { listAvailabilityPeriods } from './list-availability-periods.handler';
import { updateAvailabilityPeriod } from './update-availability-period.handler';
import { closeAvailabilityPeriod } from './close-availability-period.handler';
import { openAvailabilityPeriod } from './open-availability-period.handler';
import { deleteAvailabilityPeriod } from './delete-availability-period.handler';

describe('Availability period handlers', () => {
  let db: MockDatabaseClient;
  const record = {
    id: 'period-1', storeId: 'store-1',
    startDate: new Date('2030-01-07T00:00:00.000Z'),
    endDate: new Date('2030-01-13T00:00:00.000Z'),
    entryMode: AvailabilityEntryMode.TIME,
    isOpen: true,
    createdAt: new Date('2026-09-23T00:00:00.000Z'),
    updatedAt: new Date('2026-09-23T00:00:00.000Z'),
  };
  beforeEach(() => {db = createMockDatabase();});
  it('creates a nonoverlapping period with date-only fields', async () => {
    db.store.findUnique.mockResolvedValue({id: 'store-1'} as any);
    db.availabilityPeriod.findFirst.mockResolvedValue(null);
    db.availabilityPeriod.create.mockResolvedValue(record);
    const result = await createAvailabilityPeriod(db, {storeId: 'store-1', startDate: '2030-01-07', endDate: '2030-01-13', entryMode: AvailabilityEntryMode.TIME});
    expect(result.startDate).toBe('2030-01-07');
    expect(db.availabilityPeriod.create).toHaveBeenCalledWith({data: expect.objectContaining({startDate: record.startDate, endDate: record.endDate})});
  });
  it('rejects invalid calendar dates', async () => {
    db.store.findUnique.mockResolvedValue({id: 'store-1'} as any);
    await expect(createAvailabilityPeriod(db, {storeId:'store-1',startDate:'2030-02-30',endDate:'2030-03-02',entryMode:AvailabilityEntryMode.SHIFT})).rejects.toBeInstanceOf(ValidationError);
  });
  it('rejects overlapping existing periods', async () => {
    db.store.findUnique.mockResolvedValue({id: 'store-1'} as any);
    db.availabilityPeriod.findFirst.mockResolvedValue(record);
    await expect(createAvailabilityPeriod(db,{storeId:'store-1',startDate:'2030-01-10',endDate:'2030-01-20',entryMode:AvailabilityEntryMode.TIME})).rejects.toBeInstanceOf(ConflictError);
  });
  it('gets an existing period', async () => {
    db.availabilityPeriod.findFirst.mockResolvedValue(record);
    expect((await getAvailabilityPeriod(db,{storeId:'store-1',availabilityPeriodId:record.id})).id).toBe(record.id);
  });
  it('lists periods newest first', async () => {
    db.availabilityPeriod.findMany.mockResolvedValue([record]);
    expect(await listAvailabilityPeriods(db,{storeId:'store-1'})).toHaveLength(1);
    expect(db.availabilityPeriod.findMany).toHaveBeenCalledWith({where:{storeId:'store-1'},orderBy:{startDate:'desc'}});
  });
  it('cannot change period dates after submissions', async () => {
    db.availabilityPeriod.findFirst.mockResolvedValue(record);
    db.userAvailability.count.mockResolvedValue(2);
    await expect(updateAvailabilityPeriod(db,{storeId:'store-1',availabilityPeriodId:record.id,endDate:'2030-01-15'})).rejects.toBeInstanceOf(ValidationError);
  });
  it('closes a period without deleting submissions', async () => {
    db.availabilityPeriod.findFirst.mockResolvedValue(record);
    db.availabilityPeriod.update.mockResolvedValue({...record,isOpen:false});
    const result = await closeAvailabilityPeriod(db,{storeId:'store-1',availabilityPeriodId:record.id});
    expect(result.isOpen).toBe(false);
  });
  it('reopens a period', async () => {
    db.availabilityPeriod.findFirst.mockResolvedValue({...record,isOpen:false});
    db.availabilityPeriod.update.mockResolvedValue(record);
    expect((await openAvailabilityPeriod(db,{storeId:'store-1',availabilityPeriodId:record.id})).isOpen).toBe(true);
  });
  it('does not delete a period with submissions', async () => {
    db.availabilityPeriod.findFirst.mockResolvedValue(record);
    db.userAvailability.count.mockResolvedValue(1);
    await expect(deleteAvailabilityPeriod(db,{storeId:'store-1',availabilityPeriodId:record.id})).rejects.toBeInstanceOf(ConflictError);
  });
});
