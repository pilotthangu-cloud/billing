# 1.0.1-rc.1 repair checkpoint

Application source: `5bbdb28` (subsequent website-only download-link changes do not alter the packaged application).

## Confirmed stock discrepancy

The supplied Drive report `RETAILG4/sv051126.txt` lists DOLO 650 at 450 units.
The operator confirmed that 15 tablets were sold after the Drive copy, explaining
the photographed running balance of 435. The imported copy cannot include those
subsequent transactions. Do not automatically subtract 15 from future imports.

For migration, stop legacy billing, close the old program, copy its active data,
and compare stock before committing. Monthly STK filenames select a candidate
snapshot, not proof of a live balance. The import screen now displays provenance,
compares at least three positive-stock products and blocks entered differences.
This is a sample check, not a full inventory audit or transaction replay engine.

## Implemented

- Compact receipts put the footer immediately after items and add two tear-off lines.
  A one-item full-pharmacy receipt is 16 lines rather than 32. Full-form mode remains available.
- Database errors expose the underlying failure, blocked-upgrade instructions and timeout.
- Compatible databases from a newer schema version open without forcing a downgrade.
- Replacement imports remove omitted products in the same transaction as writes.
- A failed clone/write aborts the transaction, preserving prior inventory.
- An empty snapshot batch list cannot inherit a master batch for the whole quantity.
- Duplicate product rows accumulate matching batch quantities and preserve differing expiries.
- Unknown stock quantity fields fail instead of silently zeroing inventory.
- Both import entry points clear stale state and require stock review.

## Verification

- 90 legacy checks passed. These include source assertions and standalone logic checks;
  they are not end-to-end certification.
- 15 behavior tests passed: DBF byte parsing/folder joins, stock comparison, batch totals,
  receipt feed, IndexedDB upgrades, persistence, failure rollback and storage denial.
- Built UI passed a hidden Electron smoke test with isolated storage and network blocked.
  It loaded the UI, exposed the desktop bridge, committed 435 and read back 435.
- Production Vite build passed.
- Both application archives inspected: 1.0.1-rc.1, expected bundle, reconciliation UI,
  compact receipt and storage diagnostics present; x64 machine 0x8664, x86 machine 0x014c.

## Portable artifacts

| Artifact | SHA-256 |
| --- | --- |
| Beta.Pharmacy.POS.1.0.1-rc.1.x64.exe | 8D2885EB11B27E55F5F96E1752AB7C177DF595A4943D434E4D6117C07A55622C |
| Beta.Pharmacy.POS.1.0.1-rc.1.win7-x86.exe | 0F68E71372223BACDD7D01669F2C34C215795ABD1B6D32CAC3C0E5F9D391902E |

## Still unverified / not implemented in this checkpoint

- Physical TVS feed, tear alignment, and Windows 7 execution/driver compatibility on the shop PC.
- Exact cause of the earlier shop IndexedDB failure; the photo did not include its underlying error.
- Full inventory reconciliation, legacy transaction replay, SQLite migration and concurrent cloud stock ledger.
- Cashier/manager-flow removal, report/accounting certification and server-side authentication hardening.
- Physical offline backup/restore acceptance on the target PC.

This is a release candidate for controlled testing, not a claim that the entire POS is production-certified.
