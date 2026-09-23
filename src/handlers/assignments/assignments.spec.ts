import { UserType, ScheduleStatus } from '@prisma/client';
import { createMockDatabase } from '../../test/database.mock';
import { ValidationError } from '../../common/errors/validation.error';
import { ConflictError } from '../../common/errors/conflict.error';
import { createAssignment } from './create-assignment.handler';
import { updateAssignment } from './update-assignment.handler';
import { deleteAssignment } from './delete-assignment.handler';

const at = (h: string) => new Date(`1970-01-01T${h}:00.000Z`);
const day = { id:'day',storeId:'store',date:new Date('2035-09-03T00:00:00Z'),
  scheduleWeek:{scheduleId:'schedule',schedule:{status:ScheduleStatus.DRAFT}} };
const membership={storeId:'store',userId:'admin',userType:UserType.ADMIN,archivedAt:null};
const assignment={id:'assignment',storeId:'store',scheduleDayId:'day',userId:'employee',workTypeId:'work',shiftTypeId:null,startTime:at('10:00'),endTime:at('14:00')};

describe('Assignment handlers',()=>{
  let db: ReturnType<typeof createMockDatabase>;
  beforeEach(()=>{
    db=createMockDatabase();
    db.scheduleDay.findFirst.mockResolvedValue(day as any);
    db.storeUser.findUnique.mockResolvedValue(membership as any);
    db.workType.findFirst.mockResolvedValue({id:'work'} as any);
    db.storeUserWorkType.findFirst.mockResolvedValue({userId:'employee'} as any);
    db.shiftAssignment.findFirst.mockResolvedValue(null);
  });
  it('creates an unassigned shift slot',async()=>{
    db.shiftAssignment.create.mockResolvedValue({ ...assignment, userId:null,
      workType:{id:'work',storeId:'store',name:'Teamaker',description:null,displayOrder:0,archived:false},shiftType:null,
      assignedBy:'admin',createdAt:new Date(),updatedAt:new Date()} as any);
    const a=await createAssignment(db,{storeId:'store',scheduleDayId:'day',actorUserId:'admin',workTypeId:'work',startTime:'10:00',endTime:'14:00'});
    expect(a.userId).toBeNull();
    expect(db.storeUserWorkType.findFirst).not.toHaveBeenCalled();
  });
  it('rejects overlap for assigned employees',async()=>{
    db.storeUser.findUnique.mockResolvedValueOnce(membership as any).mockResolvedValueOnce({ ...membership,userId:'employee',userType:UserType.EMPLOYEE} as any);
    db.shiftAssignment.findFirst.mockResolvedValue({id:'other'} as any);
    await expect(createAssignment(db,{storeId:'store',scheduleDayId:'day',actorUserId:'admin',userId:'employee',workTypeId:'work',startTime:'10:00',endTime:'14:00'})).rejects.toBeInstanceOf(ValidationError);
  });
  it('blocks draft-handler editing of a published schedule',async()=>{
    db.shiftAssignment.findFirst.mockResolvedValue(assignment as any);
    db.scheduleDay.findFirst.mockResolvedValue({...day,scheduleWeek:{...day.scheduleWeek,schedule:{status:ScheduleStatus.PUBLISHED}}} as any);
    await expect(updateAssignment(db,{storeId:'store',assignmentId:'assignment',actorUserId:'admin',userId:null})).rejects.toBeInstanceOf(ValidationError);
  });
  it('refuses deletion if a cover request references assignment',async()=>{
    db.shiftAssignment.findFirst.mockResolvedValue(assignment as any);
    db.coverRequest.findFirst.mockResolvedValue({id:'cover'} as any);
    await expect(deleteAssignment(db,{storeId:'store',assignmentId:'assignment',actorUserId:'admin'})).rejects.toBeInstanceOf(ConflictError);
    expect(db.shiftAssignment.delete).not.toHaveBeenCalled();
  });
});
