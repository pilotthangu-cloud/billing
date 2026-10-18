import fs from 'fs';
import path from 'path';

const dir = './src/components';
const files = fs.readdirSync(dir).filter(f => f.endsWith('.jsx'));

const knownComponents = new Set([
  'FastBillingTerminal', 'ProductCatalogPage', 'SupplierMasterPage', 'PurchaseEntryPage',
  'ExpiryReportPage', 'ShortagesPage', 'MultiStoreRadarPage', 'DailySalesRegisterPage',
  'CustomerCreditLedgerPage', 'DistributorPaymentsPage', 'DotMatrixReceiptModal',
  'NewMedicineModal', 'PasswordAuthModal', 'AdminDashboardApp', 'ErrorBoundary',
  'BatchEnquiryPage', 'TaxMasterPage', 'CompanyMasterPage', 'DoctorMasterPage',
  'ShiftReconciliationModal', 'FirstTimeSetupWizardModal', 'DatabaseImportModal',
  'PrintableReceipt', 'CustomerHistoryModal', 'SalesReturnModal', 'DistributorInvoiceImportModal',
  'CommandPaletteModal', 'DoctorSelector', 'MedicineDetailRadar', 'SubstituteRadarModal',
  'TopNavigationMenu', 'App', 'Fragment', 'Card', 'Btn', 'Pill'
]);

let missingCount = 0;

files.forEach(file => {
  const content = fs.readFileSync(path.join(dir, file), 'utf8');
  const lucideMatch = content.match(/import\s*\{([^}]+)\}\s*from\s*['"]lucide-react['"]/);
  const imported = new Set(lucideMatch ? lucideMatch[1].split(',').map(s => s.trim().replace(/\s+as\s+.*/, '')).filter(Boolean) : []);
  
  const tagMatches = [...content.matchAll(/<([A-Z][a-zA-Z0-9]+)\b/g)].map(m => m[1]);

  tagMatches.forEach(tag => {
    if (!knownComponents.has(tag) && !imported.has(tag)) {
      const otherImport = new RegExp('import\\s+.*\\b' + tag + '\\b.*from');
      if (!otherImport.test(content)) {
        console.log(`[MISSING] ${file}: ${tag}`);
        missingCount++;
      }
    }
  });
});

console.log(`Missing imports found: ${missingCount}`);
