# Database Spec — Inventory / Warehouse / Daily In-Out Ledger System

**Stack:** Next.js + MongoDB (Mongoose)

**Business context:** Single warehouse, single partner. The partner ships raw materials in → we assemble/process → we ship finished goods back out to the same partner. Items have a hierarchical multi-level BOM: finished product → sub-assembly → component → raw material.

---

## 1. Architecture Principles

The system separates five concerns:

- **Master data:** `items`, `bomVersions`, `partners`, optional `categories`
- **Business documents:** `vouchers`, `productionOrders`
- **Current state:** `inventory`
- **Immutable history:** `stockTransactions`

Core rules:

1. `stockTransactions` is the immutable stock movement history.
2. `inventory` represents current stock state and is updated transactionally with stock movements.
3. Confirmed vouchers and production completion operations must never create duplicate stock movements.
4. Historical BOMs are immutable. Never edit a BOM version already used by a production order.
5. Historical business documents snapshot the master data needed to understand them later.
6. All stock-affecting writes must run inside one MongoDB transaction.
7. Circular BOM references must be prevented before a BOM version can become `ACTIVE`.
8. There is no unit-conversion engine in this version. A BOM quantity is always expressed in the exact base `unit` of its component item.
9. Transactional logic lives in Next.js Server Actions / API Routes, never in client code.
10. Production orders reserve component stock as part of their lifecycle; reservation is not a physical stock movement and does not create a `stockTransaction`.
11. Production supports partial completion. A production order becomes `COMPLETED` only when `completedQuantity` reaches `outputQuantity`.

MongoDB transactions require a replica set. Use a replica set in local development as well.

---

## 2. Collection Overview

| Collection | Purpose |
|---|---|
| `items` | Item/product master data |
| `bomVersions` | Immutable versioned BOM definitions |
| `categories` | Optional item category tree |
| `partners` | Business partner master data |
| `vouchers` | Import/export business documents |
| `productionOrders` | Assembly/production orders |
| `inventory` | Current stock state per item |
| `stockTransactions` | Immutable stock movement ledger |

---

## 3. `items`

Master data for finished products, sub-assemblies, components, and raw materials.

```js
{
  _id: ObjectId,

  itemCode: "SP-TV-55-001",
  name: "Smart TV 55 inch Model X",

  type: "finishedProduct",
  // finishedProduct | subAssembly | component | rawMaterial

  unit: "pcs",
  status: "active",
  // active | discontinued

  categoryId: ObjectId | null,

  specs: {
    screen: "55 inch 4K",
    voltage: "220V"
  },

  purchaseInfo: {
    price: 5000,
    currency: "VND",
    supplierSku: "ABC-IC123",
    leadTimeDays: 7,
    moq: 100
  },

  createdBy: ObjectId,
  updatedBy: ObjectId,
  createdAt: ISODate,
  updatedAt: ISODate
}
```

### Rules

- `itemCode` is immutable once referenced by transactional data.
- An item cannot be deleted if referenced by BOMs, vouchers, production orders, inventory, or stock transactions. Mark it `discontinued` instead.
- `unit` is the item's base unit. No unit-conversion table or conversion factor is supported in this version.
- `unit` is immutable once the item is referenced by any `bomVersion`, `voucher`, `productionOrder`, or `stockTransaction`. Because BOM line quantities and past ledger entries are expressed in the component's base unit *without* snapshotting that unit at the BOM-version level, changing it later would silently reinterpret historical quantities. If the unit is genuinely wrong, create a new item instead of editing the old one.
- BOM data does **not** live inside `items`.

### Indexes

```js
db.items.createIndex(
  { itemCode: 1 },
  { unique: true }
);

db.items.createIndex({
  type: 1,
  status: 1
});
```

---

## 4. `bomVersions`

BOM versions are separate documents so historical BOM structures are preserved.

```js
{
  _id: ObjectId,

  itemId: ObjectId,

  version: 3,

  effectiveFrom: ISODate("2026-06-01"),
  effectiveTo: ISODate | null,

  status: "ACTIVE",
  // DRAFT | ACTIVE | RETIRED

  components: [
    {
      componentId: ObjectId,
      quantity: 1,
      note: "Mainboard"
    },
    {
      componentId: ObjectId,
      quantity: 2,
      note: "Speaker"
    }
  ],

  createdBy: ObjectId,
  updatedBy: ObjectId,
  createdAt: ISODate,
  updatedAt: ISODate
}
```

