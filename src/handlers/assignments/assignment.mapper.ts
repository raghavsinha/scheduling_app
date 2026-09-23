import { Prisma } from '@prisma/client';
import { ShiftAssignment } from '../../domain/schedule.model';
import { localTime } from '../shared';
import { mapShiftType } from '../shift-types/shift-type.mapper';

export const assignmentInclude = Prisma.validator<Prisma.ShiftAssignmentInclude>()({
  workType: true,
  shiftType: { include: { dayTimes: true } },
});
export type AssignmentRecord = Prisma.ShiftAssignmentGetPayload<{ include: typeof assignmentInclude }>;
export function mapAssignment(a: AssignmentRecord): ShiftAssignment {
  return {
    id: a.id, userId: a.userId,
    workType: {
      id: a.workType.id, storeId: a.workType.storeId,
      name: a.workType.name, description: a.workType.description,
      displayOrder: a.workType.displayOrder, archived: a.workType.archived,
    },
    shiftType: a.shiftType ? mapShiftType(a.shiftType) : null,
    startTime: localTime(a.startTime), endTime: localTime(a.endTime),
    assignedBy: a.assignedBy,
    createdAt: a.createdAt.toISOString(), updatedAt: a.updatedAt.toISOString(),
  };
}
