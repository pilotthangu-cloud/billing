# Beta Pharmacy POS full release audit — 10 November 2026

## Release decision

**NO-GO. Do not take `1.0.1-rc.2` back to the pharmacy as a production release.**

The earlier automated checks prove selected algorithms and storage behavior. They do not prove every visible feature, the packaged unsigned executable, the real live DBF snapshot, the Windows 7 target, or the physical TVS printer. This report records those distinctions explicitly.

Status meanings:

- **PASS — behavior:** executable logic was exercised with data and the expected result was observed.
- **PASS — source/build:** code/build property was checked, but the complete user workflow was not exercised.
- **FAIL:** a reproducible defect or false claim exists.
- **BLOCKED:** proof requires unavailable hardware, credentials, or a current production snapshot.
- **NOT CERTIFIED:** the page exists, but its accounting/durability/security behavior is not reliable enough for production.

## Evidence collected

### Real supplied legacy file

- File: `old-reference/retailg4/ITEMFILE.DBF`
- SHA-256: `0846BD68B509982B311341DB9C783F0F5C0327482E527454F2EC8602DB315B85`
- Parsed rows/products: `24,684 / 24,684`
- Aggregate `OP_STOCK`: `9,501` units
- Products with positive stock: `89`
- Positive-stock GST distribution: `87 at 5%`, `2 at 0%`
- Positive-stock products with expired source batch: `62`
- Positive stock without batch allocation: `1`
- Missing medicine name: `1`
- The supplied ITEMFILE has DOLO 650 at zero stock. The photographed/report value of 450/435 came from later stock/report data, not this ITEMFILE alone.
- The Drive snapshot does not contain the full active `STK*.DBF` set needed to reproduce the shop stock result offline.

### Test/build evidence

- Existing verification runner: 90/90 assertions passed. Many are arithmetic or source assertions, not UI end-to-end tests.
- Node behavior/integration suite: 23/23 tests passed, including 4 branch-isolation tests, 3 print-path regressions, real DBF pipeline fixtures, and IndexedDB persistence/rollback tests.
- Combined automated result for the covered behaviors: 113/113 passed.
- Production Vite bundle builds successfully.
- Hidden Electron development-runtime smoke test opened the UI, exposed the bridge, wrote stock `435`, reopened storage, and read `435`.
- Both prior rc.2 packages contained the then-current identical JS bundle, and PE architecture checks showed x64 `0x8664` and x86 `0x014C`.
- The newly repaired print/import source is **not yet repackaged**; the old rc.2 executables therefore must not be used.

### Packaged application execution

- **FAIL/BLOCKED:** Windows Application Control on the development computer blocked the unsigned packaged executable before process startup.
- This proves the artifact is unsigned and cannot be accepted on locked-down Windows systems. It does not prove an application crash.
- No signing certificate is configured in `electron-builder`.

### Deployed website UI

In a clean isolated browser profile, the deployed website visibly showed:

- onboarding and cashier/shift screens that were requested to be disabled;
- old GitHub download links, not the latest repaired local package;
- `CLOUD SYNC: ACTIVE` and `18.5/500M` before a verified connection result;
- manager login failure: `Manager access is not configured. Set VITE_ADMIN_PASSWORD for this installation.`
- primary pages opened successfully through Supplier Master: Product Master, Purchase Entry, Near Expiry, Batch Enquiry, Supplier Master.
- The repetitive UI sweep then hit browser-control timeouts. Remaining pages are not marked passed merely because their React components exist.

## Feature-by-feature audit

