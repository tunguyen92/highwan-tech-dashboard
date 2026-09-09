# Implementation Plan — Warehouse / Inventory / Production System

**Source of truth:** `warehouse-db-spec-v4.md` (or whatever you've renamed it to after your own edits — section numbers below assume the v4 numbering). Every task references it by section (§) so the coding agent can cross-check the exact rule instead of guessing.

**Stack:** Next.js (App Router) + TypeScript + MongoDB (Mongoose) + `decimal.js` for all quantity/money arithmetic.

---

## Ground rules for the coding agent

1. Work phase by phase, in order. Don't start phase N+1 until phase N's tests pass — later phases assume earlier ones are solid, not just "written."
2. MongoDB transactions require a replica set (§1). Local dev and CI must run Mongo as a (single-node) replica set, never standalone — set this up in Phase 0, not as an afterthought.
3. Every stock-affecting write goes through the transaction pattern in §12. No exceptions for "just this once" scripts, seeders, or admin tools.
4. Write tests alongside each phase, not after. The concurrency tests listed in §22 belong to the phase that introduces that concurrency risk — don't defer all of them to one "testing phase" at the end (Phase 7 exists only to re-run them *together*, against the assembled system).
5. Treat §17 "Data Integrity Rules" as the acceptance criteria for whichever phase touches that collection.
6. Quantities and money use `Decimal128` end-to-end. All arithmetic goes through the `decimal.js` helper built in Phase 0 — never native `+`/`-`/`*` on a raw `Decimal128` pulled straight from Mongo, and never the bare `Decimal128("...")` shorthand (that's Mongo-shell-only syntax; real driver code needs `Decimal128.fromString(...)`).

---

## Phase 0 — Project & data-layer foundations

Goal: a running Next.js + MongoDB skeleton where every later phase only adds models and business logic, never plumbing.

- [ ] Scaffold Next.js (TypeScript, App Router), add Mongoose.
- [ ] Local MongoDB as a single-node replica set (docker-compose with `--replSet rs0`, `rs.initiate()` on first boot). Document the exact commands in `README.md` so nobody re-derives this later.
- [ ] Test setup: `mongodb-memory-server` with `replSet: { count: 1 }` so transaction tests run in CI without a real cluster.
- [ ] Install `decimal.js`. Build `lib/decimal.ts`:
  - `toDecimal(v: Types.Decimal128 | string | number): Decimal`
  - `toDecimal128(v: Decimal): Types.Decimal128` — via `Decimal128.fromString(v.toString())`
  - `addD128`, `multiplyD128`, `sumD128(...)`, `isPositive`, `isZero` — the only place arithmetic on money/quantity fields is allowed to happen
  - Unit tests: rounding, string round-trips, zero/negative edge cases
- [ ] `lib/db.ts` — Mongoose connection singleton (Next.js hot-reload-safe pattern).
- [ ] `lib/withTransaction.ts` — wrapper around `session.withTransaction()` with retry handling for `TransientTransactionError` / `UnknownTransactionCommitResult`.
- [ ] Audit-field mixin/helper (`createdBy/At`, `updatedBy/At`, etc., per §19) applied consistently instead of copy-pasted per schema.
- [ ] CI runs `lint`, `typecheck`, `test` on every phase branch before merge.

**Done when:** an empty Next.js app connects to a replica-set Mongo, a trivial `withTransaction` round-trip test passes, and `decimal.ts` has full unit coverage.

---

## Phase 1 — Master data: `items`, `categories`, `partners`

Spec: §3, §5, §6.

- [ ] `items` schema + indexes (§3).
- [ ] Enforce at the service layer (Mongoose alone can't check cross-collection references): `itemCode` immutable once referenced by transactional data; `unit` immutable once referenced by any `bomVersion`, `voucher`, `productionOrder`, or `stockTransaction`.
- [ ] Soft-delete via `status: discontinued`; hard delete blocked if referenced by BOMs, vouchers, production orders, inventory, or stock transactions — one guard function that checks all five collections.
- [ ] `categories` (optional tree) — only build if actually needed; stub and skip otherwise.
- [ ] `partners` schema + unique `code` index.
- [ ] CRUD API routes / Server Actions for all three, with immutability/deletion guards enforced server-side (§1 rule: transactional logic never in client code).

**Done when:** tests cover `itemCode`/`unit` immutability, blocked deletes, and partner CRUD.

---

## Phase 2 — BOM versioning & explosion

Spec: §4, §11.

- [ ] `bomVersions` schema + all four indexes (§4), including the partial unique index on `{ itemId: 1 }` for `status: ACTIVE`.
- [ ] BOM graph cycle validator as a pure function — unit test with synthetic graphs (self-loop, deep diamond, disjoint components, legitimate multi-parent diamond that is *not* a cycle).
- [ ] BOM activation transaction (§4): validate eligibility → cycle-check → retire current `ACTIVE` → activate target, one transaction; catch the duplicate-key error from the partial unique index and surface it as "BOM changed concurrently," not a generic 500.
- [ ] `explodeBOM` (§11) using `decimal.js` arithmetic throughout, sharing the *same* cycle-detection logic as the validator (factor it into one function both call, so they can't drift apart).
- [ ] Concurrency test: fire two activation requests for the same item in parallel — exactly one wins, the other gets a clear conflict error. Run it dozens of times in CI, not once.
- [ ] Unit test: the TV → Mainboard → IC/Capacitor example in §11 produces exactly the quantities shown.

**Done when:** the concurrent-activation test is reliable under repeated runs, and explosion output matches the spec's worked example exactly.

---

## Phase 3 — Inventory & stock ledger primitives

Spec: §9, §10, §12. **This is the reusable core Phases 4 and 5 both sit on — build and test it in isolation before anything else touches it.**

- [ ] `inventory` schema + unique index; `quantityAvailable` computed on read, never persisted (§9).
- [ ] `stockTransactions` schema + all five indexes, including unique `idempotencyKey` (§10).
- [ ] One shared function implementing the §12 pattern end-to-end: given `(itemId, delta, reason, idempotencyKey, session)`, atomically validate, update `inventory`, and insert the `stockTransaction`, inside the caller's transaction. Every later feature calls this — nobody hand-rolls the pattern again.
- [ ] Conditional atomic update: the filter itself encodes sufficiency — decreases outside of a production order consuming its own reservation must check against `quantityOnHand - quantityReserved`, not `quantityOnHand` alone (v4's reserved-stock protection rule). No separate read-then-write.
- [ ] Idempotency: calling the shared function twice with the same key is a no-op the second time.
- [ ] Reservation helpers: `reserve(itemId, qty, session)` / `release(itemId, qty, session)` — touch `quantityReserved` only, never write a `stockTransaction` (§15).
- [ ] Correction/reversal helper: writes a new `adjustment` with `correctionOf` set; never mutates the original (§10).

**Done when:** N parallel decrement attempts against a fixed stock level yield exactly the expected number of successes/failures with no negative stock and no lost updates; the idempotency-key retry test passes.

---

## Phase 4 — Vouchers (import/export)

Spec: §7, §13.

- [ ] `vouchers` schema + indexes (§7).
- [ ] Draft CRUD: add/remove/edit lines while `DRAFT`; enforce `currency: "VND"` on every line.
- [ ] Item-type-per-direction check (v4 addition): flag/confirm if an `IMPORT` line isn't `rawMaterial` or an `EXPORT` line isn't `finishedProduct`, rather than silently accepting it.
- [ ] Confirm transaction (§13): atomic claim (`findOneAndUpdate` on `{ _id, status: DRAFT }`) → loop lines → call Phase 3's shared stock-update function per line → commit. Reject cleanly if the claim fails.
- [ ] Cancel: only from `DRAFT`; confirmed vouchers are never edited or deleted.
- [ ] Concurrency test: two concurrent confirm requests on the same voucher — exactly one succeeds.
- [ ] Test: confirming an `EXPORT` that would dip into another order's reserved stock is rejected end-to-end through the real voucher-confirm path (Phase 3 already guarantees this at the primitive level; this proves the wiring).

**Done when:** double-confirm and double-cancel are provably impossible, and the reserved-stock test passes through the actual voucher flow.

---

## Phase 5 — Production orders

Spec: §8, §14, §15.

- [ ] `productionOrders` schema + indexes (§8).
- [ ] Order creation transaction: resolve `ACTIVE` BOM → `explodeBOM` → build `bomSnapshot` → reserve every component via Phase 3's `reserve()` → create order as `PLANNED`, all in one transaction.
- [ ] Completion transaction (§14): validate state/quantity → incremental consumption per component (`quantityPerOutput × completionQuantity`, decimal-safe) → deduct on-hand and release the matching reservation via Phase 3's shared function (this is production consuming *its own* reservation — distinct from the voucher-export case in Phase 4) → add output to the output item's inventory → write `productionConsume` transactions + one `productionOutput` transaction → update `completedQuantity`/`bomSnapshot[].consumedQuantity` → set `IN_PROGRESS`/`COMPLETED`.
- [ ] Cancellation: release remaining reservation in the same transaction as the status change; historical `consumedQuantity` and stock transactions are kept, not rolled back.
- [ ] Enforce: `COMPLETED` only when `completedQuantity == outputQuantity`; completed orders can't be completed again; no leftover reservation after final completion.
- [ ] Idempotency keys for each completion's consume/output transactions, derived from order id + completion sequence.

**Done when:** the spec's worked examples (100-unit order completed as 60 then 40; the multi-level BOM explosion) reproduce exactly, and a cancel-after-partial-completion test leaves reservations at zero with history intact.

---

## Phase 6 — Reporting

Spec: §16.

- [ ] Daily voucher view and daily stock-movement view, both using `$gte start / $lt startOfNextDay` (not `$lte endOfDay`).
- [ ] Skip the optional `dailySummary` cache unless there's an actual measured performance need — it's explicitly a cache, not a requirement.

**Done when:** a day with a mix of voucher and production activity returns correct confirmed-only / movement-only views.

---

## Phase 7 — Cross-cutting concurrency & integration pass

Not new features — deliberately re-running the concurrency scenarios together against the fully assembled system, since bugs at the seams (a voucher and a production completion racing on the same item) won't show up in any single phase's isolated tests.

- [ ] Concurrent BOM activation, now with a production order mid-flight on the old version.
- [ ] Concurrent voucher confirmation.
- [ ] Concurrent stock consumption: an `EXPORT` voucher and a production completion racing on the same item.
- [ ] Partial + final completion, and cancellation after partial completion, against a seeded multi-level BOM.
- [ ] Historical BOM snapshot check: activate a new BOM version, confirm an already-`COMPLETED` production order's `bomSnapshot` is unaffected.
- [ ] Retry/idempotency: replay identical voucher-confirm and production-completion requests (same idempotency keys) and confirm no duplicate stock movement.

**Done when:** every concurrency/integration item in §22 has a passing automated test, not just a manual check-off.

---

If your coding agent prefers a flat checklist over phases, §22 of the spec already is one — this plan supplies the ordering and the "why" behind it, so keep both documents side by side rather than picking one.
