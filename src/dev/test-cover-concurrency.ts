/**
 * Standalone development smoke test for concurrent acceptance of an OPEN cover request.
 * Copy to src/dev/test-cover-concurrency.ts and run with:
 *   npx tsx src/dev/test-cover-concurrency.ts
 *
 * Requires the Sample Tea Shop development seed. Creates its own future-dated
 * schedule, temporary qualifications if necessary, requests, and assignments.
 * Deletes only records created by this test, including on assertion failures.
 */
import 'dotenv/config';
import {
  CoverRequestStatus,
  CoverRequestType,
  DayType,
  ScheduleStatus,
  UserType,
} from '@prisma/client';
import { prisma } from '../database/prisma.client';
import { createCoverRequest } from '../handlers/cover-requests/create-cover-request.handler';
import { acceptCoverRequest } from '../handlers/cover-requests/accept-cover-request.handler';

const ROUNDS = 3;
const at = (hours: number) => new Date(Date.UTC(1970, 0, 1, hours));

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

function futureMonday(): Date {
  const d = new Date();
  d.setUTCFullYear(d.getUTCFullYear() + 12);
  d.setUTCHours(0, 0, 0, 0);
  d.setUTCDate(d.getUTCDate() + ((8 - d.getUTCDay()) % 7));
  return d;
}

