import { UserType } from '@prisma/client';
import { createMockDatabase, MockDatabaseClient } from '../../test/database.mock';
import { ConflictError } from '../../common/errors/conflict.error';
import { NotFoundError } from '../../common/errors/not-found.error';
import { ValidationError } from '../../common/errors/validation.error';
import { createStore } from './create-store.handler';
import { getStore } from './get-store.handler';
import { listStores } from './list-stores.handler';
import { updateStore } from './update-store.handler';
import { deleteStore } from './delete-store.handler';

const now = new Date('2026-09-07T00:00:00Z');
const store = { id: 'store-1', name: 'Sample Tea Shop', ownerUserId: 'owner-1', createdAt: now };
const user = { id: 'owner-1', username: 'owner', passwordHash: 'hash', name: 'Owner', email: 'owner@example.com', phoneNumber: null, createdAt: now };

describe('Store handlers', () => {
  let db: MockDatabaseClient;
  beforeEach(() => {
    db = createMockDatabase();
    db.$transaction.mockImplementation(async (callback: any) => callback(db));
  });

  describe('createStore', () => {
    it('creates a store and its owner ADMIN membership atomically', async () => {
      db.user.findUnique.mockResolvedValue(user);
      db.store.create.mockResolvedValue(store);
      db.storeUser.create.mockResolvedValue({ storeId: store.id, userId: user.id, userType: UserType.ADMIN, joinedAt: now, archivedAt: null });
      const result = await createStore(db, { name: ' Sample Tea Shop ', ownerUserId: user.id });
      expect(result).toEqual({ ...store, createdAt: now.toISOString() });
      expect(db.store.create).toHaveBeenCalledWith({ data: { name: store.name, ownerUserId: user.id } });
      expect(db.storeUser.create).toHaveBeenCalledWith({ data: { storeId: store.id, userId: user.id, userType: UserType.ADMIN } });
      expect(db.$transaction).toHaveBeenCalledTimes(1);
    });
    it('rejects an empty name', async () => {
      await expect(createStore(db, { name: '   ', ownerUserId: user.id })).rejects.toBeInstanceOf(ValidationError);
      expect(db.$transaction).not.toHaveBeenCalled();
    });
    it('rejects an unknown owner', async () => {
      db.user.findUnique.mockResolvedValue(null);
      await expect(createStore(db, { name: 'Shop', ownerUserId: 'missing' })).rejects.toBeInstanceOf(NotFoundError);
    });
  });

  it('gets a store', async () => {
    db.store.findUnique.mockResolvedValue(store);
    expect(await getStore(db, { storeId: store.id })).toEqual({ ...store, createdAt: now.toISOString() });
  });
  it('throws when getting a missing store', async () => {
    db.store.findUnique.mockResolvedValue(null);
    await expect(getStore(db, { storeId: 'missing' })).rejects.toBeInstanceOf(NotFoundError);
  });
  it('lists stores visible to a user', async () => {
    db.store.findMany.mockResolvedValue([store]);
    expect(await listStores(db, { userId: user.id })).toHaveLength(1);
    expect(db.store.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { OR: [{ ownerUserId: user.id }, { users: { some: { userId: user.id, archivedAt: null } } }] },
    }));
  });
  it('renames store as owner', async () => {
    db.store.findUnique.mockResolvedValue(store);
    db.store.update.mockResolvedValue({ ...store, name: 'Renamed Shop' });
    const result = await updateStore(db, { storeId: store.id, name: ' Renamed Shop ', actorUserId: user.id });
    expect(result.name).toBe('Renamed Shop');
  });
  it('rejects rename by a non-owner', async () => {
    db.store.findUnique.mockResolvedValue(store);
    await expect(updateStore(db, { storeId: store.id, name: 'Other', actorUserId: 'other' })).rejects.toBeInstanceOf(ValidationError);
    expect(db.store.update).not.toHaveBeenCalled();
  });
  describe('deleteStore', () => {
    it('deletes an empty store and owner membership in one transaction', async () => {
      db.store.findUnique.mockResolvedValue(store);
      for (const delegate of [db.workType, db.shiftType, db.weeklyTemplate, db.schedule, db.availabilityPeriod, db.coverRequest, db.storeUser]) {
        delegate.count.mockResolvedValue(0);
      }
      db.storeUser.deleteMany.mockResolvedValue({ count: 1 });
      db.store.delete.mockResolvedValue(store);
      await deleteStore(db, { storeId: store.id, actorUserId: user.id });
      expect(db.storeUser.deleteMany).toHaveBeenCalled();
      expect(db.store.delete).toHaveBeenCalledWith({ where: { id: store.id } });
    });
    it('rejects deletion if configuration exists', async () => {
      db.store.findUnique.mockResolvedValue(store);
      db.workType.count.mockResolvedValue(1);
      for (const delegate of [db.shiftType, db.weeklyTemplate, db.schedule, db.availabilityPeriod, db.coverRequest, db.storeUser]) {
        delegate.count.mockResolvedValue(0);
      }
      await expect(deleteStore(db, { storeId: store.id, actorUserId: user.id })).rejects.toBeInstanceOf(ConflictError);
      expect(db.store.delete).not.toHaveBeenCalled();
    });
  });
});
