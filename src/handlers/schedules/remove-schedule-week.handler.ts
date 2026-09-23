import { ScheduleStatus } from '@prisma/client';
import { DatabaseClient } from '../../database/database-client.type';
import { Schedule } from '../../domain/schedule.model';
import { ConflictError } from '../../common/errors/conflict.error';
import { NotFoundError } from '../../common/errors/not-found.error';
import { ValidationError } from '../../common/errors/validation.error';
import { mapSchedule, scheduleInclude } from './schedule.mapper';

export async function removeScheduleWeek(
  db: DatabaseClient,
  input: { storeId: string; scheduleId: string; scheduleWeekId: string },
): Promise<Schedule> {
  return db.$transaction(async (tx) => {
    const schedule = await tx.schedule.findFirst({
      where: { id: input.scheduleId, storeId: input.storeId },
    });
    if (!schedule) throw new NotFoundError('Schedule not found.');
    if (schedule.status !== ScheduleStatus.DRAFT) {
      throw new ValidationError('Only draft schedules may be edited.');
    }
    const week = await tx.scheduleWeek.findFirst({
      where: { id: input.scheduleWeekId, scheduleId: input.scheduleId, storeId: input.storeId },
    });
    if (!week) throw new NotFoundError('Schedule week not found.');
    if (await tx.scheduleWeek.count({ where: { scheduleId: input.scheduleId } }) <= 1) {
      throw new ValidationError('Cannot remove the final week of a schedule.');
    }

    const days = await tx.scheduleDay.findMany({
      where: { scheduleWeekId: week.id }, select: { id: true },
    });
    const dayIds = days.map((d) => d.id);
    const assignmentIds = (await tx.shiftAssignment.findMany({
      where: { scheduleDayId: { in: dayIds } }, select: { id: true },
    })).map((a) => a.id);
    if (await tx.coverRequest.count({
      where: { OR: [
        { shiftAssignmentId: { in: assignmentIds } },
        { swapAssignmentId: { in: assignmentIds } },
      ] },
    })) throw new ConflictError('Schedule week is referenced by cover requests.');
    await tx.shiftAssignment.deleteMany({ where: { scheduleDayId: { in: dayIds } } });
    await tx.scheduleDay.deleteMany({ where: { scheduleWeekId: week.id } });
    await tx.scheduleWeek.delete({ where: { id: week.id } });
    return mapSchedule(await tx.schedule.findUniqueOrThrow({
      where: { id: input.scheduleId }, include: scheduleInclude,
    }));
  });
}
