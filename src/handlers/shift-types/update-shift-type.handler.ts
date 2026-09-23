import { DatabaseClient } from '../../database/database-client.type';
import { ShiftType } from '../../domain/shift-type.model';
import { ConflictError } from '../../common/errors/conflict.error';
import { NotFoundError } from '../../common/errors/not-found.error';
import { ValidationError } from '../../common/errors/validation.error';
import { mapShiftType, shiftTypeInclude } from './shift-type.mapper';
import { ShiftTypeDayTimeInput, parseTime, validateDayTimes } from './shift-type-validation.utils';
export interface UpdateShiftTypeInput {
  storeId: string; shiftTypeId: string; name?: string;
  description?: string | null; archived?: boolean; dayTimes?: ShiftTypeDayTimeInput[];
}
export async function updateShiftType(db: DatabaseClient, input: UpdateShiftTypeInput): Promise<ShiftType> {
  const current = await db.shiftType.findFirst({ where: { id: input.shiftTypeId, storeId: input.storeId } });
  if (!current) throw new NotFoundError('Shift type not found.');
  const name = input.name?.trim();
  if (name !== undefined && !name) throw new ValidationError('Shift type name is required.');
  if (input.dayTimes !== undefined) validateDayTimes(input.dayTimes);
  if (name && name !== current.name) {
    const duplicate = await db.shiftType.findUnique({
      where: { storeId_name: { storeId: input.storeId, name } },
    });
    if (duplicate && duplicate.id !== current.id) throw new ConflictError('Shift type name is already used by this store.');
  }
  return db.$transaction(async tx => {
    if (input.dayTimes !== undefined) {
      await tx.shiftTypeDayTime.deleteMany({ where: { shiftTypeId: current.id } });
      if (input.dayTimes.length) {
        await tx.shiftTypeDayTime.createMany({
          data: input.dayTimes.map(t => ({
            storeId: input.storeId, shiftTypeId: current.id, dayOfWeek: t.dayOfWeek,
            startTime: parseTime(t.startTime), endTime: parseTime(t.endTime),
          })),
        });
      }
    }
    const updated = await tx.shiftType.update({
      where: { id: current.id },
      data: {
        ...(name !== undefined ? { name } : {}),
        ...(input.description !== undefined ? { description: input.description?.trim() || null } : {}),
        ...(input.archived !== undefined ? { archived: input.archived } : {}),
      },
      include: shiftTypeInclude,
    });
    return mapShiftType(updated);
  });
}
