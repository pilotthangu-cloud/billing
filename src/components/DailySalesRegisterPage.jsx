import React, { useState, useMemo } from 'react';
import { 
  ArrowLeft, 
  Printer, 
  TrendingUp, 
  TrendingDown,
  IndianRupee, 
  CreditCard, 
  Banknote, 
  Percent, 
  Lock, 
  ChevronLeft, 
  ChevronRight, 
  Calendar,
  FileSpreadsheet,
  CheckCircle2,
  Coins,
  ShieldCheck,
  Eye,
  Share2
} from 'lucide-react';

export default function DailySalesRegisterPage({ 
  theme, 
  onBackToBilling, 
  authenticatedRole,
  onOpenPasswordModal,
  recentBills = [],
  medicines = []
}) {
  const [viewMode, setViewMode] = useState('daily'); // 'daily', 'monthly', or 'shifts'
  const [selectedShiftForDetail, setSelectedShiftForDetail] = useState(null);

  // Load all recorded bills from props or localStorage
  const allBills = useMemo(() => {
    if (Array.isArray(recentBills) && recentBills.length > 0) return recentBills;
    try {
      const raw = localStorage.getItem('beta_pharma_recent_bills');
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {}
    return [];
  }, [recentBills]);

  // Today formatted in DD/MM/YYYY
  const todayFormatted = useMemo(() => {
    const now = new Date();
    return `${String(now.getDate()).padStart(2, '0')}/${String(now.getMonth() + 1).padStart(2, '0')}/${now.getFullYear()}`;
  }, []);

  // Dynamically group bills by date
  const salesDatabase = useMemo(() => {
    const db = {};
    allBills.forEach(b => {
      const d = b.date || todayFormatted;
      if (!db[d]) db[d] = [];

      let totalBillCost = 0;
      (b.items || []).forEach(it => {
        const ptr = it.ptr || (it.mrp ? it.mrp * 0.78 : 0);
        const per = it.per || 10;
        const lineQty = parseFloat(it.qty) || 1;
        totalBillCost += (ptr / per) * lineQty;
      });

      const billAmt = parseFloat(b.netPayable || b.grossTotal) || 0;
      if (totalBillCost === 0 && billAmt > 0) {
        totalBillCost = billAmt * 0.8;
      }

      db[d].push({
        no: b.billNo,
        time: b.time || '12:00',
        patient: b.patientName || 'CASH PATIENT',
        doctor: b.doctorName || 'GENERAL OTC',
        items: b.items ? b.items.length : 1,
        amount: billAmt,
        cost: totalBillCost,
        mode: (b.paymentMode || 'CASH').toUpperCase()
      });
    });
    return db;
  }, [allBills, todayFormatted]);

  const availableDates = useMemo(() => Object.keys(salesDatabase), [salesDatabase]);

  const [selectedDate, setSelectedDate] = useState(() => {
    const now = new Date();
    return `${String(now.getDate()).padStart(2, '0')}/${String(now.getMonth() + 1).padStart(2, '0')}/${now.getFullYear()}`;
  });

  // Keep selected date aligned if bills load asynchronously
  React.useEffect(() => {
    if (availableDates.length > 0 && !availableDates.includes(selectedDate)) {
      setSelectedDate(availableDates[0]);
    }
  }, [availableDates]);

  const currentBills = salesDatabase[selectedDate] || [];

  const handlePrevDay = () => {
    const idx = availableDates.indexOf(selectedDate);
    if (idx !== -1 && idx < availableDates.length - 1) {
      setSelectedDate(availableDates[idx + 1]);
    } else {
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

  // 100% Free Universal WhatsApp Daily Summary Generator (No Twilio, No paid gateway, wa.me standard protocol)
  const handleSendWhatsAppDailySummary = () => {
    const summaryText = `🏥 *BETA PHARMACY - DAILY CLOSING REPORT*
📍 Sadanada Pai Road, Chirakkara, Thalassery
📅 *Date:* ${selectedDate}
------------------------------------
💰 *Total Sales:* ₹${totalSales.toFixed(2)}
💵 *Cash Collection:* ₹${cashSales.toFixed(2)}
📱 *UPI / QR Payments:* ₹${upiSales.toFixed(2)}
🧾 *Total Invoices:* ${currentBills.length}
📈 *Gross Margin:* ₹${grossMargin.toFixed(2)} (${marginPercent}%)
------------------------------------
🏪 *Store Status:* Shift Reconciled & Day Closed
_Generated by Beta Pharmacy Modern POS Terminal_`;

    const encoded = encodeURIComponent(summaryText);
    const targetPhone = '9497172662'; // Beta Pharmacy Dad / Owner Mobile
    const waUrl = `https://wa.me/91${targetPhone}?text=${encoded}`;
    window.open(waUrl, '_blank');
  };

  // Monthly summary dynamic aggregation from all recorded bills
  const monthlyDays = useMemo(() => {
    const daysMap = {};
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    allBills.forEach(b => {
      const d = b.date || todayFormatted;
      if (!daysMap[d]) {
        let dayName = 'Day';
        try {
          const parts = d.split('/').map(Number);
          if (parts.length === 3) {
            const dt = new Date(parts[2], parts[1] - 1, parts[0]);
            dayName = dayNames[dt.getDay()] || 'Day';
          }
        } catch (e) {}

        daysMap[d] = {
          date: d,
          day: dayName,
          bills: 0,
          cash: 0,
          upi: 0,
          gross: 0,
          cost: 0,
          margin: 0,
          pct: '0.0%'
        };
      }

      const amt = parseFloat(b.netPayable || b.grossTotal) || 0;
      let billCost = 0;
      (b.items || []).forEach(it => {
        const ptr = it.ptr || (it.mrp ? it.mrp * 0.78 : 0);
        const per = it.per || 10;
        const lineQty = parseFloat(it.qty) || 1;
        billCost += (ptr / per) * lineQty;
      });
      if (billCost === 0 && amt > 0) billCost = amt * 0.8;

      daysMap[d].bills += 1;
      daysMap[d].gross += amt;
      daysMap[d].cost += billCost;
      if ((b.paymentMode || '').toUpperCase() === 'CASH') {
        daysMap[d].cash += amt;
      } else {
        daysMap[d].upi += amt;
      }
    });

    return Object.values(daysMap).map(row => {
      const margin = row.gross - row.cost;
      const pct = row.gross > 0 ? ((margin / row.gross) * 100).toFixed(1) + '%' : '0.0%';
      return {
        ...row,
        margin,
        pct
      };
    });
  }, [allBills, todayFormatted]);

  const monthGross = monthlyDays.reduce((a, b) => a + b.gross, 0);
  const monthCash = monthlyDays.reduce((a, b) => a + b.cash, 0);
  const monthUpi = monthlyDays.reduce((a, b) => a + b.upi, 0);
  const monthCost = monthlyDays.reduce((a, b) => a + b.cost, 0);
  const monthMargin = monthGross - monthCost;
  const monthMarginPct = monthGross > 0 ? ((monthMargin / monthGross) * 100).toFixed(1) : '0.0';

  // Staff Shift Reconciliation History (strictly loaded from real shift handover records)
  const shiftHistory = useMemo(() => {
    try {
      const raw = localStorage.getItem('beta_pharma_shift_history');
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {}
    return [];
  }, []);



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
                Sales Register & Daily Margins
              </h2>
              <span className={`text-xs font-mono font-bold px-2 py-0.5 rounded border ${
                theme === 'dark' ? 'bg-emerald-950 text-emerald-300 border-emerald-800' : 'bg-emerald-100 text-emerald-950 border-emerald-400'
              }`}>
                Admin Verified
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
            <button
              onClick={() => setViewMode('shifts')}
              className={`px-3 py-1.5 font-bold transition flex items-center space-x-1 ${
                viewMode === 'shifts'
                  ? 'bg-amber-600 text-white'
                  : (theme === 'dark' ? 'bg-zinc-800 text-zinc-300 hover:text-white' : 'bg-white text-slate-700 hover:bg-slate-100')
              }`}
            >
              <Coins className="w-3.5 h-3.5" />
              <span>Staff Shift Audits</span>
            </button>
          </div>

          <button
            onClick={handleSendWhatsAppDailySummary}
            className="py-1.5 px-3 bg-emerald-600 hover:bg-emerald-500 text-white font-black rounded-lg flex items-center space-x-1 shadow transition cursor-pointer"
            title="Send daily closing summary report to Dad / Owner on WhatsApp (100% Free)"
          >
            <Share2 className="w-3.5 h-3.5" />
            <span>📱 WhatsApp Summary</span>
          </button>

          <button
            onClick={() => window.print()}
            className="py-1.5 px-3 bg-sky-600 hover:bg-sky-500 text-white font-black rounded-lg flex items-center space-x-1 shadow"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print Report</span>
          </button>
        </div>
      </div>

      {viewMode === 'daily' && (
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
                onClick={() => setSelectedDate(todayFormatted)}
                className={`px-2 py-1 rounded font-bold underline ${
                  selectedDate === todayFormatted ? 'text-sky-600' : 'text-slate-500'
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
                        <span className={`px-2 py-0.5 rounded text-[10px] font-black border ${
                          b.mode === 'CASH' 
                            ? (theme === 'dark' ? 'bg-emerald-950 text-emerald-300 border-emerald-700' : 'bg-emerald-100 text-emerald-950 border-emerald-400')
                            : (theme === 'dark' ? 'bg-purple-950 text-purple-300 border-purple-700' : 'bg-purple-100 text-purple-950 border-purple-400')
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
      )}

      {/* 5. Monthly Sales Summary Report (REP001 / REP010 / CREATEMONTHLYSALESFILE) */}
      {viewMode === 'monthly' && (
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
              {monthlyDays.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-500 font-bold">
                    No monthly sales recorded yet. Completed counter invoices will automatically aggregate here.
                  </td>
                </tr>
              ) : (
                monthlyDays.map((row, i) => (
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
                ))
              )}
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
                <td className={`py-3 px-3 text-right border-r border-inherit font-mono text-sm ${theme === 'dark' ? 'text-emerald-400' : 'text-emerald-600'}`}>
                  ₹{monthGross.toFixed(2)}
                </td>
                <td className="py-3 px-3 text-right border-r border-inherit font-mono text-slate-500">
                  ₹{monthCost.toFixed(2)}
                </td>
                <td className={`py-3 px-3 text-right border-r border-inherit font-mono text-sm ${theme === 'dark' ? 'text-emerald-400' : 'text-emerald-600'}`}>
                  ₹{monthMargin.toFixed(2)}
                </td>
                <td className={`py-3 px-3 text-right font-mono ${theme === 'dark' ? 'text-amber-400' : 'text-amber-600'}`}>
                  {monthMarginPct}%
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}

      {/* 6. Staff Shift Session Reconciliation & Cash Drawer Audit Ledger */}
      {viewMode === 'shifts' && (
        <div className="flex-1 overflow-y-auto p-4 space-y-4 font-sans">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2.5">
              <div className="w-8 h-8 rounded-lg bg-amber-500 text-slate-950 flex items-center justify-center font-bold">
                <Coins className="w-4 h-4" />
              </div>
              <div>
                <h3 className={`text-sm font-black uppercase tracking-wide ${theme === 'dark' ? 'text-white' : 'text-slate-950'}`}>
                  Staff Shift Session & Blind Cash Drawer Reconciliation Register
                </h3>
                <p className={`text-xs font-mono ${theme === 'dark' ? 'text-zinc-400' : 'text-slate-600'}`}>
                  Prevent unrecorded cash drain and track cashier-wise physical drawer count variance
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-2 text-xs font-mono">
              <span className={`px-3 py-1 rounded border font-bold ${
                theme === 'dark' ? 'bg-zinc-900 border-zinc-700 text-zinc-300' : 'bg-slate-100 border-slate-300 text-slate-800'
              }`}>
                {shiftHistory.length} Shifts Recorded
              </span>
            </div>
          </div>

          {/* Shift Audit Summary KPIs */}
          <div className="grid grid-cols-4 gap-3 font-mono">
            <div className={`p-3 rounded-xl border ${
              theme === 'dark' ? 'bg-zinc-900 border-zinc-800' : 'bg-slate-50 border-slate-300'
            }`}>
              <span className="text-[10px] text-slate-500 uppercase font-bold block">Total Shifts Audited</span>
              <span className={`text-lg font-black ${theme === 'dark' ? 'text-white' : 'text-slate-950'}`}>
                {shiftHistory.length} Sessions
              </span>
            </div>

            <div className={`p-3 rounded-xl border ${
              theme === 'dark' ? 'bg-zinc-900 border-zinc-800' : 'bg-slate-50 border-slate-300'
            }`}>
              <span className="text-[10px] text-slate-500 uppercase font-bold block">100% Balanced Shifts</span>
              <span className="text-lg font-black text-emerald-600">
                {shiftHistory.filter(s => (s.variance || 0) === 0).length} / {shiftHistory.length}
              </span>
            </div>

            <div className={`p-3 rounded-xl border ${
              theme === 'dark' ? 'bg-zinc-900 border-zinc-800' : 'bg-slate-50 border-slate-300'
            }`}>
              <span className="text-[10px] text-slate-500 uppercase font-bold block">Shifts With Shortage</span>
              <span className="text-lg font-black text-rose-600">
                {shiftHistory.filter(s => (s.variance || 0) < 0).length} Sessions
              </span>
            </div>

            <div className={`p-3 rounded-xl border ${
              theme === 'dark' ? 'bg-zinc-900 border-zinc-800' : 'bg-slate-50 border-slate-300'
            }`}>
              <span className="text-[10px] text-slate-500 uppercase font-bold block">Net Store Cash Variance</span>
              <span className={`text-lg font-black ${
                shiftHistory.reduce((acc, s) => acc + (s.variance || 0), 0) < 0 ? 'text-rose-600' : 'text-emerald-600'
              }`}>
                ₹{shiftHistory.reduce((acc, s) => acc + (s.variance || 0), 0).toFixed(2)}
              </span>
            </div>
          </div>

          {/* Shifts Audit Ledger Table */}
          <div className={`border rounded-xl overflow-hidden font-mono text-xs ${
            theme === 'dark' ? 'border-zinc-800' : 'border-slate-300'
          }`}>
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className={`border-b text-[11px] uppercase tracking-wider font-extrabold ${
                  theme === 'dark' ? 'bg-zinc-900 border-zinc-800 text-zinc-300' : 'bg-slate-200 border-slate-300 text-slate-900'
                }`}>
                  <th className="py-2.5 px-3 border-r border-inherit">Shift ID</th>
                  <th className="py-2.5 px-3 border-r border-inherit">Date & Time</th>
                  <th className="py-2.5 px-3 border-r border-inherit">Cashier On Duty</th>
                  <th className="py-2.5 px-3 border-r border-inherit text-center">Bills</th>
                  <th className="py-2.5 px-3 border-r border-inherit text-right">Opening Float ₹</th>
                  <th className="py-2.5 px-3 border-r border-inherit text-right">Cash Sales ₹</th>
                  <th className="py-2.5 px-3 border-r border-inherit text-right">Expected Drawer ₹</th>
                  <th className="py-2.5 px-3 border-r border-inherit text-right">Actual Counted ₹</th>
                  <th className="py-2.5 px-3 border-r border-inherit text-center">Variance / Audit Result</th>
                  <th className="py-2.5 px-3 border-r border-inherit">Next Handover To</th>
                  <th className="py-2.5 px-3 text-center">Denominations</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-inherit">
                {shiftHistory.length === 0 ? (
                  <tr>
                    <td colSpan={11} className="py-12 text-center text-slate-500 font-bold">
                      No shift handovers completed yet. When a cashier completes a shift handover, the full reconciliation breakdown and cash drawer tally will appear here.
                    </td>
                  </tr>
                ) : (
                  shiftHistory.map((s, idx) => {
                    const variance = s.variance !== undefined ? s.variance : (s.countedPhysicalCash - s.expectedCash);
                    const isShortage = variance < 0;
                    const isBalanced = variance === 0;

                    return (
                      <tr key={s.shiftId || idx} className={`border-b ${theme === 'dark' ? 'hover:bg-zinc-900/80' : 'hover:bg-slate-50'}`}>
                        <td className={`py-2 px-3 font-bold border-r border-inherit ${theme === 'dark' ? 'text-sky-300' : 'text-sky-800'}`}>
                          {s.shiftId}
                        </td>
                        <td className="py-2 px-3 border-r border-inherit text-[11px]">
                          <div>{s.date}</div>
                          <div className="text-slate-500 text-[10px]">{s.startTime} - {s.endTime || 'Ongoing'}</div>
                        </td>
                        <td className={`py-2 px-3 font-black font-sans border-r border-inherit ${theme === 'dark' ? 'text-white' : 'text-slate-950'}`}>
                          {s.staffName}
                        </td>
                        <td className="py-2 px-3 text-center font-bold border-r border-inherit text-sky-700">
                          {s.totalBills || s.billsCount || 0}
                        </td>
                        <td className="py-2 px-3 text-right border-r border-inherit">
                          ₹{(s.openingFloat || 2000).toFixed(2)}
                        </td>
                        <td className="py-2 px-3 text-right border-r border-inherit font-black text-emerald-600">
                          ₹{(s.cashSales || 0).toFixed(2)}
                        </td>
                        <td className="py-2 px-3 text-right border-r border-inherit font-bold">
                          ₹{(s.expectedCash || 0).toFixed(2)}
                        </td>
                        <td className={`py-2 px-3 text-right border-r border-inherit font-black ${theme === 'dark' ? 'text-sky-300' : 'text-sky-800'}`}>
                          ₹{(s.countedPhysicalCash || 0).toFixed(2)}
                        </td>
                        <td className="py-2 px-3 text-center border-r border-inherit">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-black border uppercase ${
                            isShortage
                              ? (theme === 'dark' ? 'bg-rose-950 text-rose-300 border-rose-700' : 'bg-rose-100 text-rose-950 border-rose-300')
                              : isBalanced
                                ? (theme === 'dark' ? 'bg-emerald-950 text-emerald-300 border-emerald-700' : 'bg-emerald-100 text-emerald-950 border-emerald-300')
                                : (theme === 'dark' ? 'bg-sky-950 text-sky-300 border-sky-700' : 'bg-sky-100 text-sky-950 border-sky-300')
                          }`}>
                            {isShortage && `SHORTAGE (-₹${Math.abs(variance).toFixed(2)})`}
                            {isBalanced && `BALANCED (₹0.00)`}
                            {!isShortage && !isBalanced && `OVERAGE (+₹${variance.toFixed(2)})`}
                          </span>
                        </td>
                        <td className="py-2 px-3 border-r border-inherit font-sans text-slate-500 font-bold">
                          {s.nextStaffName || 'Next Shift'}
                        </td>
                        <td className="py-2 px-3 text-center">
                          <button
                            type="button"
                            onClick={() => setSelectedShiftForDetail(selectedShiftForDetail === s ? null : s)}
                            className={`p-1 rounded transition ${
                              theme === 'dark' ? 'hover:bg-zinc-800 text-zinc-300' : 'hover:bg-slate-200 text-slate-700'
                            }`}
                            title="Inspect Physical Denomination Breakdown"
                          >
                            <Eye className="w-4 h-4 text-sky-600" />
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Selected Shift Denominations Drawer Inspector */}
          {selectedShiftForDetail && (
            <div className={`p-4 rounded-xl border space-y-3 font-mono text-xs ${
              theme === 'dark' ? 'bg-zinc-900 border-zinc-700 text-zinc-100' : 'bg-sky-50 border-sky-300 text-slate-950'
            }`}>
              <div className="flex items-center justify-between border-b pb-2">
                <div className="flex items-center space-x-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  <span className="font-black text-sm uppercase">
                    Denominations Breakdown for {selectedShiftForDetail.shiftId} ({selectedShiftForDetail.staffName})
                  </span>
                </div>
                <button
                  onClick={() => setSelectedShiftForDetail(null)}
                  className="font-bold text-slate-500 hover:text-slate-900"
                >
                  ✕ Close
                </button>
              </div>

              <div className="grid grid-cols-7 gap-2 text-center text-xs">
                {selectedShiftForDetail.denominations && Object.entries(selectedShiftForDetail.denominations).map(([denom, count]) => (
                  <div key={denom} className={`p-2 rounded-lg border ${
                    theme === 'dark' ? 'bg-zinc-950 border-zinc-800' : 'bg-white border-slate-300'
                  }`}>
                    <span className="text-[10px] text-slate-500 font-bold block">
                      {denom === 'coins' ? 'Coins' : `₹${denom} ×`}
                    </span>
                    <span className="font-black text-sm">
                      {denom === 'coins' ? `₹${parseFloat(count).toFixed(2)}` : `${count} pcs`}
                    </span>
                  </div>
                ))}
              </div>

              {selectedShiftForDetail.managerNotes && (
                <div className="text-[11px] font-sans italic opacity-85 pt-1">
                  Manager Verification Notes: <strong>"{selectedShiftForDetail.managerNotes}"</strong>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
