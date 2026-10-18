import React, { useState, useRef, useEffect } from 'react';
import { 
  Search, 
  Trash2, 
  Plus, 
  Layers, 
  Printer, 
  User, 
  Phone,
  History,
  PlusCircle,
  PauseCircle,
  CheckCircle2,
  Repeat,
  RotateCcw,
  AlertTriangle,
  Zap,
  Tag
} from 'lucide-react';
import DoctorSelector from './DoctorSelector';
import MedicineDetailRadar from './MedicineDetailRadar';
import SubstituteRadarModal from './SubstituteRadarModal';

export default function FastBillingTerminal({
  theme,
  activeBranch,
  items,
  setItems,
  medicines,
  billNo,
  billDate,
  patientName,
  setPatientName,
  customerPhone = '',
  setCustomerPhone,
  onOpenCustomerHistory,
  doctorName,
  setDoctorName,
  paymentMode,
  setPaymentMode,
  heldBillsCount,
  onCompleteBill,
  onHoldBill,
  onRestoreHeldBill,
  onOpenNewMedModal,
  onReprintLastBill,
  onOpenSalesReturn,
  activeShift,
  staffList = ['Rahul C', 'Suresh Kumar', 'Deepa M', 'Arun K', 'Pooja Nair'],
  onSelectActiveStaff,
  onAddStaff,
  onOpenShiftModal,
  handoverNotice,
  setHandoverNotice
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [selectedMedIndex, setSelectedMedIndex] = useState(0);


  // Active Shop Branch Stock Key (Configured per physical machine)
  const stockKey = activeBranch?.stockKey || 'stock_shop1';

  // Selected Medicine for current entry
  const [activeMedicine, setActiveMedicine] = useState(null);
  const [activeBatch, setActiveBatch] = useState(null);
  const [entryQty, setEntryQty] = useState(10);
  const [selectedRowIndex, setSelectedRowIndex] = useState(null);

  // Option B: Active Salt & Generic Substitute Radar Modal
  const [substituteModalMed, setSubstituteModalMed] = useState(null);

  // Input refs
  const searchInputRef = useRef(null);
  const qtyInputRef = useRef(null);
  const patientInputRef = useRef(null);
  const phoneInputRef = useRef(null);
  const dropdownRef = useRef(null);

  // Strict Prefix Matching & Scoring algorithm
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
        // Highest priority: Medicine brand name starts with typed query (e.g. PAC -> PACIMOL, PACIFAST)
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
        // Bonus for available stock in this shop branch
        const shopStock = m[stockKey] !== undefined ? m[stockKey] : (m.stock_shop1 || 0);
        if (shopStock > 0) score += 20;
        scored.push({ med: m, score });
      }
    }

    scored.sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return a.med.name.localeCompare(b.med.name);
    });

    filtered = scored.slice(0, 35).map(s => s.med);
  }

  // Keyboard navigation inside search
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
        // Direct enter on Enter key
        handleDirectAddMedicine(filtered[selectedMedIndex]);
      }
    } else if (e.key === 'F3') {
      e.preventDefault();
      if (filtered[selectedMedIndex]) {
        setSubstituteModalMed(filtered[selectedMedIndex]);
      }
    } else if (e.key === 'Escape') {
      setIsDropdownOpen(false);
    }
  };

  // Type anywhere on table to activate search
  useEffect(() => {
    const handleGlobalTyping = (e) => {
      // Ignore if user is already typing in an input, textarea, or select
      const tag = document.activeElement?.tagName?.toLowerCase();
      if (tag === 'input' || tag === 'textarea' || tag === 'select') {
        return;
      }
      // If user pressed a single character (letter or digit)
      if (e.key.length === 1 && /[a-zA-Z0-9]/.test(e.key) && !e.ctrlKey && !e.altKey && !e.metaKey) {
        e.preventDefault();
        searchInputRef.current?.focus();
        setSearchQuery(e.key);
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
      if (e.key === 'F3') {
        e.preventDefault();
        // Priority: selected dropdown item > activeMedicine > selected table row medicine > last item in bill
        const target = (isDropdownOpen && filtered[selectedMedIndex]) || 
          activeMedicine || 
          (selectedRowIndex !== null && items[selectedRowIndex]?.medicine) || 
          (items.length > 0 ? items[items.length - 1].medicine : null);
        if (target) {
          setSubstituteModalMed(target);
        }
      }
      if (e.key === 'F4') {
        e.preventDefault();
        if (onOpenCustomerHistory) onOpenCustomerHistory();
      }
      if (e.key === 'F8') {
        e.preventDefault();
        if (onOpenSalesReturn) onOpenSalesReturn();
      }
      if (e.key === 'Delete' && selectedRowIndex !== null && items[selectedRowIndex]) {
        e.preventDefault();
        handleRemoveItem(selectedRowIndex);
      }
      if (e.key === '*' || (e.ctrlKey && e.key === 'p')) {
        if (items.length > 0) {
          e.preventDefault();
          onCompleteBill();
        }
      }
    };
    window.addEventListener('keydown', handleKeys);
    return () => window.removeEventListener('keydown', handleKeys);
  }, [selectedRowIndex, items, onCompleteBill, isDropdownOpen, filtered, selectedMedIndex, activeMedicine, onOpenCustomerHistory, onOpenSalesReturn]);

  // Scroll dropdown selection into view
  useEffect(() => {
    if (dropdownRef.current && dropdownRef.current.children[selectedMedIndex]) {
      dropdownRef.current.children[selectedMedIndex].scrollIntoView({
        block: 'nearest',
        behavior: 'smooth'
      });
    }
  }, [selectedMedIndex]);

  // FEFO (First-Expiry-First-Out) helper
  const parseBatchExpScore = (eStr) => {
    if (!eStr) return 9999;
    const parts = eStr.split('/');
    if (parts.length === 2) {
      const m = parseInt(parts[0], 10) || 12;
      let y = parseInt(parts[1], 10) || 28;
      if (y < 100) y += 2000;
      return y * 12 + m;
    }
    return 9999;
  };

  // DIRECT ENTER: Clicking medicine immediately enters it into the bill table with FEFO sorting!
  const handleDirectAddMedicine = (med) => {
    // FEFO: Sort batches by earliest expiry date first so older stock is dispensed first
    const sortedBatches = med.batches && med.batches.length > 0 
      ? [...med.batches].sort((a, b) => parseBatchExpScore(a.exp_date) - parseBatchExpScore(b.exp_date))
      : [];

    const chosenBatch = sortedBatches.length > 0 ? sortedBatches[0] : {
      batch_no: 'B' + med.code.slice(-4),
      exp_date: '12/27',
      mrp: med.mrp,
      per: med.per || 10
    };

    // Check if near expiry (< 60 days)
    const isShortExpiry = (() => {
      if (!chosenBatch.exp_date) return false;
      const parts = chosenBatch.exp_date.split('/');
      if (parts.length === 2) {
        const m = parseInt(parts[0], 10);
        let y = parseInt(parts[1], 10);
        if (y < 100) y += 2000;
        const now = new Date();
        const monthsLeft = (y - now.getFullYear()) * 12 + (m - (now.getMonth() + 1));
        return monthsLeft <= 2 && monthsLeft >= 0;
      }
      return false;
    })();

    const qty = med.per || 10;
    const lineVal = (chosenBatch.mrp / (chosenBatch.per || 10)) * qty;
    const newLine = {
      medicine: med,
      batch: chosenBatch,
      qty: Number(qty),
      totalValue: lineVal,
      isShortExpiry,
      hasClearanceDiscount: false
    };

    setItems((prev) => [...prev, newLine]);
    setSelectedRowIndex(items.length);

    // Clear search and refocus immediately for fast uninterrupted typing
    setSearchQuery('');
    setIsDropdownOpen(false);
    setActiveMedicine(null);
    setActiveBatch(null);

    setTimeout(() => {
      searchInputRef.current?.focus();
    }, 50);
  };

  // Add line item manually from input bar
  const handleAddLineItem = (e) => {
    if (e) e.preventDefault();
    if (!activeMedicine || !activeBatch || entryQty <= 0) return;

    const lineVal = (activeBatch.mrp / (activeBatch.per || 10)) * entryQty;
    const newLine = {
      medicine: activeMedicine,
      batch: activeBatch,
      qty: Number(entryQty),
      totalValue: lineVal,
      isShortExpiry: false,
      hasClearanceDiscount: false
    };

    setItems((prev) => [...prev, newLine]);
    setSelectedRowIndex(items.length);

    // Reset entry bar
    setActiveMedicine(null);
    setActiveBatch(null);
    setSearchQuery('');
    setEntryQty(10);

    // Focus back on search input
    setTimeout(() => {
      searchInputRef.current?.focus();
    }, 50);
  };

  // Update item quantity directly in the table
  const handleUpdateItemQty = (index, newQty) => {
    const qtyNum = Math.max(1, parseInt(newQty, 10) || 1);
    setItems((prev) => prev.map((item, i) => {
      if (i !== index) return item;
      const baseVal = (item.batch.mrp / (item.batch.per || 10)) * qtyNum;
      const discountMult = item.hasClearanceDiscount ? 0.90 : 1;
      return { ...item, qty: qtyNum, totalValue: +(baseVal * discountMult).toFixed(2) };
    }));
  };

  // 1-Click Toggle 10% Clearance Discount on Short-Expiry item
  const handleToggleClearanceDiscount = (index) => {
    setItems((prev) => prev.map((item, i) => {
      if (i !== index) return item;
      const nextDiscount = !item.hasClearanceDiscount;
      const baseVal = (item.batch.mrp / (item.batch.per || 10)) * (item.qty || 1);
      const discountMult = nextDiscount ? 0.90 : 1;
      return { ...item, hasClearanceDiscount: nextDiscount, totalValue: +(baseVal * discountMult).toFixed(2) };
    }));
  };

  const handleRemoveItem = (index) => {
    setItems((prev) => prev.filter((_, i) => i !== index));
    if (selectedRowIndex === index) setSelectedRowIndex(null);
  };

  // Financial calculations
  const totalQty = items.reduce((acc, it) => acc + (it.qty || 0), 0);
  const grossTotal = items.reduce((acc, it) => acc + it.totalValue, 0);
  const gstRate = 0.12;
  const taxableAmount = grossTotal / (1 + gstRate);
  const cgst = (grossTotal - taxableAmount) / 2;
  const sgst = cgst;
  const netPayable = Math.round(grossTotal);
  const roundOff = netPayable - grossTotal;

  // Statutory Schedule H1 Drug Detection
  const isScheduleH1 = (med) => {
    if (!med) return false;
    if (med.schedule === 'H1' || med.schedule === 'Schedule H1' || med.schedule === 'X') return true;
    const h1Keywords = ['alprazolam', 'clonazepam', 'zolpidem', 'tramadol', 'diazepam', 'cefixime', 'azithromycin', 'ofloxacin', 'levofloxacin', 'meropenem', 'ceftriaxone', 'moxifloxacin', 'lorazepam', 'nitrazepam', 'chlordiazepoxide', 'codeine'];
    const text = ((med.name || '') + ' ' + (med.generic || '')).toLowerCase();
    return h1Keywords.some(kw => text.includes(kw));
  };
  const hasH1Items = items.some(it => isScheduleH1(it.medicine));

  // Medicine to inspect in bottom radar
  const inspectedMed = activeMedicine || (selectedRowIndex !== null && items[selectedRowIndex]?.medicine) || null;

  // Always show at least 12 grid rows like classic pharmacy software.
  // When user adds 12 items, it dynamically expands to 13, 14, 15... automatically!
  const DISPLAY_ROWS = Math.max(12, items.length + 2);

  // Focus search input helper
  const focusSearchInput = () => {
    searchInputRef.current?.focus();
    searchInputRef.current?.select();
  };

  return (
    <div className={`flex-1 flex flex-col overflow-hidden font-sans ${
      theme === 'dark' ? 'bg-zinc-950 text-zinc-100' : 'bg-white text-slate-950'
    }`}>
      {/* Shift Handover Confirmation Notification Banner */}
      {handoverNotice && (
        <div className="bg-emerald-600 text-white px-4 py-2 text-xs font-mono font-bold flex items-center justify-between shadow-md select-none">
          <div className="flex items-center space-x-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-200 shrink-0" />
            <span>✅ {handoverNotice}</span>
          </div>
          <button
            type="button"
            onClick={() => setHandoverNotice && setHandoverNotice(null)}
            className="text-white hover:text-emerald-200 font-bold text-xs cursor-pointer px-2 py-0.5 rounded"
          >
            ✕
          </button>
        </div>
      )}

      {/* 1. Single Compact Unified Prescription & Billing Bar */}
      <div className={`px-3 py-1.5 border-b flex flex-wrap lg:flex-nowrap items-center justify-between gap-2 text-xs select-none ${
        theme === 'dark' ? 'bg-zinc-900 border-zinc-800' : 'bg-slate-100 border-slate-300'
      }`}>
        {/* Left Section: Bill No, Patient Name, Patient Mobile, Doctor */}
        <div className="flex items-center space-x-2 flex-1 min-w-0 flex-wrap sm:flex-nowrap">
          {/* Bill No */}
          <div className="flex items-center space-x-1 font-mono shrink-0">
            <span className="text-slate-500 text-[10px] uppercase font-bold">Bill:</span>
            <span className="font-black text-sky-600 text-xs">{billNo}</span>
            <span className="text-slate-400 text-[10px]">({billDate})</span>
          </div>

          <span className="text-slate-300 dark:text-zinc-700 hidden sm:inline">|</span>

          {/* Patient Name Input (Comfortably Elongated) */}
          <div className={`flex items-center space-x-1.5 border rounded px-2.5 py-1 w-64 lg:w-72 xl:w-80 shrink-0 ${
            theme === 'dark' ? 'bg-zinc-950 border-zinc-700' : 'bg-white border-slate-300 shadow-xs'
          }`}>
            <User className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <span className="text-slate-500 font-mono text-[10px] uppercase font-bold shrink-0">Pt [F2]:</span>
            <input
              ref={patientInputRef}
              type="text"
              value={patientName}
              onChange={(e) => setPatientName(e.target.value)}
              placeholder="Customer Name..."
              className={`w-full bg-transparent font-bold text-xs focus:outline-none ${
                theme === 'dark' ? 'text-zinc-100 placeholder-zinc-600' : 'text-slate-900 placeholder-slate-400'
              }`}
            />
          </div>

          {/* Patient Mobile Input (Comfortably Elongated) */}
          <div className={`flex items-center space-x-1 border rounded px-2.5 py-1 w-52 lg:w-60 shrink-0 ${
            customerPhone && customerPhone.length >= 4 
              ? 'border-sky-500 bg-sky-50/50 dark:bg-sky-950/40' 
              : (theme === 'dark' ? 'bg-zinc-950 border-zinc-700' : 'bg-white border-slate-300 shadow-xs')
          }`}>
            <Phone className="w-3 h-3 text-emerald-600 shrink-0" />
            <span className="text-slate-500 font-mono text-[10px] uppercase font-bold shrink-0">Mob:</span>
            <input
              ref={phoneInputRef}
              type="tel"
              maxLength={10}
              value={customerPhone}
              onChange={(e) => {
                const val = e.target.value.replace(/\D/g, '');
                if (setCustomerPhone) setCustomerPhone(val);
              }}
              placeholder="10-digit..."
              className={`w-full bg-transparent font-mono font-bold text-xs focus:outline-none ${
                theme === 'dark' ? 'text-zinc-100 placeholder-zinc-600' : 'text-slate-900 placeholder-slate-400'
              }`}
            />
            {onOpenCustomerHistory && (
              <button
                type="button"
                onClick={onOpenCustomerHistory}
                className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-bold shrink-0 cursor-pointer transition ${
                  customerPhone && customerPhone.length >= 4
                    ? 'bg-sky-600 text-white hover:bg-sky-500'
                    : (theme === 'dark' ? 'bg-zinc-800 text-sky-400 hover:bg-zinc-700' : 'bg-slate-200 text-sky-700 hover:bg-slate-300')
                }`}
                title="Customer Rx History (F4)"
              >
                F4
              </button>
            )}
          </div>

          {/* Doctor Selector (Comfortably Elongated) */}
          <div className="w-64 lg:w-72 xl:w-80 shrink-0">
            <DoctorSelector
              doctorName={doctorName}
              setDoctorName={setDoctorName}
              theme={theme}
            />
          </div>
        </div>

        {/* Right Section: Payment Mode & Sales Return Actions */}
        <div className="flex items-center space-x-2 shrink-0">

          {/* Payment Mode */}
          <div className="flex items-center space-x-1">
            {['cash', 'upi', 'credit'].map((mode) => (
              <button
                key={mode}
                onClick={() => setPaymentMode(mode)}
                className={`px-2 py-1 rounded font-mono font-bold uppercase text-[10px] transition border cursor-pointer ${
                  paymentMode === mode
                    ? 'bg-sky-600 text-white border-sky-600 shadow'
                    : (theme === 'dark' ? 'border-zinc-700 text-zinc-400 hover:text-white' : 'border-slate-300 text-slate-700 hover:text-slate-950 bg-white')
                }`}
              >
                {mode}
              </button>
            ))}
          </div>

          {/* Sales Return / Credit Note (F8) */}
          {onOpenSalesReturn && (
            <button
              type="button"
              onClick={onOpenSalesReturn}
              className={`px-2 py-1 rounded font-mono font-bold uppercase text-[10px] transition border cursor-pointer flex items-center space-x-1 ${
                theme === 'dark'
                  ? 'border-rose-800 bg-rose-950/60 text-rose-300 hover:bg-rose-900/60'
                  : 'border-rose-300 bg-rose-50 text-rose-800 hover:bg-rose-100 shadow-xs'
              }`}
              title="Sales Return & Credit Note Voucher (F8)"
            >
              <RotateCcw className="w-3 h-3 text-rose-600" />
              <span>Return (F8)</span>
            </button>
          )}
        </div>
      </div>

      {/* Statutory Schedule H1 Warning Banner */}
      {hasH1Items && (
        <div className="bg-amber-600 text-white px-3 py-1.5 text-xs font-mono font-bold flex items-center justify-between shadow-xs select-none">
          <div className="flex items-center space-x-2">
            <AlertTriangle className="w-4 h-4 text-amber-200 shrink-0" />
            <span>⚠️ STATUTORY WARNING: Bill contains SCHEDULE H1 / RESTRICTED DRUG(S). Doctor Reg No & Customer Contact mandatory for Form 35 Drug Register audit.</span>
          </div>
          <span className="text-[10px] bg-amber-900/70 px-2 py-0.5 rounded border border-amber-300 uppercase font-black">
            Form 35 Regulated
          </span>
        </div>
      )}

      {/* 2. Fast Dedicated Medicine Entry Bar */}
      <div className={`p-3 border-b ${
        theme === 'dark' ? 'bg-zinc-900/60 border-zinc-800' : 'bg-slate-50 border-slate-200'
      }`}>
        <div className="flex items-center space-x-2 relative">
          {/* Medicine Search Input */}
          <div className="flex-1 relative">
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">
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
              placeholder="Type medicine name or salt to search (or click medicine in table to add directly)..."
              className={`w-full pl-9 pr-3 py-2 rounded-lg border text-xs font-black transition focus:outline-none focus:ring-2 focus:ring-sky-500 ${
                theme === 'dark'
                  ? 'bg-zinc-950 border-zinc-700 text-white placeholder-zinc-500'
                  : 'bg-white border-slate-400 text-slate-950 placeholder-slate-500 shadow-sm'
              }`}
            />

            {/* Dropdown ONLY opens when there is a search query */}
            {isDropdownOpen && searchQuery.trim().length > 0 && (
              <div 
                ref={dropdownRef}
                className={`absolute left-0 top-full mt-1.5 w-full rounded-lg border shadow-2xl z-50 max-h-72 overflow-y-auto divide-y font-sans ${
                  theme === 'dark' 
                    ? 'bg-zinc-900 border-zinc-700 divide-zinc-800 text-zinc-100' 
                    : 'bg-white border-slate-400 divide-slate-200 text-slate-950 shadow-2xl'
                }`}
              >
                {filtered.length === 0 ? (
                  <div className="p-4 text-center text-slate-700 font-bold text-xs font-mono">
                    No medicines found matching "{searchQuery}".
                    <button 
                      onClick={() => {
                        setIsDropdownOpen(false);
                        onOpenNewMedModal();
                      }}
                      className="ml-2 font-bold text-sky-600 underline"
                    >
                      + Add to Catalog Now
                    </button>
                  </div>
                ) : (
                  filtered.map((med, idx) => {
                    const isSelected = idx === selectedMedIndex;
                    const stock = med[stockKey] !== undefined ? med[stockKey] : (med.stock_shop1 || 0);
                    const isOut = stock <= 0;

                    return (
                      <div
                        key={med.code + idx}
                        onMouseDown={(e) => {
                          e.preventDefault();
                          // Clicking medicine row DIRECTLY adds it into the bill table!
                          handleDirectAddMedicine(med);
                        }}
                        className={`px-3.5 py-2.5 flex items-center justify-between cursor-pointer transition ${
                          isSelected
                            ? 'bg-sky-600 text-white font-bold'
                            : (theme === 'dark' ? 'hover:bg-zinc-800 bg-zinc-900' : 'hover:bg-sky-50 bg-white')
                        }`}
                      >
                        <div>
                          <div className="flex items-center space-x-2">
                            <span className={`text-sm font-black ${
                              isSelected 
                                ? 'text-white' 
                                : (theme === 'dark' ? 'text-white' : 'text-slate-950')
                            }`}>
                              {med.name}
                            </span>

                            <span className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded ${
                              isSelected 
                                ? 'bg-sky-800 text-white' 
                                : (theme === 'dark' ? 'bg-zinc-800 text-zinc-300' : 'bg-slate-200 text-slate-900 border border-slate-300')
                            }`}>
                              {med.group_label}
                            </span>

                            {med.schedule && med.schedule !== 'Normal' && (
                              <span className="text-[9px] font-mono font-bold px-1 rounded bg-purple-900 text-purple-200">
                                {med.schedule}
                              </span>
                            )}
                          </div>

                          <div className={`text-[11px] font-mono font-bold truncate mt-0.5 ${
                            isSelected 
                              ? 'text-sky-100' 
                              : (theme === 'dark' ? 'text-sky-300' : 'text-sky-800')
                          }`}>
                            {med.generic || med.company}
                          </div>
                        </div>

                        <div className="text-right flex items-center space-x-3 justify-end">
                          {/* Inter-Branch Live Stock Indicator (Zero extra queries - in memory) */}
                          <div className="text-right hidden sm:block font-mono text-[10px]">
                            <div>
                              <span className={isSelected ? 'text-sky-200' : 'text-slate-500'}>Shop 1: </span>
                              <strong className={(med.stock_shop1 || 0) > 0 ? (isSelected ? 'text-white' : 'text-emerald-700 dark:text-emerald-400') : 'text-rose-500 font-bold'}>
                                {med.stock_shop1 || 0}
                              </strong>
                              <span className="text-slate-300 dark:text-zinc-700 mx-1">|</span>
                              <span className={isSelected ? 'text-sky-200' : 'text-slate-500'}>Polyclinic: </span>
                              <strong className={(med.stock_shop2 || 0) > 0 ? (isSelected ? 'text-white' : 'text-purple-700 dark:text-purple-400') : 'text-rose-500 font-bold'}>
                                {med.stock_shop2 || 0}
                              </strong>
                            </div>
                            {stock <= 0 && ((stockKey === 'stock_shop1' ? (med.stock_shop2 || 0) : (med.stock_shop1 || 0)) > 0) && (
                              <div className={`text-[9px] font-bold px-1 rounded border inline-block mt-0.5 ${
                                isSelected 
                                  ? 'bg-purple-900 text-purple-200 border-purple-400' 
                                  : 'bg-purple-100 text-purple-900 border-purple-300 dark:bg-purple-950 dark:text-purple-300'
                              }`}>
                                ↳ In Stock at {stockKey === 'stock_shop1' ? 'Polyclinic' : 'Beta Pharmacy'}
                              </div>
                            )}
                          </div>

                          <span className={`font-mono text-xs px-2 py-0.5 rounded font-black ${
                            isSelected 
                              ? 'bg-sky-800 text-white' 
                              : (theme === 'dark' ? 'bg-amber-950 text-amber-300 border border-amber-600' : 'bg-amber-100 text-amber-950 border border-amber-400')
                          }`}>
                            RACK {med.rack}
                          </span>

                          <span className={`font-mono text-xs font-black ${
                            isSelected ? 'text-white' : (theme === 'dark' ? 'text-zinc-100' : 'text-slate-950')
                          }`}>
                            ₹{med.mrp.toFixed(2)}
                          </span>

                          <span className={`font-mono px-2 py-0.5 rounded text-xs font-black ${
                            isOut
                              ? (isSelected ? 'bg-rose-900 text-white' : 'bg-rose-100 text-rose-900 border border-rose-300')
                              : (isSelected ? 'bg-emerald-800 text-white' : 'bg-emerald-100 text-emerald-900 border border-emerald-300')
                          }`}>
                            {stock} in stock
                          </span>

                          {/* Option B: 1-Click Find In-Stock Substitutes Button */}
                          <button
                            type="button"
                            onMouseDown={(e) => {
                              e.stopPropagation();
                              e.preventDefault();
                              setSubstituteModalMed(med);
                            }}
                            className={`px-2 py-0.5 rounded text-[10px] font-black uppercase flex items-center space-x-1 transition shadow-xs border ${
                              isOut
                                ? 'bg-amber-500 hover:bg-amber-600 text-white border-amber-600 animate-pulse'
                                : (isSelected 
                                    ? 'bg-sky-800 text-white border-sky-400' 
                                    : (theme === 'dark' ? 'bg-sky-950 text-sky-300 border-sky-700 hover:bg-sky-900' : 'bg-sky-50 text-sky-900 border-sky-300 hover:bg-sky-100'))
                            }`}
                            title="Find active salt & generic substitutes (F3)"
                          >
                            <Repeat className="w-3 h-3 text-amber-200" />
                            <span>{isOut ? 'Find In-Stock Subs (F3)' : 'Subs'}</span>
                          </button>

                          {/* 1-Click Enter Pill */}
                          <span className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded border ${
                            isSelected 
                              ? 'bg-white text-sky-900 border-white' 
                              : (theme === 'dark' ? 'bg-zinc-800 text-sky-400 border-zinc-700' : 'bg-sky-50 text-sky-700 border-sky-300')
                          }`}>
                            Click to Add ↵
                          </span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            )}
          </div>

          {/* Active Shelf Rack Tag */}
          {activeMedicine && (
            <div className={`px-3 py-2 rounded-lg font-mono font-black text-xs border flex items-center space-x-1 shadow-xs ${
              theme === 'dark' 
                ? 'bg-sky-950/80 text-sky-300 border-sky-600' 
                : 'bg-sky-50 text-sky-800 border-sky-300'
            }`}>
              <Layers className="w-3.5 h-3.5 text-sky-600" />
              <span>RACK {activeMedicine.rack}</span>
            </div>
          )}

          {/* Quantity Input */}
          <div className="w-28 relative flex items-center">
            <span className="absolute left-2.5 text-[10px] font-mono font-bold text-slate-400 select-none pointer-events-none">
              QTY:
            </span>
            <input
              ref={qtyInputRef}
              type="number"
              min="1"
              value={entryQty}
              onChange={(e) => setEntryQty(Math.max(1, parseInt(e.target.value) || 0))}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleAddLineItem(e);
                }
              }}
              title="Quantity to add (e.g. 10 for standard strip)"
              placeholder="Qty"
              className={`w-full py-2 pl-9 pr-2 text-center rounded-lg border font-mono font-black text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 ${
                theme === 'dark'
                  ? 'bg-zinc-950 border-zinc-700 text-white'
                  : 'bg-white border-slate-400 text-slate-950 shadow-sm'
              }`}
            />
          </div>

          {/* Add Item Button */}
          <button
            onClick={handleAddLineItem}
            disabled={!activeMedicine}
            className={`px-4 py-2 rounded-lg font-bold text-xs flex items-center space-x-1.5 transition ${
              activeMedicine
                ? 'bg-sky-600 hover:bg-sky-500 text-white shadow'
                : 'bg-slate-200 dark:bg-zinc-800 text-slate-400 cursor-not-allowed'
            }`}
          >
            <Plus className="w-4 h-4" />
            <span>Add (Enter)</span>
          </button>

          {/* + Add New Medicine Button */}
          <button
            type="button"
            onClick={onOpenNewMedModal}
            className={`py-2 px-3 rounded-lg border text-xs font-bold font-mono flex items-center space-x-1 transition ${
              theme === 'dark' 
                ? 'border-zinc-700 bg-zinc-900 hover:bg-zinc-800 text-sky-400' 
                : 'border-slate-300 bg-white hover:bg-slate-100 text-sky-700 shadow-sm'
            }`}
            title="Add a new medicine to Master Catalog"
          >
            <PlusCircle className="w-4 h-4 text-sky-600" />
            <span>+ New Med</span>
          </button>
        </div>
      </div>

      {/* 3. The Full Structured Table Grid (12 Rows with Grid Lines - Never a blank hole!) */}
      <div className="flex-1 overflow-y-auto">
        <table className={`w-full text-left border-collapse text-xs font-mono border ${
          theme === 'dark' ? 'border-zinc-800' : 'border-slate-300'
        }`}>
          <thead>
            <tr className={`border-b text-[11px] uppercase tracking-wider font-extrabold ${
              theme === 'dark' 
                ? 'bg-zinc-900 border-zinc-800 text-zinc-300' 
                : 'bg-slate-200 border-slate-300 text-slate-900'
            }`}>
              <th className="py-2 px-3 text-center w-12 border-r border-inherit">Sr</th>
              <th className="py-2 px-3 border-r border-inherit cursor-pointer" onClick={focusSearchInput}>
                Product Description & Salt Composition
              </th>
              <th className="py-2 px-3 text-center border-r border-inherit w-24">Shelf Rack</th>
              <th className="py-2 px-3 border-r border-inherit w-28">Batch No</th>
              <th className="py-2 px-3 text-center border-r border-inherit w-24">Expiry</th>
              <th className="py-2 px-3 text-right border-r border-inherit w-24">M.R.P.</th>
              <th className="py-2 px-3 text-center border-r border-inherit w-20">Pack</th>
              <th className="py-2 px-3 text-center border-r border-inherit w-24">Qty (Edit)</th>
              <th className="py-2 px-3 text-right border-r border-inherit w-28">Amount (₹)</th>
              <th className="py-2 px-3 text-center w-16">Action</th>
            </tr>
          </thead>
          <tbody>
            {[...Array(DISPLAY_ROWS)].map((_, idx) => {
              const item = items[idx];
              const isEven = idx % 2 === 0;
              const isRowSelected = selectedRowIndex === idx;

              return (
                <tr 
                  key={idx}
                  onClick={() => {
                    if (item) {
                      setSelectedRowIndex(idx);
                    } else {
                      focusSearchInput();
                    }
                  }}
                  className={`border-b transition-colors cursor-pointer ${
                    isRowSelected
                      ? (theme === 'dark' ? 'bg-sky-950/40 border-sky-600' : 'bg-sky-100/70 border-sky-400')
                      : item
                      ? (theme === 'dark' ? 'hover:bg-zinc-900' : 'hover:bg-sky-50/60')
                      : (theme === 'dark' ? 'hover:bg-zinc-900/40' : 'hover:bg-slate-100/60')
                  } ${
                    theme === 'dark' 
                      ? (isEven ? 'bg-zinc-950' : 'bg-zinc-900/40') + ' border-zinc-800' 
                      : (isEven ? 'bg-white' : 'bg-slate-50/60') + ' border-slate-300'
                  }`}
                  style={{ height: '34px' }}
                >
                  {/* Sr */}
                  <td className={`py-1.5 px-3 text-center font-bold border-r border-inherit ${
                    item ? 'text-slate-600 dark:text-zinc-400' : 'text-slate-300 dark:text-zinc-700'
                  }`}>
                    {idx + 1}
                  </td>

                  {/* Product Description */}
                  <td 
                    className="py-1.5 px-3 font-sans border-r border-inherit"
                    onClick={focusSearchInput}
                  >
                    {item ? (
                      <div>
                        <div className={`font-black text-xs ${theme === 'dark' ? 'text-white' : 'text-slate-950'}`}>
                          {item.medicine.name}
                        </div>
                        {item.medicine.generic && (
                          <div className={`text-[10px] font-mono font-bold mt-0.5 ${theme === 'dark' ? 'text-sky-300' : 'text-sky-800'}`}>
                            {item.medicine.generic}
                          </div>
                        )}
                      </div>
                    ) : (
                      <span className={theme === 'dark' ? 'text-zinc-800 select-none' : 'text-slate-200 select-none'}>-</span>
                    )}
                  </td>

                  {/* Shelf Rack */}
                  <td className="py-1.5 px-3 text-center border-r border-inherit">
                    {item ? (
                      <span className={`px-1.5 py-0.5 rounded font-black text-[10px] border shadow-xs inline-block ${
                        theme === 'dark' 
                          ? 'bg-sky-950/80 text-sky-300 border-sky-600' 
                          : 'bg-sky-50 text-sky-800 border-sky-300'
                      }`}>
                        R-{item.medicine.rack}
                      </span>
                    ) : (
                      <span className={`select-none ${theme === 'dark' ? 'text-zinc-800' : 'text-slate-200'}`}>-</span>
                    )}
                  </td>

                  {/* Batch */}
                  <td className={`py-1.5 px-3 font-bold border-r border-inherit ${
                    theme === 'dark' ? 'text-zinc-100' : 'text-slate-950'
                  }`}>
                    {item ? item.batch.batch_no : ''}
                  </td>

                  {/* Expiry */}
                  <td className={`py-1.5 px-3 text-center font-bold border-r border-inherit ${
                    theme === 'dark' ? 'text-zinc-300' : 'text-slate-900'
                  }`}>
                    {item ? (
                      <div>
                        <span>{item.batch.exp_date}</span>
                        {item.isShortExpiry && (
                          <span className="block text-[8px] font-mono font-black text-amber-600 dark:text-amber-400 uppercase tracking-tighter">
                            EXP &lt;60d
                          </span>
                        )}
                      </div>
                    ) : ''}
                  </td>

                  {/* MRP */}
                  <td className={`py-1.5 px-3 text-right font-bold border-r border-inherit ${
                    theme === 'dark' ? 'text-zinc-100' : 'text-slate-950'
                  }`}>
                    {item ? item.batch.mrp.toFixed(2) : ''}
                  </td>

                  {/* Pack */}
                  <td className={`py-1.5 px-3 text-center font-bold border-r border-inherit ${
                    theme === 'dark' ? 'text-zinc-400' : 'text-slate-600'
                  }`}>
                    {item ? `${item.batch.per || 10}s` : ''}
                  </td>

                  {/* Qty (Directly Editable with Loose Dispensing Pro-Rata Math) */}
                  <td className="py-1 px-2 text-center border-r border-inherit">
                    {item ? (
                      <div className="flex flex-col items-center">
                        <input
                          type="number"
                          min="1"
                          value={item.qty}
                          onClick={(e) => e.stopPropagation()}
                          onChange={(e) => handleUpdateItemQty(idx, e.target.value)}
                          className={`w-16 py-0.5 px-1 text-center font-black font-mono text-sm rounded border focus:outline-none focus:ring-1 focus:ring-sky-500 ${
                            theme === 'dark' ? 'bg-zinc-900 border-zinc-700 text-sky-400' : 'bg-sky-50 border-sky-300 text-sky-900'
                          }`}
                        />
                        {/* Loose tablet calculation display */}
                        {item.qty % (item.batch.per || 10) !== 0 && (
                          <span className="text-[9px] font-mono font-bold text-sky-600 dark:text-sky-400 leading-none mt-0.5" title={`Pro-rata loose rate: ₹${(item.batch.mrp / (item.batch.per || 10)).toFixed(2)}/tab`}>
                            ₹{(item.batch.mrp / (item.batch.per || 10)).toFixed(2)}/tab
                          </span>
                        )}
                      </div>
                    ) : ''}
                  </td>

                  {/* Amount with Short-Expiry Clearance Discount Tag */}
                  <td className={`py-1.5 px-3 text-right font-black text-sm border-r border-inherit ${
                    theme === 'dark' ? 'text-emerald-400' : 'text-emerald-700'
                  }`}>
                    {item ? (
                      <div>
                        <div>₹{item.totalValue.toFixed(2)}</div>
                        {item.isShortExpiry && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleToggleClearanceDiscount(idx);
                            }}
                            className={`mt-0.5 px-1 py-0.2 rounded text-[8px] font-black uppercase tracking-wider block ml-auto border cursor-pointer ${
                              item.hasClearanceDiscount
                                ? 'bg-amber-500 text-white border-amber-600'
                                : (theme === 'dark' ? 'bg-amber-950/60 text-amber-300 border-amber-700 hover:bg-amber-900/60' : 'bg-amber-50 text-amber-800 border-amber-300 hover:bg-amber-100')
                            }`}
                            title="Toggle 10% Clearance Discount on Short Expiry Stock"
                          >
                            <span className="flex items-center space-x-0.5">
                              <Tag className="w-2.5 h-2.5" />
                              <span>{item.hasClearanceDiscount ? '-10% Applied' : '10% Clearance?'}</span>
                            </span>
                          </button>
                        )}
                      </div>
                    ) : ''}
                  </td>

                  {/* Action */}
                  <td className="py-1.5 px-3 text-center">
                    {item && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRemoveItem(idx);
                        }}
                        className="text-rose-600 hover:text-rose-800 p-1 rounded hover:bg-rose-50 dark:hover:bg-rose-950/40"
                        title="Delete Item"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* 4. Docked Live Medicine Inspector / Radar Bar */}
      <MedicineDetailRadar
        selectedMed={inspectedMed}
        theme={theme}
        activeBranch={activeBranch}
        onOpenSubstitutes={(med) => setSubstituteModalMed(med)}
      />

      {/* 5. Financial Accounting Ledger Footer */}
      <div className={`p-3 border-t flex items-center justify-between select-none ${
        theme === 'dark' ? 'bg-zinc-900 border-zinc-800' : 'bg-slate-100 border-slate-300'
      }`}>
        <div className="flex items-center space-x-6 font-mono text-xs">
          <div>
            <span className="text-slate-500 font-bold text-[10px] block uppercase">Items:</span>
            <span className={`font-black text-sm ${theme === 'dark' ? 'text-white' : 'text-slate-950'}`}>
              {items.length} Products ({totalQty} Units)
            </span>
          </div>
          <div>
            <span className="text-slate-500 font-bold text-[10px] block uppercase">Taxable:</span>
            <span className={`font-bold ${theme === 'dark' ? 'text-zinc-200' : 'text-slate-900'}`}>
              ₹{taxableAmount.toFixed(2)}
            </span>
          </div>
          <div>
            <span className="text-slate-500 font-bold text-[10px] block uppercase">CGST (6%):</span>
            <span className={`font-bold ${theme === 'dark' ? 'text-zinc-200' : 'text-slate-900'}`}>
              ₹{cgst.toFixed(2)}
            </span>
          </div>
          <div>
            <span className="text-slate-500 font-bold text-[10px] block uppercase">SGST (6%):</span>
            <span className={`font-bold ${theme === 'dark' ? 'text-zinc-200' : 'text-slate-900'}`}>
              ₹{sgst.toFixed(2)}
            </span>
          </div>
          {Math.abs(roundOff) > 0.001 && (
            <div>
              <span className="text-slate-500 font-bold text-[10px] block uppercase">Round off:</span>
              <span className={`font-bold ${theme === 'dark' ? 'text-zinc-200' : 'text-slate-900'}`}>
                {roundOff > 0 ? `+${roundOff.toFixed(2)}` : roundOff.toFixed(2)}
              </span>
            </div>
          )}
        </div>

        <div className="flex items-center space-x-3">
          {/* F7: Recall / Reprint Last Completed Bill */}
          <button
            type="button"
            onClick={onReprintLastBill}
            className={`px-3 py-1.5 rounded font-mono font-bold text-xs uppercase border transition flex items-center space-x-1.5 ${
              theme === 'dark'
                ? 'border-sky-700 bg-sky-950/60 text-sky-300 hover:bg-sky-900'
                : 'border-sky-300 bg-sky-50 text-sky-900 hover:bg-sky-100 shadow-xs'
            }`}
            title="Recall and Reprint Last Completed Bill if customer or printer tore the receipt (F7)"
          >
            <Printer className="w-3.5 h-3.5 text-sky-600" />
            <span>Reprint Bill (F7)</span>
          </button>

          <button
            onClick={onHoldBill}
            disabled={items.length === 0}
            className={`px-3 py-1.5 rounded font-mono font-bold text-xs uppercase border transition ${
              items.length === 0 
                ? 'opacity-40 cursor-not-allowed border-slate-300' 
                : (theme === 'dark' 
                    ? 'border-amber-500 text-amber-300 hover:bg-amber-950 font-bold' 
                    : 'border-amber-500 text-amber-900 hover:bg-amber-100 font-bold')
            }`}
          >
            Hold Bill (F12)
          </button>

          <div className={`border px-4 py-1.5 rounded text-right ${
            theme === 'dark' ? 'bg-zinc-950 border-zinc-700' : 'bg-white border-slate-300 shadow-sm'
          }`}>
            <span className="text-slate-500 text-[10px] font-mono font-bold block uppercase">Net Amount</span>
            <span className={`text-xl font-black font-mono ${theme === 'dark' ? 'text-emerald-400' : 'text-emerald-600'}`}>
              ₹{netPayable.toFixed(2)}
            </span>
          </div>

          <button
            onClick={onCompleteBill}
            disabled={items.length === 0}
            className={`px-5 py-2.5 rounded-lg font-black text-xs font-mono uppercase flex items-center space-x-2 transition shadow ${
              items.length === 0
                ? (theme === 'dark' ? 'bg-zinc-800 text-zinc-500 cursor-not-allowed' : 'bg-slate-300 text-slate-500 cursor-not-allowed')
                : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-900/30'
            }`}
          >
            <Printer className="w-4 h-4" />
            <span>Print Bill (*+)</span>
          </button>
        </div>
      </div>

      {/* 6. Function Key Footer Strip */}
      <div className={`border-t px-3 py-1.5 flex items-center justify-between text-[11px] font-mono select-none ${
        theme === 'dark' ? 'bg-zinc-950 border-zinc-800 text-zinc-400' : 'bg-slate-200 border-slate-300 text-slate-700'
      }`}>
        <div className="flex items-center space-x-3 font-semibold">
          <span className="flex items-center space-x-1">
            <kbd className={`px-1.5 py-0.5 rounded border font-bold ${
              theme === 'dark' ? 'bg-zinc-800 text-sky-400 border-zinc-700' : 'bg-white text-sky-700 border-slate-300'
            }`}>F2</kbd>
            <span>Patient</span>
          </span>
          <span className={theme === 'dark' ? 'text-zinc-700' : 'text-slate-400'}>|</span>
          <span className="flex items-center space-x-1">
            <kbd className={`px-1.5 py-0.5 rounded border font-bold ${
              theme === 'dark' ? 'bg-zinc-800 text-amber-300 border-zinc-700' : 'bg-white text-amber-800 border-slate-300'
            }`}>F3</kbd>
            <span className="font-bold text-amber-600">Substitutes</span>
          </span>
          <span className={theme === 'dark' ? 'text-zinc-700' : 'text-slate-400'}>|</span>
          <span className="flex items-center space-x-1">
            <kbd className={`px-1.5 py-0.5 rounded border font-bold ${
              theme === 'dark' ? 'bg-zinc-800 text-sky-400 border-zinc-700' : 'bg-white text-sky-700 border-slate-300'
            }`}>F4</kbd>
            <span className="font-bold text-sky-600">Rx History</span>
          </span>
          <span className={theme === 'dark' ? 'text-zinc-700' : 'text-slate-400'}>|</span>
          <span className="flex items-center space-x-1">
            <kbd className={`px-1.5 py-0.5 rounded border font-bold ${
              theme === 'dark' ? 'bg-zinc-800 text-amber-400 border-zinc-700' : 'bg-white text-amber-700 border-slate-300'
            }`}>Enter</kbd>
            <span>Add / Next</span>
          </span>
          <span className={theme === 'dark' ? 'text-zinc-700' : 'text-slate-400'}>|</span>
          <span className="flex items-center space-x-1">
            <kbd className={`px-1.5 py-0.5 rounded border font-bold ${
              theme === 'dark' ? 'bg-zinc-800 text-rose-400 border-zinc-700' : 'bg-white text-rose-700 border-slate-300'
            }`}>Del</kbd>
            <span>Remove Row</span>
          </span>
          <span className={theme === 'dark' ? 'text-zinc-700' : 'text-slate-400'}>|</span>
          <span className="flex items-center space-x-1">
            <kbd className={`px-1.5 py-0.5 rounded border font-bold ${
              theme === 'dark' ? 'bg-zinc-800 text-purple-400 border-zinc-700' : 'bg-white text-purple-700 border-slate-300'
            }`}>F7</kbd>
            <span>Reprint</span>
          </span>
          <span className={theme === 'dark' ? 'text-zinc-700' : 'text-slate-400'}>|</span>
          <span className="flex items-center space-x-1">
            <kbd className={`px-1.5 py-0.5 rounded border font-bold ${
              theme === 'dark' ? 'bg-zinc-800 text-rose-400 border-zinc-700' : 'bg-white text-rose-700 border-slate-300'
            }`}>F8</kbd>
            <span className="font-bold text-rose-600">Return</span>
          </span>
          <span className={theme === 'dark' ? 'text-zinc-700' : 'text-slate-400'}>|</span>
          <span className="flex items-center space-x-1">
            <kbd className={`px-1.5 py-0.5 rounded border font-bold ${
              theme === 'dark' ? 'bg-zinc-800 text-amber-400 border-zinc-700' : 'bg-white text-amber-700 border-slate-300'
            }`}>F12</kbd>
            <span>Hold / Park</span>
          </span>
          <span className={theme === 'dark' ? 'text-zinc-700' : 'text-slate-400'}>|</span>
          <span className="flex items-center space-x-1">
            <kbd className={`px-1.5 py-0.5 rounded border font-bold ${
              theme === 'dark' ? 'bg-zinc-800 text-emerald-400 border-zinc-700' : 'bg-white text-emerald-700 border-slate-300'
            }`}>*+</kbd>
            <span>Print Bill</span>
          </span>
        </div>

        <div className="flex items-center space-x-3">
          {heldBillsCount > 0 && (
            <button
              onClick={onRestoreHeldBill}
              className={`flex items-center space-x-1.5 border px-2.5 py-0.5 rounded-full font-bold text-[10px] animate-pulse ${
                theme === 'dark' 
                  ? 'bg-amber-950 text-amber-300 border-amber-600 hover:bg-amber-900' 
                  : 'bg-amber-100 text-amber-950 border-amber-400 hover:bg-amber-200'
              }`}
            >
              <PauseCircle className="w-3 h-3 text-amber-600" />
              <span>{heldBillsCount} Parked Bill(s) Available [F12]</span>
            </button>
          )}
          <span className={`text-[10px] font-bold ${theme === 'dark' ? 'text-zinc-500' : 'text-slate-600'}`}>
            Beta Pharmacy POS • Offline-Ready
          </span>
        </div>
      </div>

      {/* Option B: Active Salt & Therapeutic Substitute Radar Modal */}
      <SubstituteRadarModal
        isOpen={!!substituteModalMed}
        onClose={() => setSubstituteModalMed(null)}
        targetMedicine={substituteModalMed}
        allMedicines={medicines}
        onSelectSubstitute={(sub) => {
          handleDirectAddMedicine(sub);
        }}
        theme={theme}
      />
    </div>
  );
}
