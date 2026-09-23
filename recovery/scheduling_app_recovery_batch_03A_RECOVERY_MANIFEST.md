# Batch 3A — Availability Periods

**Classification: reconstructed.** The full original availability-period handler source was not retrievable from the searchable conversation attachments. These files are reconstructed against the recovered Batch 1 `AvailabilityPeriod` Prisma and domain definitions and the scheduling project's agreed date-range and open/close behaviors. They are not represented as verbatim recovery.

## Included
- 7 handlers (create/get/list/update/open/close/delete)
- shared date and store lookup utilities
- domain mapper
- Jest tests
- real-database smoke test (restores initial state)

## Behaviors and assumptions
- Period `startDate` and `endDate` inclusive calendar dates (`YYYY-MM-DD`).
- Overlapping store periods rejected by handlers; exact duplicate is also constrained by Prisma schema.
- `isOpen` controls submissions and can be toggled even if submissions exist.
- Once user submissions exist, date-range and entry-mode changes are rejected; deleting is rejected.
- **Concurrent overlapping period creation is not protected by a database exclusion constraint.** Add one before production if parallel administrative edits are possible.
- Access control is a future HTTP/auth layer responsibility; handlers do not yet validate an authenticated admin actor.

## Integration
Extract ZIP into project root **after Batch 1**. All paths in this ZIP are new; do not replace the existing domain model or Prisma schema.

## Tests
`npx prisma generate`
`npx tsc --noEmit`
`npx jest src/handlers/availability-periods/availability-periods.spec.ts --runInBand`
`npx tsx src/dev/test-availability-periods.ts`

At packaging, ZIP integrity and file presence verified; runtime TypeScript/Jest/database tests not executed.
