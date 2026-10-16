import React from 'react';

export default function FunctionKeyFooter({ heldBillsCount, onRestoreHeldBill }) {
  return (
    <div className="bg-slate-900 border-t border-slate-700/80 px-3 py-1.5 flex items-center justify-between text-[11px] font-mono text-slate-400 select-none">
      <div className="flex items-center space-x-3">
        <span className="flex items-center space-x-1">
          <kbd className="bg-slate-800 text-sky-400 px-1 rounded border border-slate-700">F2</kbd>
          <span>Patient</span>
        </span>
        <span className="text-slate-700">|</span>
        <span className="flex items-center space-x-1">
          <kbd className="bg-slate-800 text-sky-400 px-1 rounded border border-slate-700">F3</kbd>
          <span>Doctor</span>
        </span>
        <span className="text-slate-700">|</span>
        <span className="flex items-center space-x-1">
          <kbd className="bg-slate-800 text-amber-400 px-1 rounded border border-slate-700">Enter</kbd>
          <span>Next Field</span>
        </span>
        <span className="text-slate-700">|</span>
        <span className="flex items-center space-x-1">
          <kbd className="bg-slate-800 text-rose-400 px-1 rounded border border-slate-700">Del</kbd>
          <span>Remove Row</span>
        </span>
        <span className="text-slate-700">|</span>
        <span className="flex items-center space-x-1">
          <kbd className="bg-slate-800 text-amber-400 px-1 rounded border border-slate-700">F12</kbd>
          <span>Hold / Park</span>
        </span>
        <span className="text-slate-700">|</span>
        <span className="flex items-center space-x-1">
          <kbd className="bg-slate-800 text-emerald-400 px-1 rounded border border-slate-700">*+</kbd>
          <span>Print Bill</span>
        </span>
      </div>

      <div className="flex items-center space-x-3">
        {heldBillsCount > 0 && (
          <button
            onClick={onRestoreHeldBill}
            className="bg-amber-950 text-amber-300 border border-amber-600 px-2 py-0.5 rounded text-[10px] animate-pulse hover:bg-amber-900"
          >
            ● {heldBillsCount} Parked Bill(s) [F12]
          </button>
        )}
        <span className="text-slate-500 text-[10px]">
          Beta Pharmacy Multi-Store Retail OS
        </span>
      </div>
    </div>
  );
}
