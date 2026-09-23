import { DatabaseClient } from '../../database/database-client.type';
import { WorkType } from '../../domain/work-type.model';
import { ConflictError } from '../../common/errors/conflict.error';
import { NotFoundError } from '../../common/errors/not-found.error';
import { ValidationError } from '../../common/errors/validation.error';
import { mapWorkType } from './work-type.mapper';

export interface UpdateWorkTypeInput {
  storeId: string;
  workTypeId: string;
  name?: string;
  description?: string | null;
  displayOrder?: number;
  archived?: boolean;
}

export async function updateWorkType(
  db: DatabaseClient,
  input: UpdateWorkTypeInput,
): Promise<WorkType> {
  const current = await db.workType.findFirst({
    where: { id: input.workTypeId, storeId: input.storeId },
  });
  if (!current) throw new NotFoundError('Work type not found.');
  const name = input.name?.trim();
  if (name !== undefined && !name) throw new ValidationError('Work type name is required.');
  if (input.displayOrder !== undefined && !Number.isInteger(input.displayOrder)) {
    throw new ValidationError('Display order must be an integer.');
  }
  if (name !== undefined && name !== current.name) {
    const duplicate = await db.workType.findUnique({
      where: { storeId_name: { storeId: input.storeId, name } },
    });
    if (duplicate && duplicate.id !== current.id) {
      throw new ConflictError('Work type name is already used by this store.');
    }
  }
  const result = await db.workType.update({
    where: { id: current.id },
    data: {
      ...(name !== undefined ? { name } : {}),
      ...(input.description !== undefined
        ? { description: input.description?.trim() || null } : {}),
      ...(input.displayOrder !== undefined ? { displayOrder: input.displayOrder } : {}),
      ...(input.archived !== undefined ? { archived: input.archived } : {}),
    },
  });
  return mapWorkType(result);
}
