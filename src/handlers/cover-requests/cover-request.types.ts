import { CoverRequestStatus, CoverRequestType } from '@prisma/client';
export interface CoverRequestWarning { code:'OUTSIDE_AVAILABILITY'|'NOT_PREFERRED'; message:string; }
export interface SameDayAssignmentSummary { id:string; date:string; startTime:string; endTime:string; workTypeId:string; shiftTypeId:string|null; }
export interface CoverRequestValidationResult { allowed:boolean; requiresSwap:boolean; reasons:string[]; warnings:CoverRequestWarning[]; sameDayAssignments:SameDayAssignmentSummary[]; }
export interface CoverRequestView {
  id:string; storeId:string; requestType:CoverRequestType; shiftAssignmentId:string; swapAssignmentId:string|null;
  requestingUserId:string; coveringUserId:string|null; status:CoverRequestStatus; createdAt:string; resolvedAt:string|null;
  requester:{id:string;name:string;username:string;email:string;phoneNumber:string|null};
  coveringUser:{id:string;name:string;username:string;email:string;phoneNumber:string|null}|null;
  events:Array<{id:string;actorUserId:string;eventType:string;createdAt:string}>;
}
