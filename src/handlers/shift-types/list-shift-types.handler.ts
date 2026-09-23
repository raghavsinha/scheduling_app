import { DatabaseClient } from '../../database/database-client.type';
import { ShiftType } from '../../domain/shift-type.model';
import { mapShiftType, shiftTypeInclude } from './shift-type.mapper';
export interface ListShiftTypesInput { storeId: string; includeArchived?: boolean; }
export async function listShiftTypes(db: DatabaseClient, input: ListShiftTypesInput): Promise<ShiftType[]> {
  const rows = await db.shiftType.findMany({
    where: { storeId: input.storeId, ...(!input.includeArchived ? { archived: false } : {}) },
    include: shiftTypeInclude, orderBy: { name: 'asc' },
  });
  return rows.map(mapShiftType);
}