### BOM rules

- Only one BOM version for an item may be `ACTIVE`.
- `components[].quantity` is always expressed in the component item's `unit`.
- Unit conversion is explicitly out of scope. Do not store a conversion factor in a BOM line.
- A `RETIRED` BOM version must never be modified.
- Once a BOM version is referenced by a production order, it is immutable.
- Creating a new version does not modify the previous version.
- Before activation, recursively validate the complete BOM graph and reject circular references.
- Every `componentId` must reference an existing item.
- BOM quantity must be greater than zero.
- The component item's `unit` is the source of truth for the BOM line's unit.

### Activating a BOM version — concurrency requirement

The database must prevent two concurrent requests from creating two `ACTIVE` BOM versions for the same item.

Create the following partial unique index:

```js
db.bomVersions.createIndex(
  { itemId: 1 },
  {
    unique: true,
    partialFilterExpression: { status: "ACTIVE" }
  }
);
```

The activation operation must run inside one MongoDB transaction:

```text
BEGIN TRANSACTION

1. Validate target BOM is eligible for activation.
2. Validate the BOM graph has no circular references.
3. Retire the current ACTIVE version for the same item, if one exists.
4. Activate the target BOM version.
5. COMMIT
```

The partial unique index is the database-level concurrency guard. If two activation requests race, only one transaction can commit an `ACTIVE` document for the same `itemId`; the losing transaction must handle the duplicate-key / write-conflict error and report that the BOM changed concurrently.

Do not rely on application code alone for the single-active-version invariant.

### Example lifecycle

```text
v1 ACTIVE
   ↓
transaction:
  v1 RETIRED
  v2 ACTIVE
```

### Indexes

```js
db.bomVersions.createIndex(
  { itemId: 1, version: 1 },
  { unique: true }
);

db.bomVersions.createIndex(
  { itemId: 1 },
  {
    unique: true,
    partialFilterExpression: { status: "ACTIVE" }
  }
);

db.bomVersions.createIndex({
  itemId: 1,
  status: 1
});

db.bomVersions.createIndex({
  "components.componentId": 1
});
```

---

## 5. `categories` (Optional)

Use this only if `items.type` is insufficient for classification.

```js
{
  _id: ObjectId,

  name: "Electronic Components",
  code: "COMP-ELEC",

  parentId: ObjectId | null,

  path: ",rootId,parentId,",
  level: 1,

  isActive: true,

  createdBy: ObjectId,
  updatedBy: ObjectId,
  createdAt: ISODate,
  updatedAt: ISODate
}
```

### Index

```js
db.categories.createIndex({
  path: 1
});
```

---

## 6. `partners`

```js
{
  _id: ObjectId,

  code: "PARTNER-ABC",
  name: "ABC Company",

  taxCode: "0312xxxxx",

  address: "...",

  contact: {
    phone: "...",
    email: "..."
  },

  isActive: true,

  createdBy: ObjectId,
  updatedBy: ObjectId,
  createdAt: ISODate,
  updatedAt: ISODate
}
```

Keeping partners separate allows another partner to be added later without changing the transactional schema.

### Index

```js
db.partners.createIndex(
  { code: 1 },
  { unique: true }
);
```

---

## 7. `vouchers`

Import/export vouchers are the business documents for material coming in and finished goods going out.

### Currency decision

This version supports **VND only**.

Therefore:

- `currency` is stored once at voucher level.
- Every `unitPrice` and `totalValue` in the voucher is denominated in that voucher currency.
- Every voucher must have `currency: "VND"`.
- Multi-currency vouchers are out of scope. Do not add per-line currencies unless multi-currency support is explicitly designed later.

### Item type per voucher direction

- An `IMPORT` voucher line's item is expected to be `rawMaterial` — this is the normal path for material the partner ships in.
- An `EXPORT` voucher line's item is expected to be `finishedProduct` — this is the normal path for goods shipped back to the partner.
- Any exception (e.g. returning excess raw material, exporting a sub-assembly or component) is a deliberate business exception, not a schema violation. Validate it as a warning/confirmation step at the application layer rather than a hard MongoDB constraint, since the schema itself does not restrict `itemId` by type.

