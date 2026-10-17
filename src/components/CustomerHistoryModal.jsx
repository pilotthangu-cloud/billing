import React, { useState, useEffect } from 'react';
import { 
  X, 
  Search, 
  User, 
  Phone, 
  Calendar, 
  Clock, 
  FileText, 
  Repeat, 
  CheckCircle2, 
  AlertCircle,
  IndianRupee,
  ShoppingBag,
  ArrowRight
} from 'lucide-react';

// Realistic sample customer history matching regular Kerala chronic patients
const INITIAL_SAMPLE_CUSTOMERS = {
  '9447123456': {
    phone: '9447123456',
    name: 'RAMESHAN K',
    preferredDoctor: 'Dr. Madhusoodanan T',
    totalVisits: 4,
    totalSpent: 3840.00,
    bills: [
      {
        billNo: '025304',
        date: '14/10/2026',
        time: '20:10',
        doctorName: 'Dr. Madhusoodanan T',
        paymentMode: 'cash',
        netPayable: 340.00,
        items: [
          { code: 'M10014', name: 'TELMA 40MG TAB', batch: 'TLM8912', exp: '03/28', qty: 30, mrp: 22.40, totalValue: 224.00 },
          { code: 'M10015', name: 'GLYCOMET 500MG SR', batch: 'GLY4410', exp: '08/27', qty: 30, mrp: 11.60, totalValue: 116.00 }
        ]
      },
      {
        billNo: '024890',
        date: '15/09/2026',
        time: '18:45',
        doctorName: 'Dr. Madhusoodanan T',
        paymentMode: 'cash',
        netPayable: 450.00,
        items: [
          { code: 'M10014', name: 'TELMA 40MG TAB', batch: 'TLM8912', exp: '03/28', qty: 30, mrp: 22.40, totalValue: 224.00 },
          { code: 'M10015', name: 'GLYCOMET 500MG SR', batch: 'GLY4410', exp: '08/27', qty: 30, mrp: 11.60, totalValue: 116.00 },
          { code: 'M10016', name: 'ECOSPRIN 75MG TAB', batch: 'ECO1029', exp: '05/28', qty: 30, mrp: 11.00, totalValue: 110.00 }
        ]
      }
    ]
  },
  '9497172662': {
    phone: '9497172662',
    name: 'DINESH CHIRAKKARA',
    preferredDoctor: 'Dr. Manojan',
    totalVisits: 3,
    totalSpent: 2150.00,
    bills: [
      {
        billNo: '025315',
        date: '16/10/2026',
        time: '13:59',
        doctorName: 'Dr. Manojan',
        paymentMode: 'upi',
        netPayable: 583.80,
        items: [
          { code: 'M10001', name: 'AUGMENTIN 625MG TAB', batch: 'AUG9901', exp: '04/28', qty: 10, mrp: 22.34, totalValue: 223.40 },
          { code: 'M10002', name: 'PAN 40MG TAB', batch: 'PAN2041', exp: '11/27', qty: 15, mrp: 15.50, totalValue: 232.50 }
        ]
      }
    ]
  },
  '9847234567': {
    phone: '9847234567',
    name: 'SURESH BABU',
    preferredDoctor: 'Dr. Deepa Manojan',
    totalVisits: 5,
    totalSpent: 4920.00,
    bills: [
      {
        billNo: '025288',
        date: '10/10/2026',
        time: '11:30',
        doctorName: 'Dr. Deepa Manojan',
        paymentMode: 'cash',
        netPayable: 750.00,
        items: [
          { code: 'M10017', name: 'AMLONG 5MG TAB', batch: 'AML2031', exp: '10/27', qty: 30, mrp: 14.50, totalValue: 145.00 },
          { code: 'M10018', name: 'ATORVA 10MG TAB', batch: 'ATV9042', exp: '12/27', qty: 30, mrp: 21.00, totalValue: 210.00 }
        ]
      }
    ]
  }
};

