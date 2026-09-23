# Batch 4A — Schedules

Recovered from previously assembled working-directory schedule files; reformatted and reconciled with the current Prisma schema and domain types. **Reconstructed**, not claimed verbatim original source.

- Seven concrete days generated for every Monday-based schedule week.
- Template requirements create unassigned, concrete shift slots.
- Schedule aggregates may contain multiple weeks.
- Draft-only add/remove/delete, admin-only creation/publishing.
- Cover-request FK checks before destructive deletion.
- Unit tests and destructive-cleanup integration smoke test included.

Validation: ZIP integrity and file inventory checked. End-to-end TypeScript, Jest and PostgreSQL smoke tests require merging with all dependencies and are not claimed to have passed.

Note: Reconstructed integration smoke test uses isolated September 2035 dates and restores no preexisting seeded records. Do not run against production.
