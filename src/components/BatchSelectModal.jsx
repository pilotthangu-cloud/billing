import React, { useState, useEffect, useRef } from 'react';
import { Layers, Calendar, AlertTriangle, Check, X, ShieldAlert } from 'lucide-react';

export default function BatchSelectModal({ 
  isOpen, 
  onClose, 
  medicine, 
  onConfirmAdd 
}) {
  const [selectedBatchIndex, setSelectedBatchIndex] = useState(0);
  const [qty, setQty] = useState(1);
  const qtyInputRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      setSelectedBatchIndex(0);
      setQty(1);
      setTimeout(() => qtyInputRef.current?.focus(), 80);
    }
  }, [isOpen, medicine]);

  if (!isOpen || !medicine) return null;

  const batches = medicine.batches && medicine.batches.length > 0 
    ? medicine.batches 
    : [{
        batch_no: "B" + medicine.code.slice(-4),
        exp_date: "12/27",
        mrp: medicine.mrp,
        per: medicine.per,
        supplier: "THE CAN DRUG HOUSE"
      }];

  const currentBatch = batches[selectedBatchIndex] || batches[0];
  const itemTotal = (currentBatch.mrp / (currentBatch.per || 1)) * qty;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (qty <= 0) return;
    onConfirmAdd({
      medicine,
      batch: currentBatch,
      qty: Number(qty),
      totalValue: itemTotal
    });
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div 
        onKeyDown={handleKeyDown}
        className="bg-slate-900 border border-slate-700 rounded-xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col"
      >
        {/* Header */}
        <div className="bg-slate-950 p-4 border-b border-slate-800 flex items-start justify-between">
          <div>
            <div className="flex items-center space-x-2">
              <h2 className="text-base font-bold text-slate-100">{medicine.name}</h2>
              <span className="text-xs px-2 py-0.5 rounded bg-sky-950 text-sky-400 border border-sky-800 font-mono">
                Rack: {medicine.rack}
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1 font-mono">
              {medicine.company} • HSN: {medicine.hsn} • GST: {medicine.tax_percent}%
            </p>
          </div>
          <button 
            onClick={onClose}
            className="text-slate-400 hover:text-slate-200 p-1 rounded hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          {/* Batches Table (FEFO) */}
          <div>
            <label className="text-[11px] font-mono uppercase tracking-wider text-slate-400 block mb-2">
              Select Batch (FEFO - First Expiry First Out)
            </label>
            <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
              {batches.map((b, idx) => {
                const isSelected = idx === selectedBatchIndex;
                const isNearExpiry = b.exp_date.startsWith('10/') || b.exp_date.startsWith('11/');
                
                return (
                  <div
                    key={idx}
                    onClick={() => setSelectedBatchIndex(idx)}
                    className={`p-2.5 rounded-lg border flex items-center justify-between cursor-pointer transition-all ${
                      isSelected 
                        ? 'bg-sky-950/80 border-sky-500 ring-1 ring-sky-500' 
                        : 'bg-slate-950/50 border-slate-800 hover:bg-slate-800/40'
                    }`}
                  >
                    <div className="flex items-center space-x-3">
                      <div className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center ${
                        isSelected ? 'border-sky-400 bg-sky-400' : 'border-slate-600'
                      }`}>
                        {isSelected && <Check className="w-2.5 h-2.5 text-slate-950" />}
                      </div>
                      <div>
                        <div className="font-mono font-bold text-xs text-slate-200">
                          Batch: {b.batch_no}
                        </div>
                        <div className="text-[11px] text-slate-400">
                          Supplier: {b.supplier || 'THE CAN DRUG HOUSE'}
                        </div>
                      </div>
                    </div>

                    <div className="text-right flex items-center space-x-3">
                      <div>
                        <div className="font-mono text-xs text-slate-200 font-semibold">
                          ₹{b.mrp.toFixed(2)} / {b.per || 10}s
                        </div>
                        <div className={`text-[10px] font-mono flex items-center space-x-1 ${
                          isNearExpiry ? 'text-amber-400 font-bold' : 'text-slate-400'
                        }`}>
                          <Calendar className="w-3 h-3" />
                          <span>EXP: {b.exp_date}</span>
                        </div>
                      </div>
                      {isNearExpiry && (
                        <span className="p-1 rounded bg-amber-950/80 text-amber-300 border border-amber-700 text-[10px]" title="Near Expiry">
                          <AlertTriangle className="w-3 h-3" />
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Quantity & Value Calculation */}
          <div className="grid grid-cols-2 gap-3 bg-slate-950 p-3 rounded-lg border border-slate-800">
            <div>
              <label className="text-[11px] font-mono uppercase text-slate-400 block mb-1">
                Quantity (Units/Tablets)
              </label>
              <input
                ref={qtyInputRef}
                type="number"
                min="1"
                max="999"
                value={qty}
                onChange={(e) => setQty(Math.max(1, parseInt(e.target.value) || 0))}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-slate-100 font-mono text-lg font-bold text-center focus:outline-none focus:border-sky-500"
              />
            </div>

            <div className="flex flex-col justify-center text-right pr-2">
              <span className="text-[10px] font-mono text-slate-400 uppercase">Item Amount</span>
              <span className="text-xl font-bold font-mono text-emerald-400">
                ₹{itemTotal.toFixed(2)}
              </span>
              <span className="text-[10px] text-slate-500 font-mono">
                (Incl. 12% GST)
              </span>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center space-x-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2 px-4 rounded-lg bg-slate-800 text-slate-300 font-medium text-xs hover:bg-slate-700 transition"
            >
              Cancel (Esc)
            </button>
            <button
              type="submit"
              className="flex-1 py-2 px-4 rounded-lg bg-sky-600 text-white font-bold text-xs hover:bg-sky-500 transition shadow-lg shadow-sky-950 flex items-center justify-center space-x-1.5"
            >
              <span>Add to Bill (Enter)</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
