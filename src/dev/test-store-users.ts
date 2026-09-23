import 'dotenv/config';

import { UserType } from '@prisma/client';

import { prisma } from '../database/prisma.client';

import { getStoreUser } from '../handlers/store-users/get-store-user.handler';
import { listStoreUsers } from '../handlers/store-users/list-store-users.handler';
import { updateStoreUser } from '../handlers/store-users/update-store-user.handler';
import { setStoreUserWorkTypes } from '../handlers/store-users/set-store-user-work-types.handler';

async function main() {
  console.log(
    'Starting Store Users integration test...\n',
  );

  const store =
    await prisma.store.findFirst({
      where: {
        name: 'Sample Tea Shop',
      },
    });

  if (!store) {
    throw new Error(
      'Sample Tea Shop not found. Run the seed first.',
    );
  }

  const memberships =
    await listStoreUsers(prisma, {
      storeId: store.id,
    });

  if (memberships.length === 0) {
    throw new Error(
      'No store users found.',
    );
  }

  console.log(
    `Active memberships: ${memberships.length}`,
  );

  const employee =
    memberships.find(
      (membership) =>
        membership.userType ===
          UserType.EMPLOYEE,
    );

  if (!employee) {
    throw new Error(
      'No employee membership found.',
    );
  }

  const originalType =
    employee.userType;

  const originalWorkTypeIds =
    employee.workTypes.map(
      (workType) => workType.id,
    );

  try {
    const fetched =
      await getStoreUser(prisma, {
        storeId: store.id,
        userId: employee.userId,
      });

    console.log(
      `Fetched: ${fetched.user.name} <${fetched.user.email}>`,
    );

    await updateStoreUser(prisma, {
      storeId: store.id,
      userId: employee.userId,
      userType: UserType.ADMIN,
    });

    const activeWorkType =
      await prisma.workType.findFirst({
        where: {
          storeId: store.id,
          archived: false,
        },
      });

    if (activeWorkType) {
      const updated =
        await setStoreUserWorkTypes(
          prisma,
          {
            storeId: store.id,
            userId: employee.userId,
            workTypeIds: [
              activeWorkType.id,
            ],
          },
        );

      console.log(
        `Qualifications after update: ${updated.workTypes.length}`,
      );
    }

    console.log(
      '\nStore Users integration test complete.',
    );
  } finally {
    await updateStoreUser(prisma, {
      storeId: store.id,
      userId: employee.userId,
      userType:
        originalType === 'ADMIN'
          ? UserType.ADMIN
          : UserType.EMPLOYEE,
    });

    await setStoreUserWorkTypes(
      prisma,
      {
        storeId: store.id,
        userId: employee.userId,
        workTypeIds:
          originalWorkTypeIds,
      },
    );
  }
}

main()
  .catch((error) => {
    console.error(
      '\nStore Users integration test failed:',
    );
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
