# Batch 6: integration and recovery report

## Inputs

All 13 ZIP files extracted from the user-uploaded `scheduling_app.zip`, merged by relative project path. Each batch's original manifest is preserved in `recovery/`.

## Integration repairs

- Normalized the different internal ZIP prefixes into one `scheduling_app/` directory.
- Verified no conflicting overwrite of identically named source files across batches.
- Restored missing shared handler utilities (`src/handlers/shared.ts`) for store membership, dates, and times. Six imports depended on this module.
- Updated the demo seed so **Bob and David**, two non-admin employees, share the Teamaker qualification. This satisfies the cover/swap smoke test's fixture requirement.
- Changed demo seed to generate a real Argon2 password hash and added `argon2` dependency. **Development-only password: `password123`; never use this seed against production.**
- Retained all individual recovery manifests and the source provenance inventory.

## Checks performed

- 13 individual ZIP archives were extracted successfully.
- All relative TypeScript imports resolve to a file or directory within the merged source tree.
- All TypeScript source files passed the TypeScript parser syntax check.
- ZIP archive integrity check passed.

## Checks **not** performed

**This is an integrated recovery checkpoint, not a verified passing build.** Dependency installation failed because npm registry DNS was unavailable (`EAI_AGAIN`). Consequently, Prisma validation/generation, `tsc --noEmit`, Jest tests, and database smoke tests could **not** be executed. PostgreSQL was also unavailable in the recovery environment. There may be cross-module type, Prisma query, or runtime failures still to resolve.

## Known limitations requiring follow-up

- No historical Prisma migration directory or original `package-lock.json` was recoverable. Create an initial baseline migration **only against a new/empty database**; do not apply it to an existing production database.
- Several batches are reconstructed, not verbatim originals. Their original recovery manifests distinguish reconstructed behavior and remaining assumptions.
- Full concurrent cover request creation and simultaneous reassignment remain unproven. Do not deploy without concurrency testing and appropriate database locking/uniqueness protections.
- No HTTP/authentication/controller layer has been implemented in this recovered source.
- The demo seed is not intended for production; change credentials and use real user onboarding when authentication is implemented.

## Windows / PowerShell setup

```powershell
Copy-Item .env.example .env
# Review DATABASE_URL inside .env.
docker compose up -d
npm install
npx prisma validate
# The next command must target a NEW EMPTY local database.
npx prisma migrate dev --name recovered_baseline
npx prisma generate
npx prisma db seed
npx tsc --noEmit
npm test
npx tsx src/dev/test-store-users.ts
npx tsx src/dev/test-cover-requests.ts
```

If checks fail, preserve the error output and resolve the issues in the recovered project before starting the HTTP/auth layer.
