import React from 'react';
import { Loader2, RefreshCw, Sparkles } from 'lucide-react';

/**
 * TabLoadingSkeleton: Used as Suspense fallback when switching between ERP tabs/routes.
 * Displays a lightweight, clean animated skeleton matching the software design.
 */
export function TabLoadingSkeleton({ title = 'Loading Module...' }) {
  return (
    <div className="w-full space-y-5 animate-pulse select-none">
      {/* Top Banner Skeleton */}
      <div className="bg-white border border-slate-200/80 rounded-3xl p-6 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-500">
            <Loader2 className="w-6 h-6 animate-spin" />
          </div>
          <div className="space-y-1.5">
            <div className="h-5 w-48 bg-slate-200 rounded-lg" />
            <div className="h-3 w-72 bg-slate-100 rounded-md" />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-8 w-24 bg-slate-100 rounded-xl" />
          <div className="h-8 w-28 bg-amber-100/60 rounded-xl" />
        </div>
      </div>

      {/* Stats Cards Skeleton (4 columns) */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="bg-white border border-slate-200/70 rounded-2xl p-4 shadow-2xs space-y-2">
            <div className="h-3 w-20 bg-slate-100 rounded" />
            <div className="h-6 w-28 bg-slate-200 rounded-lg" />
          </div>
        ))}
      </div>

      {/* Main Content / Table Skeleton */}
      <div className="bg-white border border-slate-200/80 rounded-3xl p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between gap-4 pb-2 border-b border-slate-100">
          <div className="h-4 w-36 bg-slate-200 rounded" />
          <div className="h-8 w-60 bg-slate-100 rounded-xl" />
        </div>

        {/* Rows */}
        <div className="space-y-3 pt-2">
          {[1, 2, 3, 4, 5, 6].map((row) => (
            <div key={row} className="flex items-center justify-between gap-4 py-2.5 px-3 rounded-xl bg-slate-50/70 border border-slate-100">
              <div className="flex items-center gap-3 flex-1">
                <div className="h-4 w-8 bg-slate-200 rounded" />
                <div className="h-4 w-36 bg-slate-200 rounded" />
                <div className="h-4 w-24 bg-slate-100 rounded hidden sm:block" />
              </div>
              <div className="h-4 w-20 bg-slate-200 rounded" />
              <div className="h-6 w-16 bg-amber-100/60 rounded-lg" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/**
 * ModalLoadingSkeleton: Used as Suspense fallback for dynamically loaded modal dialogs.
 */
export function ModalLoadingSkeleton() {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 backdrop-blur-xs p-4 animate-in fade-in">
      <div className="bg-white border border-slate-200 rounded-3xl p-6 w-full max-w-md shadow-2xl flex flex-col items-center justify-center gap-3 text-slate-800">
        <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-600">
          <Loader2 className="w-6 h-6 animate-spin" />
        </div>
        <p className="text-xs font-bold text-slate-600">Loading component...</p>
      </div>
    </div>
  );
}

/**
 * ScreenLoadingSkeleton: Full-screen fallback for auth / lock screens.
 */
export function ScreenLoadingSkeleton() {
  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-slate-300 gap-4">
      <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 shadow-xl shadow-amber-500/10">
        <Loader2 className="w-8 h-8 animate-spin stroke-[2.5]" />
      </div>
      <div className="flex items-center gap-2.5 font-bold text-sm text-slate-200">
        <RefreshCw className="w-4 h-4 animate-spin text-amber-400" />
        <span>Loading ...</span>
      </div>
    </div>
  );
}

export default TabLoadingSkeleton;

