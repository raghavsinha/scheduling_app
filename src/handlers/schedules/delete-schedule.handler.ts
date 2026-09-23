import { ScheduleStatus } from '@prisma/client';
import { DatabaseClient } from '../../database/database-client.type';
import { ConflictError } from '../../common/errors/conflict.error';
import { NotFoundError } from '../../common/errors/not-found.error';
import { ValidationError } from '../../common/errors/validation.error';

export async function deleteSchedule(
  db: DatabaseClient,
  input: { storeId: string; scheduleId: string },
): Promise<void> {
  await db.$transaction(async (tx) => {
    const schedule = await tx.schedule.findFirst({
      where: { id: input.scheduleId, storeId: input.storeId },
    });
    if (!schedule) throw new NotFoundError('Schedule not found.');
    if (schedule.status !== ScheduleStatus.DRAFT) {
      throw new ValidationError('Only draft schedules may be deleted.');
    }
    const weekIds = (await tx.scheduleWeek.findMany({
      where: { scheduleId: input.scheduleId }, select: { id: true },
    })).map((w) => w.id);
    const dayIds = (await tx.scheduleDay.findMany({
      where: { scheduleWeekId: { in: weekIds } }, select: { id: true },
    })).map((d) => d.id);
    const assignmentIds = (await tx.shiftAssignment.findMany({
      where: { scheduleDayId: { in: dayIds } }, select: { id: true },
    })).map((a) => a.id);
    if (await tx.coverRequest.count({
      where: { OR: [
        { shiftAssignmentId: { in: assignmentIds } },
        { swapAssignmentId: { in: assignmentIds } },
      ] },
    })) throw new ConflictError('Schedule is referenced by cover requests.');
    await tx.shiftAssignment.deleteMany({ where: { scheduleDayId: { in: dayIds } } });
    await tx.scheduleDay.deleteMany({ where: { scheduleWeekId: { in: weekIds } } });
    await tx.scheduleWeek.deleteMany({ where: { scheduleId: input.scheduleId } });
    await tx.schedule.delete({ where: { id: input.scheduleId } });
  });
}
