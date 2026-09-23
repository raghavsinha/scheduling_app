import { ScheduleStatus } from '@prisma/client';
import { DatabaseClient } from '../../database/database-client.type';
import { Schedule } from '../../domain/schedule.model';
import { mapSchedule, scheduleInclude } from './schedule.mapper';

export async function listSchedules(
  db: DatabaseClient,
  input: { storeId: string; status?: ScheduleStatus },
): Promise<Schedule[]> {
  const records = await db.schedule.findMany({
    where: { storeId: input.storeId, ...(input.status ? { status: input.status } : {}) },
    include: scheduleInclude,
    orderBy: { createdAt: 'desc' },
  });
  return records.map(mapSchedule);
}
