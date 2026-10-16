import React, { useState } from 'react';
import { 
  ArrowLeft, 
  Search, 
  IndianRupee, 
  CreditCard, 
  UserCheck, 
  Clock, 
  AlertCircle, 
  Receipt, 
  CheckCircle2, 
  Printer, 
  Download, 
  User, 
  Phone, 
  MapPin, 
  Plus, 
  X, 
  Calendar 
} from 'lucide-react';

export default function CustomerCreditLedgerPage({ theme, onBackToBilling }) {
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('ALL'); // 'ALL', 'PENDING', 'SETTLED'
  const [activeTab, setActiveTab] = useState('bills'); // 'bills' or 'customers'
  const [selectedBillForPayment, setSelectedBillForPayment] = useState(null);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMode, setPaymentMode] = useState('CASH');
  const [receiptToast, setReceiptToast] = useState('');

  // Mock Active Customer Credit Ledger (matching DUEBILL.DBF & CUSTOMER.DBF)
  const [dueBills, setDueBills] = useState([
    {
      id: 'DUE-001',
      billNo: '025304',
      date: '14/10/2026',
      customer: 'RAMESHAN',
      phone: '9447123456',
      location: 'Chirakkara, Thalassery',
      doctor: 'Dr. Madhusoodanan T',
      totalAmount: 340.00,
      paidAmount: 0.00,
      dueAmount: 340.00,
      daysOverdue: 2,
      status: 'PENDING'
    },
    {
      id: 'DUE-002',
      billNo: '025288',
      date: '10/10/2026',
      customer: 'SURESH BABU',
      phone: '9847234567',
      location: 'Sadananda Pai Road',
      doctor: 'Dr. Manojan',
      totalAmount: 1250.00,
      paidAmount: 500.00,
      dueAmount: 750.00,
      daysOverdue: 6,
      status: 'PENDING'
    },
    {
      id: 'DUE-003',
      billNo: '025210',
      date: '02/10/2026',
      customer: 'MOHANAN K',
      phone: '9495345678',
      location: 'Near Old Bus Stand, Thalassery',
      doctor: 'Dr. Deepa Manojan',
      totalAmount: 890.00,
      paidAmount: 0.00,
      dueAmount: 890.00,
      daysOverdue: 14,
      status: 'PENDING'
    },
    {
      id: 'DUE-004',
      billNo: '025150',
      date: '25/09/2026',
      customer: 'DEVADASAN',
      phone: '9446456789',
      location: 'Temple Gate, Thalassery',
      doctor: 'Dr. Saurabh Manojan',
      totalAmount: 450.00,
      paidAmount: 450.00,
      dueAmount: 0.00,
      daysOverdue: 0,
      status: 'SETTLED'
    },
    {
      id: 'DUE-005',
      billNo: '025092',
      date: '18/09/2026',
      customer: 'VASANTHA',
      phone: '9447567890',
      location: 'Kadirur, Thalassery',
      doctor: 'Dr. Lakshmi Saurabh',
      totalAmount: 620.00,
      paidAmount: 620.00,
      dueAmount: 0.00,
      daysOverdue: 0,
      status: 'SETTLED'
    }
  ]);

  // Aggregate stats
  const totalOutstanding = dueBills
    .filter(b => b.status === 'PENDING')
    .reduce((sum, b) => sum + b.dueAmount, 0);

  const pendingBillsCount = dueBills.filter(b => b.status === 'PENDING').length;
  const settledBillsCount = dueBills.filter(b => b.status === 'SETTLED').length;
  const totalCollected = dueBills.reduce((sum, b) => sum + b.paidAmount, 0);

  // Filter bills
  const q = search.trim().toLowerCase();
  const filteredBills = dueBills.filter(b => {
    const matchesSearch = q.length === 0 || 
      b.customer.toLowerCase().includes(q) ||
      b.phone.includes(q) ||
      b.billNo.includes(q) ||
      b.location.toLowerCase().includes(q);

    const matchesStatus = filterStatus === 'ALL' || b.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  // Open Receive Payment Modal
  const handleOpenPayment = (bill) => {
    setSelectedBillForPayment(bill);
    setPaymentAmount(bill.dueAmount.toString());
    setPaymentMode('CASH');
  };

  // Submit Payment Settlement
  const handleSubmitPayment = (e) => {
    e.preventDefault();
    const amount = parseFloat(paymentAmount);
    if (!amount || amount <= 0) {
      alert('Enter valid payment amount');
      return;
    }
    if (amount > selectedBillForPayment.dueAmount) {
      alert(`Amount cannot exceed outstanding balance of ₹${selectedBillForPayment.dueAmount}`);
      return;
    }

    setDueBills(prev => prev.map(b => {
      if (b.id === selectedBillForPayment.id) {
        const newPaid = b.paidAmount + amount;
        const newDue = b.totalAmount - newPaid;
        return {
          ...b,
          paidAmount: newPaid,
          dueAmount: newDue,
          status: newDue <= 0 ? 'SETTLED' : 'PENDING'
        };
      }
      return b;
    }));

    setReceiptToast(`Receipt generated! Received ₹${amount.toFixed(2)} from ${selectedBillForPayment.customer} for Bill #${selectedBillForPayment.billNo}`);
    setTimeout(() => setReceiptToast(''), 4000);
    setSelectedBillForPayment(null);
  };

  return (
    <div className={`flex-1 flex flex-col overflow-hidden font-sans transition-colors ${
      theme === 'dark' ? 'bg-zinc-950 text-zinc-100' : 'bg-white text-slate-950'
    }`}>
      {/* Toast Notification */}
      {receiptToast && (
        <div className="absolute top-16 right-6 z-50 bg-emerald-600 text-white px-4 py-2.5 rounded-lg shadow-xl font-mono font-bold text-xs flex items-center space-x-2 animate-bounce">
          <CheckCircle2 className="w-4 h-4" />
          <span>{receiptToast}</span>
        </div>
      )}

      {/* Header */}
      <div className={`px-4 py-3 border-b flex items-center justify-between ${
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
                Customer Credit & Due Bills Ledger [DUEBILL.PRG / CUSTOMER.DBF]
              </h2>
              <span className="text-xs font-mono font-black px-2 py-0.5 rounded border bg-amber-100 text-amber-950 border-amber-300 dark:bg-amber-950 dark:text-amber-300 dark:border-amber-800">
                ₹{totalOutstanding.toFixed(2)} Outstanding
              </span>
            </div>
            <p className={`text-xs font-mono mt-0.5 font-semibold ${
              theme === 'dark' ? 'text-zinc-400' : 'text-slate-600'
            }`}>
              Track monthly patient credit accounts, due collections, and issue receipt vouchers
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          {/* Status Filter */}
          <div className="flex items-center space-x-1 border rounded-lg p-0.5 text-xs font-mono font-bold bg-white dark:bg-zinc-900 border-slate-300 dark:border-zinc-700">
            <button
              onClick={() => setFilterStatus('ALL')}
              className={`px-2.5 py-1 rounded transition ${filterStatus === 'ALL' ? 'bg-sky-600 text-white shadow-sm' : 'text-slate-700 dark:text-zinc-400'}`}
            >
              All ({dueBills.length})
            </button>
            <button
              onClick={() => setFilterStatus('PENDING')}
              className={`px-2.5 py-1 rounded transition ${filterStatus === 'PENDING' ? 'bg-amber-600 text-white shadow-sm' : 'text-slate-700 dark:text-zinc-400'}`}
            >
              Due ({pendingBillsCount})
            </button>
            <button
              onClick={() => setFilterStatus('SETTLED')}
              className={`px-2.5 py-1 rounded transition ${filterStatus === 'SETTLED' ? 'bg-emerald-600 text-white shadow-sm' : 'text-slate-700 dark:text-zinc-400'}`}
            >
              Settled ({settledBillsCount})
            </button>
          </div>

          {/* Search Box */}
          <div className="w-72 relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search customer, phone, bill no..."
              className={`w-full pl-9 pr-3 py-1.5 rounded-lg border text-xs font-bold focus:outline-none focus:ring-2 focus:ring-sky-500 ${
                theme === 'dark' ? 'bg-zinc-950 border-zinc-700 text-white placeholder-zinc-500' : 'bg-white border-slate-400 text-slate-950 placeholder-slate-500 shadow-sm'
              }`}
            />
          </div>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className={`p-4 grid grid-cols-4 gap-4 border-b font-mono ${
        theme === 'dark' ? 'bg-zinc-900/60 border-zinc-800' : 'bg-slate-50 border-slate-200'
      }`}>
        <div className={`p-3.5 rounded-xl border ${
          theme === 'dark' ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-slate-300 shadow-sm'
        }`}>
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500">Total Customer Due</span>
            <AlertCircle className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-xl font-black text-amber-600 dark:text-amber-400 mt-1">
            ₹{totalOutstanding.toFixed(2)}
          </div>
          <div className="text-[10px] text-slate-500 mt-0.5">{pendingBillsCount} Unpaid Bills</div>
        </div>

        <div className={`p-3.5 rounded-xl border ${
          theme === 'dark' ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-slate-300 shadow-sm'
        }`}>
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500">Collected Payments</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-xl font-black text-emerald-600 dark:text-emerald-400 mt-1">
            ₹{totalCollected.toFixed(2)}
          </div>
          <div className="text-[10px] text-slate-500 mt-0.5">{settledBillsCount} Bills Fully Settled</div>
        </div>

        <div className={`p-3.5 rounded-xl border ${
          theme === 'dark' ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-slate-300 shadow-sm'
        }`}>
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500">Total Credit Billed</span>
            <Receipt className="w-4 h-4 text-sky-500" />
          </div>
          <div className="text-xl font-black text-sky-600 dark:text-sky-400 mt-1">
            ₹{(totalOutstanding + totalCollected).toFixed(2)}
          </div>
          <div className="text-[10px] text-slate-500 mt-0.5">{dueBills.length} Total Credit Ledgers</div>
        </div>

        <div className={`p-3.5 rounded-xl border ${
          theme === 'dark' ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-slate-300 shadow-sm'
        }`}>
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500">Payment Collection Rate</span>
            <CreditCard className="w-4 h-4 text-purple-500" />
          </div>
          <div className="text-xl font-black text-purple-600 dark:text-purple-400 mt-1">
            {((totalCollected / (totalOutstanding + totalCollected || 1)) * 100).toFixed(1)}%
          </div>
          <div className="text-[10px] text-slate-500 mt-0.5">Recovery Percentage</div>
        </div>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-y-auto">
        <table className={`w-full text-left border-collapse text-xs font-mono border ${
          theme === 'dark' ? 'border-zinc-800' : 'border-slate-300'
        }`}>
          <thead>
            <tr className={`border-b text-[11px] uppercase tracking-wider font-extrabold ${
              theme === 'dark' ? 'bg-zinc-900 border-zinc-800 text-zinc-300' : 'bg-slate-200 border-slate-300 text-slate-900'
            }`}>
              <th className="py-2.5 px-3 w-12 text-center border-r border-inherit">Sr</th>
              <th className="py-2.5 px-3 text-center border-r border-inherit w-24">Bill No</th>
              <th className="py-2.5 px-3 text-center border-r border-inherit w-28">Bill Date</th>
              <th className="py-2.5 px-3 border-r border-inherit">Customer / Patient Name</th>
              <th className="py-2.5 px-3 border-r border-inherit w-36">Phone Number</th>
              <th className="py-2.5 px-3 border-r border-inherit w-44">Location / Area</th>
              <th className="py-2.5 px-3 text-right border-r border-inherit w-28">Bill Total (₹)</th>
              <th className="py-2.5 px-3 text-right border-r border-inherit w-28">Paid (₹)</th>
              <th className="py-2.5 px-3 text-right border-r border-inherit w-28">Due Balance (₹)</th>
              <th className="py-2.5 px-3 text-center border-r border-inherit w-24">Status</th>
              <th className="py-2.5 px-3 text-center w-28">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-inherit">
            {filteredBills.map((b, idx) => (
              <tr 
                key={b.id}
                className={`transition-colors border-b ${
                  theme === 'dark' ? 'hover:bg-zinc-900 border-zinc-800' : 'hover:bg-sky-50/70 border-slate-300'
                }`}
              >
                <td className={`py-2 px-3 text-center font-bold border-r border-inherit ${
                  theme === 'dark' ? 'text-zinc-400' : 'text-slate-600'
                }`}>
                  {idx + 1}
                </td>

                <td className={`py-2 px-3 text-center font-black border-r border-inherit font-mono ${
                  theme === 'dark' ? 'text-sky-400' : 'text-sky-800'
                }`}>
                  #{b.billNo}
                </td>

                <td className={`py-2 px-3 text-center font-bold border-r border-inherit ${
                  theme === 'dark' ? 'text-zinc-300' : 'text-slate-800'
                }`}>
                  {b.date}
                </td>

                <td className="py-2 px-3 font-sans border-r border-inherit">
                  <div className={`font-black text-sm ${theme === 'dark' ? 'text-white' : 'text-slate-950'}`}>
                    {b.customer}
                  </div>
                  <div className="text-[10px] text-slate-500 font-mono">
                    Ref: {b.doctor}
                  </div>
                </td>

                <td className={`py-2 px-3 font-mono font-bold border-r border-inherit ${
                  theme === 'dark' ? 'text-zinc-200' : 'text-slate-900'
                }`}>
                  <div className="flex items-center space-x-1">
                    <Phone className="w-3.5 h-3.5 text-slate-500" />
                    <span>{b.phone}</span>
                  </div>
                </td>

                <td className={`py-2 px-3 font-sans border-r border-inherit ${
                  theme === 'dark' ? 'text-zinc-300' : 'text-slate-800'
                }`}>
                  <div className="flex items-center space-x-1 truncate">
                    <MapPin className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                    <span className="truncate">{b.location}</span>
                  </div>
                </td>

                <td className={`py-2 px-3 text-right font-black border-r border-inherit ${
                  theme === 'dark' ? 'text-white' : 'text-slate-950'
                }`}>
                  ₹{b.totalAmount.toFixed(2)}
                </td>

                <td className={`py-2 px-3 text-right font-bold border-r border-inherit ${
                  theme === 'dark' ? 'text-emerald-400' : 'text-emerald-800'
                }`}>
                  ₹{b.paidAmount.toFixed(2)}
                </td>

                <td className={`py-2 px-3 text-right font-black border-r border-inherit ${
                  b.dueAmount > 0 
                    ? (theme === 'dark' ? 'text-amber-400' : 'text-amber-700 font-extrabold')
                    : 'text-slate-400'
                }`}>
                  ₹{b.dueAmount.toFixed(2)}
                </td>

                <td className="py-2 px-3 text-center border-r border-inherit">
                  <span className={`px-2 py-0.5 rounded text-[10px] font-black ${
                    b.status === 'SETTLED'
                      ? (theme === 'dark' ? 'bg-emerald-950 text-emerald-300 border border-emerald-800' : 'bg-emerald-100 text-emerald-950 border border-emerald-400')
                      : (theme === 'dark' ? 'bg-amber-950 text-amber-300 border border-amber-800' : 'bg-amber-100 text-amber-950 border border-amber-400')
                  }`}>
                    {b.status}
                  </span>
                </td>

                <td className="py-2 px-3 text-center">
                  {b.status === 'PENDING' ? (
                    <button
                      onClick={() => handleOpenPayment(b)}
                      className="px-2.5 py-1 bg-sky-600 hover:bg-sky-500 text-white rounded font-bold text-[11px] shadow transition flex items-center space-x-1 mx-auto"
                    >
                      <IndianRupee className="w-3 h-3" />
                      <span>Receive</span>
                    </button>
                  ) : (
                    <span className="text-emerald-600 font-bold text-[11px] flex items-center justify-center space-x-1">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Cleared</span>
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Receive Due Payment Modal */}
      {selectedBillForPayment && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className={`w-full max-w-md rounded-2xl border shadow-2xl overflow-hidden font-sans ${
            theme === 'dark' ? 'bg-zinc-900 border-zinc-700 text-zinc-100' : 'bg-white border-slate-300 text-slate-950'
          }`}>
            <div className={`px-5 py-3.5 border-b flex items-center justify-between ${
              theme === 'dark' ? 'bg-zinc-800 border-zinc-700' : 'bg-sky-50 border-sky-200'
            }`}>
              <div className="flex items-center space-x-2">
                <Receipt className="w-5 h-5 text-sky-600" />
                <h3 className="font-black text-sm uppercase tracking-wide">
                  Receive Credit Due [RECEIPT.DBF]
                </h3>
              </div>
              <button 
                onClick={() => setSelectedBillForPayment(null)}
                className="p-1 rounded-lg hover:bg-slate-200 dark:hover:bg-zinc-700 text-slate-500"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmitPayment} className="p-5 space-y-4">
              <div className="p-3 rounded-lg border font-mono text-xs space-y-1.5 bg-slate-50 dark:bg-zinc-950 border-slate-200 dark:border-zinc-800">
                <div className="flex justify-between">
                  <span className="text-slate-500">Customer Name:</span>
                  <span className="font-black text-slate-900 dark:text-white">{selectedBillForPayment.customer}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Bill Number:</span>
                  <span className="font-bold">#{selectedBillForPayment.billNo}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Bill Date:</span>
                  <span className="font-bold">{selectedBillForPayment.date}</span>
                </div>
                <div className="flex justify-between border-t pt-1">
                  <span className="text-slate-500 font-bold">Outstanding Due:</span>
                  <span className="font-black text-amber-600 dark:text-amber-400 text-sm">
                    ₹{selectedBillForPayment.dueAmount.toFixed(2)}
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold mb-1">Receipt Payment Amount (₹)</label>
                <input
                  type="number"
                  step="0.01"
                  min="1"
                  max={selectedBillForPayment.dueAmount}
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value)}
                  required
                  className={`w-full px-3 py-2 rounded-lg border font-mono font-black text-base focus:ring-2 focus:ring-sky-500 ${
                    theme === 'dark' ? 'bg-zinc-950 border-zinc-700 text-white' : 'bg-white border-slate-400 text-slate-950'
                  }`}
                />
              </div>

              <div>
                <label className="block text-xs font-bold mb-1">Payment Method</label>
                <div className="grid grid-cols-3 gap-2">
                  {['CASH', 'UPI', 'CARD'].map(mode => (
                    <button
                      key={mode}
                      type="button"
                      onClick={() => setPaymentMode(mode)}
                      className={`py-2 rounded-lg font-mono font-bold text-xs border transition ${
                        paymentMode === mode
                          ? 'bg-sky-600 text-white border-sky-600 shadow'
                          : 'border-slate-300 dark:border-zinc-700 text-slate-700 dark:text-zinc-300'
                      }`}
                    >
                      {mode}
                    </button>
                  ))}
                </div>
              </div>

              <div className="pt-3 border-t flex items-center justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setSelectedBillForPayment(null)}
                  className={`px-4 py-2 rounded-lg text-xs font-bold ${
                    theme === 'dark' ? 'bg-zinc-800 hover:bg-zinc-700 text-zinc-300' : 'bg-slate-200 hover:bg-slate-300 text-slate-800'
                  }`}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-black flex items-center space-x-1.5 shadow"
                >
                  <Receipt className="w-4 h-4" />
                  <span>Generate Receipt</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
