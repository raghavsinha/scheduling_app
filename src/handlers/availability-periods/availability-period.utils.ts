import { DatabaseClient } from '../../database/database-client.type';
import { ValidationError } from '../../common/errors/validation.error';
import { NotFoundError } from '../../common/errors/not-found.error';

export function parseDateOnly(value: string): Date {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new ValidationError('Use YYYY-MM-DD for availability period dates.');
  }
  const date = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== value) {
    throw new ValidationError('Invalid calendar date.');
  }
  return date;
}

export function assertDateRange(startDate: Date, endDate: Date): void {
  if (startDate.getTime() > endDate.getTime()) {
    throw new ValidationError('Start date must be on or before end date.');
  }
}

export async function requireStore(db: DatabaseClient, storeId: string) {
  const store = await db.store.findUnique({ where: { id: storeId } });
  if (!store) throw new NotFoundError('Store not found.');
  return store;
}

export async function requirePeriod(db: DatabaseClient, storeId: string, periodId: string) {
  const period = await db.availabilityPeriod.findFirst({ where: { id: periodId, storeId } });
  if (!period) throw new NotFoundError('Availability period not found.');
  return period;
}
