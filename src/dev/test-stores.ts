import 'dotenv/config';
import { PrismaClient, UserType } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { createStore } from '../handlers/stores/create-store.handler';
import { getStore } from '../handlers/stores/get-store.handler';
import { listStores } from '../handlers/stores/list-stores.handler';
import { updateStore } from '../handlers/stores/update-store.handler';
import { deleteStore } from '../handlers/stores/delete-store.handler';

const db = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }) });
async function main() {
  const unique = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const owner = await db.user.create({ data: {
    username: `recovery-owner-${unique}`, name: 'Store Recovery Owner',
    email: `recovery-${unique}@example.invalid`, passwordHash: 'TEST_ONLY_NOT_A_PASSWORD_HASH',
  } });
  let storeId: string | undefined;
  try {
    console.log('--- CREATE STORE ---');
    const created = await createStore(db, { name: 'Recovery Test Store', ownerUserId: owner.id });
    storeId = created.id;
    const membership = await db.storeUser.findUniqueOrThrow({ where: { storeId_userId: { storeId, userId: owner.id } } });
    if (membership.userType !== UserType.ADMIN) throw new Error('Owner was not granted ADMIN membership.');
    console.log('--- GET STORE ---');
    if ((await getStore(db, { storeId })).id !== storeId) throw new Error('Get did not return created store.');
    console.log('--- LIST STORES ---');
    if (!(await listStores(db, { userId: owner.id })).some(s => s.id === storeId)) throw new Error('New store absent from owner list.');
    console.log('--- UPDATE STORE ---');
    if ((await updateStore(db, { storeId, actorUserId: owner.id, name: 'Renamed Recovery Store' })).name !== 'Renamed Recovery Store') throw new Error('Rename failed.');
    console.log('--- DELETE EMPTY STORE ---');
    await deleteStore(db, { storeId, actorUserId: owner.id });
    storeId = undefined;
    console.log('Store integration test complete.');
  } finally {
    if (storeId) {
      await db.storeUser.deleteMany({ where: { storeId } });
      await db.store.delete({ where: { id: storeId } });
    }
    await db.user.delete({ where: { id: owner.id } });
  }
}
main().catch(e => { console.error(e); process.exitCode = 1; }).finally(async () => db.$disconnect());
