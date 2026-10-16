import React, { useState, useRef, useEffect } from 'react';
import { 
  ArrowLeft, 
  Plus, 
  Check, 
  Trash2, 
  Building2, 
  Calendar, 
  Hash, 
  Search, 
  Package, 
  Percent, 
  FileCheck,
  Receipt,
  Layers,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import supplierList from '../data/suppliers.json';

export default function PurchaseEntryPage({ 
  theme, 
  medicines, 
  onBackToBilling, 
  onUpdateCatalogStock 
}) {
  // Invoice Header States (PURCHASE.DBF schema)
  const [supplierCode, setSupplierCode] = useState(supplierList[0]?.code || 'S076');
  const [invoiceNo, setInvoiceNo] = useState(''); // Starts empty so pharmacist writes distributor bill no!
  const [billDate, setBillDate] = useState('16/10/2026'); // Editable date
  const [isCash, setIsCash] = useState(false); // Cash or Credit
  const [cashDiscount, setCashDiscount] = useState(0);

  // Line Item Entry State (PDT schema)
  const [searchMedQuery, setSearchMedQuery] = useState('');
  const [isMedDropdownOpen, setIsMedDropdownOpen] = useState(false);
  const [selectedMed, setSelectedMed] = useState(null);
  const [batchNo, setBatchNo] = useState(''); // Starts EMPTY for brand new shipment
  const [expDate, setExpDate] = useState(''); // Starts EMPTY for brand new shipment
  const [wQty, setWQty] = useState(10); // Billed packs
  const [packSize, setPackSize] = useState(10); // PER (tablets per pack)
  const [freeQty, setFreeQty] = useState(0); // FREE_QTY (e.g. 10+1, 10+2 scheme)
  const [replQty, setReplQty] = useState(0); // REPL_QTY
  const [mrp, setMrp] = useState(100.00);
  const [purchaseRate, setPurchaseRate] = useState(70.00); // Net distributor purchase rate (PTR)
  const [taxPercent, setTaxPercent] = useState(12);

  // Inward Line Items Ledger (Starts clean & empty!)
  const [purchaseItems, setPurchaseItems] = useState([]);

  // Saved Invoices History (Voucher history)
  const [savedVouchers, setSavedVouchers] = useState([
    { purNo: '06927', billNo: '020456', supplier: 'THE CAN DRUG HOUSE', date: '16/10/2026', amount: 4789.50, itemsCount: 2 }
  ]);
  const [activeTab, setActiveTab] = useState('entry'); // 'entry' or 'vouchers'
  const [saveSuccessToast, setSaveSuccessToast] = useState('');

  const medSearchInputRef = useRef(null);
  const batchInputRef = useRef(null);
  const expInputRef = useRef(null);
  const qtyInputRef = useRef(null);
  const rateInputRef = useRef(null);

  // Filter medicines for autocomplete
  const mq = searchMedQuery.trim().toLowerCase();
  const filteredMeds = mq.length === 0 ? [] : medicines.filter(m => 
    m.name.toLowerCase().includes(mq) || 
    (m.generic && m.generic.toLowerCase().includes(mq)) ||
    (m.code && m.code.toLowerCase().includes(mq))
  ).slice(0, 20);

  // Selected supplier details
  const currentSupplier = supplierList.find(s => s.code === supplierCode) || supplierList[0];

  // Handle supplier change: Clear invoice number so user enters the new distributor bill
  const handleSupplierChange = (newCode) => {
    setSupplierCode(newCode);
    setInvoiceNo(''); // Reset bill number for new supplier
  };

  // Select medicine from autocomplete: Keep new batch & expiry clean for inward typing!
  const handleSelectMedicine = (med) => {
    setSelectedMed(med);
    setSearchMedQuery(med.name);
    setIsMedDropdownOpen(false);

    // CRITICAL: DO NOT copy old batch or old expiry!
    // Inward stock arrives with a brand new batch number and new expiry date on the box.
    setBatchNo('');
    setExpDate('');
    setWQty(10);
    setFreeQty(0);
    setPackSize(med.per || 10);
    setMrp(med.mrp || 100);
    setPurchaseRate(med.ptr || +(med.mrp * 0.78).toFixed(2));

    // Jump cursor straight to Batch No input field!
    setTimeout(() => {
      batchInputRef.current?.focus();
    }, 50);
  };

  // Add line item to table
  const handleAddLineItem = () => {
    if (!selectedMed && !searchMedQuery.trim()) {
      alert('Select a medicine first');
      medSearchInputRef.current?.focus();
      return;
    }
    if (!batchNo.trim()) {
      alert('Enter new Batch Number from the box');
      batchInputRef.current?.focus();
      return;
    }
    if (!expDate.trim()) {
      alert('Enter Expiry Date (MM/YY)');
      expInputRef.current?.focus();
      return;
    }
    if (wQty <= 0) {
      alert('Billed packs must be at least 1');
      qtyInputRef.current?.focus();
      return;
    }

    const medName = selectedMed ? selectedMed.name : searchMedQuery.toUpperCase();
    const medCode = selectedMed ? selectedMed.code : 'M' + Math.floor(100000 + Math.random() * 900000);
    const lineTotal = +(wQty * purchaseRate).toFixed(2);
    const totalUnits = (wQty + freeQty + replQty) * packSize;

    const newItem = {
      medCode,
      name: medName,
      batch: batchNo.trim().toUpperCase(),
      exp: expDate.trim(),
      wQty: parseInt(wQty),
      packSize: parseInt(packSize),
      totalUnits,
      freeQty: parseInt(freeQty) || 0,
      replQty: parseInt(replQty) || 0,
      mrp: parseFloat(mrp) || 0,
      rate: parseFloat(purchaseRate) || 0,
      ptr: parseFloat(purchaseRate) || 0,
      taxPercent: parseInt(taxPercent) || 12,
      total: lineTotal
    };

    setPurchaseItems(prev => [...prev, newItem]);

    // Reset line fields for next item
    setSelectedMed(null);
    setSearchMedQuery('');
    setBatchNo('');
    setExpDate('');
    setWQty(10);
    setFreeQty(0);

    medSearchInputRef.current?.focus();
  };

  const handleRemoveItem = (index) => {
    setPurchaseItems(prev => prev.filter((_, i) => i !== index));
  };

  // Financial totals
  const grossTotal = purchaseItems.reduce((acc, it) => acc + it.total, 0);
  const gstAmount = +(grossTotal * 0.12).toFixed(2);
  const netPayable = Math.round(grossTotal + gstAmount - cashDiscount);
  const totalBilledPacks = purchaseItems.reduce((acc, it) => acc + it.wQty, 0);
  const totalFreePacks = purchaseItems.reduce((acc, it) => acc + it.freeQty, 0);
  const totalInwardUnits = purchaseItems.reduce((acc, it) => acc + it.totalUnits, 0);

  // Post and save purchase voucher
  const handlePostPurchase = () => {
    if (!invoiceNo.trim()) {
      alert('Please enter Distributor Bill / Invoice Number');
      return;
    }
    if (purchaseItems.length === 0) {
      alert('Add at least one medicine item to post this purchase voucher');
      return;
    }

    const voucherNumber = '0' + (6927 + savedVouchers.length + 1);

    const newVoucher = {
      purNo: voucherNumber,
      billNo: invoiceNo.trim(),
      supplier: currentSupplier.name,
      date: billDate,
      amount: netPayable,
      itemsCount: purchaseItems.length
    };

    setSavedVouchers(prev => [newVoucher, ...prev]);

    // Update live stock in App catalog!
    if (onUpdateCatalogStock) {
      onUpdateCatalogStock(purchaseItems);
    }

    setSaveSuccessToast(`Purchase Voucher #${voucherNumber} posted! Added ${totalInwardUnits} units to stock.`);
    setTimeout(() => setSaveSuccessToast(''), 4500);

    // Reset bill
    setInvoiceNo('');
    setPurchaseItems([]);
  };

  return (
    <div className={`flex-1 flex flex-col overflow-hidden font-sans transition-colors ${
      theme === 'dark' ? 'bg-zinc-950 text-zinc-100' : 'bg-white text-slate-950'
    }`}>
      {/* Toast Notification */}
      {saveSuccessToast && (
        <div className="absolute top-16 right-6 z-50 bg-emerald-600 text-white px-4 py-2.5 rounded-lg shadow-xl font-mono font-bold text-xs flex items-center space-x-2 animate-bounce">
          <CheckCircle2 className="w-4 h-4" />
          <span>{saveSuccessToast}</span>
        </div>
      )}

      {/* Header */}
      <div className={`px-4 py-2.5 border-b flex items-center justify-between ${
        theme === 'dark' ? 'bg-zinc-900 border-zinc-800' : 'bg-slate-100 border-slate-300'
      }`}>
        <div className="flex items-center space-x-3">
          <button
            onClick={onBackToBilling}
            className={`p-2 rounded-lg border font-bold transition flex items-center space-x-1 ${
              theme === 'dark' ? 'border-zinc-700 bg-zinc-800 hover:bg-zinc-700 text-white' : 'border-slate-300 bg-white hover:bg-slate-100 text-slate-900 shadow-sm'
            }`}
            title="Back to Sale Billing (Esc)"
          >
            <ArrowLeft className="w-4 h-4 text-sky-600" />
            <span className="text-xs font-mono font-bold">Billing (Esc)</span>
          </button>
          <div>
            <div className="flex items-center space-x-2">
              <h2 className={`text-base font-black ${theme === 'dark' ? 'text-white' : 'text-slate-950'}`}>
                Purchase Inward Entry [TRN003 / PURCHASE.DBF]
              </h2>
              <span className="text-xs font-mono font-bold px-2 py-0.5 rounded border bg-emerald-100 text-emerald-950 border-emerald-300 dark:bg-emerald-950 dark:text-emerald-300">
                Inward Stock & Scheme Ledger
              </span>
            </div>
            <p className={`text-xs font-mono mt-0.5 font-semibold ${
              theme === 'dark' ? 'text-zinc-400' : 'text-slate-600'
            }`}>
              Distributor bill receipt, free schemes (10+1 / 10+2), PTR, new batch creation & stock updating
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2.5">
          {/* History Tab Toggle */}
          <button
            onClick={() => setActiveTab(activeTab === 'entry' ? 'vouchers' : 'entry')}
            className={`py-1.5 px-3 rounded-lg border text-xs font-bold font-mono transition ${
              activeTab === 'vouchers'
                ? 'bg-sky-600 text-white border-sky-600'
                : (theme === 'dark' ? 'border-zinc-700 bg-zinc-800 text-zinc-300' : 'border-slate-300 bg-white text-slate-800 shadow-sm')
            }`}
          >
            History ({savedVouchers.length} Vouchers)
          </button>

          {/* Post Purchase Button */}
          {activeTab === 'entry' && (
            <button
              onClick={handlePostPurchase}
              disabled={purchaseItems.length === 0}
              className={`py-1.5 px-4 rounded-lg font-black text-xs flex items-center space-x-1.5 transition shadow ${
                purchaseItems.length > 0
                  ? 'bg-emerald-600 hover:bg-emerald-500 text-white cursor-pointer'
                  : 'bg-slate-300 text-slate-500 cursor-not-allowed dark:bg-zinc-800 dark:text-zinc-600'
              }`}
            >
              <FileCheck className="w-4 h-4" />
              <span>Post & Update Stock (F12)</span>
            </button>
          )}
        </div>
      </div>

      {activeTab === 'entry' ? (
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* 1. Distributor Invoice Header Fields */}
          <div className={`p-3 border-b grid grid-cols-12 gap-3 text-xs font-mono ${
            theme === 'dark' ? 'bg-zinc-900/50 border-zinc-800' : 'bg-slate-50 border-slate-200'
          }`}>
            {/* Supplier Selector */}
            <div className="col-span-4">
              <label className="block text-[10px] font-black uppercase text-slate-700 dark:text-zinc-300 mb-1">
                Supplier [SUPP_CD / SUPPMAST]
              </label>
              <select
                value={supplierCode}
                onChange={(e) => handleSupplierChange(e.target.value)}
                className={`w-full py-1.5 px-2 rounded border font-bold text-xs focus:ring-2 focus:ring-sky-500 ${
                  theme === 'dark' ? 'bg-zinc-950 border-zinc-700 text-white' : 'bg-white border-slate-400 text-slate-950 shadow-sm'
                }`}
              >
                {supplierList.map((s, idx) => (
                  <option key={idx} value={s.code}>
                    {s.code} - {s.name} ({s.address || 'KANNUR / THALASSERY'})
                  </option>
                ))}
              </select>
            </div>

            {/* Distributor Bill Number */}
            <div className="col-span-2">
              <label className="block text-[10px] font-black uppercase text-slate-700 dark:text-zinc-300 mb-1">
                Dist. Bill No [BILL_NO]
              </label>
              <input
                type="text"
                value={invoiceNo}
                onChange={(e) => setInvoiceNo(e.target.value)}
                placeholder="Enter Bill No"
                className={`w-full py-1.5 px-2.5 rounded border font-black text-xs font-mono focus:ring-2 focus:ring-sky-500 ${
                  theme === 'dark' ? 'bg-zinc-950 border-zinc-700 text-sky-400 placeholder-zinc-500' : 'bg-white border-slate-400 text-sky-900 placeholder-slate-400 shadow-sm'
                }`}
              />
            </div>

            {/* Bill Date */}
            <div className="col-span-2">
              <label className="block text-[10px] font-black uppercase text-slate-700 dark:text-zinc-300 mb-1">
                Bill Date [BILL_DT]
              </label>
              <input
                type="text"
                value={billDate}
                onChange={(e) => setBillDate(e.target.value)}
                placeholder="DD/MM/YYYY"
                className={`w-full py-1.5 px-2 text-center rounded border font-bold text-xs focus:ring-2 focus:ring-sky-500 ${
                  theme === 'dark' ? 'bg-zinc-950 border-zinc-700 text-white' : 'bg-white border-slate-400 text-slate-950 shadow-sm'
                }`}
              />
            </div>

            {/* Terms (Credit / Cash) */}
            <div className="col-span-2">
              <label className="block text-[10px] font-black uppercase text-slate-700 dark:text-zinc-300 mb-1">
                Terms [CASH]
              </label>
              <div className="flex items-center space-x-1">
                <button
                  type="button"
                  onClick={() => setIsCash(false)}
                  className={`flex-1 py-1 rounded text-xs font-bold border transition ${
                    !isCash
                      ? 'bg-sky-600 text-white border-sky-600 shadow-sm'
                      : 'border-slate-300 dark:border-zinc-700 text-slate-600 dark:text-zinc-400'
                  }`}
                >
                  Credit
                </button>
                <button
                  type="button"
                  onClick={() => setIsCash(true)}
                  className={`flex-1 py-1 rounded text-xs font-bold border transition ${
                    isCash
                      ? 'bg-sky-600 text-white border-sky-600 shadow-sm'
                      : 'border-slate-300 dark:border-zinc-700 text-slate-600 dark:text-zinc-400'
                  }`}
                >
                  Cash
                </button>
              </div>
            </div>

            {/* Cash Discount (LESS) */}
            <div className="col-span-2">
              <label className="block text-[10px] font-black uppercase text-slate-700 dark:text-zinc-300 mb-1">
                Cash Disc ₹ [LESS]
              </label>
              <input
                type="number"
                min="0"
                value={cashDiscount}
                onChange={(e) => setCashDiscount(parseFloat(e.target.value) || 0)}
                className={`w-full py-1.5 px-2 rounded border font-bold text-xs focus:ring-2 focus:ring-sky-500 ${
                  theme === 'dark' ? 'bg-zinc-950 border-zinc-700 text-white' : 'bg-white border-slate-400 text-slate-950 shadow-sm'
                }`}
              />
            </div>
          </div>

          {/* 2. Interactive Line Item Inward Entry Bar WITH CLEAR COLUMN LABELS */}
          <div className={`p-3 border-b font-mono ${
            theme === 'dark' ? 'bg-zinc-900 border-zinc-800' : 'bg-slate-100 border-slate-300'
          }`}>
            <div className="text-[11px] font-black uppercase text-slate-800 dark:text-zinc-200 mb-2 flex items-center space-x-1">
              <Plus className="w-3.5 h-3.5 text-sky-600" />
              <span>Add Inward Line Item (Type New Batch, Expiry & Billed Quantities)</span>
            </div>

            <div className="grid grid-cols-12 gap-2 text-xs">
              {/* Column 1: Product Lookup */}
              <div className="col-span-4 relative">
                <label className="block text-[10px] font-black uppercase tracking-wider text-slate-700 dark:text-zinc-300 mb-1">
                  Product Name / Salt
                </label>
                <input
                  ref={medSearchInputRef}
                  type="text"
                  value={searchMedQuery}
                  onChange={(e) => {
                    setSearchMedQuery(e.target.value);
                    setIsMedDropdownOpen(e.target.value.trim().length > 0);
                  }}
                  onFocus={() => {
                    if (searchMedQuery.trim().length > 0) setIsMedDropdownOpen(true);
                  }}
                  placeholder="Search 24k medicine catalog..."
                  className={`w-full py-1.5 px-3 rounded border font-black text-xs font-sans focus:ring-2 focus:ring-sky-500 ${
                    theme === 'dark' ? 'bg-zinc-950 border-zinc-700 text-white placeholder-zinc-500' : 'bg-white border-slate-400 text-slate-950 placeholder-slate-500 shadow-sm'
                  }`}
                />

                {isMedDropdownOpen && filteredMeds.length > 0 && (
                  <div className={`absolute left-0 top-full mt-1 w-full max-h-56 overflow-y-auto rounded-lg border shadow-xl z-50 divide-y font-sans ${
                    theme === 'dark' ? 'bg-zinc-900 border-zinc-700 divide-zinc-800 text-white' : 'bg-white border-slate-300 divide-slate-100 text-slate-950'
                  }`}>
                    {filteredMeds.map((med, idx) => (
                      <div
                        key={idx}
                        onMouseDown={() => handleSelectMedicine(med)}
                        className={`p-2 cursor-pointer hover:bg-sky-600 hover:text-white flex items-center justify-between ${
                          theme === 'dark' ? 'hover:bg-zinc-800' : 'hover:bg-sky-50'
                        }`}
                      >
                        <div>
                          <div className="font-bold text-xs">{med.name}</div>
                          <div className="text-[10px] opacity-70 font-mono">{med.generic || med.company}</div>
                        </div>
                        <div className="text-right text-[11px] font-mono font-bold">
                          <div>₹{(med.mrp || 0).toFixed(2)}</div>
                          <div className="text-[10px] text-amber-500">Rack {med.rack}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Column 2: New Batch No */}
              <div className="col-span-2">
                <label className="block text-[10px] font-black uppercase tracking-wider text-slate-700 dark:text-zinc-300 mb-1">
                  New Batch No
                </label>
                <input
                  ref={batchInputRef}
                  type="text"
                  value={batchNo}
                  onChange={(e) => setBatchNo(e.target.value.toUpperCase())}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') expInputRef.current?.focus();
                  }}
                  placeholder="e.g. BATCH2026"
                  className={`w-full py-1.5 px-2 rounded border font-black text-xs uppercase focus:ring-2 focus:ring-sky-500 ${
                    theme === 'dark' ? 'bg-zinc-950 border-zinc-700 text-white' : 'bg-white border-slate-400 text-slate-950 shadow-sm'
                  }`}
                />
              </div>

              {/* Column 3: Expiry (MM/YY) */}
              <div className="col-span-1">
                <label className="block text-[10px] font-black uppercase tracking-wider text-slate-700 dark:text-zinc-300 mb-1 text-center">
                  Expiry (MM/YY)
                </label>
                <input
                  ref={expInputRef}
                  type="text"
                  value={expDate}
                  onChange={(e) => setExpDate(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') qtyInputRef.current?.focus();
                  }}
                  placeholder="08/29"
                  className={`w-full py-1.5 px-1.5 text-center rounded border font-black text-xs focus:ring-2 focus:ring-sky-500 ${
                    theme === 'dark' ? 'bg-zinc-950 border-zinc-700 text-white' : 'bg-white border-slate-400 text-slate-950 shadow-sm'
                  }`}
                />
              </div>

              {/* Column 4: Billed Packs */}
              <div className="col-span-1">
                <label className="block text-[10px] font-black uppercase tracking-wider text-sky-800 dark:text-sky-300 mb-1 text-center font-mono">
                  Billed Packs
                </label>
                <input
                  ref={qtyInputRef}
                  type="number"
                  min="1"
                  value={wQty}
                  onChange={(e) => setWQty(Math.max(1, parseInt(e.target.value) || 0))}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') rateInputRef.current?.focus();
                  }}
                  placeholder="Packs"
                  className={`w-full py-1.5 px-1.5 text-center rounded border font-black text-xs focus:ring-2 focus:ring-sky-500 ${
                    theme === 'dark' ? 'bg-zinc-950 border-zinc-700 text-sky-400' : 'bg-white border-slate-400 text-sky-900 shadow-sm'
                  }`}
                />
              </div>

              {/* Column 5: Free Scheme (10+1) */}
              <div className="col-span-1">
                <label className="block text-[10px] font-black uppercase tracking-wider text-emerald-800 dark:text-emerald-300 mb-1 text-center font-mono">
                  Free (10+1)
                </label>
                <input
                  type="number"
                  min="0"
                  value={freeQty}
                  onChange={(e) => setFreeQty(parseInt(e.target.value) || 0)}
                  placeholder="Free"
                  className={`w-full py-1.5 px-1.5 text-center rounded border font-black text-xs focus:ring-2 focus:ring-emerald-500 ${
                    theme === 'dark' ? 'bg-zinc-950 border-zinc-700 text-emerald-400' : 'bg-white border-slate-400 text-emerald-900 shadow-sm'
                  }`}
                />
              </div>

              {/* Column 6: PTR Cost (₹) */}
              <div className="col-span-1">
                <label className="block text-[10px] font-black uppercase tracking-wider text-slate-700 dark:text-zinc-300 mb-1 text-center font-mono">
                  PTR Cost (₹)
                </label>
                <input
                  ref={rateInputRef}
                  type="number"
                  step="0.01"
                  min="0"
                  value={purchaseRate}
                  onChange={(e) => setPurchaseRate(parseFloat(e.target.value) || 0)}
                  placeholder="Rate"
                  className={`w-full py-1.5 px-1.5 text-center rounded border font-black text-xs focus:ring-2 focus:ring-sky-500 ${
                    theme === 'dark' ? 'bg-zinc-950 border-zinc-700 text-white' : 'bg-white border-slate-400 text-slate-950 shadow-sm'
                  }`}
                />
              </div>

              {/* Column 7: New M.R.P. (₹) */}
              <div className="col-span-1">
                <label className="block text-[10px] font-black uppercase tracking-wider text-slate-700 dark:text-zinc-300 mb-1 text-center font-mono">
                  M.R.P. (₹)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={mrp}
                  onChange={(e) => setMrp(parseFloat(e.target.value) || 0)}
                  placeholder="MRP"
                  className={`w-full py-1.5 px-1.5 text-center rounded border font-black text-xs focus:ring-2 focus:ring-sky-500 ${
                    theme === 'dark' ? 'bg-zinc-950 border-zinc-700 text-white' : 'bg-white border-slate-400 text-slate-950 shadow-sm'
                  }`}
                />
              </div>

              {/* Column 8: Add Line Button */}
              <div className="col-span-1 flex flex-col justify-end">
                <label className="block text-[10px] font-bold uppercase tracking-wider text-transparent mb-1 text-center">
                  Add
                </label>
                <button
                  type="button"
                  onClick={handleAddLineItem}
                  className="w-full py-1.5 bg-sky-600 hover:bg-sky-500 text-white font-black rounded text-xs transition flex items-center justify-center space-x-1 shadow"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>+ Add</span>
                </button>
              </div>
            </div>

            {/* Quick helper calculation preview */}
            {selectedMed && (
              <div className="mt-2 text-[11px] font-mono text-slate-600 dark:text-zinc-400 flex items-center space-x-4">
                <span>Pack Size: <strong>{packSize}s</strong></span>
                <span>•</span>
                <span>Total Inward Units: <strong>{(wQty + freeQty) * packSize}</strong> units</span>
                <span>•</span>
                <span>Line Cost: <strong>₹{(wQty * purchaseRate).toFixed(2)}</strong></span>
                <span>•</span>
                <span>Margin: <strong>{(((mrp - purchaseRate) / (mrp || 1)) * 100).toFixed(1)}%</strong></span>
              </div>
            )}
          </div>

          {/* 3. Inward Table Ledger */}
          <div className="flex-1 overflow-y-auto">
            <table className={`w-full text-left border-collapse text-xs font-mono border ${
              theme === 'dark' ? 'border-zinc-800' : 'border-slate-300'
            }`}>
              <thead>
                <tr className={`border-b text-[11px] uppercase tracking-wider font-extrabold ${
                  theme === 'dark' ? 'bg-zinc-900 border-zinc-800 text-zinc-300' : 'bg-slate-200 border-slate-300 text-slate-900'
                }`}>
                  <th className="py-2.5 px-3 w-12 text-center border-r border-inherit">Sr</th>
                  <th className="py-2.5 px-3 border-r border-inherit">Product Description</th>
                  <th className="py-2.5 px-3 text-center border-r border-inherit w-28">Batch No</th>
                  <th className="py-2.5 px-3 text-center border-r border-inherit w-24">Expiry</th>
                  <th className="py-2.5 px-3 text-center border-r border-inherit w-24 font-black text-sky-800 dark:text-sky-300">Billed Packs</th>
                  <th className="py-2.5 px-3 text-center border-r border-inherit w-24 font-black text-emerald-800 dark:text-emerald-300">Free Scheme</th>
                  <th className="py-2.5 px-3 text-center border-r border-inherit w-24">Total Units</th>
                  <th className="py-2.5 px-3 text-right border-r border-inherit w-24">P.T.R. (₹)</th>
                  <th className="py-2.5 px-3 text-right border-r border-inherit w-24">M.R.P. (₹)</th>
                  <th className="py-2.5 px-3 text-right border-r border-inherit w-28">Amount (₹)</th>
                  <th className="py-2.5 px-3 text-center w-14">Del</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-inherit">
                {purchaseItems.length === 0 ? (
                  <tr>
                    <td colSpan={11} className="py-12 text-center text-slate-400 font-sans">
                      <Package className="w-8 h-8 mx-auto mb-2 opacity-40 text-slate-500" />
                      <div className="font-bold text-sm text-slate-600 dark:text-zinc-400">
                        Purchase voucher is clean and empty
                      </div>
                      <div className="text-xs font-mono text-slate-400 mt-1">
                        Search and pick a medicine above, type its new batch & expiry, and click "+ Add"
                      </div>
                    </td>
                  </tr>
                ) : (
                  purchaseItems.map((item, idx) => (
                    <tr 
                      key={idx}
                      className={`transition-colors border-b ${
                        theme === 'dark' ? 'hover:bg-zinc-900 border-zinc-800' : 'hover:bg-sky-50/70 border-slate-300'
                      }`}
                    >
                      <td className={`py-2 px-3 text-center font-bold border-r border-inherit ${
                        theme === 'dark' ? 'text-zinc-400' : 'text-slate-600'
                      }`}>
                        {idx + 1}
                      </td>

                      <td className="py-2 px-3 font-sans border-r border-inherit">
                        <div className={`font-black text-sm ${theme === 'dark' ? 'text-white' : 'text-slate-950'}`}>
                          {item.name}
                        </div>
                      </td>

                      <td className={`py-2 px-3 text-center font-bold border-r border-inherit font-mono ${
                        theme === 'dark' ? 'text-zinc-200' : 'text-slate-900'
                      }`}>
                        {item.batch}
                      </td>

                      <td className={`py-2 px-3 text-center font-bold border-r border-inherit ${
                        theme === 'dark' ? 'text-zinc-300' : 'text-slate-800'
                      }`}>
                        {item.exp}
                      </td>

                      <td className={`py-2 px-3 text-center font-black border-r border-inherit ${
                        theme === 'dark' ? 'text-sky-400' : 'text-sky-900'
                      }`}>
                        {item.wQty}
                      </td>

                      <td className="py-2 px-3 text-center font-black border-r border-inherit">
                        {item.freeQty > 0 ? (
                          <span className="text-emerald-600 dark:text-emerald-400 font-bold">
                            +{item.freeQty}
                          </span>
                        ) : (
                          <span className="text-slate-400">-</span>
                        )}
                      </td>

                      <td className={`py-2 px-3 text-center font-bold border-r border-inherit ${
                        theme === 'dark' ? 'text-zinc-200' : 'text-slate-900'
                      }`}>
                        {item.totalUnits}
                      </td>

                      <td className={`py-2 px-3 text-right font-black border-r border-inherit ${
                        theme === 'dark' ? 'text-white' : 'text-slate-950'
                      }`}>
                        ₹{item.rate.toFixed(2)}
                      </td>

                      <td className={`py-2 px-3 text-right font-black border-r border-inherit ${
                        theme === 'dark' ? 'text-zinc-300' : 'text-slate-800'
                      }`}>
                        ₹{item.mrp.toFixed(2)}
                      </td>

                      <td className={`py-2 px-3 text-right font-black border-r border-inherit ${
                        theme === 'dark' ? 'text-emerald-400' : 'text-emerald-800'
                      }`}>
                        ₹{item.total.toFixed(2)}
                      </td>

                      <td className="py-2 px-3 text-center">
                        <button
                          onClick={() => handleRemoveItem(idx)}
                          className="p-1 text-rose-500 hover:text-rose-700 transition"
                          title="Delete line item"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* 4. Voucher Summary Footer Bar */}
          <div className={`p-3 border-t flex items-center justify-between font-mono ${
            theme === 'dark' ? 'bg-zinc-900 border-zinc-800' : 'bg-slate-100 border-slate-300'
          }`}>
            <div className="flex items-center space-x-6 text-xs">
              <div>
                <span className="text-[10px] text-slate-500 block uppercase">Products / Lines:</span>
                <span className="font-bold">{purchaseItems.length} Items</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-500 block uppercase">Billed Packs:</span>
                <span className="font-bold text-sky-600 dark:text-sky-400">{totalBilledPacks} Strips</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-500 block uppercase">Free Schemes:</span>
                <span className="font-bold text-emerald-600 dark:text-emerald-400">+{totalFreePacks} Bonus</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-500 block uppercase">Total Inward Units:</span>
                <span className="font-black text-purple-600 dark:text-purple-400">{totalInwardUnits} Tablets</span>
              </div>
            </div>

            <div className="flex items-center space-x-6 text-right">
              <div className="text-xs">
                <div className="text-slate-500">Gross: ₹{grossTotal.toFixed(2)}</div>
                <div className="text-slate-500">GST (12%): ₹{gstAmount.toFixed(2)}</div>
              </div>
              <div>
                <div className="text-[10px] font-bold uppercase text-slate-500">Grand Total (Net)</div>
                <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400">
                  ₹{netPayable.toFixed(2)}
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* Voucher History Tab */
        <div className="flex-1 overflow-y-auto">
          <table className={`w-full text-left border-collapse text-xs font-mono border ${
            theme === 'dark' ? 'border-zinc-800' : 'border-slate-300'
          }`}>
            <thead>
              <tr className={`border-b text-[11px] uppercase tracking-wider font-extrabold ${
                theme === 'dark' ? 'bg-zinc-900 border-zinc-800 text-zinc-300' : 'bg-slate-200 border-slate-300 text-slate-900'
              }`}>
                <th className="py-2.5 px-3 w-12 text-center border-r border-inherit">Sr</th>
                <th className="py-2.5 px-3 text-center border-r border-inherit w-24">Voucher No</th>
                <th className="py-2.5 px-3 text-center border-r border-inherit w-28">Dist. Bill No</th>
                <th className="py-2.5 px-3 border-r border-inherit">Distributor Agency</th>
                <th className="py-2.5 px-3 text-center border-r border-inherit w-28">Inward Date</th>
                <th className="py-2.5 px-3 text-center border-r border-inherit w-24">Items</th>
                <th className="py-2.5 px-3 text-right border-r border-inherit w-32">Total Amount (₹)</th>
                <th className="py-2.5 px-3 text-center w-24">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-inherit">
              {savedVouchers.map((v, idx) => (
                <tr key={idx} className="border-b">
                  <td className="py-2 px-3 text-center font-bold border-r border-inherit">{idx + 1}</td>
                  <td className="py-2 px-3 text-center font-black border-r border-inherit text-sky-600">#{v.purNo}</td>
                  <td className="py-2 px-3 text-center font-bold border-r border-inherit">{v.billNo}</td>
                  <td className="py-2 px-3 font-bold font-sans border-r border-inherit">{v.supplier}</td>
                  <td className="py-2 px-3 text-center font-bold border-r border-inherit">{v.date}</td>
                  <td className="py-2 px-3 text-center font-bold border-r border-inherit">{v.itemsCount}</td>
                  <td className="py-2 px-3 text-right font-black border-r border-inherit text-slate-950 dark:text-white">
                    ₹{v.amount.toFixed(2)}
                  </td>
                  <td className="py-2 px-3 text-center font-bold text-emerald-600">POSTED</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