```js
{
  _id: ObjectId,

  code: "IMP-20260908-001",

  type: "IMPORT",
  // IMPORT | EXPORT

  date: ISODate("2026-09-08"),

  partnerId: ObjectId,

  status: "DRAFT",
  // DRAFT | CONFIRMED | CANCELLED

  currency: "VND",

  items: [
    {
      itemId: ObjectId,

      itemSnapshot: {
        itemCode: "RM-001",
        name: "Mainboard",
        unit: "pcs"
      },

      quantity: 500,
      unitPrice: 25000,

      batchNo: "B0908",

      note: ""
    }
  ],

  totalValue: 12500000,

  note: "September raw material batch import",

  createdBy: ObjectId,
  updatedBy: ObjectId,

  confirmedBy: ObjectId | null,
  confirmedAt: ISODate | null,

  cancelledBy: ObjectId | null,
  cancelledAt: ISODate | null,

  createdAt: ISODate,
  updatedAt: ISODate
}
```

### Voucher rules

#### Draft

- Lines can be added/removed/edited.
- Master data can be snapshotted when the line is added or when the voucher is saved.
- All lines must use the same application currency: `VND`.

#### Confirm

A voucher can only transition:

```text
DRAFT → CONFIRMED
```

The confirmation operation must:

1. Atomically claim the voucher from `DRAFT`.
2. Validate inventory rules.
3. Update `inventory`.
4. Create corresponding `stockTransactions`.
5. Commit everything in one MongoDB transaction.

A voucher already in `CONFIRMED` or `CANCELLED` cannot be confirmed again.

The voucher claim should be guarded by the state predicate:

```js
{ _id: voucherId, status: "DRAFT" }
```

If two requests try to confirm the same voucher concurrently, only one request may successfully claim and commit the voucher.

#### Cancel

- A `DRAFT` voucher can be cancelled.
- A confirmed voucher should not be edited or deleted.
- If a confirmed movement needs to be reversed, create an explicit correction/reversal stock transaction and record the business reason. Do not mutate the original transaction.

### Voucher indexes

```js
db.vouchers.createIndex(
  { code: 1 },
  { unique: true }
);

db.vouchers.createIndex({
  date: -1,
  type: 1,
  status: 1
});

db.vouchers.createIndex({
  partnerId: 1,
  date: -1
});
```

---

## 8. `productionOrders`

Production orders snapshot the exact BOM used when the order was created.

```js
{
  _id: ObjectId,

  code: "PO-20260908-001",

  outputItemId: ObjectId,

  outputItemSnapshot: {
    itemCode: "SP-TV-55-001",
    name: "Smart TV 55 inch Model X",
    unit: "pcs"
  },

  outputQuantity: 100,
  completedQuantity: 0,

  status: "PLANNED",
  // PLANNED | IN_PROGRESS | COMPLETED | CANCELLED

  bomVersionId: ObjectId,
  bomVersion: 3,

  bomSnapshot: [
    {
      componentId: ObjectId,

      itemSnapshot: {
        itemCode: "COMP-MB-002",
        name: "Mainboard",
        unit: "pcs"
      },

      quantityPerOutput: 1,
      requiredQuantity: 100,
      consumedQuantity: 0
    }
  ],

  plannedDate: ISODate,

  startedAt: ISODate | null,
  completedAt: ISODate | null,
  cancelledAt: ISODate | null,

  createdBy: ObjectId,
  updatedBy: ObjectId,
  completedBy: ObjectId | null,
  cancelledBy: ObjectId | null,

  createdAt: ISODate,
  updatedAt: ISODate
}
```

### Production order creation

When creating the order:

1. Find the current `ACTIVE` BOM.
2. Record its `_id` and version.
3. Recursively explode the multi-level BOM.
4. Store the exact calculated requirements in `bomSnapshot`.
5. Validate the output item's unit and all component references.
6. Reserve the required component quantities for the planned production quantity.
7. Create the order as `PLANNED` only after the reservation succeeds.

Order creation and reservation must occur in **one MongoDB transaction**.

### Reservation lifecycle for production orders

Reservation is tied to the production order lifecycle as follows:

```text
Create order
    ↓
PLANNED + reserve full required component quantities
    ↓
Start production
    ↓
IN_PROGRESS
    ↓
Partial completion(s)
    ↓
IN_PROGRESS
    ↓
Final completion
    ↓
COMPLETED + all remaining reservations released/consumed
```

