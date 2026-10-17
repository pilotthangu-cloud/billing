import React from 'react';
import { AlertTriangle, RefreshCw, ArrowLeft, Trash2 } from 'lucide-react';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught an unhandled error:', error, errorInfo);
    this.setState({ errorInfo });
  }

  handleReload = () => {
    window.location.reload();
  };

  handleGoToBilling = () => {
    try {
      window.history.replaceState(null, '', '/');
    } catch (e) {}
    window.location.href = '/';
  };

  handleClearCache = () => {
    try {
      localStorage.clear();
      sessionStorage.clear();
      if ('caches' in window) {
        caches.keys().then(names => {
          names.forEach(name => caches.delete(name));
        });
      }
    } catch (e) {}
    window.location.href = '/';
  };

  render() {
    if (this.state.hasError) {
      const isDark = this.props.theme === 'dark';
      return (
        <div className={`h-screen w-screen flex flex-col items-center justify-center p-6 select-none ${
          isDark ? 'bg-zinc-950 text-white' : 'bg-slate-100 text-slate-900'
        }`}>
          <div className={`w-full max-w-lg rounded-2xl border p-6 shadow-2xl space-y-5 ${
            isDark ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-slate-200'
          }`}>
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-lg font-black tracking-tight text-rose-600">
                  {this.props.fallbackTitle || 'Application Notice'}
                </h2>
                <p className={`text-xs ${isDark ? 'text-zinc-400' : 'text-slate-500'}`}>
                  The terminal encountered a display issue and protected your session data.
                </p>
              </div>
            </div>

            <div className={`p-3.5 rounded-xl border text-xs font-mono space-y-1 overflow-x-auto ${
              isDark ? 'bg-zinc-950 border-zinc-800 text-rose-300' : 'bg-rose-50 border-rose-200 text-rose-900'
            }`}>
              <div className="font-bold">Error: {this.state.error?.message || 'Unexpected runtime condition'}</div>
              {this.state.error?.stack && (
                <pre className="text-[10px] text-slate-400 overflow-x-auto max-h-32">
                  {this.state.error.stack.split('\n').slice(0, 4).join('\n')}
                </pre>
              )}
            </div>

            <div className="flex flex-wrap items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={this.handleGoToBilling}
                className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs flex items-center space-x-1.5 shadow-sm transition cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Counter Billing</span>
              </button>

              <button
                type="button"
                onClick={this.handleReload}
                className={`px-4 py-2 rounded-xl border font-bold text-xs flex items-center space-x-1.5 transition cursor-pointer ${
                  isDark ? 'bg-zinc-800 border-zinc-700 text-white hover:bg-zinc-700' : 'bg-slate-100 border-slate-300 text-slate-800 hover:bg-slate-200'
                }`}
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Reload Page</span>
              </button>

              <button
                type="button"
                onClick={this.handleClearCache}
                className="px-3 py-2 rounded-xl border border-rose-300 bg-rose-50 text-rose-800 hover:bg-rose-100 font-bold text-xs flex items-center space-x-1 transition cursor-pointer"
                title="Reset cache and return to default state"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Reset Cache</span>
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
