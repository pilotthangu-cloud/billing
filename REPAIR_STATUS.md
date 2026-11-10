# WITHDRAWN — historical 1.0.1-rc.2 checkpoint

**Do not install either rc.2 executable listed below.** This file is retained
only as historical evidence. The current release decision and feature matrix
are in `FULL_RELEASE_AUDIT_2026-11-10.md`; the repaired source line is rc.3 and
must still pass physical printer and target-PC acceptance before packaging.

# 1.0.1-rc.2 repair checkpoint

## rc.2 branch-isolation repair

- A fresh DBF snapshot now replaces batches and stock only for the branch selected on the terminal.
- Importing Main Pharmacy cannot erase Polyclinic batches; importing Polyclinic cannot erase Main batches.
- Products omitted from one branch snapshot are retained when another branch still owns stock or batch evidence.
- Four branch-import regression tests were added. The complete automated run now passes 109 checks.
- The hidden Electron storage smoke test opened the desktop UI, wrote stock `435`, reopened storage, and read `435` back.
- Both packaged applications contain the exact same production JavaScript bundle (SHA-256 `0214659bf295d190baab5e83358993094160f70a5f91675ecd70c7de0b9b3fcd`).

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
- Both rc.2 application archives inspected: expected version and exact tested production bundle,
  compact receipt and storage diagnostics present; x64 machine 0x8664, x86 machine 0x014c.

## Portable artifacts

| Artifact | SHA-256 |
| --- | --- |
| Beta.Pharmacy.POS.1.0.1-rc.1.x64.exe | 8D2885EB11B27E55F5F96E1752AB7C177DF595A4943D434E4D6117C07A55622C |
| Beta.Pharmacy.POS.1.0.1-rc.1.win7-x86.exe | 0F68E71372223BACDD7D01669F2C34C215795ABD1B6D32CAC3C0E5F9D391902E |
| Beta.Pharmacy.POS.1.0.1-rc.2.x64.exe | D6299145B84CBDF353390DE0D98496E12D0041C913920427DBD9CEF7C393EA3A |
| Beta.Pharmacy.POS.1.0.1-rc.2.win7-x86.exe | ED98FC5EBF1CF62EDAFB9F570DAD259D4952EE7629A423D6AB7E9463E09627F0 |

## Still unverified / not implemented in this checkpoint

- Physical TVS feed, tear alignment, and Windows 7 execution/driver compatibility on the shop PC.
- Exact cause of the earlier shop IndexedDB failure; the photo did not include its underlying error.
- Full inventory reconciliation, legacy transaction replay, SQLite migration and concurrent cloud stock ledger.
- Cashier/manager-flow removal, report/accounting certification and server-side authentication hardening.
- Physical offline backup/restore acceptance on the target PC.

This is a release candidate for controlled testing, not a claim that the entire POS is production-certified.
