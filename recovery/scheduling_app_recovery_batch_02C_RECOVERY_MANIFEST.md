# Recovery batch 2C — Work Types

Files: create/get/list/update/delete work-type handlers, mapper, Jest test suite and isolated PostgreSQL smoke test.

**Source classification:** Reconstructed, not verbatim recovered. Searches of available conversation attachments found the established `WorkType` Prisma/domain model and references from StoreUser qualification tests, but not full original Work Types handler files. This package reproduces those known fields and common module conventions.

**Behavior:** Store-scoped name uniqueness, active-first listing ordered by `displayOrder` and name, optional archived listing, soft archive instead of hard deletion (preserves qualifications/templates/assignment references), normalized input.

**Integration note:** Batch 1 has `src/domain/work-type.model.ts`, `DatabaseClient` and errors; this ZIP adds just module-specific files. Merge its `src` directory into Batch 1. Confirm handler input names against any recovered original caller code during final assembly.

**Validation:** ZIP integrity and file inventory checked. Compilation/Jest/DB smoke test NOT run; Prisma dependencies and PostgreSQL not installed in this packaging environment.
