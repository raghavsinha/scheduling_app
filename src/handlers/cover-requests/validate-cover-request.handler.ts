import { CoverRequestType } from '@prisma/client';
import { DatabaseClient } from '../../database/database-client.type';
import { ValidationError } from '../../common/errors/validation.error';
import { availabilitySignals,loadAvailability } from '../schedule-builder/schedule-builder.utils';
import { CoverRequestValidationResult,CoverRequestWarning } from './cover-request.types';
import {assertRequesterOwnsAssignment,getPublishedAssignment,getSameDayAssignments,sameDaySummary,validateActiveStoreUser,validateNoResultingOverlap,validateQualification} from './cover-request.utils';
export interface ValidateCoverRequestInput {storeId:string;shiftAssignmentId:string;requestingUserId:string;requestType:CoverRequestType;coveringUserId?:string;swapAssignmentId?:string;}
export async function validateCoverRequest(db:DatabaseClient,input:ValidateCoverRequestInput):Promise<CoverRequestValidationResult>{
  const reasons:string[]=[]; const warnings:CoverRequestWarning[]=[];
  const source=await getPublishedAssignment(db,input.storeId,input.shiftAssignmentId);
  assertRequesterOwnsAssignment(source.userId,input.requestingUserId);
  await validateActiveStoreUser(db,input.storeId,input.requestingUserId);
  if(!input.coveringUserId){
    if(input.requestType===CoverRequestType.SWAP) reasons.push('A swap requires a specified covering employee.');
    if(input.swapAssignmentId) reasons.push('An open cover cannot specify a swap assignment.');
    return {allowed:reasons.length===0,requiresSwap:false,reasons,warnings,sameDayAssignments:[]};
  }
  if(input.coveringUserId===input.requestingUserId) reasons.push('Requester cannot cover their own shift.');
  await validateQualification(db,input.storeId,input.coveringUserId,source.workTypeId);
  const targetDay=await getSameDayAssignments(db,{storeId:input.storeId,userId:input.coveringUserId,date:source.scheduleDay.date});
  const sameDayAssignments=sameDaySummary(targetDay);
  if(input.requestType===CoverRequestType.COVER){
    if(input.swapAssignmentId) reasons.push('A one-way cover cannot have a swap assignment.');
    if(targetDay.length) reasons.push('Target works another published shift that day. Select a SWAP instead.');
    else {
      try{await validateNoResultingOverlap(db,{storeId:input.storeId,userId:input.coveringUserId,date:source.scheduleDay.date,startTime:source.startTime,endTime:source.endTime});}
      catch(e){if(e instanceof ValidationError)reasons.push(e.message);else throw e;}
    }
  }else{
    if(!input.swapAssignmentId) reasons.push('Select the target employee shift to swap.');
    else if(input.swapAssignmentId===source.id) reasons.push('Cannot swap an assignment with itself.');
    else {
      const other=await getPublishedAssignment(db,input.storeId,input.swapAssignmentId);
      if(other.userId!==input.coveringUserId) reasons.push('Target does not own the proposed swap assignment.');
      await validateQualification(db,input.storeId,input.requestingUserId,other.workTypeId);
      for(const move of [
        {userId:input.coveringUserId,date:source.scheduleDay.date,startTime:source.startTime,endTime:source.endTime},
        {userId:input.requestingUserId,date:other.scheduleDay.date,startTime:other.startTime,endTime:other.endTime},
      ]){
        try{await validateNoResultingOverlap(db,{storeId:input.storeId,...move,excludeIds:[source.id,other.id]});}
        catch(e){if(e instanceof ValidationError)reasons.push(e.message);else throw e;}
      }
    }
  }
  // Availability and preferences are advisory. Missing submissions are treated as unknown.
  const availability=await loadAvailability(db,input.storeId,input.coveringUserId,source.scheduleDay.date);
  const a=availabilitySignals(availability,source.scheduleDay.date,source.startTime,source.endTime,source.scheduleDay.dayOfWeek,source.shiftTypeId);
  if(a.hasSubmission&&!a.available)warnings.push({code:'OUTSIDE_AVAILABILITY',message:'Target employee has not reported availability for this shift.'});
  if(a.hasSubmission&&!a.preferred)warnings.push({code:'NOT_PREFERRED',message:'This shift is outside the target employee preferred shifts.'});
  return {allowed:reasons.length===0,requiresSwap:input.requestType===CoverRequestType.COVER&&targetDay.length>0,reasons,warnings,sameDayAssignments};
}
