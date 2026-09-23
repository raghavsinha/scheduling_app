# Batch 4C — Schedule Builder

Status: RECONSTRUCTED. Full original Schedule Builder sources were not retrievable from the conversation's currently available attachments. This implementation follows recorded behavior: schedule and member listing, candidate qualification, same-schedule same-day overlap checking, submitted availability and preference warnings, and validation of unfilled/unqualified/inactive/overlapping assignments.

Files: 7 TypeScript files and this manifest.

Important limitations to verify during final integration:
- This reconstruction considers submitted availability advisory, with no submission treated as unknown/non-blocking.
- The overlap check operates within the selected schedule, matching the recorded Assignment handler convention.
- The builder's exact historic output shape is unknown; API contracts reconstructed here should be reconciled with original source if recovered.
- `getScheduleBuilder` returns the schedule and active employee/admin memberships but not a precomputed eligibility grid.
- A standalone Postgres smoke test is provided, not executed here.

Run after merging all batches: `npx prisma generate`, `npx tsc --noEmit`, `npm test`, `npx tsx src/dev/test-schedule-builder.ts`.
