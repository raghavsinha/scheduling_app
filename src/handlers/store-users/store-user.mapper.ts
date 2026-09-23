import { StoreUser } from '../../domain/store-user.model';

export const storeUserInclude = {
  user: true,
  workTypes: {
    include: {
      workType: true,
    },
  },
} as const;

interface StoreUserRecord {
  storeId: string;
  userId: string;
  userType: string;
  joinedAt: Date;
  archivedAt: Date | null;

  user: {
    id: string;
    username: string;
    name: string;
    email: string;
    phoneNumber: string | null;
    createdAt: Date;
  };

  workTypes: Array<{
    workType: {
      id: string;
      storeId: string;
      name: string;
      description: string | null;
      displayOrder: number;
      archived: boolean;
    };
  }>;
}

export function mapStoreUser(
  record: StoreUserRecord,
): StoreUser {
  return {
    storeId: record.storeId,
    userId: record.userId,

    user: {
      id: record.user.id,
      username: record.user.username,
      name: record.user.name,
      email: record.user.email,
      phoneNumber: record.user.phoneNumber,
      createdAt: record.user.createdAt.toISOString(),
    },

    userType:
      record.userType as StoreUser['userType'],

    joinedAt:
      record.joinedAt.toISOString(),

    archivedAt:
      record.archivedAt
        ? record.archivedAt.toISOString()
        : null,

    workTypes:
      record.workTypes.map(
        ({ workType }) => ({
          id: workType.id,
          storeId: workType.storeId,
          name: workType.name,
          description:
            workType.description,
          displayOrder:
            workType.displayOrder,
          archived:
            workType.archived,
        }),
      ),
  };
}
