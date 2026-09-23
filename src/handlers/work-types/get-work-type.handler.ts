import { DatabaseClient } from '../../database/database-client.type';
import { WorkType } from '../../domain/work-type.model';
import { NotFoundError } from '../../common/errors/not-found.error';
import { mapWorkType } from './work-type.mapper';

export interface GetWorkTypeInput {
  storeId: string;
  workTypeId: string;
}

export async function getWorkType(
  db: DatabaseClient,
  input: GetWorkTypeInput,
): Promise<WorkType> {
  const result = await db.workType.findFirst({
    where: { id: input.workTypeId, storeId: input.storeId },
  });
  if (!result) throw new NotFoundError('Work type not found.');
  return mapWorkType(result);
}