Rules:

- A newly created `PLANNED` production order reserves the full required component quantities for `outputQuantity`.
- Transitioning `PLANNED → IN_PROGRESS` does not create a second reservation.
- Reservation does not create a `stockTransaction`.
- When production consumes components, `quantityOnHand` decreases and the corresponding `quantityReserved` decreases in the same transaction.
- On cancellation before all planned output is completed, release the remaining reservation in the same transaction as the status change.
- A cancelled order keeps its historical `consumedQuantity` and stock transactions. Cancellation does not roll back physical production that already happened.

### Partial completion

Partial completion is supported.

For each completion operation:

```text
completionQuantity > 0
completionQuantity <= outputQuantity - completedQuantity
```

Example:

```text
outputQuantity     = 100
first completion   = 60
second completion  = 40
```

After the first completion:

```text
completedQuantity = 60
status = IN_PROGRESS
```

After the second completion:

```text
completedQuantity = 100
status = COMPLETED
```

The system does **not** create child production orders for partial completion.

Material consumption for each completion is based on the incremental output quantity:

```text
componentConsumption = quantityPerOutput × completionQuantity
```

The production order's `bomSnapshot[].consumedQuantity` is incremented by the actual component consumption recorded by each completion transaction.

For normal BOM-driven production, total consumption for the full planned quantity should equal the snapshot requirement. Any process loss, scrap, or extra material usage must be recorded explicitly as an adjustment/production variance according to the business process rather than silently changing the BOM.

### Completing production

Each completion operation must occur inside one transaction:

```text
BEGIN TRANSACTION

1. Validate production order is PLANNED or IN_PROGRESS.
2. Validate completionQuantity is valid.
3. Calculate incremental component consumption.
4. Deduct component on-hand quantities.
5. Reduce the corresponding reservations.
6. Add produced output to output item inventory.
7. Create productionConsume stock transactions.
8. Create one productionOutput stock transaction for the completed quantity.
9. Increment completedQuantity and bomSnapshot consumedQuantity.
10. Set status:
      - IN_PROGRESS if completedQuantity < outputQuantity
      - COMPLETED if completedQuantity == outputQuantity
11. On final completion, ensure no remaining component reservation is left for this order.
12. COMMIT
```

All steps must succeed or none should be committed.

### Completing a partial production example

For:

```text
outputQuantity = 100
completedQuantity = 0
Mainboard = 1 per output
Speaker = 2 per output
```

Completing 60 units produces:

```text
productionConsume
  Mainboard  -60
  Speaker    -120

productionOutput
  Finished product  +60
```

The order remains `IN_PROGRESS` with `completedQuantity = 60`.

### Production indexes

```js
db.productionOrders.createIndex(
  { code: 1 },
  { unique: true }
);

db.productionOrders.createIndex({
  status: 1,
  plannedDate: -1
});

db.productionOrders.createIndex({
  outputItemId: 1,
  plannedDate: -1
});
```

---

## 9. `inventory`

`inventory` stores current stock state.

```js
{
  _id: ObjectId,

  itemId: ObjectId,

  quantityOnHand: 5000,
  quantityReserved: 500,

  reorderPoint: 1000,
  reorderQuantity: 5000,

  updatedAt: ISODate
}
```

### Available quantity

Do not persist `quantityAvailable`.

Calculate:

```js
quantityAvailable = quantityOnHand - quantityReserved;
```

### Inventory rules

- Reservation updates and physical stock movements must be performed server-side and transactionally.
- Do not update inventory directly from client code.
- All stock-changing inventory updates must use atomic database operations that include the relevant current-state validation to protect against concurrent writers.

### Index

```js
db.inventory.createIndex(
  { itemId: 1 },
  { unique: true }
);
```

---

## 10. `stockTransactions`

This is the immutable stock movement ledger.

```js
{
  _id: ObjectId,

  itemId: ObjectId,

  itemSnapshot: {
    itemCode: "RM-001",
    name: "Mainboard",
    unit: "pcs"
  },

  voucherId: ObjectId | null,
  voucherCode: "IMP-20260908-001",

  productionOrderId: ObjectId | null,
  productionOrderCode: "PO-20260908-001",

  type: "receipt",
  // receipt
  // issue
  // productionConsume
  // productionOutput
  // adjustment

  quantity: 500,

  balanceAfter: 5500,

  batchNo: "B0908",

  performedBy: ObjectId,

  correctionOf: ObjectId | null,

  idempotencyKey: "voucher:665abc:line:0",

  timestamp: ISODate,

  note: "Received per delivery note #123"
}
```

