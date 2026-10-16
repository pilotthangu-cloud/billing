import React, { useState, useEffect } from 'react';
import { 
  Building2, 
  BarChart3, 
  TrendingUp, 
  AlertTriangle, 
  Package, 
  Clock, 
  IndianRupee, 
  CreditCard, 
  Banknote, 
  ArrowLeft, 
  ArrowRightLeft, 
  Share2, 
  Download, 
  Cloud, 
  CheckCircle2, 
  ChevronRight, 
  ChevronLeft, 
  FileText, 
  X, 
  Search, 
  Calendar, 
  UserCheck, 
  Copy, 
  ExternalLink, 
  Check, 
  Truck, 
  Phone,
  Moon,
  Sun,
  Store,
  Layers,
  ArrowUpRight
} from 'lucide-react';
import initialMedicines from '../data/medicines.json';
import supplierList from '../data/suppliers.json';
import { testSupabaseConnection } from '../utils/supabaseClient';

export default function AdminDashboardApp({ 
  theme, 
  onBackToCounter, 
  onSwitchTheme 
}) {
  const isDark = theme === 'dark';

  // 1. Store Branch Selection
  const [selectedBranch, setSelectedBranch] = useState('ALL'); // 'ALL', 'MAIN', 'TOWN', 'KANNUR'
  
  // 2. Active Tab
  const [activeTab, setActiveTab] = useState('overview'); // 'overview', 'reorder', 'overstock', 'expiry', 'multistore', 'payables', 'doctors', 'cloud'
  
  // 3. Date & Period Selection
  const [viewMode, setViewMode] = useState('daily'); // 'daily' | 'monthly'
  const [currentDate, setCurrentDate] = useState('2026-10-16');
  const [selectedMonth, setSelectedMonth] = useState('2026-10');

  // Search & Filter queries
  const [reorderScope, setReorderScope] = useState('shelf'); // 'shelf' (476 active low stock) | 'catalog' (all stock <= ro_level)
  const [reorderSearch, setReorderSearch] = useState('');
  const [reorderSupplierFilter, setReorderSupplierFilter] = useState('ALL');
  
  const [overstockSearch, setOverstockSearch] = useState('');
  const [stagnantFilter, setStagnantFilter] = useState('ALL');
  
  const [expirySearch, setExpirySearch] = useState('');
  const [expiryFilter, setExpiryFilter] = useState('ALL');
  
  const [multistoreSearch, setMultistoreSearch] = useState('');

  // Interactive Modals
  const [toastMessage, setToastMessage] = useState('');
  const [copiedWhatsApp, setCopiedWhatsApp] = useState(false);

  // WhatsApp PO Modal
  const [isWhatsAppModalOpen, setIsWhatsAppModalOpen] = useState(false);
  const [selectedSupplierForPO, setSelectedSupplierForPO] = useState(null);

  // Stock Transfer Modal
  const [transferModalItem, setTransferModalItem] = useState(null);
  const [transferTargetBranch, setTransferTargetBranch] = useState('TOWN');
  const [transferQty, setTransferQty] = useState(10);
  const [transferLogs, setTransferLogs] = useState([
    {
      id: 'TR-1082',
      date: '15/10/2026 16:45',
      medicine: 'AUGMENTIN 625MG DUO',
      from: 'Main Chirakkara',
      to: 'Town Branch',
      qty: 15,
      status: 'RECEIVED'
    },
    {
      id: 'TR-1081',
      date: '14/10/2026 11:20',
      medicine: 'PANTOCID 40MG',
      from: 'Main Chirakkara',
      to: 'Kannur Clinic',
      qty: 20,
      status: 'RECEIVED'
    }
  ]);

  // Payment Recording Modal
  const [paymentModalItem, setPaymentModalItem] = useState(null);
  const [paymentChequeNo, setPaymentChequeNo] = useState('');
  const [paymentBank, setPaymentBank] = useState('Federal Bank Thalassery');
  const [pendingPayables, setPendingPayables] = useState([
    { code: 'K043', name: 'KERALA TRADE WINGS', billNo: 'INV-88912', billDate: '10/09/2026', cDays: 30, due: '10/10/2026', amount: 12450.00, status: 'OVERDUE' },
    { code: 'T010', name: 'THE CAN DRUG HOUSE', billNo: '020456', billDate: '16/09/2026', cDays: 30, due: '16/10/2026', amount: 4789.50, status: 'DUE TODAY' },
    { code: 'C013', name: 'CENTREL AGENCIES', billNo: 'CG-4412', billDate: '05/10/2026', cDays: 30, due: '05/11/2026', amount: 5320.00, status: 'DUE' },
    { code: 'G041', name: 'GEETHA AGENCIES', billNo: 'GT-9011', billDate: '20/09/2026', cDays: 30, due: '20/10/2026', amount: 3200.00, status: 'DUE' },
    { code: 'M005', name: 'MALABAR PHARMA DISTRIBUTORS', billNo: 'MP-1102', billDate: '28/09/2026', cDays: 21, due: '19/10/2026', amount: 8900.00, status: 'DUE' }
  ]);

  // Cloud Sync (Supabase PostgreSQL)
  const [isCloudModalOpen, setIsCloudModalOpen] = useState(false);
  const [cloudConfigText, setCloudConfigText] = useState('');
  const [isCloudConnected, setIsCloudConnected] = useState(true);
  const [supabaseLatency, setSupabaseLatency] = useState(92);
  const [testingConnection, setTestingConnection] = useState(false);

  useEffect(() => {
    testSupabaseConnection().then(res => {
      setIsCloudConnected(res.connected);
      if (res.latency) setSupabaseLatency(res.latency);
    });
  }, []);

  // Available Branches
  const branches = [
    { id: 'ALL', name: 'All Branches (Consolidated HQ)', short: 'Consolidated HQ', location: 'Thalassery & Kannur' },
    { id: 'MAIN', name: 'Beta Pharmacy (Main Branch)', short: 'Main Chirakkara', location: 'Chirakkara, Thalassery' },
    { id: 'TOWN', name: 'Beta Pharmacy (Town Branch)', short: 'Town Branch', location: 'Near Old Bus Stand' },
    { id: 'KANNUR', name: 'Beta Pharmacy (Kannur Clinic)', short: 'Kannur Clinic', location: 'Fort Road, Kannur' }
  ];

  // Financial Telemetry (Aggregated by Branch)
  const salesTelemetry = {
    ALL: {
      todayGross: 34850.00,
      todayProfit: 7318.50,
      marginPct: '21.0%',
      billCount: 142,
      cash: 18450.00,
      upi: 16400.00,
      growth: '+12.4%',
      avgBill: 245.42,
      staffOnDuty: 6
    },
    MAIN: {
      todayGross: 21500.00,
      todayProfit: 4515.00,
      marginPct: '21.0%',
      billCount: 88,
      cash: 11200.00,
      upi: 10300.00,
      growth: '+9.8%',
      avgBill: 244.31,
      staffOnDuty: 3
    },
    TOWN: {
      todayGross: 8950.00,
      todayProfit: 1879.50,
      marginPct: '21.0%',
      billCount: 36,
      cash: 4900.00,
      upi: 4050.00,
      growth: '+15.2%',
      avgBill: 248.61,
      staffOnDuty: 2
    },
    KANNUR: {
      todayGross: 4400.00,
      todayProfit: 924.00,
      marginPct: '21.0%',
      billCount: 18,
      cash: 2350.00,
      upi: 2050.00,
      growth: '+6.5%',
      avgBill: 244.44,
      staffOnDuty: 1
    }
  };

  const currentStats = salesTelemetry[selectedBranch] || salesTelemetry.ALL;

  // Day navigation helpers
  const handlePrevDay = () => {
    const d = new Date(currentDate);
    d.setDate(d.getDate() - 1);
    setCurrentDate(d.toISOString().split('T')[0]);
  };

  const handleNextDay = () => {
    const d = new Date(currentDate);
    d.setDate(d.getDate() + 1);
    setCurrentDate(d.toISOString().split('T')[0]);
  };

  const handleToday = () => {
    setCurrentDate('2026-10-16');
  };

  // 1. REORDER RADAR: Items where stock < RO_LEVEL
  // 'shelf': low stock on shelf (stock 1-5); 'catalog': includes full catalog stock-outs
  const reorderItems = initialMedicines.filter(m => {
    const stock = m.stock_shop1 || 0;
    const reorderLevel = m.ro_level || 5;
    if (reorderScope === 'shelf') {
      return stock > 0 && stock <= reorderLevel;
    }
    return stock <= reorderLevel;
  }).map(m => ({
    ...m,
    deficit: Math.max(1, (m.ro_qty || 15) - (m.stock_shop1 || 0)),
    supplier: supplierList.find(s => s.code === m.supplier_code) || supplierList[0]
  }));

  const filteredReorderItems = reorderItems.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(reorderSearch.toLowerCase()) ||
                          (item.generic && item.generic.toLowerCase().includes(reorderSearch.toLowerCase())) ||
                          (item.rack && item.rack.toString().includes(reorderSearch));
    const matchesSupplier = reorderSupplierFilter === 'ALL' || item.supplier.code === reorderSupplierFilter;
    return matchesSearch && matchesSupplier;
  });

  const totalReorderEstCost = filteredReorderItems.reduce((acc, it) => acc + (it.deficit * (it.ptr || it.mrp * 0.78)), 0);

  // 2. OVERSTOCKED & DEAD CAPITAL RADAR (REP009 / REP018)
  const overstockedItems = initialMedicines.filter(m => {
    const stock = (m.stock_shop1 || 0) + (m.stock_shop2 || 0);
    return stock >= 40 && (m.mrp || 0) > 50;
  }).map(m => {
    const stock = (m.stock_shop1 || 0) + (m.stock_shop2 || 0);
    const cost = m.ptr || +(m.mrp * 0.78).toFixed(2);
    const lockedCapital = +(stock * cost).toFixed(2);
    const daysStagnant = 30 + ((m.name.charCodeAt(0) * 7) % 75);
    return {
      ...m,
      totalStock: stock,
      lockedCapital,
      daysNoSale: daysStagnant,
      recommendation: daysStagnant > 70 ? 'Return to Agency' : 'Transfer to Branch'
    };
  }).sort((a, b) => b.lockedCapital - a.lockedCapital);

  const filteredOverstockedItems = overstockedItems.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(overstockSearch.toLowerCase()) ||
                          (item.generic && item.generic.toLowerCase().includes(overstockSearch.toLowerCase()));
    const matchesFilter = stagnantFilter === 'ALL' || 
                          (stagnantFilter === '30' && item.daysNoSale >= 30) ||
                          (stagnantFilter === '60' && item.daysNoSale >= 60) ||
                          (stagnantFilter === '90' && item.daysNoSale >= 90);
    return matchesSearch && matchesFilter;
  });

  const totalLockedCapital = overstockedItems.reduce((acc, it) => acc + it.lockedCapital, 0);

  // 3. NEAR-EXPIRY ANALYSIS
  const nearExpiryList = [
    { name: 'AUGMENTIN 625MG DUO', batch: 'AUG9912', exp: '11/26', packs: 12, ptr: 159.00, lossValue: 1908.00, urgency: '30', supplier: 'THE CAN DRUG HOUSE' },
    { name: 'CEFTUM 500MG TAB', batch: 'CF4410', exp: '11/26', packs: 8, ptr: 380.00, lossValue: 3040.00, urgency: '30', supplier: 'KERALA TRADE WINGS' },
    { name: 'PAN D CAPSULE', batch: 'PD8801', exp: '12/26', packs: 18, ptr: 145.00, lossValue: 2610.00, urgency: '60', supplier: 'CENTREL AGENCIES' },
    { name: 'TELMA AM TAB', batch: 'TL102', exp: '12/26', packs: 15, ptr: 180.00, lossValue: 2700.00, urgency: '60', supplier: 'GEETHA AGENCIES' },
    { name: 'MONTEK LC TAB', batch: 'ML772', exp: '01/27', packs: 25, ptr: 165.00, lossValue: 4125.00, urgency: '90', supplier: 'THE CAN DRUG HOUSE' },
    { name: 'GLYCOMET GP 2MG', batch: 'GL331', exp: '01/27', packs: 30, ptr: 110.00, lossValue: 3300.00, urgency: '90', supplier: 'MALABAR PHARMA' }
  ];

  const filteredExpiryList = nearExpiryList.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(expirySearch.toLowerCase()) || item.batch.toLowerCase().includes(expirySearch.toLowerCase());
    const matchesFilter = expiryFilter === 'ALL' || item.urgency === expiryFilter;
    return matchesSearch && matchesFilter;
  });

  const totalExpiryRiskValue = nearExpiryList.reduce((acc, it) => acc + it.lossValue, 0);

  // 4. DOCTOR PRESCRIPTION TELEMETRY (DOCTOR.DBF)
  const doctorAnalytics = [
    { name: 'Dr. Madhusoodanan T', specialty: 'General Medicine', bills: 48, revenue: 11840.00, avgBasket: 246.66, topDrug: 'PACIMOL 650, PANTOCID 40' },
    { name: 'Dr. Manojan', specialty: 'Pediatrics', bills: 34, revenue: 8420.00, avgBasket: 247.64, topDrug: 'AUGMENTIN DUO SYP, CALPOL 250' },
    { name: 'Dr. Deepa Manojan', specialty: 'Gynecology', bills: 26, revenue: 6510.00, avgBasket: 250.38, topDrug: 'FOLVITE 5MG, AUTRIN CAP' },
    { name: 'Dr. Saurabh Manojan', specialty: 'Orthopedics', bills: 19, revenue: 4980.00, avgBasket: 262.10, topDrug: 'CHYMORAL FORTE, TRAMACIP' },
    { name: 'Dr. Lakshmi Saurabh', specialty: 'Dermatology', bills: 15, revenue: 3100.00, avgBasket: 206.66, topDrug: 'CANDID B, BILASURE 20' }
  ];

  // 5. MONTHLY SALES REPORT DATA
  const monthlyDays = Array.from({ length: 16 }, (_, i) => {
    const day = 16 - i;
    const dateStr = `${day.toString().padStart(2, '0')}/10/2026`;
    const baseRev = 28000 + ((day * 997) % 8000);
    const gross = +(baseRev).toFixed(2);
    const cost = +(gross * 0.79).toFixed(2);
    const profit = +(gross - cost).toFixed(2);
    const cash = +(gross * 0.53).toFixed(2);
    const upi = +(gross - cash).toFixed(2);
    const bills = Math.round(gross / 245);
    return {
      day,
      date: dateStr,
      bills,
      gross,
      cash,
      upi,
      cost,
      profit,
      margin: '21.0%'
    };
  });

  const monthTotalGross = monthlyDays.reduce((acc, d) => acc + d.gross, 0);
  const monthTotalProfit = monthlyDays.reduce((acc, d) => acc + d.profit, 0);

  // Actions
  const handleOpenWhatsAppModal = (supplier) => {
    setSelectedSupplierForPO(supplier);
    setIsWhatsAppModalOpen(true);
    setCopiedWhatsApp(false);
  };

  const getWhatsAppPOTemplate = (supplier) => {
    const items = reorderItems.filter(it => it.supplier.code === supplier.code);
    let text = `*PURCHASE ORDER - BETA PHARMACY*\n`;
    text += `Branch: Chirakkara, Thalassery\n`;
    text += `Date: ${currentDate.split('-').reverse().join('/')}\n`;
    text += `Distributor: ${supplier.name}\n`;
    text += `------------------------------------\n`;
    items.forEach((it, idx) => {
      text += `${idx + 1}. *${it.name}* (RO: ${it.deficit} Packs)\n   Salt: ${it.generic || 'N/A'} | Rack: R-${it.rack}\n`;
    });
    text += `------------------------------------\n`;
    text += `Total Products: ${items.length}\n`;
    text += `Kindly dispatch with the earliest van delivery. Thank you!`;
    return text;
  };

  const handleCopyWhatsApp = (text) => {
    navigator.clipboard.writeText(text);
    setCopiedWhatsApp(true);
    setTimeout(() => setCopiedWhatsApp(false), 3000);
  };

  const handleExecuteTransfer = (e) => {
    e.preventDefault();
    if (!transferModalItem) return;
    
    const newLog = {
      id: `TR-${Date.now().toString().slice(-4)}`,
      date: new Date().toLocaleDateString('en-GB') + ' ' + new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      medicine: transferModalItem.name,
      from: 'Main Chirakkara',
      to: transferTargetBranch === 'TOWN' ? 'Town Branch' : 'Kannur Clinic',
      qty: transferQty,
      status: 'IN-TRANSIT'
    };

    setTransferLogs(prev => [newLog, ...prev]);
    setToastMessage(`Stock Transfer Dispatched: ${transferQty} packs of ${transferModalItem.name} to ${newLog.to}.`);
    setTimeout(() => setToastMessage(''), 5000);
    setTransferModalItem(null);
  };

  const handleRecordPayment = (e) => {
    e.preventDefault();
    if (!paymentModalItem) return;

    setPendingPayables(prev => prev.filter(p => p.billNo !== paymentModalItem.billNo));
    setToastMessage(`Payment of ₹${paymentModalItem.amount.toFixed(2)} recorded for ${paymentModalItem.name} via ${paymentBank} (Chq: ${paymentChequeNo || 'NEFT/RTGS'}).`);
    setTimeout(() => setToastMessage(''), 5000);
    setPaymentModalItem(null);
    setPaymentChequeNo('');
  };

  // Navigation Items
  const navItems = [
    { id: 'overview', label: 'Dashboard', icon: BarChart3, badge: null },
    { id: 'reorder', label: 'Reorder Radar', icon: AlertTriangle, badge: reorderItems.length, badgeBg: isDark ? 'bg-amber-950 text-amber-300' : 'bg-amber-100 text-amber-800' },
    { id: 'overstock', label: 'Dead Capital', icon: Package, badge: `₹${(totalLockedCapital/100000).toFixed(1)}L`, badgeBg: isDark ? 'bg-purple-950 text-purple-300' : 'bg-purple-100 text-purple-800' },
    { id: 'expiry', label: 'Near Expiry', icon: Clock, badge: `₹${(totalExpiryRiskValue/1000).toFixed(0)}k`, badgeBg: isDark ? 'bg-rose-950 text-rose-300' : 'bg-rose-100 text-rose-800' },
    { id: 'multistore', label: 'Multi-Store', icon: Store, badge: null },
    { id: 'payables', label: 'Payables', icon: Banknote, badge: pendingPayables.length, badgeBg: isDark ? 'bg-emerald-950 text-emerald-300' : 'bg-emerald-100 text-emerald-800' },
    { id: 'doctors', label: 'Doctors', icon: UserCheck, badge: null },
    { id: 'cloud', label: 'Cloud Sync', icon: Cloud, badge: isCloudConnected ? 'LIVE' : 'SETUP', badgeBg: isCloudConnected ? (isDark ? 'bg-emerald-950 text-emerald-300' : 'bg-emerald-100 text-emerald-800') : (isDark ? 'bg-zinc-800 text-zinc-300' : 'bg-slate-200 text-slate-800') }
  ];

  return (
    <div className={`h-screen w-screen flex flex-col font-sans select-none transition-colors ${
      isDark ? 'bg-zinc-950 text-slate-100' : 'bg-slate-50 text-slate-900'
    }`}>
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-4 right-4 z-50 bg-emerald-600 text-white px-4 py-3 rounded-xl shadow-2xl font-bold text-xs flex items-center space-x-2 animate-bounce">
          <CheckCircle2 className="w-4 h-4 text-emerald-200" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* 1. App Header (Clean Modern SaaS Mobile & Web Header) */}
      <header className={`px-4 sm:px-6 py-3 border-b flex items-center justify-between shrink-0 ${
        isDark ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-slate-200 shadow-xs'
      }`}>
        <div className="flex items-center space-x-3 sm:space-x-4">
          {/* Logo / App Avatar */}
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-purple-600 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-purple-600/20 shrink-0 font-black">
            <Building2 className="w-5 h-5" />
          </div>

          <div>
            <div className="flex items-center space-x-2">
              <h1 className={`font-black text-base sm:text-lg tracking-tight ${isDark ? 'text-white' : 'text-slate-950'}`}>
                Beta Pharmacy
              </h1>
              <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${isDark ? 'bg-purple-950 text-purple-300 border border-purple-800' : 'bg-purple-100 text-purple-900 border border-purple-300'}`}>
                HQ Admin
              </span>
            </div>
            
            {/* Branch Selector Pill */}
            <div className="flex items-center space-x-1.5 mt-0.5">
              <span className={`text-xs ${isDark ? 'text-zinc-400' : 'text-slate-500'}`}>Store:</span>
              <select
                value={selectedBranch}
                onChange={(e) => setSelectedBranch(e.target.value)}
                className={`text-xs font-bold py-0.5 px-2 rounded-lg border focus:ring-2 focus:ring-purple-500 cursor-pointer ${
                  isDark ? 'bg-zinc-800 border-zinc-700 text-white' : 'bg-slate-100 border-slate-300 text-slate-900'
                }`}
              >
                {branches.map(b => (
                  <option key={b.id} value={b.id}>
                    {b.short} ({b.location})
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Header Right Actions */}
        <div className="flex items-center space-x-2 sm:space-x-3">
          {/* Day / Month Period Toggle */}
          <div className={`hidden md:flex rounded-xl border p-0.5 text-xs font-bold ${
            isDark ? 'bg-zinc-800 border-zinc-700' : 'bg-slate-100 border-slate-300'
          }`}>
            <button
              onClick={() => setViewMode('daily')}
              className={`px-3 py-1 rounded-lg transition ${
                viewMode === 'daily'
                  ? 'bg-purple-600 text-white shadow-sm'
                  : (isDark ? 'text-zinc-400 hover:text-white' : 'text-slate-600 hover:text-slate-900')
              }`}
            >
              Day-wise
            </button>
            <button
              onClick={() => setViewMode('monthly')}
              className={`px-3 py-1 rounded-lg transition ${
                viewMode === 'monthly'
                  ? 'bg-purple-600 text-white shadow-sm'
                  : (isDark ? 'text-zinc-400 hover:text-white' : 'text-slate-600 hover:text-slate-900')
              }`}
            >
              Monthly Report
            </button>
          </div>

          {/* Date Picker Button */}
          {viewMode === 'daily' ? (
            <div className="hidden sm:flex items-center space-x-1 text-xs">
              <button
                onClick={handlePrevDay}
                className={`p-1.5 rounded-lg border ${isDark ? 'border-zinc-700 hover:bg-zinc-800 text-white' : 'border-slate-300 hover:bg-slate-100 text-slate-800'}`}
                title="Previous Day"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
              <input
                type="date"
                value={currentDate}
                onChange={(e) => setCurrentDate(e.target.value)}
                className={`py-1 px-2.5 rounded-lg border font-bold text-xs ${
                  isDark ? 'bg-zinc-800 border-zinc-700 text-white' : 'bg-white border-slate-300 text-slate-900'
                }`}
              />
              <button
                onClick={handleNextDay}
                className={`p-1.5 rounded-lg border ${isDark ? 'border-zinc-700 hover:bg-zinc-800 text-white' : 'border-slate-300 hover:bg-slate-100 text-slate-800'}`}
                title="Next Day"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className={`hidden sm:block text-xs font-bold py-1.5 px-3 rounded-lg border ${
                isDark ? 'bg-zinc-800 border-zinc-700 text-white' : 'bg-white border-slate-300 text-slate-900'
              }`}
            >
              <option value="2026-10">October 2026</option>
              <option value="2026-09">September 2026</option>
              <option value="2026-08">August 2026</option>
            </select>
          )}

          {/* Cloud Status Pill */}
          <div className={`hidden lg:flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border ${
            isCloudConnected
              ? (isDark ? 'bg-emerald-950 text-emerald-300 border-emerald-800' : 'bg-emerald-50 text-emerald-900 border-emerald-300')
              : (isDark ? 'bg-zinc-800 text-zinc-300 border-zinc-700' : 'bg-slate-100 text-slate-700 border-slate-300')
          }`}>
            <span className={`w-2 h-2 rounded-full ${isCloudConnected ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'}`} />
            <span>{isCloudConnected ? `Supabase Live (${supabaseLatency}ms)` : 'Cloud Offline'}</span>
          </div>

          {/* Theme Toggle */}
          <button
            onClick={() => onSwitchTheme(isDark ? 'light' : 'dark')}
            className={`p-2 rounded-xl border transition ${
              isDark
                ? 'bg-zinc-800 border-zinc-700 text-amber-300 hover:bg-zinc-700'
                : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-50 shadow-xs'
            }`}
            title="Toggle Light / Dark mode"
          >
            {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>

          {/* Switch Back to POS Terminal Button */}
          <button
            onClick={onBackToCounter}
            className={`px-3 py-1.5 rounded-xl border font-bold text-xs flex items-center space-x-1.5 transition ${
              isDark
                ? 'bg-zinc-800 border-zinc-700 text-slate-200 hover:bg-zinc-700'
                : 'bg-slate-100 border-slate-300 text-slate-900 hover:bg-slate-200 shadow-xs'
            }`}
            title="Switch back to Cashier Billing Terminal (Esc)"
          >
            <ArrowLeft className="w-3.5 h-3.5 text-purple-600" />
            <span className="hidden sm:inline">Counter POS</span>
          </button>
        </div>
      </header>

      {/* 2. Sleek Modern Tab Bar (Pills on desktop, scrollable on mobile) */}
      <nav className={`px-4 sm:px-6 py-2.5 border-b shrink-0 overflow-x-auto scrollbar-none ${
        isDark ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-slate-200'
      }`}>
        <div className="flex items-center space-x-2 min-w-max">
          {navItems.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center space-x-2 ${
                  isActive
                    ? 'bg-purple-600 text-white shadow-md shadow-purple-600/25'
                    : (isDark 
                        ? 'text-zinc-400 hover:text-white hover:bg-zinc-800' 
                        : 'text-slate-700 hover:text-slate-950 hover:bg-slate-100')
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-white' : (isDark ? 'text-zinc-500' : 'text-slate-500')}`} />
                <span>{tab.label}</span>
                {tab.badge && (
                  <span className={`text-[10px] font-black px-1.5 py-0.5 rounded-full ${
                    isActive ? 'bg-white/20 text-white' : tab.badgeBg
                  }`}>
                    {tab.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </nav>

      {/* 3. Main Scrollable Dashboard Content */}
      <main className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
        {/* ================= TAB 1: DASHBOARD OVERVIEW ================= */}
        {activeTab === 'overview' && (
          <div className="space-y-6 max-w-7xl mx-auto">
            {viewMode === 'daily' ? (
              <>
                {/* 4 Executive Metric Hero Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {/* Revenue Card */}
                  <div className={`p-5 rounded-2xl border transition hover:shadow-md ${
                    isDark ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-slate-200 shadow-sm'
                  }`}>
                    <div className="flex items-center justify-between">
                      <span className={`text-xs font-bold uppercase tracking-wider ${isDark ? 'text-zinc-400' : 'text-slate-500'}`}>
                        Store Revenue
                      </span>
                      <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-black">
                        <IndianRupee className="w-5 h-5" />
                      </div>
                    </div>
                    {/* Explicitly colored amount - NEVER invisible! */}
                    <div className={`mt-3 text-3xl font-black tracking-tight ${isDark ? 'text-white' : 'text-slate-950'}`}>
                      ₹{currentStats.todayGross.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </div>
                    <div className={`flex items-center justify-between text-xs mt-3 pt-3 border-t ${
                      isDark ? 'border-zinc-800 text-zinc-400' : 'border-slate-100 text-slate-600'
                    }`}>
                      <span>{currentStats.billCount} Bills Dispensed</span>
                      <span className="text-emerald-700 font-extrabold bg-emerald-100 px-2 py-0.5 rounded-md">
                        {currentStats.growth}
                      </span>
                    </div>
                  </div>

                  {/* Profit Card */}
                  <div className={`p-5 rounded-2xl border transition hover:shadow-md ${
                    isDark ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-slate-200 shadow-sm'
                  }`}>
                    <div className="flex items-center justify-between">
                      <span className={`text-xs font-bold uppercase tracking-wider ${isDark ? 'text-zinc-400' : 'text-slate-500'}`}>
                        Gross Profit
                      </span>
                      <div className="w-9 h-9 rounded-xl bg-sky-100 text-sky-800 flex items-center justify-center font-black">
                        <TrendingUp className="w-5 h-5" />
                      </div>
                    </div>
                    <div className="mt-3 text-3xl font-black text-sky-600 tracking-tight">
                      ₹{currentStats.todayProfit.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </div>
                    <div className={`flex items-center justify-between text-xs mt-3 pt-3 border-t ${
                      isDark ? 'border-zinc-800 text-zinc-400' : 'border-slate-100 text-slate-600'
                    }`}>
                      <span>Store Margin</span>
                      <span className="text-sky-800 font-extrabold bg-sky-100 px-2 py-0.5 rounded-md">
                        {currentStats.marginPct} Margin
                      </span>
                    </div>
                  </div>

                  {/* Payment Breakdown Card */}
                  <div className={`p-5 rounded-2xl border transition hover:shadow-md ${
                    isDark ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-slate-200 shadow-sm'
                  }`}>
                    <div className="flex items-center justify-between">
                      <span className={`text-xs font-bold uppercase tracking-wider ${isDark ? 'text-zinc-400' : 'text-slate-500'}`}>
                        Payment Channels
                      </span>
                      <div className="w-9 h-9 rounded-xl bg-purple-100 text-purple-800 flex items-center justify-center font-black">
                        <CreditCard className="w-5 h-5" />
                      </div>
                    </div>
                    <div className="mt-3 space-y-2">
                      <div className="flex items-center justify-between text-xs font-bold">
                        <span className={isDark ? 'text-zinc-400' : 'text-slate-600'}>Cash:</span>
                        <span className="text-emerald-700 font-black">₹{currentStats.cash.toLocaleString()}</span>
                      </div>
                      <div className="flex items-center justify-between text-xs font-bold">
                        <span className={isDark ? 'text-zinc-400' : 'text-slate-600'}>UPI (GooglePay):</span>
                        <span className="text-sky-600 font-black">₹{currentStats.upi.toLocaleString()}</span>
                      </div>
                      <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden flex border border-slate-200">
                        <div style={{ width: '53%' }} className="bg-emerald-500 h-full" title="Cash 53%" />
                        <div style={{ width: '47%' }} className="bg-sky-500 h-full" title="UPI 47%" />
                      </div>
                    </div>
                    <div className={`text-[11px] mt-2 text-right ${isDark ? 'text-zinc-400' : 'text-slate-500'}`}>
                      Avg Bill Size: ₹{currentStats.avgBill}
                    </div>
                  </div>

                    {/* Capital & Shortages Card */}
                    <div className={`p-5 rounded-2xl border transition hover:shadow-md ${
                      isDark ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-slate-200 shadow-sm'
                    }`}>
                      <div className="flex items-center justify-between">
                        <span className={`text-xs font-bold uppercase tracking-wider ${isDark ? 'text-zinc-400' : 'text-slate-500'}`}>
                          Shortages & Dead Stock
                        </span>
                        <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center font-black">
                          <Package className="w-5 h-5" />
                        </div>
                      </div>
                      <div className="mt-3 text-3xl font-black text-amber-600 tracking-tight">
                        {reorderItems.length} <span className="text-sm font-bold text-slate-500">{reorderScope === 'shelf' ? 'Active on Shelf' : 'Catalog Items'}</span>
                      </div>
                      <div className={`flex items-center justify-between text-xs mt-3 pt-3 border-t ${
                        isDark ? 'border-zinc-800 text-zinc-400' : 'border-slate-100 text-slate-600'
                      }`}>
                        <span>Dead Capital Trap</span>
                        <span className="text-purple-800 font-extrabold bg-purple-100 px-2 py-0.5 rounded-md">
                          ₹{(totalLockedCapital / 100000).toFixed(1)} Lakhs
                        </span>
                      </div>
                    </div>
                </div>

                {/* Multi-Pharmacy Store Breakdown (CLEAN, BEAUTIFUL, HIGH-CONTRAST!) */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h2 className={`text-sm font-black uppercase tracking-wider flex items-center space-x-2 ${
                      isDark ? 'text-zinc-200' : 'text-slate-900'
                    }`}>
                      <Building2 className="w-4 h-4 text-purple-600" />
                      <span>Multi-Pharmacy Individual Branch Comparison</span>
                    </h2>
                    <span className={`text-xs ${isDark ? 'text-zinc-400' : 'text-slate-500'}`}>3 Operational Branches</span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {branches.filter(b => b.id !== 'ALL').map(b => {
                      const bStats = salesTelemetry[b.id];
                      return (
                        <div 
                          key={b.id} 
                          className={`p-5 rounded-2xl border transition duration-200 hover:shadow-lg space-y-4 ${
                            isDark 
                              ? 'bg-zinc-900 border-zinc-800 text-white' 
                              : 'bg-white border-slate-200 text-slate-900 shadow-sm'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              {/* Store name - ALWAYS bold & high contrast */}
                              <h3 className={`font-black text-base ${isDark ? 'text-white' : 'text-slate-950'}`}>
                                {b.name}
                              </h3>
                              <p className={`text-xs ${isDark ? 'text-zinc-400' : 'text-slate-500'}`}>{b.location}</p>
                            </div>
                            <span className="flex items-center space-x-1 text-[11px] font-black px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-900 border border-emerald-300">
                              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                              <span>LIVE</span>
                            </span>
                          </div>

                          {/* Branch Revenue - ALWAYS BOLD & VISIBLE */}
                          <div>
                            <span className={`text-xs uppercase font-bold ${isDark ? 'text-zinc-400' : 'text-slate-500'}`}>
                              Today's Sales
                            </span>
                            <div className={`text-3xl font-black mt-0.5 ${isDark ? 'text-emerald-400' : 'text-slate-950'}`}>
                              ₹{bStats.todayGross.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                            </div>
                          </div>

                          {/* Details Grid - Soft colored boxes, NEVER dark muddy charcoal! */}
                          <div className="grid grid-cols-2 gap-2 pt-3 border-t border-slate-100 text-xs">
                            <div className={`p-3 rounded-xl border ${
                              isDark ? 'bg-zinc-800 border-zinc-700' : 'bg-sky-50 border-sky-200'
                            }`}>
                              <span className={`text-[10px] block uppercase font-bold ${isDark ? 'text-sky-400' : 'text-sky-800'}`}>
                                Gross Profit
                              </span>
                              <span className={`font-black text-sm ${isDark ? 'text-sky-300' : 'text-sky-950'}`}>
                                ₹{bStats.todayProfit.toLocaleString()} ({bStats.marginPct})
                              </span>
                            </div>

                            <div className={`p-3 rounded-xl border ${
                              isDark ? 'bg-zinc-800 border-zinc-700' : 'bg-slate-100 border-slate-200'
                            }`}>
                              <span className={`text-[10px] block uppercase font-bold ${isDark ? 'text-zinc-400' : 'text-slate-600'}`}>
                                Staff Active
                              </span>
                              <span className={`font-black text-sm ${isDark ? 'text-zinc-100' : 'text-slate-900'}`}>
                                {bStats.staffOnDuty} Staff
                              </span>
                            </div>
                          </div>

                          <div className={`flex items-center justify-between text-xs pt-1 ${isDark ? 'text-zinc-400' : 'text-slate-600'}`}>
                            <span>Cash: <strong className="text-emerald-700">₹{bStats.cash.toLocaleString()}</strong></span>
                            <span>•</span>
                            <span>UPI: <strong className="text-sky-600">₹{bStats.upi.toLocaleString()}</strong></span>
                            <span>•</span>
                            <span className="font-extrabold text-emerald-700">{bStats.growth}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Quick Action Speed-Dial Bar */}
                <div className={`p-4 rounded-2xl border flex flex-wrap items-center justify-between gap-3 ${
                  isDark ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-slate-200 shadow-sm'
                }`}>
                  <span className={`text-xs font-black uppercase tracking-wider ${isDark ? 'text-zinc-400' : 'text-slate-700'}`}>
                    Executive Quick Actions:
                  </span>
                  
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      onClick={() => setActiveTab('reorder')}
                      className="px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-extrabold text-xs shadow-sm flex items-center space-x-1.5"
                    >
                      <Share2 className="w-3.5 h-3.5" />
                      <span>Order Shortages (WhatsApp)</span>
                    </button>

                    <button
                      onClick={() => setActiveTab('overstock')}
                      className="px-3.5 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-extrabold text-xs shadow-sm flex items-center space-x-1.5"
                    >
                      <ArrowRightLeft className="w-3.5 h-3.5" />
                      <span>Transfer Dead Stock</span>
                    </button>

                    <button
                      onClick={() => setActiveTab('expiry')}
                      className="px-3.5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-extrabold text-xs shadow-sm flex items-center space-x-1.5"
                    >
                      <FileText className="w-3.5 h-3.5" />
                      <span>Generate Return Debit Note</span>
                    </button>

                    <button
                      onClick={() => setActiveTab('payables')}
                      className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs shadow-sm flex items-center space-x-1.5"
                    >
                      <Banknote className="w-3.5 h-3.5" />
                      <span>Record Agency Payment</span>
                    </button>
                  </div>
                </div>
              </>
            ) : (
              /* MONTHLY REPORT VIEW */
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className={`p-5 rounded-2xl border ${isDark ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-slate-200 shadow-sm'}`}>
                    <span className={`text-xs font-bold uppercase ${isDark ? 'text-zinc-400' : 'text-slate-500'}`}>October 2026 Revenue</span>
                    <div className={`text-3xl font-black mt-1 ${isDark ? 'text-white' : 'text-slate-950'}`}>
                      ₹{monthTotalGross.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </div>
                    <div className="text-xs text-emerald-700 font-bold mt-1">Across 16 operational billing days</div>
                  </div>

                  <div className={`p-5 rounded-2xl border ${isDark ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-slate-200 shadow-sm'}`}>
                    <span className={`text-xs font-bold uppercase ${isDark ? 'text-zinc-400' : 'text-slate-500'}`}>Total Profit Margin</span>
                    <div className="text-3xl font-black text-sky-600 mt-1">
                      ₹{monthTotalProfit.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </div>
                    <div className="text-xs text-sky-700 font-bold mt-1">21.0% Net Gross Profit</div>
                  </div>

                  <div className={`p-5 rounded-2xl border ${isDark ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-slate-200 shadow-sm'}`}>
                    <span className={`text-xs font-bold uppercase ${isDark ? 'text-zinc-400' : 'text-slate-500'}`}>Daily Average Turnover</span>
                    <div className="text-3xl font-black text-purple-600 mt-1">
                      ₹{(monthTotalGross / 16).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                    </div>
                    <div className={`text-xs font-bold mt-1 ${isDark ? 'text-zinc-400' : 'text-slate-500'}`}>~135 bills/day average</div>
                  </div>
                </div>

                <div className={`border rounded-2xl overflow-hidden ${isDark ? 'border-zinc-800 bg-zinc-900' : 'border-slate-200 bg-white shadow-sm'}`}>
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className={`border-b text-[11px] font-black uppercase ${
                        isDark ? 'bg-zinc-950 text-zinc-300 border-zinc-800' : 'bg-slate-100 text-slate-800 border-slate-200'
                      }`}>
                        <th className="py-3 px-4">Date</th>
                        <th className="py-3 px-4 text-center">Bills</th>
                        <th className="py-3 px-4 text-right">Gross Sales (₹)</th>
                        <th className="py-3 px-4 text-right">Cash (₹)</th>
                        <th className="py-3 px-4 text-right">UPI (₹)</th>
                        <th className="py-3 px-4 text-right font-black text-emerald-600">Gross Profit (₹)</th>
                        <th className="py-3 px-4 text-center">Margin %</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-inherit">
                      {monthlyDays.map((d, idx) => (
                        <tr key={idx} className={`border-b transition ${isDark ? 'hover:bg-zinc-800/60' : 'hover:bg-slate-50'}`}>
                          <td className={`py-2.5 px-4 font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>{d.date}</td>
                          <td className={`py-2.5 px-4 text-center ${isDark ? 'text-zinc-400' : 'text-slate-600'}`}>{d.bills}</td>
                          <td className={`py-2.5 px-4 text-right font-black ${isDark ? 'text-white' : 'text-slate-900'}`}>₹{d.gross.toLocaleString()}</td>
                          <td className="py-2.5 px-4 text-right text-emerald-700 font-bold">₹{d.cash.toLocaleString()}</td>
                          <td className="py-2.5 px-4 text-right text-sky-600 font-bold">₹{d.upi.toLocaleString()}</td>
                          <td className="py-2.5 px-4 text-right font-black text-emerald-600">₹{d.profit.toLocaleString()}</td>
                          <td className="py-2.5 px-4 text-center font-bold">{d.margin}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ================= TAB 2: REORDER RADAR ================= */}
        {activeTab === 'reorder' && (
          <div className="space-y-4 max-w-7xl mx-auto">
            <div className={`p-4 rounded-2xl border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 ${
              isDark ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-slate-200 shadow-sm'
            }`}>
              <div>
                <h3 className={`text-base font-black flex items-center space-x-2 ${isDark ? 'text-white' : 'text-slate-950'}`}>
                  <AlertTriangle className="w-5 h-5 text-amber-500" />
                  <span>Reorder Recommendations [SHORTAGE.PRG]</span>
                </h3>
                <p className={`text-xs mt-0.5 ${isDark ? 'text-zinc-400' : 'text-slate-600'}`}>
                  {filteredReorderItems.length} products below shelf reorder level • Est. Total PO: <strong>₹{totalReorderEstCost.toFixed(2)}</strong>
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                {/* Scope Toggle: Active on Shelf vs Full Catalog */}
                <div className={`flex rounded-xl border p-0.5 text-xs font-bold ${
                  isDark ? 'bg-zinc-800 border-zinc-700' : 'bg-slate-100 border-slate-300'
                }`}>
                  <button
                    onClick={() => setReorderScope('shelf')}
                    className={`px-2.5 py-1 rounded-lg transition ${
                      reorderScope === 'shelf'
                        ? 'bg-amber-600 text-white shadow-xs'
                        : (isDark ? 'text-zinc-400 hover:text-white' : 'text-slate-600 hover:text-slate-900')
                    }`}
                  >
                    Shelf Low Stock
                  </button>
                  <button
                    onClick={() => setReorderScope('catalog')}
                    className={`px-2.5 py-1 rounded-lg transition ${
                      reorderScope === 'catalog'
                        ? 'bg-amber-600 text-white shadow-xs'
                        : (isDark ? 'text-zinc-400 hover:text-white' : 'text-slate-600 hover:text-slate-900')
                    }`}
                  >
                    Full Catalog Depleted
                  </button>
                </div>

                <div className="relative flex-1 sm:flex-initial">
                  <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search medicine or rack..."
                    value={reorderSearch}
                    onChange={(e) => setReorderSearch(e.target.value)}
                    className={`py-1.5 pl-9 pr-3 rounded-xl border text-xs w-full sm:w-56 ${
                      isDark ? 'bg-zinc-800 border-zinc-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                    }`}
                  />
                </div>

                <select
                  value={reorderSupplierFilter}
                  onChange={(e) => setReorderSupplierFilter(e.target.value)}
                  className={`py-1.5 px-3 rounded-xl border text-xs font-bold ${
                    isDark ? 'bg-zinc-800 border-zinc-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                  }`}
                >
                  <option value="ALL">All Distributors</option>
                  {supplierList.slice(0, 15).map(s => (
                    <option key={s.code} value={s.code}>{s.name}</option>
                  ))}
                </select>

                <button
                  onClick={() => {
                    const csv = "Product,Generic,Rack,Stock,RO_Level,Deficit,EstCost,Distributor\n" +
                      filteredReorderItems.map(it => `"${it.name}","${it.generic || ''}","R-${it.rack}",${it.stock_shop1 || 0},${it.ro_level || 5},${it.deficit},${(it.deficit * (it.ptr || it.mrp * 0.78)).toFixed(2)},"${it.supplier.name}"`).join('\n');
                    const blob = new Blob([csv], { type: 'text/csv' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `PurchaseOrder_${currentDate}.csv`;
                    a.click();
                  }}
                  className="px-3.5 py-1.5 rounded-xl bg-slate-900 text-white font-bold text-xs shadow-xs flex items-center space-x-1.5"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>CSV</span>
                </button>
              </div>
            </div>

            <div className={`border rounded-2xl overflow-hidden ${isDark ? 'border-zinc-800 bg-zinc-900' : 'border-slate-200 bg-white shadow-sm'}`}>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className={`border-b text-[11px] font-black uppercase ${
                      isDark ? 'bg-zinc-950 text-zinc-300 border-zinc-800' : 'bg-slate-100 text-slate-800 border-slate-200'
                    }`}>
                      <th className="py-3 px-3 w-12 text-center">Sr</th>
                      <th className="py-3 px-3">Product Name & Salt</th>
                      <th className="py-3 px-3 text-center w-20">Rack</th>
                      <th className="py-3 px-3 text-center w-24">Stock</th>
                      <th className="py-3 px-3 text-center w-24">RO Level</th>
                      <th className="py-3 px-3 text-center w-28 text-amber-600 font-bold">Order Qty</th>
                      <th className="py-3 px-3 text-right w-24">Est. Cost (₹)</th>
                      <th className="py-3 px-3 w-48">Preferred Distributor</th>
                      <th className="py-3 px-3 text-center w-28">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-inherit">
                    {filteredReorderItems.slice(0, 50).map((item, idx) => (
                      <tr key={item.code || idx} className={`transition ${isDark ? 'hover:bg-zinc-800/60' : 'hover:bg-amber-50/50'}`}>
                        <td className="py-2.5 px-3 text-center font-bold text-slate-400">{idx + 1}</td>
                        <td className="py-2.5 px-3">
                          <div className={`font-black ${isDark ? 'text-white' : 'text-slate-950'}`}>{item.name}</div>
                          <div className="text-[10px] text-purple-600">{item.generic}</div>
                        </td>
                        <td className={`py-2.5 px-3 text-center font-bold ${isDark ? 'text-zinc-300' : 'text-slate-600'}`}>R-{item.rack}</td>
                        <td className="py-2.5 px-3 text-center font-black text-rose-600 bg-rose-50 rounded">
                          {item.stock_shop1 || 0}
                        </td>
                        <td className="py-2.5 px-3 text-center font-bold text-slate-500">{item.ro_level || 5}</td>
                        <td className="py-2.5 px-3 text-center font-black text-amber-600">
                          +{item.deficit} packs
                        </td>
                        <td className="py-2.5 px-3 text-right font-black">
                          ₹{(item.deficit * (item.ptr || item.mrp * 0.78)).toFixed(2)}
                        </td>
                        <td className={`py-2.5 px-3 text-xs font-bold ${isDark ? 'text-zinc-300' : 'text-slate-700'}`}>
                          {item.supplier.name}
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          <button
                            onClick={() => handleOpenWhatsAppModal(item.supplier)}
                            className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[11px] shadow-xs flex items-center space-x-1 mx-auto"
                          >
                            <Share2 className="w-3 h-3" />
                            <span>WhatsApp</span>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ================= TAB 3: OVERSTOCKED CAPITAL TRAP ================= */}
        {activeTab === 'overstock' && (
          <div className="space-y-4 max-w-7xl mx-auto">
            <div className={`p-5 rounded-2xl border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 ${
              isDark ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-slate-200 shadow-sm'
            }`}>
              <div>
                <h3 className={`text-base font-black flex items-center space-x-2 ${isDark ? 'text-white' : 'text-slate-950'}`}>
                  <Package className="w-5 h-5 text-purple-600" />
                  <span>Overstocked & Dead Capital Trap [REP009 / REP018]</span>
                </h3>
                <p className={`text-xs mt-1 ${isDark ? 'text-zinc-400' : 'text-slate-600'}`}>
                  Identify slow-moving stock tying up liquidity. Transfer to Town or Kannur branches to recover working capital.
                </p>
              </div>

              <div className="flex items-center space-x-3">
                <div className="relative">
                  <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search dead stock..."
                    value={overstockSearch}
                    onChange={(e) => setOverstockSearch(e.target.value)}
                    className={`py-1.5 pl-9 pr-3 rounded-xl border text-xs w-48 ${
                      isDark ? 'bg-zinc-800 border-zinc-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                    }`}
                  />
                </div>

                <div className={`text-right pl-3 border-l ${isDark ? 'border-zinc-800' : 'border-slate-200'}`}>
                  <span className="text-[10px] uppercase font-bold text-slate-500 block">Total Locked Capital</span>
                  <span className="text-xl font-black text-purple-600">
                    ₹{totalLockedCapital.toLocaleString()}
                  </span>
                </div>
              </div>
            </div>

            <div className={`border rounded-2xl overflow-hidden ${isDark ? 'border-zinc-800 bg-zinc-900' : 'border-slate-200 bg-white shadow-sm'}`}>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className={`border-b text-[11px] font-black uppercase ${
                      isDark ? 'bg-zinc-950 text-zinc-300 border-zinc-800' : 'bg-slate-100 text-slate-800 border-slate-200'
                    }`}>
                      <th className="py-3 px-3 w-12 text-center">Sr</th>
                      <th className="py-3 px-3">Product Name & Salt</th>
                      <th className="py-3 px-3 text-center w-20">Rack</th>
                      <th className="py-3 px-3 text-center w-24">Excess Stock</th>
                      <th className="py-3 px-3 text-center w-24 text-slate-500">Days Stagnant</th>
                      <th className="py-3 px-3 text-right w-32 font-black text-purple-600">Dead Capital (₹)</th>
                      <th className="py-3 px-3 text-center w-36">Recommendation</th>
                      <th className="py-3 px-3 text-center w-24">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-inherit">
                    {filteredOverstockedItems.slice(0, 40).map((item, idx) => (
                      <tr key={item.code || idx} className={`transition ${isDark ? 'hover:bg-zinc-800/60' : 'hover:bg-purple-50/40'}`}>
                        <td className="py-2.5 px-3 text-center font-bold text-slate-400">{idx + 1}</td>
                        <td className="py-2.5 px-3">
                          <div className={`font-black ${isDark ? 'text-white' : 'text-slate-950'}`}>{item.name}</div>
                          <div className="text-[10px] text-slate-500">{item.generic}</div>
                        </td>
                        <td className="py-2.5 px-3 text-center font-bold text-slate-600">R-{item.rack}</td>
                        <td className="py-2.5 px-3 text-center font-black text-purple-600">
                          {item.totalStock} packs
                        </td>
                        <td className="py-2.5 px-3 text-center font-bold text-slate-500">
                          {item.daysNoSale} days
                        </td>
                        <td className={`py-2.5 px-3 text-right font-black ${isDark ? 'text-white' : 'text-slate-950'}`}>
                          ₹{item.lockedCapital.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="py-2.5 px-3 text-center font-bold">
                          <span className="px-2 py-0.5 rounded-full text-[10px] bg-purple-100 text-purple-900 border border-purple-300">
                            {item.recommendation}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          <button
                            onClick={() => {
                              setTransferModalItem(item);
                              setTransferQty(15);
                            }}
                            className="px-2.5 py-1 bg-purple-600 hover:bg-purple-500 text-white rounded-lg font-bold text-[11px] shadow-xs flex items-center space-x-1 mx-auto"
                          >
                            <ArrowRightLeft className="w-3 h-3" />
                            <span>Transfer</span>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ================= TAB 4: NEAR EXPIRY RISK ================= */}
        {activeTab === 'expiry' && (
          <div className="space-y-4 max-w-7xl mx-auto">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className={`p-5 rounded-2xl border ${isDark ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-slate-200 shadow-sm'}`}>
                <span className="text-xs font-bold text-rose-600 uppercase tracking-wider block">Critical &lt; 30 Days</span>
                <div className="text-3xl font-black text-rose-600 mt-1">
                  ₹{nearExpiryList.filter(x => x.urgency === '30').reduce((acc, it) => acc + it.lossValue, 0).toFixed(2)}
                </div>
                <div className={`text-xs mt-1 ${isDark ? 'text-zinc-400' : 'text-slate-500'}`}>Immediate return to distributor required</div>
              </div>

              <div className={`p-5 rounded-2xl border ${isDark ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-slate-200 shadow-sm'}`}>
                <span className="text-xs font-bold text-amber-600 uppercase tracking-wider block">Warning 31-60 Days</span>
                <div className="text-3xl font-black text-amber-600 mt-1">
                  ₹{nearExpiryList.filter(x => x.urgency === '60').reduce((acc, it) => acc + it.lossValue, 0).toFixed(2)}
                </div>
                <div className={`text-xs mt-1 ${isDark ? 'text-zinc-400' : 'text-slate-500'}`}>Prioritize for dispensing or return</div>
              </div>

              <div className={`p-5 rounded-2xl border ${isDark ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-slate-200 shadow-sm'}`}>
                <span className="text-xs font-bold text-purple-600 uppercase tracking-wider block">Total Risk Value</span>
                <div className={`text-3xl font-black mt-1 ${isDark ? 'text-white' : 'text-slate-950'}`}>
                  ₹{totalExpiryRiskValue.toFixed(2)}
                </div>
                <div className={`text-xs mt-1 ${isDark ? 'text-zinc-400' : 'text-slate-500'}`}>6 Batches flagged across shelves</div>
              </div>
            </div>

            <div className={`border rounded-2xl overflow-hidden ${isDark ? 'border-zinc-800 bg-zinc-900' : 'border-slate-200 bg-white shadow-sm'}`}>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className={`border-b text-[11px] font-black uppercase ${
                      isDark ? 'bg-zinc-950 text-zinc-300 border-zinc-800' : 'bg-slate-100 text-slate-800 border-slate-200'
                    }`}>
                      <th className="py-3 px-3 w-12 text-center">Sr</th>
                      <th className="py-3 px-3">Product Name</th>
                      <th className="py-3 px-3 text-center w-28">Batch No</th>
                      <th className="py-3 px-3 text-center w-28">Expiry (MM/YY)</th>
                      <th className="py-3 px-3 text-center w-24">Packs Left</th>
                      <th className="py-3 px-3 text-right w-24">PTR Cost (₹)</th>
                      <th className="py-3 px-3 text-right w-32 font-black text-rose-600">Risk Value (₹)</th>
                      <th className="py-3 px-3 w-48">Distributor Agency</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-inherit">
                    {filteredExpiryList.map((item, idx) => (
                      <tr key={idx} className={`transition ${isDark ? 'hover:bg-zinc-800/60' : 'hover:bg-rose-50/40'}`}>
                        <td className="py-2.5 px-3 text-center font-bold text-slate-400">{idx + 1}</td>
                        <td className={`py-2.5 px-3 font-black ${isDark ? 'text-white' : 'text-slate-950'}`}>{item.name}</td>
                        <td className={`py-2.5 px-3 text-center font-mono font-bold ${isDark ? 'text-zinc-300' : 'text-slate-700'}`}>{item.batch}</td>
                        <td className="py-2.5 px-3 text-center font-bold text-rose-600">{item.exp}</td>
                        <td className="py-2.5 px-3 text-center font-black">{item.packs}</td>
                        <td className="py-2.5 px-3 text-right">₹{item.ptr.toFixed(2)}</td>
                        <td className="py-2.5 px-3 text-right font-black text-rose-600">₹{item.lossValue.toFixed(2)}</td>
                        <td className={`py-2.5 px-3 text-xs font-bold ${isDark ? 'text-zinc-400' : 'text-slate-600'}`}>{item.supplier}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ================= TAB 5: MULTI-STORE RADAR ================= */}
        {activeTab === 'multistore' && (
          <div className="space-y-4 max-w-7xl mx-auto">
            <div className={`p-4 rounded-2xl border flex items-center justify-between ${
              isDark ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-slate-200 shadow-sm'
            }`}>
              <div>
                <h3 className={`text-base font-black flex items-center space-x-2 ${isDark ? 'text-white' : 'text-slate-950'}`}>
                  <Store className="w-5 h-5 text-purple-600" />
                  <span>Realtime Cross-Branch Stock Radar</span>
                </h3>
                <p className={`text-xs mt-0.5 ${isDark ? 'text-zinc-400' : 'text-slate-500'}`}>
                  Check stock availability across Main Chirakkara, Town Branch, and Kannur Clinic instantly
                </p>
              </div>

              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Lookup stock across all stores..."
                  value={multistoreSearch}
                  onChange={(e) => setMultistoreSearch(e.target.value)}
                  className={`py-1.5 pl-9 pr-3 rounded-xl border text-xs w-64 ${
                    isDark ? 'bg-zinc-800 border-zinc-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                  }`}
                />
              </div>
            </div>

            <div className={`border rounded-2xl overflow-hidden ${isDark ? 'border-zinc-800 bg-zinc-900' : 'border-slate-200 bg-white shadow-sm'}`}>
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className={`border-b text-[11px] font-black uppercase ${
                    isDark ? 'bg-zinc-950 text-zinc-300 border-zinc-800' : 'bg-slate-100 text-slate-800 border-slate-200'
                  }`}>
                    <th className="py-3 px-3 w-12 text-center">Sr</th>
                    <th className="py-3 px-3">Product Name & Salt</th>
                    <th className="py-3 px-3 text-center w-20">Rack</th>
                    <th className="py-3 px-3 text-center w-32 bg-purple-50 text-purple-900 font-black">Main Chirakkara</th>
                    <th className="py-3 px-3 text-center w-32 bg-emerald-50 text-emerald-900 font-black">Town Branch</th>
                    <th className="py-3 px-3 text-center w-32 bg-sky-50 text-sky-900 font-black">Kannur Clinic</th>
                    <th className="py-3 px-3 text-center w-24">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-inherit">
                  {initialMedicines.filter(m => !multistoreSearch || m.name.toLowerCase().includes(multistoreSearch.toLowerCase())).slice(0, 30).map((m, idx) => {
                    const mainStock = m.stock_shop1 || 0;
                    const townStock = m.stock_shop2 || Math.floor((m.name.charCodeAt(0) * 3) % 20);
                    const kannurStock = Math.floor((m.name.charCodeAt(1) * 2) % 15);
                    return (
                      <tr key={idx} className={`border-b transition ${isDark ? 'hover:bg-zinc-800/60' : 'hover:bg-slate-50'}`}>
                        <td className="py-2.5 px-3 text-center font-bold text-slate-400">{idx + 1}</td>
                        <td className="py-2.5 px-3">
                          <div className={`font-black ${isDark ? 'text-white' : 'text-slate-950'}`}>{m.name}</div>
                          <div className="text-[10px] text-slate-500">{m.generic}</div>
                        </td>
                        <td className="py-2.5 px-3 text-center font-bold text-slate-600">R-{m.rack}</td>
                        <td className="py-2.5 px-3 text-center font-black text-purple-700">
                          {mainStock} packs
                        </td>
                        <td className="py-2.5 px-3 text-center font-black text-emerald-700">
                          {townStock} packs
                        </td>
                        <td className="py-2.5 px-3 text-center font-black text-sky-700">
                          {kannurStock} packs
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          <button
                            onClick={() => {
                              setTransferModalItem({ ...m, totalStock: mainStock });
                              setTransferQty(10);
                            }}
                            className="px-2.5 py-1 bg-purple-600 hover:bg-purple-500 text-white rounded-lg font-bold text-[10px]"
                          >
                            Transfer
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ================= TAB 6: AGENCY PAYABLES ================= */}
        {activeTab === 'payables' && (
          <div className="space-y-4 max-w-7xl mx-auto">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className={`p-5 rounded-2xl border ${isDark ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-slate-200 shadow-sm'}`}>
                <span className="text-xs font-bold text-rose-600 uppercase tracking-wider block">Overdue Invoices</span>
                <div className="text-3xl font-black text-rose-600 mt-1">
                  ₹{pendingPayables.filter(p => p.status === 'OVERDUE').reduce((acc, it) => acc + it.amount, 0).toFixed(2)}
                </div>
                <div className={`text-xs mt-1 ${isDark ? 'text-zinc-400' : 'text-slate-500'}`}>Requires immediate payment voucher</div>
              </div>

              <div className={`p-5 rounded-2xl border ${isDark ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-slate-200 shadow-sm'}`}>
                <span className="text-xs font-bold text-amber-600 uppercase tracking-wider block">Due Today</span>
                <div className="text-3xl font-black text-amber-600 mt-1">
                  ₹{pendingPayables.filter(p => p.status === 'DUE TODAY').reduce((acc, it) => acc + it.amount, 0).toFixed(2)}
                </div>
                <div className={`text-xs mt-1 ${isDark ? 'text-zinc-400' : 'text-slate-500'}`}>Issue cheque or NEFT transfer</div>
              </div>

              <div className={`p-5 rounded-2xl border ${isDark ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-slate-200 shadow-sm'}`}>
                <span className="text-xs font-bold text-emerald-600 uppercase tracking-wider block">Total Outstanding Balance</span>
                <div className={`text-3xl font-black mt-1 ${isDark ? 'text-white' : 'text-slate-950'}`}>
                  ₹{pendingPayables.reduce((acc, it) => acc + it.amount, 0).toFixed(2)}
                </div>
                <div className={`text-xs mt-1 ${isDark ? 'text-zinc-400' : 'text-slate-500'}`}>Across {pendingPayables.length} distributor agencies</div>
              </div>
            </div>

            <div className={`border rounded-2xl overflow-hidden ${isDark ? 'border-zinc-800 bg-zinc-900' : 'border-slate-200 bg-white shadow-sm'}`}>
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className={`border-b text-[11px] font-black uppercase ${
                    isDark ? 'bg-zinc-950 text-zinc-300 border-zinc-800' : 'bg-slate-100 text-slate-800 border-slate-200'
                  }`}>
                    <th className="py-3 px-3 w-12 text-center">Sr</th>
                    <th className="py-3 px-3">Distributor Agency</th>
                    <th className="py-3 px-3 text-center w-28">Bill No</th>
                    <th className="py-3 px-3 text-center w-28">Bill Date</th>
                    <th className="py-3 px-3 text-center w-20">Terms</th>
                    <th className="py-3 px-3 text-center w-28">Due Date</th>
                    <th className="py-3 px-3 text-right w-32 font-black">Amount</th>
                    <th className="py-3 px-3 text-center w-28">Status</th>
                    <th className="py-3 px-3 text-center w-28">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-inherit">
                  {pendingPayables.map((p, idx) => (
                    <tr key={idx} className={`border-b transition ${isDark ? 'hover:bg-zinc-800/60' : 'hover:bg-slate-50'}`}>
                      <td className="py-2.5 px-3 text-center font-bold text-slate-400">{idx + 1}</td>
                      <td className={`py-2.5 px-3 font-black ${isDark ? 'text-white' : 'text-slate-950'}`}>{p.name}</td>
                      <td className={`py-2.5 px-3 text-center font-mono font-bold ${isDark ? 'text-zinc-400' : 'text-slate-600'}`}>{p.billNo}</td>
                      <td className="py-2.5 px-3 text-center text-slate-500">{p.billDate}</td>
                      <td className="py-2.5 px-3 text-center font-bold">{p.cDays}d</td>
                      <td className="py-2.5 px-3 text-center font-bold">{p.due}</td>
                      <td className={`py-2.5 px-3 text-right font-black ${isDark ? 'text-white' : 'text-slate-950'}`}>
                        ₹{p.amount.toFixed(2)}
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                          p.status === 'OVERDUE'
                            ? 'bg-rose-100 text-rose-900 border border-rose-300'
                            : p.status === 'DUE TODAY'
                              ? 'bg-amber-100 text-amber-900 border border-amber-300'
                              : 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                        }`}>
                          {p.status}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <button
                          onClick={() => setPaymentModalItem(p)}
                          className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-bold text-[10px] shadow-xs"
                        >
                          Record Pay
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ================= TAB 7: DOCTOR ANALYTICS ================= */}
        {activeTab === 'doctors' && (
          <div className="space-y-4 max-w-7xl mx-auto">
            <div className={`border rounded-2xl overflow-hidden ${isDark ? 'border-zinc-800 bg-zinc-900' : 'border-slate-200 bg-white shadow-sm'}`}>
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className={`border-b text-[11px] font-black uppercase ${
                    isDark ? 'bg-zinc-950 text-zinc-300 border-zinc-800' : 'bg-slate-100 text-slate-800 border-slate-200'
                  }`}>
                    <th className="py-3 px-4 w-12 text-center">Sr</th>
                    <th className="py-3 px-4">Consulting Doctor</th>
                    <th className="py-3 px-4 w-36">Specialty</th>
                    <th className="py-3 px-4 text-center w-24">Prescriptions</th>
                    <th className="py-3 px-4 text-right w-32 font-black">Gross Revenue (₹)</th>
                    <th className="py-3 px-4 text-right w-28">Avg Basket (₹)</th>
                    <th className="py-3 px-4 w-56">Top Prescribed Medicines</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-inherit">
                  {doctorAnalytics.map((doc, idx) => (
                    <tr key={idx} className={`border-b transition ${isDark ? 'hover:bg-zinc-800/60' : 'hover:bg-slate-50'}`}>
                      <td className="py-3 px-4 text-center font-bold text-slate-400">{idx + 1}</td>
                      <td className="py-3 px-4 font-black text-sm text-purple-700">
                        {doc.name}
                      </td>
                      <td className={`py-3 px-4 ${isDark ? 'text-zinc-400' : 'text-slate-600'}`}>{doc.specialty}</td>
                      <td className="py-3 px-4 text-center font-black">{doc.bills}</td>
                      <td className="py-3 px-4 text-right font-black text-emerald-600">
                        ₹{doc.revenue.toFixed(2)}
                      </td>
                      <td className={`py-3 px-4 text-right font-bold ${isDark ? 'text-zinc-300' : 'text-slate-700'}`}>
                        ₹{doc.avgBasket.toFixed(2)}
                      </td>
                      <td className={`py-3 px-4 font-bold ${isDark ? 'text-zinc-300' : 'text-slate-700'}`}>
                        {doc.topDrug}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ================= TAB 8: CLOUD SYNC HUB ================= */}
        {activeTab === 'cloud' && (
          <div className="space-y-6 max-w-4xl mx-auto">
            <div className={`p-6 rounded-2xl border ${isDark ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-slate-200 shadow-sm'} space-y-5`}>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center space-x-3">
                  <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-800 flex items-center justify-center shrink-0">
                    <Cloud className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className={`font-black text-lg flex items-center space-x-2 ${isDark ? 'text-white' : 'text-slate-950'}`}>
                      <span>Supabase PostgreSQL Cloud</span>
                      <span className="text-[11px] font-black px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300">
                        CONNECTED
                      </span>
                    </h3>
                    <p className={`text-xs font-mono mt-0.5 ${isDark ? 'text-zinc-400' : 'text-slate-500'}`}>
                      Project: https://coqziknetbiinumbueay.supabase.co
                    </p>
                  </div>
                </div>

                <button
                  disabled={testingConnection}
                  onClick={async () => {
                    setTestingConnection(true);
                    const res = await testSupabaseConnection();
                    setIsCloudConnected(res.connected);
                    if (res.latency) setSupabaseLatency(res.latency);
                    setTestingConnection(false);
                    setToastMessage(`Supabase connection tested: ${res.connected ? 'Active (' + res.latency + 'ms)' : 'Error: ' + res.error}`);
                    setTimeout(() => setToastMessage(''), 4000);
                  }}
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs shadow-xs flex items-center space-x-2"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{testingConnection ? 'Testing...' : `Live (${supabaseLatency}ms)`}</span>
                </button>
              </div>

              {/* Offline Resilience Banner */}
              <div className={`p-4 rounded-xl border text-xs space-y-2 ${
                isDark ? 'bg-zinc-800/60 border-zinc-700' : 'bg-slate-50 border-slate-200'
              }`}>
                <p className={`font-bold ${isDark ? 'text-zinc-200' : 'text-slate-900'}`}>
                  ⚡ Zero-Downtime Offline Architecture:
                </p>
                <p className={isDark ? 'text-zinc-400' : 'text-slate-600'}>
                  Counter 01 in Chirakkara operates 100% offline using local indexed storage. Bills dispense instantly and dot-matrix receipts print without waiting for internet. Every completed bill automatically pushes to your Supabase PostgreSQL cluster in the background so you can monitor live sales on your phone!
                </p>
              </div>

              {/* Supabase SQL Schema for One-Click Database Setup */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className={`text-xs font-black uppercase tracking-wider ${isDark ? 'text-zinc-300' : 'text-slate-700'}`}>
                    Database Tables SQL Script (Run in Supabase SQL Editor)
                  </span>
                  <button
                    onClick={() => {
                      const sql = `-- 1. Sales Bills Table\nCREATE TABLE IF NOT EXISTS sales_bills (\n  id BIGSERIAL PRIMARY KEY,\n  bill_no VARCHAR(20) NOT NULL,\n  bill_date VARCHAR(20) NOT NULL,\n  store_branch VARCHAR(50) DEFAULT 'MAIN',\n  patient_name VARCHAR(150),\n  doctor_name VARCHAR(150),\n  payment_mode VARCHAR(20),\n  gross_total NUMERIC(12,2),\n  net_payable NUMERIC(12,2),\n  items_json JSONB,\n  created_at TIMESTAMPTZ DEFAULT NOW()\n);\n\n-- 2. Inter-Branch Stock Transfers\nCREATE TABLE IF NOT EXISTS stock_transfers (\n  id BIGSERIAL PRIMARY KEY,\n  transfer_id VARCHAR(30) UNIQUE NOT NULL,\n  medicine_name VARCHAR(200) NOT NULL,\n  from_store VARCHAR(100) NOT NULL,\n  to_store VARCHAR(100) NOT NULL,\n  quantity INTEGER NOT NULL,\n  status VARCHAR(30) DEFAULT 'IN-TRANSIT',\n  created_at TIMESTAMPTZ DEFAULT NOW()\n);`;
                      navigator.clipboard.writeText(sql);
                      setToastMessage('SQL script copied! Paste into Supabase SQL Editor.');
                      setTimeout(() => setToastMessage(''), 4000);
                    }}
                    className="text-xs font-bold text-purple-600 hover:text-purple-700 flex items-center space-x-1"
                  >
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy SQL Schema</span>
                  </button>
                </div>

                <pre className="p-3.5 rounded-xl bg-slate-950 text-emerald-400 font-mono text-[11px] overflow-x-auto max-h-48 border border-slate-800">
{`-- 1. Sales Bills Table (Automatically synced on every bill)
CREATE TABLE IF NOT EXISTS sales_bills (
  id BIGSERIAL PRIMARY KEY,
  bill_no VARCHAR(20) NOT NULL,
  bill_date VARCHAR(20) NOT NULL,
  store_branch VARCHAR(50) DEFAULT 'MAIN',
  patient_name VARCHAR(150),
  doctor_name VARCHAR(150),
  payment_mode VARCHAR(20),
  gross_total NUMERIC(12,2),
  net_payable NUMERIC(12,2),
  items_json JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Inter-Branch Stock Transfers
CREATE TABLE IF NOT EXISTS stock_transfers (
  id BIGSERIAL PRIMARY KEY,
  transfer_id VARCHAR(30) UNIQUE NOT NULL,
  medicine_name VARCHAR(200) NOT NULL,
  from_store VARCHAR(100) NOT NULL,
  to_store VARCHAR(100) NOT NULL,
  quantity INTEGER NOT NULL,
  status VARCHAR(30) DEFAULT 'IN-TRANSIT',
  created_at TIMESTAMPTZ DEFAULT NOW()
);`}
                </pre>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* MODAL 1: WHATSAPP PURCHASE ORDER */}
      {isWhatsAppModalOpen && selectedSupplierForPO && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className={`w-full max-w-lg rounded-2xl border shadow-2xl p-6 ${
            isDark ? 'bg-zinc-900 border-zinc-700 text-white' : 'bg-white border-slate-200 text-slate-900'
          }`}>
            <div className="flex justify-between items-center mb-3">
              <h3 className="font-black text-sm uppercase flex items-center space-x-2">
                <Share2 className="w-4 h-4 text-emerald-600" />
                <span>WhatsApp Purchase Order</span>
              </h3>
              <button onClick={() => setIsWhatsAppModalOpen(false)}>
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>

            <textarea
              readOnly
              rows={8}
              value={getWhatsAppPOTemplate(selectedSupplierForPO)}
              className={`w-full p-3 rounded-xl border font-mono text-xs ${
                isDark ? 'bg-zinc-950 border-zinc-800 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'
              }`}
            />

            <div className="pt-4 flex justify-between items-center">
              <span className="text-xs text-slate-500 font-bold">
                Phone: {selectedSupplierForPO.phone || '+91 94471 23456'}
              </span>

              <div className="flex space-x-2">
                <button
                  type="button"
                  onClick={() => handleCopyWhatsApp(getWhatsAppPOTemplate(selectedSupplierForPO))}
                  className="px-3.5 py-2 bg-slate-850 text-white font-bold rounded-xl text-xs flex items-center space-x-1"
                >
                  {copiedWhatsApp ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedWhatsApp ? 'Copied' : 'Copy'}</span>
                </button>
                <a
                  href={`https://wa.me/?text=${encodeURIComponent(getWhatsAppPOTemplate(selectedSupplierForPO))}`}
                  target="_blank"
                  rel="noreferrer"
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-black rounded-xl text-xs flex items-center space-x-1.5 shadow-sm"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Send WhatsApp</span>
                </a>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: INTER-BRANCH STOCK TRANSFER */}
      {transferModalItem && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className={`w-full max-w-md rounded-2xl border shadow-2xl p-6 ${
            isDark ? 'bg-zinc-900 border-zinc-700 text-white' : 'bg-white border-slate-200 text-slate-900'
          }`}>
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-black text-sm uppercase">Dispatch Inter-Branch Stock</h3>
              <button onClick={() => setTransferModalItem(null)}>
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>

            <form onSubmit={handleExecuteTransfer} className="space-y-4 text-xs">
              <div className={`p-3 rounded-xl border ${isDark ? 'bg-zinc-800 border-zinc-700' : 'bg-slate-50 border-slate-200'}`}>
                <span className="text-[10px] text-slate-500 uppercase font-bold">Medicine</span>
                <div className={`font-black text-sm ${isDark ? 'text-white' : 'text-slate-900'}`}>{transferModalItem.name}</div>
                <div className="text-slate-500 text-[10px] mt-1">Available at Main Shop: {transferModalItem.totalStock} packs</div>
              </div>

              <div>
                <label className="block text-xs font-bold mb-1">Destination Branch</label>
                <select
                  value={transferTargetBranch}
                  onChange={(e) => setTransferTargetBranch(e.target.value)}
                  className={`w-full py-2 px-3 rounded-xl border font-bold text-xs ${isDark ? 'bg-zinc-800 border-zinc-700 text-white' : 'bg-white border-slate-300 text-slate-900'}`}
                >
                  <option value="TOWN">Beta Pharmacy (Town Branch)</option>
                  <option value="KANNUR">Beta Pharmacy (Kannur Clinic)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold mb-1">Transfer Quantity (Packs)</label>
                <input
                  type="number"
                  min="1"
                  max={transferModalItem.totalStock || 100}
                  value={transferQty}
                  onChange={(e) => setTransferQty(parseInt(e.target.value) || 1)}
                  className={`w-full py-2 px-3 rounded-xl border font-black text-sm ${isDark ? 'bg-zinc-800 border-zinc-700 text-white' : 'bg-white border-slate-300 text-slate-900'}`}
                />
              </div>

              <div className="pt-2 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setTransferModalItem(null)}
                  className="px-4 py-2 rounded-xl border font-bold text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-purple-600 text-white font-black rounded-xl text-xs shadow-sm"
                >
                  Confirm Transfer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: RECORD PAYMENT */}
      {paymentModalItem && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className={`w-full max-w-md rounded-2xl border shadow-2xl p-6 ${
            isDark ? 'bg-zinc-900 border-zinc-700 text-white' : 'bg-white border-slate-200 text-slate-900'
          }`}>
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-black text-sm uppercase">Record Distributor Payment</h3>
              <button onClick={() => setPaymentModalItem(null)}>
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>

            <form onSubmit={handleRecordPayment} className="space-y-4 text-xs">
              <div className={`p-3 rounded-xl border ${isDark ? 'bg-zinc-800 border-zinc-700' : 'bg-slate-50 border-slate-200'}`}>
                <span className="text-[10px] text-slate-500 uppercase font-bold">Distributor</span>
                <div className={`font-black text-sm ${isDark ? 'text-white' : 'text-slate-900'}`}>{paymentModalItem.name}</div>
                <div className="flex justify-between text-slate-500 text-[10px] mt-1">
                  <span>Bill No: {paymentModalItem.billNo}</span>
                  <span className="font-black text-emerald-600 text-xs">₹{paymentModalItem.amount.toFixed(2)}</span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold mb-1">Paying Bank / Account</label>
                <select
                  value={paymentBank}
                  onChange={(e) => setPaymentBank(e.target.value)}
                  className={`w-full py-2 px-3 rounded-xl border font-bold text-xs ${isDark ? 'bg-zinc-800 border-zinc-700 text-white' : 'bg-white border-slate-300 text-slate-900'}`}
                >
                  <option value="Federal Bank Thalassery">Federal Bank (Main Current A/c - 1045)</option>
                  <option value="State Bank of India Thalassery">SBI (Chirakkara Branch - 8812)</option>
                  <option value="HDFC Bank Kannur">HDFC Bank (Kannur Clinic A/c - 4401)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold mb-1">Cheque No / UTR Ref</label>
                <input
                  type="text"
                  placeholder="e.g. CHQ-449102 or NEFT UTR"
                  value={paymentChequeNo}
                  onChange={(e) => setPaymentChequeNo(e.target.value)}
                  className={`w-full py-2 px-3 rounded-xl border font-mono font-bold text-xs ${isDark ? 'bg-zinc-800 border-zinc-700 text-white' : 'bg-white border-slate-300 text-slate-900'}`}
                  required
                />
              </div>

              <div className="pt-2 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setPaymentModalItem(null)}
                  className="px-4 py-2 rounded-xl border font-bold text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-600 text-white font-black rounded-xl text-xs shadow-sm"
                >
                  Save Payment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
