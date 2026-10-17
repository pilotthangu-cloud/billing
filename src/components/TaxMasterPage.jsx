import React, { useState } from 'react';
import { 
  ArrowLeft, 
  Search, 
  Percent, 
  BookOpen, 
  ShieldCheck, 
  Printer, 
  Download, 
  Filter, 
  Plus, 
  Check, 
  Edit3, 
  Hash, 
  HelpCircle,
  FileText,
  Clock,
  Save,
  X,
  RefreshCw,
  AlertCircle,
  Layers
} from 'lucide-react';
import initialTaxData from '../data/taxes.json';

export default function TaxMasterPage({ theme, medicines, onBackToBilling, onUpdateMedicine }) {
  const isDark = theme === 'dark';
  const [activeTab, setActiveTab] = useState('slabs'); // 'slabs', 'hsn', 'items', 'kvats'
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedHsn, setSelectedHsn] = useState('ALL');
  const [selectedSlab, setSelectedSlab] = useState('ALL');

  // Editable Tax Slabs state (Loaded from statutory JSON with localStorage persistence)
  const [gstSlabs, setGstSlabs] = useState(() => {
    try {
      const saved = localStorage.getItem('beta_pharma_tax_slabs');
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return initialTaxData.gstSlabs;
  });
  const [editingSlab, setEditingSlab] = useState(null);
  const [isNewSlabModalOpen, setIsNewSlabModalOpen] = useState(false);
  const [slabFormData, setSlabFormData] = useState({
    code: '',
    name: '',
    rate: 12,
    cgst: 6,
    sgst: 6,
    igst: 12,
    category: '',
    description: '',
    activeItemsCount: 0
  });

  // Item-level Tax Edit Modal
  const [editingItemTax, setEditingItemTax] = useState(null);
  const [itemTaxFormData, setItemTaxFormData] = useState({
    code: '',
    name: '',
    hsn: '3004',
    gstPercent: 12,
    mrp: 100
  });

  // Bulk Tax Update Modal
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
  const [bulkTargetHsn, setBulkTargetHsn] = useState('3004');
  const [bulkNewGst, setBulkNewGst] = useState(12);

  const [toastMessage, setToastMessage] = useState('');

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 3500);
  };

  // Filter medicines for live item tax audit
  const q = searchQuery.trim().toLowerCase();
  const sampleMedicines = (medicines || []).slice(0, 500);
  const filteredItems = sampleMedicines.filter(m => {
    const matchName = m.name.toLowerCase().includes(q) || (m.generic && m.generic.toLowerCase().includes(q));
    const matchHsn = selectedHsn === 'ALL' || (m.hsn && m.hsn.includes(selectedHsn));
    const currentGst = m.gstPercent !== undefined ? m.gstPercent : 12;
    const matchSlab = selectedSlab === 'ALL' || String(currentGst) === selectedSlab;
    return matchName && matchHsn && matchSlab;
  }).slice(0, 60);

  // Open Edit Slab Modal
  const handleOpenEditSlab = (slab) => {
    setEditingSlab(slab);
    setSlabFormData({ ...slab });
  };

  // Save Slab Changes
  const handleSaveSlab = (e) => {
    e.preventDefault();
    const rate = parseFloat(slabFormData.rate) || 0;
    const updatedSlab = {
      ...slabFormData,
      rate,
      cgst: +(rate / 2).toFixed(2),
      sgst: +(rate / 2).toFixed(2),
      igst: rate
    };

    const updatedList = gstSlabs.map(s => s.code === updatedSlab.code ? updatedSlab : s);
    setGstSlabs(updatedList);
    try {
      localStorage.setItem('beta_pharma_tax_slabs', JSON.stringify(updatedList));
    } catch (err) {}
    showToast(`GST Tax Slab "${updatedSlab.code}" updated to ${rate}% successfully!`);
    setEditingSlab(null);
  };

  // Add New Tax / Cess Slab
  const handleCreateNewSlab = (e) => {
    e.preventDefault();
    if (!slabFormData.code || !slabFormData.name) {
      alert('Code and Name are required');
      return;
    }
    const rate = parseFloat(slabFormData.rate) || 0;
    const newSlab = {
      ...slabFormData,
      code: slabFormData.code.toUpperCase().trim(),
      rate,
      cgst: +(rate / 2).toFixed(2),
      sgst: +(rate / 2).toFixed(2),
      igst: rate,
      activeItemsCount: 0
    };

    const updatedList = [...gstSlabs, newSlab];
    setGstSlabs(updatedList);
    try {
      localStorage.setItem('beta_pharma_tax_slabs', JSON.stringify(updatedList));
    } catch (err) {}
    showToast(`New Tax Slab "${newSlab.code}" (${rate}%) created successfully!`);
    setIsNewSlabModalOpen(false);
  };

  // Open Item Tax Edit
  const handleOpenItemTaxEdit = (item) => {
    setEditingItemTax(item);
    setItemTaxFormData({
      code: item.code,
      name: item.name,
      hsn: item.hsn || '3004',
      gstPercent: item.gstPercent !== undefined ? item.gstPercent : 12,
      mrp: item.mrp || 100
    });
  };

  // Save Item Tax
  const handleSaveItemTax = (e) => {
    e.preventDefault();
    if (!editingItemTax) return;

    const newGst = parseFloat(itemTaxFormData.gstPercent);
    const updated = {
      ...editingItemTax,
      hsn: itemTaxFormData.hsn.trim(),
      gstPercent: isNaN(newGst) ? 12 : newGst
    };

    if (onUpdateMedicine) {
      onUpdateMedicine(updated);
    }

    showToast(`Updated "${updated.name}" — Tax: ${updated.gstPercent}% GST, HSN: ${updated.hsn}`);
    setEditingItemTax(null);
  };

  // Execute Bulk Tax Update
  const handleExecuteBulkUpdate = (e) => {
    e.preventDefault();
    if (!onUpdateMedicine) return;

    let count = 0;
    (medicines || []).forEach(m => {
      if ((m.hsn || '').includes(bulkTargetHsn)) {
        onUpdateMedicine({
          ...m,
          gstPercent: parseFloat(bulkNewGst)
        });
        count++;
      }
    });

    showToast(`Bulk Updated ${count} products with HSN ${bulkTargetHsn} to ${bulkNewGst}% GST!`);
    setIsBulkModalOpen(false);
  };

  // Calculations for current editing item modal
  const itemMrp = parseFloat(itemTaxFormData.mrp) || 0;
  const itemGst = parseFloat(itemTaxFormData.gstPercent) || 0;
  const itemTaxable = itemMrp > 0 ? +(itemMrp / (1 + itemGst / 100)).toFixed(2) : 0;
  const itemTotalGst = +(itemMrp - itemTaxable).toFixed(2);
  const itemCgst = +(itemTotalGst / 2).toFixed(2);
  const itemSgst = itemCgst;

  return (
    <div className={`flex-1 flex flex-col overflow-hidden font-sans transition-colors ${
      isDark ? 'bg-zinc-950 text-zinc-100' : 'bg-white text-slate-950'
    }`}>
      {/* Toast Notification */}
      {toastMessage && (
        <div className="absolute top-16 right-6 z-50 bg-emerald-600 text-white px-4 py-2.5 rounded-lg shadow-xl font-mono font-bold text-xs flex items-center space-x-2 animate-bounce">
          <Check className="w-4 h-4" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Top Header */}
      <div className={`px-4 py-3 border-b flex items-center justify-between ${
        isDark ? 'bg-zinc-900 border-zinc-800' : 'bg-slate-100 border-slate-300'
      }`}>
        <div className="flex items-center space-x-3">
          <button
            onClick={onBackToBilling}
            className={`p-2 rounded-lg border font-bold transition flex items-center space-x-1 ${
              isDark 
                ? 'border-zinc-700 bg-zinc-800 hover:bg-zinc-700 text-white' 
                : 'border-slate-300 bg-white hover:bg-slate-100 text-slate-900 shadow-sm'
            }`}
            title="Back to Sale Billing (Esc)"
          >
            <ArrowLeft className="w-4 h-4 text-sky-600" />
            <span className="text-xs font-mono font-bold">Billing (Esc)</span>
          </button>
          <div>
            <div className="flex items-center space-x-2">
              <h2 className={`text-base font-black ${isDark ? 'text-white' : 'text-slate-950'}`}>
                Tax Master & GST HSN Schedule [MAS010 / TAX.DBF]
              </h2>
              <span className={`text-xs font-mono font-black px-2 py-0.5 rounded border ${
                isDark 
                  ? 'bg-emerald-950 text-emerald-300 border-emerald-800' 
                  : 'bg-emerald-100 text-emerald-950 border-emerald-300'
              }`}>
                Statutory GST & HSN
              </span>
            </div>
            <p className={`text-xs font-mono mt-0.5 font-semibold ${
              isDark ? 'text-zinc-400' : 'text-slate-600'
            }`}>
              Full in-place editing of CGST/SGST/IGST tax rates, product-level GST assignment, and Chapter 30 HSN directory
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2 font-mono text-xs">
          <button
            onClick={() => {
              setSlabFormData({
                code: '',
                name: '',
                rate: 5,
                cgst: 2.5,
                sgst: 2.5,
                igst: 5,
                category: 'Custom Tax / Cess',
                description: '',
                activeItemsCount: 0
              });
              setIsNewSlabModalOpen(true);
            }}
            className="py-1.5 px-3 rounded-lg font-bold flex items-center space-x-1.5 transition bg-sky-600 hover:bg-sky-500 text-white shadow"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>+ Add Tax Slab</span>
          </button>

          <button
            onClick={() => setIsBulkModalOpen(true)}
            className={`py-1.5 px-3 rounded-lg border font-bold flex items-center space-x-1.5 transition ${
              isDark ? 'border-zinc-700 bg-zinc-800 hover:bg-zinc-700 text-indigo-300' : 'border-indigo-300 bg-indigo-50 hover:bg-indigo-100 text-indigo-900 shadow-sm'
            }`}
          >
            <Layers className="w-3.5 h-3.5 text-indigo-600" />
            <span>Bulk Tax Reassign</span>
          </button>

          <button
            onClick={() => window.print()}
            className={`py-1.5 px-3 rounded-lg border font-bold flex items-center space-x-1.5 transition ${
              isDark ? 'border-zinc-700 bg-zinc-800 hover:bg-zinc-700 text-zinc-200' : 'border-slate-300 bg-white hover:bg-slate-50 text-slate-800 shadow-sm'
            }`}
          >
            <Printer className="w-3.5 h-3.5 text-sky-600" />
            <span>Print</span>
          </button>
        </div>
      </div>

      {/* Summary KPI Strip */}
      <div className={`grid grid-cols-4 gap-4 p-4 border-b text-xs font-mono ${
        isDark ? 'bg-zinc-900/40 border-zinc-800' : 'bg-slate-50 border-slate-200'
      }`}>
        <div className={`p-3 rounded-lg border ${isDark ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-slate-300 shadow-xs'}`}>
          <div className="flex items-center justify-between mb-1">
            <span className={`text-[10px] font-bold uppercase ${isDark ? 'text-zinc-400' : 'text-slate-500'}`}>Standard Pharma Slab</span>
            <Percent className="w-4 h-4 text-emerald-600" />
          </div>
          <p className="text-xl font-black text-emerald-600">GST 12%</p>
          <span className="text-[10px] font-semibold text-slate-500">CGST 6% + SGST 6% (~85% of Store)</span>
        </div>

        <div className={`p-3 rounded-lg border ${isDark ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-slate-300 shadow-xs'}`}>
          <div className="flex items-center justify-between mb-1">
            <span className={`text-[10px] font-bold uppercase ${isDark ? 'text-zinc-400' : 'text-slate-500'}`}>Concessional Slab</span>
            <ShieldCheck className="w-4 h-4 text-sky-600" />
          </div>
          <p className="text-xl font-black text-sky-600">GST 5%</p>
          <span className="text-[10px] font-semibold text-slate-500">Insulin, critical vaccines, test kits</span>
        </div>

        <div className={`p-3 rounded-lg border ${isDark ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-slate-300 shadow-xs'}`}>
          <div className="flex items-center justify-between mb-1">
            <span className={`text-[10px] font-bold uppercase ${isDark ? 'text-zinc-400' : 'text-slate-500'}`}>HSN Chapters</span>
            <BookOpen className="w-4 h-4 text-amber-600" />
          </div>
          <p className="text-xl font-black text-amber-600">8 Active HSNs</p>
          <span className="text-[10px] font-semibold text-slate-500">Primary: HSN 3004 (Medicaments)</span>
        </div>

        <div className={`p-3 rounded-lg border ${isDark ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-slate-300 shadow-xs'}`}>
          <div className="flex items-center justify-between mb-1">
            <span className={`text-[10px] font-bold uppercase ${isDark ? 'text-zinc-400' : 'text-slate-500'}`}>Active Slabs</span>
            <Clock className="w-4 h-4 text-purple-600" />
          </div>
          <p className="text-xl font-black text-purple-600">{gstSlabs.length} Tax Slabs</p>
          <span className="text-[10px] font-semibold text-slate-500">Editable Statutory Structure</span>
        </div>
      </div>

      {/* Tabs */}
      <div className={`px-4 pt-2 border-b flex items-center space-x-2 font-mono text-xs ${
        isDark ? 'bg-zinc-900/60 border-zinc-800' : 'bg-slate-100 border-slate-300'
      }`}>
        <button
          onClick={() => setActiveTab('slabs')}
          className={`py-2 px-3 font-bold border-b-2 transition ${
            activeTab === 'slabs'
              ? 'border-sky-500 text-sky-600'
              : (isDark ? 'border-transparent text-zinc-400 hover:text-white' : 'border-transparent text-slate-500 hover:text-slate-900')
          }`}
        >
          1. GST Tax Slabs (Editable Rates)
        </button>
        <button
          onClick={() => setActiveTab('items')}
          className={`py-2 px-3 font-bold border-b-2 transition ${
            activeTab === 'items'
              ? 'border-sky-500 text-sky-600'
              : (isDark ? 'border-transparent text-zinc-400 hover:text-white' : 'border-transparent text-slate-500 hover:text-slate-900')
          }`}
        >
          2. Live Product Tax & HSN Audit [Edit Tax]
        </button>
        <button
          onClick={() => setActiveTab('hsn')}
          className={`py-2 px-3 font-bold border-b-2 transition ${
            activeTab === 'hsn'
              ? 'border-sky-500 text-sky-600'
              : (isDark ? 'border-transparent text-zinc-400 hover:text-white' : 'border-transparent text-slate-500 hover:text-slate-900')
          }`}
        >
          3. HSN Code Directory (Chapter 30)
        </button>
        <button
          onClick={() => setActiveTab('kvats')}
          className={`py-2 px-3 font-bold border-b-2 transition ${
            activeTab === 'kvats'
              ? 'border-sky-500 text-sky-600'
              : (isDark ? 'border-transparent text-zinc-400 hover:text-white' : 'border-transparent text-slate-500 hover:text-slate-900')
          }`}
        >
          4. Legacy TAX.DBF (Clipper KVATS)
        </button>
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {/* TAB 1: GST TAX SLABS (EDITABLE) */}
        {activeTab === 'slabs' && (
          <div className="space-y-4">
            <div className={`p-3 rounded-lg border text-xs font-mono flex items-center justify-between ${
              isDark ? 'bg-zinc-900 border-zinc-800' : 'bg-slate-50 border-slate-200'
            }`}>
              <div>
                <p className={`font-black text-sm ${isDark ? 'text-white' : 'text-slate-950'}`}>
                  Statutory GST Tax Structure for Retail Pharmacies in India
                </p>
                <p className={`mt-0.5 ${isDark ? 'text-zinc-400' : 'text-slate-600'}`}>
                  Click the Edit icon on any slab to adjust statutory rates, CGST/SGST split, or add new local cess.
                </p>
              </div>
              <span className="px-2.5 py-1 rounded bg-emerald-100 text-emerald-900 font-bold text-[11px] border border-emerald-300">
                Active Tax Engine: GSTIN Compliant
              </span>
            </div>

            <div className={`border rounded-lg overflow-hidden ${isDark ? 'border-zinc-800' : 'border-slate-300'}`}>
              <table className="w-full text-left border-collapse text-xs font-mono">
                <thead>
                  <tr className={`border-b text-[11px] uppercase tracking-wider font-extrabold ${
                    isDark ? 'bg-zinc-900 border-zinc-800 text-zinc-100' : 'bg-slate-200 border-slate-300 text-slate-950'
                  }`}>
                    <th className="py-2.5 px-3 w-16 text-center border-r border-inherit">Code</th>
                    <th className="py-2.5 px-3 border-r border-inherit">Tax Slab Name</th>
                    <th className="py-2.5 px-3 text-center border-r border-inherit w-24">GST Rate</th>
                    <th className="py-2.5 px-3 text-center border-r border-inherit w-20">CGST</th>
                    <th className="py-2.5 px-3 text-center border-r border-inherit w-20">SGST</th>
                    <th className="py-2.5 px-3 text-center border-r border-inherit w-20">IGST</th>
                    <th className="py-2.5 px-3 border-r border-inherit">Pharmaceutical Scope / Description</th>
                    <th className="py-2.5 px-3 text-center w-24 border-r border-inherit">Est. Items</th>
                    <th className="py-2.5 px-3 text-center w-16">Edit</th>
                  </tr>
                </thead>
                <tbody className={`divide-y ${isDark ? 'divide-zinc-800' : 'divide-slate-200'}`}>
                  {gstSlabs.map((s, idx) => (
                    <tr key={idx} className={isDark ? 'hover:bg-zinc-900/60' : 'hover:bg-sky-50/50'}>
                      <td className="py-2.5 px-3 text-center font-black text-sky-600 border-r border-inherit">
                        {s.code}
                      </td>
                      <td className="py-2.5 px-3 font-bold border-r border-inherit">
                        <span className="font-sans font-black">{s.name}</span>
                        <span className="block text-[10px] text-slate-500">{s.category}</span>
                      </td>
                      <td className="py-2.5 px-3 text-center font-black text-emerald-600 border-r border-inherit text-sm">
                        {s.rate}%
                      </td>
                      <td className="py-2.5 px-3 text-center font-bold border-r border-inherit">
                        {s.cgst}%
                      </td>
                      <td className="py-2.5 px-3 text-center font-bold border-r border-inherit">
                        {s.sgst}%
                      </td>
                      <td className="py-2.5 px-3 text-center font-bold border-r border-inherit">
                        {s.igst}%
                      </td>
                      <td className={`py-2.5 px-3 border-r border-inherit font-sans text-xs ${
                        isDark ? 'text-zinc-300' : 'text-slate-700'
                      }`}>
                        {s.description}
                      </td>
                      <td className="py-2.5 px-3 text-center font-black border-r border-inherit text-sky-600">
                        {s.activeItemsCount ? s.activeItemsCount.toLocaleString() : '—'}
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <button
                          onClick={() => handleOpenEditSlab(s)}
                          className={`p-1.5 rounded transition ${
                            isDark ? 'hover:bg-zinc-800 text-sky-400' : 'hover:bg-sky-100 text-sky-600'
                          }`}
                          title="Edit Tax Slab"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 2: LIVE CATALOG PRODUCT TAX & HSN AUDIT WITH INLINE EDIT */}
        {activeTab === 'items' && (
          <div className="space-y-3">
            {/* Filter Bar */}
            <div className={`p-3 rounded-lg border grid grid-cols-12 gap-3 text-xs font-mono ${
              isDark ? 'bg-zinc-900 border-zinc-800' : 'bg-slate-50 border-slate-200'
            }`}>
              <div className="col-span-6 relative">
                <Search className="w-4 h-4 absolute left-2.5 top-2.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search 24k medicines to inspect or edit assigned tax slab..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className={`w-full pl-8 py-1.5 px-2 rounded border font-bold text-xs ${
                    isDark ? 'bg-zinc-950 border-zinc-700 text-white' : 'bg-white border-slate-300 text-slate-950'
                  }`}
                />
              </div>

              <div className="col-span-3">
                <select
                  value={selectedHsn}
                  onChange={(e) => setSelectedHsn(e.target.value)}
                  className={`w-full py-1.5 px-2 rounded border font-bold text-xs ${
                    isDark ? 'bg-zinc-950 border-zinc-700 text-white' : 'bg-white border-slate-300 text-slate-950'
                  }`}
                >
                  <option value="ALL">All HSN Chapters</option>
                  <option value="3004">HSN 3004 (General Medicaments 12%)</option>
                  <option value="3002">HSN 3002 (Vaccines & Insulin 5%)</option>
                  <option value="3005">HSN 3005 (Bandages & Dressings 12%)</option>
                  <option value="2106">HSN 2106 (Nutritional Powders 18%)</option>
                </select>
              </div>

              <div className="col-span-3">
                <select
                  value={selectedSlab}
                  onChange={(e) => setSelectedSlab(e.target.value)}
                  className={`w-full py-1.5 px-2 rounded border font-bold text-xs ${
                    isDark ? 'bg-zinc-950 border-zinc-700 text-white' : 'bg-white border-slate-300 text-slate-950'
                  }`}
                >
                  <option value="ALL">All GST Slabs</option>
                  <option value="12">GST 12% (Standard)</option>
                  <option value="5">GST 5% (Concessional)</option>
                  <option value="0">GST 0% (Nil)</option>
                  <option value="18">GST 18% (Consumer Pharma)</option>
                  <option value="28">GST 28% (Luxury)</option>
                </select>
              </div>
            </div>

            {/* Items Table */}
            <div className={`border rounded-lg overflow-hidden ${isDark ? 'border-zinc-800' : 'border-slate-300'}`}>
              <table className="w-full text-left border-collapse text-xs font-mono">
                <thead>
                  <tr className={`border-b text-[11px] uppercase tracking-wider font-extrabold ${
                    isDark ? 'bg-zinc-900 border-zinc-800 text-zinc-100' : 'bg-slate-200 border-slate-300 text-slate-950'
                  }`}>
                    <th className="py-2.5 px-3 w-12 text-center border-r border-inherit">#</th>
                    <th className="py-2.5 px-3 border-r border-inherit">Product Name & Molecule</th>
                    <th className="py-2.5 px-3 text-center border-r border-inherit w-24">HSN</th>
                    <th className="py-2.5 px-3 text-center border-r border-inherit w-24">GST %</th>
                    <th className="py-2.5 px-3 text-right border-r border-inherit w-28">MRP (₹)</th>
                    <th className="py-2.5 px-3 text-right border-r border-inherit w-28">Taxable Val</th>
                    <th className="py-2.5 px-3 text-right border-r border-inherit w-24">CGST (₹)</th>
                    <th className="py-2.5 px-3 text-right border-r border-inherit w-24">SGST (₹)</th>
                    <th className="py-2.5 px-3 text-center w-24">Edit Tax</th>
                  </tr>
                </thead>
                <tbody className={`divide-y ${isDark ? 'divide-zinc-800' : 'divide-slate-200'}`}>
                  {filteredItems.map((m, idx) => {
                    const gst = m.gstPercent !== undefined ? m.gstPercent : 12;
                    const mrp = m.mrp || 100;
                    const taxable = +(mrp / (1 + gst / 100)).toFixed(2);
                    const cgstAmt = +((mrp - taxable) / 2).toFixed(2);
                    const sgstAmt = cgstAmt;

                    return (
                      <tr key={idx} className={isDark ? 'hover:bg-zinc-900/60' : 'hover:bg-sky-50/50'}>
                        <td className={`py-2 px-3 text-center font-bold border-r border-inherit ${
                          isDark ? 'text-zinc-400' : 'text-slate-500'
                        }`}>
                          {idx + 1}
                        </td>
                        <td className="py-2 px-3 border-r border-inherit">
                          <span className={`font-black block font-sans ${isDark ? 'text-white' : 'text-slate-950'}`}>
                            {m.name}
                          </span>
                          <span className={`text-[10px] ${isDark ? 'text-sky-300' : 'text-sky-800 font-bold'}`}>
                            {m.generic || 'Active Formulation'}
                          </span>
                        </td>
                        <td className="py-2 px-3 text-center font-black text-sky-600 border-r border-inherit">
                          {m.hsn || '3004'}
                        </td>
                        <td className="py-2 px-3 text-center border-r border-inherit">
                          <span className={`px-2 py-0.5 rounded font-black text-xs border shadow-xs inline-block ${
                            isDark 
                              ? 'bg-indigo-950/80 text-indigo-300 border-indigo-600' 
                              : 'bg-indigo-50 text-indigo-800 border-indigo-300'
                          }`}>
                            {gst}% GST
                          </span>
                        </td>
                        <td className={`py-2 px-3 text-right font-black border-r border-inherit ${isDark ? 'text-white' : 'text-slate-950'}`}>
                          ₹{mrp.toFixed(2)}
                        </td>
                        <td className={`py-2 px-3 text-right font-bold border-r border-inherit ${isDark ? 'text-zinc-300' : 'text-slate-700'}`}>
                          ₹{taxable.toFixed(2)}
                        </td>
                        <td className={`py-2 px-3 text-right font-bold border-r border-inherit ${isDark ? 'text-zinc-300' : 'text-slate-700'}`}>
                          ₹{cgstAmt.toFixed(2)}
                        </td>
                        <td className={`py-2 px-3 text-right font-bold border-r border-inherit ${isDark ? 'text-zinc-300' : 'text-slate-700'}`}>
                          ₹{sgstAmt.toFixed(2)}
                        </td>
                        <td className="py-2 px-3 text-center">
                          <button
                            onClick={() => handleOpenItemTaxEdit(m)}
                            className="px-2.5 py-1 rounded bg-sky-600 hover:bg-sky-500 text-white font-bold text-[11px] flex items-center space-x-1 mx-auto shadow-xs"
                            title="Edit Tax Rate & HSN"
                          >
                            <Edit3 className="w-3 h-3" />
                            <span>Edit</span>
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

        {/* TAB 3: HSN DIRECTORY */}
        {activeTab === 'hsn' && (
          <div className="space-y-4">
            <div className={`p-3 rounded-lg border text-xs font-mono flex items-center justify-between ${
              isDark ? 'bg-zinc-900 border-zinc-800' : 'bg-slate-50 border-slate-200'
            }`}>
              <div>
                <p className={`font-black text-sm ${isDark ? 'text-white' : 'text-slate-950'}`}>
                  Harmonized System of Nomenclature (HSN) — Chapter 30 (Pharmaceuticals)
                </p>
                <p className={`mt-0.5 ${isDark ? 'text-zinc-400' : 'text-slate-600'}`}>
                  Mandatory 4-digit and 8-digit HSN classification printed on customer dot-matrix invoices and distributor e-way bills.
                </p>
              </div>
            </div>

            <div className={`border rounded-lg overflow-hidden ${isDark ? 'border-zinc-800' : 'border-slate-300'}`}>
              <table className="w-full text-left border-collapse text-xs font-mono">
                <thead>
                  <tr className={`border-b text-[11px] uppercase tracking-wider font-extrabold ${
                    isDark ? 'bg-zinc-900 border-zinc-800 text-zinc-100' : 'bg-slate-200 border-slate-300 text-slate-950'
                  }`}>
                    <th className="py-2.5 px-3 w-24 text-center border-r border-inherit">HSN Code</th>
                    <th className="py-2.5 px-3 w-28 text-center border-r border-inherit">GST Slab</th>
                    <th className="py-2.5 px-3 w-32 border-r border-inherit">GST Schedule</th>
                    <th className="py-2.5 px-3 border-r border-inherit">Official Tariff Description</th>
                    <th className="py-2.5 px-3 border-inherit">Representative Medicines / Products</th>
                  </tr>
                </thead>
                <tbody className={`divide-y ${isDark ? 'divide-zinc-800' : 'divide-slate-200'}`}>
                  {initialTaxData.hsnChapters.map((h, idx) => (
                    <tr key={idx} className={isDark ? 'hover:bg-zinc-900/60' : 'hover:bg-sky-50/50'}>
                      <td className="py-2.5 px-3 text-center font-black text-sky-600 border-r border-inherit">
                        {h.hsn}
                      </td>
                      <td className="py-2.5 px-3 text-center font-black text-emerald-600 border-r border-inherit text-sm">
                        {h.gstRate}%
                      </td>
                      <td className={`py-2.5 px-3 font-bold border-r border-inherit ${isDark ? 'text-zinc-300' : 'text-slate-700'}`}>
                        {h.schedule}
                      </td>
                      <td className={`py-2.5 px-3 border-r border-inherit font-sans text-xs ${isDark ? 'text-zinc-200' : 'text-slate-800'}`}>
                        {h.description}
                      </td>
                      <td className={`py-2.5 px-3 font-sans font-bold ${isDark ? 'text-sky-300' : 'text-sky-700'}`}>
                        {h.exampleDrugs}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 4: LEGACY KVATS (Clipper TAX.DBF) */}
        {activeTab === 'kvats' && (
          <div className="space-y-4">
            <div className={`p-4 rounded-lg border text-xs font-mono space-y-2 ${
              isDark ? 'bg-purple-950/30 border-purple-800 text-purple-200' : 'bg-purple-50 border-purple-200 text-purple-900'
            }`}>
              <p className="font-black text-sm uppercase">
                Historical Context: TAX.DBF from Legacy Clipper Software (RETAILG4 / TESTG)
              </p>
              <p className="leading-relaxed">
                Prior to the nationwide Goods and Services Tax (GST) rollout on 1st July 2017, Beta Pharmacy operated under the 
                <strong> Kerala Value Added Tax (KVAT) Act, 2003</strong>. The Clipper system recorded tax rates in <code>TAX.DBF</code> using 2 statutory codes:
              </p>
              <ul className="list-disc pl-5 space-y-1 font-semibold">
                <li><code>CODE 1</code>: 4.00% standard medicine retail VAT (theirs: 5.20% distributor PTR surcharge).</li>
                <li><code>CODE 2</code>: 0.00% exempted formulations.</li>
              </ul>
              <p className="text-[11px] opacity-80">
                In our modern system, all 24,703 items have been seamlessly upgraded to statutory Indian GST slabs (HSN 3004 / 12% GST) while preserving backward compatibility for past sales audits.
              </p>
            </div>

            <div className={`border rounded-lg overflow-hidden ${isDark ? 'border-zinc-800' : 'border-slate-300'}`}>
              <table className="w-full text-left border-collapse text-xs font-mono">
                <thead>
                  <tr className={`border-b text-[11px] uppercase tracking-wider font-extrabold ${
                    isDark ? 'bg-zinc-900 border-zinc-800 text-zinc-100' : 'bg-slate-200 border-slate-300 text-slate-950'
                  }`}>
                    <th className="py-2.5 px-3 w-24 text-center border-r border-inherit">Clipper Code</th>
                    <th className="py-2.5 px-3 border-r border-inherit">KVAT Rate Description</th>
                    <th className="py-2.5 px-3 text-center border-r border-inherit w-32">Retail Rate (OURS)</th>
                    <th className="py-2.5 px-3 text-center border-r border-inherit w-32">Distributor (THEIRS)</th>
                    <th className="py-2.5 px-3 border-inherit">Modern GST Transition Mapping</th>
                  </tr>
                </thead>
                <tbody className={`divide-y ${isDark ? 'divide-zinc-800' : 'divide-slate-200'}`}>
                  {initialTaxData.legacyKvatsCodes.map((k, idx) => (
                    <tr key={idx} className={isDark ? 'hover:bg-zinc-900/60' : 'hover:bg-sky-50/50'}>
                      <td className="py-2.5 px-3 text-center font-black text-purple-600 border-r border-inherit">
                        {k.code}
                      </td>
                      <td className="py-2.5 px-3 font-bold border-r border-inherit">
                        {k.name}
                      </td>
                      <td className="py-2.5 px-3 text-center font-black text-emerald-600 border-r border-inherit">
                        {k.ourRate.toFixed(2)}%
                      </td>
                      <td className="py-2.5 px-3 text-center font-black text-sky-600 border-r border-inherit">
                        {k.theirRate.toFixed(2)}%
                      </td>
                      <td className={`py-2.5 px-3 font-sans font-bold ${isDark ? 'text-zinc-300' : 'text-slate-700'}`}>
                        {k.status}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Edit Slab Modal */}
      {editingSlab && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className={`w-full max-w-lg rounded-2xl border shadow-2xl overflow-hidden font-sans ${
            isDark ? 'bg-zinc-900 border-zinc-700 text-zinc-100' : 'bg-white border-slate-300 text-slate-950'
          }`}>
            <div className={`px-5 py-3.5 border-b flex items-center justify-between ${
              isDark ? 'bg-zinc-800 border-zinc-700' : 'bg-sky-50 border-sky-200'
            }`}>
              <div className="flex items-center space-x-2">
                <Edit3 className="w-5 h-5 text-sky-600" />
                <h3 className="font-black text-sm uppercase">Edit GST Tax Slab [{editingSlab.code}]</h3>
              </div>
              <button 
                onClick={() => setEditingSlab(null)} 
                className={`p-1 rounded-lg ${isDark ? 'hover:bg-zinc-700 text-zinc-400' : 'hover:bg-slate-200 text-slate-500'}`}
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveSlab} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-bold mb-1">Tax Slab Name</label>
                <input
                  type="text"
                  value={slabFormData.name}
                  onChange={(e) => setSlabFormData({ ...slabFormData, name: e.target.value })}
                  required
                  className={`w-full px-3 py-1.5 rounded-lg border text-xs font-bold font-mono ${
                    isDark ? 'bg-zinc-950 border-zinc-700 text-white' : 'bg-white border-slate-400 text-slate-950'
                  }`}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold mb-1">Total GST Rate (%)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={slabFormData.rate}
                    onChange={(e) => setSlabFormData({ ...slabFormData, rate: e.target.value })}
                    required
                    className={`w-full px-3 py-1.5 rounded-lg border text-xs font-black font-mono ${
                      isDark ? 'bg-zinc-950 border-zinc-700 text-emerald-400' : 'bg-white border-slate-400 text-emerald-700'
                    }`}
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold mb-1">Scope / Category</label>
                  <input
                    type="text"
                    value={slabFormData.category}
                    onChange={(e) => setSlabFormData({ ...slabFormData, category: e.target.value })}
                    className={`w-full px-3 py-1.5 rounded-lg border text-xs font-bold font-mono ${
                      isDark ? 'bg-zinc-950 border-zinc-700 text-white' : 'bg-white border-slate-400 text-slate-950'
                    }`}
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold mb-1">Pharmaceutical Description / Inclusions</label>
                <textarea
                  rows={2}
                  value={slabFormData.description}
                  onChange={(e) => setSlabFormData({ ...slabFormData, description: e.target.value })}
                  className={`w-full px-3 py-1.5 rounded-lg border text-xs font-sans ${
                    isDark ? 'bg-zinc-950 border-zinc-700 text-white' : 'bg-white border-slate-400 text-slate-950'
                  }`}
                />
              </div>

              <div className="pt-3 border-t flex items-center justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setEditingSlab(null)}
                  className={`px-4 py-2 rounded-lg text-xs font-bold ${
                    isDark ? 'bg-zinc-800 hover:bg-zinc-700 text-zinc-300' : 'bg-slate-200 hover:bg-slate-300 text-slate-800'
                  }`}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-sky-600 hover:bg-sky-500 text-white rounded-lg text-xs font-black flex items-center space-x-1.5 shadow"
                >
                  <Save className="w-4 h-4" />
                  <span>Save Slab Changes</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add New Slab Modal */}
      {isNewSlabModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className={`w-full max-w-lg rounded-2xl border shadow-2xl overflow-hidden font-sans ${
            isDark ? 'bg-zinc-900 border-zinc-700 text-zinc-100' : 'bg-white border-slate-300 text-slate-950'
          }`}>
            <div className={`px-5 py-3.5 border-b flex items-center justify-between ${
              isDark ? 'bg-zinc-800 border-zinc-700' : 'bg-sky-50 border-sky-200'
            }`}>
              <div className="flex items-center space-x-2">
                <Plus className="w-5 h-5 text-sky-600" />
                <h3 className="font-black text-sm uppercase">Add New Tax / Cess Slab</h3>
              </div>
              <button 
                onClick={() => setIsNewSlabModalOpen(false)} 
                className={`p-1 rounded-lg ${isDark ? 'hover:bg-zinc-700 text-zinc-400' : 'hover:bg-slate-200 text-slate-500'}`}
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateNewSlab} className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold mb-1">Slab Code (e.g. CESS01, GST06)</label>
                  <input
                    type="text"
                    value={slabFormData.code}
                    onChange={(e) => setSlabFormData({ ...slabFormData, code: e.target.value.toUpperCase() })}
                    placeholder="GST06"
                    required
                    className={`w-full px-3 py-1.5 rounded-lg border text-xs font-black font-mono ${
                      isDark ? 'bg-zinc-950 border-zinc-700 text-white' : 'bg-white border-slate-400 text-slate-950'
                    }`}
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold mb-1">Tax Rate (%)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={slabFormData.rate}
                    onChange={(e) => setSlabFormData({ ...slabFormData, rate: e.target.value })}
                    required
                    className={`w-full px-3 py-1.5 rounded-lg border text-xs font-black font-mono ${
                      isDark ? 'bg-zinc-950 border-zinc-700 text-emerald-400' : 'bg-white border-slate-400 text-emerald-700'
                    }`}
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold mb-1">Tax Slab Name</label>
                <input
                  type="text"
                  value={slabFormData.name}
                  onChange={(e) => setSlabFormData({ ...slabFormData, name: e.target.value })}
                  placeholder="e.g. KERALA FLOOD CESS (1%)"
                  required
                  className={`w-full px-3 py-1.5 rounded-lg border text-xs font-bold font-mono ${
                    isDark ? 'bg-zinc-950 border-zinc-700 text-white' : 'bg-white border-slate-400 text-slate-950'
                  }`}
                />
              </div>

              <div>
                <label className="block text-xs font-bold mb-1">Category & Inclusions</label>
                <input
                  type="text"
                  value={slabFormData.category}
                  onChange={(e) => setSlabFormData({ ...slabFormData, category: e.target.value })}
                  placeholder="e.g. Statutory State Surcharge"
                  className={`w-full px-3 py-1.5 rounded-lg border text-xs font-sans ${
                    isDark ? 'bg-zinc-950 border-zinc-700 text-white' : 'bg-white border-slate-400 text-slate-950'
                  }`}
                />
              </div>

              <div className="pt-3 border-t flex items-center justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setIsNewSlabModalOpen(false)}
                  className={`px-4 py-2 rounded-lg text-xs font-bold ${
                    isDark ? 'bg-zinc-800 hover:bg-zinc-700 text-zinc-300' : 'bg-slate-200 hover:bg-slate-300 text-slate-800'
                  }`}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-sky-600 hover:bg-sky-500 text-white rounded-lg text-xs font-black flex items-center space-x-1.5 shadow"
                >
                  <Plus className="w-4 h-4" />
                  <span>Create Tax Slab</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Product Tax & HSN Modal */}
      {editingItemTax && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className={`w-full max-w-lg rounded-2xl border shadow-2xl overflow-hidden font-sans ${
            isDark ? 'bg-zinc-900 border-zinc-700 text-zinc-100' : 'bg-white border-slate-300 text-slate-950'
          }`}>
            <div className={`px-5 py-3.5 border-b flex items-center justify-between ${
              isDark ? 'bg-zinc-800 border-zinc-700' : 'bg-sky-50 border-sky-200'
            }`}>
              <div className="flex items-center space-x-2">
                <Percent className="w-5 h-5 text-indigo-600" />
                <div>
                  <h3 className="font-black text-sm uppercase">Edit Product Tax & HSN</h3>
                  <p className={`text-[11px] font-mono ${isDark ? 'text-zinc-400' : 'text-slate-600'}`}>
                    {itemTaxFormData.name}
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setEditingItemTax(null)} 
                className={`p-1 rounded-lg ${isDark ? 'hover:bg-zinc-700 text-zinc-400' : 'hover:bg-slate-200 text-slate-500'}`}
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveItemTax} className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold mb-1">Assigned GST Slab</label>
                  <select
                    value={itemTaxFormData.gstPercent}
                    onChange={(e) => setItemTaxFormData({ ...itemTaxFormData, gstPercent: e.target.value })}
                    className={`w-full px-3 py-1.5 rounded-lg border text-xs font-black font-mono ${
                      isDark ? 'bg-zinc-950 border-zinc-700 text-indigo-300' : 'bg-indigo-50 border-indigo-300 text-indigo-950'
                    }`}
                  >
                    <option value={12}>12% GST (Standard)</option>
                    <option value={5}>5% GST (Critical / Insulin)</option>
                    <option value={0}>0% GST (Exempt / Nil)</option>
                    <option value={18}>18% GST (Nutraceuticals)</option>
                    <option value={28}>28% GST (Cosmetics / Luxury)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold mb-1">HSN Tariff Code</label>
                  <input
                    type="text"
                    value={itemTaxFormData.hsn}
                    onChange={(e) => setItemTaxFormData({ ...itemTaxFormData, hsn: e.target.value })}
                    placeholder="3004"
                    required
                    className={`w-full px-3 py-1.5 rounded-lg border text-xs font-bold font-mono ${
                      isDark ? 'bg-zinc-950 border-zinc-700 text-white' : 'bg-white border-slate-400 text-slate-950'
                    }`}
                  />
                </div>
              </div>

              {/* Live Tax Split Preview */}
              <div className={`p-3 rounded-lg border text-xs font-mono space-y-1.5 ${
                isDark ? 'bg-zinc-950 border-zinc-800' : 'bg-slate-50 border-slate-300'
              }`}>
                <div className="flex justify-between">
                  <span className="text-slate-500">M.R.P. (Incl. Tax):</span>
                  <span className="font-bold">₹{itemMrp.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Taxable Value:</span>
                  <span className="font-bold">₹{itemTaxable.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-indigo-600 font-bold">
                  <span>Total GST ({itemGst}%):</span>
                  <span>₹{itemTotalGst.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-[11px] text-slate-500 pt-1 border-t border-inherit">
                  <span>CGST ({(itemGst / 2).toFixed(1)}%): ₹{itemCgst.toFixed(2)}</span>
                  <span>SGST ({(itemGst / 2).toFixed(1)}%): ₹{itemSgst.toFixed(2)}</span>
                </div>
              </div>

              <div className="pt-3 border-t flex items-center justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setEditingItemTax(null)}
                  className={`px-4 py-2 rounded-lg text-xs font-bold ${
                    isDark ? 'bg-zinc-800 hover:bg-zinc-700 text-zinc-300' : 'bg-slate-200 hover:bg-slate-300 text-slate-800'
                  }`}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-sky-600 hover:bg-sky-500 text-white rounded-lg text-xs font-black flex items-center space-x-1.5 shadow"
                >
                  <Save className="w-4 h-4" />
                  <span>Update Tax Rate</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Bulk Tax Re-assignment Modal */}
      {isBulkModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className={`w-full max-w-lg rounded-2xl border shadow-2xl overflow-hidden font-sans ${
            isDark ? 'bg-zinc-900 border-zinc-700 text-zinc-100' : 'bg-white border-slate-300 text-slate-950'
          }`}>
            <div className={`px-5 py-3.5 border-b flex items-center justify-between ${
              isDark ? 'bg-zinc-800 border-zinc-700' : 'bg-indigo-50 border-indigo-200'
            }`}>
              <div className="flex items-center space-x-2">
                <Layers className="w-5 h-5 text-indigo-600" />
                <h3 className="font-black text-sm uppercase">Bulk Tax Rate Re-assignment</h3>
              </div>
              <button 
                onClick={() => setIsBulkModalOpen(false)} 
                className={`p-1 rounded-lg ${isDark ? 'hover:bg-zinc-700 text-zinc-400' : 'hover:bg-slate-200 text-slate-500'}`}
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleExecuteBulkUpdate} className="p-5 space-y-4">
              <p className={`text-xs ${isDark ? 'text-zinc-300' : 'text-slate-700'}`}>
                Re-assign statutory GST rate across all medicines matching a specific HSN chapter (e.g. when GST Council shifts a medical category).
              </p>

              <div>
                <label className="block text-xs font-bold mb-1">Target HSN Chapter</label>
                <select
                  value={bulkTargetHsn}
                  onChange={(e) => setBulkTargetHsn(e.target.value)}
                  className={`w-full px-3 py-1.5 rounded-lg border text-xs font-mono font-bold ${
                    isDark ? 'bg-zinc-950 border-zinc-700 text-white' : 'bg-white border-slate-400 text-slate-950'
                  }`}
                >
                  <option value="3004">HSN 3004 (All Standard Allopathic Formulations)</option>
                  <option value="3002">HSN 3002 (Vaccines, Sera, Insulin, Dialysis Fluids)</option>
                  <option value="3005">HSN 3005 (Bandages, Dressings, Gauze)</option>
                  <option value="2106">HSN 2106 (Nutritional Powders, Supplements)</option>
                  <option value="3808">HSN 3808 (Antiseptics, Hospital Disinfectants)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold mb-1">New GST Rate to Apply</label>
                <select
                  value={bulkNewGst}
                  onChange={(e) => setBulkNewGst(parseFloat(e.target.value))}
                  className={`w-full px-3 py-1.5 rounded-lg border text-xs font-mono font-black text-indigo-600 ${
                    isDark ? 'bg-zinc-950 border-zinc-700' : 'bg-white border-slate-400'
                  }`}
                >
                  <option value={5}>5% GST (Concessional)</option>
                  <option value={12}>12% GST (Standard)</option>
                  <option value={0}>0% GST (Exempt)</option>
                  <option value={18}>18% GST (General)</option>
                  <option value={28}>28% GST (Luxury)</option>
                </select>
              </div>

              <div className={`p-3 rounded-lg border text-xs font-mono flex items-center space-x-2 ${
                isDark ? 'bg-amber-950/40 border-amber-800 text-amber-200' : 'bg-amber-50 border-amber-300 text-amber-900'
              }`}>
                <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                <span>This will re-assign {bulkNewGst}% GST to all products matching HSN {bulkTargetHsn} in your local store.</span>
              </div>

              <div className="pt-3 border-t flex items-center justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setIsBulkModalOpen(false)}
                  className={`px-4 py-2 rounded-lg text-xs font-bold ${
                    isDark ? 'bg-zinc-800 hover:bg-zinc-700 text-zinc-300' : 'bg-slate-200 hover:bg-slate-300 text-slate-800'
                  }`}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-black flex items-center space-x-1.5 shadow"
                >
                  <Check className="w-4 h-4" />
                  <span>Apply Bulk Tax Update</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
