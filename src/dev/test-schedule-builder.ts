
import 'dotenv/config';

import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

import { createSchedule } from '../handlers/schedules/create-schedule.handler';
import { deleteSchedule } from '../handlers/schedules/delete-schedule.handler';
import { getScheduleBuilder } from '../handlers/schedule-builder/get-schedule-builder.handler';
import { getAssignmentEligibility } from '../handlers/schedule-builder/get-assignment-eligibility.handler';
import { validateSchedule } from '../handlers/schedule-builder/validate-schedule.handler';

const db = new PrismaClient({
  adapter: new PrismaPg({
    connectionString: process.env.DATABASE_URL!,
  }),
});

async function main() {
  // Use the store and employee qualifications created by the development seed.
  const store = await db.store.findFirst({
    where: { name: 'Sample Tea Shop' },
  });

  if (!store) {
    throw new Error('Run npm run db:seed first.');
  }

  const admin = await db.storeUser.findFirst({
    where: {
      storeId: store.id,
      userType: 'ADMIN',
      archivedAt: null,
    },
  });

  if (!admin) {
    throw new Error('No active admin found.');
  }

  // Find an active employee with an existing work-type qualification.
  const qualification = await db.storeUserWorkType.findFirst({
    where: {
      storeId: store.id,
      membership: {
        archivedAt: null,
        userType: 'EMPLOYEE',
      },
      workType: {
        archived: false,
      },
    },
  });

  if (!qualification) {
    throw new Error('No qualified active employee found. Rerun the seed.');
  }

  // Create a temporary schedule rather than relying on a previously
  // seeded or manually created schedule.
  const schedule = await createSchedule(db, {
    storeId: store.id,
    createdBy: admin.userId,
    weeks: [
      {
        weekStartDate: '2037-01-05', // Monday
      },
    ],
  });

  console.log('Temporary schedule created:', schedule.id);

  try {
    // Verify that the builder loads the new schedule and store employees.
    const builder = await getScheduleBuilder(db, {
      storeId: store.id,
      scheduleId: schedule.id,
    });

    if (builder.schedule.weeks.length !== 1) {
      throw new Error('Expected exactly one schedule week.');
    }

    if (builder.schedule.weeks[0].days.length !== 7) {
      throw new Error('Expected exactly seven schedule days.');
    }

    if (builder.employees.length === 0) {
      throw new Error('Schedule Builder returned no employees.');
    }

    console.log('PASS: Schedule Builder loads weeks, days and employees.');

    // Choose the first day and create one unassigned shift.
    const day = schedule.weeks[0].days[0];

    const assignment = await db.shiftAssignment.create({
      data: {
        storeId: store.id,
        scheduleDayId: day.id,
        workTypeId: qualification.workTypeId,
        userId: null,
        assignedBy: null,
        shiftTypeId: null,
        startTime: new Date('1970-01-01T10:00:00.000Z'),
        endTime: new Date('1970-01-01T14:00:00.000Z'),
      },
    });

    // An unassigned shift must produce a validation error.
    const unfilled = await validateSchedule(db, {
      storeId: store.id,
      scheduleId: schedule.id,
    });

    if (
      unfilled.valid ||
      !unfilled.errors.some(
        (issue) =>
          issue.code === 'UNFILLED_ASSIGNMENT' &&
          issue.assignmentId === assignment.id,
      )
    ) {
      throw new Error('Expected an UNFILLED_ASSIGNMENT validation error.');
    }

    console.log('PASS: Unfilled assignment detected.');

    // Find the eligible employee used by the seed.
    const candidates = await getAssignmentEligibility(db, {
      storeId: store.id,
      assignmentId: assignment.id,
    });

    const candidate = candidates.find(
      (employee) => employee.userId === qualification.userId,
    );

    if (!candidate || !candidate.qualified || !candidate.eligible) {
      throw new Error('Expected the qualified employee to be eligible.');
    }

    console.log('PASS: Qualified employee is eligible.');

    // Assign the eligible employee, then validate the schedule again.
    await db.shiftAssignment.update({
      where: { id: assignment.id },
      data: {
        userId: qualification.userId,
        assignedBy: admin.userId,
      },
    });

    const validated = await validateSchedule(db, {
      storeId: store.id,
      scheduleId: schedule.id,
    });

    if (!validated.valid || validated.errors.length !== 0) {
      throw new Error(
        `Expected a valid schedule. Errors: ${JSON.stringify(validated.errors)}`,
      );
    }

    console.log('PASS: Assigned schedule passes validation.');
    console.log('Warnings:', validated.warnings.length);
    console.log('Schedule Builder smoke test passed.');
  } finally {
    // Clean up the temporary schedule and all its assignments and days.
    await deleteSchedule(db, {
      storeId: store.id,
      scheduleId: schedule.id,
    });

    console.log('Temporary schedule deleted.');
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await db.$disconnect();
  });