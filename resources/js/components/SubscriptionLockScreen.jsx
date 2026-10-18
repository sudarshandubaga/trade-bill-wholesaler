import React, { useState } from 'react';
import axios from 'axios';
import {
  Lock,
  AlertTriangle,
  ShieldAlert,
  Phone,
  Mail,
  RefreshCw,
  LogOut,
  Calendar,
  Building,
  CheckCircle2,
  Sparkles,
  KeyRound,
  ExternalLink
} from 'lucide-react';

export default function SubscriptionLockScreen({
  tenant,
  onRefresh = () => {},
  onLogout = () => {},
  addToast = () => {}
}) {
  const [isRenewing, setIsRenewing] = useState(false);
  const [showAdminActivation, setShowAdminActivation] = useState(false);
  const [licenseKey, setLicenseKey] = useState('');

  const currency = tenant?.currency || '₹';
  const expiresDate = tenant?.expires_at ? new Date(tenant.expires_at).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  }) : 'Expired';
  const daysOverdue = Math.abs(tenant?.days_remaining ?? 0);

  // Admin / License activation handler
  const handleActivateLicense = async () => {
    try {
      setIsRenewing(true);
      const res = await axios.post(`/api/tenants/${tenant.id}/activate-license`, {
        action: 'renew_one_year'
      });
      addToast(res.data.message || 'Subscription renewed successfully!', 'success');
      onRefresh();
    } catch (err) {
      addToast(err.response?.data?.message || 'Failed to renew subscription', 'error');
    } finally {
      setIsRenewing(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between selection:bg-rose-500 selection:text-white relative overflow-hidden">
      
      {/* Background Ambient Glows */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-rose-600/10 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute bottom-10 right-10 w-[400px] h-[400px] bg-amber-600/10 rounded-full blur-3xl pointer-events-none"></div>

      {/* Header Bar */}
      <header className="border-b border-slate-800/80 bg-slate-950/80 backdrop-blur-xl px-6 py-4 flex items-center justify-between z-10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-rose-500/20 border border-rose-500/40 flex items-center justify-center text-rose-400 shadow-lg shadow-rose-500/10">
            <Lock className="w-5 h-5 stroke-[2.5]" />
          </div>
          <div>
            <h1 className="font-black text-base tracking-tight text-white flex items-center gap-2">
              <span>{tenant?.name || 'Motor Service Garage'}</span>
              <span className="px-2 py-0.5 rounded-md text-[10px] uppercase font-bold tracking-wider bg-rose-500/20 text-rose-300 border border-rose-500/40 font-mono">
                LOCKED
              </span>
            </h1>
            <p className="text-xs text-slate-400 font-mono">Station Domain: {tenant?.domain_name}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onLogout}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 border border-slate-200 transition-colors cursor-pointer"
          >
            <LogOut className="w-4 h-4 text-rose-500" />
            <span>Sign Out</span>
          </button>
        </div>
      </header>

      {/* Main Lockout Notice Banner & Details */}
      <main className="flex-1 flex items-center justify-center p-4 sm:p-6 z-10">
        <div className="max-w-2xl w-full bg-white border border-slate-200/90 rounded-3xl p-6 sm:p-8 shadow-xl space-y-6 text-slate-800">
          
          {/* Lock Icon & Status Badge */}
          <div className="flex flex-col items-center text-center space-y-3">
            <div className="relative">
              <div className="w-20 h-20 rounded-3xl bg-gradient-to-tr from-rose-600 via-rose-500 to-amber-500 flex items-center justify-center text-white shadow-xl shadow-rose-500/20 ring-4 ring-rose-100">
                <ShieldAlert className="w-10 h-10 stroke-[2.2]" />
              </div>
              <span className="absolute -top-1 -right-1 flex h-4 w-4">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-4 w-4 bg-rose-500 border-2 border-white"></span>
              </span>
            </div>

            <div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-50 border border-rose-200 text-rose-700 text-xs font-black uppercase tracking-wider mb-2">
                <AlertTriangle className="w-3.5 h-3.5" />
                <span>Yearly Subscription Expired</span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                Software Functionality Locked
              </h2>
              <p className="text-sm text-slate-600 max-w-lg mx-auto mt-2 leading-relaxed">
                All garage operations including <strong className="text-slate-900">POS Billing Register</strong>, <strong className="text-slate-900">Service & Parts Master</strong>, <strong className="text-slate-900">Customer Directory</strong>, and <strong className="text-slate-900">Accounting Reports</strong> are locked because your yearly subscription has lapsed.
              </p>
            </div>
          </div>

          {/* Account Details Card */}
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 sm:p-5 grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <span className="text-slate-500 block font-medium">Subscription Plan</span>
              <span className="text-sm font-bold text-slate-900 mt-0.5 block">
                {tenant?.subscription_plan || 'Annual Garage Pro'}
              </span>
            </div>

            <div>
              <span className="text-slate-500 block font-medium">Annual License Fee</span>
              <span className="text-sm font-mono font-black text-amber-700 mt-0.5 block">
                {currency}{Number(tenant?.subscription_price || 499).toFixed(2)} / Year
              </span>
            </div>

            <div>
              <span className="text-slate-500 block font-medium">Expiration Date</span>
              <span className="text-sm font-mono font-bold text-rose-600 mt-0.5 block">
                {expiresDate}
              </span>
            </div>

            <div>
              <span className="text-slate-500 block font-medium">Overdue Duration</span>
              <span className="text-sm font-mono font-bold text-rose-600 mt-0.5 block">
                {daysOverdue > 0 ? `${daysOverdue} days past expiry` : 'Expired'}
              </span>
            </div>
          </div>

          {/* Platform Administrator Contact */}
          <div className="bg-rose-50 border border-rose-200 rounded-2xl p-4 sm:p-5 space-y-3 text-xs">
            <div className="flex items-center gap-2 text-rose-800 font-extrabold text-sm">
              <Lock className="w-4 h-4 text-rose-600" />
              <span>Platform Administration Renewal Required</span>
            </div>
            <p className="text-slate-700 leading-relaxed text-[12px]">
              Annual licenses cannot be self-activated by garage operators. Please contact platform administration to confirm your yearly payment and activate your garage station license.
            </p>

            <div className="pt-2 border-t border-rose-200 flex flex-wrap items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2 text-slate-800">
                <Phone className="w-3.5 h-3.5 text-rose-600" />
                <span className="font-mono font-bold">+1 (800) 555-MOTO</span>
              </div>
              <div className="flex items-center gap-2 text-slate-800">
                <Mail className="w-3.5 h-3.5 text-rose-600" />
                <span className="font-mono">billing@motoservicepro.com</span>
              </div>
            </div>
          </div>

          {/* Action Row */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
            <button
              onClick={onRefresh}
              className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-colors cursor-pointer border border-slate-200"
            >
              <RefreshCw className="w-4 h-4 text-amber-600" />
              <span>Check License Status</span>
            </button>

            {/* Admin License Activation Trigger */}
            <button
              onClick={handleActivateLicense}
              disabled={isRenewing}
              className="w-full sm:w-auto flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs shadow-xs transition-all cursor-pointer disabled:opacity-50"
            >
              <Sparkles className="w-4 h-4" />
              <span>{isRenewing ? 'Renewing License...' : 'Activate License (+1 Year)'}</span>
            </button>
          </div>

        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800/80 bg-slate-950/80 px-6 py-3 text-center text-xs text-slate-500 z-10">
        <span>MotoService Pro &bull; Multi-Tenant Automotive ERP Engine</span>
      </footer>

    </div>
  );
}
