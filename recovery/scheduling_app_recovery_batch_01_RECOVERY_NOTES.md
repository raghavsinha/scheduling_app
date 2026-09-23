# Recovery batch 01: foundation

- `prisma/schema.prisma` was based on the user's pasted Prisma source, with later corrections applied: User email and phone; schedule aggregate; correct schedule relations; `@@unique([scheduleId, weekStartDate])`; cover swap type, second assignment, and inverse relations.
- Prisma seed, build configuration and domain models have been reconstructed from the conversation's documented architecture. They are not byte-identical to every original local file.
- The seed contains placeholder password hashes and is for database testing only, **not** authenticated login.
- Prisma migration history and an original package lock were not preserved in recovered sources. Generate a baseline migration in a fresh database; do not claim this reproduces lost historical migration files.
- Handler modules and their Jest/DB smoke tests are reserved for batches 02–05.
- A full compile/test of the completed project requires all later batches; foundation-level Prisma validation is independently useful.
