import React from 'react';

export default function AccountingLedgerBar({
  items,
  onHoldBill,
  onCompleteBill
}) {
  const totalQty = items.reduce((acc, it) => acc + (it.qty || 0), 0);
  const grossTotal = items.reduce((acc, it) => acc + it.totalValue, 0);
  const gstRate = 0.12;
  const taxableAmount = grossTotal / (1 + gstRate);
  const cgst = (grossTotal - taxableAmount) / 2;
  const sgst = cgst;
  const netPayable = Math.round(grossTotal);
  const roundOff = netPayable - grossTotal;

  return (
    <div className="bg-slate-800 text-slate-100 border-t border-slate-700 px-4 py-2 flex items-center justify-between select-none">
      {/* Left: Financial Ledger Counts */}
      <div className="flex items-center space-x-6 font-mono text-xs">
        <div className="flex items-baseline space-x-2">
          <span className="text-slate-400 text-[11px] uppercase">Lines:</span>
          <span className="font-bold text-white text-sm">{items.length}</span>
          <span className="text-slate-500">•</span>
          <span className="text-slate-400 text-[11px] uppercase">Units:</span>
          <span className="font-bold text-white text-sm">{totalQty}</span>
        </div>

        <div className="hidden md:flex items-center space-x-4 text-slate-300 text-xs">
          <div>
            <span className="text-slate-500 text-[10px] block uppercase">Taxable</span>
            <span className="tabular-nums font-medium">₹{taxableAmount.toFixed(2)}</span>
          </div>
          <div>
            <span className="text-slate-500 text-[10px] block uppercase">CGST (6%)</span>
            <span className="tabular-nums font-medium">₹{cgst.toFixed(2)}</span>
          </div>
          <div>
            <span className="text-slate-500 text-[10px] block uppercase">SGST (6%)</span>
            <span className="tabular-nums font-medium">₹{sgst.toFixed(2)}</span>
          </div>
          {Math.abs(roundOff) > 0.001 && (
            <div>
              <span className="text-slate-500 text-[10px] block uppercase">R.Off</span>
              <span className="tabular-nums font-medium">
                {roundOff > 0 ? `+${roundOff.toFixed(2)}` : roundOff.toFixed(2)}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Right: Net Amount & Save Actions */}
      <div className="flex items-center space-x-4">
        {/* Hold Bill */}
        <button
          onClick={onHoldBill}
          disabled={items.length === 0}
          className={`px-3 py-1.5 rounded text-xs font-mono font-bold uppercase transition border ${
            items.length === 0
              ? 'bg-slate-900 text-slate-600 border-slate-800 cursor-not-allowed'
              : 'bg-amber-950 text-amber-300 border-amber-700 hover:bg-amber-900'
          }`}
          title="Park bill (F12)"
        >
          Hold Bill [F12]
        </button>

        {/* Big Ledger Total Display */}
        <div className="bg-slate-950 border border-slate-700 px-4 py-1 rounded flex items-baseline space-x-2 text-right">
          <span className="text-slate-400 font-mono text-[10px] uppercase">Net Total:</span>
          <span className="text-xl font-black font-mono text-emerald-400 tabular-nums">
            ₹{netPayable.toFixed(2)}
          </span>
        </div>

        {/* Save & Print */}
        <button
          onClick={onCompleteBill}
          disabled={items.length === 0}
          className={`px-5 py-2 rounded font-mono font-extrabold uppercase text-xs transition shadow flex items-center space-x-2 border ${
            items.length === 0
              ? 'bg-slate-900 text-slate-600 border-slate-800 cursor-not-allowed'
              : 'bg-emerald-600 hover:bg-emerald-500 text-white border-emerald-400 shadow-md'
          }`}
          title="Save and Print (*+ or F10)"
        >
          <span>Save & Print [*+]</span>
        </button>
      </div>
    </div>
  );
}
