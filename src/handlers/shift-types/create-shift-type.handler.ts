import { DatabaseClient } from '../../database/database-client.type';
import { ShiftType } from '../../domain/shift-type.model';
import { ConflictError } from '../../common/errors/conflict.error';
import { NotFoundError } from '../../common/errors/not-found.error';
import { ValidationError } from '../../common/errors/validation.error';
import { mapShiftType, shiftTypeInclude } from './shift-type.mapper';
import { ShiftTypeDayTimeInput, parseTime, validateDayTimes } from './shift-type-validation.utils';

export interface CreateShiftTypeInput {
  storeId: string;
  name: string;
  description?: string | null;
  dayTimes?: ShiftTypeDayTimeInput[];
}
export async function createShiftType(db: DatabaseClient, input: CreateShiftTypeInput): Promise<ShiftType> {
  const name = input.name.trim();
  if (!name) throw new ValidationError('Shift type name is required.');
  validateDayTimes(input.dayTimes ?? []);
  const store = await db.store.findUnique({ where: { id: input.storeId } });
  if (!store) throw new NotFoundError('Store not found.');
  const duplicate = await db.shiftType.findUnique({
    where: { storeId_name: { storeId: input.storeId, name } },
  });
  if (duplicate) throw new ConflictError('Shift type name is already used by this store.');
  const created = await db.shiftType.create({
    data: {
      storeId: input.storeId, name, description: input.description?.trim() || null,
      dayTimes: {
        create: (input.dayTimes ?? []).map(t => ({
          storeId: input.storeId, dayOfWeek: t.dayOfWeek,
          startTime: parseTime(t.startTime), endTime: parseTime(t.endTime),
        })),
      },
    },
    include: shiftTypeInclude,
  });
  return mapShiftType(created);
}
