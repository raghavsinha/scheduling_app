import { DatabaseClient } from '../../database/database-client.type';
import { ShiftType } from '../../domain/shift-type.model';
import { NotFoundError } from '../../common/errors/not-found.error';
import { mapShiftType, shiftTypeInclude } from './shift-type.mapper';
export interface GetShiftTypeInput { storeId: string; shiftTypeId: string; }
export async function getShiftType(db: DatabaseClient, input: GetShiftTypeInput): Promise<ShiftType> {
  const row = await db.shiftType.findFirst({
    where: { id: input.shiftTypeId, storeId: input.storeId }, include: shiftTypeInclude,
  });
  if (!row) throw new NotFoundError('Shift type not found.');
  return mapShiftType(row);
}
