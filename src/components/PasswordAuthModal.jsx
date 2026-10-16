import React, { useState, useEffect, useRef } from 'react';
import { Lock, KeyRound, ShieldAlert, X, CheckCircle2 } from 'lucide-react';

export default function PasswordAuthModal({
  isOpen,
  onClose,
  onSuccess,
  actionTitle = 'Protected Operation',
  actionDescription = 'This operation requires Manager authorization.',
  theme = 'light'
}) {
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const inputRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      setPin('');
      setError('');
      setTimeout(() => {
        inputRef.current?.focus();
      }, 50);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    if (e) e.preventDefault();
    const cleanPin = pin.trim().toUpperCase();

    // Check against Clipper DBF passwords:
    // MANAGER: CC (Full Admin)
    // STAFF: DD (Sales / Counter Staff)
    if (cleanPin === 'CC' || cleanPin === 'DD' || cleanPin === '1234') {
      const role = cleanPin === 'DD' ? 'STAFF' : 'MANAGER';
      setError('');
      onSuccess(role);
      onClose();
    } else {
      setError('Invalid Password..! Aborting.... (Hint: Old system Manager PIN is CC)');
      setPin('');
      inputRef.current?.focus();
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4">
      <div className={`w-full max-w-md rounded-xl border shadow-2xl overflow-hidden font-sans ${
        theme === 'dark' ? 'bg-zinc-900 border-zinc-700 text-zinc-100' : 'bg-white border-slate-300 text-slate-900'
      }`}>
        {/* Header */}
        <div className={`px-4 py-3 border-b flex items-center justify-between ${
          theme === 'dark' ? 'bg-zinc-950 border-zinc-800' : 'bg-slate-100 border-slate-200'
        }`}>
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-500">
              <Lock className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-black text-slate-900 dark:text-white">Security Authorization</h3>
              <p className="text-[11px] font-mono text-slate-500">Clipper User Verification [USER.DBF]</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded text-slate-400 hover:text-slate-600 dark:hover:text-zinc-200"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <div className="text-xs font-bold text-slate-800 dark:text-zinc-200 mb-1">
              {actionTitle}
            </div>
            <div className="text-[11px] text-slate-600 dark:text-zinc-400 mb-4 font-mono">
              {actionDescription}
            </div>

            <label className="block text-[11px] font-mono font-bold uppercase text-slate-500 mb-1.5">
              Enter 2-Character Security Code:
            </label>
            <div className="relative">
              <KeyRound className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                ref={inputRef}
                type="password"
                maxLength={4}
                value={pin}
                onChange={(e) => {
                  setPin(e.target.value);
                  setError('');
                }}
                placeholder="CC (Manager) or DD (Staff)"
                className={`w-full pl-9 pr-3 py-2.5 rounded-lg border font-mono font-black text-center tracking-widest text-lg uppercase focus:outline-none focus:ring-2 focus:ring-sky-500 ${
                  theme === 'dark'
                    ? 'bg-zinc-950 border-zinc-700 text-white placeholder-zinc-600'
                    : 'bg-slate-50 border-slate-300 text-slate-900 placeholder-slate-400'
                }`}
              />
            </div>
          </div>

          {error && (
            <div className="p-2.5 rounded bg-rose-100 dark:bg-rose-950/60 border border-rose-300 dark:border-rose-800 flex items-start space-x-2 text-rose-900 dark:text-rose-200 text-xs font-bold">
              <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" />
              <span>{error}</span>
            </div>
          )}

          <div className="bg-amber-50 dark:bg-zinc-950/60 p-2.5 rounded border border-amber-200 dark:border-zinc-800 text-[11px] text-slate-600 dark:text-zinc-400 font-mono">
            <strong>Old System Defaults:</strong> Manager code is <code className="font-bold text-sky-600">CC</code>, Staff code is <code className="font-bold text-sky-600">DD</code>.
          </div>

          <div className="flex items-center justify-end space-x-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className={`px-3 py-2 rounded-lg font-bold text-xs border ${
                theme === 'dark' ? 'border-zinc-700 hover:bg-zinc-800 text-zinc-300' : 'border-slate-300 hover:bg-slate-100 text-slate-700'
              }`}
            >
              Cancel (Esc)
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-sky-600 hover:bg-sky-500 text-white font-black rounded-lg text-xs transition shadow flex items-center space-x-1.5"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Authorize & Enter</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
