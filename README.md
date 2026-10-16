# Beta Pharmacy — Modern Cloud ERP & POS Terminal

A high-performance, offline-resilient Pharmacy Management System and Executive Admin Dashboard modernizing legacy Clipper DOS architectures (`RETAIL.exe` / `RETAILG4`) into a modern, real-time web and mobile application.

## 🚀 Key Features

### 1. Counter POS Billing Terminal (`/`)
* **Sub-second keyboard navigation:** Full F1–F12 hotkey workflow matching legacy retail muscle memory.
* **100% Offline-Resilient:** Operates without internet connectivity at the counter counter.
* **Thermal & Dot-Matrix Ready:** Instant ESC/POS dot-matrix receipt printing.
* **Auto-Sync:** Completed bills automatically sync to Supabase PostgreSQL in the background.

### 2. Multi-Store Executive Admin Dashboard (`/admin`)
* **Multi-Pharmacy Branch Switcher:** Real-time consolidated view across Chirakkara (Main), Town Branch, and Kannur Clinic.
* **Financial Telemetry:** Live gross sales, 21.0% profit margin breakdown, Cash vs. UPI payment tracking.
* **Shortage & Reorder Radar:** Identifies shelf stock falling below reorder level (`RO_LEVEL`) with one-click WhatsApp Purchase Order generation.
* **Dead Capital & Overstock Analyzer:** Detects slow-moving inventory tying up working capital and suggests inter-branch stock transfers.
* **Near-Expiry Loss Mitigation:** Categorizes drugs approaching expiry (<30d, <60d) with instant return debit note preparation.
* **Distributor Payables Ledger:** Tracks outstanding agency bills, credit terms, and payment disbursements.
* **Doctor Prescription Analytics:** Tracks consulting doctors, prescription volume, and top dispensed medications.

## 🛠️ Tech Stack
* **Frontend:** React 19, Vite, Tailwind CSS, Lucide Icons
* **Cloud Database:** Supabase (PostgreSQL with Row Level Security)
* **Local Storage:** IndexedDB / Local Cache for offline fault tolerance

## 📦 Getting Started

### Prerequisites
* Node.js (v18+)
* npm

### Installation
```bash
# Clone the repository
git clone https://github.com/pilotthangu-cloud/billing.git
cd billing

# Install dependencies
npm install

# Start local development server
npm run dev
```

### Environment Configuration
Create a `.env.local` file in the project root:
```env
VITE_SUPABASE_URL=https://coqziknetbiinumbueay.supabase.co
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### Production Build
```bash
npm run build
```
