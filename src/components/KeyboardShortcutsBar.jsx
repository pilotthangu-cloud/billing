import React from 'react';
import { Keyboard, Layers, Search, Sparkles, Printer, PauseCircle, Trash2 } from 'lucide-react';

export default function KeyboardShortcutsBar({ 
  heldBillsCount, 
  onRestoreHeldBill 
}) {
  return (
    <footer className="bg-slate-950 border-t border-slate-800/80 px-4 py-2 flex items-center justify-between text-[11px] text-slate-400 select-none">
      <div className="flex items-center space-x-4">
        <span className="flex items-center space-x-1.5">
          <kbd className="bg-slate-900 border border-slate-700 px-1.5 py-0.5 rounded text-sky-400 font-mono font-bold">Space</kbd>
          <span>Search Medicine</span>
        </span>

        <span className="flex items-center space-x-1.5">
          <kbd className="bg-slate-900 border border-slate-700 px-1.5 py-0.5 rounded text-slate-300 font-mono font-bold">Enter</kbd>
          <span>Select / Add</span>
        </span>

        <span className="flex items-center space-x-1.5">
          <kbd className="bg-slate-900 border border-slate-700 px-1.5 py-0.5 rounded text-emerald-400 font-mono font-bold">*+</kbd>
          <span>Save & Print</span>
        </span>

        <span className="flex items-center space-x-1.5">
          <kbd className="bg-slate-900 border border-slate-700 px-1.5 py-0.5 rounded text-amber-400 font-mono font-bold">F12</kbd>
          <span>Hold Bill</span>
        </span>

        <span className="flex items-center space-x-1.5">
          <kbd className="bg-slate-900 border border-slate-700 px-1.5 py-0.5 rounded text-rose-400 font-mono font-bold">Del</kbd>
          <span>Remove Item</span>
        </span>
      </div>

      <div className="flex items-center space-x-3">
        {heldBillsCount > 0 && (
          <button
            onClick={onRestoreHeldBill}
            className="flex items-center space-x-1.5 bg-amber-950/80 text-amber-300 border border-amber-700/80 px-2 py-0.5 rounded-full font-mono text-[10px] animate-pulse hover:bg-amber-900"
          >
            <PauseCircle className="w-3 h-3 text-amber-400" />
            <span>{heldBillsCount} Held Bill(s) Available (F12)</span>
          </button>
        )}
        <span className="text-slate-600 font-mono text-[10px]">
          Beta Pharmacy POS v1.0 • Offline-Ready
        </span>
      </div>
    </footer>
  );
}
