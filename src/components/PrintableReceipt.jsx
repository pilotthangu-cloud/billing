import React from 'react';
import { formatTvsBillLines } from '../utils/tvsPrinterEngine';

export default function PrintableReceipt({ billData, isReprint = false }) {
  if (!billData) return null;

  // Generate authentic 80-column x 33-line formatted invoice text for TVS MSP 250 Star
  const lines = formatTvsBillLines(billData);
  const formattedText = lines.join('\n');

  return (
    <div 
      id="printable-receipt"
      className="paper-continuous w-[680px] rounded p-4 font-mono text-[10.5px] leading-[1.2] select-text relative border border-slate-300 bg-white text-slate-900 shadow-xl"
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

      {/* Duplicate Banner if Reprint */}
      {isReprint && (
        <div className="mx-6 text-center font-black text-[9px] uppercase text-amber-900 bg-amber-100 border border-dashed border-amber-400 py-0.5 mb-2 tracking-wider no-print">
          *** DUPLICATE TAX INVOICE (RE-PRINT / TORN BILL RECALL) ***
        </div>
      )}

      {/* Monospace 80-Column Receipt Body */}
      <pre 
        id="printable-receipt-area"
        className="px-6 text-slate-900 font-mono text-[10px] leading-[1.25] overflow-x-auto whitespace-pre selection:bg-amber-200"
      >
        {formattedText}
      </pre>
    </div>
  );
}
