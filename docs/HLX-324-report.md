# HLX-324 — Gateway reconnect/log spam on auth token mismatch

## Root cause

`AUTH_TOKEN_MISMATCH` was defined in `ConnectErrorDetailCodes` but missing from
`NON_RETRYABLE_ERROR_CODES` (`src/lib/websocket-utils.ts`). That made
`isNonRetryableGatewayError` classify a token-mismatch handshake error as
retryable, so `nonRetryableErrorRef` never got set, the `onclose` handler in
`src/lib/websocket.ts` kept scheduling reconnects (up to `maxReconnectAttempts`
with exponential backoff), and each attempt logged a fresh
`error-${Date.now()}` entry (unique id ⇒ no dedupe) — reconnect storm + log
spam.

## Fixes (TDD, one file each)

1. **`src/lib/websocket-utils.ts`** — added `ConnectErrorDetailCodes.AUTH_TOKEN_MISMATCH`
   to `NON_RETRYABLE_ERROR_CODES`. This is the actual root-cause fix: it makes
   `isNonRetryableGatewayError` return `true`, which sets `nonRetryableErrorRef`
   and short-circuits the reconnect loop in `onclose`/`onerror` after the first
   attempt.
2. **`src/lib/websocket.ts`** — added `'token mismatch'` to the string-match
   fallback in `isNonRetryableGatewayError`, for older gateways that send a
   plain-text message without a structured `details.code`.
3. **`src/lib/websocket.ts`** — reused the existing `shouldSuppressWebSocketError`
   dedupe helper (already used for the generic `ws.onerror` log, keyed by exact
   message match within `ERROR_LOG_DEDUPE_MS` = 5s) to gate the handshake-error
   `addLog` call too, instead of inventing a second dedupe mechanism. Had to
   move the `shouldSuppressWebSocketError` `useCallback` earlier in the file
   (right after `getGatewayErrorHelp`) so it can be referenced both inside
   `handleGatewayFrame`'s body and in its dependency array without a
   temporal-dead-zone error; added it to `handleGatewayFrame`'s deps array.

Net effect: even for any retryable error causing a reconnect loop, the log is
now capped to one entry per 5s of identical message; for `AUTH_TOKEN_MISMATCH`
specifically, fix (1) stops the loop after the first attempt entirely.

## Tests

`src/lib/__tests__/websocket-utils.test.ts` had two tests explicitly encoding
the bug (`returns false for AUTH_TOKEN_MISMATCH (retryable)` and
`NON_RETRYABLE_ERROR_CODES does not include AUTH_TOKEN_MISMATCH`). Flipped
both to assert the correct (fixed) behavior — folded the first into the
existing "all non-retryable codes" list, replaced the second with an
assertion that the code **is** included, referencing HLX-324. Confirmed both
failed against the unmodified source before applying the fix (red), then
green after.

No new test file added for the log-dedupe reuse (Fix 3): it reuses
`shouldSuppressWebSocketError`, which has no existing direct unit test either
(it's a `useCallback` closure inside the `useWebSocket` hook, not extracted to
`websocket-utils.ts`) and the surrounding hook has no test harness in this
repo (only the pure functions in `websocket-utils.ts` are unit tested). Root
cause (Fix 1) is what's covered by an actual assertion; Fixes 2/3 are
defense-in-depth verified by reading the code path.

## Verification

- `npx tsc --noEmit -p tsconfig.json` → clean, no errors.
- `npx vitest run src/lib/__tests__/websocket-utils.test.ts` → 32/32 passed.
- `npx vitest run` (full suite) → 1118/1120 passed; the 2 failures
  (`task-dispatch-reconciliation.test.ts`) are pre-existing and unrelated —
  reproduced identically via `git stash` on the unmodified tree.

## Concerns

- None blocking. The `shouldSuppressWebSocketError` ref is a single
  last-message slot shared across handshake errors and generic `ws.onerror`
  errors — if both fire in quick succession with different messages, both
  still log (dedupe is per-message, not a queue), which matches the original
  design intent and is unchanged by this fix.
