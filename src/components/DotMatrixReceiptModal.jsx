import React, { useRef, useEffect } from 'react';
import { Printer, X, FileText, ArrowLeft, Check, History, RefreshCcw, Share2 } from 'lucide-react';
import PrintableReceipt from './PrintableReceipt';
import { triggerWhatsAppBillShare } from '../utils/billUtils';

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

  const handleWhatsAppShare = () => {
    if (!billData) return;
    triggerWhatsAppBillShare(billData, billData.customerPhone);
  };

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
    billNo
  } = billData;

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

            {/* WhatsApp Bill Action */}
            <button
              onClick={handleWhatsAppShare}
              className="py-1.5 px-3 rounded-lg text-xs font-black flex items-center space-x-1.5 transition shadow cursor-pointer bg-emerald-700 hover:bg-emerald-600 text-white"
              title="Send Digital Invoice on WhatsApp"
            >
              <Share2 className="w-4 h-4" />
              <span>Send WhatsApp</span>
            </button>

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
          <PrintableReceipt billData={billData} isReprint={isReprint} />
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
              onClick={handleWhatsAppShare}
              className="px-3.5 py-1.5 bg-emerald-700 hover:bg-emerald-600 text-white rounded-lg text-xs font-black transition shadow flex items-center space-x-1.5 cursor-pointer"
            >
              <Share2 className="w-3.5 h-3.5" />
              <span>Send WhatsApp</span>
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
