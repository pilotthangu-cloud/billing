const normalizeBranchId = value => String(value || 'MAIN').trim().toUpperCase();

export function replaceBranchBatches(existingBatches, importedBatches, targetBranchId) {
  const target = normalizeBranchId(targetBranchId);
  const preserved = (Array.isArray(existingBatches) ? existingBatches : [])
    .filter(batch => normalizeBranchId(batch?.branch_id) !== target)
    .map(batch => ({ ...batch }));
  const replacement = (Array.isArray(importedBatches) ? importedBatches : [])
    .map(batch => ({ ...batch, branch_id: target }));
  return [...preserved, ...replacement];
}

export function preserveOtherBranchRecord(record, targetStockKey, targetBranchId) {
  if (!record) return null;
  const otherStockKey = targetStockKey === 'stock_shop2' ? 'stock_shop1' : 'stock_shop2';
  const target = normalizeBranchId(targetBranchId);
  const otherBatches = (Array.isArray(record.batches) ? record.batches : [])
    .filter(batch => normalizeBranchId(batch?.branch_id) !== target)
    .map(batch => ({ ...batch }));
  const otherStock = Number(record[otherStockKey] || 0);

  if (otherStock <= 0 && otherBatches.length === 0) return null;

  return {
    ...record,
    stock: 0,
    [targetStockKey]: 0,
    batches: otherBatches
  };
}
