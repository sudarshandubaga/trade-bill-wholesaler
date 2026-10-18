import React from 'react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

export default function Toast({ toasts, onDismiss }) {
  if (!Array.isArray(toasts) || toasts.length === 0) return null;

  return (
    <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-2 max-w-md w-full pointer-events-none">
      {toasts.map((toast) => {
        const isSuccess = toast.type === 'success';
        const isError = toast.type === 'error';

        return (
          <div
            key={toast.id}
            className={`pointer-events-auto flex items-start gap-3 p-4 rounded-2xl shadow-xl backdrop-blur-md border transition-all duration-300 animate-slide-in ${
              isSuccess
                ? 'bg-emerald-50/95 border-emerald-300 text-emerald-900 shadow-emerald-500/10'
                : isError
                ? 'bg-rose-50/95 border-rose-300 text-rose-900 shadow-rose-500/10'
                : 'bg-white/95 border-slate-200 text-slate-800 shadow-slate-500/10'
            }`}
          >
            <div className="shrink-0 mt-0.5">
              {isSuccess && <CheckCircle2 className="w-5 h-5 text-emerald-600" />}
              {isError && <AlertCircle className="w-5 h-5 text-rose-600" />}
              {!isSuccess && !isError && <Info className="w-5 h-5 text-blue-600" />}
            </div>
            <div className="flex-1 text-xs font-semibold leading-relaxed">
              {toast.message}
            </div>
            <button
              onClick={() => onDismiss(toast.id)}
              className="shrink-0 text-slate-400 hover:text-slate-700 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
