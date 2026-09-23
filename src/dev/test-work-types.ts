import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { createWorkType } from '../handlers/work-types/create-work-type.handler';
import { getWorkType } from '../handlers/work-types/get-work-type.handler';
import { listWorkTypes } from '../handlers/work-types/list-work-types.handler';
import { updateWorkType } from '../handlers/work-types/update-work-type.handler';
import { deleteWorkType } from '../handlers/work-types/delete-work-type.handler';

const db = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }),
});

async function main() {
  const unique = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const user = await db.user.create({
    data: {
      username: `work-test-${unique}`,
      email: `work-test-${unique}@example.invalid`,
      name: 'Work Type Test Owner',
      passwordHash: 'TEST_ONLY_NOT_A_PASSWORD_HASH',
    },
  });
  let storeId: string | undefined;
  try {
    const store = await db.store.create({
      data: { name: `Work Test ${unique}`, ownerUserId: user.id },
    });
    storeId = store.id;

    console.log('--- CREATE WORK TYPE ---');
    const created = await createWorkType(db, {
      storeId, name: ' Test Teamaker ', description: 'Tea preparation', displayOrder: 1,
    });
    if (created.name !== 'Test Teamaker') throw new Error('Unexpected created name');
    const got = await getWorkType(db, { storeId, workTypeId: created.id });
    if (got.id !== created.id) throw new Error('Get work type mismatch');

    console.log('--- UPDATE WORK TYPE ---');
    const updated = await updateWorkType(db, {
      storeId, workTypeId: created.id, name: 'Test Barista', displayOrder: 2,
    });
    if (updated.name !== 'Test Barista' || updated.displayOrder !== 2) {
      throw new Error('Work type update failed');
    }
    if (!(await listWorkTypes(db, { storeId })).some(w => w.id === created.id)) {
      throw new Error('Work type missing from active list');
    }

    console.log('--- ARCHIVE WORK TYPE ---');
    await deleteWorkType(db, { storeId, workTypeId: created.id });
    if ((await listWorkTypes(db, { storeId })).some(w => w.id === created.id)) {
      throw new Error('Archived work type remains in active list');
    }
    const archived = await listWorkTypes(db, { storeId, includeArchived: true });
    if (!archived.some(w => w.id === created.id && w.archived)) {
      throw new Error('Archived work type not returned with includeArchived');
    }
    console.log('Work Type integration test complete.');
  } finally {
    if (storeId) {
      await db.workType.deleteMany({ where: { storeId } });
      await db.store.delete({ where: { id: storeId } });
    }
    await db.user.delete({ where: { id: user.id } });
  }
}

main().catch(error => {
  console.error('Work Type integration test failed:', error);
  process.exitCode = 1;
}).finally(async () => db.$disconnect());
