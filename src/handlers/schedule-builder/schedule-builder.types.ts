import { Schedule } from '../../domain/schedule.model';

export type EligibilityReason = 'NOT_ACTIVE_MEMBER' | 'NOT_QUALIFIED' | 'OUTSIDE_AVAILABILITY' | 'OVERLAPPING_ASSIGNMENT';
export interface EligibilityCandidate {
  userId: string;
  name: string;
  username: string;
  email: string;
  phoneNumber: string | null;
  qualified: boolean;
  available: boolean;
  preferred: boolean;
  overlapping: boolean;
  eligible: boolean;
  reasons: EligibilityReason[];
}
export interface ScheduleBuilderView {
  schedule: Schedule;
  employees: Array<{userId:string;name:string;username:string;email:string;phoneNumber:string|null;userType:'ADMIN'|'EMPLOYEE'}>;
}
export interface ScheduleValidationIssue {
  code: 'UNFILLED_ASSIGNMENT'|'EMPLOYEE_NOT_ACTIVE'|'EMPLOYEE_NOT_QUALIFIED'|'OVERLAPPING_ASSIGNMENTS'|'OUTSIDE_AVAILABILITY'|'EMPLOYEE_NOT_PREFERRED';
  level: 'ERROR'|'WARNING';
  message: string;
  assignmentId: string;
  userId: string | null;
}
export interface ScheduleValidationResult { valid: boolean; errors: ScheduleValidationIssue[]; warnings: ScheduleValidationIssue[]; }
