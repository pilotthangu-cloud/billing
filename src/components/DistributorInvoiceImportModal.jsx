import React, { useState } from 'react';
import { 
  X, 
  Upload, 
  FileSpreadsheet, 
  CheckCircle2, 
  AlertCircle, 
  ArrowRight, 
  Package, 
  Building2, 
  Receipt,
  FileText,
  Calendar
} from 'lucide-react';

export default function DistributorInvoiceImportModal({
  isOpen,
  onClose,
  allMedicines = [],
  catalogMedicines = [],
  activeBranch,
  theme,
  onInwardInvoice,
  onImportSuccess
}) {
  const isDark = theme === 'dark';
  const medCatalog = (catalogMedicines && catalogMedicines.length > 0) ? catalogMedicines : allMedicines;
  const [distributorName, setDistributorName] = useState('');
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [invoiceDate, setInvoiceDate] = useState(new Date().toLocaleDateString('en-GB'));
  const [rawText, setRawText] = useState('');
  const [parsedItems, setParsedItems] = useState([]);
  const [step, setStep] = useState(1); // 1 = Input, 2 = Preview, 3 = Success
  const [inwardSuccessSummary, setInwardSuccessSummary] = useState(null);

  if (!isOpen) return null;

  // Sample CSV template generator
  const sampleTemplate = `Medicine Name,Batch,Expiry,QtyPacks,PTR,MRP,PackSize
AUGMENTIN 625MG TAB,AUG9981,05/28,20,175.50,223.40,10
PAN 40MG TAB,PAN4412,11/27,50,110.00,155.00,15
TELMA 40MG TAB,TLM2201,08/28,30,85.00,120.00,15
AZITHRAL 500MG TAB,AZI1190,04/27,15,95.00,135.00,5`;

  const handleLoadSample = () => {
    setRawText(sampleTemplate);
  };

  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      const content = evt.target?.result;
      if (typeof content === 'string') {
        setRawText(content);
      }
    };
    reader.readAsText(file);
  };

  const handleParseData = (e) => {
    e.preventDefault();
    const lines = rawText.trim().split('\n').map(l => l.trim()).filter(Boolean);
    if (lines.length < 2) {
      alert('Please provide at least a header and one item row.');
      return;
    }

    const items = [];
    const headerLine = lines[0].toLowerCase();
    const isComma = headerLine.includes(',');
    const isTab = headerLine.includes('\t');
    const separator = isTab ? '\t' : (isComma ? ',' : ',');

    // Find column positions
    const headers = lines[0].split(separator).map(h => h.trim().toLowerCase());
    const nameIdx = headers.findIndex(h => h.includes('med') || h.includes('name') || h.includes('item') || h.includes('desc'));
    const batchIdx = headers.findIndex(h => h.includes('batch'));
    const expIdx = headers.findIndex(h => h.includes('exp'));
    const qtyIdx = headers.findIndex(h => h.includes('qty') || h.includes('pack') || h.includes('unit'));
    const ptrIdx = headers.findIndex(h => h.includes('ptr') || h.includes('cost') || h.includes('rate'));
    const mrpIdx = headers.findIndex(h => h.includes('mrp') || h.includes('price'));
    const perIdx = headers.findIndex(h => h.includes('packsize') || h.includes('per'));

    for (let i = 1; i < lines.length; i++) {
      const parts = lines[i].split(separator).map(p => p.trim());
      if (parts.length < 2) continue;

      const rawName = nameIdx !== -1 ? parts[nameIdx] : parts[0];
      const rawBatch = batchIdx !== -1 ? parts[batchIdx] : (parts[1] || '');
      const rawExp = expIdx !== -1 ? parts[expIdx] : (parts[2] || '');
      const rawQty = qtyIdx !== -1 ? parseInt(parts[qtyIdx], 10) || 0 : 0;
      const rawPtr = ptrIdx !== -1 ? parseFloat(parts[ptrIdx]) || 0 : 0;
      const rawMrp = mrpIdx !== -1 ? parseFloat(parts[mrpIdx]) || 0 : 0;
      const rawPer = perIdx !== -1 ? parseInt(parts[perIdx], 10) || 0 : 0;

      // Match against master medicines catalog
      const cleanName = rawName.toUpperCase();
      const existing = medCatalog.find(m => 
        m.name.toUpperCase() === cleanName || 
        m.name.toUpperCase().startsWith(cleanName.slice(0, 10))
      );

      const resolvedCode = existing ? existing.code : '';

      items.push({
        id: i,
        code: resolvedCode,
        matchedCode: existing ? existing.code : null,
        name: existing ? existing.name : cleanName,
        generic: existing ? existing.generic : '',
        isExisting: !!existing,
        existingStock: existing ? (existing.stock_shop1 || 0) : 0,
        rack: existing ? existing.rack : '',
        batch: rawBatch.toUpperCase(),
        exp: rawExp,
        qty: rawQty,
        qtyPacks: rawQty,
        ptr: rawPtr,
        mrp: rawMrp,
        per: rawPer,
        totalCost: +(rawPtr * rawQty).toFixed(2),
        total: +(rawPtr * rawQty).toFixed(2)
      });
    }

    if (items.length === 0) {
      alert('Could not parse any valid medicine lines. Please check format.');
      return;
    }

    setParsedItems(items);
    setStep(2);
  };

  const handleConfirmInward = async () => {
    const errors = [];
    if (!distributorName.trim()) errors.push('distributor name');
    if (!invoiceNumber.trim()) errors.push('invoice number');
    if (!invoiceDate.trim()) errors.push('invoice date');
    parsedItems.forEach((it, index) => {
      const label = `Item ${index + 1} (${it.name || 'unnamed'})`;
      if (!it.matchedCode) errors.push(`${label}: unmatched catalog product`);
      if (!String(it.batch || '').trim()) errors.push(`${label}: batch number`);
      if (!String(it.exp || '').trim()) errors.push(`${label}: expiry`);
      if (!(Number(it.qty) > 0)) errors.push(`${label}: quantity`);
      if (!(Number(it.ptr) > 0)) errors.push(`${label}: PTR`);
      if (!(Number(it.mrp) > 0)) errors.push(`${label}: MRP`);
      if (!(Number(it.per) > 0)) errors.push(`${label}: pack size`);
    });
    if (errors.length > 0) {
      alert(`Invoice cannot be inwarded:\n\n- ${errors.join('\n- ')}\n\nCorrect the preview; no values will be generated.`);
      return;
    }

    const totalPacks = parsedItems.reduce((acc, it) => acc + it.qtyPacks, 0);
    const totalInvoiceCost = parsedItems.reduce((acc, it) => acc + it.totalCost, 0);

    const invoicePayload = {
      distributorName,
      invoiceNumber,
      distributor: distributorName,
      invoiceNo: invoiceNumber,
      invoiceDate,
      inwardDate: new Date().toLocaleDateString('en-GB'),
      items: parsedItems,
      totalPacks,
      totalCost: totalInvoiceCost,
      status: 'PENDING_PAYMENT',
      cDays: 30,
      due: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString('en-GB')
    };

    const inwardFn = onImportSuccess || onInwardInvoice;
    if (inwardFn) {
      const result = await inwardFn(invoicePayload);
      if (result?.success === false) return;
    }

    setInwardSuccessSummary(invoicePayload);
    setStep(3);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4 select-none">
      <div className={`w-full max-w-4xl rounded-2xl border shadow-2xl flex flex-col max-h-[90vh] overflow-hidden ${
        isDark ? 'bg-zinc-900 border-zinc-700 text-zinc-100' : 'bg-white border-slate-300 text-slate-900'
      }`}>
        {/* Header */}
        <div className={`px-5 py-3.5 border-b flex items-center justify-between ${
          isDark ? 'bg-zinc-800 border-zinc-700' : 'bg-purple-50 border-purple-200'
        }`}>
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-lg bg-purple-600 text-white flex items-center justify-center font-bold">
              <FileSpreadsheet className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="font-black text-sm uppercase tracking-wide">
                  Distributor Purchase Invoice Inward [PURCHASE.EDI]
                </h3>
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-purple-100 text-purple-900 border border-purple-300">
                  Instant Stock Update
                </span>
              </div>
              <p className={`text-xs mt-0.5 ${isDark ? 'text-zinc-400' : 'text-slate-600'}`}>
                Import distributor bill CSV / Excel to update shelf batches and inventory in seconds
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className={`p-1.5 rounded-lg transition ${
              isDark ? 'hover:bg-zinc-700 text-zinc-400' : 'hover:bg-slate-200 text-slate-500'
            }`}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* STEP 1: UPLOAD / PASTE INPUT */}
        {step === 1 && (
          <form onSubmit={handleParseData} className="flex-1 overflow-y-auto p-5 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">Distributor / Agency</label>
                <input
                  type="text"
                  value={distributorName}
                  onChange={(e) => setDistributorName(e.target.value)}
                  className={`w-full py-1.5 px-3 rounded-xl border font-bold text-xs ${
                    isDark ? 'bg-zinc-800 border-zinc-700 text-white' : 'bg-white border-slate-300 text-slate-900'
                  }`}
                  placeholder="Agency name"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">Distributor Bill No</label>
                <input
                  type="text"
                  value={invoiceNumber}
                  onChange={(e) => setInvoiceNumber(e.target.value)}
                  className={`w-full py-1.5 px-3 rounded-xl border font-mono font-bold text-xs ${
                    isDark ? 'bg-zinc-800 border-zinc-700 text-white' : 'bg-white border-slate-300 text-slate-900'
                  }`}
                  placeholder="e.g. INV-9902"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">Invoice Date</label>
                <input
                  type="text"
                  value={invoiceDate}
                  onChange={(e) => setInvoiceDate(e.target.value)}
                  className={`w-full py-1.5 px-3 rounded-xl border font-mono font-bold text-xs ${
                    isDark ? 'bg-zinc-800 border-zinc-700 text-white' : 'bg-white border-slate-300 text-slate-900'
                  }`}
                  placeholder="DD/MM/YYYY"
                />
              </div>
            </div>

            {/* CSV / Excel File Upload or Paste Box */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Paste CSV or Upload Distributor File
                </label>
                <div className="flex space-x-2">
                  <button
                    type="button"
                    onClick={handleLoadSample}
                    className="text-xs text-purple-600 hover:text-purple-700 font-bold"
                  >
                    Paste Sample CSV
                  </button>
                  <label className="text-xs bg-purple-50 text-purple-700 border border-purple-200 px-2.5 py-1 rounded-lg font-bold cursor-pointer hover:bg-purple-100 flex items-center space-x-1">
                    <Upload className="w-3.5 h-3.5" />
                    <span>Upload .CSV</span>
                    <input type="file" accept=".csv,.txt" onChange={handleFileUpload} className="hidden" />
                  </label>
                </div>
              </div>

              <textarea
                rows={10}
                value={rawText}
                onChange={(e) => setRawText(e.target.value)}
                placeholder="Medicine Name,Batch,Expiry,QtyPacks,PTR,MRP,PackSize&#10;AUGMENTIN 625MG TAB,AUG9981,05/28,20,175.50,223.40,10"
                className={`w-full p-3 rounded-xl border font-mono text-xs ${
                  isDark ? 'bg-zinc-950 border-zinc-800 text-white' : 'bg-slate-50 border-slate-300 text-slate-800'
                }`}
              />
              <p className="text-[11px] text-slate-400">
                Tip: Copy cells directly from Microsoft Excel or your distributor's PDF/CSV email and paste here.
              </p>
            </div>

            <div className="pt-2 flex justify-end space-x-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl border font-bold text-xs"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={!rawText.trim()}
                className="px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-black text-xs shadow-md flex items-center space-x-1.5"
              >
                <span>Parse & Preview Items</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </form>
        )}

        {/* STEP 2: PREVIEW MATCHED INWARD ITEMS */}
        {step === 2 && (
          <div className="flex-1 overflow-y-auto p-5 space-y-4">
            <div className={`p-4 rounded-xl border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 ${
              isDark ? 'bg-zinc-950 border-zinc-800' : 'bg-slate-50 border-slate-200'
            }`}>
              <div>
                <h4 className="font-black text-sm">{distributorName} • Bill #{invoiceNumber}</h4>
                <p className="text-xs text-slate-500 mt-0.5">
                  {parsedItems.length} Products parsed • Inwarding to <strong>{activeBranch?.name || 'Beta Pharmacy'}</strong>
                </p>
              </div>

              <div className="text-right">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Total Inward Cost</span>
                <span className="text-xl font-black text-purple-600 font-mono">
                  ₹{parsedItems.reduce((acc, it) => acc + it.totalCost, 0).toFixed(2)}
                </span>
              </div>
            </div>

            {/* Inward Items Preview Table */}
            <div className={`border rounded-xl overflow-hidden max-h-80 overflow-y-auto ${
              isDark ? 'border-zinc-800' : 'border-slate-300'
            }`}>
              <table className="w-full text-left text-xs">
                <thead className={`border-b text-[10px] uppercase font-black ${
                  isDark ? 'bg-zinc-800 text-zinc-300 border-zinc-700' : 'bg-slate-100 text-slate-700 border-slate-300'
                }`}>
                  <tr>
                    <th className="py-2.5 px-3 w-10 text-center">Sr</th>
                    <th className="py-2.5 px-3">Product Name</th>
                    <th className="py-2.5 px-3 text-center w-24">Catalog Match</th>
                    <th className="py-2.5 px-3 text-center w-24">Batch</th>
                    <th className="py-2.5 px-3 text-center w-20">Expiry</th>
                    <th className="py-2.5 px-3 text-center w-20">Qty (Packs)</th>
                    <th className="py-2.5 px-3 text-right w-24">PTR Cost</th>
                    <th className="py-2.5 px-3 text-right w-24">MRP</th>
                    <th className="py-2.5 px-3 text-right w-28">Total (₹)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-inherit">
                  {parsedItems.map((it, idx) => (
                    <tr key={idx} className={isDark ? 'hover:bg-zinc-800/60' : 'hover:bg-slate-50'}>
                      <td className="py-2 px-3 text-center font-bold text-slate-400">{idx + 1}</td>
                      <td className="py-2 px-3">
                        <div className="font-black text-xs">{it.name}</div>
                        <div className="text-[10px] text-slate-400">Rack R-{it.rack} • Current Shelf: {it.existingStock} pk</div>
                      </td>
                      <td className="py-2 px-3 text-center">
                        {it.isExisting ? (
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-black bg-emerald-100 text-emerald-800 border border-emerald-300">
                            Matched
                          </span>
                        ) : (
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-black bg-sky-100 text-sky-800 border border-sky-300">
                            New Item
                          </span>
                        )}
                      </td>
                      <td className="py-2 px-3 text-center font-mono font-bold text-purple-600">{it.batch}</td>
                      <td className="py-2 px-3 text-center font-mono font-bold text-slate-500">{it.exp}</td>
                      <td className="py-2 px-3 text-center font-black">{it.qtyPacks}</td>
                      <td className="py-2 px-3 text-right">₹{it.ptr.toFixed(2)}</td>
                      <td className="py-2 px-3 text-right font-bold">₹{it.mrp.toFixed(2)}</td>
                      <td className="py-2 px-3 text-right font-black text-purple-700">₹{it.totalCost.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex justify-between items-center pt-2">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="px-4 py-2 rounded-xl border font-bold text-xs"
              >
                ← Back to Edit
              </button>

              <div className="flex space-x-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 rounded-xl border font-bold text-xs"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmInward}
                  className="px-6 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-black text-xs shadow-md flex items-center space-x-1.5"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Confirm Inward & Update Shelf Stock</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* STEP 3: SUCCESS CONFIRMATION */}
        {step === 3 && inwardSuccessSummary && (
          <div className="p-8 text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-10 h-10" />
            </div>
            <div>
              <h4 className="text-xl font-black text-emerald-600">Purchase Inward Completed!</h4>
              <p className="text-sm font-mono text-slate-500 mt-1">
                Bill #{inwardSuccessSummary.invoiceNumber} from {inwardSuccessSummary.distributorName}
              </p>
            </div>

            <div className={`p-4 rounded-xl border max-w-md mx-auto text-left text-xs space-y-1.5 ${
              isDark ? 'bg-zinc-950 border-zinc-800' : 'bg-slate-50 border-slate-200'
            }`}>
              <div className="flex justify-between">
                <span className="text-slate-500 font-bold">Total Products Inwarded:</span>
                <span className="font-mono font-black">{inwardSuccessSummary.items.length} items</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 font-bold">Total Packs Added to Shelf:</span>
                <span className="font-bold text-emerald-600">{inwardSuccessSummary.totalPacks} packs</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 font-bold">Invoice Payable Amount:</span>
                <span className="font-black text-purple-600 font-mono">₹{inwardSuccessSummary.totalCost.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 font-bold">Credit Payment Due Date:</span>
                <span className="font-mono">{inwardSuccessSummary.due} (30 days)</span>
              </div>
            </div>

            <div className="flex justify-center space-x-3 pt-3">
              <button
                onClick={onClose}
                className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs shadow-md"
              >
                Done & Return to Billing
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
