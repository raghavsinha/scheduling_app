import { DatabaseClient } from '../../database/database-client.type';
import { NotFoundError } from '../../common/errors/not-found.error';

export interface DeleteWorkTypeInput {
  storeId: string;
  workTypeId: string;
}

// Archive, rather than delete: qualifications, templates and past assignments
// can continue referring to the work type.
export async function deleteWorkType(
  db: DatabaseClient,
  input: DeleteWorkTypeInput,
): Promise<void> {
  const current = await db.workType.findFirst({
    where: { id: input.workTypeId, storeId: input.storeId },
  });
  if (!current) throw new NotFoundError('Work type not found.');
  if (!current.archived) {
    await db.workType.update({
      where: { id: current.id },
      data: { archived: true },
    });
  }
}
