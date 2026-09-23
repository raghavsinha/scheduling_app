import { WorkType } from '../../domain/work-type.model';

export interface WorkTypeRecord {
  id: string;
  storeId: string;
  name: string;
  description: string | null;
  displayOrder: number;
  archived: boolean;
}

export function mapWorkType(record: WorkTypeRecord): WorkType {
  return {
    id: record.id,
    storeId: record.storeId,
    name: record.name,
    description: record.description,
    displayOrder: record.displayOrder,
    archived: record.archived,
  };
}
