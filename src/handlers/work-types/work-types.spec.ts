import { createMockDatabase, MockDatabaseClient } from '../../test/database.mock';
import { ConflictError } from '../../common/errors/conflict.error';
import { NotFoundError } from '../../common/errors/not-found.error';
import { ValidationError } from '../../common/errors/validation.error';
import { createWorkType } from './create-work-type.handler';
import { getWorkType } from './get-work-type.handler';
import { listWorkTypes } from './list-work-types.handler';
import { updateWorkType } from './update-work-type.handler';
import { deleteWorkType } from './delete-work-type.handler';

describe('Work Type handlers', () => {
  let db: MockDatabaseClient;
  const store = { id: 'store-1', name: 'Test', ownerUserId: 'owner-1', createdAt: new Date() };
  const record = {
    id: 'work-1', storeId: 'store-1', name: 'Teamaker',
    description: 'Makes drinks', displayOrder: 1, archived: false,
  };
  beforeEach(() => { db = createMockDatabase(); });

  describe('createWorkType', () => {
    it('creates scoped work type and normalizes name', async () => {
      db.store.findUnique.mockResolvedValue(store);
      db.workType.findUnique.mockResolvedValue(null);
      db.workType.create.mockResolvedValue(record);
      const result = await createWorkType(db, {
        storeId: 'store-1', name: ' Teamaker ', description: 'Makes drinks', displayOrder: 1,
      });
      expect(result.name).toBe('Teamaker');
      expect(db.workType.create).toHaveBeenCalledWith({
        data: { storeId: 'store-1', name: 'Teamaker', description: 'Makes drinks', displayOrder: 1 },
      });
    });
    it('rejects empty names', async () => {
      await expect(createWorkType(db, { storeId: 'store-1', name: ' ' }))
        .rejects.toBeInstanceOf(ValidationError);
      expect(db.workType.create).not.toHaveBeenCalled();
    });
    it('requires existing store', async () => {
      db.store.findUnique.mockResolvedValue(null);
      await expect(createWorkType(db, { storeId: 'missing', name: 'Teamaker' }))
        .rejects.toBeInstanceOf(NotFoundError);
    });
    it('rejects duplicate names in same store', async () => {
      db.store.findUnique.mockResolvedValue(store);
      db.workType.findUnique.mockResolvedValue(record);
      await expect(createWorkType(db, { storeId: 'store-1', name: 'Teamaker' }))
        .rejects.toBeInstanceOf(ConflictError);
    });
  });

  describe('getWorkType', () => {
    it('gets work type scoped to store', async () => {
      db.workType.findFirst.mockResolvedValue(record);
      expect((await getWorkType(db, { storeId: 'store-1', workTypeId: 'work-1' })).name)
        .toBe('Teamaker');
    });
    it('rejects unknown work type', async () => {
      db.workType.findFirst.mockResolvedValue(null);
      await expect(getWorkType(db, { storeId: 'store-1', workTypeId: 'bad' }))
        .rejects.toBeInstanceOf(NotFoundError);
    });
  });

  describe('listWorkTypes', () => {
    it('excludes archived by default, ordered by display order and name', async () => {
      db.workType.findMany.mockResolvedValue([record]);
      const result = await listWorkTypes(db, { storeId: 'store-1' });
      expect(result).toHaveLength(1);
      expect(db.workType.findMany).toHaveBeenCalledWith({
        where: { storeId: 'store-1', archived: false },
        orderBy: [{ displayOrder: 'asc' }, { name: 'asc' }],
      });
    });
    it('can include archived', async () => {
      db.workType.findMany.mockResolvedValue([{ ...record, archived: true }]);
      const result = await listWorkTypes(db, { storeId: 'store-1', includeArchived: true });
      expect(result[0].archived).toBe(true);
      expect(db.workType.findMany).toHaveBeenCalledWith({
        where: { storeId: 'store-1' },
        orderBy: [{ displayOrder: 'asc' }, { name: 'asc' }],
      });
    });
  });

  describe('updateWorkType', () => {
    it('updates name and display order', async () => {
      db.workType.findFirst.mockResolvedValue(record);
      db.workType.findUnique.mockResolvedValue(null);
      db.workType.update.mockResolvedValue({ ...record, name: 'Barista', displayOrder: 2 });
      const result = await updateWorkType(db, {
        storeId: 'store-1', workTypeId: 'work-1', name: ' Barista ', displayOrder: 2,
      });
      expect(result.name).toBe('Barista');
      expect(result.displayOrder).toBe(2);
    });
    it('does not allow renaming to existing work type', async () => {
      db.workType.findFirst.mockResolvedValue(record);
      db.workType.findUnique.mockResolvedValue({ ...record, id: 'other', name: 'Barista' });
      await expect(updateWorkType(db, {
        storeId: 'store-1', workTypeId: 'work-1', name: 'Barista',
      })).rejects.toBeInstanceOf(ConflictError);
    });
    it('rejects non-integer display order', async () => {
      db.workType.findFirst.mockResolvedValue(record);
      await expect(updateWorkType(db, {
        storeId: 'store-1', workTypeId: 'work-1', displayOrder: 1.5,
      })).rejects.toBeInstanceOf(ValidationError);
    });
  });

  describe('deleteWorkType', () => {
    it('archives instead of hard deleting', async () => {
      db.workType.findFirst.mockResolvedValue(record);
      db.workType.update.mockResolvedValue({ ...record, archived: true });
      await deleteWorkType(db, { storeId: 'store-1', workTypeId: 'work-1' });
      expect(db.workType.update).toHaveBeenCalledWith({
        where: { id: 'work-1' }, data: { archived: true },
      });
      expect(db.workType.delete).not.toHaveBeenCalled();
    });
    it('does not re-archive archived work type', async () => {
      db.workType.findFirst.mockResolvedValue({ ...record, archived: true });
      await deleteWorkType(db, { storeId: 'store-1', workTypeId: 'work-1' });
      expect(db.workType.update).not.toHaveBeenCalled();
    });
  });
});
