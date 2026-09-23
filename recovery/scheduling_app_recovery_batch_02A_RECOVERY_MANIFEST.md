# Batch 2A — Stores

This is an **incremental package**. Merge its `src/` into the project foundation from Batch 1.

## Source provenance

- `src/handlers/stores/*.ts`: **RECONSTRUCTED**, not verbatim recovery. Prior discussion confirms these file names and the store model, but the full final original stores handler source was not accessible in the retrieved conversation/files.
- `src/handlers/stores/stores.spec.ts`: **RECONSTRUCTED** from the documented Store model and handler behavior; not original exact test code.
- `src/dev/test-stores.ts`: **RECONSTRUCTED** for a disposable store and owner; not original exact smoke test.

## Assumptions to revisit if the original source is found

- `createStore` creates the owner's ADMIN membership in one transaction.
- `listStores` lists owned stores and active memberships.
- Renaming and deletion require the owner, while reading is transport-agnostic (HTTP authorization belongs in the future auth layer).
- Deletion refuses populated stores rather than cascading data loss.
- The original code's exact input field names and delete behavior could differ; these choices are not represented as verbatim recovered decisions.

## Validation

Check `npx prisma generate`, `npx tsc --noEmit`, `npx jest src/handlers/stores/stores.spec.ts --runInBand` and `npx tsx src/dev/test-stores.ts` after combining with Batch 1 and installing dependencies. This environment currently lacks the npm package cache needed to install dependencies, so passing compilation/DB testing has not been claimed.
