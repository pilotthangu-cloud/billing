import React, { useState, useEffect, useRef } from 'react';
import { Lock, KeyRound, AlertCircle, X, CheckCircle2 } from 'lucide-react';

export default function PasswordAuthModal({
  isOpen,
  onClose,
  onSuccess,
  actionTitle = 'Protected Operation',
  actionDescription = 'This operation requires Administrator authorization.',
  theme = 'light'
}) {
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const inputRef = useRef(null);

  const ADMIN_PASSWORD = import.meta.env.VITE_ADMIN_PASSWORD || '';

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
    const cleanPin = pin.trim();

    if (!ADMIN_PASSWORD) {
      setError('Manager access is not configured. Set VITE_ADMIN_PASSWORD for this installation.');
    } else if (cleanPin === ADMIN_PASSWORD) {
      setError('');
      onSuccess('MANAGER');
      onClose();
    } else {
      setError('Invalid Admin Password. Access Denied.');
      setPin('');
      inputRef.current?.focus();
    }
  };

  const isDark = theme === 'dark';

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4">
      <div className={`w-full max-w-md rounded-2xl border shadow-2xl overflow-hidden font-sans ${
        isDark ? 'bg-zinc-900 border-zinc-700 text-zinc-100' : 'bg-white border-slate-300 text-slate-900'
      }`}>
        {/* Header */}
        <div className={`px-5 py-3.5 border-b flex items-center justify-between ${
          isDark ? 'bg-zinc-950 border-zinc-800' : 'bg-slate-100 border-slate-200'
        }`}>
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-xl bg-amber-500 text-slate-950 font-black flex items-center justify-center shadow-xs">
              <Lock className="w-4 h-4" />
            </div>
            <div>
              <h3 className={`text-sm font-black ${isDark ? 'text-white' : 'text-slate-900'}`}>Admin Authorization Required</h3>
              <p className="text-[11px] font-mono text-slate-500">Security Gate</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className={`p-1 rounded ${isDark ? 'text-zinc-400 hover:text-zinc-200' : 'text-slate-400 hover:text-slate-600'}`}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <div className={`text-xs font-bold mb-1 ${isDark ? 'text-zinc-200' : 'text-slate-800'}`}>
              {actionTitle}
            </div>
            <div className={`text-[11px] mb-4 font-mono leading-relaxed ${isDark ? 'text-zinc-400' : 'text-slate-600'}`}>
              {actionDescription}
            </div>

            <label className={`block text-xs font-mono font-bold uppercase mb-1.5 ${isDark ? 'text-zinc-400' : 'text-slate-600'}`}>
              Enter Admin Password / PIN:
            </label>
            <div className="relative">
              <KeyRound className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                ref={inputRef}
                type="text"
                autoComplete="off"
                autoCorrect="off"
                autoCapitalize="off"
                spellCheck="false"
                inputMode="numeric"
                data-lpignore="true"
                data-form-type="other"
                style={{ WebkitTextSecurity: 'disc' }}
                value={pin}
                onChange={(e) => {
                  setPin(e.target.value);
                  if (error) setError('');
                }}
                placeholder="••••"
                className={`w-full pl-9 pr-3 py-2.5 rounded-xl border font-mono font-black text-center tracking-widest text-lg focus:outline-none focus:ring-2 focus:ring-amber-500 ${
                  error
                    ? 'border-rose-500 bg-rose-50/10 text-rose-500 ring-rose-500/30'
                    : (isDark
                      ? 'bg-zinc-950 border-zinc-700 text-white placeholder-zinc-600'
                      : 'bg-slate-50 border-slate-300 text-slate-900 placeholder-slate-400 shadow-inner')
                }`}
              />
            </div>
          </div>

          {error && (
            <div className={`p-2.5 rounded-lg border flex items-start space-x-2 text-xs font-bold font-mono ${
              isDark 
                ? 'bg-rose-950/60 border-rose-800 text-rose-200' 
                : 'bg-rose-100 border-rose-300 text-rose-900'
            }`}>
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" />
              <span>{error}</span>
            </div>
          )}

          <div className="flex items-center justify-end space-x-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className={`px-4 py-2 rounded-xl font-bold text-xs border ${
                theme === 'dark' ? 'border-zinc-700 hover:bg-zinc-800 text-zinc-300' : 'border-slate-300 hover:bg-slate-100 text-slate-700'
              }`}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black rounded-xl text-xs transition shadow-md flex items-center space-x-1.5 cursor-pointer"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Verify & Unlock</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
