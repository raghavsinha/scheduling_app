import { UUID } from './common.types';

export interface WorkType {
  id: UUID;
  storeId: UUID;
  name: string;
  description: string | null;
  displayOrder: number;
  archived: boolean;
}
