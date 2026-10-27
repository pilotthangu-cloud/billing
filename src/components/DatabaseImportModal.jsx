import React, { useState } from 'react';
import { 
  Database, 
  Upload, 
  FileSpreadsheet, 
  CheckCircle, 
  X, 
  HelpCircle, 
  AlertCircle,
  FileCheck,
  RefreshCw,
  FolderOpen
} from 'lucide-react';
import { parseDbfBuffer, parseCsvText, normalizeLegacyMedicineRecords } from '../utils/dbfReader';

export default function DatabaseImportModal({
  isOpen,
  onClose,
  theme,
  onImportMedicines,
  onResetMasterCatalog
}) {
  const isDark = theme === 'dark';

  const [selectedFile, setSelectedFile] = useState(null);
  const [isParsing, setIsParsing] = useState(false);
  const [parsedRecords, setParsedRecords] = useState([]);
  const [statusMessage, setStatusMessage] = useState('');
  const [mergeMode, setMergeMode] = useState('merge'); // 'merge' | 'replace'

  if (!isOpen) return null;

  // 1-Click Folder Upload: Reads entire DATA folder (ITEMFILE.DBF + STK*.DBF together)
  const handleFolderUpload = async (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    setIsParsing(true);
    setStatusMessage(`Scanning ${files.length} files in folder...`);

    try {
      const itemFile = files.find(f => f.name.toUpperCase() === 'ITEMFILE.DBF');
      // Look for Company Master DBF (maps CO_CODE -> CO_NAME e.g. H001 -> HIND)
      const compFile = files.find(f => {
        const n = f.name.toUpperCase();
        return n === 'COMPMAST.DBF' || n === 'COMPANY.DBF' || n === 'COMPFILE.DBF' || n === 'COMAST.DBF';
      });

      let companyMap = new Map();
      if (compFile) {
        setStatusMessage(`Reading company master from ${compFile.name}...`);
        const cBuf = await compFile.arrayBuffer();
        const { records: compRecs } = parseDbfBuffer(cBuf);
        compRecs.forEach(cr => {
          const code = String(cr.CO_CODE || cr.CODE || cr.ID || '').trim().toUpperCase();
          const name = String(cr.CO_NAME || cr.NAME || cr.COMPANY || '').trim().toUpperCase();
          if (code && name) {
            companyMap.set(code, name);
          }
        });
      }

      // Detect all STK*.DBF files and select the latest (STKFILE.DBF or newest date)
      const stockFiles = files.filter(f => {
        const n = f.name.toUpperCase();
        return n.startsWith('STK') && n.endsWith('.DBF');
      });
      let stockFile = null;
      if (stockFiles.length > 0) {
        stockFiles.sort((a, b) => {
          if (a.name.toUpperCase() === 'STKFILE.DBF') return -1;
          if (b.name.toUpperCase() === 'STKFILE.DBF') return 1;
          return (b.lastModified || 0) - (a.lastModified || 0) || b.name.localeCompare(a.name);
        });
        stockFile = stockFiles[0];
      }

      let records = [];

      if (itemFile) {
        setStatusMessage(`Reading master catalog from ${itemFile.name}...`);
        const buf = await itemFile.arrayBuffer();
        const { records: itemRecs } = parseDbfBuffer(buf);
        records = itemRecs;
      }

      if (stockFile) {
        setStatusMessage(`Applying live shop stock from ${stockFile.name}...`);
        const sBuf = await stockFile.arrayBuffer();
        const { records: stockRecs } = parseDbfBuffer(sBuf);

        const stockMap = new Map();
        const batchesMap = new Map();

        stockRecs.forEach(sr => {
          const code = String(sr.IT_CODE || sr.CODE || '').trim().toUpperCase();
          const batchQty = parseInt(sr.STOCK || sr.QTY || sr.BALANCE || sr.CL_STOCK || 0, 10) || 0;
          if (!code) return;

          // CRITICAL: ACCUMULATE multi-batch stock (e.g. 20 + 25 + 5 = 50, not overwriting with 5!)
          stockMap.set(code, (stockMap.get(code) || 0) + batchQty);

          const batchNo = String(sr.BATCH || sr.BATCH_NO || sr.BAT_NO || 'BN001').trim();
          const expDate = String(sr.EXPIRY || sr.EXP_DATE || sr.EXP || '').trim();
          const mrp = parseFloat(sr.MRP || sr.RATE || sr.PRICE || 0) || 0;
          const ptr = parseFloat(sr.PTR || sr.PUR_RATE || sr.PRATE || 0) || 0;
          const supplier = String(sr.SUPPLIER || sr.DIST || 'Direct Inward').trim();

          const list = batchesMap.get(code) || [];
          list.push({
            batch_no: batchNo,
            exp_date: expDate,
            mrp: mrp > 0 ? mrp : undefined,
            ptr: ptr > 0 ? ptr : undefined,
            qty: batchQty,
            stock: batchQty,
            supplier: supplier
          });
          batchesMap.set(code, list);
        });

        if (records.length > 0) {
          records = records.map(r => {
            const code = String(r.IT_CODE || r.CODE || '').trim().toUpperCase();
            if (stockMap.has(code)) {
              return { 
                ...r, 
                STOCK: stockMap.get(code),
                BATCHES: batchesMap.get(code)
              };
            }
            return {
              ...r,
              STOCK: 0,
              BATCHES: []
            };
          });
        } else {
          // If only STK*.DBF was uploaded, synthesize grouped items per unique IT_CODE
          const grouped = [];
          for (const [code, totalStock] of stockMap.entries()) {
            const batches = batchesMap.get(code) || [];
            const first = stockRecs.find(sr => String(sr.IT_CODE || sr.CODE || '').trim().toUpperCase() === code) || {};
            grouped.push({
              ...first,
              IT_CODE: code,
              STOCK: totalStock,
              BATCHES: batches
            });
          }
          records = grouped;
        }
      }

      if (records.length === 0) {
        const anyDbf = files.find(f => f.name.toUpperCase().endsWith('.DBF'));
        if (anyDbf) {
          const buf = await anyDbf.arrayBuffer();
          const { records: r } = parseDbfBuffer(buf);
          records = r;
        }
      }

      if (records.length === 0) {
        setStatusMessage('No ITEMFILE.DBF or STK*.DBF found in the selected folder.');
        return;
      }

      setSelectedFile({ name: `DATA Folder (${files.length} files)` });
      const normalized = normalizeLegacyMedicineRecords(records, null, companyMap);
      setParsedRecords(normalized);
      setStatusMessage(`✓ Loaded ${normalized.length.toLocaleString()} medicines with live counter stock!`);
    } catch (err) {
      console.error('Folder upload error:', err);
      setStatusMessage(`Error parsing folder: ${err.message || 'Invalid format'}`);
    } finally {
      setIsParsing(false);
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setSelectedFile(file);
    setIsParsing(true);
    setStatusMessage(`Parsing ${file.name}...`);

    try {
      const fileName = file.name.toUpperCase();
      if (fileName.endsWith('.DBF')) {
        const buffer = await file.arrayBuffer();
        const { records } = parseDbfBuffer(buffer);
        const normalized = normalizeLegacyMedicineRecords(records);
        setParsedRecords(normalized);
        setStatusMessage(`✓ Extracted ${normalized.length.toLocaleString()} medicine records from ${file.name}`);
      } else if (fileName.endsWith('.CSV') || fileName.endsWith('.TXT')) {
        const text = await file.text();
        const records = parseCsvText(text);
        const normalized = normalizeLegacyMedicineRecords(records);
        setParsedRecords(normalized);
        setStatusMessage(`✓ Extracted ${normalized.length.toLocaleString()} medicine records from CSV`);
      } else {
        setStatusMessage('Please select a .DBF file (e.g. ITEMFILE.DBF) or a .CSV file.');
      }
    } catch (err) {
      console.error('Import parse error:', err);
      setStatusMessage(`Error parsing file: ${err.message || 'Invalid format'}`);
    } finally {
      setIsParsing(false);
    }
  };

  const handleApplyImport = () => {
    if (parsedRecords.length === 0) return;
    onImportMedicines(parsedRecords, mergeMode);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs font-sans">
      <div className={`w-full max-w-2xl rounded-xl border shadow-2xl overflow-hidden flex flex-col max-h-[90vh] ${
        isDark ? 'bg-zinc-900 border-zinc-700 text-zinc-100' : 'bg-white border-slate-300 text-slate-900'
      }`}>
        {/* Header */}
        <div className={`px-6 py-4 border-b flex items-center justify-between ${
          isDark ? 'bg-zinc-950 border-zinc-800' : 'bg-slate-50 border-slate-200'
        }`}>
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-lg bg-purple-600 flex items-center justify-center text-white">
              <Database className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-base">Import Legacy Database (.DBF / CSV)</h3>
              <p className="text-xs text-slate-500 font-mono">RETAILG4 / DOS / Marg / Excel Medicine Migration</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className={`p-1.5 rounded-lg border text-slate-400 hover:text-slate-600 ${
              isDark ? 'border-zinc-800 hover:bg-zinc-800' : 'border-slate-200 hover:bg-slate-100'
            }`}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5 overflow-y-auto">
          {/* Two Clear Options */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Option 1: Entire DATA Folder */}
            <label className={`block border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all ${
              isDark 
                ? 'border-purple-600/60 hover:border-purple-400 bg-purple-950/20 hover:bg-purple-900/30' 
                : 'border-purple-400 hover:border-purple-600 bg-purple-50/60 hover:bg-purple-100/60'
            }`}>
              <FolderOpen className="w-8 h-8 mx-auto mb-2 text-purple-500" />
              <span className="text-sm font-black block text-purple-700 dark:text-purple-300">
                1-Click: Select "DATA" Folder
              </span>
              <span className="text-[11px] text-slate-500 block mt-1 leading-normal">
                Select your old software's <strong>DATA</strong> folder directly. Automatically imports <strong>ITEMFILE.DBF</strong> + today's <strong>STK*.DBF</strong> stock in one click!
              </span>
              <input
                type="file"
                webkitdirectory="true"
                directory=""
                multiple
                onChange={handleFolderUpload}
                className="hidden"
              />
            </label>

            {/* Option 2: Single DBF / CSV File */}
            <label className={`block border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all ${
              isDark 
                ? 'border-zinc-700 hover:border-sky-500 hover:bg-zinc-800/40' 
                : 'border-slate-300 hover:border-sky-500 hover:bg-sky-50/40'
            }`}>
              <Upload className="w-8 h-8 mx-auto mb-2 text-sky-500" />
              <span className="text-sm font-bold block">
                Select Single .DBF / .CSV File
              </span>
              <span className="text-[11px] text-slate-500 block mt-1 leading-normal">
                Double-click into <strong>DATA</strong>, click on <strong>ITEMFILE.DBF</strong> or <strong>STK2610.DBF</strong>, then click <strong>Open</strong>.
              </span>
              <input
                type="file"
                accept=".dbf,.csv,.txt"
                onChange={handleFileUpload}
                className="hidden"
              />
            </label>
          </div>

          {/* Status Alert */}
          {statusMessage && (
            <div className={`p-3 rounded-lg text-xs font-mono font-bold flex items-center space-x-2 ${
              statusMessage.startsWith('✓')
                ? 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/30'
                : 'bg-amber-500/10 text-amber-600 border border-amber-500/30'
            }`}>
              <span>{statusMessage}</span>
            </div>
          )}

          {/* Import Preview */}
          {parsedRecords.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs font-bold">
                <span>Preview (First 4 extracted items):</span>
                <span className="text-slate-500 font-mono">Total {parsedRecords.length.toLocaleString()} items ready</span>
              </div>

              <div className={`rounded-lg border overflow-hidden text-xs font-mono ${
                isDark ? 'border-zinc-800 bg-zinc-950' : 'border-slate-200 bg-slate-50'
              }`}>
                <table className="w-full text-left">
                  <thead className={isDark ? 'bg-zinc-800 text-slate-300' : 'bg-slate-200 text-slate-700'}>
                    <tr>
                      <th className="p-2">Code</th>
                      <th className="p-2">Medicine Name</th>
                      <th className="p-2">Pack</th>
                      <th className="p-2 text-right">MRP</th>
                      <th className="p-2 text-right">Stock</th>
                    </tr>
                  </thead>
                  <tbody>
                    {parsedRecords.slice(0, 4).map((m, i) => (
                      <tr key={i} className="border-t border-slate-200/20">
                        <td className="p-2 text-sky-500 font-bold">{m.code}</td>
                        <td className="p-2 font-bold">{m.name}</td>
                        <td className="p-2 text-slate-500">{m.packing}</td>
                        <td className="p-2 text-right">₹{m.mrp.toFixed(2)}</td>
                        <td className="p-2 text-right font-bold text-emerald-600">{m.stock}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Merge vs Replace Mode */}
              <div className="pt-2 flex items-center space-x-4 text-xs">
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="radio"
                    name="importMode"
                    value="merge"
                    checked={mergeMode === 'merge'}
                    onChange={() => setMergeMode('merge')}
                    className="text-purple-600"
                  />
                  <span><strong>Merge with catalog:</strong> Add new medicines and update existing matching codes</span>
                </label>
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="radio"
                    name="importMode"
                    value="replace"
                    checked={mergeMode === 'replace'}
                    onChange={() => setMergeMode('replace')}
                    className="text-purple-600"
                  />
                  <span><strong>Replace entire catalog:</strong> Use only this imported file</span>
                </label>
              </div>
            </div>
          )}

          {/* Help Box */}
          <div className={`p-3.5 rounded-lg border text-xs space-y-1 ${
            isDark ? 'bg-zinc-950 border-zinc-800 text-zinc-400' : 'bg-slate-50 border-slate-200 text-slate-600'
          }`}>
            <div className="font-bold text-slate-700 dark:text-slate-300 flex items-center space-x-1.5">
              <HelpCircle className="w-3.5 h-3.5 text-purple-500" />
              <span>Which file to choose from your shop computer:</span>
            </div>
            <p className="text-[11px] leading-relaxed">
              <strong>ITEMFILE.DBF:</strong> Medicine names, shelf racks, MRP, and generics.<br />
              <strong>STK2610.DBF (or STK*.DBF):</strong> Live physical counter stock counts.<br />
              <em>Tip: You can import either or both. Names and stock are automatically cross-matched!</em>
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className={`px-6 py-4 border-t flex items-center justify-between ${
          isDark ? 'bg-zinc-950 border-zinc-800' : 'bg-slate-50 border-slate-200'
        }`}>
          <div className="flex items-center space-x-2">
            <button
              onClick={onClose}
              className={`px-4 py-2 rounded-lg border text-xs font-bold ${
                isDark ? 'border-zinc-700 hover:bg-zinc-800 text-zinc-300' : 'border-slate-300 hover:bg-slate-100 text-slate-700'
              }`}
            >
              Cancel
            </button>

            {onResetMasterCatalog && (
              <button
                onClick={() => {
                  onResetMasterCatalog();
                  onClose();
                }}
                className={`px-3 py-2 rounded-lg border text-xs font-bold flex items-center space-x-1 ${
                  isDark 
                    ? 'border-purple-800 bg-purple-950/40 text-purple-300 hover:bg-purple-900/60' 
                    : 'border-purple-300 bg-purple-50 text-purple-700 hover:bg-purple-100'
                }`}
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Reset to Built-in 24,665 Master</span>
              </button>
            )}
          </div>

          <button
            onClick={handleApplyImport}
            disabled={parsedRecords.length === 0}
            className={`px-6 py-2 rounded-lg text-xs font-bold flex items-center space-x-2 shadow-md ${
              parsedRecords.length > 0
                ? 'bg-purple-600 hover:bg-purple-500 text-white cursor-pointer'
                : 'bg-slate-300 text-slate-500 cursor-not-allowed'
            }`}
          >
            <FileCheck className="w-4 h-4" />
            <span>Apply {parsedRecords.length > 0 ? `(${parsedRecords.length} Items)` : ''}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
