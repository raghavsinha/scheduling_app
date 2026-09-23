import { Prisma } from '@prisma/client';
import { WeeklyTemplate } from '../../domain/weekly-template.model';
import { DayType } from '../../domain/common.types';

export const weeklyTemplateInclude = {
  requirements: { orderBy: [{ dayOfWeek: 'asc' }, { shiftTypeId: 'asc' }, { workTypeId: 'asc' }] },
} satisfies Prisma.WeeklyTemplateInclude;

export function mapWeeklyTemplate(record: Prisma.WeeklyTemplateGetPayload<{include: typeof weeklyTemplateInclude}>): WeeklyTemplate {
  return {
    id: record.id,
    storeId: record.storeId,
    name: record.name,
    isDefault: record.isDefault,
    archived: record.archived,
    requirements: record.requirements.map(r => ({
      id: r.id,
      dayOfWeek: r.dayOfWeek as DayType,
      shiftTypeId: r.shiftTypeId,
      workTypeId: r.workTypeId,
      requiredCount: r.requiredCount,
    })),
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
  };
}
