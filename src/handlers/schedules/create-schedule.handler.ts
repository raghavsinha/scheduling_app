import { UserType } from '@prisma/client';
import { DatabaseClient } from '../../database/database-client.type';
import { ValidationError } from '../../common/errors/validation.error';
import { date, requireMembership, requireStore } from '../shared';
import { createScheduleWeekInternal } from './schedule-generation.utils';
import { mapSchedule, scheduleInclude } from './schedule.mapper';
import { Schedule } from '../../domain/schedule.model';

export interface CreateScheduleInput {
  storeId: string;
  createdBy: string;
  weeks: Array<{ weekStartDate: string; weeklyTemplateId?: string | null }>;
}

export async function createSchedule(
  db: DatabaseClient,
  input: CreateScheduleInput,
): Promise<Schedule> {
  await requireStore(db, input.storeId);
  const membership = await requireMembership(db, input.storeId, input.createdBy);
  if (membership.userType !== UserType.ADMIN) {
    throw new ValidationError('Schedule creator must be an active admin.');
  }
  if (!input.weeks.length) throw new ValidationError('At least one week is required.');

  const dates = input.weeks.map((week) => date(week.weekStartDate));
  if (dates.some((d) => d.getUTCDay() !== 1)) {
    throw new ValidationError('Every schedule week must start on Monday.');
  }
  if (new Set(dates.map((d) => d.getTime())).size !== dates.length) {
    throw new ValidationError('Schedule weeks cannot repeat.');
  }
  const templateIds = [...new Set(
    input.weeks
      .map((week) => week.weeklyTemplateId)
      .filter((id): id is string => Boolean(id)),
  )];
  if (templateIds.length) {
    const templates = await db.weeklyTemplate.findMany({
      where: { storeId: input.storeId, id: { in: templateIds }, archived: false },
      select: { id: true },
    });
    if (templates.length !== templateIds.length) {
      throw new ValidationError('Invalid or archived weekly template.');
    }
  }

  return db.$transaction(async (tx) => {
    const created = await tx.schedule.create({
      data: { storeId: input.storeId, createdBy: input.createdBy },
    });
    for (const [index, week] of input.weeks.entries()) {
      await createScheduleWeekInternal(tx, {
        storeId: input.storeId,
        scheduleId: created.id,
        weekStartDate: dates[index],
        weeklyTemplateId: week.weeklyTemplateId ?? null,
      });
    }
    const result = await tx.schedule.findUniqueOrThrow({
      where: { id: created.id },
      include: scheduleInclude,
    });
    return mapSchedule(result);
  });
}
