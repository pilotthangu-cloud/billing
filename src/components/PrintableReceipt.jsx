import React from 'react';

export default function PrintableReceipt({ billData, isReprint = false }) {
  if (!billData) return null;

  const {
    billNo,
    date,
    time,
    patientName,
    doctorName,
    paymentMode,
    items = [],
    netPayable = 0
  } = billData;

  const getModeLabel = (mode) => {
    if (mode === 'upi') return 'UPI Bill';
    if (mode === 'credit') return 'Credit Bill';
    return 'Cash Bill';
  };

  return (
    <div 
      id="printable-receipt"
      className="paper-continuous w-[620px] rounded p-4 font-mono text-[11px] leading-[1.35] select-text relative border border-slate-300 bg-white text-slate-900"
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
          <span>Date:{date || new Date().toLocaleDateString('en-GB')}</span>
        </div>

        {/* Prescribed by & Bill No */}
        <div className="flex justify-between text-[10px] leading-tight mb-1">
          <span>Pr by <strong className="uppercase">{doctorName || 'GENERAL OTC'}</strong></span>
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
        <div className="min-h-0 print:min-h-0 space-y-0.5 py-0.5">
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
              <div key={idx} className="grid grid-cols-12 text-[10px] print:text-[9.5px] items-center">
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
        <div className="flex justify-end font-mono font-bold text-xs py-0.5">
          <span className="mr-4 text-slate-500">NET PAYABLE:</span>
          <span className="font-black text-sm">₹{netPayable.toFixed(2)}</span>
        </div>

        {/* Legal Footer & Signatures (Exact Match from Physical Receipt Photo) */}
        <div className="flex justify-between items-start text-[8.5px] font-mono leading-tight pt-1.5 border-t border-dashed border-slate-400 mt-1">
          <div className="space-y-0.5 text-slate-600">
            <div>We undertake to refund any excess collected by oversight. E &.O.E.</div>
            <div>Sale return will be entertained only within 7 days of bill date.</div>
          </div>
          <div className="text-right">
            <div className="h-4"></div>
            <div className="border-t border-slate-400 pt-0.5 font-bold text-slate-800">Signature - Pharmacist</div>
          </div>
        </div>

        {/* Bottom Slogan */}
        <div className="flex justify-between font-mono text-[8.5px] text-slate-500 mt-1 select-none">
          <span>{time || '19:23'}</span>
          <span className="font-bold">** GET WELL SOON **</span>
        </div>
      </div>
    </div>
  );
}
