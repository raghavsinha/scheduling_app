import { ScheduleStatus } from '@prisma/client';
import { DatabaseClient } from '../../database/database-client.type';
import { Schedule } from '../../domain/schedule.model';
import { ConflictError } from '../../common/errors/conflict.error';
import { NotFoundError } from '../../common/errors/not-found.error';
import { ValidationError } from '../../common/errors/validation.error';
import { date } from '../shared';
import { mapSchedule, scheduleInclude } from './schedule.mapper';
import { createScheduleWeekInternal } from './schedule-generation.utils';

export async function addScheduleWeek(
  db: DatabaseClient,
  input: {
    storeId: string;
    scheduleId: string;
    weekStartDate: string;
    weeklyTemplateId?: string | null;
  },
): Promise<Schedule> {
  const schedule = await db.schedule.findFirst({
    where: { id: input.scheduleId, storeId: input.storeId },
  });
  if (!schedule) throw new NotFoundError('Schedule not found.');
  if (schedule.status !== ScheduleStatus.DRAFT) {
    throw new ValidationError('Only draft schedules may be edited.');
  }
  const monday = date(input.weekStartDate);
  if (monday.getUTCDay() !== 1) {
    throw new ValidationError('Schedule weeks must start on Monday.');
  }
  const existing = await db.scheduleWeek.findFirst({
    where: { scheduleId: input.scheduleId, weekStartDate: monday },
  });
  if (existing) throw new ConflictError('This week already exists in the schedule.');

  if (input.weeklyTemplateId) {
    const template = await db.weeklyTemplate.findFirst({
      where: { id: input.weeklyTemplateId, storeId: input.storeId, archived: false },
    });
    if (!template) throw new ValidationError('Invalid weekly template.');
  }

  return db.$transaction(async (tx) => {
    await createScheduleWeekInternal(tx, {
      storeId: input.storeId,
      scheduleId: input.scheduleId,
      weekStartDate: monday,
      weeklyTemplateId: input.weeklyTemplateId ?? null,
    });
    return mapSchedule(await tx.schedule.findUniqueOrThrow({
      where: { id: input.scheduleId },
      include: scheduleInclude,
    }));
  });
}