### Quantity convention

Use:

```text
positive = stock enters
negative = stock leaves
```

Examples:

```text
receipt              +500
issue                -100
productionConsume    -200
productionOutput     +100
adjustment            ±quantity
```

### Immutability

Never:

- update a stock transaction
- delete a stock transaction
- change its quantity
- change its timestamp

To correct an error, create a new transaction:

```js
{
  type: "adjustment",
  quantity: -900,
  correctionOf: originalTransactionId
}
```

### `balanceAfter`

`balanceAfter` means:

> The item's running balance immediately after this transaction was posted.

It is not rewritten when a later correction is posted.

`inventory.quantityOnHand` remains the authoritative current stock value.

### Idempotency

Every stock-affecting operation must have a deterministic `idempotencyKey`.

Examples:

```text
voucher:665abc:line:0
voucher:665abc:line:1
production:665def:completion:1:consume:componentA
production:665def:completion:1:output
```

Create a unique index:

```js
db.stockTransactions.createIndex(
  { idempotencyKey: 1 },
  { unique: true }
);
```

This prevents retries from creating duplicate stock movements.

### Indexes

```js
db.stockTransactions.createIndex({
  itemId: 1,
  timestamp: -1
});

db.stockTransactions.createIndex({
  voucherId: 1
});

db.stockTransactions.createIndex({
  productionOrderId: 1
});

db.stockTransactions.createIndex({
  timestamp: -1,
  type: 1
});

db.stockTransactions.createIndex(
  { idempotencyKey: 1 },
  { unique: true }
);
```

---

## 11. BOM Explosion

MongoDB `$graphLookup` should not be relied on for multiplying quantities through multiple BOM levels.

Use an application-layer recursive function.

```ts
async function explodeBOM(
  itemId: ObjectId,
  quantityNeeded: Decimal,
  acc: Map<string, Decimal> = new Map(),
  visited: Set<string> = new Set()
) {
  const itemKey = itemId.toString();

  if (visited.has(itemKey)) {
    throw new Error("Circular BOM reference detected");
  }

  visited.add(itemKey);

  const bom = await BomVersion.findOne({
    itemId,
    status: "ACTIVE"
  }).lean();

  if (!bom) {
    visited.delete(itemKey);
    return acc;
  }

  for (const line of bom.components) {
    const totalQty = multiply(line.quantity, quantityNeeded);
    const key = line.componentId.toString();

    acc.set(
      key,
      add(acc.get(key) ?? ZERO, totalQty)
    );

    await explodeBOM(
      line.componentId,
      totalQty,
      acc,
      visited
    );
  }

  visited.delete(itemKey);
  return acc;
}
```

The actual implementation should use a decimal-safe numeric strategy rather than JavaScript floating-point arithmetic. `Decimal`, `ZERO`, `multiply`, and `add` above refer to whichever decimal-safe library is chosen (e.g. `decimal.js`), not native JS `Number`/arithmetic — `ZERO` guards the first time a component is accumulated into the map, when `acc.get(key)` is still `undefined`.

### Important

If a BOM is:

```text
TV
 ├── Mainboard × 1
 │    ├── IC × 5
 │    └── Capacitor × 10
 └── Speaker × 2
```

For 100 TVs:

```text
Mainboard     100
IC            500
Capacitor    1000
Speaker       200
```

The production order stores these calculated requirements in its snapshot.

The recursive validator and explosion logic must use the same cycle-detection rule so a malformed BOM can never be activated or used for production.

---

## 12. Stock-Affecting Transaction Pattern

Every stock-affecting operation follows:

```text
BEGIN TRANSACTION

1. Read current business document / state
2. Validate document state
3. Validate stock or reservation availability
4. Update inventory atomically
5. Insert stockTransaction(s)
6. Update the business document state / quantities
7. COMMIT
```

For reservation-only operations, no `stockTransaction` is written because physical stock has not moved.

If any step fails:

```text
ROLLBACK EVERYTHING
```

Never do:

