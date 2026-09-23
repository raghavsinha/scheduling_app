# Batch 3B — User Availability

**Classification: reconstructed.** Complete original source for this module could not be recovered from available conversation attachments. This implementation uses the recovered Batch 1 Prisma schema (`UserAvailability.dayAvailability`, `shiftPreferences`) and domain models and the Batch 3A Availability Period utilities. These files must not be represented as verbatim originals.

## Included
- submit/get/list/delete user availability handlers
- mapped daily time ranges and weekday shift preferences
- shared validation and Prisma mapper
- Jest tests and real-database smoke test

## Semantics and assumptions
- An active store member may submit to an open availability period. Auth/actor enforcement belongs to the later HTTP layer.
- TIME-mode periods accept dated time ranges, and SHIFT-mode periods accept weekday shift-type preferences.
- Submitted ranges must fall within the period and may not overlap for a date.
- SHIFT preferences must reference unarchived types configured on the requested weekdays.
- Submitting again atomically replaces the previous days and preferences. Omitting fields clears them, including preferredNumShifts.
- Deleting is allowed only while the period is open; submission deletion removes child rows before parent.
- Multiple same-day time ranges are supported.

## Validation
- Python ZIP/file integrity and file presence verified.
- TypeScript, Jest, and live PostgreSQL tests were not executed at packaging. Run after merging Batches 1 and 3A:
  npx prisma generate
  npx tsc --noEmit
  npx jest src/handlers/user-availability/user-availability.spec.ts --runInBand
  npx tsx src/dev/test-user-availability.ts

## Source caveats
- Exact original handler names and update semantics were not retrievable; this package uses the reconstructed module path `user-availability`.
- `shiftTypeDayTime` must remain a model in the recovered Prisma schema.