| Feature | Status | Proof/result | Required repair or acceptance gate |
| --- | --- | --- | --- |
| 64-bit packaged launch | BLOCKED | Unsigned executable blocked by Windows Application Control before startup | Sign the release or test on an approved clean Windows target; record launch video/log and exact SHA-256 |
| Windows 7 32-bit launch | BLOCKED | PE architecture is x86 and Electron 22 is configured, but no Win7 physical execution occurred | Test cold launch, DB import, restart and printing on the exact Win7 32-bit PC |
| Website/PWA launch | PASS — behavior | Deployed UI loaded in an isolated browser profile | Add build/version label and ensure deployment hash matches release source |
| Website download buttons | FAIL | Buttons still target older `v1.0.0` filenames | Publish verified assets first, verify HTTP download/checksum, then update links |
| First-time onboarding | FAIL against requirement | Onboarding appears on clean profile | Keep only required branch selection; remove/hide tour, install and cashier questions in counter-only mode |
| Cashier/shift/opening-float gate | FAIL against requirement | Closing onboarding exposes staff login/opening float; top bar still shows cashier/handover/lock | Disable for current counter-only release; retain code behind a future audited feature flag |
| Manager/Admin authentication | FAIL | Live UI reports manager password is not configured | Hide admin/report mutations until server-backed roles exist, or configure per-install credential securely; never compile a shared PIN into JS |
| Branch selection | PASS — source; UI not complete | MAIN/POLYCLINIC stock keys exist; branch-import isolation tests pass | Add clean-profile UI test and permanently bind each terminal to its branch after explicit setup |
| Folder/select-all DBF picker | PASS — source/behavior fixture | Exact ITEMFILE, current DATA and newest deterministic STKYYMM selection tests pass | Test the exact fresh shop folder; show all candidate paths/hashes and require explicit source confirmation |
| Multiple-dataset protection | PASS — behavior fixture | DATA is preferred over DATA-OLD; ambiguous datasets stop | Real whole-drive acceptance with the current shop USB copy |
| Real ITEMFILE parsing | PASS — behavior | Real supplied file produced 24,684 products and 9,501 OP_STOCK units | Preserve a signed audit output and compare against legacy totals |
| Live shop stock accuracy | BLOCKED | Supplied snapshot is stale/incomplete; confirmed 15-unit post-copy sale explains one DOLO difference only | Close old POS, copy fresh DATA, hash every DBF, dry-run all totals, compare full exported stock list—not only three samples |
| Manufacturer/company import | FAIL, source repaired | Built-in catalog incorrectly treated values such as `15`/`3 bottles` as company names | Repaired importer leaves unknown company blank; add schema-specific COMPMAST adapter and review queue |
| GST/HSN import | NOT CERTIFIED | Real source fields are preserved, but pharmacy/legal correctness is not independently validated | Reconcile tax/HSN master with pharmacist/accountant; store line-item snapshots |
| Batch and expiry import | PARTIAL | No fabrication in current parser; missing/expired values are flagged; real ITEMFILE has 62 positive-stock expired rows | Full STK schema adapter, unresolved allocation screen, and signed discrepancy report |
| Import persistence/rollback | PASS — behavior for medicines only | Replacement transaction survives reopen and aborts atomically on clone failure | Add automatic pre-import full backup, import-run manifest, post-commit totals and one-click rollback |
| Cross-branch import isolation | PASS — behavior | Four tests prove target-branch replacement preserves other-branch batches/stock evidence | Add packaged UI import test for both directions |
| Medicine search/UI | PASS — UI surface only | Billing search and product pages render | Test search/add with real imported stock, keyboard-only workflow and large catalog latency |
| Sale batch/expiry guards | PASS — source/unit; no full sale E2E | Code blocks missing, expired, zero and insufficient selected batches | Add complete sale integration tests including rollback and restart at each step |
| Sale + stock atomic commit | PARTIAL | Medicines and bill share one IndexedDB transaction | Due ledger, sequence, sync outbox and print job are outside that transaction; redesign as one main-process SQLite transaction |
| Multi-branch bill numbers | FAIL | IndexedDB bills use `billNo` alone as key; MAIN `000001` and POLYCLINIC `000001` collide | Migrate to globally unique document ID plus branch-scoped bill-number constraint |
| Cash/UPI sale | NOT CERTIFIED | Payment mode is saved on bill | Reconcile hand-calculated fixtures and make payment entry atomic with sale |
| Credit sale/due ledger | FAIL atomicity | Bill/stock commit first; due entry is later localStorage write | Store due entry in same transaction as sale and build ledger from durable entries |
| Hold/restore bill | NOT CERTIFIED | Feature exists in localStorage | Persist branch/operator/time and revalidate price, stock, expiry and batch on restore |
| Instant raw printing | PARTIAL | ESC/P bytes/line widths tested; instant path calls Electron bridge | Physical printer and Windows spooler not tested; add durable print jobs and hardware matrix |
| Preview/manual printing | FAIL, source repaired | `formatTvsBillLines` was called without import, causing runtime failure | Import repaired; rebuild, UI-test preview print and verify reprint does not change stock |
| Printer selection | FAIL, source repaired | Helper fell back to default/first unrelated printer | Repaired to require configured/exact TVS/MSP match; add setup selector and persisted printer ID |
| Spool success reporting | FAIL, source repaired | `WritePrinter` success did not require full byte count and had no timeout | Repaired full-byte check and 15-second timeout; still requires offline/paper-out hardware tests |
| Receipt formatting | PASS — byte logic; BLOCKED physical | 79-column fixed and compact streams pass; no form-feed | Test 1/3/10/max items and at least 20 consecutive physical bills; photograph top/footer/tear alignment |
| Blank paper beneath bill | BLOCKED physical/design | Compact profile shortens output, but physical blank space depends on top-of-form, perforation and tear position | Calibrate both compact and fixed-form profiles on the actual TVS; choose based on measured paper, not code line count alone |
| Reprint | NOT CERTIFIED | Saved bill snapshot can be recalled; print path exists | Test after restart, printer failure and duplicate reprint; verify no stock deduction/sequence change |
| Product Master edits | PARTIAL | Edits route through catalog update handler | Test restart persistence, branch scope, audit history and failed-write rollback |
| New medicine | FAIL risk | Random `NEW####` code can collide; session state is updated before IndexedDB success | Allocate durable unique ID and commit before UI success |
| Purchase inward | NOT CERTIFIED | Page posts stock and saves voucher | Voucher/localStorage, stock and sync are not atomic; revision/removal reversal needs ledger tests |
| Invoice OCR/import | NOT CERTIFIED | UI/code exists and may call external OCR/OpenAI depending on configuration | Disable by default; require explicit privacy approval, configured credential and fixture tests |
| Sales return/credit note | NOT CERTIFIED | Verified batches can restock; unknown batches are quarantined | Atomic original-line quantity enforcement, cumulative return cap, refund entry and quarantine tests |
| Inter-branch transfer | PASS — planning only | FEFO planning tests preserve exact source/destination totals | Persist dispatch/receive states atomically; test interruption and cross-terminal sync |
| Expiry watchdog | PASS — classification logic | Expired/<30/<60/<90 categorization tests pass | Reconcile real imported batches and distributor return documents |
| Shortage/reorder | NOT CERTIFIED | Page derives low stock and exports draft | Branch/batch correctness and order calculations require canonical ledger |
| Supplier master | UI opens; durability partial | Custom suppliers use localStorage | Move to durable database, validate unique supplier/GST fields and backup/restore |
| Company master | NOT CERTIFIED | Component exists; current imported company data is unreliable | Rebuild from explicit company DBF adapter and durable edits |
| Doctor master/history | NOT CERTIFIED | Local cache/UI exists | Durable storage, privacy controls and regulatory-field validation |
| Tax master | NOT CERTIFIED | Editable local tax slabs exist | Authorized/audited changes and immutable sale/purchase tax snapshots |
| Customer history | FAIL durability risk | Saved after sale in localStorage only | Durable patient/customer table linked to immutable sale records; privacy and restore tests |
| Distributor payments/cheques | FAIL durability/accounting risk | LocalStorage ledger and randomly generated cheque number | Durable double-entry style ledger, user-entered reference, atomic payment update and audit history |
| Sales register/margins | FAIL access + incomplete source | Admin unavailable; report reads recent-bill cache limited to 500 | Query canonical database, remove estimates from accounting reports, hand-reconcile fixtures |
| Admin dashboard | FAIL/NOT CERTIFIED | Cannot authenticate; several metrics derive from caches/estimates | Hide from counter build until authenticated canonical reports pass |
| Cloud sync badge | FAIL truthfulness | UI can show ACTIVE from local queue state without verified server connection | Introduce UNKNOWN/LOCAL ONLY states and show ACTIVE only after authenticated read/write health check |
| Cloud stock concurrency | FAIL architecture | Client pushes absolute snapshots/deltas; no proven atomic server stock ledger | Server-side movement function, idempotent event IDs, RLS and two-terminal concurrency tests |
| Cloud quota meter | FAIL truthfulness | `18.5 MB` is a hard-coded estimate | Label estimate or replace with verified server metric; never imply measured usage |
| Local daily backup | PARTIAL | IndexedDB daily snapshot and checksum exist | Backup all canonical stores, verify read-back, display last successful time, test restore into empty profile |
| JSON export/restore | FAIL atomicity risk | Restore writes stores one by one; medicine restore does not clear omitted stale records | Stage/validate then replace all stores transactionally; compare counts/totals/checksum before success |
| Two-year archive | FAIL completeness | Uses recent-bill cache, not a two-year canonical bill database | Export canonical database range and prove counts |
| Electron security | FAIL | `sandbox:false`, `webSecurity:false`, production DevTools shortcut, PowerShell print helper | Enable security controls, validate IPC, disable DevTools, remove command interpolation and security bypasses |
| Physical offline recovery | BLOCKED | Development smoke had network blocked and storage worked | Target-PC restart, power-loss, queued print/sync and full restore drills |