```text
update inventory
      ↓
insert ledger
```

as two independent operations.

### Concurrency requirement for inventory

Stock sufficiency checks and stock decrements must be part of the same transaction and must use a conditional atomic update.

If no document is returned, the stock condition was not satisfied at commit time. Do not perform a separate read-then-write check.

Reservation updates need equivalent transactional and conditional logic.

### Reserved-stock protection

Not every stock decrease is allowed to touch reserved quantity:

- A production order's own completion **may** draw down its own `quantityReserved`, since that stock was already set aside for it (`quantityOnHand -= consumed`, `quantityReserved -= consumed`, in the same transaction).
- An `EXPORT` voucher or any other stock decrease that is **not** consuming an existing reservation must check `quantityAvailable = quantityOnHand - quantityReserved >= abs(delta)`, not just `quantityOnHand >= abs(delta)`. Otherwise an export could dip into stock another production order is already counting on.
- Encode this as part of the same atomic conditional update described above (e.g. the `$expr` filter compares against `quantityOnHand - quantityReserved`, not `quantityOnHand` alone) — never as a separate read-then-write check.

---

## 13. Confirming an Import / Export Voucher

Conceptual flow:

```ts
await session.withTransaction(async () => {

  // 1. Claim the voucher.
  const voucher = await Voucher.findOneAndUpdate(
    {
      _id: voucherId,
      status: "DRAFT"
    },
    {
      $set: {
        status: "CONFIRMED",
        confirmedAt: now,
        confirmedBy: userId,
        updatedAt: now,
        updatedBy: userId
      }
    },
    {
      new: true,
      session
    }
  );

  if (!voucher) {
    throw new Error(
      "Voucher is already confirmed or cancelled"
    );
  }

  // 2. Process each line.
  for (const [index, line] of voucher.items.entries()) {

    const delta =
      voucher.type === "IMPORT"
        ? line.quantity
        : negate(line.quantity);

    // 3. Update current inventory atomically.
    const inventory =
      await updateInventoryAtomically(
        line.itemId,
        delta,
        session
      );

    // 4. Create immutable ledger entry.
    await StockTransaction.create([{
      itemId: line.itemId,

      voucherId: voucher._id,
      voucherCode: voucher.code,

      type: voucher.type === "IMPORT"
        ? "receipt"
        : "issue",

      quantity: delta,

      balanceAfter:
        inventory.quantityOnHand,

      batchNo: line.batchNo,

      performedBy: userId,

      idempotencyKey:
        `voucher:${voucher._id}:line:${index}`,

      timestamp: now
    }], { session });
  }
});
```

The important point is that **claiming the voucher, changing inventory, and writing the ledger are one transaction**.

---

## 14. Completing a Production Order

A production order may have one or many completion operations.

Conceptual flow:

```text
BEGIN TRANSACTION

1. Load and validate production order state.
2. Validate completionQuantity.
3. Calculate incremental component consumption.
4. Deduct every consumed component atomically.
5. Decrease the corresponding reservations.
6. Add produced output inventory atomically.
7. Create productionConsume transactions.
8. Create one productionOutput transaction.
9. Update completedQuantity and bomSnapshot consumedQuantity.
10. Set status to IN_PROGRESS or COMPLETED.
11. Commit.

COMMIT
```

For each completion, use deterministic idempotency keys derived from the production order and completion sequence / operation identifier.

Do not mark the order `COMPLETED` until:

```text
completedQuantity == outputQuantity
```

On final completion, the order must have no remaining component reservation for the unproduced quantity.

---

## 15. Reservations

Reservations represent future allocation of physical stock and are separate from physical stock movement.

A reservation:

```text
does NOT create a stockTransaction
```

because physical stock has not moved.

### Reservation creation

For production orders:

```text
create production order
      ↓
create full component reservation
      ↓
status = PLANNED
```

The reservation must be created in the same transaction as the production order.

### Reservation release / consumption

When a completion consumes stock:

```text
quantityOnHand -= consumedQuantity
quantityReserved -= consumedQuantity
```

When a production order is cancelled before full completion:

```text
quantityReserved -= remainingReservedQuantity
```

These updates must occur transactionally with the status transition.

### No double reservation

A production order may only have one active reservation for its remaining required quantity. Do not reserve again merely because the order moves from `PLANNED` to `IN_PROGRESS`.

