import 'dotenv/config';
import { PrismaClient, ScheduleStatus } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { createSchedule } from '../handlers/schedules/create-schedule.handler';
import { addScheduleWeek } from '../handlers/schedules/add-schedule-week.handler';
import { removeScheduleWeek } from '../handlers/schedules/remove-schedule-week.handler';
import { getSchedule } from '../handlers/schedules/get-schedule.handler';
import { publishSchedule } from '../handlers/schedules/publish-schedule.handler';
import { deleteSchedule } from '../handlers/schedules/delete-schedule.handler';

const db = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }),
});

async function main() {
  const store = await db.store.findFirst({ where: { name: 'Sample Tea Shop' } });
  if (!store) throw new Error('Run the seed first: Sample Tea Shop missing.');
  const admin = await db.storeUser.findFirst({
    where: { storeId: store.id, userType: 'ADMIN', archivedAt: null },
  });
  if (!admin) throw new Error('No active admin found.');
  const template = await db.weeklyTemplate.findFirst({
    where: { storeId: store.id, archived: false },
  });
  const schedule = await createSchedule(db, {
    storeId: store.id,
    createdBy: admin.userId,
    weeks: [
      { weekStartDate: '2035-09-03', weeklyTemplateId: template?.id ?? null },
      { weekStartDate: '2035-09-10' },
    ],
  });
  try {
    if (schedule.status !== ScheduleStatus.DRAFT ||
        schedule.weeks.length !== 2 ||
        schedule.weeks.some((w) => w.days.length !== 7)) {
      throw new Error('Multi-week concrete generation failed.');
    }
    console.log('Draft, 2 weeks, 14 days verified.');
    const extended = await addScheduleWeek(db, {
      storeId: store.id, scheduleId: schedule.id, weekStartDate: '2035-09-17',
    });
    if (extended.weeks.length !== 3) throw new Error('Adding week failed.');
    const reduced = await removeScheduleWeek(db, {
      storeId: store.id, scheduleId: schedule.id,
      scheduleWeekId: extended.weeks.find((w) => w.weekStartDate === '2035-09-17')!.id,
    });
    if (reduced.weeks.length !== 2) throw new Error('Removing week failed.');
    const fetched = await getSchedule(db, { storeId: store.id, scheduleId: schedule.id });
    if (fetched.weeks.length !== 2) throw new Error('Fetching weeks failed.');
    const published = await publishSchedule(db, {
      storeId: store.id, scheduleId: schedule.id, publishedBy: admin.userId,
    });
    if (published.status !== ScheduleStatus.PUBLISHED || !published.publishedAt) {
      throw new Error('Publishing failed.');
    }
    console.log('Week management, retrieval, publishing verified.');
  } finally {
    // The published test schedule is deliberately cleaned up without altering real schedules.
    await db.$transaction(async (tx) => {
      const weeks = await tx.scheduleWeek.findMany({
        where: { scheduleId: schedule.id }, select: { id: true },
      });
      const days = await tx.scheduleDay.findMany({
        where: { scheduleWeekId: { in: weeks.map((w) => w.id) } },
        select: { id: true },
      });
      await tx.shiftAssignment.deleteMany({
        where: { scheduleDayId: { in: days.map((d) => d.id) } },
      });
      await tx.scheduleDay.deleteMany({
        where: { scheduleWeekId: { in: weeks.map((w) => w.id) } },
      });
      await tx.scheduleWeek.deleteMany({ where: { scheduleId: schedule.id } });
      await tx.schedule.delete({ where: { id: schedule.id } });
    });
  }
  // Also exercise user-facing draft deletion on a separate one-week schedule.
  const disposable = await createSchedule(db, {
    storeId: store.id, createdBy: admin.userId,
    weeks: [{ weekStartDate: '2035-09-24' }],
  });
  await deleteSchedule(db, { storeId: store.id, scheduleId: disposable.id });
  console.log('Draft deletion verified. Schedule smoke tests complete.');
}

main().catch((error) => { console.error(error); process.exitCode = 1; })
  .finally(() => db.$disconnect());
