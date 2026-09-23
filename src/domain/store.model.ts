import { ISOTimestamp, UUID } from './common.types';

export interface Store {
  id: UUID;
  name: string;
  ownerUserId: UUID;
  createdAt: ISOTimestamp;
}
