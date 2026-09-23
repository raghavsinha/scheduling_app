import { DatabaseClient } from '../../database/database-client.type';
import { StoreUser } from '../../domain/store-user.model';

import { NotFoundError } from '../../common/errors/not-found.error';
import { ValidationError } from '../../common/errors/validation.error';

import { mapStoreUser, storeUserInclude } from './store-user.mapper';

export interface SetStoreUserWorkTypesInput {
  storeId: string;
  userId: string;
  workTypeIds: string[];
}

export async function setStoreUserWorkTypes(
  db: DatabaseClient,
  input: SetStoreUserWorkTypesInput,
): Promise<StoreUser> {
  const membership = await db.storeUser.findUnique({
    where: {
      storeId_userId: {
        storeId: input.storeId,
        userId: input.userId,
      },
    },
  });

  if (!membership) {
    throw new NotFoundError('Store user not found.');
  }

  const uniqueWorkTypeIds = [...new Set(input.workTypeIds)];

  if (uniqueWorkTypeIds.length > 0) {
    const workTypes = await db.workType.findMany({
      where: {
        storeId: input.storeId,
        id: {
          in: uniqueWorkTypeIds,
        },
      },
      select: {
        id: true,
      },
    });

    if (workTypes.length !== uniqueWorkTypeIds.length) {
      throw new ValidationError(
        'One or more work types do not belong to this store.',
      );
    }
  }

  const updated = await db.$transaction(async (tx) => {
    await tx.storeUserWorkType.deleteMany({
      where: {
        storeId: input.storeId,
        userId: input.userId,
      },
    });

    if (uniqueWorkTypeIds.length > 0) {
      await tx.storeUserWorkType.createMany({
        data: uniqueWorkTypeIds.map((workTypeId) => ({
          storeId: input.storeId,
          userId: input.userId,
          workTypeId,
        })),
      });
    }

    return tx.storeUser.findUniqueOrThrow({
      where: {
        storeId_userId: {
          storeId: input.storeId,
          userId: input.userId,
        },
      },
      include: storeUserInclude,
    });
  });

  return mapStoreUser(updated as any);
}
