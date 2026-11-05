import React, { useState, useRef, useEffect } from 'react';
import { 
  ArrowLeft, 
  Plus, 
  Check, 
  Trash2, 
  Building2, 
  Calendar, 
  Hash, 
  Search, 
  Package, 
  Percent, 
  FileCheck,
  Receipt,
  Layers,
  CheckCircle2,
  AlertCircle,
  UploadCloud,
  FileUp,
  Camera,
  Edit3,
  AlertTriangle,
  X,
  Loader2,
  CheckCheck,
  Key,
  Settings,
  Zap,
  Lock,
  AlertOctagon,
  Activity,
  RefreshCw,
  ChevronDown,
  Bookmark
} from 'lucide-react';
import supplierList from '../data/suppliers.json';
import { normalizeExpiry } from '../utils/billUtils';
// Daily OCR Token Quota Limit: 245,000 Tokens/Day Hardcap (Strictly gpt-4o-mini)
export const DAILY_TOKEN_CAP = 245000;
export const HARDCAPPED_MODEL = 'gpt-4o-mini';

export const OPENAI_API_KEY = 
  (typeof window !== 'undefined' ? (localStorage.getItem('beta_pharma_openai_key') || '') : '') || 
  (typeof import.meta !== 'undefined' && import.meta.env?.VITE_OPENAI_API_KEY ? import.meta.env.VITE_OPENAI_API_KEY : '');

export function getDailyTokenUsage() {
  try {
    const today = new Date().toISOString().slice(0, 10);
    const raw = localStorage.getItem('pharma_pos_ocr_quota');
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && parsed.date === today) {
        parsed.dailyLimit = DAILY_TOKEN_CAP;
        parsed.model = HARDCAPPED_MODEL;
        return parsed;
      }
    }
    const fresh = {
      date: today,
      tokensUsed: 0,
      billsCount: 0,
      dailyLimit: DAILY_TOKEN_CAP,
      model: HARDCAPPED_MODEL
    };
    localStorage.setItem('pharma_pos_ocr_quota', JSON.stringify(fresh));
    return fresh;
  } catch (e) {
    return {
      date: new Date().toISOString().slice(0, 10),
      tokensUsed: 0,
      billsCount: 0,
      dailyLimit: DAILY_TOKEN_CAP,
      model: HARDCAPPED_MODEL
    };
  }
}

export function updateDailyTokenUsage(tokensConsumed) {
  try {
    const current = getDailyTokenUsage();
    current.tokensUsed = (current.tokensUsed || 0) + tokensConsumed;
    current.billsCount = (current.billsCount || 0) + 1;
    current.dailyLimit = DAILY_TOKEN_CAP;
    current.model = HARDCAPPED_MODEL;
    localStorage.setItem('pharma_pos_ocr_quota', JSON.stringify(current));
    return current;
  } catch (e) {
    return null;
  }
}

