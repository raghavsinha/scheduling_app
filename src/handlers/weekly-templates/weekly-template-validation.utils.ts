import { DayType } from '@prisma/client';
import { DatabaseClient } from '../../database/database-client.type';
import { ValidationError } from '../../common/errors/validation.error';

export interface WeeklyRequirementInput {
  dayOfWeek: DayType;
  shiftTypeId: string;
  workTypeId: string;
  requiredCount: number;
}

export function validateRequirements(requirements: WeeklyRequirementInput[]): void {
  const seen = new Set<string>();
  for (const r of requirements) {
    if (!Object.values(DayType).includes(r.dayOfWeek)) {
      throw new ValidationError('Invalid day of week.');
    }
    if (!Number.isInteger(r.requiredCount) || r.requiredCount < 0) {
      throw new ValidationError('Required count must be a nonnegative integer.');
    }
    const key = `${r.dayOfWeek}:${r.shiftTypeId}:${r.workTypeId}`;
    if (seen.has(key)) throw new ValidationError('Duplicate weekly requirement.');
    seen.add(key);
  }
}

export async function validateRequirementReferences(db: DatabaseClient, storeId: string, requirements: WeeklyRequirementInput[]): Promise<void> {
  const shiftTypeIds = [...new Set(requirements.map(r => r.shiftTypeId))];
  const workTypeIds = [...new Set(requirements.map(r => r.workTypeId))];
  if (shiftTypeIds.length) {
    const count = await db.shiftType.count({where:{storeId, archived:false, id:{in:shiftTypeIds}}});
    if (count !== shiftTypeIds.length) throw new ValidationError('Requirements reference missing, archived, or other-store shift types.');
  }
  if (workTypeIds.length) {
    const count = await db.workType.count({where:{storeId, archived:false, id:{in:workTypeIds}}});
    if (count !== workTypeIds.length) throw new ValidationError('Requirements reference missing, archived, or other-store work types.');
  }
}
