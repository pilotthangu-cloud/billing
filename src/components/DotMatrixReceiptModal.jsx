import React, { useRef, useEffect } from 'react';
import { Printer, X, FileText, ArrowLeft, Check } from 'lucide-react';

export default function DotMatrixReceiptModal({ 
  isOpen, 
  onClose, 
  billData,
  onNewBill
}) {
  const receiptRef = useRef(null);

  // Unified Print & Complete Action
  const handlePrintAndComplete = () => {
    // 1. Trigger dot-matrix printer
    window.print();
    // 2. Complete and advance to next bill
    onNewBill();
    // 3. Close preview
    onClose();
  };

  // Keyboard navigation inside modal (Enter = Print & Next Bill, Esc = Back to Editing)
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        handlePrintAndComplete();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, billData]);

  if (!isOpen || !billData) return null;

  const {
    billNo,
    date,
    time,
    patientName,
    doctorName,
    paymentMode,
    items,
    grossTotal,
    netPayable
  } = billData;

  const getModeLabel = (mode) => {
    if (mode === 'upi') return 'UPI Bill';
    if (mode === 'credit') return 'Credit Bill';
    return 'Cash Bill';
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto font-sans">
      <div className="bg-slate-900 border border-slate-700 rounded-xl shadow-2xl w-full max-w-3xl overflow-hidden flex flex-col my-auto">
        {/* Modal Top Bar */}
        <div className="bg-slate-950 px-4 py-3 border-b border-slate-800 flex items-center justify-between no-print">
          <div className="flex items-center space-x-2">
            <FileText className="w-4 h-4 text-emerald-400" />
            <h3 className="text-sm font-bold text-slate-100">
              Dot-Matrix Continuous Tractor-Feed Print Preview
            </h3>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800">
              ESC/P 80-Col Ready
            </span>
          </div>

          <div className="flex items-center space-x-2.5">
            {/* Single Unified Primary Action: Print & Next Bill */}
            <button
              onClick={handlePrintAndComplete}
              className="py-1.5 px-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-black flex items-center space-x-1.5 transition shadow cursor-pointer"
              title="Print to Dot-Matrix and open next blank bill (Enter)"
            >
              <Printer className="w-4 h-4" />
              <span>Print & Next Bill (Enter)</span>
            </button>

            {/* Cancel/Close Button: Preserves current bill items! */}
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
              title="Back to Editing (Esc)"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* The Continuous Stationery Canvas */}
        <div className="p-6 bg-slate-950 flex justify-center overflow-x-auto">
          <div 
            id="printable-receipt"
            ref={receiptRef}
            className="paper-continuous w-[620px] rounded p-4 font-mono text-[11px] leading-[1.35] select-text relative border border-slate-300"
          >
            {/* Left Tractor Feed Holes */}
            <div className="absolute left-1.5 top-0 bottom-0 flex flex-col justify-between py-2 select-none pointer-events-none opacity-40 no-print">
              {[...Array(18)].map((_, i) => (
                <div key={i} className="tractor-hole" />
              ))}
            </div>

            {/* Right Tractor Feed Holes */}
            <div className="absolute right-1.5 top-0 bottom-0 flex flex-col justify-between py-2 select-none pointer-events-none opacity-40 no-print">
              {[...Array(18)].map((_, i) => (
                <div key={i} className="tractor-hole" />
              ))}
            </div>

            {/* Receipt Content Body */}
            <div className="px-8 text-slate-900">
              {/* Header */}
              <div className="text-center font-black text-sm tracking-wide mb-0.5">
                BETA PHARMACY
              </div>
              <div className="text-center font-bold text-xs uppercase text-slate-700 mb-1">
                Retail {getModeLabel(paymentMode)}
              </div>
              <div className="flex justify-between text-[10px] border-b border-dashed border-slate-400 pb-1">
                <span>Sadanada Pai Road, Chirakkara, Thalassery</span>
                <span>Tel - 0490-2325049</span>
              </div>
              <div className="flex justify-between text-[10px] mb-2">
                <span>D.L.No. 13/134/20/05, 13/135/21/05</span>
                <span>Mob - 9497172662</span>
              </div>

              {/* Patient / Doctor Meta */}
              <div className="flex justify-between text-[10px] mb-0.5">
                <span>Patient: <strong className="uppercase">{patientName || 'PATIENT'}</strong></span>
                <span>Date: {date} {time}</span>
              </div>
              <div className="flex justify-between text-[10px] mb-1">
                <span>Doctor: <strong className="uppercase">{doctorName || 'GENERAL OTC'}</strong></span>
                <span>Bill No: <strong>#{billNo}</strong></span>
              </div>

              {/* Monospace Separator */}
              <div className="text-slate-500 font-mono text-[10px] select-none">
                -------------------------------------------------------------------------------
              </div>
              <div className="grid grid-cols-12 text-[10px] font-bold py-0.5 uppercase">
                <span className="col-span-1">Sr</span>
                <span className="col-span-4">Product Name</span>
                <span className="col-span-1">Rack</span>
                <span className="col-span-2">Batch</span>
                <span className="col-span-1">Exp</span>
                <span className="col-span-1 text-right">MRP</span>
                <span className="col-span-1 text-center">Qty</span>
                <span className="col-span-1 text-right">Value</span>
              </div>
              <div className="text-slate-500 font-mono text-[10px] select-none">
                -------------------------------------------------------------------------------
              </div>

              {/* Items List */}
              <div className="min-h-[140px] space-y-1 py-1">
                {items.map((it, idx) => (
                  <div key={idx} className="grid grid-cols-12 text-[10px] items-center">
                    <span className="col-span-1">{idx + 1}</span>
                    <span className="col-span-4 font-semibold truncate uppercase">
                      {it.medicine.name}
                    </span>
                    <span className="col-span-1 truncate font-bold text-amber-700">R-{it.medicine.rack}</span>
                    <span className="col-span-2 truncate">{it.batch.batch_no}</span>
                    <span className="col-span-1">{it.batch.exp_date}</span>
                    <span className="col-span-1 text-right font-mono">
                      {(it.batch.mrp / (it.batch.per || 10)).toFixed(1)}
                    </span>
                    <span className="col-span-1 text-center font-bold">{it.qty}</span>
                    <span className="col-span-1 text-right font-bold font-mono">
                      {it.totalValue.toFixed(2)}
                    </span>
                  </div>
                ))}
              </div>

              {/* Monospace Separator */}
              <div className="text-slate-500 font-mono text-[10px] select-none">
                -------------------------------------------------------------------------------
              </div>

              {/* Footer Summary */}
              <div className="space-y-0.5 text-[10px] pt-1">
                <div className="flex justify-between">
                  <span>Gross Total ({items.length} items):</span>
                  <span className="font-mono">₹{grossTotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Payment Method:</span>
                  <span className="font-bold uppercase">{paymentMode}</span>
                </div>
                <div className="flex justify-between text-xs font-bold pt-1 border-t border-dashed border-slate-400">
                  <span>NET PAYABLE:</span>
                  <span className="font-mono text-sm font-black">₹{netPayable.toFixed(2)}</span>
                </div>
              </div>

              <div className="text-center text-[9px] text-slate-500 mt-4 border-t border-slate-300 pt-2 italic">
                Get Well Soon! • Medicines once sold will be taken back only with valid invoice.
              </div>
            </div>
          </div>
        </div>

        {/* Modal Bottom Action Bar */}
        <div className="bg-slate-950 px-4 py-2.5 border-t border-slate-800 flex items-center justify-between text-xs no-print">
          <span className="text-slate-400 font-mono">
            Press <strong>Enter</strong> to Print & Complete, or <strong>Esc</strong> to cancel.
          </span>
          <div className="flex items-center space-x-2">
            <button
              onClick={onClose}
              className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-bold transition flex items-center space-x-1"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Editing (Esc)</span>
            </button>
            <button
              onClick={handlePrintAndComplete}
              className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-black transition shadow flex items-center space-x-1.5"
            >
              <Printer className="w-4 h-4" />
              <span>Print & Next Bill (Enter)</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
