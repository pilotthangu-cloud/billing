import React from 'react';

export default function PrintableCreditNote({ voucherData }) {
  if (!voucherData) return null;

  const {
    creditNoteNo = 'CN-000000',
    originalBillNo = '',
    billDate = '',
    returnDate = new Date().toLocaleDateString('en-GB'),
    returnTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    patientName = 'Customer',
    doctorName = 'GENERAL OTC',
    items = [],
    refundAmount = 0,
    refundMode = 'CASH_REFUND',
    reason = 'Prescription Change / Return',
    store = 'Beta Pharmacy'
  } = voucherData;

  const modeLabel = refundMode === 'CREDIT_NOTE' ? 'Credit Note Voucher (Next Visit)' : 'Cash Refund Paid at Counter';

  return (
    <div 
      id="printable-receipt"
      className="paper-continuous w-[620px] rounded p-4 font-mono text-[11px] leading-[1.35] select-text relative border border-slate-300 bg-white text-slate-900"
    >
      {/* Tractor feed holes for preview */}
      <div className="absolute left-1.5 top-0 bottom-0 flex flex-col justify-between py-2 select-none pointer-events-none opacity-40 no-print">
        {[...Array(18)].map((_, i) => (
          <div key={i} className="tractor-hole" />
        ))}
      </div>
      <div className="absolute right-1.5 top-0 bottom-0 flex flex-col justify-between py-2 select-none pointer-events-none opacity-40 no-print">
        {[...Array(18)].map((_, i) => (
          <div key={i} className="tractor-hole" />
        ))}
      </div>

      <div className="px-8 text-slate-900 font-mono text-[10px] leading-[1.35]">
        {/* Top Header */}
        <div className="flex justify-between font-mono text-[9px] text-slate-500 mb-0.5 select-none">
          <span>{returnTime}</span>
          <span className="font-bold">** SALES RETURN / INVENTORY REVERSAL **</span>
        </div>

        {/* Banner */}
        <div className="text-center font-black text-[10px] uppercase text-rose-900 bg-rose-50 border border-dashed border-rose-300 py-0.5 my-1 tracking-wider">
          *** CREDIT NOTE / REFUND VOUCHER ***
        </div>

        {/* Pharmacy Title */}
        <div className="font-black text-xs tracking-wide">
          {store.toUpperCase()} (CREDIT NOTE SLIP)
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

        {/* Customer & Date */}
        <div className="flex justify-between text-[10px] leading-tight mt-1">
          <span>Customer: <strong className="uppercase">{patientName}</strong></span>
          <span>Return Date: <strong>{returnDate}</strong></span>
        </div>

        {/* Voucher No & Original Bill */}
        <div className="flex justify-between text-[10px] leading-tight">
          <span>Credit Note No: <strong className="font-mono">{creditNoteNo}</strong></span>
          <span>Orig Bill: <strong>#{originalBillNo} {billDate ? `(${billDate})` : ''}</strong></span>
        </div>

        {/* Prescribed By & Reason */}
        <div className="flex justify-between text-[10px] leading-tight">
          <span>Prescribed: <strong className="uppercase">{doctorName}</strong></span>
          <span>Reason: <span className="italic">{reason}</span></span>
        </div>

        <div className="text-slate-500 font-mono text-[10px] select-none my-0.5">
          -------------------------------------------------------------------------------
        </div>
        <div className="grid grid-cols-12 text-[10px] font-bold py-0.5 uppercase">
          <span className="col-span-1 text-center">Sr</span>
          <span className="col-span-5">Returned Item</span>
          <span className="col-span-2 text-center">Batch</span>
          <span className="col-span-1 text-right">MRP/Per</span>
          <span className="col-span-1 text-right">Ret Qty</span>
          <span className="col-span-2 text-right">Refund (₹)</span>
        </div>
        <div className="text-slate-500 font-mono text-[10px] select-none my-0.5">
          -------------------------------------------------------------------------------
        </div>

        {/* Returned Items */}
        <div className="min-h-[50px] space-y-1 py-1">
          {items.map((it, idx) => {
            const unitPrice = it.mrp / (it.per || 10);
            const lineTotal = unitPrice * it.returnQty;
            return (
              <div key={idx} className="grid grid-cols-12 text-[10px] items-center">
                <span className="col-span-1 text-center font-bold">{idx + 1}</span>
                <span className="col-span-5 font-bold truncate">
                  {(it.name || 'MEDICINE').toUpperCase()}
                </span>
                <span className="col-span-2 text-center truncate">{it.batch || 'BN001'}</span>
                <span className="col-span-1 text-right font-mono">₹{it.mrp.toFixed(2)}/{it.per || 10}</span>
                <span className="col-span-1 text-right font-black text-rose-600">{it.returnQty}</span>
                <span className="col-span-2 text-right font-black font-mono">
                  ₹{lineTotal.toFixed(2)}
                </span>
              </div>
            );
          })}
        </div>

        <div className="text-slate-500 font-mono text-[10px] select-none my-0.5">
          -------------------------------------------------------------------------------
        </div>

        {/* Total Refund Value Line */}
        <div className="flex justify-between items-center font-mono py-1">
          <span className="text-[10px] text-slate-600">
            Settlement: <strong className="uppercase">{modeLabel}</strong>
          </span>
          <div className="flex items-center space-x-2">
            <span className="text-slate-600 font-bold">TOTAL REFUND AMOUNT:</span>
            <span className="font-black text-sm text-emerald-700">₹{parseFloat(refundAmount).toFixed(2)}</span>
          </div>
        </div>

        {/* Footer & Signatures */}
        <div className="mt-3 pt-2 border-t border-dashed border-slate-300 text-[9px] font-mono leading-tight space-y-1.5">
          <div className="text-slate-500 italic text-center">
            * Unopened medicines safely verified & reversed to inventory shelf *
          </div>
          <div className="flex justify-between items-end pt-3 text-[10px]">
            <div>Pharmacist Sign: __________________</div>
            <div>Customer Sign: __________________</div>
          </div>
          <div className="text-center font-bold text-[9px] text-slate-400 pt-1">
            ** THANK YOU — BETA PHARMACY **
          </div>
        </div>
      </div>
    </div>
  );
}
