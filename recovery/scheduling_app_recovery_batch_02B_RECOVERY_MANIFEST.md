# Recovery Batch 2B — Store Users and Qualifications

## Files

- `src/handlers/store-users/add-store-user.handler.ts`
  - Recovered from prior conversation source.
  - Corrected to use `store-user.model.ts` and shared mapper include.
- `src/handlers/store-users/get-store-user.handler.ts`
  - Reconstructed from recovered tests and established handler behavior.
- `src/handlers/store-users/list-store-users.handler.ts`
  - Reconstructed from recovered tests and established handler behavior.
- `src/handlers/store-users/update-store-user.handler.ts`
  - Reconstructed from recovered tests and established owner/admin rules.
- `src/handlers/store-users/remove-store-user.handler.ts`
  - Reconstructed from recovered tests and established archive semantics.
- `src/handlers/store-users/set-store-user-work-types.handler.ts`
  - Reconstructed from recovered tests and qualification behavior.
- `src/handlers/store-users/store-user.mapper.ts`
  - Recovered and corrected for the final User contact fields and current domain split.
- `src/handlers/store-users/store-users.spec.ts`
  - Recovered and corrected for `email` and `phoneNumber`.
- `src/dev/test-store-users.ts`
  - Reconstructed integration smoke test.

## Corrections preserved

- `User.email`
- `User.phoneNumber`
- `StoreUser.userId`
- qualifications remain persisted in `StoreUserWorkType`
- store owners cannot be demoted from ADMIN
- store owners cannot be archived from membership
- membership removal is soft archive via `archivedAt`
- work type replacement validates that every supplied work type belongs to the store
- store-user mapping uses the current separated `store-user.model.ts`

## Validation status

The package was assembled against the recovered Batch 1 domain and Prisma shapes.
It should be validated again as part of final assembly with:
- `npx prisma generate`
- `npx tsc --noEmit`
- `npm test`
- `npx tsx src/dev/test-store-users.ts`
