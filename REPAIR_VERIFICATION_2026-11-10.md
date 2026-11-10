# Beta Pharmacy POS rc.3 repair verification — 10 November 2026

## Current decision

The core source has been repaired and automated verification passes, but no
desktop installer is released yet. Physical TVS printing, x64 target-PC launch,
Windows 7 x86 launch, and a fresh complete shop DATA comparison remain mandatory
acceptance gates.

## Repairs completed

- Migrated the canonical sales ledger from bill-number-only keys to unique
  `BRANCH:BILL_NUMBER` identities.
- Made medicine deductions, sale, payment, credit due, customer profile, next
  branch sequence, and print job one IndexedDB transaction.
- Added durable print-job status and failure history.
- Made reports/startup read the complete canonical bill database instead of the
  500-bill browser cache.
- Made backup restore replace the core stores in one transaction. Invalid data
  aborts the restore and preserves the existing database.
- Changed medicine creation and editing to commit before showing success.
- Removed fabricated new-medicine batch, expiry, MRP, HSN, tax and schedule
  defaults. Positive opening stock now requires a real batch and expiry.
- Enabled Electron sandbox and web security, disabled production DevTools and
  reload shortcuts, and removed PowerShell execution-policy bypass.
- Encoded printer inputs before inserting them into the fixed native helper.
- Defaulted cloud sync to `LOCAL_ONLY`; no ACTIVE or storage-quota claim is
  shown without explicit configuration and verification.
- Defaulted the release to counter-only mode. Onboarding, cashier/opening-float,
  handover, terminal lock, Admin and unfinished management workflows are blocked.
- Removed the old x64/x86 website download links and replaced them with a
  withdrawn/under-verification notice.
- Kept the earlier DBF metadata and printer-path repairs: unknown legacy fields
  remain unknown, TVS selection cannot fall back to another printer, complete
  byte writes are required, and print attempts time out after 15 seconds.

## Verification evidence

- Node behavior/database suite: **29/29 passed**.
- Counter verification runner: **97/97 passed**.
- Combined automated result: **126/126 passed**.
- Production Vite build: **passed**.
- Source whitespace/error check: **passed**.
- Local UI browser pass: blocked because the isolated in-app browser cannot
  reach the host's localhost server. No UI pass is claimed from that attempt.

## Still requiring real equipment/data

1. Launch a signed x64 build on the pharmacy's actual supported Windows PC.
2. Launch an x86 build on the exact Windows 7 32-bit PC.
3. Import a fresh DATA snapshot copied only after the old POS is closed, then
   compare every product code and quantity against a full old-system export.
4. Print 1, 3, 10 and maximum-line bills, plus 20 consecutive bills, on the
   actual TVS MSP 250. Photograph and measure top/footer/tear alignment.
5. Simulate paper-out/offline printer, restart, reprint, power loss, backup and
   restore on the target PC.

These hardware/data gates cannot be honestly replaced with source assertions.

## Independent recheck later on 10 November 2026

- Re-ran the complete suite from clean `main`: **126/126 passed** after the
  live UI findings were repaired.
- Rebuilt the production web bundle with Vite 6.4.6: passed.
- Reparsed the supplied real `ITEMFILE.DBF` by SHA-256
  `0846BD68B509982B311341DB9C783F0F5C0327482E527454F2EC8602DB315B85`:
  24,684 rows/products, 9,501 opening units, 89 positive-stock products and
  zero negative-stock products. The earlier totals were reproduced exactly.
- Verified the deployed Vercel HTML served the exact then-current local asset
  hash. Live UI inspection then found Admin and unfinished management shortcuts
  still visible even though routing blocked them. A second live pass also found
  patient-history, return, WhatsApp and held-bill controls inside the terminal.
  Both layers were removed from counter-only mode and regression assertions
  were added; deployment must be rechecked after the final push.
- Production dependency audit: **0 known vulnerabilities**.
- Development/packaging audit: six moderate `minimatch` advisories remain inside
  Electron Builder's packaging-only dependency tree. npm proposes a breaking
  Electron Builder downgrade; it was not forced. The non-breaking fixes updated
  Vite to 6.4.6, Electron Builder internals to 26.18.1 and the selector parser.
- Rebuilt current unpacked packages successfully:
  - x64 PE machine `0x8664`, version `1.0.1-rc.3`, executable SHA-256
    `C314277707D93279EA5E1C51E1A2C0E53122790819628D98F0D5E6D911E1CCFD`.
  - Windows 7 x86 PE machine `0x014C`, Electron 22.3.27, version `1.0.1-rc.3`,
    executable SHA-256
    `FE161BC907E4447F7F2432EFAFB61D2F398A43D499D53A85FCBECE710F8F11E2`.
  - Both packages contain the identical application archive SHA-256
    `F5B84AFE8A2F4C46FEB1BF1CE8245455E2E0DAC5B89465424D36E3B37F819993`.
- Both packages remain unsigned. A release installer is still withheld.
