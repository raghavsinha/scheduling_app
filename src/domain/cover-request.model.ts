import { ISOTimestamp, UUID } from './common.types';
export type CoverRequestType = 'COVER' | 'SWAP';
export type CoverRequestStatus = 'OPEN' | 'PENDING_USER' | 'PENDING_ADMIN' | 'ACCEPTED' | 'DECLINED' | 'CANCELLED' | 'EXPIRED';
export interface CoverRequestEvent {
  id: UUID;
  coverRequestId: UUID;
  actorUserId: UUID;
  eventType: string;
  createdAt: ISOTimestamp;
}
export interface CoverRequest {
  id: UUID;
  storeId: UUID;
  shiftAssignmentId: UUID;
  swapAssignmentId: UUID | null;
  requestingUserId: UUID;
  coveringUserId: UUID | null;
  requestType: CoverRequestType;
  status: CoverRequestStatus;
  createdAt: ISOTimestamp;
  resolvedAt: ISOTimestamp | null;
  events: CoverRequestEvent[];
}
