import { UserType } from '@prisma/client';

import {
  createMockDatabase,
  MockDatabaseClient,
} from '../../test/database.mock';

import { addStoreUser } from './add-store-user.handler';
import { getStoreUser } from './get-store-user.handler';
import { listStoreUsers } from './list-store-users.handler';
import { updateStoreUser } from './update-store-user.handler';
import { removeStoreUser } from './remove-store-user.handler';
import { setStoreUserWorkTypes } from './set-store-user-work-types.handler';

import { ConflictError } from '../../common/errors/conflict.error';
import { NotFoundError } from '../../common/errors/not-found.error';
import { ValidationError } from '../../common/errors/validation.error';

describe('Store User handlers', () => {
  let db: MockDatabaseClient;

  const joinedAt =
    new Date('2026-09-07T00:00:00.000Z');

  const storeRecord = {
    id: 'store-1',
    name: 'Sample Tea Shop',
    ownerUserId: 'owner-1',
    createdAt: joinedAt,
  };

  const userRecord = {
    id: 'user-1',
    username: 'bob',
    passwordHash: 'hash',
    name: 'Bob',
    email: 'bob@example.com',
    phoneNumber: '123-456-7890',
    createdAt: joinedAt,
  };

  const membershipRecord = {
    storeId: 'store-1',
    userId: 'user-1',
    userType: UserType.EMPLOYEE,
    joinedAt,
    archivedAt: null,
  };

  const workTypeRecord = {
    id: 'work-1',
    storeId: 'store-1',
    name: 'Teamaker',
    description: 'Makes drinks',
    displayOrder: 1,
    archived: false,
  };

  const fullMembershipRecord = {
    ...membershipRecord,

    user: userRecord,

    workTypes: [
      {
        storeId: 'store-1',
        userId: 'user-1',
        workTypeId: 'work-1',
        workType: workTypeRecord,
      },
    ],
  };

  beforeEach(() => {
    db = createMockDatabase();

    db.$transaction.mockImplementation(
      async (callback: any) =>
        callback(db),
    );
  });

  describe('addStoreUser', () => {
    it('adds a user to a store', async () => {
      db.store.findUnique.mockResolvedValue(
        storeRecord,
      );

      db.user.findUnique.mockResolvedValue(
        userRecord,
      );

      db.storeUser.findUnique.mockResolvedValue(
        null,
      );

      db.storeUser.create.mockResolvedValue(
        membershipRecord,
      );

      db.storeUser.findUniqueOrThrow.mockResolvedValue({
        ...fullMembershipRecord,
        workTypes: [],
      } as any);

      const result = await addStoreUser(
        db,
        {
          storeId: 'store-1',
          userId: 'user-1',
          userType:
            UserType.EMPLOYEE,
        },
      );

      expect(result.user.id).toBe(
        'user-1',
      );

      expect(result.user.email).toBe(
        'bob@example.com',
      );

      expect(result.userType).toBe(
        'EMPLOYEE',
      );
    });

    it('rejects duplicate membership', async () => {
      db.store.findUnique.mockResolvedValue(
        storeRecord,
      );

      db.user.findUnique.mockResolvedValue(
        userRecord,
      );

      db.storeUser.findUnique.mockResolvedValue(
        membershipRecord,
      );

      await expect(
        addStoreUser(db, {
          storeId: 'store-1',
          userId: 'user-1',
          userType:
            UserType.EMPLOYEE,
        }),
      ).rejects.toBeInstanceOf(
        ConflictError,
      );

      expect(
        db.storeUser.create,
      ).not.toHaveBeenCalled();
    });

    it('throws when user does not exist', async () => {
      db.store.findUnique.mockResolvedValue(
        storeRecord,
      );

      db.user.findUnique.mockResolvedValue(
        null,
      );

      await expect(
        addStoreUser(db, {
          storeId: 'store-1',
          userId: 'missing',
          userType:
            UserType.EMPLOYEE,
        }),
      ).rejects.toBeInstanceOf(
        NotFoundError,
      );
    });
  });

  describe('getStoreUser', () => {
    it('returns membership and work types', async () => {
      db.storeUser.findUnique.mockResolvedValue(
        fullMembershipRecord as any,
      );

      const result =
        await getStoreUser(db, {
          storeId: 'store-1',
          userId: 'user-1',
        });

      expect(result.user.name).toBe(
        'Bob',
      );

      expect(result.user.email).toBe(
        'bob@example.com',
      );

      expect(
        result.workTypes,
      ).toHaveLength(1);

      expect(
        result.workTypes[0].name,
      ).toBe('Teamaker');
    });

    it('throws when membership does not exist', async () => {
      db.storeUser.findUnique.mockResolvedValue(
        null,
      );

      await expect(
        getStoreUser(db, {
          storeId: 'store-1',
          userId: 'missing',
        }),
      ).rejects.toBeInstanceOf(
        NotFoundError,
      );
    });
  });

  describe('listStoreUsers', () => {
    it('lists active users by default', async () => {
      db.storeUser.findMany.mockResolvedValue([
        fullMembershipRecord as any,
      ]);

      const result =
        await listStoreUsers(db, {
          storeId: 'store-1',
        });

      expect(
        db.storeUser.findMany,
      ).toHaveBeenCalledWith({
        where: {
          storeId: 'store-1',
          archivedAt: null,
        },

        include: {
          user: true,
          workTypes: {
            include: {
              workType: true,
            },
          },
        },

        orderBy: {
          joinedAt: 'asc',
        },
      });

      expect(result).toHaveLength(1);
    });
  });

  describe('updateStoreUser', () => {
    it('changes user type', async () => {
      db.storeUser.findUnique.mockResolvedValue(
        membershipRecord,
      );

      db.store.findUnique.mockResolvedValue(
        storeRecord,
      );

      db.storeUser.update.mockResolvedValue({
        ...membershipRecord,
        userType: UserType.ADMIN,
      });

      db.storeUser.findUniqueOrThrow.mockResolvedValue({
        ...fullMembershipRecord,
        userType: UserType.ADMIN,
      } as any);

      const result =
        await updateStoreUser(db, {
          storeId: 'store-1',
          userId: 'user-1',
          userType:
            UserType.ADMIN,
        });

      expect(result.userType).toBe(
        'ADMIN',
      );
    });

    it('does not allow owner to become employee', async () => {
      db.storeUser.findUnique.mockResolvedValue({
        ...membershipRecord,
        userId: 'owner-1',
        userType: UserType.ADMIN,
      });

      db.store.findUnique.mockResolvedValue(
        storeRecord,
      );

      await expect(
        updateStoreUser(db, {
          storeId: 'store-1',
          userId: 'owner-1',
          userType:
            UserType.EMPLOYEE,
        }),
      ).rejects.toBeInstanceOf(
        ValidationError,
      );

      expect(
        db.storeUser.update,
      ).not.toHaveBeenCalled();
    });
  });

  describe('removeStoreUser', () => {
    it('archives a membership', async () => {
      db.storeUser.findUnique.mockResolvedValue(
        membershipRecord,
      );

      db.store.findUnique.mockResolvedValue(
        storeRecord,
      );

      db.storeUser.update.mockResolvedValue({
        ...membershipRecord,
        archivedAt: new Date(),
      });

      await removeStoreUser(db, {
        storeId: 'store-1',
        userId: 'user-1',
      });

      expect(
        db.storeUser.update,
      ).toHaveBeenCalled();

      const updateCall =
        db.storeUser.update.mock.calls[0][0];

      expect(
        updateCall.data.archivedAt,
      ).toBeInstanceOf(Date);
    });

    it('does not allow owner removal', async () => {
      db.storeUser.findUnique.mockResolvedValue({
        ...membershipRecord,
        userId: 'owner-1',
      });

      db.store.findUnique.mockResolvedValue(
        storeRecord,
      );

      await expect(
        removeStoreUser(db, {
          storeId: 'store-1',
          userId: 'owner-1',
        }),
      ).rejects.toBeInstanceOf(
        ValidationError,
      );

      expect(
        db.storeUser.update,
      ).not.toHaveBeenCalled();
    });
  });

  describe('setStoreUserWorkTypes', () => {
    it('replaces user work types', async () => {
      db.storeUser.findUnique.mockResolvedValue(
        membershipRecord,
      );

      db.workType.findMany.mockResolvedValue([
        { id: 'work-1' },
      ] as any);

      db.storeUserWorkType.deleteMany.mockResolvedValue({
        count: 1,
      });

      db.storeUserWorkType.createMany.mockResolvedValue({
        count: 1,
      });

      db.storeUser.findUniqueOrThrow.mockResolvedValue(
        fullMembershipRecord as any,
      );

      const result =
        await setStoreUserWorkTypes(
          db,
          {
            storeId: 'store-1',
            userId: 'user-1',
            workTypeIds: [
              'work-1',
            ],
          },
        );

      expect(
        result.workTypes,
      ).toHaveLength(1);

      expect(
        db.storeUserWorkType.deleteMany,
      ).toHaveBeenCalledWith({
        where: {
          storeId: 'store-1',
          userId: 'user-1',
        },
      });
    });

    it('rejects work types from another store', async () => {
      db.storeUser.findUnique.mockResolvedValue(
        membershipRecord,
      );

      db.workType.findMany.mockResolvedValue(
        [],
      );

      await expect(
        setStoreUserWorkTypes(
          db,
          {
            storeId: 'store-1',
            userId: 'user-1',
            workTypeIds: [
              'wrong-store-work-type',
            ],
          },
        ),
      ).rejects.toBeInstanceOf(
        ValidationError,
      );

      expect(
        db.$transaction,
      ).not.toHaveBeenCalled();
    });
  });
});
