import React, { useState } from 'react';
import { 
  ArrowLeft, 
  Printer, 
  TrendingUp, 
  IndianRupee, 
  CreditCard, 
  Banknote, 
  Percent, 
  Lock, 
  ChevronLeft, 
  ChevronRight, 
  Calendar,
  FileSpreadsheet,
  CheckCircle2
} from 'lucide-react';

export default function DailySalesRegisterPage({ 
  theme, 
  onBackToBilling, 
  authenticatedRole,
  onOpenPasswordModal
}) {
  const [viewMode, setViewMode] = useState('daily'); // 'daily' or 'monthly'
  const [selectedDate, setSelectedDate] = useState('16/10/2026');
  const [selectedMonth, setSelectedMonth] = useState('10/2026'); // MM/YYYY

  // Mock Sales Database across multiple days (matching COUNTER.DBF & SALES.DBF)
  const salesDatabase = {
    '16/10/2026': [
      { no: '025316', time: '14:52', patient: 'PRADEEPKUMAR', doctor: 'Dr. Madhusoodanan T', items: 1, amount: 257.80, cost: 206.24, mode: 'CASH' },
      { no: '025315', time: '13:59', patient: 'DINOOP', doctor: 'Dr. Madhusoodanan T', items: 2, amount: 583.80, cost: 467.04, mode: 'UPI' },
      { no: '025314', time: '13:21', patient: 'SOBHA', doctor: 'Dr. Manojan', items: 1, amount: 143.46, cost: 114.77, mode: 'CASH' },
      { no: '025313', time: '12:45', patient: 'RAJAN', doctor: 'Dr. Deepa Manojan', items: 5, amount: 505.26, cost: 404.21, mode: 'UPI' },
      { no: '025312', time: '11:15', patient: 'SUSHAMA', doctor: 'Dr. Saurabh Manojan', items: 4, amount: 415.33, cost: 332.26, mode: 'CASH' },
      { no: '025311', time: '10:30', patient: 'PRAKASAN', doctor: 'Dr. Lakshmi Saurabh', items: 2, amount: 180.00, cost: 144.00, mode: 'CASH' },
      { no: '025310', time: '09:45', patient: 'USHA', doctor: 'Dr. Madhusoodanan T', items: 3, amount: 320.50, cost: 256.40, mode: 'UPI' }
    ],
    '15/10/2026': [
      { no: '025309', time: '19:40', patient: 'BALAKRISHNAN', doctor: 'Dr. Madhusoodanan T', items: 3, amount: 420.00, cost: 330.00, mode: 'CASH' },
      { no: '025308', time: '18:15', patient: 'GEETHA', doctor: 'Dr. Manojan', items: 2, amount: 310.50, cost: 245.00, mode: 'UPI' },
      { no: '025307', time: '16:30', patient: 'MOHAMMED', doctor: 'Dr. Deepa Manojan', items: 4, amount: 680.00, cost: 540.00, mode: 'CASH' },
      { no: '025306', time: '14:20', patient: 'SHEELA', doctor: 'Dr. Saurabh Manojan', items: 1, amount: 95.00, cost: 72.00, mode: 'CASH' },
      { no: '025305', time: '11:10', patient: 'ANANDAN', doctor: 'Dr. Lakshmi Saurabh', items: 6, amount: 890.00, cost: 710.00, mode: 'UPI' }
    ],
    '14/10/2026': [
      { no: '025304', time: '20:10', patient: 'RAMESHAN', doctor: 'Dr. Madhusoodanan T', items: 2, amount: 340.00, cost: 270.00, mode: 'CASH' },
      { no: '025303', time: '17:45', patient: 'SREELATHA', doctor: 'Dr. Manojan', items: 3, amount: 510.00, cost: 405.00, mode: 'UPI' },
      { no: '025302', time: '15:30', patient: 'VIJAYAN', doctor: 'Dr. Deepa Manojan', items: 5, amount: 720.00, cost: 575.00, mode: 'CASH' },
      { no: '025301', time: '12:00', patient: 'DEVAKI', doctor: 'Dr. Saurabh Manojan', items: 2, amount: 260.00, cost: 205.00, mode: 'CASH' }
    ]
  };

  // Day navigation helpers
  const availableDates = Object.keys(salesDatabase);
  const currentBills = salesDatabase[selectedDate] || [];

  const handlePrevDay = () => {
    const idx = availableDates.indexOf(selectedDate);
    if (idx !== -1 && idx < availableDates.length - 1) {
      setSelectedDate(availableDates[idx + 1]);
    } else {
      // Create a previous day date string
      const [d, m, y] = selectedDate.split('/').map(Number);
      const prev = new Date(y, m - 1, d - 1);
      const str = `${String(prev.getDate()).padStart(2, '0')}/${String(prev.getMonth() + 1).padStart(2, '0')}/${prev.getFullYear()}`;
      setSelectedDate(str);
    }
  };

  const handleNextDay = () => {
    const idx = availableDates.indexOf(selectedDate);
    if (idx > 0) {
      setSelectedDate(availableDates[idx - 1]);
    } else {
      const [d, m, y] = selectedDate.split('/').map(Number);
      const next = new Date(y, m - 1, d + 1);
      const str = `${String(next.getDate()).padStart(2, '0')}/${String(next.getMonth() + 1).padStart(2, '0')}/${next.getFullYear()}`;
      setSelectedDate(str);
    }
  };

  // Current day financial calculations
  const totalSales = currentBills.reduce((acc, b) => acc + b.amount, 0);
  const totalCost = currentBills.reduce((acc, b) => acc + b.cost, 0);
  const grossMargin = totalSales - totalCost;
  const marginPercent = totalSales > 0 ? ((grossMargin / totalSales) * 100).toFixed(1) : '0.0';
  const cashSales = currentBills.filter(b => b.mode === 'CASH').reduce((acc, b) => acc + b.amount, 0);
  const upiSales = currentBills.filter(b => b.mode === 'UPI').reduce((acc, b) => acc + b.amount, 0);

  // Monthly summary aggregation (Days 1 to 16 for October 2026)
  const monthlyDays = [
    { date: '16/10/2026', day: 'Fri', bills: 7, cash: 996.59, upi: 1409.56, gross: 2406.15, cost: 1924.92, margin: 481.23, pct: '20.0%' },
    { date: '15/10/2026', day: 'Thu', bills: 5, cash: 1195.00, upi: 1200.50, gross: 2395.50, cost: 1897.00, margin: 498.50, pct: '20.8%' },
    { date: '14/10/2026', day: 'Wed', bills: 4, cash: 1320.00, upi: 510.00, gross: 1830.00, cost: 1455.00, margin: 375.00, pct: '20.5%' },
    { date: '13/10/2026', day: 'Tue', bills: 8, cash: 1650.00, upi: 1120.00, gross: 2770.00, cost: 2188.00, margin: 582.00, pct: '21.0%' },
    { date: '12/10/2026', day: 'Mon', bills: 9, cash: 1890.00, upi: 1450.00, gross: 3340.00, cost: 2638.00, margin: 702.00, pct: '21.0%' },
    { date: '11/10/2026', day: 'Sun', bills: 6, cash: 1400.00, upi: 950.00, gross: 2350.00, cost: 1856.00, margin: 494.00, pct: '21.0%' },
    { date: '10/10/2026', day: 'Sat', bills: 11, cash: 2450.00, upi: 1890.00, gross: 4340.00, cost: 3428.00, margin: 912.00, pct: '21.0%' },
    { date: '09/10/2026', day: 'Fri', bills: 8, cash: 1580.00, upi: 1240.00, gross: 2820.00, cost: 2227.00, margin: 593.00, pct: '21.0%' },
    { date: '08/10/2026', day: 'Thu', bills: 7, cash: 1350.00, upi: 1080.00, gross: 2430.00, cost: 1919.00, margin: 511.00, pct: '21.0%' },
    { date: '07/10/2026', day: 'Wed', bills: 6, cash: 1220.00, upi: 990.00, gross: 2210.00, cost: 1745.00, margin: 465.00, pct: '21.0%' }
  ];

  const monthGross = monthlyDays.reduce((a, b) => a + b.gross, 0);
  const monthCash = monthlyDays.reduce((a, b) => a + b.cash, 0);
  const monthUpi = monthlyDays.reduce((a, b) => a + b.upi, 0);
  const monthCost = monthlyDays.reduce((a, b) => a + b.cost, 0);
  const monthMargin = monthGross - monthCost;
  const monthMarginPct = ((monthMargin / monthGross) * 100).toFixed(1);

  // STRICT SECURITY CHECK: Admin/Manager Only
  const isManager = authenticatedRole === 'MANAGER';

  if (!isManager) {
    return (
      <div className={`flex-1 flex flex-col items-center justify-center p-6 text-center font-sans ${
        theme === 'dark' ? 'bg-zinc-950 text-zinc-100' : 'bg-white text-slate-900'
      }`}>
        <div className={`p-8 rounded-2xl border max-w-md w-full shadow-2xl ${
          theme === 'dark' ? 'bg-zinc-900 border-zinc-800' : 'bg-slate-50 border-slate-300'
        }`}>
          <div className="w-14 h-14 rounded-full bg-amber-500/10 border border-amber-500/20 flex items-center justify-center mx-auto mb-4 text-amber-500">
            <Lock className="w-7 h-7" />
          </div>

          <h2 className={`text-lg font-black mb-1 ${theme === 'dark' ? 'text-white' : 'text-slate-950'}`}>
            Admin / Manager Authorization Required
          </h2>
          <p className="text-xs font-mono text-slate-500 mb-6">
            Daily Sales Totals, Cash Drawer Tally, and Store Profit Margins are restricted to Admin/Manager [USER.DBF Code CC].
          </p>

          <div className="space-y-3">
            <button
              onClick={() => onOpenPasswordModal('Manager Security Authorization', 'Enter Manager PIN (CC) to view daily sales & profit margins.')}
              className="w-full py-2.5 bg-sky-600 hover:bg-sky-500 text-white font-black rounded-lg text-xs transition shadow flex items-center justify-center space-x-2"
            >
              <Lock className="w-4 h-4" />
              <span>Enter Manager PIN (CC)</span>
            </button>

            <button
              onClick={onBackToBilling}
              className={`w-full py-2 rounded-lg font-bold text-xs border ${
                theme === 'dark' ? 'border-zinc-700 hover:bg-zinc-800 text-zinc-300' : 'border-slate-300 hover:bg-slate-200 text-slate-700'
              }`}
            >
              Return to Counter Billing (Esc)
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`flex-1 flex flex-col overflow-hidden font-sans transition-colors ${
      theme === 'dark' ? 'bg-zinc-950 text-zinc-100' : 'bg-white text-slate-950'
    }`}>
      {/* 1. Top Header Bar */}
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
                Sales Register & Daily Margins [TRN002 / REP023]
              </h2>
              <span className={`text-xs font-mono font-bold px-2 py-0.5 rounded border ${
                theme === 'dark' ? 'bg-emerald-950 text-emerald-300 border-emerald-800' : 'bg-emerald-100 text-emerald-950 border-emerald-400'
              }`}>
                Admin Verified (Manager CC)
              </span>
            </div>
            <p className={`text-xs font-mono mt-0.5 font-medium ${
              theme === 'dark' ? 'text-zinc-400' : 'text-slate-600'
            }`}>
              Beta Pharmacy, Chirakkara, Thalassery • Counter 01 Cash Drawer
            </p>
          </div>
        </div>

        {/* View Mode Toggle: Day-Wise vs Monthly Summary */}
        <div className="flex items-center space-x-2 font-mono text-xs">
          <div className="flex rounded-lg border overflow-hidden">
            <button
              onClick={() => setViewMode('daily')}
              className={`px-3 py-1.5 font-bold transition ${
                viewMode === 'daily'
                  ? 'bg-sky-600 text-white'
                  : (theme === 'dark' ? 'bg-zinc-800 text-zinc-300 hover:text-white' : 'bg-white text-slate-700 hover:bg-slate-100')
              }`}
            >
              Day-Wise Register
            </button>
            <button
              onClick={() => setViewMode('monthly')}
              className={`px-3 py-1.5 font-bold transition ${
                viewMode === 'monthly'
                  ? 'bg-sky-600 text-white'
                  : (theme === 'dark' ? 'bg-zinc-800 text-zinc-300 hover:text-white' : 'bg-white text-slate-700 hover:bg-slate-100')
              }`}
            >
              Monthly Summary Report
            </button>
          </div>

          <button
            onClick={() => window.print()}
            className="py-1.5 px-3 bg-sky-600 hover:bg-sky-500 text-white font-black rounded-lg flex items-center space-x-1 shadow"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print Report</span>
          </button>
        </div>
      </div>

      {viewMode === 'daily' ? (
        <>
          {/* 2. Date Navigation Bar */}
          <div className={`px-4 py-2 border-b flex items-center justify-between font-mono text-xs ${
            theme === 'dark' ? 'bg-zinc-900/60 border-zinc-800' : 'bg-slate-50 border-slate-300'
          }`}>
            <div className="flex items-center space-x-2">
              <button
                onClick={handlePrevDay}
                className={`px-2.5 py-1 rounded border font-bold flex items-center space-x-1 transition ${
                  theme === 'dark' ? 'border-zinc-700 bg-zinc-800 text-zinc-200 hover:bg-zinc-700' : 'border-slate-300 bg-white text-slate-800 hover:bg-slate-100 shadow-sm'
                }`}
                title="Go to Previous Day"
              >
                <ChevronLeft className="w-3.5 h-3.5 text-sky-600" />
                <span>Previous Day</span>
              </button>

              <div className={`px-3 py-1 rounded border font-black text-sm flex items-center space-x-2 ${
                theme === 'dark' ? 'bg-zinc-950 border-zinc-700 text-sky-400' : 'bg-white border-slate-300 text-sky-800 shadow-sm'
              }`}>
                <Calendar className="w-3.5 h-3.5 text-slate-500" />
                <span>Date: {selectedDate}</span>
              </div>

              <button
                onClick={handleNextDay}
                className={`px-2.5 py-1 rounded border font-bold flex items-center space-x-1 transition ${
                  theme === 'dark' ? 'border-zinc-700 bg-zinc-800 text-zinc-200 hover:bg-zinc-700' : 'border-slate-300 bg-white text-slate-800 hover:bg-slate-100 shadow-sm'
                }`}
                title="Go to Next Day"
              >
                <span>Next Day</span>
                <ChevronRight className="w-3.5 h-3.5 text-sky-600" />
              </button>

              <button
                onClick={() => setSelectedDate('16/10/2026')}
                className={`px-2 py-1 rounded font-bold underline ${
                  selectedDate === '16/10/2026' ? 'text-sky-600' : 'text-slate-500'
                }`}
              >
                Jump to Today
              </button>
            </div>

            <div className={`font-bold ${theme === 'dark' ? 'text-zinc-400' : 'text-slate-600'}`}>
              Displaying bills for {selectedDate} ({currentBills.length} Transactions)
            </div>
          </div>

          {/* 3. Daily Metrics Cards */}
          <div className="p-4 grid grid-cols-1 md:grid-cols-4 gap-3">
            {/* Total Day Sales */}
            <div className={`p-3.5 rounded-lg border ${
              theme === 'dark' ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-slate-300 shadow-sm'
            }`}>
              <div className="flex items-center justify-between text-slate-500 text-xs font-mono font-bold mb-1">
                <span>TOTAL DAY SALES</span>
                <TrendingUp className="w-4 h-4 text-emerald-500" />
              </div>
              <div className="text-2xl font-black font-mono text-emerald-600 dark:text-emerald-400">
                ₹{totalSales.toFixed(2)}
              </div>
              <div className="text-[11px] text-slate-500 font-mono mt-1 font-bold">{currentBills.length} Bills Billed</div>
            </div>

            {/* Cash in Drawer */}
            <div className={`p-3.5 rounded-lg border ${
              theme === 'dark' ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-slate-300 shadow-sm'
            }`}>
              <div className="flex items-center justify-between text-slate-500 text-xs font-mono font-bold mb-1">
                <span>PHYSICAL CASH DRAWER</span>
                <Banknote className="w-4 h-4 text-sky-500" />
              </div>
              <div className="text-2xl font-black font-mono text-sky-600 dark:text-sky-400">
                ₹{cashSales.toFixed(2)}
              </div>
              <div className="text-[11px] text-slate-500 font-mono mt-1 font-bold">Cash Box Tally (COUNTER.DBF)</div>
            </div>

            {/* UPI / Digital */}
            <div className={`p-3.5 rounded-lg border ${
              theme === 'dark' ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-slate-300 shadow-sm'
            }`}>
              <div className="flex items-center justify-between text-slate-500 text-xs font-mono font-bold mb-1">
                <span>UPI / DIGITAL PAYMENTS</span>
                <CreditCard className="w-4 h-4 text-purple-500" />
              </div>
              <div className="text-2xl font-black font-mono text-purple-600 dark:text-purple-400">
                ₹{upiSales.toFixed(2)}
              </div>
              <div className="text-[11px] text-slate-500 font-mono mt-1 font-bold">Settled Directly To Bank</div>
            </div>

            {/* Gross Profit Margin */}
            <div className={`p-3.5 rounded-lg border ${
              theme === 'dark' ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-slate-300 shadow-sm'
            }`}>
              <div className="flex items-center justify-between text-slate-500 text-xs font-mono font-bold mb-1">
                <span>GROSS PROFIT MARGIN</span>
                <Percent className="w-4 h-4 text-amber-500" />
              </div>
              <div className="text-2xl font-black font-mono text-amber-600 dark:text-amber-400">
                {marginPercent}% <span className="text-sm font-bold font-mono text-slate-500">₹{grossMargin.toFixed(0)}</span>
              </div>
              <div className="text-[11px] text-slate-500 font-mono mt-1 font-bold">Net Margin (Cost ₹{totalCost.toFixed(0)})</div>
            </div>
          </div>

          {/* 4. Day-Wise Bill List Table */}
          <div className="flex-1 overflow-y-auto px-4 pb-4">
            <table className={`w-full text-left border-collapse text-xs font-mono border ${
              theme === 'dark' ? 'border-zinc-800' : 'border-slate-300'
            }`}>
              <thead>
                <tr className={`border-b text-[11px] uppercase tracking-wider font-extrabold ${
                  theme === 'dark' ? 'bg-zinc-900 border-zinc-800 text-zinc-300' : 'bg-slate-200 border-slate-300 text-slate-900'
                }`}>
                  <th className="py-2.5 px-3 border-r border-inherit w-24">Bill No</th>
                  <th className="py-2.5 px-3 text-center border-r border-inherit w-20">Time</th>
                  <th className="py-2.5 px-3 border-r border-inherit">Patient / Customer</th>
                  <th className="py-2.5 px-3 border-r border-inherit">Prescribing Doctor</th>
                  <th className="py-2.5 px-3 text-center border-r border-inherit w-20">Items</th>
                  <th className="py-2.5 px-3 text-center border-r border-inherit w-24">Mode</th>
                  <th className="py-2.5 px-3 text-right border-r border-inherit w-28">Cost (PTR)</th>
                  <th className="py-2.5 px-3 text-right w-32">Billed Amount (₹)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-inherit">
                {currentBills.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-slate-400 font-bold">
                      No sales bills found for {selectedDate}.
                    </td>
                  </tr>
                ) : (
                  currentBills.map((b, idx) => (
                    <tr 
                      key={idx}
                      className={`transition-colors border-b ${
                        theme === 'dark' ? 'hover:bg-zinc-900 border-zinc-800' : 'hover:bg-sky-50/60 border-slate-300'
                      }`}
                    >
                      <td className={`py-2.5 px-3 font-black border-r border-inherit ${
                        theme === 'dark' ? 'text-sky-400' : 'text-sky-800'
                      }`}>
                        {b.no}
                      </td>
                      <td className={`py-2.5 px-3 text-center font-bold border-r border-inherit ${
                        theme === 'dark' ? 'text-zinc-400' : 'text-slate-600'
                      }`}>
                        {b.time}
                      </td>
                      <td className={`py-2.5 px-3 font-black font-sans border-r border-inherit ${
                        theme === 'dark' ? 'text-white' : 'text-slate-950'
                      }`}>
                        {b.patient}
                      </td>
                      <td className={`py-2.5 px-3 font-sans font-bold border-r border-inherit ${
                        theme === 'dark' ? 'text-zinc-200' : 'text-slate-800'
                      }`}>
                        {b.doctor}
                      </td>
                      <td className={`py-2.5 px-3 text-center font-bold border-r border-inherit ${
                        theme === 'dark' ? 'text-zinc-300' : 'text-slate-700'
                      }`}>
                        {b.items}
                      </td>
                      <td className="py-2.5 px-3 text-center border-r border-inherit">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-black ${
                          b.mode === 'CASH' 
                            ? 'bg-emerald-100 text-emerald-950 border border-emerald-400 dark:bg-emerald-950 dark:text-emerald-300' 
                            : 'bg-purple-100 text-purple-950 border border-purple-400 dark:bg-purple-950 dark:text-purple-300'
                        }`}>
                          {b.mode}
                        </span>
                      </td>
                      <td className={`py-2.5 px-3 text-right font-mono font-bold border-r border-inherit ${
                        theme === 'dark' ? 'text-zinc-400' : 'text-slate-600'
                      }`}>
                        ₹{b.cost.toFixed(2)}
                      </td>
                      <td className={`py-2.5 px-3 text-right font-black font-mono ${
                        theme === 'dark' ? 'text-emerald-400' : 'text-emerald-700'
                      }`}>
                        ₹{b.amount.toFixed(2)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </>
      ) : (
        /* 5. Monthly Sales Summary Report (REP001 / REP010 / CREATEMONTHLYSALESFILE) */
        <div className="flex-1 overflow-y-auto p-4 font-mono">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center space-x-2">
              <FileSpreadsheet className="w-5 h-5 text-sky-600" />
              <h3 className={`text-sm font-black ${theme === 'dark' ? 'text-white' : 'text-slate-950'}`}>
                Monthly Accumulated Sales & Margins [REP010 / sales.csv]
              </h3>
            </div>

            <button
              onClick={() => alert('Exporting monthly sales to C:\\KVATS\\sales.csv for Kerala Tax filing.')}
              className="px-3 py-1 rounded bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center space-x-1 shadow"
            >
              <span>Export CSV (KVATS)</span>
            </button>
          </div>

          <table className={`w-full text-left border-collapse text-xs border ${
            theme === 'dark' ? 'border-zinc-800' : 'border-slate-300'
          }`}>
            <thead>
              <tr className={`border-b text-[11px] uppercase tracking-wider font-extrabold ${
                theme === 'dark' ? 'bg-zinc-900 border-zinc-800 text-zinc-300' : 'bg-slate-200 border-slate-300 text-slate-900'
              }`}>
                <th className="py-2.5 px-3 border-r border-inherit">Date</th>
                <th className="py-2.5 px-3 border-r border-inherit text-center">Day</th>
                <th className="py-2.5 px-3 border-r border-inherit text-center">Bills Count</th>
                <th className="py-2.5 px-3 border-r border-inherit text-right">Cash ₹</th>
                <th className="py-2.5 px-3 border-r border-inherit text-right">UPI ₹</th>
                <th className="py-2.5 px-3 border-r border-inherit text-right">Gross Total ₹</th>
                <th className="py-2.5 px-3 border-r border-inherit text-right">Cost (PTR) ₹</th>
                <th className="py-2.5 px-3 border-r border-inherit text-right">Margin ₹</th>
                <th className="py-2.5 px-3 text-right">Margin %</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-inherit">
              {monthlyDays.map((row, i) => (
                <tr key={i} className={`border-b ${theme === 'dark' ? 'hover:bg-zinc-900' : 'hover:bg-sky-50'}`}>
                  <td className={`py-2 px-3 font-bold border-r border-inherit ${theme === 'dark' ? 'text-white' : 'text-slate-950'}`}>{row.date}</td>
                  <td className="py-2 px-3 text-center border-r border-inherit text-slate-500">{row.day}</td>
                  <td className="py-2 px-3 text-center border-r border-inherit font-bold text-sky-700">{row.bills}</td>
                  <td className="py-2 px-3 text-right border-r border-inherit font-mono">₹{row.cash.toFixed(2)}</td>
                  <td className="py-2 px-3 text-right border-r border-inherit font-mono">₹{row.upi.toFixed(2)}</td>
                  <td className={`py-2 px-3 text-right border-r border-inherit font-black font-mono ${theme === 'dark' ? 'text-white' : 'text-slate-950'}`}>₹{row.gross.toFixed(2)}</td>
                  <td className="py-2 px-3 text-right border-r border-inherit font-mono text-slate-500">₹{row.cost.toFixed(2)}</td>
                  <td className="py-2 px-3 text-right border-r border-inherit font-black font-mono text-emerald-700">₹{row.margin.toFixed(2)}</td>
                  <td className="py-2 px-3 text-right font-black text-amber-700">{row.pct}</td>
                </tr>
              ))}
            </tbody>
            {/* Monthly Grand Total Row */}
            <tfoot>
              <tr className={`border-t-2 font-black text-xs ${
                theme === 'dark' ? 'bg-zinc-900 border-zinc-700 text-white' : 'bg-slate-200 border-slate-400 text-slate-950'
              }`}>
                <td colSpan={2} className="py-3 px-3 border-r border-inherit uppercase">
                  Monthly Total (October 2026)
                </td>
                <td className="py-3 px-3 text-center border-r border-inherit text-sky-800">
                  {monthlyDays.reduce((a, b) => a + b.bills, 0)} Bills
                </td>
                <td className="py-3 px-3 text-right border-r border-inherit font-mono">
                  ₹{monthCash.toFixed(2)}
                </td>
                <td className="py-3 px-3 text-right border-r border-inherit font-mono">
                  ₹{monthUpi.toFixed(2)}
                </td>
                <td className="py-3 px-3 text-right border-r border-inherit font-mono text-emerald-600 dark:text-emerald-400 text-sm">
                  ₹{monthGross.toFixed(2)}
                </td>
                <td className="py-3 px-3 text-right border-r border-inherit font-mono text-slate-500">
                  ₹{monthCost.toFixed(2)}
                </td>
                <td className="py-3 px-3 text-right border-r border-inherit font-mono text-emerald-600 dark:text-emerald-400 text-sm">
                  ₹{monthMargin.toFixed(2)}
                </td>
                <td className="py-3 px-3 text-right font-mono text-amber-600 dark:text-amber-400">
                  {monthMarginPct}%
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </div>
  );
}