async function main(): Promise<void> {
  const store = await prisma.store.findFirst({ where: { name: 'Sample Tea Shop' } });
  assert(store, 'Sample Tea Shop is missing. Run npm run db:seed first.');

  const members = await prisma.storeUser.findMany({
    where: { storeId: store.id, archivedAt: null },
    orderBy: { joinedAt: 'asc' },
  });
  const admin = members.find(m => m.userType === UserType.ADMIN);
  const employees = members.filter(m => m.userType === UserType.EMPLOYEE);
  assert(admin, 'An active store admin is required.');
  assert(employees.length >= 3, 'At least three active employees are required (one requester and two contenders).');

  // Pick a work type shared by the requester and at least one contender.
  // If necessary, grant temporary qualifications to the other contender.
  const qualifications = await prisma.storeUserWorkType.findMany({
    where: { storeId: store.id, userId: { in: employees.map(e => e.userId) } },
  });
  const qualified = new Set(qualifications.map(q => `${q.userId}:${q.workTypeId}`));
  const base = qualifications.find(q =>
    employees.some(e => e.userId === q.userId) &&
    employees.some(e => e.userId !== q.userId && qualified.has(`${e.userId}:${q.workTypeId}`))
  );
  assert(base, 'Two employees must share a work-type qualification. Rerun the development seed.');

  const requester = employees.find(e => e.userId === base.userId)!;
  const contenders = employees.filter(e => e.userId !== requester.userId).slice(0, 2);
  assert(contenders.length === 2, 'Two distinct contender employees are required.');

  const temporaryQualifications: Array<{storeId:string;userId:string;workTypeId:string}> = [];
  let scheduleId: string | undefined;
  let testFailed = false;

  try {
    for (const contender of contenders) {
      if (!qualified.has(`${contender.userId}:${base.workTypeId}`)) {
        const q = { storeId: store.id, userId: contender.userId, workTypeId: base.workTypeId };
        await prisma.storeUserWorkType.create({ data: q });
        temporaryQualifications.push(q);
      }
    }

    const monday = futureMonday();
    const schedule = await prisma.schedule.create({
      data: { storeId: store.id, createdBy: admin.userId, status: ScheduleStatus.DRAFT },
    });
    scheduleId = schedule.id;
    const week = await prisma.scheduleWeek.create({
      data: { storeId: store.id, scheduleId, weekStartDate: monday },
    });

    const dayTypes = [DayType.MONDAY, DayType.TUESDAY, DayType.WEDNESDAY];
    const assignments: string[] = [];
    for (let i = 0; i < ROUNDS; i++) {
      const dayDate = new Date(monday);
      dayDate.setUTCDate(monday.getUTCDate() + i);
      const day = await prisma.scheduleDay.create({
        data: { storeId: store.id, scheduleWeekId: week.id, date: dayDate, dayOfWeek: dayTypes[i] },
      });
      const assignment = await prisma.shiftAssignment.create({
        data: {
          storeId: store.id, scheduleDayId: day.id, userId: requester.userId,
          workTypeId: base.workTypeId, startTime: at(10), endTime: at(14),
          assignedBy: admin.userId,
        },
      });
      assignments.push(assignment.id);
    }
    await prisma.schedule.update({
      where: { id: scheduleId },
      data: { status: ScheduleStatus.PUBLISHED, publishedBy: admin.userId, publishedAt: new Date() },
    });

    console.log(`Created temporary published schedule ${scheduleId}`);
    console.log(`Requester: ${requester.userId}; contenders: ${contenders.map(c => c.userId).join(', ')}`);

    for (let round = 0; round < ROUNDS; round++) {
      const request = await createCoverRequest(prisma, {
        storeId: store.id,
        shiftAssignmentId: assignments[round],
        requestingUserId: requester.userId,
        requestType: CoverRequestType.COVER, // No coveringUserId => OPEN
      });
      assert(request.status === CoverRequestStatus.OPEN, 'Test setup failed: request is not OPEN.');

      // Both acceptance promises start before either result is awaited.
      const results = await Promise.allSettled(contenders.map(contender =>
        acceptCoverRequest(prisma, {
          storeId: store.id,
          coverRequestId: request.id,
          actorUserId: contender.userId,
        }),
      ));

      const wins = results.flatMap((result, index) =>
        result.status === 'fulfilled' ? [{ userId: contenders[index].userId, value: result.value }] : []
      );
      const failures = results.flatMap((result, index) =>
        result.status === 'rejected' ? [{ userId: contenders[index].userId, reason: result.reason }] : []
      );

      const [savedRequest, savedAssignment, events] = await Promise.all([
        prisma.coverRequest.findUniqueOrThrow({ where: { id: request.id } }),
        prisma.shiftAssignment.findUniqueOrThrow({ where: { id: assignments[round] } }),
        prisma.coverRequestEvent.findMany({ where: { coverRequestId: request.id } }),
      ]);
      const acceptedEvents = events.filter(e => e.eventType === 'ACCEPTED');

      console.log(`\nRound ${round + 1}: ${wins.length} succeeded, ${failures.length} rejected`);
      for (const failure of failures) {
        const reason = failure.reason as { code?: string; message?: string };
        console.log(`  Rejected ${failure.userId}: ${reason.code ?? reason.message ?? String(reason)}`);
      }

      assert(wins.length === 1, `Expected exactly one successful acceptance; got ${wins.length}.`);
      assert(failures.length === 1, `Expected exactly one rejected acceptance; got ${failures.length}.`);
      assert(savedRequest.status === CoverRequestStatus.ACCEPTED, 'Persisted request was not ACCEPTED.');
      assert(savedRequest.coveringUserId === wins[0].userId, 'Request winner does not match successful employee.');
      assert(savedAssignment.userId === wins[0].userId, 'Assignment owner does not match the winner.');
      assert(acceptedEvents.length === 1, `Expected exactly one ACCEPTED event; got ${acceptedEvents.length}.`);
      assert(wins[0].value.status === CoverRequestStatus.ACCEPTED, 'Successful result had incorrect status.');
      console.log('  PASS: one winner, one rejection, matching assignment, one ACCEPTED event.');
    }
    console.log(`\nPASS: All ${ROUNDS} concurrent-acceptance rounds passed.`);
  } catch (error) {
    testFailed = true;
    throw error;
  } finally {
    // Remove test-owned data in FK order, without deleting preexisting seed data.
    try {
      if (scheduleId) {
        const weeks = await prisma.scheduleWeek.findMany({ where: { scheduleId }, select: { id: true } });
        const days = await prisma.scheduleDay.findMany({
          where: { scheduleWeekId: { in: weeks.map(w => w.id) } }, select: { id: true },
        });
        const assignmentIds = (await prisma.shiftAssignment.findMany({
          where: { scheduleDayId: { in: days.map(d => d.id) } }, select: { id: true },
        })).map(a => a.id);
        const requestIds = (await prisma.coverRequest.findMany({
          where: { OR: [
            { shiftAssignmentId: { in: assignmentIds } },
            { swapAssignmentId: { in: assignmentIds } },
          ] }, select: { id: true },
        })).map(r => r.id);
        await prisma.coverRequestEvent.deleteMany({ where: { coverRequestId: { in: requestIds } } });
        await prisma.coverRequest.deleteMany({ where: { id: { in: requestIds } } });
        await prisma.shiftAssignment.deleteMany({ where: { id: { in: assignmentIds } } });
        await prisma.scheduleDay.deleteMany({ where: { id: { in: days.map(d => d.id) } } });
        await prisma.scheduleWeek.deleteMany({ where: { scheduleId } });
        await prisma.schedule.delete({ where: { id: scheduleId } });
        console.log('Temporary test schedule and requests deleted.');
      }
      for (const q of temporaryQualifications) {
        await prisma.storeUserWorkType.delete({
          where: { storeId_userId_workTypeId: q },
        });
      }
      if (temporaryQualifications.length) console.log('Temporary qualifications deleted.');
    } catch (cleanupError) {
      console.error('Cleanup failed! Temporary schedule ID:', scheduleId, cleanupError);
      process.exitCode = 1;
      if (!testFailed) throw cleanupError;
    }
  }
}

main()
  .catch(error => { console.error('FAIL: Concurrent cover acceptance test:', error); process.exitCode = 1; })
  .finally(async () => { await prisma.$disconnect(); });
