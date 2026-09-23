# Batch 5B — Cover Request tests

- `src/handlers/cover-requests/cover-requests.spec.ts` — reconstructed from tests previously supplied in the chat, adjusted to Batch 5A conditional `updateMany` status claims, the shared schedule-builder availability helpers, and current email/phone fields.
- `src/dev/test-cover-requests.ts` — reconstructed PostgreSQL smoke test using isolated 2032 test shifts and a `finally` cleanup. Exercises decline, opening, one-way acceptance, same-day swap, and event persistence.

## Known constraints

- Two active non-admin employees sharing a work-type qualification are required in the seeded database; otherwise the smoke test fails with a clear error.
- These files depend on Batches 1, 4C and 5A. Merge before compilation/tests.
- No TypeScript, Jest or live Postgres run is claimed for this standalone test-only package. The ZIP CRC integrity is checked. Final end-to-end validation is reserved for Batch 6.
- The Jest suite uses some broad Prisma mocks and may need small adjustments to the final generated Prisma types. This does not imply the underlying handlers are production concurrency-safe.