## Repair order

### Gate 0 — prevent another bad visit

1. Mark rc.2 withdrawn and do not update website download links to it.
2. Keep the old pharmacy software as the live system.
3. Produce a fresh read-only shop DATA snapshot and full stock export without altering the old system.

### Gate 1 — counter-only safety release

1. Disable onboarding tour, cashier shift, opening-float, handover, lock and unaudited Admin/Cloud surfaces.
2. Fix branch-unique bill IDs and make cash/UPI/credit entries atomic with the sale.
3. Finish deterministic import manifest, complete reconciliation export and pre-import backup/rollback.
4. Finish printer fixes, persistent printer selection and durable print queue.
5. Replace false ACTIVE/quota labels with truthful local/offline status.

### Gate 2 — executable acceptance

1. Build signed x64 and x86 artifacts from a clean commit.
2. Verify bundle hash, Git SHA, architecture, version and checksum.
3. Run clean-profile x64 and Win7 x86 launch/import/restart tests.
4. Publish assets only after successful execution; verify download hashes.

### Gate 3 — shop staging, not live billing

1. Import the fresh closed-system snapshot into a separate staging profile.
2. Compare every product stock balance by exported code, not three samples.
3. Run controlled duplicate transactions in old and new systems.
4. Execute the complete TVS hardware matrix and 20 consecutive alignment checks.
5. Demonstrate backup and restore on the shop PC.

### Gate 4 — later management release

Purchases, returns, transfers, credit/distributor ledgers, cloud sync, reports and Admin HQ ship only after their database, security and accounting acceptance tests pass. Until then they should be hidden rather than presented as finished.

## Proof policy going forward

No feature will be called “working” from component existence or a green source assertion. Each release claim must name:

1. exact build Git SHA and file checksum;
2. test layer: unit, database integration, UI, packaged executable or physical hardware;
3. test input/fixture hash;
4. observed output;
5. unresolved limitations;
6. rollback method.
