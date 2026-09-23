import { ISOTimestamp, UUID } from './common.types';

export interface User {
  id: UUID;
  username: string;
  name: string;
  email: string;
  phoneNumber: string | null;
  createdAt: ISOTimestamp;
}
