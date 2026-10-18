import React from 'react';
import {
  ShieldCheck,
  AlertTriangle,
  Calendar,
  X,
  Lock,
  Phone,
  Mail,
  Info,
  CheckCircle2
} from 'lucide-react';

export default function SubscriptionModal({
  isOpen,
  onClose,
  tenant,
  stats
}) {
  if (!isOpen) return null;

  const currency = tenant?.currency || '₹';
  const sub = stats?.subscription;
  const isExpired = sub?.is_expired ?? tenant?.is_expired;
  const daysRemaining = sub?.days_remaining ?? tenant?.days_remaining ?? 0;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white border border-slate-200 rounded-3xl max-w-md w-full p-6 sm:p-7 shadow-2xl space-y-5 animate-in fade-in zoom-in-95">

        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div className="flex items-center gap-2.5">
            <div className={`p-2.5 rounded-2xl ${isExpired
              ? 'bg-rose-100 text-rose-600'
              : daysRemaining <= 30
                ? 'bg-amber-100 text-amber-600'
                : 'bg-emerald-100 text-emerald-700'
              }`}>
              {isExpired ? <AlertTriangle className="w-5 h-5" /> : <ShieldCheck className="w-5 h-5" />}
            </div>
            <div>
              <h3 className="font-extrabold text-slate-900 text-base">Subscription Plan Details</h3>
              <p className="text-xs text-slate-500 font-mono">{tenant?.domain_name}</p>
            </div>
          </div>

          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Subscription Plan Card */}
        <div className={`p-4 rounded-2xl border space-y-2.5 text-xs ${isExpired
          ? 'bg-rose-50/70 border-rose-200 text-rose-900'
          : daysRemaining <= 30
            ? 'bg-amber-50/70 border-amber-200 text-amber-900'
            : 'bg-slate-50 border-slate-200 text-slate-800'
          }`}>

          <div className="flex items-center justify-between">
            <span className="font-medium text-slate-500">Expiration Date:</span>
            <span className="font-mono font-bold text-slate-900">
              {tenant?.expires_at ? new Date(tenant.expires_at).toLocaleDateString() : 'N/A'}
            </span>
          </div>

          <div className="flex items-center justify-between pt-2">
            <span className="font-medium text-slate-500">Account Status:</span>
            <span className={`font-black ${isExpired ? 'text-rose-600' : 'text-emerald-700'
              }`}>
              {isExpired ? 'Subscription Expired' : `Active (${daysRemaining} days remaining)`}
            </span>
          </div>
        </div>

        {/* Notice: Subscriptions must NOT activate when clicked */}
        <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-300 text-xs text-amber-950 space-y-1.5">
          <div className="flex items-center gap-1.5 font-bold text-amber-900">
            <Lock className="w-4 h-4 text-amber-600 shrink-0" />
            <span>Administrator Verification Required</span>
          </div>
          <p className="text-[11px] leading-relaxed text-amber-900/80">
            Annual garage subscriptions are verified and renewed through platform administration upon payment verification.
          </p>
        </div>

        {/* Contact Support info for renewals */}
        <div className="space-y-1.5 text-xs text-slate-500 pt-1">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
            Billing & Renewal Support:
          </span>
          <div className="flex items-center gap-2">
            <Mail className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-slate-700 font-medium">contact@xpertcoders.in</span>
          </div>
          <div className="flex items-center gap-2">
            <Phone className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-slate-700 font-medium">+91 92144 68607</span>
          </div>
        </div>

        {/* Close Button */}
        <div className="pt-3 border-t border-slate-100 flex justify-end">
          <button
            onClick={onClose}
            className="w-full py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>

      </div>
    </div>
  );
}
