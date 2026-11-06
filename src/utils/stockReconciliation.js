/** Compare imported quantities with balances entered from the paused old POS. */
export function reconcileStockSample(medicines, referenceBalances, minimumChecks = 3) {
  const byCode = new Map(medicines.map(m => [String(m.code), m]));
  const checks = Object.entries(referenceBalances).map(([code, value]) => {
    const medicine = byCode.get(code);
    const expected = value === '' || value == null ? NaN : Number(value);
    const imported = Number(medicine?.stock);
    const valid = Boolean(medicine) && Number.isFinite(expected) && expected >= 0 && Number.isFinite(imported);
    return { code, name: medicine?.name || '', expected, imported, valid, difference: valid ? imported - expected : null };
  });
  const mismatches = checks.filter(check => !check.valid || check.difference !== 0);
  const matchedPositive = checks.filter(check => check.valid && check.difference === 0 && check.expected > 0).length;
  return { checks, mismatches, matchedPositive, ready: mismatches.length === 0 && matchedPositive >= minimumChecks };
}

export function stockComparisonCsv(medicines, referenceBalances) {
  const quote = value => {
    let text = String(value ?? '');
    if (/^[=+@\-]/.test(text)) text = "'" + text;
    return '"' + text.replace(/"/g, '""') + '"';
  };
  const rows = [['Code', 'Medicine', 'Imported units', 'Old POS units', 'Difference', 'Source', 'Issues']];
  for (const m of medicines) {
    const reference = referenceBalances[m.code];
    const hasReference = reference !== undefined && reference !== '';
    rows.push([m.code, m.name, m.stock, hasReference ? reference : '', hasReference ? Number(m.stock) - Number(reference) : '', m.stockProvenance?.source || '', (m.importIssues || []).join('; ')]);
  }
  return '\uFEFF' + rows.map(row => row.map(quote).join(',')).join('\r\n');
}
