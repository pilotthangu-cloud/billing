import { isBatchExpired, isExpiryValid, normalizeExpiry } from './billUtils.js';

function expiryScore(value) {
  const [monthText, yearText] = normalizeExpiry(value).split('/');
  const month = Number(monthText);
  let year = Number(yearText);
  if (year < 100) year += 2000;
  return year * 12 + month;
}

/**
 * Produce a side-effect-free FEFO batch transfer plan.
 * Only recorded, unexpired source batches can move between branches.
 */
export function planBatchTransfer(medicine, fromBranchId, toBranchId, requestedQty) {
  const quantity = Number(requestedQty);
  if (!medicine || !fromBranchId || !toBranchId || fromBranchId === toBranchId || !(quantity > 0)) {
    return { success: false, error: 'Invalid branch transfer request.' };
  }

  const batches = Array.isArray(medicine.batches) ? medicine.batches.map(batch => ({ ...batch })) : [];
  const sourceBatches = batches
    .map((batch, index) => ({ batch, index }))
    .filter(({ batch }) =>
      (batch.branch_id || 'MAIN') === fromBranchId &&
      Number(batch.qty ?? batch.stock ?? 0) > 0 &&
      batch.batch_no && isExpiryValid(normalizeExpiry(batch.exp_date)) && !isBatchExpired(batch.exp_date)
    )
    .sort((a, b) => expiryScore(a.batch.exp_date) - expiryScore(b.batch.exp_date));

  const transferableQty = sourceBatches.reduce((sum, entry) => sum + Number(entry.batch.qty ?? entry.batch.stock ?? 0), 0);
  if (transferableQty < quantity) {
    return { success: false, error: `Only ${transferableQty} unit(s) have valid batch/expiry data; ${quantity} requested.`, transferableQty };
  }

  let remaining = quantity;
  const allocations = [];
  for (const { batch, index } of sourceBatches) {
    if (remaining <= 0) break;
    const available = Number(batch.qty ?? batch.stock ?? 0);
    const moved = Math.min(available, remaining);
    batches[index] = { ...batch, qty: available - moved, stock: available - moved };

    const destinationIndex = batches.findIndex(candidate =>
      (candidate.branch_id || 'MAIN') === toBranchId &&
      String(candidate.batch_no || '').trim().toUpperCase() === String(batch.batch_no).trim().toUpperCase() &&
      normalizeExpiry(candidate.exp_date) === normalizeExpiry(batch.exp_date)
    );
    if (destinationIndex >= 0) {
      const destination = batches[destinationIndex];
      const destinationQty = Number(destination.qty ?? destination.stock ?? 0);
      batches[destinationIndex] = { ...destination, qty: destinationQty + moved, stock: destinationQty + moved };
    } else {
      batches.push({ ...batch, branch_id: toBranchId, qty: moved, stock: moved, initial_qty: moved });
    }

    allocations.push({ batchNo: batch.batch_no, expiry: normalizeExpiry(batch.exp_date), qty: moved });
    remaining -= moved;
  }

  const branchTotal = (branchId) => batches
    .filter(batch => (batch.branch_id || 'MAIN') === branchId)
    .reduce((sum, batch) => sum + Number(batch.qty ?? batch.stock ?? 0), 0);

  return {
    success: true,
    batches,
    allocations,
    fromTotal: branchTotal(fromBranchId),
    toTotal: branchTotal(toBranchId)
  };
}
