import { ScheduleStatus, UserType } from '@prisma/client';
import { DatabaseClient } from '../../database/database-client.type';
import { Schedule } from '../../domain/schedule.model';
import { NotFoundError } from '../../common/errors/not-found.error';
import { ValidationError } from '../../common/errors/validation.error';
import { requireMembership } from '../shared';
import { mapSchedule, scheduleInclude } from './schedule.mapper';

export async function publishSchedule(
  db: DatabaseClient,
  input: { storeId: string; scheduleId: string; publishedBy: string },
): Promise<Schedule> {
  const membership = await requireMembership(db, input.storeId, input.publishedBy);
  if (membership.userType !== UserType.ADMIN) {
    throw new ValidationError('Only an active store admin may publish schedules.');
  }
  return db.$transaction(async (tx) => {
    const schedule = await tx.schedule.findFirst({
      where: { id: input.scheduleId, storeId: input.storeId },
    });
    if (!schedule) throw new NotFoundError('Schedule not found.');
    if (schedule.status !== ScheduleStatus.DRAFT) {
      throw new ValidationError('Only draft schedules can be published.');
    }
    const result = await tx.schedule.update({
      where: { id: input.scheduleId },
      data: {
        status: ScheduleStatus.PUBLISHED,
        publishedBy: input.publishedBy,
        publishedAt: new Date(),
      },
      include: scheduleInclude,
    });
    return mapSchedule(result);
  });
}
