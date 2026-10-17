import React, { useEffect, useState } from 'react';
import { X, Search, Sparkles, Check, ArrowRight, Layers, AlertCircle, ShoppingCart } from 'lucide-react';
import { findSubstitutes, extractMoleculeSignature } from '../utils/substituteFinder';

export default function SubstituteRadarModal({
  isOpen,
  onClose,
  targetMedicine,
  allMedicines,
  onSelectSubstitute,
  theme
}) {
  const isDark = theme === 'dark';
  const [selectedIndex, setSelectedIndex] = useState(0);

  const substitutes = targetMedicine ? findSubstitutes(targetMedicine, allMedicines) : [];
  const signature = targetMedicine ? extractMoleculeSignature(targetMedicine) : { salt: '', strength: '' };
  const inStockCount = substitutes.filter(s => (s.stock_shop1 || 0) > 0).length;

  // Keyboard navigation inside modal (Enter = Pick selected, Esc = Close, Up/Down = Navigate)
  useEffect(() => {
    if (!isOpen) return;
    setSelectedIndex(0);

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex(prev => (prev < substitutes.length - 1 ? prev + 1 : prev));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex(prev => (prev > 0 ? prev - 1 : 0));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (substitutes[selectedIndex]) {
          onSelectSubstitute(substitutes[selectedIndex]);
          onClose();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, substitutes, selectedIndex, onClose, onSelectSubstitute]);

  if (!isOpen || !targetMedicine) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4 font-sans select-none">
      <div className={`w-full max-w-2xl rounded-2xl border shadow-2xl overflow-hidden flex flex-col max-h-[85vh] ${
        isDark ? 'bg-zinc-900 border-zinc-700 text-zinc-100' : 'bg-white border-slate-300 text-slate-950'
      }`}>
        {/* Modal Header */}
        <div className={`px-5 py-3.5 border-b flex items-center justify-between ${
          isDark ? 'bg-zinc-800 border-zinc-700' : 'bg-sky-50 border-sky-200'
        }`}>
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-lg bg-sky-600 text-white flex items-center justify-center font-bold">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="font-black text-sm uppercase tracking-wide">
                  Generic Salt & Substitute Radar [MAS008 / SUBSTITU.DBF]
                </h3>
                <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded border ${
                  inStockCount > 0 
                    ? (isDark ? 'bg-emerald-950 text-emerald-300 border-emerald-700' : 'bg-emerald-100 text-emerald-900 border-emerald-300')
                    : (isDark ? 'bg-rose-950 text-rose-300 border-rose-700' : 'bg-rose-100 text-rose-900 border-rose-300')
                }`}>
                  {inStockCount} In-Stock Available
                </span>
              </div>
              <p className={`text-xs font-mono mt-0.5 ${isDark ? 'text-zinc-400' : 'text-slate-600'}`}>
                Therapeutic molecule equivalents sharing the exact same active salt formulation
              </p>
            </div>
          </div>

          <button 
            onClick={onClose}
            className={`p-1.5 rounded-lg transition ${
              isDark ? 'hover:bg-zinc-700 text-zinc-400' : 'hover:bg-slate-200 text-slate-500'
            }`}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Target Medicine Info Strip */}
        <div className={`px-5 py-3 border-b flex items-center justify-between font-mono text-xs ${
          isDark ? 'bg-zinc-950 border-zinc-800' : 'bg-slate-100 border-slate-300'
        }`}>
          <div>
            <span className="text-[10px] font-bold text-slate-500 uppercase block">Selected Medicine</span>
            <div className="flex items-center space-x-2">
              <span className={`text-sm font-black font-sans ${isDark ? 'text-white' : 'text-slate-950'}`}>
                {targetMedicine.name}
              </span>
              <span className={`px-2 py-0.5 rounded text-[11px] font-bold border ${
                (targetMedicine.stock_shop1 || 0) > 0
                  ? (isDark ? 'bg-emerald-950 text-emerald-300 border-emerald-700' : 'bg-emerald-100 text-emerald-900 border-emerald-300')
                  : (isDark ? 'bg-rose-950 text-rose-300 border-rose-700 font-bold' : 'bg-rose-100 text-rose-900 border-rose-300 font-bold')
              }`}>
                {targetMedicine.stock_shop1 || 0} in stock
              </span>
            </div>
            <div className={`text-[11px] font-bold mt-0.5 ${isDark ? 'text-sky-300' : 'text-sky-800'}`}>
              Molecule: {signature.salt ? `${signature.salt} ${signature.strength ? signature.strength + 'mg' : ''}` : (targetMedicine.generic || 'Active Salt')}
            </div>
          </div>

          <div className="text-right">
            <span className="text-[10px] font-bold text-slate-500 uppercase block">Rack Location</span>
            <span className={`px-2.5 py-0.5 rounded font-black text-xs border shadow-xs inline-block ${
              isDark ? 'bg-sky-950/80 text-sky-300 border-sky-600' : 'bg-sky-50 text-sky-800 border-sky-300'
            }`}>
              R-{targetMedicine.rack || 'GN'}
            </span>
            <div className={`font-black text-xs mt-1 ${isDark ? 'text-white' : 'text-slate-950'}`}>
              ₹{(targetMedicine.mrp || 0).toFixed(2)}
            </div>
          </div>
        </div>

        {/* Substitutes List */}
        <div className="flex-1 overflow-y-auto divide-y divide-inherit">
          {substitutes.length === 0 ? (
            <div className="p-8 text-center space-y-2">
              <AlertCircle className="w-8 h-8 text-amber-500 mx-auto" />
              <p className={`font-black text-sm ${isDark ? 'text-white' : 'text-slate-950'}`}>
                No alternate substitutes found in catalog for this formulation.
              </p>
              <p className={`text-xs ${isDark ? 'text-zinc-400' : 'text-slate-500'}`}>
                You can add new generic brands under Product Master [MAS001] or search by salt manually.
              </p>
            </div>
          ) : (
            substitutes.map((sub, idx) => {
              const isSelected = idx === selectedIndex;
              const hasStock = (sub.stock_shop1 || 0) > 0;
              const unitPrice = (sub.mrp || 0) / (sub.per || 10);
              const targetUnitPrice = (targetMedicine.mrp || 0) / (targetMedicine.per || 10);
              const priceDiff = targetUnitPrice > 0 ? (((unitPrice - targetUnitPrice) / targetUnitPrice) * 100).toFixed(0) : 0;

              return (
                <div
                  key={sub.code || idx}
                  onClick={() => {
                    onSelectSubstitute(sub);
                    onClose();
                  }}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  className={`px-5 py-3 flex items-center justify-between cursor-pointer transition ${
                    isSelected
                      ? (isDark ? 'bg-sky-950/70 border-l-4 border-sky-500' : 'bg-sky-50 border-l-4 border-sky-600')
                      : (isDark ? 'hover:bg-zinc-800/70' : 'hover:bg-slate-50')
                  }`}
                >
                  <div className="flex-1 pr-4">
                    <div className="flex items-center space-x-2">
                      <span className={`font-black text-sm font-sans ${
                        isDark ? 'text-white' : 'text-slate-950'
                      }`}>
                        {sub.name}
                      </span>
                      <span className={`text-[10px] font-mono font-bold px-1.5 py-0.2 rounded border ${
                        isDark ? 'bg-zinc-800 text-zinc-300 border-zinc-700' : 'bg-slate-200 text-slate-800 border-slate-300'
                      }`}>
                        {sub.group_label || 'TAB'}
                      </span>
                      <span className={`text-[10px] font-mono px-1.5 py-0.2 rounded ${
                        isDark ? 'bg-indigo-950 text-indigo-300' : 'bg-indigo-100 text-indigo-900'
                      }`}>
                        {sub.matchType}
                      </span>
                    </div>

                    <div className="flex items-center space-x-3 text-[11px] font-mono text-slate-500 mt-1">
                      <span>Mfg: <strong>{sub.company || 'Standard Pharma'}</strong></span>
                      <span>•</span>
                      <span>Pack: <strong>{sub.per || 10}s</strong></span>
                      {Math.abs(priceDiff) > 3 && (
                        <>
                          <span>•</span>
                          <span className={`font-bold ${
                            priceDiff < 0 ? 'text-emerald-600' : 'text-amber-600'
                          }`}>
                            {priceDiff < 0 ? `${Math.abs(priceDiff)}% Cheaper` : `${priceDiff}% Higher`}
                          </span>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Right side: Rack, Stock, MRP & Add Button */}
                  <div className="flex items-center space-x-3 shrink-0 font-mono">
                    {/* Lit Shelf Rack */}
                    <span className={`px-2 py-0.5 rounded font-black text-xs border shadow-xs ${
                      isDark ? 'bg-sky-950/80 text-sky-300 border-sky-600' : 'bg-sky-50 text-sky-800 border-sky-300'
                    }`}>
                      R-{sub.rack || 'GN'}
                    </span>

                    {/* Stock Badge */}
                    <span className={`px-2 py-0.5 rounded text-xs font-black border shadow-xs ${
                      hasStock 
                        ? (isDark ? 'bg-emerald-950 text-emerald-300 border-emerald-700' : 'bg-emerald-50 text-emerald-800 border-emerald-400')
                        : (isDark ? 'bg-rose-950 text-rose-300 border-rose-700 font-bold' : 'bg-rose-50 text-rose-700 border-rose-300 font-bold')
                    }`}>
                      {sub.stock_shop1 || 0} in stock
                    </span>

                    {/* Price */}
                    <span className={`text-xs font-black ${isDark ? 'text-white' : 'text-slate-950'}`}>
                      ₹{(sub.mrp || 0).toFixed(2)}
                    </span>

                    {/* Quick Bill Button */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectSubstitute(sub);
                        onClose();
                      }}
                      className="px-3 py-1.5 bg-sky-600 hover:bg-sky-500 text-white rounded-lg text-xs font-black flex items-center space-x-1 shadow transition"
                    >
                      <ShoppingCart className="w-3.5 h-3.5" />
                      <span>Bill Item (↵)</span>
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Modal Footer */}
        <div className={`px-5 py-2.5 border-t flex items-center justify-between text-xs font-mono ${
          isDark ? 'bg-zinc-950 border-zinc-800 text-zinc-400' : 'bg-slate-100 border-slate-300 text-slate-600'
        }`}>
          <span>Use <strong>↑ / ↓</strong> arrows to navigate, <strong>Enter</strong> to bill substitute, <strong>Esc</strong> to close.</span>
          <button
            onClick={onClose}
            className={`px-3 py-1 rounded font-bold ${
              isDark ? 'hover:bg-zinc-800 text-zinc-300' : 'hover:bg-slate-200 text-slate-700'
            }`}
          >
            Cancel (Esc)
          </button>
        </div>
      </div>
    </div>
  );
}
