import React, { useMemo, useState } from 'react';
import { reconcileStockSample, stockComparisonCsv } from '../utils/stockReconciliation';

export default function LegacyStockReview({ medicines, summary, onVerified }) {
  const [query, setQuery] = useState('');
  const [balances, setBalances] = useState({});
  const review = useMemo(() => reconcileStockSample(medicines, balances), [medicines, balances]);
  const choices = medicines.filter(m => `${m.code} ${m.name}`.toLowerCase().includes(query.toLowerCase())).slice(0, 8);

  const changeBalance = (code, value) => {
    const next = { ...balances, [code]: value };
    setBalances(next);
    const result = reconcileStockSample(medicines, next);
    onVerified(result.ready ? { checkedAt: new Date().toISOString(), checks: result.checks, scope: 'operator-sample-only' } : null);
  };
  const download = () => {
    const url = URL.createObjectURL(new Blob([stockComparisonCsv(medicines, balances)], { type: 'text/csv;charset=utf-8' }));
    const a = document.createElement('a'); a.href = url; a.download = 'stock-reconciliation.csv'; a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  return <div className="rounded-lg border border-amber-500 p-3 space-y-3 text-xs">
    <strong>Verify stock against the old software before importing</strong>
    <p>Pause billing in the old software. These files contain saved balances; choosing the latest filename does not prove that later transactions are included. Compare at least three different medicines with positive stock. Any difference blocks this import.</p>
    <p>Stock source: <strong>{summary?.stockSource || medicines[0]?.stockProvenance?.source || 'Selected file'}</strong></p>
    {summary?.sourceModifiedAt && <p>File modified: {new Date(summary.sourceModifiedAt).toLocaleString()}</p>}
    <p>{medicines.length.toLocaleString()} products · {medicines.reduce((n, m) => n + Number(m.stock || 0), 0).toLocaleString()} imported units</p>
    <input className="w-full rounded border p-2 bg-white text-black" placeholder="Search a medicine or code to compare" value={query} onChange={e => setQuery(e.target.value)} />
    {query && <div className="space-y-1">{choices.map(m => <button type="button" className="block underline" key={m.code} onClick={() => { changeBalance(m.code, ''); setQuery(''); }}>{m.code} — {m.name} — imported {m.stock}</button>)}</div>}
    {Object.keys(balances).map(code => {
      const check = review.checks.find(c => c.code === code);
      return <div key={code} className="flex flex-wrap items-center gap-2">
        <span>{check.name} ({code}): imported {check.imported}</span>
        <input type="number" min="0" step="any" aria-label={`Old stock for ${code}`} className="w-28 rounded border p-1 bg-white text-black" placeholder="Old POS units" value={balances[code]} onChange={e => changeBalance(code, e.target.value)} />
        <span>{!check.valid ? 'Enter old stock' : check.difference === 0 ? 'Matches' : `DIFFERENCE: ${check.difference > 0 ? '+' : ''}${check.difference}`}</span>
        <button type="button" className="underline" onClick={() => { const next = { ...balances }; delete next[code]; setBalances(next); const result = reconcileStockSample(medicines, next); onVerified(result.ready ? { checkedAt: new Date().toISOString(), checks: result.checks, scope: 'operator-sample-only' } : null); }}>Remove</button>
      </div>;
    })}
    <p>{review.matchedPositive}/3 positive-stock products match. {review.ready ? 'Sample comparison passed; this does not certify every product.' : 'Import remains blocked until the sample matches.'}</p>
    <button type="button" className="underline" onClick={download}>Download full stock comparison CSV</button>
  </div>;
}
