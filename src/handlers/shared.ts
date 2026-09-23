import { DatabaseExecutor } from '../database/database-client.type';
import { NotFoundError } from '../common/errors/not-found.error';
import { ValidationError } from '../common/errors/validation.error';

/** A calendar date is stored as UTC midnight, independent of machine timezone. */
export function date(value: string): Date {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new ValidationError('Date must use YYYY-MM-DD format.');
  }
  const parsed = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== value) {
    throw new ValidationError('Invalid calendar date.');
  }
  return parsed;
}

export function time(value: string): Date {
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(value)) {
    throw new ValidationError('Time must use HH:mm format.');
  }
  return new Date(`1970-01-01T${value}:00.000Z`);
}

export function localDate(value: Date): string {
  return value.toISOString().slice(0, 10);
}

export function localTime(value: Date): string {
  return value.toISOString().slice(11, 16);
}

export async function requireStore(db: DatabaseExecutor, storeId: string) {
  const store = await db.store.findUnique({ where: { id: storeId } });
  if (!store) throw new NotFoundError('Store not found.');
  return store;
}

export async function requireMembership(db: DatabaseExecutor, storeId: string, userId: string) {
  const membership = await db.storeUser.findUnique({
    where: { storeId_userId: { storeId, userId } },
  });
  if (!membership || membership.archivedAt) {
    throw new ValidationError('Active store membership is required.');
  }
  return membership;
}
