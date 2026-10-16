import React, { useState } from 'react';
import { 
  ArrowLeft, 
  Search, 
  IndianRupee, 
  CreditCard, 
  Building2, 
  Clock, 
  AlertTriangle, 
  CheckCircle2, 
  Receipt, 
  Plus, 
  X, 
  Calendar, 
  Check, 
  FileText, 
  Banknote,
  Send
} from 'lucide-react';
import supplierList from '../data/suppliers.json';

export default function DistributorPaymentsPage({ theme, onBackToBilling }) {
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('ALL'); // 'ALL', 'DUE', 'OVERDUE', 'PAID'
  const [activeTab, setActiveTab] = useState('bills'); // 'bills' or 'cheques'
  const [selectedBillForPayment, setSelectedBillForPayment] = useState(null);
  
  // Payment Form States
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMode, setPaymentMode] = useState('CHEQUE'); // 'CHEQUE', 'NEFT', 'UPI', 'CASH'
  const [chequeNo, setChequeNo] = useState('');
  const [bankName, setBankName] = useState('State Bank of India (Thalassery)');
  const [chequeDate, setChequeDate] = useState('16/10/2026');
  const [paymentToast, setPaymentToast] = useState('');

  // Mock Distributor Purchase Invoices Ledger (PURCHASE.DBF & ACCTBOOK.DBF)
  const [invoices, setInvoices] = useState([
    {
      id: 'PUR-06927',
      purNo: '06927',
      distBillNo: '020456',
      supplierCode: 'T010',
      supplierName: 'THE CAN DRUG HOUSE',
      billDate: '25/09/2026',
      creditDays: 21,
      dueDate: '16/10/2026',
      totalAmount: 4789.50,
      paidAmount: 0.00,
      balanceDue: 4789.50,
      status: 'DUE'
    },
    {
      id: 'PUR-06926',
      purNo: '06926',
      distBillNo: 'INV-88912',
      supplierCode: 'K043',
      supplierName: 'KERALA TRADE WINGS',
      billDate: '10/09/2026',
      creditDays: 30,
      dueDate: '10/10/2026',
      totalAmount: 12450.00,
      paidAmount: 0.00,
      balanceDue: 12450.00,
      status: 'OVERDUE'
    },
    {
      id: 'PUR-06925',
      purNo: '06925',
      distBillNo: 'CG-4412',
      supplierCode: 'C013',
      supplierName: 'CENTREL AGENCIES',
      billDate: '01/10/2026',
      creditDays: 35,
      dueDate: '05/11/2026',
      totalAmount: 8320.00,
      paidAmount: 3000.00,
      balanceDue: 5320.00,
      status: 'DUE'
    },
    {
      id: 'PUR-06924',
      purNo: '06924',
      distBillNo: 'GT-9011',
      supplierCode: 'G041',
      supplierName: 'GEETHA AGENCIES',
      billDate: '15/09/2026',
      creditDays: 35,
      dueDate: '20/10/2026',
      totalAmount: 6540.00,
      paidAmount: 6540.00,
      balanceDue: 0.00,
      status: 'PAID'
    }
  ]);

  // Cheque Register (CHEQUES.DBF)
  const [cheques, setCheques] = useState([
    {
      chequeNo: '445210',
      bank: 'State Bank of India',
      supplier: 'GEETHA AGENCIES',
      date: '15/10/2026',
      amount: 6540.00,
      purNo: '06924',
      status: 'CLEARED'
    }
  ]);

  // Calculations
  const totalPayable = invoices
    .filter(i => i.status !== 'PAID')
    .reduce((sum, i) => sum + i.balanceDue, 0);

  const overdueAmount = invoices
    .filter(i => i.status === 'OVERDUE')
    .reduce((sum, i) => sum + i.balanceDue, 0);

  const totalPaid = invoices.reduce((sum, i) => sum + i.paidAmount, 0);

  // Filter
  const q = search.trim().toLowerCase();
  const filteredInvoices = invoices.filter(inv => {
    const matchesSearch = q.length === 0 ||
      inv.supplierName.toLowerCase().includes(q) ||
      inv.distBillNo.toLowerCase().includes(q) ||
      inv.purNo.includes(q);

    const matchesStatus = filterStatus === 'ALL' || inv.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  const handleOpenPayment = (inv) => {
    setSelectedBillForPayment(inv);
    setPaymentAmount(inv.balanceDue.toString());
    setPaymentMode('CHEQUE');
    setChequeNo(Math.floor(100000 + Math.random() * 900000).toString());
  };

  const handleRecordPayment = (e) => {
    e.preventDefault();
    const amount = parseFloat(paymentAmount);
    if (!amount || amount <= 0) {
      alert('Enter valid payment amount');
      return;
    }
    if (amount > selectedBillForPayment.balanceDue) {
      alert('Payment amount cannot exceed invoice balance');
      return;
    }

    setInvoices(prev => prev.map(inv => {
      if (inv.id === selectedBillForPayment.id) {
        const newPaid = inv.paidAmount + amount;
        const newBalance = inv.totalAmount - newPaid;
        return {
          ...inv,
          paidAmount: newPaid,
          balanceDue: newBalance,
          status: newBalance <= 0 ? 'PAID' : inv.status
        };
      }
      return inv;
    }));

    if (paymentMode === 'CHEQUE') {
      setCheques(prev => [
        {
          chequeNo: chequeNo || 'CHQ-' + Date.now().toString().slice(-6),
          bank: bankName,
          supplier: selectedBillForPayment.supplierName,
          date: chequeDate,
          amount: amount,
          purNo: selectedBillForPayment.purNo,
          status: 'ISSUED'
        },
        ...prev
      ]);
    }

    setPaymentToast(`Payment voucher recorded! Paid ₹${amount.toFixed(2)} to ${selectedBillForPayment.supplierName} (${paymentMode})`);
    setTimeout(() => setPaymentToast(''), 4000);
    setSelectedBillForPayment(null);
  };

  return (
    <div className={`flex-1 flex flex-col overflow-hidden font-sans transition-colors ${
      theme === 'dark' ? 'bg-zinc-950 text-zinc-100' : 'bg-white text-slate-950'
    }`}>
      {/* Toast Notification */}
      {paymentToast && (
        <div className="absolute top-16 right-6 z-50 bg-emerald-600 text-white px-4 py-2.5 rounded-lg shadow-xl font-mono font-bold text-xs flex items-center space-x-2 animate-bounce">
          <CheckCircle2 className="w-4 h-4" />
          <span>{paymentToast}</span>
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
                Distributor Payments & Cheque Register [PAYMENTS.PRG / CHEQUES.PRG]
              </h2>
              <span className="text-xs font-mono font-black px-2 py-0.5 rounded border bg-amber-100 text-amber-950 border-amber-300 dark:bg-amber-950 dark:text-amber-300 dark:border-amber-800">
                ₹{totalPayable.toFixed(2)} Accounts Payable
              </span>
            </div>
            <p className={`text-xs font-mono mt-0.5 font-semibold ${
              theme === 'dark' ? 'text-zinc-400' : 'text-slate-600'
            }`}>
              Manage agency credit periods (C_DAYS), issue bank cheques, and settle purchase invoices
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          {/* Tab Selector */}
          <div className="flex items-center space-x-1 border rounded-lg p-0.5 text-xs font-mono font-bold bg-white dark:bg-zinc-900 border-slate-300 dark:border-zinc-700">
            <button
              onClick={() => setActiveTab('bills')}
              className={`px-3 py-1 rounded transition ${activeTab === 'bills' ? 'bg-sky-600 text-white shadow-sm' : 'text-slate-700 dark:text-zinc-400'}`}
            >
              Purchase Bills ({invoices.length})
            </button>
            <button
              onClick={() => setActiveTab('cheques')}
              className={`px-3 py-1 rounded transition ${activeTab === 'cheques' ? 'bg-sky-600 text-white shadow-sm' : 'text-slate-700 dark:text-zinc-400'}`}
            >
              Cheque Register ({cheques.length})
            </button>
          </div>

          {/* Search Box */}
          <div className="w-72 relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search distributor, bill no, voucher..."
              className={`w-full pl-9 pr-3 py-1.5 rounded-lg border text-xs font-bold focus:outline-none focus:ring-2 focus:ring-sky-500 ${
                theme === 'dark' ? 'bg-zinc-950 border-zinc-700 text-white placeholder-zinc-500' : 'bg-white border-slate-400 text-slate-950 placeholder-slate-500 shadow-sm'
              }`}
            />
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className={`p-4 grid grid-cols-4 gap-4 border-b font-mono ${
        theme === 'dark' ? 'bg-zinc-900/60 border-zinc-800' : 'bg-slate-50 border-slate-200'
      }`}>
        <div className={`p-3.5 rounded-xl border ${
          theme === 'dark' ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-slate-300 shadow-sm'
        }`}>
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500">Total Accounts Payable</span>
            <Building2 className="w-4 h-4 text-sky-500" />
          </div>
          <div className="text-xl font-black text-slate-950 dark:text-white mt-1">
            ₹{totalPayable.toFixed(2)}
          </div>
          <div className="text-[10px] text-slate-500 mt-0.5">Across {supplierList.length} Agencies</div>
        </div>

        <div className={`p-3.5 rounded-xl border ${
          theme === 'dark' ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-slate-300 shadow-sm'
        }`}>
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-rose-600 dark:text-rose-400">Overdue Invoices</span>
            <AlertTriangle className="w-4 h-4 text-rose-500" />
          </div>
          <div className="text-xl font-black text-rose-600 dark:text-rose-400 mt-1">
            ₹{overdueAmount.toFixed(2)}
          </div>
          <div className="text-[10px] text-rose-600 dark:text-rose-400 mt-0.5">Exceeded Credit Days</div>
        </div>

        <div className={`p-3.5 rounded-xl border ${
          theme === 'dark' ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-slate-300 shadow-sm'
        }`}>
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500">Total Settled Payments</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-xl font-black text-emerald-600 dark:text-emerald-400 mt-1">
            ₹{totalPaid.toFixed(2)}
          </div>
          <div className="text-[10px] text-slate-500 mt-0.5">Cleared via Bank / Cash</div>
        </div>

        <div className={`p-3.5 rounded-xl border ${
          theme === 'dark' ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-slate-300 shadow-sm'
        }`}>
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500">Issued Cheques</span>
            <Banknote className="w-4 h-4 text-purple-500" />
          </div>
          <div className="text-xl font-black text-purple-600 dark:text-purple-400 mt-1">
            {cheques.length} Cheques
          </div>
          <div className="text-[10px] text-slate-500 mt-0.5">Tracked in Cheque Register</div>
        </div>
      </div>

      {/* Main Content */}
      {activeTab === 'bills' ? (
        <div className="flex-1 overflow-y-auto">
          <table className={`w-full text-left border-collapse text-xs font-mono border ${
            theme === 'dark' ? 'border-zinc-800' : 'border-slate-300'
          }`}>
            <thead>
              <tr className={`border-b text-[11px] uppercase tracking-wider font-extrabold ${
                theme === 'dark' ? 'bg-zinc-900 border-zinc-800 text-zinc-300' : 'bg-slate-200 border-slate-300 text-slate-900'
              }`}>
                <th className="py-2.5 px-3 w-12 text-center border-r border-inherit">Sr</th>
                <th className="py-2.5 px-3 border-r border-inherit">Distributor Agency</th>
                <th className="py-2.5 px-3 text-center border-r border-inherit w-24">Voucher</th>
                <th className="py-2.5 px-3 text-center border-r border-inherit w-28">Dist Bill No</th>
                <th className="py-2.5 px-3 text-center border-r border-inherit w-24">Bill Date</th>
                <th className="py-2.5 px-3 text-center border-r border-inherit w-20">Terms</th>
                <th className="py-2.5 px-3 text-center border-r border-inherit w-24">Due Date</th>
                <th className="py-2.5 px-3 text-right border-r border-inherit w-28">Bill Total (₹)</th>
                <th className="py-2.5 px-3 text-right border-r border-inherit w-28">Paid (₹)</th>
                <th className="py-2.5 px-3 text-right border-r border-inherit w-28">Balance Due (₹)</th>
                <th className="py-2.5 px-3 text-center border-r border-inherit w-24">Status</th>
                <th className="py-2.5 px-3 text-center w-28">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-inherit">
              {filteredInvoices.map((inv, idx) => (
                <tr 
                  key={inv.id}
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
                      {inv.supplierName}
                    </div>
                    <div className="text-[10px] text-slate-500 font-mono">
                      Code: {inv.supplierCode}
                    </div>
                  </td>

                  <td className={`py-2 px-3 text-center font-mono font-black border-r border-inherit ${
                    theme === 'dark' ? 'text-sky-400' : 'text-sky-800'
                  }`}>
                    #{inv.purNo}
                  </td>

                  <td className={`py-2 px-3 text-center font-bold border-r border-inherit ${
                    theme === 'dark' ? 'text-zinc-200' : 'text-slate-900'
                  }`}>
                    {inv.distBillNo}
                  </td>

                  <td className={`py-2 px-3 text-center font-bold border-r border-inherit ${
                    theme === 'dark' ? 'text-zinc-300' : 'text-slate-800'
                  }`}>
                    {inv.billDate}
                  </td>

                  <td className="py-2 px-3 text-center font-bold border-r border-inherit">
                    <span className="bg-slate-200 dark:bg-zinc-800 px-1.5 py-0.5 rounded text-[10px] font-mono">
                      {inv.creditDays}d
                    </span>
                  </td>

                  <td className={`py-2 px-3 text-center font-bold border-r border-inherit ${
                    inv.status === 'OVERDUE' ? 'text-rose-600 dark:text-rose-400 font-black' : (theme === 'dark' ? 'text-zinc-300' : 'text-slate-800')
                  }`}>
                    {inv.dueDate}
                  </td>

                  <td className={`py-2 px-3 text-right font-black border-r border-inherit ${
                    theme === 'dark' ? 'text-white' : 'text-slate-950'
                  }`}>
                    ₹{inv.totalAmount.toFixed(2)}
                  </td>

                  <td className={`py-2 px-3 text-right font-bold border-r border-inherit ${
                    theme === 'dark' ? 'text-emerald-400' : 'text-emerald-800'
                  }`}>
                    ₹{inv.paidAmount.toFixed(2)}
                  </td>

                  <td className={`py-2 px-3 text-right font-black border-r border-inherit ${
                    inv.balanceDue > 0
                      ? (inv.status === 'OVERDUE' ? 'text-rose-600 dark:text-rose-400' : 'text-amber-600 dark:text-amber-400')
                      : 'text-slate-400'
                  }`}>
                    ₹{inv.balanceDue.toFixed(2)}
                  </td>

                  <td className="py-2 px-3 text-center border-r border-inherit">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-black ${
                      inv.status === 'PAID'
                        ? 'bg-emerald-100 text-emerald-950 border border-emerald-400 dark:bg-emerald-950 dark:text-emerald-300'
                        : inv.status === 'OVERDUE'
                        ? 'bg-rose-100 text-rose-950 border border-rose-400 dark:bg-rose-950 dark:text-rose-300'
                        : 'bg-amber-100 text-amber-950 border border-amber-400 dark:bg-amber-950 dark:text-amber-300'
                    }`}>
                      {inv.status}
                    </span>
                  </td>

                  <td className="py-2 px-3 text-center">
                    {inv.balanceDue > 0 ? (
                      <button
                        onClick={() => handleOpenPayment(inv)}
                        className="px-2.5 py-1 bg-sky-600 hover:bg-sky-500 text-white rounded font-bold text-[11px] shadow transition flex items-center space-x-1 mx-auto"
                      >
                        <Banknote className="w-3 h-3" />
                        <span>Pay</span>
                      </button>
                    ) : (
                      <span className="text-emerald-600 font-bold text-[11px] flex items-center justify-center space-x-1">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Settled</span>
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        /* Cheque Register View */
        <div className="flex-1 overflow-y-auto">
          <table className={`w-full text-left border-collapse text-xs font-mono border ${
            theme === 'dark' ? 'border-zinc-800' : 'border-slate-300'
          }`}>
            <thead>
              <tr className={`border-b text-[11px] uppercase tracking-wider font-extrabold ${
                theme === 'dark' ? 'bg-zinc-900 border-zinc-800 text-zinc-300' : 'bg-slate-200 border-slate-300 text-slate-900'
              }`}>
                <th className="py-2.5 px-3 w-12 text-center border-r border-inherit">Sr</th>
                <th className="py-2.5 px-3 text-center border-r border-inherit w-28">Cheque No</th>
                <th className="py-2.5 px-3 text-center border-r border-inherit w-28">Cheque Date</th>
                <th className="py-2.5 px-3 border-r border-inherit">Payee (Distributor)</th>
                <th className="py-2.5 px-3 border-r border-inherit">Drawn On Bank</th>
                <th className="py-2.5 px-3 text-center border-r border-inherit w-24">Voucher No</th>
                <th className="py-2.5 px-3 text-right border-r border-inherit w-32">Amount (₹)</th>
                <th className="py-2.5 px-3 text-center w-24">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-inherit">
              {cheques.map((chq, idx) => (
                <tr key={idx} className="border-b">
                  <td className="py-2 px-3 text-center font-bold border-r border-inherit">{idx + 1}</td>
                  <td className="py-2 px-3 text-center font-black border-r border-inherit text-purple-700 dark:text-purple-400">
                    {chq.chequeNo}
                  </td>
                  <td className="py-2 px-3 text-center font-bold border-r border-inherit">{chq.date}</td>
                  <td className="py-2 px-3 font-bold font-sans border-r border-inherit">{chq.supplier}</td>
                  <td className="py-2 px-3 font-medium border-r border-inherit">{chq.bank}</td>
                  <td className="py-2 px-3 text-center font-mono border-r border-inherit">#{chq.purNo}</td>
                  <td className="py-2 px-3 text-right font-black border-r border-inherit text-slate-950 dark:text-white">
                    ₹{chq.amount.toFixed(2)}
                  </td>
                  <td className="py-2 px-3 text-center font-bold">
                    <span className="px-2 py-0.5 rounded text-[10px] bg-emerald-100 text-emerald-950 border border-emerald-400 dark:bg-emerald-950 dark:text-emerald-300">
                      {chq.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Pay Distributor Invoice Modal */}
      {selectedBillForPayment && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className={`w-full max-w-lg rounded-2xl border shadow-2xl overflow-hidden font-sans ${
            theme === 'dark' ? 'bg-zinc-900 border-zinc-700 text-zinc-100' : 'bg-white border-slate-300 text-slate-950'
          }`}>
            <div className={`px-5 py-3.5 border-b flex items-center justify-between ${
              theme === 'dark' ? 'bg-zinc-800 border-zinc-700' : 'bg-sky-50 border-sky-200'
            }`}>
              <div className="flex items-center space-x-2">
                <Banknote className="w-5 h-5 text-sky-600" />
                <h3 className="font-black text-sm uppercase tracking-wide">
                  Distributor Payment Voucher [PAYMENTS.PRG]
                </h3>
              </div>
              <button 
                onClick={() => setSelectedBillForPayment(null)}
                className="p-1 rounded-lg hover:bg-slate-200 dark:hover:bg-zinc-700 text-slate-500"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleRecordPayment} className="p-5 space-y-3">
              <div className="p-3 rounded-lg border font-mono text-xs space-y-1.5 bg-slate-50 dark:bg-zinc-950 border-slate-200 dark:border-zinc-800">
                <div className="flex justify-between">
                  <span className="text-slate-500">Distributor Agency:</span>
                  <span className="font-black text-slate-900 dark:text-white">{selectedBillForPayment.supplierName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Distributor Bill No:</span>
                  <span className="font-bold">{selectedBillForPayment.distBillNo} (Voucher #{selectedBillForPayment.purNo})</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Due Date:</span>
                  <span className="font-bold">{selectedBillForPayment.dueDate} ({selectedBillForPayment.creditDays} days credit)</span>
                </div>
                <div className="flex justify-between border-t pt-1">
                  <span className="text-slate-500 font-bold">Outstanding Payable:</span>
                  <span className="font-black text-amber-600 dark:text-amber-400 text-sm">
                    ₹{selectedBillForPayment.balanceDue.toFixed(2)}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <label className="block text-xs font-bold mb-1">Payment Method</label>
                  <div className="grid grid-cols-4 gap-2">
                    {['CHEQUE', 'NEFT', 'UPI', 'CASH'].map(m => (
                      <button
                        key={m}
                        type="button"
                        onClick={() => setPaymentMode(m)}
                        className={`py-1.5 rounded-lg font-mono font-bold text-xs border transition ${
                          paymentMode === m
                            ? 'bg-sky-600 text-white border-sky-600 shadow'
                            : 'border-slate-300 dark:border-zinc-700 text-slate-700 dark:text-zinc-300'
                        }`}
                      >
                        {m}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold mb-1">Payment Amount (₹)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="1"
                    max={selectedBillForPayment.balanceDue}
                    value={paymentAmount}
                    onChange={(e) => setPaymentAmount(e.target.value)}
                    required
                    className={`w-full px-3 py-1.5 rounded-lg border font-mono font-black text-sm focus:ring-2 focus:ring-sky-500 ${
                      theme === 'dark' ? 'bg-zinc-950 border-zinc-700 text-white' : 'bg-white border-slate-400 text-slate-950'
                    }`}
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold mb-1">
                    {paymentMode === 'CHEQUE' ? 'Cheque No.' : 'UTR / Ref No.'}
                  </label>
                  <input
                    type="text"
                    value={chequeNo}
                    onChange={(e) => setChequeNo(e.target.value)}
                    placeholder={paymentMode === 'CHEQUE' ? 'e.g. 445210' : 'e.g. UTR-99823'}
                    className={`w-full px-3 py-1.5 rounded-lg border font-mono font-bold text-xs focus:ring-2 focus:ring-sky-500 ${
                      theme === 'dark' ? 'bg-zinc-950 border-zinc-700 text-white' : 'bg-white border-slate-400 text-slate-950'
                    }`}
                  />
                </div>

                <div className="col-span-2">
                  <label className="block text-xs font-bold mb-1">Bank Account [ACCTBOOK.DBF]</label>
                  <input
                    type="text"
                    value={bankName}
                    onChange={(e) => setBankName(e.target.value)}
                    className={`w-full px-3 py-1.5 rounded-lg border font-mono text-xs focus:ring-2 focus:ring-sky-500 ${
                      theme === 'dark' ? 'bg-zinc-950 border-zinc-700 text-white' : 'bg-white border-slate-400 text-slate-950'
                    }`}
                  />
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
                  className="px-5 py-2 bg-sky-600 hover:bg-sky-500 text-white rounded-lg text-xs font-black flex items-center space-x-1.5 shadow"
                >
                  <Send className="w-4 h-4" />
                  <span>Issue Payment Voucher</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
