import { DayType, Prisma } from '@prisma/client';
import { ValidationError } from '../../common/errors/validation.error';

const DAYS = [
  DayType.MONDAY, DayType.TUESDAY, DayType.WEDNESDAY,
  DayType.THURSDAY, DayType.FRIDAY, DayType.SATURDAY, DayType.SUNDAY,
] as const;

export interface GenerateScheduleWeekInput {
  storeId: string;
  scheduleId: string;
  weekStartDate: Date;
  weeklyTemplateId: string | null;
}

export async function createScheduleWeekInternal(
  db: Prisma.TransactionClient,
  input: GenerateScheduleWeekInput,
): Promise<string> {
  const week = await db.scheduleWeek.create({
    data: {
      storeId: input.storeId,
      scheduleId: input.scheduleId,
      weekStartDate: input.weekStartDate,
      weeklyTemplateId: input.weeklyTemplateId,
    },
  });

  const requirements = input.weeklyTemplateId
    ? await db.weekShiftRequirement.findMany({
        where: {
          weeklyTemplateId: input.weeklyTemplateId,
          storeId: input.storeId,
        },
      })
    : [];
  const shiftTypeIds = [...new Set(requirements.map((r) => r.shiftTypeId))];
  const shiftTimes = shiftTypeIds.length
    ? await db.shiftTypeDayTime.findMany({
        where: {
          storeId: input.storeId,
          shiftTypeId: { in: shiftTypeIds },
        },
      })
    : [];

  // Prevalidate the template before creating concrete days or slots.
  for (const requirement of requirements) {
    if (!Number.isInteger(requirement.requiredCount) || requirement.requiredCount < 0) {
      throw new ValidationError('Invalid shift requirement count.');
    }
    if (requirement.requiredCount > 0 && !shiftTimes.some(
      (t) => t.shiftTypeId === requirement.shiftTypeId &&
             t.dayOfWeek === requirement.dayOfWeek &&
             t.startTime.getTime() < t.endTime.getTime(),
    )) {
      throw new ValidationError(
        `Shift type has no valid time for ${requirement.dayOfWeek}.`,
      );
    }
  }

  for (let index = 0; index < 7; index += 1) {
    const date = new Date(input.weekStartDate);
    date.setUTCDate(date.getUTCDate() + index);
    const dayOfWeek = DAYS[index];
    const day = await db.scheduleDay.create({
      data: {
        storeId: input.storeId,
        scheduleWeekId: week.id,
        date,
        dayOfWeek,
      },
    });

    const slots: Prisma.ShiftAssignmentCreateManyInput[] = [];
    for (const requirement of requirements.filter((r) => r.dayOfWeek === dayOfWeek)) {
      const shiftTime = shiftTimes.find(
        (t) => t.shiftTypeId === requirement.shiftTypeId &&
               t.dayOfWeek === dayOfWeek,
      );
      if (requirement.requiredCount === 0) continue;
      if (!shiftTime) throw new ValidationError('Missing shift type time.');
      for (let count = 0; count < requirement.requiredCount; count += 1) {
        slots.push({
          storeId: input.storeId,
          scheduleDayId: day.id,
          userId: null,
          workTypeId: requirement.workTypeId,
          shiftTypeId: requirement.shiftTypeId,
          startTime: shiftTime.startTime,
          endTime: shiftTime.endTime,
          assignedBy: null,
        });
      }
    }
    if (slots.length) await db.shiftAssignment.createMany({ data: slots });
  }
  return week.id;
}