export default function CustomerHistoryModal({
  isOpen,
  onClose,
  customerPhone,
  customerName,
  onSelectRepeatBill,
  theme
}) {
  const isDark = theme === 'dark';
  const [searchTerm, setSearchTerm] = useState(customerPhone || '');
  const [customerData, setCustomerData] = useState({});
  const [selectedRecord, setSelectedRecord] = useState(null);

  // Load customer records from localStorage + initial samples
  useEffect(() => {
    try {
      const stored = localStorage.getItem('beta_pharma_customer_history');
      if (stored) {
        const parsed = JSON.parse(stored);
        setCustomerData({ ...INITIAL_SAMPLE_CUSTOMERS, ...parsed });
      } else {
        setCustomerData(INITIAL_SAMPLE_CUSTOMERS);
      }
    } catch (e) {
      setCustomerData(INITIAL_SAMPLE_CUSTOMERS);
    }
  }, [isOpen]);

  // Sync search input when customerPhone prop changes
  useEffect(() => {
    if (customerPhone) {
      setSearchTerm(customerPhone);
    }
  }, [customerPhone]);

  // Find matching customer by exact or partial phone or name
  useEffect(() => {
    const q = (searchTerm || '').trim().toLowerCase();
    if (!q) {
      if (customerPhone && customerData[customerPhone]) {
        setSelectedRecord(customerData[customerPhone]);
      } else {
        setSelectedRecord(null);
      }
      return;
    }

    // Direct phone lookup
    if (customerData[q]) {
      setSelectedRecord(customerData[q]);
      return;
    }

    // Fuzzy search across phone & name
    const found = Object.values(customerData).find(c => 
      c.phone.includes(q) || (c.name && c.name.toLowerCase().includes(q))
    );
    setSelectedRecord(found || null);
  }, [searchTerm, customerData, customerPhone]);

  // Keyboard navigation: Escape closes modal
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  if (!isOpen) return null;

  const handleRepeat = (bill) => {
    if (onSelectRepeatBill && bill.items) {
      onSelectRepeatBill(bill.items, bill.doctorName, selectedRecord?.name || customerName);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto font-sans">
      <div className={`w-full max-w-3xl rounded-2xl border shadow-2xl overflow-hidden flex flex-col my-auto max-h-[90vh] ${
        isDark ? 'bg-zinc-900 border-zinc-700 text-zinc-100' : 'bg-white border-slate-300 text-slate-900'
      }`}>
        {/* Header */}
        <div className={`px-5 py-3.5 border-b flex items-center justify-between shrink-0 ${
          isDark ? 'bg-zinc-950 border-zinc-800' : 'bg-slate-100 border-slate-200'
        }`}>
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-lg bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-500">
              <User className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-black flex items-center space-x-2">
                <span>Patient Prescription & Purchase History</span>
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-sky-600 text-white">
                  F4
                </span>
              </h2>
              <p className="text-[11px] font-mono text-slate-500">
                1-Click Repeat Prescription for Chronic Patients (BP, Diabetes, Regulars)
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className={`p-1.5 rounded-lg border transition ${
              isDark ? 'border-zinc-700 hover:bg-zinc-800 text-zinc-400 hover:text-white' : 'border-slate-300 hover:bg-slate-200 text-slate-600'
            }`}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Search Bar */}
        <div className={`p-4 border-b shrink-0 ${isDark ? 'bg-zinc-900/50 border-zinc-800' : 'bg-slate-50 border-slate-200'}`}>
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by 10-digit mobile number or customer name (e.g. 9447123456 or RAMESHAN)..."
              className={`w-full pl-9 pr-4 py-2 text-xs font-bold rounded-xl border focus:outline-none focus:ring-2 focus:ring-sky-500 ${
                isDark ? 'bg-zinc-950 border-zinc-700 text-white placeholder-zinc-500' : 'bg-white border-slate-300 text-slate-900 placeholder-slate-400 shadow-xs'
              }`}
              autoFocus
            />
          </div>

          {/* Quick patient chip buttons */}
          <div className="flex items-center space-x-2 mt-2.5 text-[11px] overflow-x-auto pb-1">
            <span className="text-slate-500 shrink-0 font-bold">Quick Demo Records:</span>
            {Object.values(customerData).slice(0, 4).map((c, i) => (
              <button
                key={i}
                onClick={() => setSearchTerm(c.phone)}
                className={`px-2 py-0.5 rounded-lg border text-[10px] font-mono font-bold shrink-0 transition ${
                  searchTerm === c.phone
                    ? 'bg-sky-600 text-white border-sky-600'
                    : (isDark ? 'bg-zinc-800 border-zinc-700 text-zinc-300 hover:bg-zinc-700' : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100')
                }`}
              >
                {c.name} ({c.phone.slice(-4)})
              </button>
            ))}
          </div>
        </div>

        {/* Content Area */}
        <div className="p-4 overflow-y-auto flex-1 space-y-4">
          {selectedRecord ? (
            <>
              {/* Customer Profile Banner (Clean: No Lifetime Spend or stats) */}
              <div className={`p-3.5 rounded-xl border flex items-center justify-between ${
                isDark ? 'bg-zinc-950 border-zinc-800' : 'bg-sky-50/60 border-sky-200'
              }`}>
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-full bg-sky-600 text-white flex items-center justify-center font-black text-sm shrink-0">
                    {selectedRecord.name ? selectedRecord.name.charAt(0) : 'P'}
                  </div>
                  <div>
                    <h3 className="font-black text-sm text-slate-950 dark:text-zinc-100">{selectedRecord.name || 'REGISTERED PATIENT'}</h3>
                    <div className="flex items-center space-x-2 font-mono text-xs text-sky-600 font-bold">
                      <Phone className="w-3.5 h-3.5" />
                      <span>{selectedRecord.phone}</span>
                    </div>
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-[10px] text-slate-500 uppercase font-bold block">Doctor:</span>
                  <span className="font-bold text-xs text-slate-800 dark:text-zinc-200">
                    {selectedRecord.preferredDoctor || selectedRecord.bills?.[0]?.doctorName || 'General OTC'}
                  </span>
                </div>
              </div>

              {/* Past Visits / Prescriptions List */}
              <div className="space-y-3">
                <h4 className="font-black text-xs uppercase tracking-wider text-slate-500 flex items-center space-x-1.5">
                  <ShoppingBag className="w-3.5 h-3.5" />
                  <span>Previous Purchase History ({selectedRecord.bills?.length || 0} Bills)</span>
                </h4>

                {selectedRecord.bills && selectedRecord.bills.length > 0 ? (
                  selectedRecord.bills.map((bill, bIdx) => (
                    <div 
                      key={bIdx}
                      className={`p-3.5 rounded-xl border transition ${
                        isDark ? 'bg-zinc-950/80 border-zinc-800 hover:border-zinc-700' : 'bg-white border-slate-200 hover:border-slate-300 shadow-xs'
                      }`}
                    >
                      {/* Bill Meta Row */}
                      <div className="flex items-center justify-between border-b pb-2 mb-2.5 border-slate-200 dark:border-zinc-800">
                        <div className="flex items-center space-x-3 text-xs font-mono">
                          <span className="font-black text-sky-600">Bill #{bill.billNo}</span>
                          <span className="text-slate-500 flex items-center space-x-1">
                            <Calendar className="w-3 h-3 text-slate-400" />
                            <span>{bill.date}</span>
                          </span>
                          {bill.time && (
                            <span className="text-slate-500 flex items-center space-x-1">
                              <Clock className="w-3 h-3 text-slate-400" />
                              <span>{bill.time}</span>
                            </span>
                          )}
                          <span className="text-slate-600 dark:text-zinc-400 font-bold">
                            Pr: {bill.doctorName}
                          </span>
                        </div>

                        {/* 1-Click Repeat Bill Action */}
                        <button
                          onClick={() => handleRepeat(bill)}
                          className="px-3 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-mono text-xs font-black flex items-center space-x-1.5 transition shadow shadow-emerald-900/20 cursor-pointer"
                          title="Load this exact medicine list into active billing terminal"
                        >
                          <Repeat className="w-3.5 h-3.5" />
                          <span>⚡ Repeat This Bill</span>
                        </button>
                      </div>

                      {/* Items in this bill */}
                      <div className="grid grid-cols-12 gap-2 text-xs font-mono">
                        {bill.items.map((item, itIdx) => (
                          <div 
                            key={itIdx}
                            className={`col-span-12 sm:col-span-6 p-2 rounded-lg border flex items-center justify-between ${
                              isDark ? 'bg-zinc-900 border-zinc-800' : 'bg-slate-50 border-slate-200'
                            }`}
                          >
                            <div>
                              <span className="font-bold block text-slate-900 dark:text-zinc-100">{item.name}</span>
                              <div className="text-[10px] text-slate-500 flex items-center space-x-2">
                                <span>Batch: {item.batch}</span>
                                <span>Exp: {item.exp}</span>
                              </div>
                            </div>
                            <div className="text-right">
                              <span className="font-black text-sky-600 block">Qty: {item.qty}</span>
                              <span className="text-[11px] font-bold text-slate-600 dark:text-zinc-300">₹{(item.totalValue || item.mrp * item.qty).toFixed(2)}</span>
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* Bill Total */}
                      <div className="flex justify-end items-center space-x-2 mt-2 pt-1.5 border-t border-slate-100 dark:border-zinc-800 font-mono text-xs">
                        <span className="text-slate-500 text-[11px]">Invoice Total:</span>
                        <span className="font-black text-emerald-600 text-sm">₹{(bill.netPayable || 0).toFixed(2)}</span>
                        <span className="text-[10px] font-bold uppercase text-slate-400">({bill.paymentMode})</span>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-slate-500 font-mono">No previous bills recorded for this customer.</p>
                )}
              </div>
            </>
          ) : (
            <div className="text-center py-10 space-y-3">
              <div className="w-12 h-12 rounded-full bg-slate-200 dark:bg-zinc-800 flex items-center justify-center mx-auto text-slate-400">
                <Search className="w-6 h-6" />
              </div>
              <div>
                <h4 className="font-bold text-sm">No Customer Profile Found</h4>
                <p className="text-xs text-slate-500 font-mono max-w-md mx-auto mt-1">
                  Type a 10-digit mobile number or patient name above, or click one of the demo records (e.g. Rameshan - 9447123456).
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className={`px-5 py-3 border-t flex items-center justify-between text-xs shrink-0 ${
          isDark ? 'bg-zinc-950 border-zinc-800' : 'bg-slate-100 border-slate-200'
        }`}>
          <span className="font-mono text-slate-500 text-[11px]">
            Press <kbd className="px-1.5 py-0.5 rounded border font-bold">Esc</kbd> to return to billing terminal
          </span>

          <button
            onClick={onClose}
            className={`px-4 py-1.5 rounded-lg border text-xs font-bold ${
              isDark ? 'border-zinc-700 hover:bg-zinc-800 text-zinc-300' : 'border-slate-300 hover:bg-slate-200 text-slate-700'
            }`}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
