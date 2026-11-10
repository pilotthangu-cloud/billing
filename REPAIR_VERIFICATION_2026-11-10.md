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
- Counter verification runner: **94/94 passed**.
- Combined automated result: **123/123 passed**.
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
