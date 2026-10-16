import React from 'react';
import { Building2, Wifi, WifiOff, Clock, User, ShieldCheck, Activity } from 'lucide-react';

export default function Header({ 
  currentStore, 
  setCurrentStore, 
  isOffline, 
  setIsOffline, 
  pendingSyncCount,
  currentTime 
}) {
  return (
    <header className="bg-slate-900 border-b border-slate-800 px-4 py-2.5 flex items-center justify-between text-xs select-none">
      {/* Left: Store Branding */}
      <div className="flex items-center space-x-3">
        <div className="flex items-center space-x-2 bg-sky-950/70 border border-sky-700/50 px-2.5 py-1 rounded-md">
          <div className="w-2.5 h-2.5 rounded-full bg-sky-400 animate-pulse" />
          <span className="font-bold text-sky-200 tracking-wide uppercase text-sm">BETA PHARMACY</span>
          <span className="text-sky-400/80 font-mono text-[11px]">(Thalassery)</span>
        </div>

        {/* Multi-Branch Selector */}
        <div className="flex items-center space-x-1.5 bg-slate-800/80 px-2 py-1 rounded border border-slate-700">
          <Building2 className="w-3.5 h-3.5 text-slate-400" />
          <span className="text-slate-400">Terminal:</span>
          <select 
            value={currentStore} 
            onChange={(e) => setCurrentStore(e.target.value)}
            className="bg-transparent text-slate-200 font-medium focus:outline-none cursor-pointer"
          >
            <option value="shop1" className="bg-slate-800 text-slate-200">Shop 1 — Chirakkara (This PC)</option>
            <option value="shop2" className="bg-slate-800 text-slate-200">Shop 2 — Kannur Road</option>
            <option value="shop3" className="bg-slate-800 text-slate-200">Shop 3 — Vatakara</option>
          </select>
        </div>

        <div className="text-[11px] text-slate-400 hidden xl:flex items-center space-x-2">
          <span>DL: 13/134/20/05</span>
          <span>•</span>
          <span>GST: 32AABCB1234D1Z5</span>
        </div>
      </div>

      {/* Center: Live Engine & Offline Mode Toggle */}
      <div className="flex items-center space-x-3">
        {/* Offline Simulation Button */}
        <button
          onClick={() => setIsOffline(!isOffline)}
          className={`flex items-center space-x-1.5 px-2.5 py-1 rounded text-[11px] font-medium transition-all ${
            isOffline 
              ? 'bg-amber-950/80 text-amber-300 border border-amber-600/80 animate-pulse' 
              : 'bg-emerald-950/60 text-emerald-300 border border-emerald-700/60 hover:bg-emerald-900/60'
          }`}
          title="Click to simulate Wi-Fi failure and test offline resilience"
        >
          {isOffline ? (
            <>
              <WifiOff className="w-3.5 h-3.5 text-amber-400" />
              <span>Offline Mode (Queueing: {pendingSyncCount})</span>
            </>
          ) : (
            <>
              <Wifi className="w-3.5 h-3.5 text-emerald-400" />
              <span>Cloud Sync Online</span>
            </>
          )}
        </button>

        <div className="flex items-center space-x-1 text-slate-400 text-[11px] bg-slate-800/60 px-2 py-1 rounded border border-slate-700/50">
          <ShieldCheck className="w-3.5 h-3.5 text-sky-400" />
          <span>Local Engine: Instant</span>
        </div>
      </div>

      {/* Right: Cashier, Date & Time */}
      <div className="flex items-center space-x-4">
        <div className="flex items-center space-x-1.5 text-slate-300">
          <User className="w-3.5 h-3.5 text-slate-400" />
          <span className="font-medium text-slate-200">Counter 1</span>
        </div>

        <div className="flex items-center space-x-1.5 text-slate-300 font-mono text-[11px] bg-slate-800/80 px-2 py-1 rounded border border-slate-700">
          <Clock className="w-3 h-3 text-slate-400" />
          <span>{currentTime}</span>
        </div>
      </div>
    </header>
  );
}
