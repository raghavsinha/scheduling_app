# Batch 4B — Shift Assignments

All files in this package were **reconstructed** from the preserved business rules, prior handler signatures, recovered domain model, Prisma schema, and Batch 4A schedule mapper. Verbatim original assignment handler files were not available as independent uploaded sources.

## Contents

- `src/handlers/assignments/assignment.mapper.ts`
- `src/handlers/assignments/assignment-validation.utils.ts`
- `src/handlers/assignments/create-assignment.handler.ts`
- `src/handlers/assignments/get-assignment.handler.ts`
- `src/handlers/assignments/update-assignment.handler.ts`
- `src/handlers/assignments/delete-assignment.handler.ts`
- `src/handlers/assignments/assignments.spec.ts`
- `src/dev/test-assignments.ts`

## Recovered requirements

Draft-only edits; active admin actor; optional unassigned employee, nullable shift type; active store work-type and shift-type checks; qualification of assigned employees; same-schedule, same-day interval-overlap rejection; refusal to delete an assignment referenced by a cover/swap request. Cover/swap mutations to published schedules are handled separately by Batch 5, not these handlers.

## Validation status

ZIP integrity and file inventory verified. TypeScript/Jest/PostgreSQL integration validation has not yet passed against the final merged project. The smoke test creates a draft schedule in 2035 and deletes the records it creates; run only on a development database.
