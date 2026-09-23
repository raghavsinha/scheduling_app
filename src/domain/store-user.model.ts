import { ISOTimestamp, UUID } from './common.types';
import { User } from './user.model';
import { WorkType } from './work-type.model';
export type UserType = 'ADMIN' | 'EMPLOYEE';
export interface StoreUser {
  storeId: UUID;
  userId: UUID;
  userType: UserType;
  joinedAt: ISOTimestamp;
  archivedAt: ISOTimestamp | null;
  user: User;
  workTypes: WorkType[];
}
