# Batch 2E — Weekly Templates

All handler and test files are **reconstructed**, not verbatim recovery. The available conversation attachments and previously recovered project foundation established the Prisma relations and domain shapes but did not expose a complete final version of the weekly-template module.

Contents:
- create/get/list/update/delete weekly-template handlers
- shared mapper and requirement validation utilities
- Jest unit tests and seeded-DB smoke test

Reconstruction decisions requiring confirmation against the original chat export: one default per store (cleared transactionally); duplicate requirement combinations rejected; replacing requirements on update; archive rather than hard-delete; disallow archiving the default template; nonnegative integer requirement count.

Validation performed: ZIP integrity and file inventory. TypeScript, Prisma generation, Jest, and database smoke tests were not run in this batch; perform these after merging with Batch 1 and the other recovered batches.
