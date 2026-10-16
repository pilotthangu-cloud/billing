import React from 'react';
import { Printer, Pause, Plus, CheckCircle, Calculator } from 'lucide-react';

export default function BillSummaryBar({ 
  items, 
  onOpenSearch, 
  onHoldBill, 
  onCompleteBill 
}) {
  const grossTotal = items.reduce((acc, it) => acc + it.totalValue, 0);
  const gstRate = 0.12;
  const taxableAmount = grossTotal / (1 + gstRate);
  const cgst = (grossTotal - taxableAmount) / 2;
  const sgst = cgst;
  const netPayable = Math.round(grossTotal);
  const roundOff = netPayable - grossTotal;

  return (
    <div className="bg-slate-900 border-t border-slate-800 p-3 select-none">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        {/* Left: Quick Counts & Tax Summary */}
        <div className="flex items-center space-x-6 text-xs font-mono">
          <div className="bg-slate-950 px-3 py-1.5 rounded border border-slate-800">
            <span className="text-slate-500 uppercase text-[10px] block">Items</span>
            <span className="text-slate-200 font-bold text-sm">{items.length} Products</span>
          </div>

          <div className="hidden lg:flex items-center space-x-4 text-slate-400">
            <div>
              <span className="text-[10px] text-slate-500 block">Taxable:</span>
              <span className="text-slate-300 font-medium">₹{taxableAmount.toFixed(2)}</span>
            </div>
            <div>
              <span className="text-[10px] text-slate-500 block">CGST (6%):</span>
              <span className="text-slate-300 font-medium">₹{cgst.toFixed(2)}</span>
            </div>
            <div>
              <span className="text-[10px] text-slate-500 block">SGST (6%):</span>
              <span className="text-slate-300 font-medium">₹{sgst.toFixed(2)}</span>
            </div>
            {Math.abs(roundOff) > 0.001 && (
              <div>
                <span className="text-[10px] text-slate-500 block">Round off:</span>
                <span className="text-slate-300 font-medium">
                  {roundOff > 0 ? `+₹${roundOff.toFixed(2)}` : `-₹${Math.abs(roundOff).toFixed(2)}`}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Center/Right: Actions & Grand Net Payable */}
        <div className="flex items-center space-x-3 ml-auto">
          {/* Add Medicine Button */}
          <button
            onClick={onOpenSearch}
            className="py-2 px-3 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-bold flex items-center space-x-1.5 border border-slate-700 transition"
            title="Press Space"
          >
            <Plus className="w-4 h-4 text-sky-400" />
            <span>Add Item (Space)</span>
          </button>

          {/* Hold Bill */}
          <button
            onClick={onHoldBill}
            disabled={items.length === 0}
            className={`py-2 px-3 rounded-lg text-xs font-medium flex items-center space-x-1.5 border transition ${
              items.length === 0 
                ? 'bg-slate-900 text-slate-600 border-slate-800 cursor-not-allowed' 
                : 'bg-amber-950/60 text-amber-300 border-amber-800 hover:bg-amber-900/60'
            }`}
            title="Hold current bill (F12)"
          >
            <Pause className="w-3.5 h-3.5" />
            <span>Hold (F12)</span>
          </button>

          {/* Net Amount Display */}
          <div className="bg-slate-950 px-4 py-1.5 rounded-lg border border-slate-800 flex flex-col justify-center text-right min-w-[130px]">
            <span className="text-[10px] text-slate-400 font-mono uppercase tracking-wider">Net Payable</span>
            <span className="text-xl font-bold font-mono text-emerald-400">
              ₹{netPayable.toFixed(2)}
            </span>
          </div>

          {/* Complete & Print */}
          <button
            onClick={onCompleteBill}
            disabled={items.length === 0}
            className={`py-2.5 px-5 rounded-lg text-xs font-bold flex items-center space-x-2 transition shadow-lg ${
              items.length === 0 
                ? 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700' 
                : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-950 hover:shadow-emerald-900'
            }`}
            title="Complete & Print (*+ or Enter)"
          >
            <Printer className="w-4 h-4" />
            <span>Print Bill (*+)</span>
          </button>
        </div>
      </div>
    </div>
  );
}
