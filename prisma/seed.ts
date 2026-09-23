import 'dotenv/config';
import { PrismaClient, DayType, UserType } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import * as argon2 from 'argon2';

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }),
});

// Reconstruction: representative seed for local development. The original fully populated
// schedule seed was not provided as a retrievable file; later batches may replace it.
async function main() {
  // Development-only password. Change it before exposing this database to any network.
  const passwordHash = await argon2.hash('password123');
  const users = [
    { username: 'alice.admin', name: 'Alice Chen', email: 'alice@example.com' },
    { username: 'bob', name: 'Bob Martinez', email: 'bob@example.com' },
    { username: 'carol', name: 'Carol Patel', email: 'carol@example.com' },
    { username: 'david', name: 'David Kim', email: 'david@example.com' },
  ];
  const saved = await Promise.all(users.map(user => prisma.user.upsert({
    where: { username: user.username },
    update: { email: user.email, name: user.name },
    create: { ...user, passwordHash, phoneNumber: null },
  })));
  const [alice, bob, carol, david] = saved;
  const store = await prisma.store.findFirst({ where: { name: 'Sample Tea Shop', ownerUserId: alice.id } })
    ?? await prisma.store.create({ data: { name: 'Sample Tea Shop', ownerUserId: alice.id } });
  for (const [userId, userType] of [
    [alice.id, UserType.ADMIN],
    [bob.id, UserType.EMPLOYEE],
    [carol.id, UserType.EMPLOYEE],
    [david.id, UserType.EMPLOYEE],
  ] as const) {
    await prisma.storeUser.upsert({
      where: { storeId_userId: { storeId: store.id, userId } },
      update: { archivedAt: null },
      create: { storeId: store.id, userId, userType },
    });
  }
  const tea = await prisma.workType.upsert({
    where: { storeId_name: { storeId: store.id, name: 'Teamaker' } },
    update: { archived: false },
    create: { storeId: store.id, name: 'Teamaker', displayOrder: 0 },
  });
  for (const user of [alice, bob, david]) {
    await prisma.storeUserWorkType.upsert({
      where: { storeId_userId_workTypeId: { storeId: store.id, userId: user.id, workTypeId: tea.id } },
      update: {}, create: { storeId: store.id, userId: user.id, workTypeId: tea.id },
    });
  }
  const morning = await prisma.shiftType.upsert({
    where: { storeId_name: { storeId: store.id, name: 'Morning' } },
    update: { archived: false },
    create: { storeId: store.id, name: 'Morning' },
  });
  for (const dayOfWeek of Object.values(DayType)) {
    await prisma.shiftTypeDayTime.upsert({
      where: { shiftTypeId_dayOfWeek: { shiftTypeId: morning.id, dayOfWeek } },
      update: {},
      create: { storeId: store.id, shiftTypeId: morning.id, dayOfWeek,
        startTime: new Date('1970-01-01T10:00:00.000Z'), endTime: new Date('1970-01-01T14:00:00.000Z') },
    });
  }
  console.log('Seeded Sample Tea Shop:', store.id);
}
main().catch(error => { console.error(error); process.exitCode = 1; })
  .finally(async () => prisma.$disconnect());
