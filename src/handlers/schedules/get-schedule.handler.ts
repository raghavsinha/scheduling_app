import { DatabaseClient } from '../../database/database-client.type';
import { NotFoundError } from '../../common/errors/not-found.error';
import { Schedule } from '../../domain/schedule.model';
import { mapSchedule, scheduleInclude } from './schedule.mapper';

export async function getSchedule(
  db: DatabaseClient,
  input: { storeId: string; scheduleId: string },
): Promise<Schedule> {
  const record = await db.schedule.findFirst({
    where: { id: input.scheduleId, storeId: input.storeId },
    include: scheduleInclude,
  });
  if (!record) throw new NotFoundError('Schedule not found.');
  return mapSchedule(record);
}
