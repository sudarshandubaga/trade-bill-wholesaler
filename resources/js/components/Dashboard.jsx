import React from 'react';
import {
  DollarSign,
  Receipt,
  Users,
  Package,
  Calendar,
  ArrowUpRight,
  TrendingUp,
  ShieldCheck,
  AlertTriangle,
  RefreshCw,
  Plus,
  Car,
  Clock,
  Sparkles,
  ChevronRight,
  Printer,
  Compass
} from 'lucide-react';

export default function Dashboard({
  stats,
  tenant,
  onNavigate = () => { },
  onOpenSubscriptionModal = () => { },
  onViewInvoice = () => { }
}) {
  const currency = tenant?.currency || '₹';
  const sub = stats?.subscription;
  const isExpired = sub?.is_expired;
  const daysRemaining = sub?.days_remaining ?? 0;
  const recentSales = Array.isArray(stats?.recent_sales)
    ? stats.recent_sales
    : (stats?.recent_sales?.data || []);

  return (
    <div className="space-y-6">

      {/* Executive Command Hero Banner (Dark Theme) */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 border border-slate-800/90 text-white p-6 sm:p-8 shadow-2xl">
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">

          <div className="space-y-2.5">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-800/80 border border-slate-700/60 text-amber-300 text-xs font-semibold backdrop-blur-xs">
              <Car className="w-3.5 h-3.5 text-amber-400" />
              <span>Automotive Service Center & Workshop POS</span>
              <span className="w-1 h-1 rounded-full bg-amber-400"></span>
              <span className="font-mono text-[11px] text-slate-300">{tenant?.domain_name}</span>
            </div>

            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black tracking-tight text-white">
              {tenant?.name || 'Wholesale Command Center'}
            </h1>

            <p className="text-slate-400 text-xs sm:text-sm font-medium max-w-xl leading-relaxed">
              Real-time wholesale billing counter, buyer party ledgers, inventory tracking, and instant trade bill printing.
            </p>
          </div>

          {/* Quick Launch Buttons */}
          <div className="flex flex-wrap items-center gap-3 shrink-0">
            <button
              onClick={() => onNavigate('pos')}
              className="flex items-center gap-2.5 px-6 py-3.5 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 text-slate-950 font-black text-sm shadow-xl shadow-amber-500/20 ring-1 ring-amber-300/60 transition-all transform hover:-translate-y-0.5 active:translate-y-0 cursor-pointer"
            >
              <Receipt className="w-4 h-4 text-slate-950 stroke-[2.5]" />
              <span>Launch POS Billing</span>
              <ArrowUpRight className="w-4 h-4 stroke-[2.5]" />
            </button>

            <button
              onClick={() => onNavigate('items')}
              className="flex items-center gap-2 px-4 py-3.5 rounded-2xl bg-slate-800/90 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-bold transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4 text-amber-400" />
              <span>Add Service / Part</span>
            </button>

            <button
              onClick={() => onNavigate('customers')}
              className="flex items-center gap-2 px-4 py-3.5 rounded-2xl bg-slate-800/90 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-bold transition-all cursor-pointer"
            >
              <Users className="w-4 h-4 text-amber-400" />
              <span>Directory</span>
            </button>
          </div>
        </div>

        {/* Ambient subtle glow circles */}
        <div className="absolute -right-16 -top-16 w-80 h-80 bg-amber-500/10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute -left-16 -bottom-16 w-64 h-64 bg-orange-500/5 rounded-full blur-2xl pointer-events-none"></div>
      </div>

      {/* Subscription Status Card */}
      <div className={`p-4 sm:p-5 rounded-2xl border transition-all ${isExpired
          ? 'bg-rose-50/80 border-rose-200 shadow-xs'
          : daysRemaining <= 30
            ? 'bg-amber-50/80 border-amber-200 shadow-xs'
            : 'bg-white border-slate-200/90 shadow-xs'
        }`}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className={`p-2.5 rounded-2xl shrink-0 ${isExpired
                ? 'bg-rose-100 text-rose-600'
                : daysRemaining <= 30
                  ? 'bg-amber-100 text-amber-600'
                  : 'bg-emerald-100 text-emerald-700'
              }`}>
              {isExpired ? (
                <AlertTriangle className="w-5 h-5" />
              ) : (
                <ShieldCheck className="w-5 h-5" />
              )}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-extrabold text-slate-900 text-sm">
                  {sub?.plan || 'Annual Garage Pro'}
                </h3>
                <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${isExpired
                    ? 'bg-rose-100 text-rose-700 border border-rose-200'
                    : daysRemaining <= 30
                      ? 'bg-amber-100 text-amber-800 border border-amber-200'
                      : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                  }`}>
                  {sub?.status || 'Active'}
                </span>
              </div>
              <p className="text-xs text-slate-600 mt-1">
                {isExpired ? (
                  <span className="text-rose-600 font-semibold">Your yearly subscription has expired. Please contact administration to renew.</span>
                ) : (
                  <span>
                    Valid until <strong className="text-slate-900">{sub?.expires_at_formatted}</strong> &bull;{' '}
                    <span className="font-semibold text-emerald-700">{daysRemaining} days remaining</span>
                  </span>
                )}
              </p>
            </div>
          </div>

          <button
            onClick={onOpenSubscriptionModal}
            className="flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-white hover:bg-slate-50 text-slate-800 border border-slate-300 text-xs font-bold transition-all shrink-0 shadow-xs cursor-pointer"
          >
            <ShieldCheck className="w-3.5 h-3.5 text-amber-600" />
            <span>Plan Details</span>
          </button>
        </div>
      </div>

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">

        {/* Total Revenue */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs hover:border-slate-300 hover:shadow-sm transition-all group">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Total Lifetime Billing</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
              <span className="font-mono text-sm">{currency}</span>
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-black text-slate-900 font-mono tracking-tight group-hover:text-emerald-700 transition-colors">
              {currency}{Number(stats?.total_revenue || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <div className="text-[11px] text-slate-500 mt-1 flex items-center gap-1 font-medium">
              <TrendingUp className="w-3.5 h-3.5 text-emerald-600" />
              <span>Cumulative sales revenue</span>
            </div>
          </div>
        </div>

        {/* Today's Sales */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs hover:border-slate-300 hover:shadow-sm transition-all group">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Today's Revenue</span>
            <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <Calendar className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-black text-amber-600 font-mono tracking-tight group-hover:text-amber-500 transition-colors">
              {currency}{Number(stats?.today_revenue || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <div className="text-[11px] text-slate-500 mt-1 font-medium">
              <strong className="text-slate-800">{stats?.today_sales_count || 0}</strong> invoices issued today
            </div>
          </div>
        </div>

        {/* Registered Customers */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs hover:border-slate-300 hover:shadow-sm transition-all group">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Customer Fleet</span>
            <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-black text-slate-900 tracking-tight group-hover:text-indigo-600 transition-colors">
              {stats?.total_customers || 0}
            </div>
            <div className="text-[11px] text-slate-500 mt-1 font-medium">
              Registered vehicle owners
            </div>
          </div>
        </div>

        {/* Services & Spare Parts */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs hover:border-slate-300 hover:shadow-sm transition-all group">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Catalog Services</span>
            <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
              <Package className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-black text-slate-900 tracking-tight group-hover:text-purple-600 transition-colors">
              {stats?.total_items || 0}
            </div>
            <div className="text-[11px] text-slate-500 mt-1 font-medium">
              Active repair services & spare parts
            </div>
          </div>
        </div>

      </div>

      {/* Recent Invoices Table & Workshop Details */}
      <div className="grid grid-cols-1 lg:grid-cols-3 xl:grid-cols-4 gap-6">

        {/* Recent Invoices (Takes 3 out of 4 columns on large screens) */}
        <div className="lg:col-span-2 xl:col-span-3 bg-white border border-slate-200/90 rounded-2xl p-6 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-base font-extrabold text-slate-900">Recent Service Invoices</h2>
              <p className="text-xs text-slate-500">Latest completed & repair tickets</p>
            </div>
            <button
              onClick={() => onNavigate('sales')}
              className="text-xs font-bold text-amber-600 hover:text-amber-700 flex items-center gap-1 cursor-pointer"
            >
              <span>View All Invoices</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {recentSales.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-100 text-slate-500 font-bold uppercase text-[10px] tracking-wider bg-slate-50/60">
                    <th className="py-2.5 px-3">Invoice #</th>
                    <th className="py-2.5 px-3">Customer</th>
                    <th className="py-2.5 px-3">Vehicle Plate</th>
                    <th className="py-2.5 px-3">Method</th>
                    <th className="py-2.5 px-3 text-right">Total</th>
                    <th className="py-2.5 px-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {recentSales.map((sale) => (
                    <tr key={sale.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-3 font-mono font-bold text-amber-600">
                        {sale.invoice_no}
                      </td>
                      <td className="py-3 px-3 text-slate-900 font-semibold">
                        {sale.customer?.name || 'Walk-in Customer'}
                      </td>
                      <td className="py-3 px-3">
                        {sale.customer?.vehicle_no ? (
                          <span className="px-2 py-0.5 rounded font-mono font-bold text-[10px] bg-amber-50 text-amber-900 border border-amber-200">
                            {sale.customer.vehicle_no}
                          </span>
                        ) : (
                          <span className="text-slate-400 font-mono text-[11px]">—</span>
                        )}
                      </td>
                      <td className="py-3 px-3">
                        <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                          {sale.payment_method}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-right font-mono font-black text-slate-900">
                        {currency}{Number(sale.total_amount).toFixed(2)}
                      </td>
                      <td className="py-3 px-3 text-right">
                        <button
                          onClick={() => onViewInvoice(sale)}
                          className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-amber-500 hover:text-slate-950 text-slate-700 text-[11px] font-bold transition-all cursor-pointer shadow-xs"
                        >
                          Receipt
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="py-12 text-center text-slate-400 text-xs bg-slate-50/50 rounded-xl border border-dashed border-slate-200 space-y-2">
              <Receipt className="w-7 h-7 text-slate-300 mx-auto" />
              <p className="font-semibold text-slate-600">No invoices recorded yet</p>
              <p className="text-[11px] text-slate-400">Click "Launch POS Billing" above to start generating garage invoices.</p>
            </div>
          )}
        </div>

        {/* Garage Details & Workshop Metadata (1 Col) */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-6 space-y-4 shadow-xs">
          <div>
            <h2 className="text-base font-extrabold text-slate-900">Workshop Profile</h2>
            <p className="text-xs text-slate-500">Garage identity and contact settings</p>
          </div>

          <div className="space-y-2.5 text-xs">
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
              <span className="text-slate-400 block text-[10px] uppercase font-bold tracking-wider">Subdomain Slug</span>
              <span className="font-mono text-amber-600 font-extrabold text-sm">{tenant?.domain_name}</span>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
              <span className="text-slate-400 block text-[10px] uppercase font-bold tracking-wider">Owner Email</span>
              <span className="text-slate-800 font-semibold">{tenant?.email}</span>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
              <span className="text-slate-400 block text-[10px] uppercase font-bold tracking-wider">Workshop Phone</span>
              <span className="text-slate-800 font-medium">{tenant?.phone || 'Not configured'}</span>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
              <span className="text-slate-400 block text-[10px] uppercase font-bold tracking-wider">Garage Address</span>
              <span className="text-slate-800 font-medium">{tenant?.address || 'Not configured'}</span>
            </div>
          </div>
        </div>

      </div>

    </div>
  );
}
