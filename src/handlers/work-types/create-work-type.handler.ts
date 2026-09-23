import { DatabaseClient } from '../../database/database-client.type';
import { WorkType } from '../../domain/work-type.model';
import { ConflictError } from '../../common/errors/conflict.error';
import { NotFoundError } from '../../common/errors/not-found.error';
import { ValidationError } from '../../common/errors/validation.error';
import { mapWorkType } from './work-type.mapper';

export interface CreateWorkTypeInput {
  storeId: string;
  name: string;
  description?: string | null;
  displayOrder?: number;
}

export async function createWorkType(
  db: DatabaseClient,
  input: CreateWorkTypeInput,
): Promise<WorkType> {
  const name = input.name.trim();
  if (!name) throw new ValidationError('Work type name is required.');
  if (input.displayOrder !== undefined && !Number.isInteger(input.displayOrder)) {
    throw new ValidationError('Display order must be an integer.');
  }
  const store = await db.store.findUnique({ where: { id: input.storeId } });
  if (!store) throw new NotFoundError('Store not found.');
  const duplicate = await db.workType.findUnique({
    where: { storeId_name: { storeId: input.storeId, name } },
  });
  if (duplicate) throw new ConflictError('Work type name is already used by this store.');
  const result = await db.workType.create({
    data: {
      storeId: input.storeId,
      name,
      description: input.description?.trim() || null,
      displayOrder: input.displayOrder ?? 0,
    },
  });
  return mapWorkType(result);
}