If the order quantity is changed before production starts, recalculate the requirement and adjust the existing reservation in one transaction.

After production has started, changing `outputQuantity` is not allowed in this version.

---

## 16. Daily Ledger / Reporting

The daily ledger is derived from confirmed vouchers and stock transactions.

For business-document view:

```js
db.vouchers.find({
  date: {
    $gte: startOfDay,
    $lt: startOfNextDay
  },

  status: "CONFIRMED"
}).sort({
  date: 1,
  createdAt: 1
});
```

For stock movement history:

```js
db.stockTransactions.find({
  timestamp: {
    $gte: startOfDay,
    $lt: startOfNextDay
  }
}).sort({
  timestamp: 1
});
```

Use `$lt: startOfNextDay` rather than `$lte: endOfDay` to avoid boundary/time precision issues.

A precomputed `dailySummary` collection is optional and should be treated as a reporting cache, not as the source of truth.

---

## 17. Data Integrity Rules

The application should enforce:

### Items

- Unique `itemCode`
- Valid item type
- Valid non-empty base `unit`
- No deletion after transactional references exist

### BOMs

- Component must exist
- Quantity > 0
- Component quantity is expressed in the component item's exact base `unit`
- No unit conversion fields
- No circular references
- Only one active BOM per item
- Historical BOMs immutable
- BOM activation must use a MongoDB transaction and the partial unique index

### Vouchers

- Must contain at least one line
- Quantity > 0
- `currency` must be `VND`
- `totalValue` must be denominated in `currency`
- Correct item type for IMPORT/EXPORT according to business rules
- Only `DRAFT` vouchers can be edited
- Only `DRAFT` vouchers can be confirmed
- Confirming twice is impossible

### Production

- `outputQuantity > 0`
- `completedQuantity >= 0`
- `completedQuantity <= outputQuantity`
- BOM snapshot is captured at creation
- Production order uses one fixed BOM version for its full lifecycle
- Full required component reservation is created with the order
- Partial completion is allowed
- `COMPLETED` means `completedQuantity == outputQuantity`
- Completed production order cannot be completed again
- Stock sufficiency is checked atomically
- Consumption, output, reservation changes, and order state change happen in one transaction

### Inventory

- Inventory updates are transactional
- `quantityAvailable` is calculated, not persisted

### Stock transactions

- Immutable
- Unique `idempotencyKey`
- Corrections reference the original transaction
- Quantity is never zero

---

## 18. Decimal Quantities and Money

Do not use JavaScript `Number` for financial values or fractional quantities where precision matters.

MongoDB should use `Decimal128` for:

- quantities when fractional quantities are possible
- unit prices
- total values

For example:

```js
quantity: Decimal128("1200.5"),
unitPrice: Decimal128("250000")
```

On the application side, convert `Decimal128` into a decimal-safe type (e.g. `decimal.js`) before doing arithmetic. Never coerce it to a native JS `Number` for calculations — only for display formatting, where precision loss is acceptable.

If every inventory quantity is guaranteed to be an integer, integer quantities can be used instead, but the decision must be made consistently across the system, and should be settled before implementation begins (see Implementation Checklist).

Money is VND-only in this version.

---

## 19. Audit Fields

All business documents should have:

```js
createdBy
createdAt
updatedBy
updatedAt
```

State transitions should additionally record the responsible user/time where applicable:

```js
confirmedBy
confirmedAt

cancelledBy
cancelledAt

completedBy
completedAt
```

No settings/configuration collection is defined in this version. If one is introduced later, apply the same `updatedBy` / `updatedAt` convention to it.

For future audit requirements, consider an application-level audit log for changes to master data and business documents.

---

## 20. Final Collection Structure

```text
categories
    │
    └── items
          │
          └── bomVersions
                  │
                  └── productionOrders
                          │
                          ├── stockTransactions
                          │
                          └── inventory

partners
    │
    └── vouchers
            │
            └── stockTransactions
                    │
                    └── inventory

```

The conceptual ownership is:

```text
items
  = What exists?

bomVersions
  = How is it made?

partners
  = Who do we work with?

vouchers
  = What came in / went out?

productionOrders
  = What did we manufacture?

inventory
  = What do we have right now?

stockTransactions
  = What happened to the stock?
```

---

## 21. Index Summary

