import React, { useState, useMemo } from 'react';
import { 
  ArrowLeft, 
  Search, 
  Calendar, 
  Building2, 
  Package, 
  Filter, 
  Printer, 
  Download, 
  Clock, 
  Hash, 
  Layers, 
  CheckCircle2, 
  AlertTriangle, 
  Truck,
  RefreshCw,
  SlidersHorizontal,
  ChevronDown,
  DollarSign
} from 'lucide-react';
import supplierList from '../data/suppliers.json';

// Seeded realistic distributor inward lots history (BATCH.DBF / INWARD.DBF)
const SEEDED_INWARD_LOTS = [
  {
    inwardDate: '16/10/2026',
    billNo: '020456',
    supplier: 'THE CAN DRUG HOUSE',
    supplierCode: 'T010',
    supplierCity: 'KANNUR',
    productName: 'AUGMENTIN 625 DUO TAB',
    salt: 'Amoxicillin 500mg + Clavulanic Acid 125mg',
    company: 'GSK (GlaxoSmithKline)',
    packSize: 10,
    batchNo: 'AG8921',
    expDate: '08/29',
    billedPacks: 25,
    freePacks: 2,
    totalUnits: 270,
    ptr: 142.50,
    mrp: 204.00,
    gstPercent: 12,
    rack: 'A1',
    stockStatus: 'In Stock',
    unitsRemaining: 270
  },
  {
    inwardDate: '15/10/2026',
    billNo: '020451',
    supplier: 'THE CAN DRUG HOUSE',
    supplierCode: 'T010',
    supplierCity: 'KANNUR',
    productName: 'PAN 40MG TAB',
    salt: 'Pantoprazole 40mg',
    company: 'Alkem Laboratories',
    packSize: 15,
    batchNo: 'PN4012',
    expDate: '11/28',
    billedPacks: 40,
    freePacks: 4,
    totalUnits: 660,
    ptr: 95.20,
    mrp: 155.00,
    gstPercent: 12,
    rack: 'B2',
    stockStatus: 'In Stock',
    unitsRemaining: 615
  },
  {
    inwardDate: '14/10/2026',
    billNo: 'TH-9021',
    supplier: 'THALASSERY PHARMA AGENCIES',
    supplierCode: 'T011',
    supplierCity: 'THALASSERY',
    productName: 'TELMA 40MG TAB',
    salt: 'Telmisartan 40mg',
    company: 'Glenmark Pharmaceuticals',
    packSize: 15,
    batchNo: 'TL8831',
    expDate: '05/29',
    billedPacks: 30,
    freePacks: 3,
    totalUnits: 495,
    ptr: 110.00,
    mrp: 168.00,
    gstPercent: 12,
    rack: 'C3',
    stockStatus: 'In Stock',
    unitsRemaining: 450
  },
  {
    inwardDate: '12/10/2026',
    billNo: 'MD-7712',
    supplier: 'MALABAR DRUG DISTRIBUTORS',
    supplierCode: 'M004',
    supplierCity: 'CALICUT',
    productName: 'GLYCOMET GP 2 TAB',
    salt: 'Glimepiride 2mg + Metformin 500mg',
    company: 'USV Ltd',
    packSize: 15,
    batchNo: 'GLP209',
    expDate: '03/29',
    billedPacks: 50,
    freePacks: 5,
    totalUnits: 825,
    ptr: 82.50,
    mrp: 135.00,
    gstPercent: 12,
    rack: 'D1',
    stockStatus: 'In Stock',
    unitsRemaining: 710
  },
  {
    inwardDate: '10/10/2026',
    billNo: 'SB-4401',
    supplier: 'SABARI AGENCIES',
    supplierCode: 'S076',
    supplierCity: 'KANNUR',
    productName: 'AZITHRAL 500 TAB',
    salt: 'Azithromycin 500mg',
    company: 'Alembic Pharmaceuticals',
    packSize: 5,
    batchNo: 'AZ5019',
    expDate: '12/28',
    billedPacks: 40,
    freePacks: 4,
    totalUnits: 220,
    ptr: 78.00,
    mrp: 119.50,
    gstPercent: 12,
    rack: 'E2',
    stockStatus: 'In Stock',
    unitsRemaining: 185
  },
  {
    inwardDate: '08/10/2026',
    billNo: '020399',
    supplier: 'THE CAN DRUG HOUSE',
    supplierCode: 'T010',
    supplierCity: 'KANNUR',
    productName: 'CALPOL 650MG TABLET',
    salt: 'Paracetamol 650mg',
    company: 'GSK (GlaxoSmithKline)',
    packSize: 15,
    batchNo: 'CP8921',
    expDate: '08/29',
    billedPacks: 100,
    freePacks: 10,
    totalUnits: 1650,
    ptr: 18.90,
    mrp: 30.50,
    gstPercent: 12,
    rack: 'A1',
    stockStatus: 'Fast Moving',
    unitsRemaining: 1240
  },
  {
    inwardDate: '05/10/2026',
    billNo: 'CP-1190',
    supplier: 'CAN DRUG LINES',
    supplierCode: 'T011',
    supplierCity: 'KANNUR',
    productName: 'CIPLOX 500 TAB',
    salt: 'Ciprofloxacin 500mg',
    company: 'Cipla Ltd',
    packSize: 10,
    batchNo: 'CP5084',
    expDate: '07/28',
    billedPacks: 35,
    freePacks: 3,
    totalUnits: 380,
    ptr: 29.40,
    mrp: 46.20,
    gstPercent: 12,
    rack: 'B1',
    stockStatus: 'In Stock',
    unitsRemaining: 290
  },
  {
    inwardDate: '01/10/2026',
    billNo: 'MD-7650',
    supplier: 'MALABAR DRUG DISTRIBUTORS',
    supplierCode: 'M004',
    supplierCity: 'CALICUT',
    productName: 'THYRONORM 50MCG TAB',
    salt: 'Thyroxine Sodium 50mcg',
    company: 'Abbott Healthcare',
    packSize: 120,
    batchNo: 'TH5091',
    expDate: '10/28',
    billedPacks: 20,
    freePacks: 1,
    totalUnits: 2520,
    ptr: 124.00,
    mrp: 178.00,
    gstPercent: 12,
    rack: 'C1',
    stockStatus: 'In Stock',
    unitsRemaining: 1800
  },
  {
    inwardDate: '28/09/2026',
    billNo: '020288',
    supplier: 'THE CAN DRUG HOUSE',
    supplierCode: 'T010',
    supplierCity: 'KANNUR',
    productName: 'ACILOC 150MG TAB',
    salt: 'Ranitidine 150mg',
    company: 'Cadila Pharmaceuticals',
    packSize: 30,
    batchNo: 'BN20481',
    expDate: '02/28',
    billedPacks: 50,
    freePacks: 5,
    totalUnits: 1650,
    ptr: 23.86,
    mrp: 38.00,
    gstPercent: 12,
    rack: 'C4',
    stockStatus: 'In Stock',
    unitsRemaining: 840
  },
  {
    inwardDate: '24/09/2026',
    billNo: 'SB-4310',
    supplier: 'SABARI AGENCIES',
    supplierCode: 'S076',
    supplierCity: 'KANNUR',
    productName: 'MONTEK LC TAB',
    salt: 'Montelukast 10mg + Levocetirizine 5mg',
    company: 'Sun Pharma',
    packSize: 10,
    batchNo: 'MNL302',
    expDate: '04/28',
    billedPacks: 30,
    freePacks: 3,
    totalUnits: 330,
    ptr: 135.00,
    mrp: 198.00,
    gstPercent: 12,
    rack: 'A3',
    stockStatus: 'In Stock',
    unitsRemaining: 190
  },
  {
    inwardDate: '18/09/2026',
    billNo: 'TH-8910',
    supplier: 'THALASSERY PHARMA AGENCIES',
    supplierCode: 'T011',
    supplierCity: 'THALASSERY',
    productName: 'DOLO 650 TAB',
    salt: 'Paracetamol 650mg Fast Release',
    company: 'Micro Labs Ltd',
    packSize: 15,
    batchNo: 'DL6510',
    expDate: '09/29',
    billedPacks: 80,
    freePacks: 8,
    totalUnits: 1320,
    ptr: 19.50,
    mrp: 31.00,
    gstPercent: 12,
    rack: 'A1',
    stockStatus: 'Fast Moving',
    unitsRemaining: 410
  },
  {
    inwardDate: '10/09/2026',
    billNo: 'MD-7512',
    supplier: 'MALABAR DRUG DISTRIBUTORS',
    supplierCode: 'M004',
    supplierCity: 'CALICUT',
    productName: 'SHELCAL 500 TAB',
    salt: 'Calcium Carbonate 500mg + Vitamin D3',
    company: 'Torrent Pharmaceuticals',
    packSize: 15,
    batchNo: 'SH5029',
    expDate: '01/29',
    billedPacks: 40,
    freePacks: 4,
    totalUnits: 660,
    ptr: 75.00,
    mrp: 128.50,
    gstPercent: 12,
    rack: 'D2',
    stockStatus: 'In Stock',
    unitsRemaining: 390
  },
  {
    inwardDate: '25/08/2026',
    billNo: '020114',
    supplier: 'THE CAN DRUG HOUSE',
    supplierCode: 'T010',
    supplierCity: 'KANNUR',
    productName: 'AEROCORT ROTACAPS 30,S',
    salt: 'Beclomethasone + Levosalbutamol',
    company: 'Cipla Ltd',
    packSize: 30,
    batchNo: 'SA12378',
    expDate: '12/27',
    billedPacks: 15,
    freePacks: 1,
    totalUnits: 480,
    ptr: 82.00,
    mrp: 103.96,
    gstPercent: 12,
    rack: '50',
    stockStatus: 'Near Expiry Alert',
    unitsRemaining: 60
  },
  {
    inwardDate: '15/08/2026',
    billNo: '019950',
    supplier: 'THE CAN DRUG HOUSE',
    supplierCode: 'T010',
    supplierCity: 'KANNUR',
    productName: 'ALERID 10MG TAB',
    salt: 'Cetirizine Hydrochloride 10mg',
    company: 'Cipla Ltd',
    packSize: 10,
    batchNo: 'J4000061',
    expDate: '06/27',
    billedPacks: 60,
    freePacks: 6,
    totalUnits: 660,
    ptr: 14.50,
    mrp: 23.50,
    gstPercent: 12,
    rack: 'B2',
    stockStatus: 'In Stock',
    unitsRemaining: 210
  }
];

