import { DatabaseClient } from '../../database/database-client.type';
import { NotFoundError } from '../../common/errors/not-found.error';
export interface DeleteShiftTypeInput { storeId: string; shiftTypeId: string; }
// Archive to retain schedule and availability history.
export async function deleteShiftType(db: DatabaseClient, input: DeleteShiftTypeInput): Promise<void> {
  const current = await db.shiftType.findFirst({ where: { id: input.shiftTypeId, storeId: input.storeId } });
  if (!current) throw new NotFoundError('Shift type not found.');
  if (!current.archived) {
    await db.shiftType.update({ where: { id: current.id }, data: { archived: true } });
  }
}
