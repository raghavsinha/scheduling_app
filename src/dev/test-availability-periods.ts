import 'dotenv/config';
import { AvailabilityEntryMode } from '@prisma/client';
import { prisma } from '../database/prisma.client';
import { createAvailabilityPeriod } from '../handlers/availability-periods/create-availability-period.handler';
import { getAvailabilityPeriod } from '../handlers/availability-periods/get-availability-period.handler';
import { listAvailabilityPeriods } from '../handlers/availability-periods/list-availability-periods.handler';
import { closeAvailabilityPeriod } from '../handlers/availability-periods/close-availability-period.handler';
import { openAvailabilityPeriod } from '../handlers/availability-periods/open-availability-period.handler';
import { deleteAvailabilityPeriod } from '../handlers/availability-periods/delete-availability-period.handler';

async function main() {
  const store = await prisma.store.findFirst({where: {name:'Sample Tea Shop'}});
  if (!store) throw new Error('Seed Sample Tea Shop first.');
  // Select a far-future nonoverlapping week without modifying existing data.
  const existing = await prisma.availabilityPeriod.findMany({where:{storeId:store.id},select:{startDate:true,endDate:true}});
  let start = Date.UTC(2040,0,2);
  while (existing.some(x=>x.startDate.getTime() <= start+6*86400000 && x.endDate.getTime() >= start)) start += 14*86400000;
  const startDate = new Date(start).toISOString().slice(0,10);
  const endDate = new Date(start+6*86400000).toISOString().slice(0,10);
  let id: string | null = null;
  try {
    const period = await createAvailabilityPeriod(prisma,{storeId:store.id,startDate,endDate,entryMode:AvailabilityEntryMode.TIME});
    id=period.id;
    if ((await getAvailabilityPeriod(prisma,{storeId:store.id,availabilityPeriodId:id})).id !== id) throw new Error('Get failed');
    if (!(await listAvailabilityPeriods(prisma,{storeId:store.id})).some(p=>p.id===id)) throw new Error('List failed');
    if ((await closeAvailabilityPeriod(prisma,{storeId:store.id,availabilityPeriodId:id})).isOpen) throw new Error('Close failed');
    if (!(await openAvailabilityPeriod(prisma,{storeId:store.id,availabilityPeriodId:id})).isOpen) throw new Error('Open failed');
    console.log('Availability period DB smoke test passed.');
  } finally {
    if (id) await deleteAvailabilityPeriod(prisma,{storeId:store.id,availabilityPeriodId:id});
  }
}
main().catch(err=>{console.error(err);process.exitCode=1;}).finally(()=>prisma.$disconnect());