// List of major pharmaceutical companies for the filter dropdown
const PHARMA_COMPANIES = [
  'All Manufacturers',
  'GSK (GlaxoSmithKline)',
  'Cipla Ltd',
  'Sun Pharma',
  'Abbott Healthcare',
  'Alkem Laboratories',
  'Alembic Pharmaceuticals',
  'Glenmark Pharmaceuticals',
  'Micro Labs Ltd',
  'Torrent Pharmaceuticals',
  'USV Ltd',
  'Cadila Pharmaceuticals',
  'Dr. Reddy\'s Laboratories',
  'Mankind Pharma',
  'Lupin Ltd'
];

export default function BatchEnquiryPage({
  theme,
  medicines = [],
  onBackToBilling
}) {
  const isDark = theme === 'dark';

  // Filters State
  const [timePeriodPreset, setTimePeriodPreset] = useState('all'); // 'all', 'today', '7days', '30days', 'current-month', '90days', 'custom'
  const [fromDate, setFromDate] = useState('01/09/2026');
  const [toDate, setToDate] = useState('16/10/2026');
  const [selectedCompany, setSelectedCompany] = useState('All Manufacturers');
  const [selectedSupplier, setSelectedSupplier] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [batchSearchQuery, setBatchSearchQuery] = useState('');

  // Selected Lot for Drill-Down Drawer / Modal
  const [selectedLotModal, setSelectedLotModal] = useState(null);

  // Helper date parsing (DD/MM/YYYY to Date object)
  const parseDateStr = (str) => {
    if (!str) return new Date(0);
    const parts = str.split('/');
    if (parts.length === 3) {
      return new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0]));
    }
    return new Date(0);
  };

  // Filtered Inward Lots List
  const filteredLots = useMemo(() => {
    const today = new Date(2026, 9, 16); // 16 Oct 2026 reference date

    return SEEDED_INWARD_LOTS.filter((lot) => {
      const lotDate = parseDateStr(lot.inwardDate);

      // 1. Time Period Filter
      if (timePeriodPreset === 'today') {
        if (lot.inwardDate !== '16/10/2026') return false;
      } else if (timePeriodPreset === '7days') {
        const diffDays = (today - lotDate) / (1000 * 60 * 60 * 24);
        if (diffDays < 0 || diffDays > 7) return false;
      } else if (timePeriodPreset === '30days') {
        const diffDays = (today - lotDate) / (1000 * 60 * 60 * 24);
        if (diffDays < 0 || diffDays > 30) return false;
      } else if (timePeriodPreset === 'current-month') {
        if (lotDate.getMonth() !== 9 || lotDate.getFullYear() !== 2026) return false;
      } else if (timePeriodPreset === '90days') {
        const diffDays = (today - lotDate) / (1000 * 60 * 60 * 24);
        if (diffDays < 0 || diffDays > 90) return false;
      } else if (timePeriodPreset === 'custom') {
        const from = parseDateStr(fromDate);
        const to = parseDateStr(toDate);
        if (lotDate < from || lotDate > to) return false;
      }

      // 2. Company / Manufacturer Filter
      if (selectedCompany !== 'All Manufacturers') {
        if (!lot.company.toLowerCase().includes(selectedCompany.toLowerCase())) return false;
      }

      // 3. Supplier / Distributor Filter
      if (selectedSupplier !== 'ALL') {
        if (lot.supplierCode !== selectedSupplier && !lot.supplier.toLowerCase().includes(selectedSupplier.toLowerCase())) {
          return false;
        }
      }

      // 4. Product Name / Salt Search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesName = lot.productName.toLowerCase().includes(q);
        const matchesSalt = (lot.salt || '').toLowerCase().includes(q);
        const matchesRack = (lot.rack || '').toLowerCase().includes(q);
        if (!matchesName && !matchesSalt && !matchesRack) return false;
      }

      // 5. Specific Batch Number Search
      if (batchSearchQuery.trim()) {
        const bq = batchSearchQuery.toUpperCase().trim();
        if (!lot.batchNo.toUpperCase().includes(bq)) return false;
      }

      return true;
    });
  }, [timePeriodPreset, fromDate, toDate, selectedCompany, selectedSupplier, searchQuery, batchSearchQuery]);

  // Aggregate Metrics
  const totalLots = filteredLots.length;
  const totalBilledPacks = filteredLots.reduce((acc, it) => acc + it.billedPacks, 0);
  const totalFreePacks = filteredLots.reduce((acc, it) => acc + it.freePacks, 0);
  const totalInwardUnits = filteredLots.reduce((acc, it) => acc + it.totalUnits, 0);
  const totalInwardValue = filteredLots.reduce((acc, it) => acc + (it.billedPacks * it.ptr), 0);
  const uniqueSuppliersCount = new Set(filteredLots.map(l => l.supplierCode)).size;

  // Handle Export CSV
  const handleExportCSV = () => {
    if (filteredLots.length === 0) {
      alert('No lots to export.');
      return;
    }
    const headers = ['Inward Date', 'Dist. Bill No', 'Supplier', 'City', 'Product Name', 'Salt Composition', 'Company', 'Batch No', 'Expiry', 'Billed Packs', 'Free Bonus', 'Total Units', 'PTR Cost', 'MRP', 'Rack', 'Status'];
    const rows = filteredLots.map(l => [
      `"${l.inwardDate}"`,
      `"${l.billNo}"`,
      `"${l.supplier}"`,
      `"${l.supplierCity}"`,
      `"${l.productName}"`,
      `"${l.salt}"`,
      `"${l.company}"`,
      `"${l.batchNo}"`,
      `"${l.expDate}"`,
      l.billedPacks,
      l.freePacks,
      l.totalUnits,
      l.ptr.toFixed(2),
      l.mrp.toFixed(2),
      `"${l.rack}"`,
      `"${l.stockStatus}"`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Batch_Inward_Enquiry_${fromDate.replace(/\//g, '-')}_to_${toDate.replace(/\//g, '-')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Handle Print Inward Register
  const handlePrintRegister = () => {
    window.print();
  };

  return (
    <div className={`flex-1 flex flex-col overflow-hidden font-sans select-none transition-colors ${
      isDark ? 'bg-zinc-950 text-zinc-100' : 'bg-white text-slate-950'
    }`}>
      {/* 1. Header Bar */}
      <div className={`px-4 py-2.5 border-b flex items-center justify-between no-print ${
        isDark ? 'bg-zinc-900 border-zinc-800' : 'bg-slate-100 border-slate-300'
      }`}>
        <div className="flex items-center space-x-3">
          <button
            onClick={onBackToBilling}
            className={`p-2 rounded-lg border font-bold transition flex items-center space-x-1.5 shadow-sm ${
              isDark ? 'border-zinc-700 bg-zinc-800 hover:bg-zinc-700 text-white' : 'border-slate-300 bg-white hover:bg-slate-100 text-slate-900'
            }`}
            title="Back to Sale Billing (Esc)"
          >
            <ArrowLeft className="w-4 h-4 text-sky-600" />
            <span className="text-xs font-mono font-bold">Billing (Esc)</span>
          </button>
          <div>
            <div className="flex items-center space-x-2">
              <h2 className={`text-base font-black ${isDark ? 'text-white' : 'text-slate-950'}`}>
                Batch Enquiry & Inward Lot Audit [ENQ004 / BATCH.DBF]
              </h2>
              <span className={`text-xs font-mono font-bold px-2 py-0.5 rounded border ${
                isDark ? 'bg-purple-950 text-purple-300 border-purple-800' : 'bg-purple-100 text-purple-950 border-purple-300'
              }`}>
                Track Batches: When, Where & Distributor Source
              </span>
            </div>
            <p className={`text-xs font-mono mt-0.5 font-semibold ${isDark ? 'text-zinc-400' : 'text-slate-600'}`}>
              Filter by specific time periods, drug manufacturer, or product name to trace distributor bills, batch arrivals, free schemes & stock balances
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={handleExportCSV}
            className={`py-1.5 px-3 rounded-lg border font-bold text-xs flex items-center space-x-1.5 transition shadow-sm ${
              isDark ? 'border-zinc-700 bg-zinc-800 hover:bg-zinc-700 text-zinc-200' : 'border-slate-300 bg-white hover:bg-slate-50 text-slate-800'
            }`}
          >
            <Download className="w-3.5 h-3.5 text-sky-600" />
            <span>Export CSV</span>
          </button>

          <button
            onClick={handlePrintRegister}
            className="py-1.5 px-3 bg-sky-600 hover:bg-sky-500 text-white rounded-lg font-bold text-xs flex items-center space-x-1.5 transition shadow cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print Register</span>
          </button>
        </div>
      </div>

      {/* 2. Interactive Multi-Dimensional Filter Bar */}
      <div className={`p-3 border-b text-xs font-mono space-y-2.5 no-print ${
        isDark ? 'bg-zinc-900/60 border-zinc-800' : 'bg-slate-50 border-slate-200'
      }`}>
        {/* Row 1: Time Period Presets & Date Inputs */}
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center space-x-1">
            <span className={`text-[10px] font-black uppercase tracking-wider mr-1.5 flex items-center space-x-1 ${
              isDark ? 'text-zinc-300' : 'text-slate-900'
            }`}>
              <Calendar className="w-3.5 h-3.5 text-sky-600" />
              <span>Time Period:</span>
            </span>

            {[
              { id: 'all', label: 'All Inwards' },
              { id: 'today', label: 'Today (16 Oct)' },
              { id: '7days', label: 'Last 7 Days' },
              { id: '30days', label: 'Last 30 Days' },
              { id: 'current-month', label: 'Oct 2026' },
              { id: '90days', label: 'Last 90 Days' },
              { id: 'custom', label: 'Custom Range' }
            ].map(preset => (
              <button
                key={preset.id}
                onClick={() => setTimePeriodPreset(preset.id)}
                className={`px-2.5 py-1 rounded text-xs font-bold transition border ${
                  timePeriodPreset === preset.id
                    ? 'bg-sky-600 text-white border-sky-600 shadow-sm'
                    : (isDark ? 'border-zinc-700 bg-zinc-800 hover:bg-zinc-700 text-zinc-300' : 'border-slate-300 bg-white hover:bg-slate-100 text-slate-800')
                }`}
              >
                {preset.label}
              </button>
            ))}
          </div>

          {/* Custom Date Range Pickers (active when custom selected) */}
          {timePeriodPreset === 'custom' && (
            <div className="flex items-center space-x-2">
              <div className="flex items-center space-x-1">
                <span className={`text-[10px] font-bold ${isDark ? 'text-zinc-400' : 'text-slate-600'}`}>From:</span>
                <input
                  type="text"
                  value={fromDate}
                  onChange={(e) => setFromDate(e.target.value)}
                  placeholder="DD/MM/YYYY"
                  className={`w-24 py-1 px-2 text-center rounded border font-bold text-xs ${
                    isDark ? 'bg-zinc-950 border-zinc-700 text-white' : 'bg-white border-slate-400 text-slate-950 shadow-sm'
                  }`}
                />
              </div>
              <div className="flex items-center space-x-1">
                <span className={`text-[10px] font-bold ${isDark ? 'text-zinc-400' : 'text-slate-600'}`}>To:</span>
                <input
                  type="text"
                  value={toDate}
                  onChange={(e) => setToDate(e.target.value)}
                  placeholder="DD/MM/YYYY"
                  className={`w-24 py-1 px-2 text-center rounded border font-bold text-xs ${
                    isDark ? 'bg-zinc-950 border-zinc-700 text-white' : 'bg-white border-slate-400 text-slate-950 shadow-sm'
                  }`}
                />
              </div>
            </div>
          )}
        </div>

        {/* Row 2: Company, Product Name, Specific Batch No, and Supplier Filters */}
        <div className="grid grid-cols-12 gap-2.5 pt-1">
          {/* Company / Manufacturer Dropdown */}
          <div className="col-span-3">
            <label className={`block text-[10px] font-black uppercase mb-1 flex items-center space-x-1 ${
              isDark ? 'text-zinc-300' : 'text-slate-900'
            }`}>
              <Building2 className="w-3 h-3 text-purple-600" />
              <span>Filter by Company / Brand</span>
            </label>
            <select
              value={selectedCompany}
              onChange={(e) => setSelectedCompany(e.target.value)}
              className={`w-full py-1.5 px-2.5 rounded border font-bold text-xs ${
                isDark ? 'bg-zinc-950 border-zinc-700 text-white' : 'bg-white border-slate-400 text-slate-950 shadow-sm'
              }`}
            >
              {PHARMA_COMPANIES.map((comp, idx) => (
                <option key={idx} value={comp}>{comp}</option>
              ))}
            </select>
          </div>

          {/* Product Name or Salt Search */}
          <div className="col-span-4 relative">
            <label className={`block text-[10px] font-black uppercase mb-1 flex items-center space-x-1 ${
              isDark ? 'text-zinc-300' : 'text-slate-900'
            }`}>
              <Search className="w-3 h-3 text-sky-600" />
              <span>Product Name / Salt Composition</span>
            </label>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search e.g. Augmentin, Calpol, Paracetamol..."
              className={`w-full py-1.5 pl-3 pr-8 rounded border font-black text-xs font-sans ${
                isDark ? 'bg-zinc-950 border-zinc-700 text-white placeholder-zinc-500' : 'bg-white border-slate-400 text-slate-950 placeholder-slate-400 shadow-sm'
              }`}
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-6 text-slate-400 hover:text-slate-600"
              >
                ✕
              </button>
            )}
          </div>

          {/* Batch Number Search */}
          <div className="col-span-2">
            <label className={`block text-[10px] font-black uppercase mb-1 flex items-center space-x-1 ${
              isDark ? 'text-zinc-300' : 'text-slate-900'
            }`}>
              <Hash className="w-3 h-3 text-emerald-600" />
              <span>Specific Batch No</span>
            </label>
            <input
              type="text"
              value={batchSearchQuery}
              onChange={(e) => setBatchSearchQuery(e.target.value.toUpperCase())}
              placeholder="e.g. AG8921"
              className={`w-full py-1.5 px-2.5 rounded border font-black text-xs font-mono uppercase ${
                isDark ? 'bg-zinc-950 border-zinc-700 text-emerald-400 placeholder-zinc-500' : 'bg-white border-slate-400 text-emerald-900 placeholder-slate-400 shadow-sm'
              }`}
            />
          </div>

          {/* Supplier / Distributor Filter */}
          <div className="col-span-3">
            <label className={`block text-[10px] font-black uppercase mb-1 flex items-center space-x-1 ${
              isDark ? 'text-zinc-300' : 'text-slate-900'
            }`}>
              <Truck className="w-3 h-3 text-sky-600" />
              <span>From Supplier Agency</span>
            </label>
            <select
              value={selectedSupplier}
              onChange={(e) => setSelectedSupplier(e.target.value)}
              className={`w-full py-1.5 px-2.5 rounded border font-bold text-xs ${
                isDark ? 'bg-zinc-950 border-zinc-700 text-white' : 'bg-white border-slate-400 text-slate-950 shadow-sm'
              }`}
            >
              <option value="ALL">All Distributor Agencies ({supplierList.length})</option>
              {supplierList.slice(0, 30).map((s, idx) => (
                <option key={idx} value={s.code}>
                  {s.code} - {s.name} ({s.address || 'KANNUR'})
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* 3. Summary Metrics Bar */}
      <div className={`px-4 py-2 border-b flex items-center justify-between font-mono text-xs no-print ${
        isDark ? 'bg-zinc-900 border-zinc-800 text-zinc-300' : 'bg-slate-100 border-slate-300 text-slate-800'
      }`}>
        <div className="flex items-center space-x-5">
          <div className="flex items-center space-x-1.5">
            <span className={`text-[10px] uppercase font-bold ${isDark ? 'text-zinc-400' : 'text-slate-600'}`}>Batches Found:</span>
            <span className={`font-black px-2 py-0.5 rounded text-xs ${
              isDark ? 'bg-sky-950 text-sky-300 border border-sky-800' : 'bg-sky-100 text-sky-950 border border-sky-300'
            }`}>
              {totalLots} Inward Lots
            </span>
          </div>

          <div className="flex items-center space-x-1.5">
            <span className={`text-[10px] uppercase font-bold ${isDark ? 'text-zinc-400' : 'text-slate-600'}`}>Billed Packs:</span>
            <span className={`font-black ${isDark ? 'text-white' : 'text-slate-950'}`}>
              {totalBilledPacks} Strips
            </span>
          </div>

          <div className="flex items-center space-x-1.5">
            <span className={`text-[10px] uppercase font-bold ${isDark ? 'text-zinc-400' : 'text-slate-600'}`}>Free Schemes (10+1):</span>
            <span className={`font-black px-1.5 py-0.5 rounded text-xs ${
              isDark ? 'bg-emerald-950 text-emerald-300 border border-emerald-800' : 'bg-emerald-100 text-emerald-950 border border-emerald-300'
            }`}>
              +{totalFreePacks} Bonus
            </span>
          </div>

          <div className="flex items-center space-x-1.5">
            <span className={`text-[10px] uppercase font-bold ${isDark ? 'text-zinc-400' : 'text-slate-600'}`}>Total Inward Units:</span>
            <span className={`font-black px-1.5 py-0.5 rounded text-xs ${
              isDark ? 'bg-purple-950 text-purple-300 border border-purple-800' : 'bg-purple-100 text-purple-950 border border-purple-300'
            }`}>
              {totalInwardUnits.toLocaleString()} Tablets
            </span>
          </div>
        </div>

        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-1.5">
            <span className={`text-[10px] uppercase font-bold ${isDark ? 'text-zinc-400' : 'text-slate-600'}`}>Active Suppliers:</span>
            <span className={`font-black ${isDark ? 'text-zinc-200' : 'text-slate-900'}`}>{uniqueSuppliersCount} Agencies</span>
          </div>

          <div className="flex items-center space-x-1.5">
            <span className={`text-[10px] uppercase font-bold ${isDark ? 'text-zinc-400' : 'text-slate-600'}`}>Inward Cost (PTR):</span>
            <span className={`font-black text-sm ${isDark ? 'text-emerald-400' : 'text-emerald-700'}`}>
              ₹{totalInwardValue.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>
        </div>
      </div>

      {/* 4. High-Density Inward Lot Audit Table */}
      <div className="flex-1 overflow-y-auto">
        <table className={`w-full text-left border-collapse text-xs font-mono border ${
          isDark ? 'border-zinc-800' : 'border-slate-300'
        }`}>
          <thead className="sticky top-0 z-10">
            <tr className={`border-b text-[11px] uppercase tracking-wider font-extrabold ${
              isDark ? 'bg-zinc-900 border-zinc-800 text-zinc-100' : 'bg-slate-200 border-slate-300 text-slate-950'
            }`}>
              <th className="py-2.5 px-3 w-10 text-center border-r border-inherit">Sr</th>
              <th className="py-2.5 px-3 w-24 text-center border-r border-inherit">When (Inward)</th>
              <th className="py-2.5 px-3 w-24 text-center border-r border-inherit">Dist. Bill</th>
              <th className="py-2.5 px-3 w-44 border-r border-inherit">Where From (Distributor)</th>
              <th className="py-2.5 px-3 border-r border-inherit">Product Description & Salt</th>
              <th className="py-2.5 px-3 w-36 border-r border-inherit">Company / Brand</th>
              <th className="py-2.5 px-3 w-28 text-center border-r border-inherit font-black">Batch No</th>
              <th className="py-2.5 px-3 w-24 text-center border-r border-inherit">Expiry</th>
              <th className={`py-2.5 px-3 w-20 text-center border-r border-inherit font-black ${
                isDark ? 'text-sky-300 bg-sky-950/60' : 'text-sky-950 bg-sky-100'
              }`}>Billed</th>
              <th className={`py-2.5 px-3 w-20 text-center border-r border-inherit font-black ${
                isDark ? 'text-emerald-300 bg-emerald-950/60' : 'text-emerald-950 bg-emerald-100'
              }`}>Free</th>
              <th className="py-2.5 px-3 w-24 text-center border-r border-inherit">Total Units</th>
              <th className="py-2.5 px-3 w-20 text-right border-r border-inherit">P.T.R. (₹)</th>
              <th className="py-2.5 px-3 w-20 text-right border-r border-inherit">M.R.P. (₹)</th>
              <th className="py-2.5 px-3 w-16 text-center border-r border-inherit">Rack</th>
              <th className="py-2.5 px-3 w-24 text-center">Stock Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-inherit">
            {filteredLots.length === 0 ? (
              <tr>
                <td colSpan={15} className="py-16 text-center text-slate-400 font-sans">
                  <Layers className="w-10 h-10 mx-auto mb-2 opacity-40 text-slate-500" />
                  <div className={`font-bold text-base ${isDark ? 'text-zinc-300' : 'text-slate-800'}`}>
                    No inward batches found for this criteria
                  </div>
                  <div className="text-xs font-mono text-slate-500 mt-1">
                    Try switching Time Period to "All Inwards" or clear your company/search filters above
                  </div>
                </td>
              </tr>
            ) : (
              filteredLots.map((lot, idx) => (
                <tr 
                  key={idx}
                  onClick={() => setSelectedLotModal(lot)}
                  className={`transition-colors border-b cursor-pointer ${
                    isDark 
                      ? 'hover:bg-zinc-900 border-zinc-800' 
                      : 'hover:bg-sky-50/70 border-slate-300'
                  }`}
                  title="Click to view full batch history & distributor invoice breakdown"
                >
                  <td className={`py-2 px-3 text-center font-bold border-r border-inherit ${
                    isDark ? 'text-zinc-400' : 'text-slate-600'
                  }`}>
                    {idx + 1}
                  </td>

                  <td className={`py-2 px-3 text-center font-bold border-r border-inherit ${
                    isDark ? 'text-zinc-300' : 'text-slate-900'
                  }`}>
                    {lot.inwardDate}
                  </td>

                  <td className={`py-2 px-3 text-center font-mono font-bold border-r border-inherit ${
                    isDark ? 'text-sky-400' : 'text-sky-800'
                  }`}>
                    #{lot.billNo}
                  </td>

                  <td className="py-2 px-3 font-sans border-r border-inherit">
                    <div className={`font-bold text-xs ${isDark ? 'text-white' : 'text-slate-900'}`}>
                      {lot.supplier}
                    </div>
                    <div className="text-[10px] opacity-70 font-mono text-slate-500">
                      {lot.supplierCity} • Code {lot.supplierCode}
                    </div>
                  </td>

                  <td className="py-2 px-3 font-sans border-r border-inherit">
                    <div className={`font-black text-xs ${isDark ? 'text-white' : 'text-slate-950'}`}>
                      {lot.productName}
                    </div>
                    <div className="text-[10px] text-slate-500 font-mono">
                      {lot.salt}
                    </div>
                  </td>

                  <td className={`py-2 px-3 text-xs font-semibold border-r border-inherit ${
                    isDark ? 'text-purple-300' : 'text-purple-900'
                  }`}>
                    {lot.company}
                  </td>

                  <td className={`py-2 px-3 text-center font-black border-r border-inherit font-mono ${
                    isDark ? 'text-amber-400' : 'text-amber-700'
                  }`}>
                    {lot.batchNo}
                  </td>

                  <td className="py-2 px-3 text-center font-bold border-r border-inherit">
                    <span className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-black ${
                      lot.expDate.includes('/27') 
                        ? (isDark ? 'bg-amber-950 text-amber-300 border border-amber-800' : 'bg-amber-100 text-amber-950 border border-amber-300')
                        : (isDark ? 'bg-zinc-800 text-zinc-300' : 'bg-slate-200 text-slate-800')
                    }`}>
                      {lot.expDate}
                    </span>
                  </td>

                  <td className={`py-2 px-3 text-center font-black border-r border-inherit ${
                    isDark ? 'text-sky-300 bg-sky-950/30' : 'text-sky-950 bg-sky-50'
                  }`}>
                    {lot.billedPacks}
                  </td>

                  <td className={`py-2 px-3 text-center font-black border-r border-inherit ${
                    isDark ? 'bg-emerald-950/20' : 'bg-emerald-50/60'
                  }`}>
                    {lot.freePacks > 0 ? (
                      <span className={`font-bold ${isDark ? 'text-emerald-400' : 'text-emerald-700'}`}>
                        +{lot.freePacks}
                      </span>
                    ) : (
                      <span className="text-slate-400">-</span>
                    )}
                  </td>

                  <td className={`py-2 px-3 text-center font-bold border-r border-inherit ${
                    isDark ? 'text-zinc-200' : 'text-slate-900'
                  }`}>
                    {lot.totalUnits}
                  </td>

                  <td className={`py-2 px-3 text-right font-black border-r border-inherit ${
                    isDark ? 'text-white' : 'text-slate-950'
                  }`}>
                    ₹{lot.ptr.toFixed(2)}
                  </td>

                  <td className={`py-2 px-3 text-right font-black border-r border-inherit ${
                    isDark ? 'text-zinc-300' : 'text-slate-800'
                  }`}>
                    ₹{lot.mrp.toFixed(2)}
                  </td>

                  <td className={`py-2 px-3 text-center font-black border-r border-inherit font-mono ${
                    isDark ? 'text-amber-400' : 'text-amber-800'
                  }`}>
                    {lot.rack}
                  </td>

                  <td className="py-2 px-3 text-center">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      lot.stockStatus === 'Fast Moving'
                        ? (isDark ? 'bg-sky-950 text-sky-300 border border-sky-800' : 'bg-sky-100 text-sky-900 border border-sky-300')
                        : lot.stockStatus === 'Near Expiry Alert'
                        ? (isDark ? 'bg-rose-950 text-rose-300 border border-rose-800' : 'bg-rose-100 text-rose-900 border border-rose-300')
                        : (isDark ? 'bg-emerald-950 text-emerald-300 border border-emerald-800' : 'bg-emerald-100 text-emerald-900 border border-emerald-300')
                    }`}>
                      {lot.stockStatus}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* 5. Drill-Down Lot Detail Modal */}
      {selectedLotModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className={`w-full max-w-xl rounded-2xl border shadow-2xl overflow-hidden font-mono ${
            isDark ? 'bg-zinc-900 border-zinc-700 text-white' : 'bg-white border-slate-300 text-slate-950'
          }`}>
            <div className={`p-4 border-b flex items-center justify-between ${
              isDark ? 'bg-zinc-950 border-zinc-800' : 'bg-slate-100 border-slate-200'
            }`}>
              <div className="flex items-center space-x-2">
                <Hash className="w-4 h-4 text-sky-500" />
                <h3 className="font-black text-sm">Batch Inward Passport: {selectedLotModal.batchNo}</h3>
              </div>
              <button
                onClick={() => setSelectedLotModal(null)}
                className={`p-1 rounded text-slate-500 ${isDark ? 'hover:bg-zinc-800' : 'hover:bg-slate-200'}`}
              >
                ✕
              </button>
            </div>

            <div className="p-5 space-y-4 text-xs">
              <div>
                <div className="text-[10px] text-slate-500 uppercase font-bold">Product Description</div>
                <div className="text-base font-black font-sans">{selectedLotModal.productName}</div>
                <div className="text-slate-500 font-mono text-[11px] mt-0.5">{selectedLotModal.salt}</div>
                <div className={`font-bold mt-0.5 ${isDark ? 'text-purple-300' : 'text-purple-700'}`}>Manufactured by: {selectedLotModal.company}</div>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-2 border-t border-inherit">
                <div className={`p-3 rounded-lg border ${isDark ? 'bg-zinc-950 border-zinc-800' : 'bg-slate-50 border-slate-200'}`}>
                  <div className="text-[10px] text-slate-500 uppercase font-bold">Distributor Invoice</div>
                  <div className="font-black text-sm text-sky-600 mt-1">Bill #{selectedLotModal.billNo}</div>
                  <div className="font-bold text-xs mt-0.5">{selectedLotModal.supplier}</div>
                  <div className="text-[10px] text-slate-400">Arrived: {selectedLotModal.inwardDate} ({selectedLotModal.supplierCity})</div>
                </div>

                <div className={`p-3 rounded-lg border ${isDark ? 'bg-zinc-950 border-zinc-800' : 'bg-slate-50 border-slate-200'}`}>
                  <div className="text-[10px] text-slate-500 uppercase font-bold">Lot Shelf Life & Rack</div>
                  <div className="font-black text-sm text-amber-500 mt-1">Expires: {selectedLotModal.expDate}</div>
                  <div className="font-bold text-xs mt-0.5">Physical Rack: {selectedLotModal.rack}</div>
                  <div className="text-[10px] text-emerald-600 font-bold">Status: {selectedLotModal.stockStatus}</div>
                </div>
              </div>

              <div className="grid grid-cols-4 gap-2 pt-2 border-t border-inherit text-center">
                <div className={`p-2 rounded border ${isDark ? 'bg-zinc-950' : 'bg-slate-50'}`}>
                  <div className="text-[10px] text-slate-500 uppercase">Billed Packs</div>
                  <div className="font-black text-sm text-sky-600">{selectedLotModal.billedPacks}</div>
                </div>
                <div className={`p-2 rounded border ${isDark ? 'bg-zinc-950' : 'bg-slate-50'}`}>
                  <div className="text-[10px] text-slate-500 uppercase">Free Scheme</div>
                  <div className="font-black text-sm text-emerald-600">+{selectedLotModal.freePacks}</div>
                </div>
                <div className={`p-2 rounded border ${isDark ? 'bg-zinc-950' : 'bg-slate-50'}`}>
                  <div className="text-[10px] text-slate-500 uppercase">PTR Cost</div>
                  <div className="font-black text-sm">₹{selectedLotModal.ptr.toFixed(2)}</div>
                </div>
                <div className={`p-2 rounded border ${isDark ? 'bg-zinc-950' : 'bg-slate-50'}`}>
                  <div className="text-[10px] text-slate-500 uppercase">Retail M.R.P.</div>
                  <div className="font-black text-sm">₹{selectedLotModal.mrp.toFixed(2)}</div>
                </div>
              </div>
            </div>

            <div className={`p-3 border-t flex justify-end ${
              isDark ? 'bg-zinc-950 border-zinc-800' : 'bg-slate-50 border-slate-200'
            }`}>
              <button
                onClick={() => setSelectedLotModal(null)}
                className="py-1.5 px-4 bg-sky-600 hover:bg-sky-500 text-white rounded-lg text-xs font-bold transition"
              >
                Close (Esc)
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
