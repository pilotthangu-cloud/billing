import React, { useRef, useEffect, useState } from 'react';
import { 
  Printer, 
  X, 
  FileText, 
  ArrowLeft, 
  Check, 
  History, 
  RefreshCcw, 
  Share2, 
  Download,
  Terminal,
  Cpu
} from 'lucide-react';
import PrintableReceipt from './PrintableReceipt';
import VirtualTvsHardwareInspector from './VirtualTvsHardwareInspector';
import { triggerWhatsAppBillShare } from '../utils/billUtils';
import { formatTvsBillLines, generateTvsEscPosStream } from '../utils/tvsPrinterEngine';
import { idbMarkPrintJob } from '../utils/indexedDb';

export default function DotMatrixReceiptModal({ 
  isOpen, 
  onClose, 
  billData,
  onNewBill,
  isReprint = false,
  recentBills = [],
  onSelectBill
}) {
  const [activeTab, setActiveTab] = useState('receipt'); // 'receipt' | 'inspector'
  const receiptRef = useRef(null);

  const focusSearchBox = () => {
    setTimeout(() => {
      const el = document.getElementById('fast-billing-search-input');
      if (el) {
        el.focus();
        el.select?.();
      }
    }, 60);
  };

  const handleWhatsAppShare = () => {
    if (!billData) return;
    triggerWhatsAppBillShare(billData, billData.customerPhone);
  };

  const handleDownloadPrn = () => {
    if (!billData) return;
    try {
      const stream = generateTvsEscPosStream(billData);
      const blob = new Blob([stream], { type: 'application/octet-stream' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `BILL_${billData.billNo || 'TVS'}.prn`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error('Error generating raw TVS spool:', e);
    }
  };

  // Unified Print Action — close modal first so overlay is gone, print, THEN clear bill
  const handlePrint = async () => {
    // Print first and only advance/close after the Windows spooler confirms it.
    if (window.electronAPI?.isElectron) {
      try {
        const escpBytes = Array.from(generateTvsEscPosStream(billData));
        const rawText = formatTvsBillLines(billData).join('\r\n') + '\r\n';
        const result = await window.electronAPI.printRawTvs({
          printerName: 'TVS MSP 250 Star',
          rawBytes: escpBytes,
          rawText: rawText
        });
        if (!result?.success) {
          throw new Error(result?.error || 'Windows spooler did not confirm the print job.');
        }
        if (billData?.id) await idbMarkPrintJob(billData.id, { success: true });
      } catch (e) {
        console.error('Raw TVS print error:', e);
        if (billData?.id) await idbMarkPrintJob(billData.id, { success: false, error: e.message || 'Printer error' });
        alert(`Printing failed: ${e.message || 'Printer error'}\n\nThe bill remains available for reprint.`);
        return;
      }
    } else {
      onClose();
      await new Promise(resolve => setTimeout(resolve, 80));
      window.print();
    }

    if (window.electronAPI?.isElectron) onClose();

    // ONLY AFTER print completes — advance bill counter (clears bill state)
    if (!isReprint && onNewBill) {
      onNewBill();
    }

    // 5. Refocus search box
    focusSearchBox();
  };

  const handleModalClose = () => {
    onClose();
    focusSearchBox();
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
        handleModalClose();
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
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto font-sans no-print">
      <div className="bg-slate-900 border border-slate-700 rounded-xl shadow-2xl w-full max-w-4xl overflow-hidden flex flex-col my-auto">
        {/* Modal Top Bar */}
        <div className="bg-slate-950 px-4 py-3 border-b border-slate-800 flex items-center justify-between no-print gap-3">
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

            {/* View Mode Switcher */}
            <div className="flex items-center space-x-1 bg-slate-900 p-0.5 rounded-lg border border-slate-800 ml-2">
              <button
                type="button"
                onClick={() => setActiveTab('receipt')}
                className={`px-2.5 py-1 text-xs font-bold rounded-md transition flex items-center space-x-1.5 ${
                  activeTab === 'receipt' 
                    ? 'bg-sky-600 text-white shadow' 
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <FileText className="w-3.5 h-3.5" />
                <span>Paper Preview</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('inspector')}
                className={`px-2.5 py-1 text-xs font-bold rounded-md transition flex items-center space-x-1.5 ${
                  activeTab === 'inspector' 
                    ? 'bg-emerald-600 text-white shadow' 
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Cpu className="w-3.5 h-3.5" />
                <span>TVS Hardware Stream Inspector</span>
              </button>
            </div>
          </div>

          <div className="flex items-center space-x-2">
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

            {/* Raw TVS Spool Download */}
            <button
              onClick={handleDownloadPrn}
              className="py-1.5 px-3 rounded-lg text-xs font-bold flex items-center space-x-1.5 transition shadow cursor-pointer bg-slate-800 hover:bg-slate-700 text-cyan-300 border border-slate-700"
              title="Download direct ESC/P byte spool for TVS MSP 250 Star hardware"
            >
              <Download className="w-3.5 h-3.5" />
              <span>TVS Spool (.prn)</span>
            </button>

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
              onClick={handleModalClose}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
              title="Close (Esc)"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Main Content Area */}
        <div className="p-6 bg-slate-950 flex justify-center overflow-x-auto max-h-[75vh]">
          {activeTab === 'receipt' ? (
            <PrintableReceipt billData={billData} isReprint={isReprint} />
          ) : (
            <div className="w-full">
              <VirtualTvsHardwareInspector 
                billData={billData} 
                onAfterSimulatePrint={() => {
                  if (!isReprint && onNewBill) {
                    onNewBill();
                  }
                  onClose();
                  focusSearchBox();
                }} 
              />
            </div>
          )}
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
              onClick={handleModalClose}
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