```js
// items
db.items.createIndex(
  { itemCode: 1 },
  { unique: true }
);

db.items.createIndex({
  type: 1,
  status: 1
});


// bomVersions
db.bomVersions.createIndex(
  { itemId: 1, version: 1 },
  { unique: true }
);

db.bomVersions.createIndex(
  { itemId: 1 },
  {
    unique: true,
    partialFilterExpression: { status: "ACTIVE" }
  }
);

db.bomVersions.createIndex({
  itemId: 1,
  status: 1
});

db.bomVersions.createIndex({
  "components.componentId": 1
});


// categories
db.categories.createIndex({
  path: 1
});


// partners
db.partners.createIndex(
  { code: 1 },
  { unique: true }
);

// vouchers
db.vouchers.createIndex(
  { code: 1 },
  { unique: true }
);

db.vouchers.createIndex({
  date: -1,
  type: 1,
  status: 1
});

db.vouchers.createIndex({
  partnerId: 1,
  date: -1
});


// productionOrders
db.productionOrders.createIndex(
  { code: 1 },
  { unique: true }
);

db.productionOrders.createIndex({
  status: 1,
  plannedDate: -1
});

db.productionOrders.createIndex({
  outputItemId: 1,
  plannedDate: -1
});


// inventory
db.inventory.createIndex(
  { itemId: 1 },
  { unique: true }
);


// stockTransactions
db.stockTransactions.createIndex({
  itemId: 1,
  timestamp: -1
});

db.stockTransactions.createIndex({
  voucherId: 1
});

db.stockTransactions.createIndex({
  productionOrderId: 1
});

db.stockTransactions.createIndex({
  timestamp: -1,
  type: 1
});

db.stockTransactions.createIndex(
  { idempotencyKey: 1 },
  { unique: true }
);
```

---

## 22. Implementation Checklist

- [ ] Enable MongoDB replica set.
- [ ] Implement `items`.
- [ ] Implement immutable `bomVersions`.
- [ ] Add the partial unique index `{ itemId: 1 }` for `ACTIVE` BOM versions.
- [ ] Implement transactional BOM activation: retire old active + activate new version.
- [ ] Handle BOM activation write conflicts / duplicate-key errors from concurrent requests.
- [ ] Implement BOM circular-reference validation.
- [ ] Remove unit-conversion assumptions from BOMs; BOM quantities use the component item's base unit.
- [ ] Implement `partners`.
- [ ] Implement `vouchers` with voucher-level `currency: "VND"`.
- [ ] Implement voucher state transitions.
- [ ] Implement transactional voucher confirmation.
- [ ] Implement `inventory` with atomic conditional updates.
- [ ] Implement immutable `stockTransactions`.
- [ ] Implement deterministic idempotency keys.
- [ ] Implement production order creation with BOM snapshot + full initial reservation.
- [ ] Implement `PLANNED → IN_PROGRESS → COMPLETED` lifecycle.
- [ ] Implement partial production completion using incremental material consumption.
- [ ] Implement reservation consumption during production completion.
- [ ] Implement reservation release on cancellation.
- [ ] Enforce `COMPLETED` only when `completedQuantity == outputQuantity`.
- [ ] Implement BOM explosion with decimal-safe arithmetic and cycle detection.
- [ ] Test concurrent BOM activation.
- [ ] Test concurrent voucher confirmation.
- [ ] Test concurrent stock consumption/decrement.
- [ ] Test partial completion and final completion.
- [ ] Test cancellation after partial completion and reservation release.
- [ ] Test historical BOM snapshots after master BOM changes.
- [ ] Test retry/idempotency behavior for voucher and production operations.
- [ ] Decide `Decimal128` vs. integer quantities before implementation begins, and apply the decision consistently across all schemas and services.
- [ ] Enforce item-type expectations for `IMPORT` vs `EXPORT` voucher lines (`rawMaterial` in / `finishedProduct` out) as an application-level validation, treating exceptions as a deliberate confirmation step.
- [ ] Enforce `items.unit` immutability once the item is referenced by any `bomVersion`, `voucher`, `productionOrder`, or `stockTransaction`.
- [ ] Ensure `EXPORT` voucher confirmation and any non-production stock decrease check `quantityAvailable` (on-hand minus reserved), not just `quantityOnHand` — except when a production order is consuming its own reservation.
