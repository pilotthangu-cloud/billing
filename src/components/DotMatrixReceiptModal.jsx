import React, { useRef, useEffect } from 'react';
import { Printer, X, FileText, ArrowLeft, Check, History, RefreshCcw } from 'lucide-react';

export default function DotMatrixReceiptModal({ 
  isOpen, 
  onClose, 
  billData,
  onNewBill,
  isReprint = false,
  recentBills = [],
  onSelectBill
}) {
  const receiptRef = useRef(null);

  // Unified Print Action
  const handlePrint = () => {
    // 1. Trigger dot-matrix printer
    window.print();

    // 2. If this was a brand new checkout, advance bill counter
    if (!isReprint && onNewBill) {
      onNewBill();
    }
    // 3. Close preview
    onClose();
  };

  // Keyboard navigation inside modal (Enter = Print, Esc = Back)
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        handlePrint();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, billData, isReprint]);

  if (!isOpen || !billData) return null;

  const {
    billNo,
    date,
    time,
    patientName,
    doctorName,
    paymentMode,
    items = [],
    grossTotal = 0,
    netPayable = 0
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
          <div className="flex items-center space-x-2.5">
            <FileText className={`w-4 h-4 ${isReprint ? 'text-amber-400' : 'text-emerald-400'}`} />
            <h3 className="text-sm font-bold text-slate-100 flex items-center space-x-2">
              <span>{isReprint ? 'Reprint / Recall Duplicate Invoice' : 'Dot-Matrix Tractor-Feed Print Preview'}</span>
              {isReprint && (
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-500 text-black font-black">
                  F7 RECALL
                </span>
              )}
            </h3>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
              ESC/P 80-Col Ready
            </span>
          </div>

          <div className="flex items-center space-x-2.5">
            {/* Quick Bill Selector if multiple recent bills exist */}
            {recentBills && recentBills.length > 1 && onSelectBill && (
              <div className="flex items-center space-x-1 font-mono text-xs">
                <span className="text-[10px] text-slate-400 uppercase font-bold">Recall:</span>
                <select
                  value={billNo}
                  onChange={(e) => {
                    const found = recentBills.find(b => b.billNo === e.target.value);
                    if (found) onSelectBill(found);
                  }}
                  className="bg-slate-800 text-amber-300 border border-slate-700 py-1 px-2 rounded text-xs font-bold"
                >
                  {recentBills.map((b, idx) => (
                    <option key={idx} value={b.billNo}>
                      #{b.billNo} - {b.patientName || 'PATIENT'} (₹{b.netPayable})
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Print Action */}
            <button
              onClick={handlePrint}
              className={`py-1.5 px-4 rounded-lg text-xs font-black flex items-center space-x-1.5 transition shadow cursor-pointer ${
                isReprint
                  ? 'bg-amber-600 hover:bg-amber-500 text-white'
                  : 'bg-emerald-600 hover:bg-emerald-500 text-white'
              }`}
              title={isReprint ? "Reprint duplicate copy (Enter)" : "Print to Dot-Matrix and open next blank bill (Enter)"}
            >
              <Printer className="w-4 h-4" />
              <span>{isReprint ? 'Print Duplicate Copy (Enter)' : 'Print & Next Bill (Enter)'}</span>
            </button>

            {/* Cancel/Close Button */}
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
              title="Close (Esc)"
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

            {/* Receipt Content Body matching Beta Pharmacy Physical Printout */}
            <div className="px-8 text-slate-900 font-mono text-[10px] leading-[1.35]">
              {/* Top Timestamp & Slogan */}
              <div className="flex justify-between font-mono text-[9px] text-slate-500 mb-0.5 select-none">
                <span>{time || '19:22'}</span>
                <span className="font-bold">** GET WELL SOON **</span>
              </div>

              {/* Duplicate Banner if Reprint */}
              {isReprint && (
                <div className="text-center font-black text-[9px] uppercase text-amber-900 bg-amber-100 border border-dashed border-amber-400 py-0.5 my-1 tracking-wider">
                  *** DUPLICATE TAX INVOICE (RE-PRINT / TORN BILL RECALL) ***
                </div>
              )}

              {/* Pharmacy Title (From Physical Bill) */}
              <div className="font-black text-xs tracking-wide">
                BETA PHARMACY ({getModeLabel(paymentMode)})
              </div>

              {/* Address & Tel */}
              <div className="flex justify-between text-[10px] leading-tight">
                <span>Sadanada Pai Road, Chirakkara, Thalassery.</span>
                <span>Tel - 0490-2325049</span>
              </div>

              {/* Drug Licenses & Mobile */}
              <div className="flex justify-between text-[10px] leading-tight">
                <span>D.L.No.13/134/20/05, 13/135/21/05 Dt 30-08-05.</span>
                <span>Mob - 9497172662</span>
              </div>

              {/* Sold to & Date */}
              <div className="flex justify-between text-[10px] leading-tight">
                <span>Sold to <strong className="uppercase">{patientName || '*'}</strong></span>
                <span>Date:{date || '16/10/2026'}</span>
              </div>

              {/* Prescribed by & Bill No */}
              <div className="flex justify-between text-[10px] leading-tight mb-1">
                <span>Pr by <strong className="uppercase">{doctorName || 'Dr.MADHUSUDHANAN T'}</strong></span>
                <span>Bill No.<strong>{billNo}</strong></span>
              </div>

              {/* Monospace Separator */}
              <div className="text-slate-500 font-mono text-[10px] select-none">
                -------------------------------------------------------------------------------
              </div>
              <div className="grid grid-cols-12 text-[10px] font-bold py-0.5 uppercase">
                <span className="col-span-1 text-center">Sr</span>
                <span className="col-span-4">Product</span>
                <span className="col-span-1 text-center">Mfr</span>
                <span className="col-span-2">Batch</span>
                <span className="col-span-1">Expiry</span>
                <span className="col-span-1 text-right">M R P/Per</span>
                <span className="col-span-1 text-right">Qty</span>
                <span className="col-span-1 text-right">Value</span>
              </div>
              <div className="text-slate-500 font-mono text-[10px] select-none">
                -------------------------------------------------------------------------------
              </div>

              {/* Items List */}
              <div className="min-h-[120px] space-y-1 py-1">
                {items.map((it, idx) => {
                  const medName = (it.medicine?.name || it.name || 'MEDICINE').toUpperCase();
                  const isSched = it.medicine?.schedule === 'H' || it.medicine?.schedule === 'H1' || it.schedule === 'H' || it.schedule === 'H1';
                  const mfr = (it.medicine?.company || it.company || 'GEN').slice(0, 4).toUpperCase();
                  const batchNo = (it.batch?.batch_no || it.batchNo || it.batch || 'BN001').toUpperCase();
                  const expDate = it.batch?.exp_date || it.expDate || it.exp || '12/28';
                  const pack = it.batch?.per || it.medicine?.per || it.pack || 10;
                  const mrpVal = it.batch?.mrp || it.mrp || 30;
                  const mrpPer = `${mrpVal.toFixed(2)}/${pack}`;
                  const lineTotal = typeof it.totalValue === 'number' ? it.totalValue : ((it.rate || it.mrp || 10) * it.qty);

                  return (
                    <div key={idx} className="grid grid-cols-12 text-[10px] items-center">
                      <span className="col-span-1 text-center font-bold">{idx + 1}</span>
                      <span className="col-span-4 font-bold truncate">
                        {medName} {isSched && <span className="font-black text-rose-600">*</span>}
                      </span>
                      <span className="col-span-1 text-center truncate text-slate-600">{mfr}</span>
                      <span className="col-span-2 truncate">{batchNo}</span>
                      <span className="col-span-1">{expDate}</span>
                      <span className="col-span-1 text-right font-mono">{mrpPer}</span>
                      <span className="col-span-1 text-right font-bold">{it.qty}</span>
                      <span className="col-span-1 text-right font-bold font-mono">
                        {lineTotal.toFixed(2)}
                      </span>
                    </div>
                  );
                })}
              </div>

              {/* Monospace Separator */}
              <div className="text-slate-500 font-mono text-[10px] select-none">
                -------------------------------------------------------------------------------
              </div>

              {/* Total Value Line */}
              <div className="flex justify-end font-mono font-bold text-xs py-1">
                <span className="mr-4 text-slate-500">NET PAYABLE:</span>
                <span className="font-black text-sm">₹{netPayable.toFixed(2)}</span>
              </div>

              {/* Legal Footer & Signatures (Exact Match from Physical Receipt Photo) */}
              <div className="flex justify-between items-start text-[9px] font-mono leading-tight pt-2 border-t border-dashed border-slate-300">
                <div className="space-y-0.5">
                  <div>We undertake to refund any excess</div>
                  <div>collected by oversight. E &.O.E.</div>
                  <div className="pt-1">Sale return will be entertained only within 7 days of bill date.</div>
                </div>
                <div className="text-right">
                  <div className="h-6"></div>
                  <div className="border-t border-slate-400 pt-0.5 font-bold">Signature - Pharmacist</div>
                </div>
              </div>

              {/* Bottom Slogan */}
              <div className="flex justify-between font-mono text-[9px] text-slate-500 mt-2 select-none">
                <span>{time || '19:23'}</span>
                <span className="font-bold">** GET WELL SOON **</span>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Bottom Action Bar */}
        <div className="bg-slate-950 px-4 py-2.5 border-t border-slate-800 flex items-center justify-between text-xs no-print">
          <span className="text-slate-400 font-mono">
            {isReprint 
              ? 'Press Enter to Print Duplicate copy, or Esc to close.' 
              : 'Press Enter to Print & Complete, or Esc to cancel.'}
          </span>
          <div className="flex items-center space-x-2">
            <button
              onClick={onClose}
              className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-bold transition flex items-center space-x-1"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back (Esc)</span>
            </button>
            <button
              onClick={handlePrint}
              className={`px-4 py-1.5 rounded-lg text-xs font-black transition shadow flex items-center space-x-1.5 ${
                isReprint
                  ? 'bg-amber-600 hover:bg-amber-500 text-white'
                  : 'bg-emerald-600 hover:bg-emerald-500 text-white'
              }`}
            >
              <Printer className="w-4 h-4" />
              <span>{isReprint ? 'Print Duplicate (Enter)' : 'Print & Next Bill (Enter)'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
