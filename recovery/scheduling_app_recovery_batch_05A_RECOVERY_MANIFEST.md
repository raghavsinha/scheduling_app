# Batch 5A — Cover Requests: source modules

**Status:** Reconstructed from the earlier complete handler designs and subsequent corrections preserved in the conversation. Not a verbatim archive. Unit and integration tests are reserved for Batch 5B.

- `src/handlers/cover-requests/cover-request.types.ts`
- `src/handlers/cover-requests/cover-request.mapper.ts`
- `src/handlers/cover-requests/cover-request.utils.ts`
- `src/handlers/cover-requests/validate-cover-request.handler.ts`
- `src/handlers/cover-requests/create-cover-request.handler.ts`
- `src/handlers/cover-requests/get-cover-request.handler.ts`
- `src/handlers/cover-requests/list-cover-requests.handler.ts`
- `src/handlers/cover-requests/accept-cover-request.handler.ts`
- `src/handlers/cover-requests/decline-cover-request.handler.ts`
- `src/handlers/cover-requests/redirect-cover-request.handler.ts`
- `src/handlers/cover-requests/make-cover-request-open.handler.ts`
- `src/handlers/cover-requests/cancel-cover-request.handler.ts`

Preserves published-only source shifts, mandatory same-day swaps, qualification and overlap checks on both sides, advisory availability and preference warnings, redirects and conversion to open, state-transition events and conditional state updates. Includes current User email/phone fields and explicit CoverRequestStatus[] arrays to avoid TypeScript enum `.includes` errors.

**Outstanding:** End-to-end concurrency guarantees (simultaneous request creation and reassignment to other requests), TypeScript/Jest/PostgreSQL validation against the final merged project, and test recovery in Batch 5B. No claim of production concurrency safety is made. Cross-module dependencies include `src/handlers/schedule-builder/schedule-builder.utils.ts` from Batch 4C.
