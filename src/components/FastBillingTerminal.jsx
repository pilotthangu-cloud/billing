import React, { useState, useRef, useEffect } from 'react';
import { 
  Search, 
  Trash2, 
  Plus, 
  Minus,
  Layers, 
  Printer, 
  User, 
  PlusCircle,
  PauseCircle,
  CheckCircle2,
  Sparkles,
  ShoppingBag,
  CreditCard,
  Banknote,
  QrCode,
  ShieldAlert,
  ArrowRight,
  Clock,
  ChevronRight,
  AlertCircle,
  Command,
  CornerDownLeft
} from 'lucide-react';
import DoctorSelector from './DoctorSelector';
import MedicineDetailRadar from './MedicineDetailRadar';

export default function FastBillingTerminal({
  theme,
  items,
  setItems,
  medicines,
  billNo,
  billDate,
  patientName,
  setPatientName,
  doctorName,
  setDoctorName,
  paymentMode,
  setPaymentMode,
  heldBillsCount,
  onCompleteBill,
  onHoldBill,
  onRestoreHeldBill,
  onOpenNewMedModal
}) {
  const isDark = theme === 'dark';
  const [searchQuery, setSearchQuery] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [selectedMedIndex, setSelectedMedIndex] = useState(0);

  // Selected item / medicine to inspect in live radar
  const [selectedRowIndex, setSelectedRowIndex] = useState(null);
  const [inspectedMedicine, setInspectedMedicine] = useState(null);

  // Input refs
  const searchInputRef = useRef(null);
  const patientInputRef = useRef(null);
  const dropdownRef = useRef(null);

  // Fast prefix search & scoring algorithm
  const q = searchQuery.trim().toLowerCase();
  let filtered = [];

  if (q.length > 0) {
    const scored = [];
    for (const m of medicines) {
      const name = m.name.toLowerCase();
      const generic = (m.generic || '').toLowerCase();
      const company = (m.company || '').toLowerCase();
      const code = (m.code || '').toLowerCase();

      let score = 0;
      if (name.startsWith(q)) {
        score = 1000 - (name.length - q.length);
      } else {
        const words = name.split(' ');
        if (words.some(w => w.startsWith(q))) {
          score = 500;
        } else if (name.includes(q)) {
          score = 300;
        } else if (generic.startsWith(q)) {
          score = 200;
        } else if (generic.includes(q)) {
          score = 100;
        } else if (company.includes(q) || code.includes(q)) {
          score = 50;
        }
      }

      if (score > 0) {
        if (m.stock_shop1 > 0) score += 20;
        scored.push({ med: m, score });
      }
    }

    scored.sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return a.med.name.localeCompare(b.med.name);
    });

    filtered = scored.slice(0, 30).map(s => s.med);
  }

  // Keyboard navigation inside search dropdown
  const handleSearchKeyDown = (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setIsDropdownOpen(true);
      setSelectedMedIndex((prev) => (prev < filtered.length - 1 ? prev + 1 : prev));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedMedIndex((prev) => (prev > 0 ? prev - 1 : 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filtered[selectedMedIndex]) {
        handleDirectAddMedicine(filtered[selectedMedIndex]);
      }
    } else if (e.key === 'Escape') {
      setIsDropdownOpen(false);
    }
  };

  // Type anywhere on table to activate search
  useEffect(() => {
    const handleGlobalTyping = (e) => {
      const tag = document.activeElement?.tagName?.toLowerCase();
      if (tag === 'input' || tag === 'textarea' || tag === 'select') {
        return;
      }
      if (e.key === '/' || (e.key.length === 1 && /[a-zA-Z0-9]/.test(e.key) && !e.ctrlKey && !e.altKey && !e.metaKey)) {
        e.preventDefault();
        searchInputRef.current?.focus();
        setSearchQuery(e.key === '/' ? '' : e.key);
        setIsDropdownOpen(true);
        setSelectedMedIndex(0);
      }
    };

    window.addEventListener('keydown', handleGlobalTyping);
    return () => window.removeEventListener('keydown', handleGlobalTyping);
  }, []);

  // Global Function key shortcuts inside terminal
  useEffect(() => {
    const handleKeys = (e) => {
      if (e.key === 'F2') {
        e.preventDefault();
        patientInputRef.current?.focus();
        patientInputRef.current?.select();
      }
      if (e.key === 'Delete' && selectedRowIndex !== null && items[selectedRowIndex]) {
        e.preventDefault();
        handleRemoveItem(selectedRowIndex);
      }
      if (e.key === '*' || (e.ctrlKey && e.key === 'Enter') || (e.ctrlKey && e.key === 'p')) {
        if (items.length > 0) {
          e.preventDefault();
          onCompleteBill();
        }
      }
    };
    window.addEventListener('keydown', handleKeys);
    return () => window.removeEventListener('keydown', handleKeys);
  }, [selectedRowIndex, items, onCompleteBill]);

  // Scroll dropdown selection into view
  useEffect(() => {
    if (dropdownRef.current && dropdownRef.current.children[selectedMedIndex]) {
      dropdownRef.current.children[selectedMedIndex].scrollIntoView({
        block: 'nearest',
        behavior: 'smooth'
      });
    }
  }, [selectedMedIndex]);

  // DIRECT ENTER: Clicking or pressing enter instantly adds medicine into bill
  const handleDirectAddMedicine = (med) => {
    const chosenBatch = med.batches && med.batches.length > 0 ? med.batches[0] : {
      batch_no: 'B' + med.code.slice(-4),
      exp_date: '12/27',
      mrp: med.mrp,
      per: med.per || 10
    };

    const qty = med.per || 10;
    const lineVal = (chosenBatch.mrp / (chosenBatch.per || 10)) * qty;
    const newLine = {
      medicine: med,
      batch: chosenBatch,
      qty: Number(qty),
      totalValue: lineVal
    };

    setItems((prev) => [...prev, newLine]);
    setSelectedRowIndex(items.length);
    setInspectedMedicine(med);

    // Reset search
    setSearchQuery('');
    setIsDropdownOpen(false);

    setTimeout(() => {
      searchInputRef.current?.focus();
    }, 40);
  };

  // Quantity Increments & Decrements
  const handleUpdateItemQty = (index, newQty) => {
    const qtyNum = Math.max(1, parseInt(newQty) || 1);
    setItems((prev) => prev.map((item, i) => {
      if (i !== index) return item;
      const val = (item.batch.mrp / (item.batch.per || 10)) * qtyNum;
      return { ...item, qty: qtyNum, totalValue: val };
    }));
  };

  const handleStepQty = (index, delta) => {
    const current = items[index];
    if (!current) return;
    const newQty = Math.max(1, (current.qty || 1) + delta);
    handleUpdateItemQty(index, newQty);
  };

  const handleRemoveItem = (index) => {
    setItems((prev) => prev.filter((_, i) => i !== index));
    if (selectedRowIndex === index) {
      setSelectedRowIndex(null);
      setInspectedMedicine(null);
    }
  };

  // Financial Calculations
  const totalUnits = items.reduce((acc, it) => acc + (it.qty || 0), 0);
  const grossTotal = items.reduce((acc, it) => acc + it.totalValue, 0);
  const gstRate = 0.12;
  const taxableAmount = grossTotal / (1 + gstRate);
  const cgst = (grossTotal - taxableAmount) / 2;
  const sgst = cgst;
  const netPayable = Math.round(grossTotal);
  const roundOff = netPayable - grossTotal;

  // Schedule H/H1 Detection
  const hasScheduledDrugs = items.some(it => it.medicine.schedule && it.medicine.schedule !== 'Normal');

  // Active medicine to inspect in radar
  const activeInspectMed = inspectedMedicine || (selectedRowIndex !== null && items[selectedRowIndex]?.medicine) || (items.length > 0 ? items[items.length - 1].medicine : null);

  return (
    <div className={`flex-1 flex flex-col overflow-hidden font-sans select-none transition-colors ${
      isDark ? 'bg-zinc-950 text-slate-100' : 'bg-slate-50 text-slate-900'
    }`}>
      {/* 1. 2026 Sleek Omnibar Search & Fast Entry Bar */}
      <div className={`px-4 sm:px-6 py-3 border-b shrink-0 ${
        isDark ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-slate-200 shadow-xs'
      }`}>
        <div className="max-w-7xl mx-auto flex items-center space-x-3 relative">
          {/* Smart Omnibar Input */}
          <div className="flex-1 relative">
            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
              <Search className="w-4 h-4" />
            </div>

            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setIsDropdownOpen(e.target.value.trim().length > 0);
                setSelectedMedIndex(0);
              }}
              onFocus={() => {
                if (searchQuery.trim().length > 0) setIsDropdownOpen(true);
              }}
              onKeyDown={handleSearchKeyDown}
              placeholder="Search 24.6k medicines by brand, generic salt (e.g. PACIMOL, AUGMENTIN), or scan barcode..."
              className={`w-full pl-11 pr-24 py-2.5 rounded-2xl border text-sm font-bold transition focus:outline-none focus:ring-2 focus:ring-sky-500 shadow-xs ${
                isDark 
                  ? 'bg-zinc-950 border-zinc-700 text-white placeholder-zinc-500' 
                  : 'bg-slate-50 border-slate-300 text-slate-950 placeholder-slate-400'
              }`}
            />

            {/* Keyboard shortcut hint inside input */}
            <div className="absolute right-3.5 top-1/2 -translate-y-1/2 flex items-center space-x-1.5 pointer-events-none">
              <span className={`text-[10px] font-mono px-2 py-0.5 rounded-md border ${
                isDark ? 'bg-zinc-800 border-zinc-700 text-zinc-400' : 'bg-white border-slate-200 text-slate-400 shadow-xs'
              }`}>
                / or Type
              </span>
            </div>

            {/* 2026 Floating Smart Search Dropdown */}
            {isDropdownOpen && searchQuery.trim().length > 0 && (
              <div 
                ref={dropdownRef}
                className={`absolute left-0 top-full mt-2 w-full rounded-2xl border shadow-2xl z-50 max-h-80 overflow-y-auto divide-y font-sans ${
                  isDark 
                    ? 'bg-zinc-900 border-zinc-700 divide-zinc-800 text-white' 
                    : 'bg-white border-slate-200 divide-slate-100 text-slate-900'
                }`}
              >
                {filtered.length === 0 ? (
                  <div className="p-6 text-center text-slate-500 text-xs font-bold">
                    No medicine found matching "{searchQuery}".
                    <button 
                      onClick={() => {
                        setIsDropdownOpen(false);
                        onOpenNewMedModal();
                      }}
                      className="ml-2 text-sky-600 hover:underline font-black"
                    >
                      + Add New Medicine to Master Catalog
                    </button>
                  </div>
                ) : (
                  filtered.map((med, idx) => {
                    const isSelected = idx === selectedMedIndex;
                    const stock = med.stock_shop1 || 0;
                    const isOut = stock <= 0;

                    return (
                      <div
                        key={med.code + idx}
                        onMouseDown={(e) => {
                          e.preventDefault();
                          handleDirectAddMedicine(med);
                        }}
                        className={`px-4 py-3 flex items-center justify-between cursor-pointer transition ${
                          isSelected
                            ? 'bg-sky-600 text-white font-bold'
                            : isDark ? 'hover:bg-zinc-800' : 'hover:bg-sky-50'
                        }`}
                      >
                        <div className="space-y-0.5">
                          <div className="flex items-center space-x-2">
                            <span className={`text-sm font-black ${
                              isSelected ? 'text-white' : (isDark ? 'text-white' : 'text-slate-950')
                            }`}>
                              {med.name}
                            </span>

                            <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full ${
                              isSelected 
                                ? 'bg-white/20 text-white' 
                                : isDark ? 'bg-zinc-800 text-zinc-300' : 'bg-slate-100 text-slate-700 border border-slate-200'
                            }`}>
                              {med.group_label}
                            </span>

                            {med.schedule && med.schedule !== 'Normal' && (
                              <span className={`text-[9px] font-mono font-black px-1.5 py-0.5 rounded-full ${
                                isSelected ? 'bg-rose-900 text-white' : 'bg-rose-100 text-rose-900 border border-rose-300'
                              }`}>
                                Sched {med.schedule}
                              </span>
                            )}
                          </div>

                          <p className={`text-xs font-bold ${
                            isSelected ? 'text-sky-100' : (isDark ? 'text-sky-300' : 'text-sky-700')
                          }`}>
                            {med.generic || med.company}
                          </p>
                        </div>

                        <div className="flex items-center space-x-3 text-right">
                          {/* Shelf Rack Pill */}
                          <span className={`text-xs font-mono font-black px-2.5 py-1 rounded-xl border ${
                            isSelected
                              ? 'bg-amber-800 text-white border-amber-700'
                              : isDark ? 'bg-amber-950/70 border-amber-800 text-amber-300' : 'bg-amber-50 border-amber-300 text-amber-950'
                          }`}>
                            RACK {med.rack}
                          </span>

                          {/* Price */}
                          <span className={`text-sm font-black font-mono ${
                            isSelected ? 'text-white' : (isDark ? 'text-white' : 'text-slate-950')
                          }`}>
                            ₹{med.mrp.toFixed(2)}
                          </span>

                          {/* Stock Availability Pill */}
                          <span className={`text-xs font-black font-mono px-2.5 py-1 rounded-xl border ${
                            isOut
                              ? (isSelected ? 'bg-rose-900 text-white border-rose-800' : 'bg-rose-50 border-rose-200 text-rose-700')
                              : (isSelected ? 'bg-emerald-800 text-white border-emerald-700' : 'bg-emerald-50 border-emerald-200 text-emerald-800')
                          }`}>
                            {stock} in stock
                          </span>

                          <span className={`hidden sm:inline text-[10px] font-mono px-2 py-0.5 rounded-lg border ${
                            isSelected ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500 border-slate-200'
                          }`}>
                            Enter ↵
                          </span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            )}
          </div>

          {/* Quick Add New Medicine Button */}
          <button
            type="button"
            onClick={onOpenNewMedModal}
            className={`px-3.5 py-2.5 rounded-2xl border text-xs font-bold flex items-center space-x-1.5 transition shrink-0 ${
              isDark 
                ? 'bg-zinc-950 border-zinc-700 text-sky-400 hover:bg-zinc-800' 
                : 'bg-white border-slate-300 text-sky-700 hover:bg-slate-100 shadow-xs'
            }`}
          >
            <PlusCircle className="w-4 h-4 text-sky-600" />
            <span className="hidden md:inline">+ New Medicine</span>
          </button>
        </div>
      </div>

      {/* 2. 2026 Main Asymmetric Cockpit Workspace */}
      <div className="flex-1 overflow-hidden p-4 sm:p-6 grid grid-cols-1 lg:grid-cols-12 gap-5 max-w-7xl mx-auto w-full">
        {/* ================= LEFT / CENTER COLUMN (68% width): CART TABLE ================= */}
        <div className="lg:col-span-8 flex flex-col h-full overflow-hidden space-y-4">
          {/* Active Bill Header Card */}
          <div className={`p-4 rounded-2xl border flex items-center justify-between shrink-0 ${
            isDark ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-slate-200 shadow-xs'
          }`}>
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-xl bg-sky-100 text-sky-800 flex items-center justify-center font-black shrink-0">
                <ShoppingBag className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center space-x-2">
                  <h3 className={`font-black text-sm tracking-tight ${isDark ? 'text-white' : 'text-slate-950'}`}>
                    Active Sales Invoice #{billNo}
                  </h3>
                  <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                    isDark ? 'bg-sky-950 text-sky-300 border border-sky-800' : 'bg-sky-50 text-sky-900 border border-sky-200'
                  }`}>
                    {items.length} Products
                  </span>
                </div>
                <p className={`text-xs ${isDark ? 'text-zinc-400' : 'text-slate-500'} font-medium mt-0.5`}>
                  Date: {billDate} • Counter 01 (Chirakkara)
                </p>
              </div>
            </div>

            {/* Park / Restore Bill Action */}
            <div className="flex items-center space-x-2">
              {heldBillsCount > 0 && (
                <button
                  onClick={onRestoreHeldBill}
                  className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs shadow-xs flex items-center space-x-1 animate-pulse"
                >
                  <PauseCircle className="w-3.5 h-3.5" />
                  <span>Restore {heldBillsCount} Parked (F12)</span>
                </button>
              )}

              <button
                onClick={onHoldBill}
                disabled={items.length === 0}
                className={`px-3 py-1.5 rounded-xl border text-xs font-bold transition flex items-center space-x-1 ${
                  items.length === 0
                    ? 'opacity-40 cursor-not-allowed border-slate-200 text-slate-400'
                    : isDark ? 'bg-zinc-800 border-zinc-700 text-amber-300 hover:bg-zinc-700' : 'bg-amber-50 border-amber-300 text-amber-900 hover:bg-amber-100'
                }`}
                title="Hold / Park current invoice (F12)"
              >
                <PauseCircle className="w-3.5 h-3.5 text-amber-500" />
                <span>Park (F12)</span>
              </button>
            </div>
          </div>

          {/* Interactive Cart Table Card */}
          <div className={`flex-1 rounded-2xl border overflow-hidden flex flex-col ${
            isDark ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-slate-200 shadow-sm'
          }`}>
            {items.length === 0 ? (
              /* 2026 Sleek Empty State Canvas */
              <div className="flex-1 flex flex-col items-center justify-center p-8 text-center space-y-4">
                <div className="w-16 h-16 rounded-2xl bg-sky-50 dark:bg-zinc-800 border border-sky-100 dark:border-zinc-700 flex items-center justify-center text-sky-600 shadow-sm">
                  <Command className="w-8 h-8" />
                </div>
                <div>
                  <h4 className={`text-base font-black ${isDark ? 'text-white' : 'text-slate-950'}`}>
                    Counter 01 Ready for Billing
                  </h4>
                  <p className={`text-xs mt-1 max-w-sm ${isDark ? 'text-zinc-400' : 'text-slate-500'}`}>
                    Type any medicine name or salt above to add items instantly. Press <strong>/</strong> to search, or scan product barcode.
                  </p>
                </div>

                {/* Keyboard Quick Navigation Cheatsheet */}
                <div className="flex flex-wrap items-center justify-center gap-2 pt-2 text-xs font-mono">
                  <span className={`px-2.5 py-1 rounded-lg border font-bold ${isDark ? 'bg-zinc-800 border-zinc-700 text-zinc-300' : 'bg-slate-50 border-slate-200 text-slate-700'}`}>
                    / Search Medicine
                  </span>
                  <span className={`px-2.5 py-1 rounded-lg border font-bold ${isDark ? 'bg-zinc-800 border-zinc-700 text-zinc-300' : 'bg-slate-50 border-slate-200 text-slate-700'}`}>
                    F2 Patient Name
                  </span>
                  <span className={`px-2.5 py-1 rounded-lg border font-bold ${isDark ? 'bg-zinc-800 border-zinc-700 text-zinc-300' : 'bg-slate-50 border-slate-200 text-slate-700'}`}>
                    F3 Doctor
                  </span>
                  <span className={`px-2.5 py-1 rounded-lg border font-bold ${isDark ? 'bg-zinc-800 border-zinc-700 text-zinc-300' : 'bg-slate-50 border-slate-200 text-slate-700'}`}>
                    F12 Hold Bill
                  </span>
                </div>
              </div>
            ) : (
              /* 2026 Interactive Cart Grid */
              <div className="flex-1 overflow-y-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className={`border-b text-[11px] font-black uppercase tracking-wider ${
                      isDark ? 'bg-zinc-950/80 text-zinc-300 border-zinc-800' : 'bg-slate-50 text-slate-700 border-slate-200'
                    }`}>
                      <th className="py-3 px-3 w-10 text-center">#</th>
                      <th className="py-3 px-3">Medicine & Salt Composition</th>
                      <th className="py-3 px-3 text-center w-24">Rack</th>
                      <th className="py-3 px-3 text-center w-24">Batch</th>
                      <th className="py-3 px-3 text-center w-20">Exp</th>
                      <th className="py-3 px-3 text-right w-24">Unit Price</th>
                      <th className="py-3 px-3 text-center w-36">Quantity</th>
                      <th className="py-3 px-3 text-right w-28">Total (₹)</th>
                      <th className="py-3 px-3 text-center w-12"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-inherit">
                    {items.map((item, idx) => {
                      const isSelected = selectedRowIndex === idx;
                      const unitPrice = (item.batch.mrp / (item.batch.per || 10));

                      return (
                        <tr 
                          key={idx}
                          onClick={() => {
                            setSelectedRowIndex(idx);
                            setInspectedMedicine(item.medicine);
                          }}
                          className={`transition cursor-pointer ${
                            isSelected
                              ? (isDark ? 'bg-sky-950/40' : 'bg-sky-50')
                              : (isDark ? 'hover:bg-zinc-800/50' : 'hover:bg-slate-50')
                          }`}
                        >
                          <td className="py-3 px-3 text-center font-bold text-slate-400">{idx + 1}</td>
                          
                          {/* Medicine & Generic Description */}
                          <td className="py-3 px-3">
                            <div className={`font-black text-xs ${isDark ? 'text-white' : 'text-slate-950'}`}>
                              {item.medicine.name}
                            </div>
                            <div className={`text-[10px] font-bold mt-0.5 truncate max-w-xs ${isDark ? 'text-sky-300' : 'text-sky-700'}`}>
                              {item.medicine.generic || item.medicine.company}
                            </div>
                          </td>

                          {/* Shelf Rack Pill */}
                          <td className="py-3 px-3 text-center">
                            <span className={`text-[10px] font-mono font-black px-2 py-0.5 rounded-lg border ${
                              isDark ? 'bg-amber-950/70 border-amber-800 text-amber-300' : 'bg-amber-50 border-amber-300 text-amber-900'
                            }`}>
                              R-{item.medicine.rack}
                            </span>
                          </td>

                          {/* Batch */}
                          <td className="py-3 px-3 text-center font-mono font-bold text-slate-500">
                            {item.batch.batch_no}
                          </td>

                          {/* Expiry */}
                          <td className="py-3 px-3 text-center font-mono font-bold text-slate-600 dark:text-zinc-400">
                            {item.batch.exp_date}
                          </td>

                          {/* Unit MRP */}
                          <td className="py-3 px-3 text-right font-mono font-bold">
                            ₹{unitPrice.toFixed(2)}
                          </td>

                          {/* 2026 Interactive Stepper Quantity */}
                          <td className="py-3 px-3 text-center" onClick={(e) => e.stopPropagation()}>
                            <div className="flex items-center justify-center space-x-1">
                              <button
                                type="button"
                                onClick={() => handleStepQty(idx, -1)}
                                className={`w-7 h-7 rounded-lg border flex items-center justify-center transition font-black ${
                                  isDark ? 'bg-zinc-800 border-zinc-700 text-white hover:bg-zinc-700' : 'bg-slate-100 border-slate-200 text-slate-700 hover:bg-slate-200'
                                }`}
                              >
                                <Minus className="w-3 h-3" />
                              </button>

                              <input
                                type="number"
                                min="1"
                                value={item.qty}
                                onChange={(e) => handleUpdateItemQty(idx, e.target.value)}
                                className={`w-14 py-1 text-center rounded-lg border font-mono font-black text-xs focus:ring-2 focus:ring-sky-500 focus:outline-none ${
                                  isDark ? 'bg-zinc-950 border-zinc-700 text-sky-400' : 'bg-white border-slate-300 text-sky-900 shadow-xs'
                                }`}
                              />

                              <button
                                type="button"
                                onClick={() => handleStepQty(idx, 1)}
                                className={`w-7 h-7 rounded-lg border flex items-center justify-center transition font-black ${
                                  isDark ? 'bg-zinc-800 border-zinc-700 text-white hover:bg-zinc-700' : 'bg-slate-100 border-slate-200 text-slate-700 hover:bg-slate-200'
                                }`}
                              >
                                <Plus className="w-3 h-3" />
                              </button>
                            </div>
                          </td>

                          {/* Line Total */}
                          <td className="py-3 px-3 text-right font-black font-mono text-emerald-600 dark:text-emerald-400 text-sm">
                            ₹{item.totalValue.toFixed(2)}
                          </td>

                          {/* Delete Item */}
                          <td className="py-3 px-3 text-center" onClick={(e) => e.stopPropagation()}>
                            <button
                              onClick={() => handleRemoveItem(idx)}
                              className="text-slate-400 hover:text-rose-600 p-1 rounded-lg transition"
                              title="Delete Item (Del)"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* ================= RIGHT COCKPIT COLUMN (32% width): PRESCRIPTION, RADAR & CHECKOUT ================= */}
        <div className="lg:col-span-4 flex flex-col space-y-4 overflow-y-auto">
          {/* Card 1: Prescription & Patient Meta */}
          <div className={`p-5 rounded-2xl border space-y-4 ${
            isDark ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-slate-200 shadow-sm'
          }`}>
            <div className="flex items-center justify-between">
              <span className={`text-xs font-black uppercase tracking-wider flex items-center space-x-1.5 ${
                isDark ? 'text-zinc-200' : 'text-slate-900'
              }`}>
                <User className="w-3.5 h-3.5 text-sky-600" />
                <span>Customer & Prescription</span>
              </span>
              <span className="text-[10px] font-mono text-slate-400">F2 / F3</span>
            </div>

            {/* Patient Name */}
            <div className="space-y-1">
              <label className="text-[10px] font-mono font-black uppercase text-slate-500">
                Patient Name [F2]
              </label>
              <input
                ref={patientInputRef}
                type="text"
                value={patientName}
                onChange={(e) => setPatientName(e.target.value)}
                placeholder="Walk-in Customer / Patient (Optional)"
                className={`w-full py-2 px-3 rounded-xl border text-xs font-bold focus:outline-none focus:ring-2 focus:ring-sky-500 transition ${
                  isDark ? 'bg-zinc-950 border-zinc-700 text-white placeholder-zinc-500' : 'bg-slate-50 border-slate-300 text-slate-950 placeholder-slate-400'
                }`}
              />
            </div>

            {/* Doctor Selector */}
            <DoctorSelector
              doctorName={doctorName}
              setDoctorName={setDoctorName}
              theme={theme}
            />

            {/* Schedule H / H1 Regulatory Compliance Warning */}
            {hasScheduledDrugs && (
              <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/60 border border-amber-300 dark:border-amber-800 text-amber-900 dark:text-amber-200 text-xs flex items-start space-x-2">
                <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div className="leading-tight">
                  <strong className="block font-black text-[11px]">Schedule H / H1 Drug in Cart:</strong>
                  <span>Doctor prescription details recommended for drug audit compliance.</span>
                </div>
              </div>
            )}

            {/* Payment Mode Segmented Selector */}
            <div className="space-y-1.5 pt-1">
              <label className="text-[10px] font-mono font-black uppercase text-slate-500">
                Payment Channel
              </label>
              <div className={`grid grid-cols-3 gap-1.5 p-1 rounded-xl border ${
                isDark ? 'bg-zinc-950 border-zinc-800' : 'bg-slate-100 border-slate-200'
              }`}>
                {[
                  { id: 'cash', label: 'Cash', icon: Banknote },
                  { id: 'upi', label: 'UPI / QR', icon: QrCode },
                  { id: 'credit', label: 'Credit', icon: CreditCard }
                ].map((m) => {
                  const Icon = m.icon;
                  const isChosen = paymentMode === m.id;
                  return (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => setPaymentMode(m.id)}
                      className={`py-2 rounded-lg text-xs font-bold transition flex items-center justify-center space-x-1.5 ${
                        isChosen
                          ? 'bg-sky-600 text-white shadow-xs'
                          : isDark ? 'text-zinc-400 hover:text-white' : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      <Icon className="w-3.5 h-3.5" />
                      <span>{m.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Card 2: Live Drug Inspector & Stock Radar */}
          <MedicineDetailRadar
            selectedMed={activeInspectMed}
            theme={theme}
          />

          {/* Card 3: Executive Checkout & Final Payment Total */}
          <div className={`p-5 rounded-2xl border space-y-4 ${
            isDark ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-slate-200 shadow-sm'
          }`}>
            <div className="flex items-center justify-between text-xs font-bold text-slate-500">
              <span>Items Total ({items.length} meds, {totalUnits} units)</span>
              <span className="font-mono text-slate-900 dark:text-zinc-100">₹{grossTotal.toFixed(2)}</span>
            </div>

            <div className="flex items-center justify-between text-xs text-slate-500">
              <span>GST Split (CGST 6% + SGST 6%)</span>
              <span className="font-mono text-slate-700 dark:text-zinc-300">₹{(cgst + sgst).toFixed(2)}</span>
            </div>

            {Math.abs(roundOff) > 0.001 && (
              <div className="flex items-center justify-between text-xs text-slate-500">
                <span>Round off adjustment</span>
                <span className="font-mono text-slate-700 dark:text-zinc-300">
                  {roundOff > 0 ? `+${roundOff.toFixed(2)}` : roundOff.toFixed(2)}
                </span>
              </div>
            )}

            {/* Massive 2026 High-Contrast Net Amount */}
            <div className={`p-4 rounded-2xl border text-center ${
              isDark ? 'bg-zinc-950 border-zinc-800' : 'bg-emerald-50/70 border-emerald-200'
            }`}>
              <span className="text-[10px] font-mono uppercase font-black tracking-wider text-emerald-800 dark:text-emerald-400 block">
                Net Payable Amount
              </span>
              <div className="text-4xl font-black font-mono text-emerald-600 dark:text-emerald-400 tracking-tight mt-1">
                ₹{netPayable.toFixed(2)}
              </div>
            </div>

            {/* Primary Action Button: Complete Bill & Print */}
            <button
              onClick={onCompleteBill}
              disabled={items.length === 0}
              className={`w-full py-3.5 px-4 rounded-xl font-black text-sm uppercase transition flex items-center justify-center space-x-2 shadow-lg ${
                items.length === 0
                  ? 'bg-slate-200 dark:bg-zinc-800 text-slate-400 cursor-not-allowed shadow-none'
                  : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-600/25 cursor-pointer active:scale-[0.98]'
              }`}
            >
              <Printer className="w-5 h-5" />
              <span>Print Bill (*+) (Enter)</span>
            </button>
          </div>
        </div>
      </div>

      {/* 3. 2026 Function Key Footer Strip */}
      <footer className={`px-4 sm:px-6 py-2 border-t flex flex-wrap items-center justify-between text-xs font-mono shrink-0 select-none ${
        isDark ? 'bg-zinc-900 border-zinc-800 text-zinc-400' : 'bg-white border-slate-200 text-slate-600'
      }`}>
        <div className="flex flex-wrap items-center gap-3">
          <span className="flex items-center space-x-1.5">
            <kbd className={`px-2 py-0.5 rounded-lg border font-bold text-[10px] ${
              isDark ? 'bg-zinc-800 border-zinc-700 text-sky-400' : 'bg-slate-100 border-slate-300 text-sky-800 shadow-xs'
            }`}>F2</kbd>
            <span>Patient</span>
          </span>

          <span className="flex items-center space-x-1.5">
            <kbd className={`px-2 py-0.5 rounded-lg border font-bold text-[10px] ${
              isDark ? 'bg-zinc-800 border-zinc-700 text-sky-400' : 'bg-slate-100 border-slate-300 text-sky-800 shadow-xs'
            }`}>F3</kbd>
            <span>Doctor</span>
          </span>

          <span className="flex items-center space-x-1.5">
            <kbd className={`px-2 py-0.5 rounded-lg border font-bold text-[10px] ${
              isDark ? 'bg-zinc-800 border-zinc-700 text-amber-400' : 'bg-slate-100 border-slate-300 text-amber-800 shadow-xs'
            }`}>Enter</kbd>
            <span>Add Item</span>
          </span>

          <span className="flex items-center space-x-1.5">
            <kbd className={`px-2 py-0.5 rounded-lg border font-bold text-[10px] ${
              isDark ? 'bg-zinc-800 border-zinc-700 text-rose-400' : 'bg-slate-100 border-slate-300 text-rose-800 shadow-xs'
            }`}>Del</kbd>
            <span>Remove</span>
          </span>

          <span className="flex items-center space-x-1.5">
            <kbd className={`px-2 py-0.5 rounded-lg border font-bold text-[10px] ${
              isDark ? 'bg-zinc-800 border-zinc-700 text-amber-400' : 'bg-slate-100 border-slate-300 text-amber-800 shadow-xs'
            }`}>F12</kbd>
            <span>Hold / Restore</span>
          </span>

          <span className="flex items-center space-x-1.5">
            <kbd className={`px-2 py-0.5 rounded-lg border font-bold text-[10px] ${
              isDark ? 'bg-zinc-800 border-zinc-700 text-emerald-400' : 'bg-slate-100 border-slate-300 text-emerald-800 shadow-xs'
            }`}>*+ / Enter</kbd>
            <span>Print Bill</span>
          </span>
        </div>

        <div className="flex items-center space-x-3 text-[11px]">
          <span className="text-emerald-600 font-bold flex items-center space-x-1">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Counter 01 Active</span>
          </span>
          <span>•</span>
          <span>ESC/P Dot Matrix Ready</span>
        </div>
      </footer>
    </div>
  );
}