// Converts an uploaded image or PDF file to an optimized Base64 Data URL for OpenAI Vision
export async function convertFileToImageDataUrl(file) {
  if (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')) {
    try {
      const pdfjsLib = await import('pdfjs-dist/build/pdf.mjs');
      if (!pdfjsLib.GlobalWorkerOptions.workerSrc) {
        pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version || '4.10.38'}/pdf.worker.min.mjs`;
      }
      const arrayBuffer = await file.arrayBuffer();
      const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
      const pdf = await loadingTask.promise;
      const page = await pdf.getPage(1);
      const viewport = page.getViewport({ scale: 1.5 });
      const canvas = document.createElement('canvas');
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      const ctx = canvas.getContext('2d');
      await page.render({ canvasContext: ctx, viewport }).promise;
      return canvas.toDataURL('image/jpeg', 0.90);
    } catch (err) {
      console.warn('PDF to image render failed:', err);
      throw new Error('Could not convert PDF page. Please upload a clear photo/screenshot (JPG or PNG).');
    }
  }

  // Normal image file (JPG, PNG, WEBP)
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const maxDim = 1600;
        let { width, height } = img;
        if (width > maxDim || height > maxDim) {
          if (width > height) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          } else {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL('image/jpeg', 0.90));
        } else {
          resolve(e.target.result);
        }
      };
      img.onerror = () => resolve(e.target.result);
      img.src = e.target.result;
    };
    reader.onerror = () => reject(new Error('Failed to read image file'));
    reader.readAsDataURL(file);
  });
}

export default function PurchaseEntryPage({ 
  theme, 
  medicines, 
  onBackToBilling, 
  onUpdateCatalogStock 
}) {
  const isDark = theme === 'dark';

  // All Suppliers (Loaded from suppliers.json + dynamic invoice detected distributors)
  const [allSuppliers, setAllSuppliers] = useState(() => {
    try {
      const saved = localStorage.getItem('beta_pharma_custom_suppliers');
      if (saved) {
        const custom = JSON.parse(saved);
        if (Array.isArray(custom)) return [...custom, ...supplierList];
      }
    } catch (e) {}
    return supplierList;
  });

  // Invoice Header States (PURCHASE.DBF schema)
  const [supplierCode, setSupplierCode] = useState(() => (allSuppliers[0]?.code || 'S076'));
  const [invoiceNo, setInvoiceNo] = useState(''); // Starts empty so pharmacist writes distributor bill no!
  const [billDate, setBillDate] = useState(new Date().toLocaleDateString('en-GB')); // Editable date, defaults to today
  const [isCash, setIsCash] = useState(false); // Cash or Credit
  const [cashDiscount, setCashDiscount] = useState(0);

  // Line Item Entry State (PDT schema)
  const [searchMedQuery, setSearchMedQuery] = useState('');
  const [isMedDropdownOpen, setIsMedDropdownOpen] = useState(false);
  const [selectedMed, setSelectedMed] = useState(null);
  const [batchNo, setBatchNo] = useState(''); // Starts EMPTY for brand new shipment
  const [expDate, setExpDate] = useState(''); // Starts EMPTY for brand new shipment
  const [wQty, setWQty] = useState(10); // Billed packs
  const [packSize, setPackSize] = useState(10); // PER (tablets per pack)
  const [freeQty, setFreeQty] = useState(0); // FREE_QTY (e.g. 10+1, 10+2 scheme)
  const [replQty, setReplQty] = useState(0); // REPL_QTY
  const [mrp, setMrp] = useState(100.00);
  const [purchaseRate, setPurchaseRate] = useState(70.00); // Net distributor purchase rate (PTR)
  const [taxPercent, setTaxPercent] = useState('');

  // OCR Document Inward Parser & Manual Review State
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [scanStatusText, setScanStatusText] = useState('');
  const [uploadedFileName, setUploadedFileName] = useState('');
  const [extractedReviewData, setExtractedReviewData] = useState(null); // Editable review model before posting
  const fileInputRef = useRef(null);
  const [ocrError, setOcrError] = useState('');

  // Manager authorization must be configured per installation. There is no
  // universal fallback PIN in the source code.
  const ADMIN_PASSWORD = import.meta.env.VITE_ADMIN_PASSWORD || '';
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState(false);
  const [isAdminAuthModalOpen, setIsAdminAuthModalOpen] = useState(false);
  const [adminPasswordInput, setAdminPasswordInput] = useState('');
  const [adminAuthError, setAdminAuthError] = useState('');

  // Daily OCR Token Quota State (112,000 Hardcap)
  const [quotaData, setQuotaData] = useState(() => getDailyTokenUsage());

  // Inward Line Items Ledger (Starts clean & empty!)
  const [purchaseItems, setPurchaseItems] = useState([]);

  // Saved Invoices History (Voucher history loaded from localStorage)
  const [savedVouchers, setSavedVouchers] = useState(() => {
    try {
      const saved = localStorage.getItem('beta_pharma_purchase_bills');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed.map((p, idx) => ({
            purNo: p.purNo || `0${6927 + idx + 1}`,
            billNo: p.billNo || p.distBillNo || '0000',
            supplier: p.supplier || p.supplierName || p.name || 'DISTRIBUTOR',
            supplierCode: p.supplierCode,
            date: p.date || p.billDate || '',
            amount: parseFloat(p.amount !== undefined ? p.amount : p.totalAmount) || 0,
            itemsCount: p.itemsCount || (p.items ? p.items.length : 1),
            items: p.items || []
          }));
        }
      }
    } catch (e) {}
    return [];
  });
  const [activeTab, setActiveTab] = useState('entry'); // 'entry' or 'vouchers'
  const [saveSuccessToast, setSaveSuccessToast] = useState('');

  // Parked Drafts Subsystem (F12)
  const [parkedPurchases, setParkedPurchases] = useState(() => {
    try {
      const saved = localStorage.getItem('beta_pharma_parked_purchases');
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
  });
  const [isParkedModalOpen, setIsParkedModalOpen] = useState(false);

  // Previous Inward Vouchers Revision & Search State
  const [searchVoucherQuery, setSearchVoucherQuery] = useState('');
  const [editingVoucher, setEditingVoucher] = useState(null); // { purNo, billNo, originalItems }
  const [expandedVoucherNo, setExpandedVoucherNo] = useState(null);

  const medSearchInputRef = useRef(null);
  const batchInputRef = useRef(null);
  const expInputRef = useRef(null);
  const qtyInputRef = useRef(null);
  const rateInputRef = useRef(null);

  // Filter medicines for autocomplete
  const mq = searchMedQuery.trim().toLowerCase();
  const filteredMeds = mq.length === 0 ? [] : medicines.filter(m => 
    m.name.toLowerCase().includes(mq) || 
    (m.generic && m.generic.toLowerCase().includes(mq)) ||
    (m.code && m.code.toLowerCase().includes(mq))
  ).slice(0, 20);

  // Selected supplier details & Instant Search Combobox
  const [supplierSearchQuery, setSupplierSearchQuery] = useState('');
  const [isSupplierDropdownOpen, setIsSupplierDropdownOpen] = useState(false);
  const supplierDropdownRef = useRef(null);

  // Handle committing or creating a custom distributor on the fly
  const handleCommitSupplier = (rawVal) => {
    const raw = (rawVal !== undefined ? rawVal : supplierSearchQuery).trim();
    if (!raw) {
      setIsSupplierDropdownOpen(false);
      return;
    }

    // 1. Check if exact or case-insensitive match already exists
    const found = allSuppliers.find(s => 
      s.code.toLowerCase() === raw.toLowerCase() || 
      s.name.toLowerCase() === raw.toLowerCase() ||
      `${s.code} - ${s.name}`.toLowerCase() === raw.toLowerCase()
    );

    if (found) {
      setSupplierCode(found.code);
      setSupplierSearchQuery('');
      setIsSupplierDropdownOpen(false);
      return;
    }

    // 2. It's a new distributor name entered by the pharmacist!
    const cleanName = raw.toUpperCase();
    const newCode = `D${(allSuppliers.length + 101).toString().slice(-4)}`;
    const newSupplier = {
      code: newCode,
      name: cleanName,
      address: 'LOCAL DISTRIBUTOR',
      phone: '',
      creditDays: 21
    };

    const updated = [newSupplier, ...allSuppliers];
    setAllSuppliers(updated);
    setSupplierCode(newCode);
    setSupplierSearchQuery('');
    setIsSupplierDropdownOpen(false);

    try {
      const custom = JSON.parse(localStorage.getItem('beta_pharma_custom_suppliers') || '[]');
      custom.unshift(newSupplier);
      localStorage.setItem('beta_pharma_custom_suppliers', JSON.stringify(custom));
    } catch (e) {}
  };

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (supplierDropdownRef.current && !supplierDropdownRef.current.contains(e.target)) {
        if (isSupplierDropdownOpen) {
          if (supplierSearchQuery.trim()) {
            handleCommitSupplier(supplierSearchQuery);
          } else {
            setIsSupplierDropdownOpen(false);
          }
        }
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isSupplierDropdownOpen, supplierSearchQuery, allSuppliers]);

  const currentSupplier = allSuppliers.find(s => s.code === supplierCode) || allSuppliers[0];

  const sq = supplierSearchQuery.trim().toLowerCase();
  const filteredSuppliers = sq.length === 0
    ? allSuppliers.slice(0, 35)
    : allSuppliers.filter(s =>
        (s.name && s.name.toLowerCase().includes(sq)) ||
        (s.code && s.code.toLowerCase().includes(sq)) ||
        (s.address && s.address.toLowerCase().includes(sq))
      ).slice(0, 35);

  // Handle supplier change: Clear invoice number so user enters the new distributor bill
  const handleSupplierChange = (newCode) => {
    setSupplierCode(newCode);
    setInvoiceNo(''); // Reset bill number for new supplier
  };

  // Invoice Auto-Extract Document Parser (245k Daily Token Hardcap)
  const handleStartOCRScan = async (file) => {
    if (!file) return;
    setOcrError('');
    setIsScanning(true);
    setUploadedFileName(file.name);
    setScanStatusText('Preparing document...');

    try {
      // 1. Quota & Hardcap Enforcement (245,000 Tokens/Day)
      const currentQuota = getDailyTokenUsage();
      if ((currentQuota.tokensUsed || 0) >= DAILY_TOKEN_CAP) {
        setIsScanning(false);
        setOcrError(
          'Daily invoice auto-scan limit reached for today. Limit resets at 00:00 midnight. Please enter invoices manually.'
        );
        return;
      }

      // 2. Prepare optimized base64 image data URL
      setScanStatusText('Preparing document image...');
      const imageDataUrl = await convertFileToImageDataUrl(file);

        // 3. Connect to Document Extraction Engine
        setScanStatusText('Analyzing invoice & extracting line items...');
        const apiKey = OPENAI_API_KEY;
        if (!apiKey || !apiKey.startsWith('sk-')) {
          throw new Error('Invoice extraction key is missing or invalid. Please check VITE_OPENAI_API_KEY.');
        }

        const response = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`
          },
          body: JSON.stringify({
            model: HARDCAPPED_MODEL,
            response_format: { type: 'json_object' },
            messages: [
              {
                role: 'system',
                content: `You are an expert Indian Pharmaceutical B2B Invoice & Inward Stock Parser specializing in Kerala/Indian wholesale distributor tax invoices (e.g., Kallatt Drug Lines, Sabari, Can Drug House).
Examine the provided distributor tax invoice image with extreme optical precision and extract header details and ALL medicine line items into valid JSON matching this schema:
{
  "supplierName": string,
  "invoiceNo": string,
  "invoiceDate": string,
  "isCash": boolean,
  "items": [
    {
      "name": string,
      "generic": string,
      "batch": string,
      "exp": string,
      "wQty": number,
      "freeQty": number,
      "packSize": number,
      "ptr": number,
      "mrp": number,
      "taxPercent": number,
      "confidence": number
    }
  ]
}

MANDATORY INDIAN PHARMA INVOICE RULES:
1. CRITICAL COLUMN ORDER: In Indian pharma distributor invoices, the column sequence almost always puts MRP BEFORE Rate/PTR! 
   Table columns are usually: [Product Name] [Pack] [Batch] [Exp] [Qty] [Free/Sch] [MRP] [Rate / PTR] [Disc%] [GST%] [Taxable / Net]
   DO NOT CONFUSE MRP AND RATE:
   - MRP is the Maximum Retail Price printed for the customer.
   - PTR (Purchase To Retailer) is the Rate / Cost price per pack billed to the pharmacy.
   - FUNDAMENTAL INVARIANT: MRP IS ALWAYS STRICTLY GREATER THAN PTR (MRP > PTR). The Rate/PTR is roughly 20% to 30% lower than MRP. Never assign a value higher than MRP to PTR!
2. QUANTITY VS PACK SIZE:
   - "wQty" is the BILLED QUANTITY (number of packs/strips/bottles ordered, e.g. 2, 5, 10, 30).
   - "packSize" is the packing specification (e.g., if column says 10'S, 10T, 1x10, packSize is 10; if 100ml, packSize is 1).
   - DO NOT copy the pack size (e.g., 10) into wQty! If the invoice says Qty=2, then wQty MUST be 2!
3. FREE SCHEME QUANTITY:
   - "freeQty" is the free bonus scheme items (e.g., under Sch / Free / F.Qty column). If scheme shows 10+2 or free column has 2, wQty=10 and freeQty=2. If no free quantity, freeQty is 0.
4. EXPIRY FORMAT:
   - "exp" must be formatted strictly as MM/YY (e.g. 05/26, 04/27, 11/25).
5. BATCH NUMBER:
   - "batch" must be the exact alphanumeric code (e.g. 2222419, ED2303, KL908).
6. SUPPLIER NAME:
   - "supplierName" must be the exact distributor header name printed at the top of the invoice (e.g. "KALLATT DRUG LINES", "SABARI ENTERPRISES", "THE CAN DRUG HOUSE").`
              },
              {
                role: 'user',
                content: [
                  { type: 'text', text: 'Extract all medicine line items, batches, expiries, quantities, schemes, and prices from this distributor bill. Pay special attention to column order: MRP is printed before Rate/PTR, and Qty is billed units.' },
                  { type: 'image_url', image_url: { url: imageDataUrl, detail: 'high' } }
                ]
              }
            ],
            temperature: 0.1,
            max_tokens: 3500
          })
        });

        if (!response.ok) {
          const errData = await response.json().catch(() => ({}));
          throw new Error(errData?.error?.message || `Invoice extraction service error (${response.status})`);
        }

        const data = await response.json();

        // 4. Update Token Quota & Usage
        const tokensConsumed = data.usage?.total_tokens || 2200;
        const updatedQuota = updateDailyTokenUsage(tokensConsumed);
        setQuotaData(updatedQuota);

        setScanStatusText('Parsing medicines, batches, expiries & bonus schemes...');
        const rawContent = data.choices?.[0]?.message?.content || '{}';
        const parsed = JSON.parse(rawContent);

        // 5. Match Supplier with Local Database or Dynamically Register Scanned Distributor
        let detectedSupplier = null;
        const extractedSupplier = (parsed.supplierName || '').trim().toUpperCase();
        for (const s of allSuppliers) {
          const key = s.name.toUpperCase().split(' ')[0];
          if (key.length >= 3 && extractedSupplier.includes(key)) {
            detectedSupplier = s;
            break;
          }
        }
        if (!detectedSupplier) {
          if (extractedSupplier) {
            // Dynamically register the scanned distributor so the user doesn't get defaulted to the wrong vendor
            const newCode = 'D' + Math.floor(100 + Math.random() * 900);
            detectedSupplier = {
              code: newCode,
              name: extractedSupplier,
              address: 'DISTRIBUTOR INVOICE',
              creditDays: 21
            };
            setAllSuppliers(prev => {
              const updated = [detectedSupplier, ...prev];
              try {
                const custom = JSON.parse(localStorage.getItem('beta_pharma_custom_suppliers') || '[]');
                localStorage.setItem('beta_pharma_custom_suppliers', JSON.stringify([detectedSupplier, ...custom]));
              } catch (e) {}
              return updated;
            });
          } else {
            detectedSupplier = allSuppliers[0] || null;
          }
        }

        // 6. Clean and format line items with strict pharma sanity invariants
        const rawItems = Array.isArray(parsed.items) ? parsed.items : [];
        const cleanedItems = rawItems.map(it => {
          const wQty = Number.parseInt(it.wQty, 10) || 0;
          const freeQty = Number.parseInt(it.freeQty, 10) || 0;
          const packSize = Number.parseInt(it.packSize, 10) || 0;
          const ptr = Number.parseFloat(it.ptr) || 0;
          const mrp = Number.parseFloat(it.mrp) || 0;
          const parsedTax = Number(it.taxPercent);
          const taxPercent = Number.isFinite(parsedTax) ? parsedTax : null;

          return {
            name: String(it.name || '').trim().toUpperCase(),
            generic: it.generic || '',
            batch: String(it.batch || '').trim().toUpperCase(),
            exp: it.exp || '',
            wQty,
            freeQty,
            packSize,
            ptr,
            mrp,
            taxPercent,
            confidence: parseInt(it.confidence) || 98
          };
        });

        setIsScanning(false);
        setExtractedReviewData({
          supplierCode: detectedSupplier.code,
          supplierName: detectedSupplier.name,
          invoiceNo: String(parsed.invoiceNo || '').trim(),
          invoiceDate: String(parsed.invoiceDate || '').trim(),
          isCash: typeof parsed.isCash === 'boolean' ? parsed.isCash : false,
          items: cleanedItems
        });
    } catch (err) {
      console.error('Invoice Extract Error:', err);
      setIsScanning(false);
      setOcrError(`Extraction error: ${err.message}. You can enter invoice manually.`);
    }
  };

  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      handleStartOCRScan(file);
    }
  };

  const handleUpdateReviewItem = (index, field, value) => {
    if (!extractedReviewData) return;
    setExtractedReviewData(prev => {
      const items = [...prev.items];
      items[index] = { ...items[index], [field]: value };
      return { ...prev, items };
    });
  };

  const handleRemoveReviewItem = (index) => {
    if (!extractedReviewData) return;
    setExtractedReviewData(prev => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index)
    }));
  };

  const handleAddReviewRow = () => {
    if (!extractedReviewData) return;
    setExtractedReviewData(prev => ({
      ...prev,
      items: [
        ...prev.items,
        {
          name: '',
          generic: '',
          batch: '',
          exp: '',
          wQty: 0,
          freeQty: 0,
          packSize: 0,
          ptr: 0,
          mrp: 0,
          taxPercent: null,
          confidence: 100
        }
      ]
    }));
  };

  const handleApproveExtractedInvoice = () => {
    if (!extractedReviewData) return;
    if (extractedReviewData.items.length === 0) {
      alert('Cannot import zero items. Please add at least 1 item.');
      return;
    }

    const reviewErrors = [];
    if (!String(extractedReviewData.invoiceNo || '').trim()) reviewErrors.push('invoice number is missing');
    if (!String(extractedReviewData.invoiceDate || '').trim()) reviewErrors.push('invoice date is missing');
    extractedReviewData.items.forEach((it, index) => {
      const label = `Item ${index + 1}`;
      const matched = medicines.find(m => m.name.toLowerCase() === String(it.name || '').toLowerCase());
      if (!matched) reviewErrors.push(`${label}: medicine must be matched/created in the catalog`);
      if (!String(it.batch || '').trim()) reviewErrors.push(`${label}: batch is missing`);
      if (!String(it.exp || '').trim()) reviewErrors.push(`${label}: expiry is missing`);
      if (!(Number(it.wQty) > 0)) reviewErrors.push(`${label}: billed quantity is missing`);
      if (!(Number(it.packSize) > 0)) reviewErrors.push(`${label}: pack size is missing`);
      if (!(Number(it.ptr) > 0)) reviewErrors.push(`${label}: PTR/rate is missing`);
      if (!(Number(it.mrp) > 0)) reviewErrors.push(`${label}: MRP is missing`);
      if (it.taxPercent === null || it.taxPercent === undefined || !Number.isFinite(Number(it.taxPercent))) reviewErrors.push(`${label}: tax rate is missing`);
    });
    if (reviewErrors.length > 0) {
      alert(`Invoice review is incomplete:\n\n- ${reviewErrors.join('\n- ')}\n\nNo values were generated or posted.`);
      return;
    }

    setSupplierCode(extractedReviewData.supplierCode);
    setInvoiceNo(extractedReviewData.invoiceNo);
    setBillDate(extractedReviewData.invoiceDate);
    setIsCash(extractedReviewData.isCash);

    const newItems = extractedReviewData.items.map(it => {
      const matchedCatalog = medicines.find(m => m.name.toLowerCase() === it.name.toLowerCase());
      const medCode = matchedCatalog.code;
      const wQtyInt = parseInt(it.wQty) || 0;
      const freeQtyInt = parseInt(it.freeQty) || 0;
      const packSizeInt = parseInt(it.packSize) || 0;
      const ptrFloat = parseFloat(it.ptr) || 0;
      const mrpFloat = parseFloat(it.mrp) || 0;
      const taxInt = Number(it.taxPercent);
      const lineTotal = +(wQtyInt * ptrFloat).toFixed(2);
      const totalUnits = (wQtyInt + freeQtyInt) * packSizeInt;

      return {
        medCode,
        name: it.name.trim().toUpperCase(),
        batch: it.batch.trim().toUpperCase(),
        exp: it.exp.trim(),
        wQty: wQtyInt,
        packSize: packSizeInt,
        totalUnits,
        freeQty: freeQtyInt,
        replQty: 0,
        mrp: mrpFloat,
        rate: ptrFloat,
        ptr: ptrFloat,
        taxPercent: taxInt,
        total: lineTotal
      };
    });

    setPurchaseItems(prev => [...prev, ...newItems]);
    setIsUploadModalOpen(false);
    setExtractedReviewData(null);
    setSaveSuccessToast(`Approved and inserted ${newItems.length} items from ${extractedReviewData.supplierName} (Bill #${extractedReviewData.invoiceNo})! Review below & click Post.`);
    setTimeout(() => setSaveSuccessToast(''), 5000);
  };


  // Select medicine from autocomplete: Keep new batch & expiry clean for inward typing!
  const handleSelectMedicine = (med) => {
    setSelectedMed(med);
    setSearchMedQuery(med.name);
    setIsMedDropdownOpen(false);

    // CRITICAL: DO NOT copy old batch or old expiry!
    // Inward stock arrives with a brand new batch number and new expiry date on the box.
    setBatchNo('');
    setExpDate('');
    setWQty(10);
    setFreeQty(0);
    setPackSize(med.per || '');
    setMrp(med.mrp || '');
    setPurchaseRate(med.ptr || '');

    // Jump cursor straight to Batch No input field!
    setTimeout(() => {
      batchInputRef.current?.focus();
    }, 50);
  };

  // Add line item to table
  const handleAddLineItem = () => {
    if (!selectedMed) {
      alert('Select an existing catalog medicine first. Create a new product in Product Catalog before receiving its stock.');
      medSearchInputRef.current?.focus();
      return;
    }
    if (!batchNo.trim()) {
      alert('Enter new Batch Number from the box');
      batchInputRef.current?.focus();
      return;
    }
    if (!normalizeExpiry(expDate)) {
      alert('Enter Expiry Date (MM/YY)');
      expInputRef.current?.focus();
      return;
    }
    if (wQty <= 0) {
      alert('Billed packs must be at least 1');
      qtyInputRef.current?.focus();
      return;
    }
    if (!(Number(packSize) > 0) || !(Number(mrp) > 0) || !(Number(purchaseRate) > 0)) {
      alert('Pack size, MRP and purchase rate must come from the invoice and must be greater than zero.');
      return;
    }
    if (taxPercent === '' || !Number.isFinite(Number(taxPercent)) || Number(taxPercent) < 0) {
      alert('Enter the invoice GST rate. The POS will not assume 12%.');
      return;
    }

    const medName = selectedMed ? selectedMed.name : searchMedQuery.toUpperCase();
    const medCode = selectedMed.code;
    const lineTotal = +(wQty * purchaseRate).toFixed(2);
    const totalUnits = (wQty + freeQty + replQty) * packSize;

    const newItem = {
      medCode,
      name: medName,
      batch: batchNo.trim().toUpperCase(),
      exp: normalizeExpiry(expDate),
      wQty: parseInt(wQty),
      packSize: parseInt(packSize),
      totalUnits,
      freeQty: parseInt(freeQty) || 0,
      replQty: parseInt(replQty) || 0,
      mrp: parseFloat(mrp) || 0,
      rate: parseFloat(purchaseRate) || 0,
      ptr: parseFloat(purchaseRate) || 0,
      taxPercent: Number(taxPercent),
      total: lineTotal
    };

    setPurchaseItems(prev => [...prev, newItem]);

    // Reset line fields for next item
    setSelectedMed(null);
    setSearchMedQuery('');
    setBatchNo('');
    setExpDate('');
    setWQty(10);
    setFreeQty(0);

    medSearchInputRef.current?.focus();
  };

  const handleRemoveItem = (index) => {
    setPurchaseItems(prev => prev.filter((_, i) => i !== index));
  };

  // Financial totals
  const grossTotal = purchaseItems.reduce((acc, it) => acc + it.total, 0);
  const gstAmount = +purchaseItems.reduce((sum, it) => sum + ((Number(it.total) || 0) * (Number(it.taxPercent) || 0) / 100), 0).toFixed(2);
  const netPayable = Math.round(grossTotal + gstAmount - cashDiscount);
  const totalBilledPacks = purchaseItems.reduce((acc, it) => acc + it.wQty, 0);
  const totalFreePacks = purchaseItems.reduce((acc, it) => acc + it.freeQty, 0);
  const totalInwardUnits = purchaseItems.reduce((acc, it) => acc + it.totalUnits, 0);

  // 1. Park Current Inward Draft (F12)
  const handleParkPurchase = () => {
    if (purchaseItems.length === 0) {
      alert('Cannot park an empty purchase entry. Add at least one item first.');
      return;
    }
    const draftId = `DRF-${Date.now().toString().slice(-6)}`;
    const newDraft = {
      id: draftId,
      date: billDate,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      supplierCode,
      supplierName: currentSupplier?.name || 'Selected Distributor',
      invoiceNo: invoiceNo.trim() || 'DRAFT',
      isCash,
      items: [...purchaseItems],
      itemsCount: purchaseItems.length,
      grossTotal,
      netPayable
    };

    const updated = [newDraft, ...parkedPurchases];
    setParkedPurchases(updated);
    try {
      localStorage.setItem('beta_pharma_parked_purchases', JSON.stringify(updated));
    } catch (e) {}

    setInvoiceNo('');
    setPurchaseItems([]);
    setEditingVoucher(null);
    setSaveSuccessToast(`Purchase draft #${newDraft.invoiceNo} parked in Hold Queue (F12)! Form cleared.`);
    setTimeout(() => setSaveSuccessToast(''), 4500);
  };

  // 2. Resume Parked Draft
  const handleResumeDraft = (draft) => {
    if (purchaseItems.length > 0 && !confirm('Active purchase table has items. Discard and load parked draft #' + draft.invoiceNo + '?')) {
      return;
    }
    setSupplierCode(draft.supplierCode);
    setInvoiceNo(draft.invoiceNo === 'DRAFT' ? '' : draft.invoiceNo);
    setBillDate(draft.date);
    setIsCash(!!draft.isCash);
    setPurchaseItems(draft.items || []);
    setEditingVoucher(null);

    const remaining = parkedPurchases.filter(p => p.id !== draft.id);
    setParkedPurchases(remaining);
    try {
      localStorage.setItem('beta_pharma_parked_purchases', JSON.stringify(remaining));
    } catch (e) {}

    setIsParkedModalOpen(false);
    setActiveTab('entry');
    setSaveSuccessToast(`Resumed parked purchase draft #${draft.invoiceNo}!`);
    setTimeout(() => setSaveSuccessToast(''), 4000);
  };

  // 3. Discard Parked Draft
  const handleDeleteDraft = (draftId, e) => {
    if (e) e.stopPropagation();
    if (!confirm('Are you sure you want to discard this parked draft?')) return;
    const remaining = parkedPurchases.filter(p => p.id !== draftId);
    setParkedPurchases(remaining);
    try {
      localStorage.setItem('beta_pharma_parked_purchases', JSON.stringify(remaining));
    } catch (e) {}
  };

  // 4. Load Previous Inward Voucher for Revision & Appending Items
  const handleEditVoucher = (voucher) => {
    if (purchaseItems.length > 0 && !confirm(`Active entry table has items. Discard and load Voucher #${voucher.purNo} (${voucher.supplier}) for revision?`)) {
      return;
    }
    setEditingVoucher({
      purNo: voucher.purNo,
      billNo: voucher.billNo,
      supplier: voucher.supplier,
      originalItems: [...(voucher.items || [])]
    });
    if (voucher.supplierCode) {
      setSupplierCode(voucher.supplierCode);
    }
    setInvoiceNo(voucher.billNo || '');
    setBillDate(voucher.date || billDate);
    setPurchaseItems([...(voucher.items || [])]);
    setActiveTab('entry');
    setSaveSuccessToast(`Loaded Voucher #${voucher.purNo}! Add forgotten items or revise quantities below.`);
    setTimeout(() => setSaveSuccessToast(''), 5000);
  };

  // 5. Cancel Revision Mode
  const handleCancelRevision = () => {
    if (confirm('Cancel revising Voucher #' + editingVoucher?.purNo + '? Any unsaved modifications will be discarded.')) {
      setEditingVoucher(null);
      setInvoiceNo('');
      setPurchaseItems([]);
    }
  };

  // F12 Keyboard Shortcut for Parking and Restoring Drafts
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'F12' && activeTab === 'entry') {
        e.preventDefault();
        if (purchaseItems.length > 0) {
          handleParkPurchase();
        } else if (parkedPurchases.length > 0) {
          setIsParkedModalOpen(true);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [purchaseItems, parkedPurchases, supplierCode, invoiceNo, billDate, isCash, grossTotal, netPayable, activeTab]);

  // Post or Update Purchase Invoice
  const handlePostPurchase = async () => {
    if (!invoiceNo.trim()) {
      alert('Please enter Distributor Bill / Invoice Number');
      return;
    }
    if (purchaseItems.length === 0) {
      alert('Add at least one medicine item to post this purchase voucher');
      return;
    }

    if (editingVoucher) {
      // ATOMIC REVISION OF EXISTING VOUCHER
      const updatedVoucher = {
        purNo: editingVoucher.purNo,
        billNo: invoiceNo.trim(),
        supplier: currentSupplier.name,
        supplierCode: currentSupplier.code,
        supplierName: currentSupplier.name,
        date: billDate,
        billDate,
        amount: netPayable,
        totalAmount: netPayable,
        balanceDue: netPayable,
        paidAmount: 0,
        creditDays: currentSupplier.creditDays || 21,
        itemsCount: purchaseItems.length,
        items: purchaseItems,
        status: 'DUE',
        revisedAt: new Date().toISOString()
      };

      // Calculate inventory delta before changing the saved voucher.
      let deltaItems = [];
      if (onUpdateCatalogStock) {
        deltaItems = purchaseItems.map(item => {
          const orig = (editingVoucher.originalItems || []).find(o => 
            (o.batch === item.batch || o.batch_no === item.batch) && 
            (o.medCode === item.medCode || (o.name && o.name.toLowerCase() === item.name.toLowerCase()))
          );
          const origUnits = orig ? (orig.totalUnits || (orig.wQty || 0) * (orig.packSize || 10)) : 0;
          const diffUnits = item.totalUnits - origUnits;
          return {
            ...item,
            totalUnits: diffUnits
          };
        });

        const reductions = deltaItems.filter(it => it.totalUnits < 0);
        if (reductions.length > 0) {
          alert('This revision reduces previously inwarded stock. Use a supplier return/authorized stock adjustment so the reduction has its own audit record. The voucher was not changed.');
          return;
        }
        deltaItems = deltaItems.filter(it => it.totalUnits > 0);

        if (deltaItems.length > 0) {
          const result = await onUpdateCatalogStock(deltaItems, updatedVoucher);
          if (result?.success === false) return;
        }
      }

      setSavedVouchers(prev => {
        const updated = prev.map(v => v.purNo === editingVoucher.purNo ? updatedVoucher : v);
        try {
          localStorage.setItem('beta_pharma_purchase_bills', JSON.stringify(updated));
        } catch (e) {}
        return updated;
      });

      setSaveSuccessToast(`✓ Purchase Voucher #${editingVoucher.purNo} revised and updated in stock!`);
      setTimeout(() => setSaveSuccessToast(''), 4500);

      setEditingVoucher(null);
      setInvoiceNo('');
      setPurchaseItems([]);
      return;
    }

    // NEW VOUCHER POSTING
    const voucherNumber = '0' + (6927 + savedVouchers.length + 1);

    const newVoucher = {
      purNo: voucherNumber,
      billNo: invoiceNo.trim(),
      supplier: currentSupplier.name,
      supplierCode: currentSupplier.code,
      supplierName: currentSupplier.name,
      date: billDate,
      billDate,
      amount: netPayable,
      totalAmount: netPayable,
      balanceDue: netPayable,
      paidAmount: 0,
      creditDays: currentSupplier.creditDays || 21,
      itemsCount: purchaseItems.length,
      items: purchaseItems,
      status: 'DUE'
    };

    // Commit inventory first; only then record the payable voucher and show success.
    if (onUpdateCatalogStock) {
      const result = await onUpdateCatalogStock(purchaseItems, newVoucher);
      if (result?.success === false) return;
    }

    setSavedVouchers(prev => {
      const updated = [newVoucher, ...prev];
      try {
        localStorage.setItem('beta_pharma_purchase_bills', JSON.stringify(updated));
      } catch (e) {}
      return updated;
    });

    setSaveSuccessToast(`Purchase Voucher #${voucherNumber} posted! Added ${totalInwardUnits} units to stock.`);
    setTimeout(() => setSaveSuccessToast(''), 4500);

    // Reset bill
    setInvoiceNo('');
    setPurchaseItems([]);
  };

  return (
    <div className={`flex-1 flex flex-col overflow-hidden font-sans transition-colors ${
      theme === 'dark' ? 'bg-zinc-950 text-zinc-100' : 'bg-white text-slate-950'
    }`}>
      {/* Toast Notification */}
      {saveSuccessToast && (
        <div className="absolute top-16 right-6 z-50 bg-emerald-600 text-white px-4 py-2.5 rounded-lg shadow-xl font-mono font-bold text-xs flex items-center space-x-2 animate-bounce">
          <CheckCircle2 className="w-4 h-4" />
          <span>{saveSuccessToast}</span>
        </div>
      )}

      {/* Header */}
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
              <h2 className={`text-base font-black ${isDark ? 'text-white' : 'text-slate-950'}`}>
                Purchase Inward Entry [TRN003 / PURCHASE.DBF]
              </h2>
              <span className={`text-xs font-mono font-bold px-2 py-0.5 rounded border ${
                isDark 
                  ? 'bg-emerald-950 text-emerald-300 border-emerald-800' 
                  : 'bg-emerald-100 text-emerald-950 border-emerald-300'
              }`}>
                Inward Stock & Scheme Ledger
              </span>
            </div>
            <p className={`text-xs font-mono mt-0.5 font-semibold ${
              isDark ? 'text-zinc-400' : 'text-slate-600'
            }`}>
              Distributor bill receipt, free schemes (10+1 / 10+2), PTR, new batch creation & stock updating
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          {/* Upload / OCR Distributor Invoice Button */}
          {activeTab === 'entry' && (
            <button
              onClick={() => {
                setIsUploadModalOpen(true);
                setExtractedReviewData(null);
                setIsScanning(false);
              }}
              className="py-1.5 px-3 rounded-lg border text-xs font-bold font-mono transition flex items-center space-x-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 border-amber-600 shadow-sm cursor-pointer"
              title="Upload Distributor Invoice PDF or Photo to auto-extract details"
            >
              <Camera className="w-4 h-4 text-slate-950" />
              <span className="hidden md:inline">Upload Bill</span>
            </button>
          )}

          {/* Park Purchase Draft Button (F12) */}
          {activeTab === 'entry' && (
            <button
              onClick={handleParkPurchase}
              disabled={purchaseItems.length === 0}
              className={`py-1.5 px-3 rounded-lg border text-xs font-bold font-mono transition flex items-center space-x-1 ${
                purchaseItems.length > 0
                  ? (isDark ? 'border-amber-600 bg-amber-500/10 text-amber-400 hover:bg-amber-500/20 cursor-pointer' : 'border-amber-400 bg-amber-50 text-amber-800 hover:bg-amber-100 cursor-pointer shadow-xs')
                  : (isDark ? 'border-zinc-800 text-zinc-600 cursor-not-allowed' : 'border-slate-200 text-slate-400 cursor-not-allowed')
              }`}
              title="Park in-progress purchase invoice into Drafts (F12)"
            >
              <span>Park (F12)</span>
            </button>
          )}

          {/* Parked Drafts Counter Pill */}
          {parkedPurchases.length > 0 && (
            <button
              onClick={() => setIsParkedModalOpen(true)}
              className="py-1.5 px-2.5 rounded-lg font-black text-xs font-mono bg-amber-600 hover:bg-amber-500 text-white shadow transition cursor-pointer flex items-center space-x-1"
              title="Click to view and resume parked purchase drafts"
            >
              <span>Drafts ({parkedPurchases.length})</span>
            </button>
          )}

          {/* Previous Inwards Register Toggle */}
          <button
            onClick={() => setActiveTab(activeTab === 'entry' ? 'vouchers' : 'entry')}
            className={`py-1.5 px-3 rounded-lg border text-xs font-bold font-mono transition flex items-center space-x-1.5 cursor-pointer ${
              activeTab === 'vouchers'
                ? 'bg-sky-600 text-white border-sky-600 shadow'
                : (isDark ? 'border-zinc-700 bg-zinc-800 text-zinc-300 hover:bg-zinc-700' : 'border-slate-300 bg-white text-slate-800 hover:bg-slate-50 shadow-sm')
            }`}
          >
            <span>Previous Inwards ({savedVouchers.length})</span>
          </button>

          {/* Post Purchase Button */}
          {activeTab === 'entry' && (
            <button
              onClick={handlePostPurchase}
              disabled={purchaseItems.length === 0}
              className={`py-1.5 px-4 rounded-lg font-black text-xs flex items-center space-x-1.5 transition shadow ${
                purchaseItems.length > 0
                  ? (editingVoucher ? 'bg-indigo-600 hover:bg-indigo-500 text-white cursor-pointer' : 'bg-emerald-600 hover:bg-emerald-500 text-white cursor-pointer')
                  : (isDark ? 'bg-zinc-800 text-zinc-600 cursor-not-allowed' : 'bg-slate-300 text-slate-500 cursor-not-allowed')
              }`}
            >
              <FileCheck className="w-4 h-4" />
              <span>{editingVoucher ? `Update Voucher #${editingVoucher.purNo}` : 'Post & Update Stock'}</span>
            </button>
          )}
        </div>
      </div>

      {/* Revision Alert Banner */}
      {editingVoucher && activeTab === 'entry' && (
        <div className="px-4 py-2 bg-indigo-600 text-white text-xs font-mono font-bold flex items-center justify-between shadow-inner">
          <div className="flex items-center space-x-2">
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse"></span>
            <span>
              REVISING PREVIOUS VOUCHER #{editingVoucher.purNo} (Dist. Bill: {editingVoucher.billNo || '0000'} • {editingVoucher.supplier}) — Add forgotten items or revise quantities below. Only delta units will be added to stock.
            </span>
          </div>
          <button
            onClick={handleCancelRevision}
            className="px-2.5 py-0.5 rounded bg-white/20 hover:bg-white/30 text-white text-[11px] font-black cursor-pointer transition"
          >
            Cancel Revision
          </button>
        </div>
      )}

      {activeTab === 'entry' ? (
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* 1. Distributor Invoice Header Fields */}
          <div className={`p-3 border-b grid grid-cols-12 gap-3 text-xs font-mono ${
            isDark ? 'bg-zinc-900/50 border-zinc-800' : 'bg-slate-50 border-slate-200'
          }`}>
            {/* Searchable Supplier Selector */}
            <div className="col-span-4 relative" ref={supplierDropdownRef}>
              <div className="flex items-center justify-between mb-1">
                <label className={`block text-[10px] font-black uppercase ${
                  isDark ? 'text-zinc-300' : 'text-slate-900'
                }`}>
                  Supplier / Distributor [SUPPMAST]
                </label>
                <span className="text-[10px] text-slate-400 font-mono font-bold">
                  {allSuppliers.length} on file
                </span>
              </div>

              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                <input
                  type="text"
                  value={isSupplierDropdownOpen ? supplierSearchQuery : (currentSupplier ? `${currentSupplier.code} - ${currentSupplier.name}` : '')}
                  onFocus={(e) => {
                    setIsSupplierDropdownOpen(true);
                    setSupplierSearchQuery(currentSupplier ? currentSupplier.name : '');
                    e.target.select();
                  }}
                  onChange={(e) => {
                    setSupplierSearchQuery(e.target.value);
                    if (!isSupplierDropdownOpen) setIsSupplierDropdownOpen(true);
                  }}
                  onBlur={() => {
                    setTimeout(() => {
                      if (supplierSearchQuery.trim()) {
                        handleCommitSupplier(supplierSearchQuery);
                      }
                    }, 150);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === 'Tab') {
                      if (supplierSearchQuery.trim()) {
                        e.preventDefault();
                        handleCommitSupplier(supplierSearchQuery);
                        document.getElementById('dist-bill-no-input')?.focus();
                      }
                    } else if (e.key === 'Escape') {
                      setIsSupplierDropdownOpen(false);
                      setSupplierSearchQuery('');
                    }
                  }}
                  placeholder="Type distributor name or code to search or add new..."
                  className={`w-full py-1.5 pl-8 pr-7 rounded border font-bold text-xs focus:ring-2 focus:ring-sky-500 font-mono ${
                    isDark ? 'bg-zinc-950 border-zinc-700 text-white' : 'bg-white border-slate-400 text-slate-950 shadow-sm'
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setIsSupplierDropdownOpen(!isSupplierDropdownOpen)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 cursor-pointer"
                  title="Toggle suppliers list"
                >
                  <ChevronDown className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Searchable Dropdown List */}
              {isSupplierDropdownOpen && (
                <div className={`absolute left-0 right-0 top-full mt-1 max-h-64 overflow-y-auto rounded-lg border shadow-2xl z-50 py-1 font-mono text-xs ${
                  isDark ? 'bg-zinc-900 border-zinc-700 text-zinc-100' : 'bg-white border-slate-300 text-slate-900'
                }`}>
                  <div className={`px-2 py-1 text-[10px] font-bold border-b uppercase ${
                    isDark ? 'bg-zinc-950 border-zinc-800 text-slate-400' : 'bg-slate-100 border-slate-200 text-slate-600'
                  }`}>
                    Showing {filteredSuppliers.length} of {allSuppliers.length} distributors (Type to filter or add new)
                  </div>

                  {/* One-click option to add custom distributor if user typed something */}
                  {supplierSearchQuery.trim().length > 0 && (
                    <div
                      onClick={() => handleCommitSupplier(supplierSearchQuery)}
                      className={`px-3 py-2 cursor-pointer flex items-center justify-between border-b transition ${
                        isDark ? 'bg-sky-950/80 text-sky-200 hover:bg-sky-900 border-sky-800' : 'bg-sky-100 text-sky-900 hover:bg-sky-200 border-sky-300'
                      }`}
                    >
                      <div className="flex items-center space-x-2">
                        <Plus className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                        <span className="font-bold">
                          Use / Add "<span className="text-emerald-400 font-black">{supplierSearchQuery.trim().toUpperCase()}</span>" as New Distributor
                        </span>
                      </div>
                      <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-sky-600 text-white shrink-0">
                        Press Enter
                      </span>
                    </div>
                  )}
                  {filteredSuppliers.map((s, idx) => {
                    const isSelected = s.code === supplierCode;
                    return (
                      <div
                        key={idx}
                        onClick={() => {
                          handleSupplierChange(s.code);
                          setIsSupplierDropdownOpen(false);
                          setSupplierSearchQuery('');
                        }}
                        className={`px-3 py-1.5 cursor-pointer flex items-center justify-between border-b border-inherit last:border-b-0 transition ${
                          isSelected
                            ? 'bg-sky-600 text-white font-black'
                            : (isDark ? 'hover:bg-zinc-800' : 'hover:bg-sky-50')
                        }`}
                      >
                        <div className="truncate pr-2">
                          <span className={`font-mono font-bold mr-2 ${isSelected ? 'text-white' : 'text-amber-500'}`}>
                            {s.code}
                          </span>
                          <span className="font-bold">{s.name}</span>
                          {s.address && (
                            <span className={`text-[10px] ml-2 block truncate ${isSelected ? 'text-sky-100' : 'text-slate-400'}`}>
                              {s.address}
                            </span>
                          )}
                        </div>
                        {isSelected && <Check className="w-3.5 h-3.5 shrink-0" />}
                      </div>
                    );
                  })}
                  {filteredSuppliers.length === 0 && (
                    <div className="p-3 text-center text-slate-400 text-xs">
                      No matching distributor found for "{supplierSearchQuery}"
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Distributor Bill Number */}
            <div className="col-span-2">
              <label className={`block text-[10px] font-black uppercase mb-1 ${
                isDark ? 'text-zinc-300' : 'text-slate-900'
              }`}>
                Dist. Bill No [BILL_NO]
              </label>
              <input
                id="dist-bill-no-input"
                type="text"
                value={invoiceNo}
                onChange={(e) => setInvoiceNo(e.target.value)}
                placeholder="Enter Bill No"
                className={`w-full py-1.5 px-2.5 rounded border font-black text-xs font-mono focus:ring-2 focus:ring-sky-500 ${
                  isDark ? 'bg-zinc-950 border-zinc-700 text-sky-400 placeholder-zinc-500' : 'bg-white border-slate-400 text-sky-900 placeholder-slate-400 shadow-sm'
                }`}
              />
            </div>

            {/* Bill Date */}
            <div className="col-span-2">
              <label className={`block text-[10px] font-black uppercase mb-1 ${
                isDark ? 'text-zinc-300' : 'text-slate-900'
              }`}>
                Bill Date [BILL_DT]
              </label>
              <input
                type="text"
                value={billDate}
                onChange={(e) => setBillDate(e.target.value)}
                placeholder="DD/MM/YYYY"
                className={`w-full py-1.5 px-2 text-center rounded border font-bold text-xs focus:ring-2 focus:ring-sky-500 ${
                  isDark ? 'bg-zinc-950 border-zinc-700 text-white' : 'bg-white border-slate-400 text-slate-950 shadow-sm'
                }`}
              />
            </div>

            {/* Terms (Credit / Cash) */}
            <div className="col-span-2">
              <label className={`block text-[10px] font-black uppercase mb-1 ${
                isDark ? 'text-zinc-300' : 'text-slate-900'
              }`}>
                Terms [CASH]
              </label>
              <div className="flex items-center space-x-1">
                <button
                  type="button"
                  onClick={() => setIsCash(false)}
                  className={`flex-1 py-1 rounded text-xs font-bold border transition ${
                    !isCash
                      ? 'bg-sky-600 text-white border-sky-600 shadow-sm'
                      : (isDark ? 'border-zinc-700 text-zinc-400' : 'border-slate-300 text-slate-700')
                  }`}
                >
                  Credit
                </button>
                <button
                  type="button"
                  onClick={() => setIsCash(true)}
                  className={`flex-1 py-1 rounded text-xs font-bold border transition ${
                    isCash
                      ? 'bg-sky-600 text-white border-sky-600 shadow-sm'
                      : (isDark ? 'border-zinc-700 text-zinc-400' : 'border-slate-300 text-slate-700')
                  }`}
                >
                  Cash
                </button>
              </div>
            </div>

            {/* Cash Discount (LESS) */}
            <div className="col-span-2">
              <label className={`block text-[10px] font-black uppercase mb-1 ${
                isDark ? 'text-zinc-300' : 'text-slate-900'
              }`}>
                Cash Disc ₹ [LESS]
              </label>
              <input
                type="number"
                min="0"
                value={cashDiscount}
                onChange={(e) => setCashDiscount(parseFloat(e.target.value) || 0)}
                className={`w-full py-1.5 px-2 rounded border font-bold text-xs focus:ring-2 focus:ring-sky-500 ${
                  isDark ? 'bg-zinc-950 border-zinc-700 text-white' : 'bg-white border-slate-400 text-slate-950 shadow-sm'
                }`}
              />
            </div>
          </div>

          {/* 2. Interactive Line Item Inward Entry Bar WITH CLEAR COLUMN LABELS */}
          <div className={`p-3 border-b font-mono ${
            isDark ? 'bg-zinc-900 border-zinc-800' : 'bg-slate-100 border-slate-300'
          }`}>
            <div className={`text-[11px] font-black uppercase mb-2 flex items-center space-x-1 ${
              isDark ? 'text-zinc-100' : 'text-slate-950'
            }`}>
              <Plus className="w-3.5 h-3.5 text-sky-600" />
              <span>Add Inward Line Item (Type New Batch, Expiry & Billed Quantities)</span>
            </div>

            <div className="grid grid-cols-12 gap-2 text-xs">
              {/* Column 1: Product Lookup */}
              <div className="col-span-4 relative">
                <label className={`block text-[10px] font-black uppercase tracking-wider mb-1 ${
                  isDark ? 'text-zinc-300' : 'text-slate-900'
                }`}>
                  Product Name / Salt
                </label>
                <input
                  ref={medSearchInputRef}
                  type="text"
                  value={searchMedQuery}
                  onChange={(e) => {
                    setSearchMedQuery(e.target.value);
                    setIsMedDropdownOpen(e.target.value.trim().length > 0);
                  }}
                  onFocus={() => {
                    if (searchMedQuery.trim().length > 0) setIsMedDropdownOpen(true);
                  }}
                  placeholder="Search 24k medicine catalog..."
                  className={`w-full py-1.5 px-3 rounded border font-black text-xs font-sans focus:ring-2 focus:ring-sky-500 ${
                    isDark ? 'bg-zinc-950 border-zinc-700 text-white placeholder-zinc-500' : 'bg-white border-slate-400 text-slate-950 placeholder-slate-500 shadow-sm'
                  }`}
                />

                {isMedDropdownOpen && filteredMeds.length > 0 && (
                  <div className={`absolute left-0 top-full mt-1 w-full max-h-56 overflow-y-auto rounded-lg border shadow-xl z-50 divide-y font-sans ${
                    isDark ? 'bg-zinc-900 border-zinc-700 divide-zinc-800 text-white' : 'bg-white border-slate-300 divide-slate-100 text-slate-950'
                  }`}>
                    {filteredMeds.map((med, idx) => (
                      <div
                        key={idx}
                        onMouseDown={() => handleSelectMedicine(med)}
                        className={`p-2 cursor-pointer hover:bg-sky-600 hover:text-white flex items-center justify-between ${
                          isDark ? 'hover:bg-zinc-800' : 'hover:bg-sky-50'
                        }`}
                      >
                        <div>
                          <div className="font-bold text-xs">{med.name}</div>
                          <div className="text-[10px] opacity-70 font-mono">{med.generic || med.company}</div>
                        </div>
                        <div className="text-right text-[11px] font-mono font-bold">
                          <div>₹{(med.mrp || 0).toFixed(2)}</div>
                          <div className="text-[10px] text-amber-500">Rack {med.rack}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Column 2: New Batch No */}
              <div className="col-span-2">
                <label className={`block text-[10px] font-black uppercase tracking-wider mb-1 ${
                  isDark ? 'text-zinc-300' : 'text-slate-900'
                }`}>
                  New Batch No
                </label>
                <input
                  ref={batchInputRef}
                  type="text"
                  value={batchNo}
                  onChange={(e) => setBatchNo(e.target.value.toUpperCase())}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') expInputRef.current?.focus();
                  }}
                  placeholder="e.g. BATCH2026"
                  className={`w-full py-1.5 px-2 rounded border font-black text-xs uppercase focus:ring-2 focus:ring-sky-500 ${
                    isDark ? 'bg-zinc-950 border-zinc-700 text-white' : 'bg-white border-slate-400 text-slate-950 shadow-sm'
                  }`}
                />
              </div>

              {/* Column 3: Expiry (MM/YY) */}
              <div className="col-span-1">
                <label className={`block text-[10px] font-black uppercase tracking-wider mb-1 text-center ${
                  isDark ? 'text-zinc-300' : 'text-slate-900'
                }`}>
                  Expiry (MM/YY)
                </label>
                <input
                  ref={expInputRef}
                  type="text"
                  value={expDate}
                  onChange={(e) => setExpDate(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') qtyInputRef.current?.focus();
                  }}
                  placeholder="08/29"
                  className={`w-full py-1.5 px-1.5 text-center rounded border font-black text-xs focus:ring-2 focus:ring-sky-500 ${
                    isDark ? 'bg-zinc-950 border-zinc-700 text-white' : 'bg-white border-slate-400 text-slate-950 shadow-sm'
                  }`}
                />
              </div>

              {/* Column 4: Billed Packs */}
              <div className="col-span-1">
                <label className={`block text-[10px] font-black uppercase tracking-wider mb-1 text-center font-mono rounded px-1 py-0.5 border ${
                  isDark 
                    ? 'text-sky-300 bg-sky-950/80 border-sky-800' 
                    : 'text-sky-950 bg-sky-100 border-sky-300'
                }`}>
                  Billed Packs
                </label>
                <input
                  ref={qtyInputRef}
                  type="number"
                  min="1"
                  value={wQty}
                  onChange={(e) => setWQty(Math.max(1, parseInt(e.target.value) || 0))}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') rateInputRef.current?.focus();
                  }}
                  placeholder="Packs"
                  className={`w-full py-1.5 px-1.5 text-center rounded border font-black text-xs focus:ring-2 focus:ring-sky-500 ${
                    isDark ? 'bg-zinc-950 border-zinc-700 text-sky-400' : 'bg-white border-slate-400 text-sky-900 shadow-sm'
                  }`}
                />
              </div>

              {/* Column 5: Free Scheme (10+1) */}
              <div className="col-span-1">
                <label className={`block text-[10px] font-black uppercase tracking-wider mb-1 text-center font-mono rounded px-1 py-0.5 border ${
                  isDark 
                    ? 'text-emerald-300 bg-emerald-950/80 border-emerald-800' 
                    : 'text-emerald-950 bg-emerald-100 border-emerald-300'
                }`}>
                  Free (10+1)
                </label>
                <input
                  type="number"
                  min="0"
                  value={freeQty}
                  onChange={(e) => setFreeQty(parseInt(e.target.value) || 0)}
                  placeholder="Free"
                  className={`w-full py-1.5 px-1.5 text-center rounded border font-black text-xs focus:ring-2 focus:ring-emerald-500 ${
                    isDark ? 'bg-zinc-950 border-zinc-700 text-emerald-400' : 'bg-white border-slate-400 text-emerald-900 shadow-sm'
                  }`}
                />
              </div>

              {/* Column 6: PTR Cost (₹) */}
              <div className="col-span-1">
                <label className={`block text-[10px] font-black uppercase tracking-wider mb-1 text-center font-mono ${
                  isDark ? 'text-zinc-300' : 'text-slate-900'
                }`}>
                  PTR Cost (₹)
                </label>
                <input
                  ref={rateInputRef}
                  type="number"
                  step="0.01"
                  min="0"
                  value={purchaseRate}
                  onChange={(e) => setPurchaseRate(parseFloat(e.target.value) || 0)}
                  placeholder="Rate"
                  className={`w-full py-1.5 px-1.5 text-center rounded border font-black text-xs focus:ring-2 focus:ring-sky-500 ${
                    isDark ? 'bg-zinc-950 border-zinc-700 text-white' : 'bg-white border-slate-400 text-slate-950 shadow-sm'
                  }`}
                />
              </div>

              {/* Column 7: New M.R.P. (₹) */}
              <div className="col-span-1">
                <label className={`block text-[10px] font-black uppercase tracking-wider mb-1 text-center font-mono ${
                  isDark ? 'text-zinc-300' : 'text-slate-900'
                }`}>
                  M.R.P. (₹)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={mrp}
                  onChange={(e) => setMrp(parseFloat(e.target.value) || 0)}
                  placeholder="MRP"
                  className={`w-full py-1.5 px-1.5 text-center rounded border font-black text-xs focus:ring-2 focus:ring-sky-500 ${
                    isDark ? 'bg-zinc-950 border-zinc-700 text-white' : 'bg-white border-slate-400 text-slate-950 shadow-sm'
                  }`}
                />
              </div>

              {/* Column 8: Add Line Button */}
              <div className="col-span-1 flex flex-col justify-end">
                <label className="block text-[10px] font-bold uppercase tracking-wider text-transparent mb-1 text-center">
                  Add
                </label>
                <button
                  type="button"
                  onClick={handleAddLineItem}
                  className="w-full py-1.5 bg-sky-600 hover:bg-sky-500 text-white font-black rounded text-xs transition flex items-center justify-center space-x-1 shadow"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>+ Add</span>
                </button>
              </div>
            </div>

            {/* Quick helper calculation preview */}
            {selectedMed && (
              <div className={`mt-2 text-[11px] font-mono flex items-center space-x-4 ${
                isDark ? 'text-zinc-400' : 'text-slate-700 font-semibold'
              }`}>
                <span>Pack Size: <strong>{packSize}s</strong></span>
                <span>•</span>
                <span>Total Inward Units: <strong>{(wQty + freeQty) * packSize}</strong> units</span>
                <span>•</span>
                <span>Line Cost: <strong>₹{(wQty * purchaseRate).toFixed(2)}</strong></span>
                <span>•</span>
                <span>Margin: <strong>{(((mrp - purchaseRate) / (mrp || 1)) * 100).toFixed(1)}%</strong></span>
              </div>
            )}
          </div>

          {/* 3. Inward Table Ledger */}
          <div className="flex-1 overflow-y-auto">
            <table className={`w-full text-left border-collapse text-xs font-mono border ${
              isDark ? 'border-zinc-800' : 'border-slate-300'
            }`}>
              <thead>
                <tr className={`border-b text-[11px] uppercase tracking-wider font-extrabold ${
                  isDark ? 'bg-zinc-900 border-zinc-800 text-zinc-100' : 'bg-slate-200 border-slate-300 text-slate-950'
                }`}>
                  <th className="py-2.5 px-3 w-12 text-center border-r border-inherit">Sr</th>
                  <th className="py-2.5 px-3 border-r border-inherit">Product Description</th>
                  <th className="py-2.5 px-3 text-center border-r border-inherit w-28">Batch No</th>
                  <th className="py-2.5 px-3 text-center border-r border-inherit w-24">Expiry</th>
                  <th className={`py-2.5 px-3 text-center border-r border-inherit w-24 font-black ${
                    isDark ? 'text-sky-300 bg-sky-950/60' : 'text-sky-950 bg-sky-100'
                  }`}>Billed Packs</th>
                  <th className={`py-2.5 px-3 text-center border-r border-inherit w-24 font-black ${
                    isDark ? 'text-emerald-300 bg-emerald-950/60' : 'text-emerald-950 bg-emerald-100'
                  }`}>Free Scheme</th>
                  <th className="py-2.5 px-3 text-center border-r border-inherit w-24">Total Units</th>
                  <th className="py-2.5 px-3 text-right border-r border-inherit w-24">P.T.R. (₹)</th>
                  <th className="py-2.5 px-3 text-right border-r border-inherit w-24">M.R.P. (₹)</th>
                  <th className="py-2.5 px-3 text-right border-r border-inherit w-28">Amount (₹)</th>
                  <th className="py-2.5 px-3 text-center w-14">Del</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-inherit">
                {purchaseItems.length === 0 ? (
                  <tr>
                    <td colSpan={11} className="py-12 text-center text-slate-400 font-sans">
                      <Package className="w-8 h-8 mx-auto mb-2 opacity-40 text-slate-500" />
                      <div className={`font-bold text-sm ${isDark ? 'text-zinc-400' : 'text-slate-700'}`}>
                        Purchase voucher is clean and empty
                      </div>
                      <div className={`text-xs font-mono mt-1 ${isDark ? 'text-zinc-500' : 'text-slate-500'}`}>
                        Search and pick a medicine above, type its new batch & expiry, and click "+ Add"
                      </div>
                    </td>
                  </tr>
                ) : (
                  purchaseItems.map((item, idx) => (
                    <tr 
                      key={idx}
                      className={`transition-colors border-b ${
                        isDark ? 'hover:bg-zinc-900 border-zinc-800' : 'hover:bg-sky-50/70 border-slate-300'
                      }`}
                    >
                      <td className={`py-2 px-3 text-center font-bold border-r border-inherit ${
                        isDark ? 'text-zinc-400' : 'text-slate-600'
                      }`}>
                        {idx + 1}
                      </td>

                      <td className="py-2 px-3 font-sans border-r border-inherit">
                        <div className={`font-black text-sm ${isDark ? 'text-white' : 'text-slate-950'}`}>
                          {item.name}
                        </div>
                      </td>

                      <td className={`py-2 px-3 text-center font-bold border-r border-inherit font-mono ${
                        isDark ? 'text-zinc-200' : 'text-slate-900'
                      }`}>
                        {item.batch}
                      </td>

                      <td className={`py-2 px-3 text-center font-bold border-r border-inherit ${
                        isDark ? 'text-zinc-300' : 'text-slate-800'
                      }`}>
                        {item.exp}
                      </td>

                      <td className={`py-2 px-3 text-center font-black border-r border-inherit ${
                        isDark ? 'text-sky-300 bg-sky-950/30' : 'text-sky-950 bg-sky-50'
                      }`}>
                        {item.wQty}
                      </td>

                      <td className={`py-2 px-3 text-center font-black border-r border-inherit ${
                        isDark ? 'bg-emerald-950/20' : 'bg-emerald-50/60'
                      }`}>
                        {item.freeQty > 0 ? (
                          <span className={`font-bold ${isDark ? 'text-emerald-400' : 'text-emerald-700'}`}>
                            +{item.freeQty}
                          </span>
                        ) : (
                          <span className="text-slate-400">-</span>
                        )}
                      </td>

                      <td className={`py-2 px-3 text-center font-bold border-r border-inherit ${
                        isDark ? 'text-zinc-200' : 'text-slate-900'
                      }`}>
                        {item.totalUnits}
                      </td>

                      <td className={`py-2 px-3 text-right font-black border-r border-inherit ${
                        isDark ? 'text-white' : 'text-slate-950'
                      }`}>
                        ₹{item.rate.toFixed(2)}
                      </td>

                      <td className={`py-2 px-3 text-right font-black border-r border-inherit ${
                        isDark ? 'text-zinc-300' : 'text-slate-800'
                      }`}>
                        ₹{item.mrp.toFixed(2)}
                      </td>

                      <td className={`py-2 px-3 text-right font-black border-r border-inherit ${
                        isDark ? 'text-emerald-400' : 'text-emerald-800'
                      }`}>
                        ₹{item.total.toFixed(2)}
                      </td>

                      <td className="py-2 px-3 text-center">
                        <button
                          onClick={() => handleRemoveItem(idx)}
                          className="p-1 text-rose-500 hover:text-rose-700 transition"
                          title="Delete line item"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* 4. Voucher Summary Footer Bar */}
          <div className={`p-3 border-t flex items-center justify-between font-mono ${
            isDark ? 'bg-zinc-900 border-zinc-800 text-zinc-100' : 'bg-slate-100 border-slate-300 text-slate-900'
          }`}>
            <div className="flex items-center space-x-6 text-xs">
              <div>
                <span className={`text-[10px] block uppercase font-bold ${isDark ? 'text-zinc-400' : 'text-slate-600'}`}>Products / Lines:</span>
                <span className={`font-black ${isDark ? 'text-white' : 'text-slate-950'}`}>{purchaseItems.length} Items</span>
              </div>
              <div>
                <span className={`text-[10px] block uppercase font-bold ${isDark ? 'text-zinc-400' : 'text-slate-600'}`}>Billed Packs:</span>
                <span className={`font-black px-1.5 py-0.5 rounded ${
                  isDark ? 'bg-sky-950 text-sky-300 border border-sky-800' : 'bg-sky-100 text-sky-900 border border-sky-300'
                }`}>{totalBilledPacks} Strips</span>
              </div>
              <div>
                <span className={`text-[10px] block uppercase font-bold ${isDark ? 'text-zinc-400' : 'text-slate-600'}`}>Free Schemes:</span>
                <span className={`font-black px-1.5 py-0.5 rounded ${
                  isDark ? 'bg-emerald-950 text-emerald-300 border border-emerald-800' : 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                }`}>+{totalFreePacks} Bonus</span>
              </div>
              <div>
                <span className={`text-[10px] block uppercase font-bold ${isDark ? 'text-zinc-400' : 'text-slate-600'}`}>Total Inward Units:</span>
                <span className={`font-black px-1.5 py-0.5 rounded ${
                  isDark ? 'bg-purple-950 text-purple-300 border border-purple-800' : 'bg-purple-100 text-purple-900 border border-purple-300'
                }`}>{totalInwardUnits} Tablets</span>
              </div>
            </div>

            <div className="flex items-center space-x-6 text-right">
              <div className="text-xs">
                <div className={isDark ? 'text-zinc-400 font-bold' : 'text-slate-600 font-bold'}>Gross: ₹{grossTotal.toFixed(2)}</div>
                <div className={isDark ? 'text-zinc-400 font-bold' : 'text-slate-600 font-bold'}>GST (12%): ₹{gstAmount.toFixed(2)}</div>
              </div>
              <div>
                <div className={`text-[10px] font-black uppercase ${isDark ? 'text-zinc-400' : 'text-slate-600'}`}>Grand Total (Net)</div>
                <div className={`text-2xl font-black ${isDark ? 'text-emerald-400' : 'text-emerald-700'}`}>
                  ₹{netPayable.toFixed(2)}
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* Previous Inwards Register & Revision Tab */
        <div className="flex-1 overflow-hidden flex flex-col font-mono">
          {/* Search Toolbar */}
          <div className={`p-3 border-b flex items-center justify-between ${
            isDark ? 'bg-zinc-900 border-zinc-800' : 'bg-slate-100 border-slate-300'
          }`}>
            <div className="flex items-center space-x-3">
              <div className="relative w-80">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={searchVoucherQuery}
                  onChange={(e) => setSearchVoucherQuery(e.target.value)}
                  placeholder="Search by Bill #, Supplier, or Voucher #..."
                  className={`w-full pl-9 pr-3 py-1.5 rounded-lg border text-xs font-mono font-bold focus:outline-none focus:ring-2 focus:ring-sky-500 ${
                    isDark ? 'bg-zinc-800 border-zinc-700 text-white' : 'bg-white border-slate-300 text-slate-900'
                  }`}
                />
              </div>
              <span className="text-xs text-slate-500 font-mono">
                Showing {savedVouchers.filter(v => {
                  const q = searchVoucherQuery.trim().toLowerCase();
                  if (!q) return true;
                  return (v.billNo && v.billNo.toLowerCase().includes(q)) || 
                         (v.supplier && v.supplier.toLowerCase().includes(q)) || 
                         (v.purNo && v.purNo.toLowerCase().includes(q)) ||
                         (v.date && v.date.includes(q));
                }).length} of {savedVouchers.length} vouchers
              </span>
            </div>

            <button
              onClick={() => setActiveTab('entry')}
              className="py-1.5 px-3 rounded-lg font-bold text-xs bg-sky-600 hover:bg-sky-500 text-white flex items-center space-x-1.5 shadow transition cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>New Purchase Inward</span>
            </button>
          </div>

          {/* Table */}
          <div className="flex-1 overflow-y-auto">
            <table className={`w-full text-left border-collapse text-xs font-mono border ${
              isDark ? 'border-zinc-800' : 'border-slate-300'
            }`}>
              <thead>
                <tr className={`border-b text-[11px] uppercase tracking-wider font-extrabold ${
                  isDark ? 'bg-zinc-900 border-zinc-800 text-zinc-100' : 'bg-slate-200 border-slate-300 text-slate-950'
                }`}>
                  <th className="py-2.5 px-3 w-12 text-center border-r border-inherit">Sr</th>
                  <th className="py-2.5 px-3 text-center border-r border-inherit w-24">Voucher No</th>
                  <th className="py-2.5 px-3 text-center border-r border-inherit w-28">Dist. Bill No</th>
                  <th className="py-2.5 px-3 border-r border-inherit">Distributor Agency</th>
                  <th className="py-2.5 px-3 text-center border-r border-inherit w-28">Inward Date</th>
                  <th className="py-2.5 px-3 text-center border-r border-inherit w-20">Items</th>
                  <th className="py-2.5 px-3 text-right border-r border-inherit w-32">Total Amount (₹)</th>
                  <th className="py-2.5 px-3 text-center border-r border-inherit w-24">Status</th>
                  <th className="py-2.5 px-3 text-center w-36">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-inherit">
                {savedVouchers.filter(v => {
                  const q = searchVoucherQuery.trim().toLowerCase();
                  if (!q) return true;
                  return (v.billNo && v.billNo.toLowerCase().includes(q)) || 
                         (v.supplier && v.supplier.toLowerCase().includes(q)) || 
                         (v.purNo && v.purNo.toLowerCase().includes(q)) ||
                         (v.date && v.date.includes(q));
                }).length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-12 text-center text-slate-500 font-bold font-sans">
                      No matching purchase vouchers found.
                    </td>
                  </tr>
                ) : (
                  savedVouchers.filter(v => {
                    const q = searchVoucherQuery.trim().toLowerCase();
                    if (!q) return true;
                    return (v.billNo && v.billNo.toLowerCase().includes(q)) || 
                           (v.supplier && v.supplier.toLowerCase().includes(q)) || 
                           (v.purNo && v.purNo.toLowerCase().includes(q)) ||
                           (v.date && v.date.includes(q));
                  }).map((v, idx) => (
                    <React.Fragment key={idx}>
                      <tr className={`border-b transition ${isDark ? 'hover:bg-zinc-800/40' : 'hover:bg-slate-50'}`}>
                        <td className="py-2.5 px-3 text-center font-bold border-r border-inherit">{idx + 1}</td>
                        <td className="py-2.5 px-3 text-center font-black border-r border-inherit text-sky-600">#{v.purNo}</td>
                        <td className="py-2.5 px-3 text-center font-bold border-r border-inherit">{v.billNo}</td>
                        <td className="py-2.5 px-3 font-bold font-sans border-r border-inherit">{v.supplier}</td>
                        <td className="py-2.5 px-3 text-center font-bold border-r border-inherit">{v.date}</td>
                        <td className="py-2.5 px-3 text-center font-bold border-r border-inherit">{v.itemsCount || (v.items ? v.items.length : 1)}</td>
                        <td className={`py-2.5 px-3 text-right font-black border-r border-inherit ${isDark ? 'text-white' : 'text-slate-950'}`}>
                          ₹{(v.amount || 0).toFixed(2)}
                        </td>
                        <td className="py-2.5 px-3 text-center font-bold text-emerald-600 border-r border-inherit">
                          {v.revisedAt ? 'REVISED' : 'POSTED'}
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          <div className="flex items-center justify-center space-x-1.5">
                            <button
                              onClick={() => handleEditVoucher(v)}
                              className="px-2 py-1 rounded bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-[11px] shadow transition cursor-pointer"
                              title="Load this voucher into editor to add items or revise quantities"
                            >
                              Edit / Append
                            </button>
                            <button
                              onClick={() => setExpandedVoucherNo(expandedVoucherNo === v.purNo ? null : v.purNo)}
                              className={`p-1 rounded border transition cursor-pointer ${
                                isDark ? 'border-zinc-700 hover:bg-zinc-800 text-zinc-300' : 'border-slate-300 hover:bg-slate-200 text-slate-700'
                              }`}
                              title="Toggle line items breakdown"
                            >
                              <ChevronDown className={`w-3.5 h-3.5 transition-transform ${expandedVoucherNo === v.purNo ? 'rotate-180' : ''}`} />
                            </button>
                          </div>
                        </td>
                      </tr>

                      {/* Expandable Line Items Table */}
                      {expandedVoucherNo === v.purNo && (
                        <tr className={isDark ? 'bg-zinc-950/70' : 'bg-slate-100/70'}>
                          <td colSpan={9} className="p-3 border-b border-inherit">
                            <div className="space-y-1.5">
                              <div className="text-[11px] font-black uppercase text-slate-400">
                                Voucher #{v.purNo} Line Items ({v.items?.length || 0} Products inwarded)
                              </div>
                              <table className={`w-full text-xs font-mono border ${isDark ? 'border-zinc-800 bg-zinc-900' : 'border-slate-300 bg-white'}`}>
                                <thead>
                                  <tr className={`border-b text-[10px] uppercase font-bold ${isDark ? 'bg-zinc-950 text-zinc-300' : 'bg-slate-200 text-slate-800'}`}>
                                    <th className="py-1 px-2 text-left">Medicine Name</th>
                                    <th className="py-1 px-2 text-center">Batch No</th>
                                    <th className="py-1 px-2 text-center">Exp</th>
                                    <th className="py-1 px-2 text-right">Billed Qty</th>
                                    <th className="py-1 px-2 text-right">Free</th>
                                    <th className="py-1 px-2 text-right">PTR (₹)</th>
                                    <th className="py-1 px-2 text-right">MRP (₹)</th>
                                    <th className="py-1 px-2 text-right">Line Total (₹)</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {(v.items || []).map((it, itemIdx) => (
                                    <tr key={itemIdx} className="border-b border-inherit">
                                      <td className="py-1 px-2 font-bold">{it.name}</td>
                                      <td className="py-1 px-2 text-center font-bold text-sky-600">{it.batch}</td>
                                      <td className="py-1 px-2 text-center font-bold">{it.exp}</td>
                                      <td className="py-1 px-2 text-right">{it.wQty}</td>
                                      <td className="py-1 px-2 text-right text-emerald-600">+{it.freeQty || 0}</td>
                                      <td className="py-1 px-2 text-right">₹{(it.rate || it.ptr || 0).toFixed(2)}</td>
                                      <td className="py-1 px-2 text-right">₹{(it.mrp || 0).toFixed(2)}</td>
                                      <td className="py-1 px-2 text-right font-black">₹{(it.total || 0).toFixed(2)}</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
      {/* OCR Document Inward & Manual Review Modal */}
      {isUploadModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/75 flex items-center justify-center p-4 backdrop-blur-xs font-sans">
          <div className={`max-w-5xl w-full max-h-[92vh] flex flex-col rounded-xl border shadow-2xl overflow-hidden ${
            isDark ? 'bg-zinc-900 border-zinc-700 text-zinc-100' : 'bg-white border-slate-300 text-slate-900'
          }`}>
            {/* Modal Header */}
            <div className={`px-5 py-3.5 border-b flex items-center justify-between ${
              isDark ? 'bg-zinc-950 border-zinc-800' : 'bg-slate-100 border-slate-200'
            }`}>
              <div className="flex items-center space-x-2.5">
                <div className="p-2 rounded-lg bg-sky-600 text-white font-bold shadow-sm">
                  <Camera className="w-5 h-5" />
                </div>
                <div>
                  <h3 className={`text-sm font-black flex items-center space-x-2 ${isDark ? 'text-white' : 'text-slate-950'}`}>
                    <span>Distributor Invoice Auto-Inward</span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-500/20 text-emerald-600 border border-emerald-500/30">
                      🔒 Admin Authorized
                    </span>
                  </h3>
                  <p className={`text-xs font-mono mt-0.5 ${isDark ? 'text-zinc-400' : 'text-slate-600'}`}>
                    Auto-extracts medicines, batches, expiries, quantities, schemes & rates for manual review
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  setIsUploadModalOpen(false);
                  setIsScanning(false);
                  setExtractedReviewData(null);
                }}
                className={`p-1.5 rounded-lg transition ${
                  isDark ? 'hover:bg-zinc-800 text-zinc-400 hover:text-white' : 'hover:bg-slate-200 text-slate-600 hover:text-slate-950'
                }`}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              {/* Daily Limit Reached Warning if hardcap reached */}
              {(quotaData.tokensUsed || 0) >= DAILY_TOKEN_CAP && (
                <div className={`p-3 rounded-xl border text-xs font-mono flex items-start space-x-2.5 ${
                  isDark ? 'bg-rose-950/40 border-rose-800 text-rose-300' : 'bg-rose-50 border-rose-300 text-rose-900'
                }`}>
                  <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                  <p className="font-bold">
                    Daily invoice scan limit reached. Quota resets at 00:00 midnight. Please enter remaining bills manually.
                  </p>
                </div>
              )}
              {/* OCR Error Banner if any */}
              {ocrError && (
                <div className={`p-3 rounded-lg border text-xs font-mono flex items-start space-x-2.5 ${
                  isDark ? 'bg-rose-950/40 border-rose-800 text-rose-300' : 'bg-rose-50 border-rose-300 text-rose-900'
                }`}>
                  <AlertOctagon className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="font-bold">{ocrError}</p>
                  </div>
                  <button onClick={() => setOcrError('')} className="opacity-60 hover:opacity-100 text-xs">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}

              {/* STATE 1: SCANNING IN PROGRESS */}
              {isScanning && (
                <div className="py-16 flex flex-col items-center justify-center text-center">
                  <div className="relative mb-6">
                    <div className="w-20 h-20 rounded-2xl bg-sky-500/10 border-2 border-sky-500/40 flex items-center justify-center animate-pulse">
                      <Camera className="w-10 h-10 text-sky-500" />
                    </div>
                    <div className="absolute -bottom-2 -right-2 p-1.5 rounded-full bg-emerald-500 text-white shadow">
                      <Loader2 className="w-4 h-4 animate-spin" />
                    </div>
                  </div>
                  <h4 className={`text-base font-black mb-1 ${isDark ? 'text-white' : 'text-slate-900'}`}>
                    {scanStatusText}
                  </h4>
                  <p className={`text-xs font-mono max-w-md ${isDark ? 'text-zinc-400' : 'text-slate-600'}`}>
                    Extracting tabular medicine items, batch codes, expiry dates (MM/YY), free scheme packs, PTR cost, and GST breakdown...
                  </p>
                  <div className={`w-64 h-2 rounded-full mt-6 overflow-hidden ${isDark ? 'bg-zinc-800' : 'bg-slate-200'}`}>
                    <div className="h-full bg-sky-500 rounded-full animate-pulse w-3/4"></div>
                  </div>
                </div>
              )}

              {/* STATE 2: EXTRACTED INVOICE MANUAL REVIEW SCREEN */}
              {!isScanning && extractedReviewData && (
                <div className="space-y-4">
                  {/* Pharmacist Mandatory Verification Banner */}
                  <div className={`p-3 rounded-lg border flex items-start space-x-3 ${
                    isDark 
                      ? 'bg-amber-950/40 border-amber-800 text-amber-200' 
                      : 'bg-amber-50 border-amber-300 text-amber-900'
                  }`}>
                    <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                    <div className="text-xs">
                      <p className="font-black uppercase tracking-wide">
                        Mandatory Pharmacist Verification Required (Zero-Trust Inward)
                      </p>
                      <p className="mt-0.5 font-medium leading-relaxed">
                        Please inspect every extracted field against the physical distributor paper bill. 
                        Verify that batch numbers match the box, expiry dates are accurate, and free bonus schemes (e.g. 10+1) are allocated correctly before approving into the purchase ledger.
                      </p>
                    </div>
                  </div>

                  {/* Editable Invoice Header Details */}
                  <div className={`p-3 rounded-lg border grid grid-cols-12 gap-3 text-xs font-mono ${
                    isDark ? 'bg-zinc-950 border-zinc-800' : 'bg-slate-50 border-slate-200'
                  }`}>
                    <div className="col-span-5">
                      <label className={`block text-[10px] font-black uppercase mb-1 ${isDark ? 'text-zinc-300' : 'text-slate-800'}`}>
                        Distributor Supplier
                      </label>
                      <select
                        value={extractedReviewData.supplierCode}
                        onChange={(e) => {
                          const code = e.target.value;
                          const found = allSuppliers.find(s => s.code === code);
                          setExtractedReviewData(prev => ({
                            ...prev,
                            supplierCode: code,
                            supplierName: found ? found.name : prev.supplierName
                          }));
                        }}
                        className={`w-full py-1.5 px-2 rounded border font-bold text-xs ${
                          isDark ? 'bg-zinc-900 border-zinc-700 text-white' : 'bg-white border-slate-400 text-slate-950 shadow-sm'
                        }`}
                      >
                        {allSuppliers.map((s, idx) => (
                          <option key={idx} value={s.code}>
                            {s.code} - {s.name} ({s.address || 'KANNUR / THALASSERY'})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="col-span-3">
                      <label className={`block text-[10px] font-black uppercase mb-1 ${isDark ? 'text-zinc-300' : 'text-slate-800'}`}>
                        Distributor Bill / Inv No
                      </label>
                      <input
                        type="text"
                        value={extractedReviewData.invoiceNo}
                        onChange={(e) => setExtractedReviewData(prev => ({ ...prev, invoiceNo: e.target.value }))}
                        className={`w-full py-1.5 px-2 rounded border font-black text-xs ${
                          isDark ? 'bg-zinc-900 border-zinc-700 text-sky-400' : 'bg-white border-slate-400 text-sky-800 shadow-sm'
                        }`}
                      />
                    </div>

                    <div className="col-span-2">
                      <label className={`block text-[10px] font-black uppercase mb-1 ${isDark ? 'text-zinc-300' : 'text-slate-800'}`}>
                        Invoice Date
                      </label>
                      <input
                        type="text"
                        value={extractedReviewData.invoiceDate}
                        onChange={(e) => setExtractedReviewData(prev => ({ ...prev, invoiceDate: e.target.value }))}
                        className={`w-full py-1.5 px-2 rounded border font-bold text-xs text-center ${
                          isDark ? 'bg-zinc-900 border-zinc-700 text-white' : 'bg-white border-slate-400 text-slate-950 shadow-sm'
                        }`}
                      />
                    </div>

                    <div className="col-span-2">
                      <label className={`block text-[10px] font-black uppercase mb-1 ${isDark ? 'text-zinc-300' : 'text-slate-800'}`}>
                        Terms / Mode
                      </label>
                      <button
                        type="button"
                        onClick={() => setExtractedReviewData(prev => ({ ...prev, isCash: !prev.isCash }))}
                        className={`w-full py-1.5 px-2 rounded border font-black text-xs text-center transition ${
                          extractedReviewData.isCash
                            ? 'bg-emerald-600 text-white border-emerald-600'
                            : (isDark ? 'bg-zinc-800 text-amber-400 border-zinc-700' : 'bg-white text-amber-700 border-slate-300 shadow-sm')
                        }`}
                      >
                        {extractedReviewData.isCash ? 'CASH' : 'CREDIT (30D)'}
                      </button>
                    </div>
                  </div>

                  {/* Editable Line Items Table */}
                  <div className={`border rounded-lg overflow-hidden ${isDark ? 'border-zinc-800' : 'border-slate-300'}`}>
                    <div className={`px-3 py-2 border-b flex items-center justify-between text-xs font-mono font-bold ${
                      isDark ? 'bg-zinc-950 text-zinc-300 border-zinc-800' : 'bg-slate-200 text-slate-900 border-slate-300'
                    }`}>
                      <div className="flex items-center space-x-2">
                        <span>Extracted Inward Products ({extractedReviewData.items.length} Lines)</span>
                        <span className="text-[10px] font-normal opacity-80">• Click any cell to manually correct values</span>
                      </div>
                      <button
                        onClick={handleAddReviewRow}
                        className={`px-2 py-0.5 rounded border text-[11px] flex items-center space-x-1 ${
                          isDark ? 'border-zinc-700 bg-zinc-800 hover:bg-zinc-700 text-white' : 'border-slate-300 bg-white hover:bg-slate-50 text-slate-900 shadow-sm'
                        }`}
                      >
                        <Plus className="w-3 h-3 text-sky-600" />
                        <span>+ Add Line</span>
                      </button>
                    </div>

                    <div className="overflow-x-auto max-h-72">
                      <table className="w-full text-left text-xs font-mono">
                        <thead className={`border-b text-[10px] uppercase font-black sticky top-0 ${
                          isDark ? 'bg-zinc-900 border-zinc-800 text-zinc-300' : 'bg-slate-100 border-slate-300 text-slate-900'
                        }`}>
                          <tr>
                            <th className="py-2 px-2 text-center w-8">#</th>
                            <th className="py-2 px-2">Medicine Product Name</th>
                            <th className="py-2 px-2 w-24">Batch No</th>
                            <th className="py-2 px-2 w-20 text-center">Exp (MM/YY)</th>
                            <th className="py-2 px-2 w-20 text-center">Billed Pk</th>
                            <th className="py-2 px-2 w-20 text-center">Free Pk</th>
                            <th className="py-2 px-2 w-16 text-center">Per</th>
                            <th className="py-2 px-2 w-24 text-right">PTR (₹)</th>
                            <th className="py-2 px-2 w-24 text-right">MRP (₹)</th>
                            <th className="py-2 px-2 w-24 text-right">Line Total</th>
                            <th className="py-2 px-2 w-20 text-center">OCR</th>
                            <th className="py-2 px-2 w-10 text-center">Del</th>
                          </tr>
                        </thead>
                        <tbody className={`divide-y ${isDark ? 'divide-zinc-800' : 'divide-slate-200'}`}>
                          {extractedReviewData.items.map((it, idx) => {
                            const lineTotal = ((parseInt(it.wQty) || 0) * (parseFloat(it.ptr) || 0)).toFixed(2);
                            return (
                              <tr key={idx} className={isDark ? 'hover:bg-zinc-800/40' : 'hover:bg-sky-50/50'}>
                                <td className="py-1 px-2 text-center font-bold opacity-60">{idx + 1}</td>
                                
                                {/* Product Name */}
                                <td className="py-1 px-2">
                                  <input
                                    type="text"
                                    value={it.name}
                                    onChange={(e) => handleUpdateReviewItem(idx, 'name', e.target.value)}
                                    className={`w-full py-1 px-1.5 rounded border text-xs font-bold ${
                                      isDark ? 'bg-zinc-900 border-zinc-700 text-white' : 'bg-white border-slate-300 text-slate-900 shadow-xs'
                                    }`}
                                  />
                                </td>

                                {/* Batch No */}
                                <td className="py-1 px-2">
                                  <input
                                    type="text"
                                    value={it.batch}
                                    onChange={(e) => handleUpdateReviewItem(idx, 'batch', e.target.value.toUpperCase())}
                                    className={`w-full py-1 px-1.5 rounded border text-xs font-black text-center ${
                                      isDark ? 'bg-zinc-900 border-zinc-700 text-emerald-400' : 'bg-white border-slate-300 text-emerald-800 shadow-xs'
                                    }`}
                                  />
                                </td>

                                {/* Expiry */}
                                <td className="py-1 px-2">
                                  <input
                                    type="text"
                                    value={it.exp}
                                    onChange={(e) => handleUpdateReviewItem(idx, 'exp', e.target.value)}
                                    className={`w-full py-1 px-1.5 rounded border text-xs font-bold text-center ${
                                      isDark ? 'bg-zinc-900 border-zinc-700 text-white' : 'bg-white border-slate-300 text-slate-900 shadow-xs'
                                    }`}
                                  />
                                </td>

                                {/* Billed Qty */}
                                <td className="py-1 px-2">
                                  <input
                                    type="number"
                                    value={it.wQty}
                                    onChange={(e) => handleUpdateReviewItem(idx, 'wQty', e.target.value)}
                                    className={`w-full py-1 px-1.5 rounded border text-xs font-black text-center ${
                                      isDark ? 'bg-zinc-900 border-zinc-700 text-sky-400' : 'bg-white border-slate-300 text-sky-800 shadow-xs'
                                    }`}
                                  />
                                </td>

                                {/* Free Scheme Qty */}
                                <td className="py-1 px-2">
                                  <input
                                    type="number"
                                    value={it.freeQty}
                                    onChange={(e) => handleUpdateReviewItem(idx, 'freeQty', e.target.value)}
                                    className={`w-full py-1 px-1.5 rounded border text-xs font-black text-center ${
                                      parseInt(it.freeQty) > 0
                                        ? (isDark ? 'bg-amber-950 border-amber-600 text-amber-300' : 'bg-amber-100 border-amber-400 text-amber-900')
                                        : (isDark ? 'bg-zinc-900 border-zinc-700 text-zinc-400' : 'bg-white border-slate-300 text-slate-700')
                                    }`}
                                  />
                                </td>

                                {/* Pack Size (PER) */}
                                <td className="py-1 px-2">
                                  <input
                                    type="number"
                                    value={it.packSize}
                                    onChange={(e) => handleUpdateReviewItem(idx, 'packSize', e.target.value)}
                                    className={`w-full py-1 px-1.5 rounded border text-xs text-center ${
                                      isDark ? 'bg-zinc-900 border-zinc-700 text-zinc-300' : 'bg-white border-slate-300 text-slate-800'
                                    }`}
                                  />
                                </td>

                                {/* PTR */}
                                <td className="py-1 px-2">
                                  <input
                                    type="number"
                                    step="0.01"
                                    value={it.ptr}
                                    onChange={(e) => handleUpdateReviewItem(idx, 'ptr', e.target.value)}
                                    className={`w-full py-1 px-1.5 rounded border text-xs font-bold text-right ${
                                      isDark ? 'bg-zinc-900 border-zinc-700 text-white' : 'bg-white border-slate-300 text-slate-900 shadow-xs'
                                    }`}
                                  />
                                </td>

                                {/* MRP */}
                                <td className="py-1 px-2">
                                  <input
                                    type="number"
                                    step="0.01"
                                    value={it.mrp}
                                    onChange={(e) => handleUpdateReviewItem(idx, 'mrp', e.target.value)}
                                    className={`w-full py-1 px-1.5 rounded border text-xs font-bold text-right ${
                                      isDark ? 'bg-zinc-900 border-zinc-700 text-white' : 'bg-white border-slate-300 text-slate-900 shadow-xs'
                                    }`}
                                  />
                                </td>

                                {/* Line Total */}
                                <td className={`py-1 px-2 text-right font-black ${isDark ? 'text-white' : 'text-slate-950'}`}>
                                  ₹{lineTotal}
                                </td>

                                {/* OCR Confidence Pill */}
                                <td className="py-1 px-2 text-center">
                                  <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                                    (it.confidence || 98) >= 98
                                      ? (isDark ? 'bg-emerald-950 text-emerald-300' : 'bg-emerald-100 text-emerald-800')
                                      : (isDark ? 'bg-amber-950 text-amber-300' : 'bg-amber-100 text-amber-800')
                                  }`}>
                                    {it.confidence || 98}%
                                  </span>
                                </td>

                                {/* Delete */}
                                <td className="py-1 px-2 text-center">
                                  <button
                                    onClick={() => handleRemoveReviewItem(idx)}
                                    className={`p-1 rounded text-rose-500 transition ${isDark ? 'hover:bg-rose-950/60' : 'hover:bg-rose-100'}`}
                                    title="Delete line"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Extracted Financial Totals Summary Bar */}
                  <div className={`p-3 rounded-lg border grid grid-cols-5 gap-3 text-xs font-mono ${
                    isDark ? 'bg-zinc-950 border-zinc-800' : 'bg-slate-100 border-slate-300'
                  }`}>
                    <div>
                      <span className="block text-[10px] text-slate-500 uppercase font-bold">Billed Packs</span>
                      <span className="text-sm font-black text-sky-600">
                        {extractedReviewData.items.reduce((acc, it) => acc + (parseInt(it.wQty) || 0), 0)} Pks
                      </span>
                    </div>
                    <div>
                      <span className="block text-[10px] text-slate-500 uppercase font-bold">Free Scheme Packs</span>
                      <span className="text-sm font-black text-amber-600">
                        +{extractedReviewData.items.reduce((acc, it) => acc + (parseInt(it.freeQty) || 0), 0)} Free
                      </span>
                    </div>
                    <div>
                      <span className="block text-[10px] text-slate-500 uppercase font-bold">Total Inward Units</span>
                      <span className="text-sm font-black text-emerald-600">
                        {extractedReviewData.items.reduce((acc, it) => acc + ((parseInt(it.wQty) || 0) + (parseInt(it.freeQty) || 0)) * (parseInt(it.packSize) || 10), 0)} Units
                      </span>
                    </div>
                    <div>
                      <span className="block text-[10px] text-slate-500 uppercase font-bold">Taxable Cost (PTR)</span>
                      <span className="text-sm font-black">
                        ₹{extractedReviewData.items.reduce((acc, it) => acc + ((parseInt(it.wQty) || 0) * (parseFloat(it.ptr) || 0)), 0).toFixed(2)}
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="block text-[10px] text-slate-500 uppercase font-bold">Estimated Invoice Net</span>
                      <span className="text-base font-black text-emerald-600">
                        ₹{Math.round(extractedReviewData.items.reduce((acc, it) => acc + ((parseInt(it.wQty) || 0) * (parseFloat(it.ptr) || 0)), 0) * 1.12)}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* STATE 3: SELECT OR UPLOAD INVOICE SCREEN (AI VISION OCR) */}
              {!isScanning && !extractedReviewData && (
                <div className="py-6">
                  {(quotaData.tokensUsed || 0) >= DAILY_TOKEN_CAP ? (
                    <div className={`border-2 border-dashed rounded-2xl p-12 text-center ${
                      isDark ? 'border-rose-900 bg-rose-950/20' : 'border-rose-300 bg-rose-50/50'
                    }`}>
                      <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-rose-500/10 text-rose-500 flex items-center justify-center">
                        <Lock className="w-8 h-8" />
                      </div>
                      <h4 className="text-base font-black mb-1.5 text-rose-500">
                        Daily Invoice Auto-Scan Limit Reached
                      </h4>
                      <p className={`text-xs font-mono max-w-md mx-auto leading-relaxed ${isDark ? 'text-zinc-400' : 'text-slate-600'}`}>
                        Today's invoice scan capacity has reached its daily limit. Limit resets automatically at 00:00 midnight. Please enter remaining bills manually.
                      </p>
                    </div>
                  ) : (
                    /* Clean File Upload Drop Area */
                    <div
                      onClick={() => fileInputRef.current?.click()}
                      className={`border-2 border-dashed rounded-2xl p-12 text-center cursor-pointer transition ${
                        isDark 
                          ? 'border-zinc-700 bg-zinc-950/60 hover:bg-zinc-800/40 hover:border-sky-500' 
                          : 'border-slate-300 bg-slate-50 hover:bg-sky-50/50 hover:border-sky-500 shadow-inner'
                      }`}
                    >
                      <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleFileUpload}
                        accept=".pdf,image/*"
                        className="hidden"
                      />
                      <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-sky-500/10 text-sky-600 flex items-center justify-center shadow-xs">
                        <UploadCloud className="w-8 h-8" />
                      </div>
                      <h4 className={`text-base font-black mb-1.5 ${isDark ? 'text-white' : 'text-slate-900'}`}>
                        Select or Drop Distributor Invoice (PDF or Camera Photo)
                      </h4>
                      <p className={`text-xs font-mono max-w-md mx-auto leading-relaxed ${isDark ? 'text-zinc-400' : 'text-slate-600'}`}>
                        Automatically extracts printed medicine names, batch codes, expiry dates, bonus schemes (10+3), PTR, and MRP for instant review.
                      </p>
                      <div className="mt-5 inline-flex items-center space-x-2 px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-mono text-xs font-bold shadow-md transition cursor-pointer">
                        <FileUp className="w-4 h-4" />
                        <span>Browse PDF or Invoice Image</span>
                      </div>

                      <div className="mt-6 flex items-center justify-center space-x-4 text-[11px] font-mono text-slate-500">
                        <span className="flex items-center space-x-1">
                          <Check className="w-3.5 h-3.5 text-emerald-500" />
                          <span>Auto Scheme & Batch Detection</span>
                        </span>
                        <span>•</span>
                        <span className="flex items-center space-x-1">
                          <Check className="w-3.5 h-3.5 text-emerald-500" />
                          <span>Instant Line Item Extraction</span>
                        </span>
                        <span>•</span>
                        <span className="flex items-center space-x-1">
                          <Check className="w-3.5 h-3.5 text-emerald-500" />
                          <span>PDF / JPG / PNG / WEBP</span>
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className={`px-5 py-3 border-t flex items-center justify-between ${
              isDark ? 'bg-zinc-950 border-zinc-800' : 'bg-slate-100 border-slate-200'
            }`}>
              <button
                onClick={() => {
                  if (extractedReviewData) {
                    setExtractedReviewData(null);
                  } else {
                    setIsUploadModalOpen(false);
                  }
                }}
                className={`px-4 py-2 rounded-lg border text-xs font-bold font-mono transition ${
                  isDark ? 'border-zinc-700 bg-zinc-800 text-zinc-300 hover:text-white' : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50 shadow-sm'
                }`}
              >
                {extractedReviewData ? '← Re-upload / Choose Another' : 'Cancel'}
              </button>

              {extractedReviewData && (
                <button
                  onClick={handleApproveExtractedInvoice}
                  className="px-5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs font-mono uppercase flex items-center space-x-2 transition shadow-lg shadow-emerald-900/30 cursor-pointer"
                >
                  <CheckCheck className="w-4 h-4" />
                  <span>✓ Approve & Insert All Items into Purchase Ledger</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Admin Password Prompt Modal */}
      {isAdminAuthModalOpen && (
        <div className="fixed inset-0 z-60 bg-black/80 flex items-center justify-center p-4 backdrop-blur-xs font-sans">
          <div className={`max-w-md w-full rounded-2xl border shadow-2xl overflow-hidden ${
            isDark ? 'bg-zinc-900 border-zinc-700 text-zinc-100' : 'bg-white border-slate-300 text-slate-900'
          }`}>
            <div className={`px-5 py-4 border-b flex items-center justify-between ${
              isDark ? 'bg-zinc-950 border-zinc-800' : 'bg-slate-100 border-slate-200'
            }`}>
              <div className="flex items-center space-x-2.5">
                <div className="p-2 rounded-xl bg-amber-500 text-slate-950 font-black shadow-sm">
                  <Lock className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-black uppercase tracking-wide">
                    Admin Authorization Required
                  </h4>
                  <p className={`text-[11px] font-mono ${isDark ? 'text-zinc-400' : 'text-slate-600'}`}>
                    Supervisor access for Optical Document Inward
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsAdminAuthModalOpen(false)}
                className={`p-1.5 rounded-lg transition ${
                  isDark ? 'hover:bg-zinc-800 text-zinc-400 hover:text-white' : 'hover:bg-slate-200 text-slate-600 hover:text-slate-950'
                }`}
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={(e) => {
              e.preventDefault();
              if (!ADMIN_PASSWORD) {
                setAdminAuthError('Manager access is not configured for this installation.');
              } else if (adminPasswordInput.trim() === ADMIN_PASSWORD) {
                setIsAdminAuthenticated(true);
                setIsAdminAuthModalOpen(false);
                setAdminPasswordInput('');
                setAdminAuthError('');
                setIsUploadModalOpen(true);
                setExtractedReviewData(null);
                setIsScanning(false);
              } else {
                setAdminAuthError('Invalid Admin Password. Access Denied.');
              }
            }} className="p-6 space-y-4">
              <div>
                <label className={`block text-xs font-mono font-bold uppercase mb-2 ${isDark ? 'text-zinc-300' : 'text-slate-700'}`}>
                  Enter 4-Digit Admin Password / PIN
                </label>
                <input
                  type="text"
                  autoFocus
                  autoComplete="off"
                  autoCorrect="off"
                  autoCapitalize="off"
                  spellCheck="false"
                  inputMode="numeric"
                  data-lpignore="true"
                  data-form-type="other"
                  style={{ WebkitTextSecurity: 'disc' }}
                  placeholder="••••"
                  value={adminPasswordInput}
                  onChange={(e) => {
                    setAdminPasswordInput(e.target.value);
                    if (adminAuthError) setAdminAuthError('');
                  }}
                  className={`w-full py-2.5 px-3.5 rounded-xl border text-center font-mono text-lg font-black tracking-widest transition focus:outline-none focus:ring-2 ${
                    adminAuthError
                      ? 'border-rose-500 bg-rose-50/10 text-rose-500 ring-rose-500/30'
                      : (isDark ? 'bg-zinc-950 border-zinc-700 text-white focus:border-amber-500 ring-amber-500/20' : 'bg-slate-50 border-slate-300 text-slate-900 focus:border-amber-500 ring-amber-500/20 shadow-inner')
                  }`}
                />
                {adminAuthError && (
                  <p className="mt-1.5 text-xs text-rose-500 font-mono font-bold flex items-center space-x-1">
                    <AlertCircle className="w-3.5 h-3.5" />
                    <span>{adminAuthError}</span>
                  </p>
                )}
              </div>

              <div className="flex items-center space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAdminAuthModalOpen(false)}
                  className={`flex-1 py-2.5 rounded-xl border text-xs font-bold font-mono transition ${
                    isDark ? 'border-zinc-700 bg-zinc-800 text-zinc-300 hover:bg-zinc-700' : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-100 shadow-sm'
                  }`}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs font-mono uppercase transition shadow-md cursor-pointer"
                >
                  Verify & Unlock
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Parked Purchase Drafts Modal (F12 Hold Queue) */}
      {isParkedModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 backdrop-blur-xs font-sans">
          <div className={`max-w-2xl w-full rounded-2xl border shadow-2xl overflow-hidden flex flex-col max-h-[85vh] ${
            isDark ? 'bg-zinc-900 border-zinc-700 text-zinc-100' : 'bg-white border-slate-300 text-slate-900'
          }`}>
            <div className={`px-5 py-3.5 border-b flex items-center justify-between ${
              isDark ? 'bg-zinc-950 border-zinc-800' : 'bg-slate-100 border-slate-200'
            }`}>
              <div className="flex items-center space-x-2.5">
                <div className="p-2 rounded-xl bg-amber-500 text-slate-950 font-black shadow-sm">
                  <Bookmark className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-black uppercase tracking-wide">
                    Parked Purchase Inwards (Hold Queue / F12)
                  </h4>
                  <p className={`text-[11px] font-mono ${isDark ? 'text-zinc-400' : 'text-slate-600'}`}>
                    {parkedPurchases.length} drafted inward invoice{parkedPurchases.length === 1 ? '' : 's'} on hold
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsParkedModalOpen(false)}
                className={`p-1.5 rounded-lg transition ${
                  isDark ? 'hover:bg-zinc-800 text-zinc-400 hover:text-white' : 'hover:bg-slate-200 text-slate-600 hover:text-slate-950'
                }`}
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 overflow-y-auto space-y-3 flex-1">
              {parkedPurchases.length === 0 ? (
                <div className={`p-8 text-center rounded-xl border border-dashed font-mono text-xs ${
                  isDark ? 'border-zinc-800 text-zinc-500' : 'border-slate-300 text-slate-500'
                }`}>
                  No purchase drafts currently parked in hold queue.
                  <p className="mt-1 text-[11px] text-slate-400">
                    Press <strong className="text-amber-500 font-bold">F12</strong> while entering an invoice to park it here and free up the screen.
                  </p>
                </div>
              ) : (
                parkedPurchases.map((draft) => (
                  <div
                    key={draft.id}
                    className={`p-4 rounded-xl border transition flex items-center justify-between ${
                      isDark 
                        ? 'bg-zinc-950 border-zinc-800 hover:border-amber-600/50' 
                        : 'bg-slate-50 border-slate-200 hover:border-amber-400 shadow-sm'
                    }`}
                  >
                    <div className="space-y-1">
                      <div className="flex items-center space-x-2">
                        <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-500 border border-amber-500/40 text-[10px] font-mono font-bold">
                          {draft.id}
                        </span>
                        <span className="font-bold text-xs uppercase text-slate-800 dark:text-zinc-200">
                          {draft.supplierName}
                        </span>
                        <span className="text-[11px] font-mono text-slate-500">
                          Bill #{draft.invoiceNo}
                        </span>
                      </div>
                      <div className="flex items-center space-x-3 text-[11px] font-mono text-slate-500">
                        <span>Date: {draft.date} {draft.time && `• ${draft.time}`}</span>
                        <span>•</span>
                        <span className="text-sky-600 font-bold">{draft.itemsCount || draft.items?.length || 0} Line Items</span>
                        <span>•</span>
                        <span className="text-emerald-600 font-bold">Net: ₹{(draft.netPayable || 0).toLocaleString('en-IN')}</span>
                      </div>
                    </div>

                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => handleResumeDraft(draft)}
                        className="px-3.5 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-500 text-white font-mono text-xs font-bold transition flex items-center space-x-1 cursor-pointer shadow-sm"
                      >
                        <span>Resume</span>
                        <ArrowLeft className="w-3.5 h-3.5 rotate-180" />
                      </button>
                      <button
                        onClick={(e) => handleDeleteDraft(draft.id, e)}
                        className={`p-1.5 rounded-lg border transition ${
                          isDark ? 'border-zinc-800 hover:bg-rose-950/40 text-zinc-400 hover:text-rose-400' : 'border-slate-300 hover:bg-rose-50 text-slate-500 hover:text-rose-600'
                        }`}
                        title="Discard Draft"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className={`px-5 py-3 border-t flex items-center justify-between ${
              isDark ? 'bg-zinc-950 border-zinc-800' : 'bg-slate-100 border-slate-200'
            }`}>
              <span className={`text-[11px] font-mono ${isDark ? 'text-zinc-500' : 'text-slate-500'}`}>
                Tip: Press F12 anytime to quickly park or open the hold queue.
              </span>
              <button
                onClick={() => setIsParkedModalOpen(false)}
                className={`px-4 py-1.5 rounded-lg border text-xs font-bold font-mono transition ${
                  isDark ? 'border-zinc-700 bg-zinc-800 text-zinc-300 hover:bg-zinc-700' : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-100 shadow-sm'
                }`}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

