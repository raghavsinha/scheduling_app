import { DatabaseClient } from '../../database/database-client.type';
import { WorkType } from '../../domain/work-type.model';
import { mapWorkType } from './work-type.mapper';

export interface ListWorkTypesInput {
  storeId: string;
  includeArchived?: boolean;
}

export async function listWorkTypes(
  db: DatabaseClient,
  input: ListWorkTypesInput,
): Promise<WorkType[]> {
  const result = await db.workType.findMany({
    where: {
      storeId: input.storeId,
      ...(input.includeArchived ? {} : { archived: false }),
    },
    orderBy: [{ displayOrder: 'asc' }, { name: 'asc' }],
  });
  return result.map(mapWorkType);
}
