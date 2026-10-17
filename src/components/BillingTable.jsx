import React from 'react';
import { Trash2, AlertTriangle, Plus, Layers } from 'lucide-react';

export default function BillingTable({ 
  items, 
  onRemoveItem, 
  onOpenSearch 
}) {
  return (
    <div className="flex-1 bg-slate-950 flex flex-col overflow-hidden">
      {/* Table Header */}
      <div className="bg-slate-900 border-b border-slate-800 text-[11px] font-mono uppercase tracking-wider text-slate-400 grid grid-cols-12 gap-2 px-4 py-2.5 select-none">
        <div className="col-span-1 text-center">Sr</div>
        <div className="col-span-4">Product Name & Rack</div>
        <div className="col-span-1 text-center">Mfr</div>
        <div className="col-span-2">Batch / Expiry</div>
        <div className="col-span-2 text-right">M.R.P. / Per</div>
        <div className="col-span-1 text-center">Qty</div>
        <div className="col-span-1 text-right">Value (₹)</div>
      </div>

      {/* Table Content */}
      <div className="flex-1 overflow-y-auto divide-y divide-slate-800/40 font-mono text-xs">
        {items.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center p-8 text-slate-500 select-none">
            <div className="w-12 h-12 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center mb-3 text-sky-400">
              <Plus className="w-6 h-6" />
            </div>
            <p className="text-sm font-medium text-slate-300">No items added to current bill</p>
            <p className="text-xs text-slate-500 mt-1 mb-4">
              Press <kbd className="bg-slate-800 px-2 py-0.5 rounded text-sky-400 border border-slate-700">Space</kbd> or click the button below to search medicine
            </p>
            <button
              onClick={onOpenSearch}
              className="py-2 px-5 bg-sky-600 hover:bg-sky-500 text-white rounded-lg font-bold text-xs shadow-lg shadow-sky-950 flex items-center space-x-2 transition"
            >
              <Plus className="w-4 h-4" />
              <span>Search & Add Medicine (Space)</span>
            </button>
          </div>
        ) : (
          items.map((item, idx) => {
            const isNearExpiry = item.batch.exp_date?.startsWith('10/') || item.batch.exp_date?.startsWith('11/');
            return (
              <div 
                key={idx}
                className="grid grid-cols-12 gap-2 px-4 py-2.5 items-center hover:bg-slate-900/40 text-slate-200 transition-colors group"
              >
                {/* Sr */}
                <div className="col-span-1 text-center text-slate-500 font-mono">
                  {idx + 1}
                </div>

                {/* Product Name + Rack */}
                <div className="col-span-4 font-sans">
                  <div className="flex items-center space-x-2">
                    <span className="font-bold text-slate-100">{item.medicine.name}</span>
                    <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-amber-950/60 text-amber-300 border border-amber-800/60">
                      RACK {item.medicine.rack}
                    </span>
                  </div>
                  {item.medicine.generic && (
                    <div className="text-[11px] text-sky-400/80 font-mono truncate">
                      {item.medicine.generic}
                    </div>
                  )}
                </div>

                {/* Mfr */}
                <div className="col-span-1 text-center text-slate-400 text-[11px] truncate">
                  {item.medicine.company}
                </div>

                {/* Batch & Expiry */}
                <div className="col-span-2">
                  <div className="font-mono text-slate-200 font-medium">
                    {item.batch.batch_no}
                  </div>
                  <div className={`text-[10px] font-mono flex items-center space-x-1 ${
                    isNearExpiry ? 'text-amber-400 font-bold' : 'text-slate-400'
                  }`}>
                    <span>EXP: {item.batch.exp_date}</span>
                    {isNearExpiry && <AlertTriangle className="w-3 h-3 text-amber-400" />}
                  </div>
                </div>

                {/* MRP / Per */}
                <div className="col-span-2 text-right text-slate-300 font-mono">
                  <div>₹{item.batch.mrp.toFixed(2)}</div>
                  <div className="text-[10px] text-slate-500">per {item.batch.per || 10}s</div>
                </div>

                {/* Qty */}
                <div className="col-span-1 text-center font-bold text-sky-300 font-mono text-sm bg-slate-900/60 py-1 rounded border border-slate-800">
                  {item.qty}
                </div>

                {/* Value & Delete */}
                <div className="col-span-1 text-right font-bold text-emerald-400 font-mono text-sm flex items-center justify-end space-x-2">
                  <span>₹{item.totalValue.toFixed(2)}</span>
                  <button
                    onClick={() => onRemoveItem(idx)}
                    className="opacity-0 group-hover:opacity-100 text-rose-400 hover:text-rose-300 p-1 hover:bg-slate-800 rounded transition"
                    title="Remove item (Del)"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
