# Batch 2D — Shift Types

**Source status:** Reconstructed from the recovered final Prisma `ShiftType` and `ShiftTypeDayTime` schema, domain model, and prior module behavior. Exact final original shift-type handler/test source was not independently retrieved. Do not mistake this for a byte-for-byte restoration.

**Included:** six handler/mapper/validation files, one Jest spec, one real-database smoke test, and this manifest.

**Behavior:** Store-scoped names, day-of-week time rules, HH:mm inputs, one rule per weekday, validation of start/end, transactional replacement of weekday times, soft archive preserving historic references.

**Implementation choice requiring review:** Day-time edits use full replacement, not partial merge. Overnight shifts are rejected (end must be later than start on same day). Previous original behavior not independently verified.

**Validation:** Source files and ZIP integrity checked during packaging. Full TypeScript/Jest/DB testing needs the assembled project and working dependencies/PostgreSQL. Run `npx prisma generate`, `npx tsc --noEmit`, `npm test -- shift-types`, `npx tsx src/dev/test-shift-types.ts`.
