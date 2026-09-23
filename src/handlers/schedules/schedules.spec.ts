import { DayType, ScheduleStatus, UserType } from '@prisma/client';
import { createMockDatabase, MockDatabaseClient } from '../../test/database.mock';
import { ValidationError } from '../../common/errors/validation.error';
import { ConflictError } from '../../common/errors/conflict.error';
import { createSchedule } from './create-schedule.handler';
import { addScheduleWeek } from './add-schedule-week.handler';
import { removeScheduleWeek } from './remove-schedule-week.handler';
import { publishSchedule } from './publish-schedule.handler';
import { deleteSchedule } from './delete-schedule.handler';
import { createScheduleWeekInternal } from './schedule-generation.utils';

describe('Schedule handlers', () => {
  let db: MockDatabaseClient;
  const now = new Date('2026-09-07T00:00:00.000Z');
  const monday = new Date('2027-09-06T00:00:00.000Z');
  const activeAdmin = {
    storeId: 'store-1', userId: 'admin-1', userType: UserType.ADMIN,
    joinedAt: now, archivedAt: null,
  };
  const draft = {
    id: 'schedule-1', storeId: 'store-1', status: ScheduleStatus.DRAFT,
    createdBy: 'admin-1', publishedBy: null, publishedAt: null,
    createdAt: now, updatedAt: now,
  };
  beforeEach(() => {
    db = createMockDatabase();
    db.$transaction.mockImplementation(async (callback: any) => callback(db));
  });
  it('rejects schedules whose weeks do not start on Mondays', async () => {
    db.store.findUnique.mockResolvedValue({ id: 'store-1' } as any);
    db.storeUser.findUnique.mockResolvedValue(activeAdmin);
    await expect(createSchedule(db, {
      storeId: 'store-1', createdBy: 'admin-1',
      weeks: [{ weekStartDate: '2027-09-07' }],
    })).rejects.toBeInstanceOf(ValidationError);
    expect(db.$transaction).not.toHaveBeenCalled();
  });
  it('rejects duplicate weeks', async () => {
    db.store.findUnique.mockResolvedValue({ id: 'store-1' } as any);
    db.storeUser.findUnique.mockResolvedValue(activeAdmin);
    await expect(createSchedule(db, {
      storeId: 'store-1', createdBy: 'admin-1',
      weeks: [{ weekStartDate: '2027-09-06' }, { weekStartDate: '2027-09-06' }],
    })).rejects.toBeInstanceOf(ValidationError);
  });
  it('rejects non-admin schedule creators', async () => {
    db.store.findUnique.mockResolvedValue({ id: 'store-1' } as any);
    db.storeUser.findUnique.mockResolvedValue({
      ...activeAdmin, userType: UserType.EMPLOYEE,
    });
    await expect(createSchedule(db, {
      storeId: 'store-1', createdBy: 'admin-1',
      weeks: [{ weekStartDate: '2027-09-06' }],
    })).rejects.toBeInstanceOf(ValidationError);
  });
  it('generates seven dates and concrete empty slots from a template', async () => {
    db.scheduleWeek.create.mockResolvedValue({ id: 'week-1' } as any);
    db.weekShiftRequirement.findMany.mockResolvedValue([{
      id: 'requirement-1', storeId: 'store-1', weeklyTemplateId: 'template-1',
      shiftTypeId: 'shift-1', workTypeId: 'work-1',
      dayOfWeek: DayType.MONDAY, requiredCount: 2,
    }]);
    db.shiftTypeDayTime.findMany.mockResolvedValue([{
      id: 'time-1', storeId: 'store-1', shiftTypeId: 'shift-1',
      dayOfWeek: DayType.MONDAY,
      startTime: new Date('1970-01-01T10:00:00.000Z'),
      endTime: new Date('1970-01-01T14:00:00.000Z'),
    } as any]);
    db.scheduleDay.create.mockImplementation(
      (async (args: any) => ({
        ...args.data,
        id: `day-${args.data.date.getUTCDate()}`,
      })) as any,
    );
    db.shiftAssignment.createMany.mockResolvedValue({ count: 2 });
    await createScheduleWeekInternal(db as any, {
      storeId: 'store-1', scheduleId: 'schedule-1',
      weekStartDate: monday, weeklyTemplateId: 'template-1',
    });
    expect(db.scheduleDay.create).toHaveBeenCalledTimes(7);
    expect(db.shiftAssignment.createMany).toHaveBeenCalledTimes(1);
    expect(db.shiftAssignment.createMany).toHaveBeenCalled();

    const createManyCall: any = db.shiftAssignment.createMany.mock.calls[0];

    if (!createManyCall) {
      throw new Error('Expected shiftAssignment.createMany to be called.');
    }

    const data = createManyCall[0].data;
    const slots = Array.isArray(data) ? data : [data];

    expect(slots[0]).toEqual(
      expect.objectContaining({
        userId: null,
        assignedBy: null,
      }),
    );
  });
  it('rejects duplicate added week', async () => {
    db.schedule.findFirst.mockResolvedValue(draft);
    db.scheduleWeek.findFirst.mockResolvedValue({ id: 'week-existing' } as any);
    await expect(addScheduleWeek(db, {
      storeId: 'store-1', scheduleId: 'schedule-1', weekStartDate: '2027-09-06',
    })).rejects.toBeInstanceOf(ConflictError);
  });
  it('does not remove the final week', async () => {
    db.schedule.findFirst.mockResolvedValue(draft);
    db.scheduleWeek.findFirst.mockResolvedValue({ id: 'week-1' } as any);
    db.scheduleWeek.count.mockResolvedValue(1);
    await expect(removeScheduleWeek(db, {
      storeId: 'store-1', scheduleId: 'schedule-1', scheduleWeekId: 'week-1',
    })).rejects.toBeInstanceOf(ValidationError);
  });
  it('does not publish non-draft schedules', async () => {
    db.storeUser.findUnique.mockResolvedValue(activeAdmin);
    db.schedule.findFirst.mockResolvedValue({
      ...draft, status: ScheduleStatus.PUBLISHED,
    });
    await expect(publishSchedule(db, {
      storeId: 'store-1', scheduleId: 'schedule-1', publishedBy: 'admin-1',
    })).rejects.toBeInstanceOf(ValidationError);
  });
  it('does not delete a published schedule', async () => {
    db.schedule.findFirst.mockResolvedValue({
      ...draft, status: ScheduleStatus.PUBLISHED,
    });
    await expect(deleteSchedule(db, {
      storeId: 'store-1', scheduleId: 'schedule-1',
    })).rejects.toBeInstanceOf(ValidationError);
  });
});
