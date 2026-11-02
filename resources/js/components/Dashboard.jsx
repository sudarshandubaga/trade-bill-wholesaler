import React from 'react';
import {
  BookOpen,
  Receipt,
  Users,
  Package,
  Calendar,
  ArrowUpRight,
  TrendingUp,
  ShieldCheck,
  AlertTriangle,
  RotateCcw,
  Building2,
  Boxes,
  Truck,
  Plus,
  ArrowDownLeft,
  ArrowRightLeft,
  Sparkles,
  Printer,
  BookMarked,
  FileText,
  Wallet,
  Phone,
  MapPin,
  Mail,
  Hash,
  Edit
} from 'lucide-react';
import { formatDateDMY } from '../utils/dateHelper';
import PaginationControls from './PaginationControls';
import { usePagination } from '../utils/usePagination';

export default function Dashboard({
  stats,
  tenant,
  onNavigate = () => { },
  onOpenSubscriptionModal = () => { },
  onViewInvoice = () => { },
  onEditSale = () => { }
}) {
  const currency = tenant?.currency || '₹';
  const sub = stats?.subscription;
  const isExpired = sub?.is_expired;
  const daysRemaining = sub?.days_remaining ?? 0;
  const recentSales = Array.isArray(stats?.recent_sales)
    ? stats.recent_sales
    : (stats?.recent_sales?.data || []);

  const recentSalesPagination = usePagination(recentSales, 5);

  const storeName = tenant?.name || 'KRISHNA BOOK AGENCY';

  return (
    <div className="space-y-6">

      {/* Executive Command Hero Banner (Book Agency Edition) */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 border border-slate-800/90 text-white p-6 sm:p-8 shadow-2xl">
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">

          <div className="space-y-2.5">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-800/80 border border-slate-700/60 text-amber-300 text-xs font-semibold backdrop-blur-xs">
              <BookOpen className="w-3.5 h-3.5 text-amber-400" />
              <span>Book Agency & Wholesale Educational Distribution</span>
              <span className="w-1 h-1 rounded-full bg-amber-400"></span>
              <span className="font-mono text-[11px] text-slate-300">{tenant?.domain_name || 'agency'}</span>
            </div>

            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black tracking-tight text-white">
              {storeName}
            </h1>

            <p className="text-slate-400 text-xs sm:text-sm font-medium max-w-2xl leading-relaxed">
              Wholesale textbook distribution, school & institution supply lots, publisher consignment receipts, buyer party ledgers, and zero-tax book invoice billing.
            </p>
          </div>

          {/* Quick Launch Buttons */}
          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <button
              onClick={() => onNavigate('pos')}
              className="flex items-center gap-2 px-5 py-3 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 text-slate-950 font-black text-xs shadow-xl shadow-amber-500/20 ring-1 ring-amber-300/60 transition-all transform hover:-translate-y-0.5 active:translate-y-0 cursor-pointer"
              title="Launch POS Wholesale Counter Billing (F1)"
            >
              <Receipt className="w-4 h-4 text-slate-950 stroke-[2.5]" />
              <span>POS Book Billing (F1)</span>
              <ArrowUpRight className="w-4 h-4 stroke-[2.5]" />
            </button>

            <button
              onClick={() => onNavigate('credit_note_entry')}
              className="flex items-center gap-2 px-3.5 py-3 rounded-2xl bg-slate-800/90 hover:bg-slate-700 text-rose-300 border border-slate-700 text-xs font-bold transition-all cursor-pointer"
              title="Issue Credit Note for Returned Books (Alt+Shift+C)"
            >
              <RotateCcw className="w-3.5 h-3.5 text-rose-400" />
              <span>Credit Note</span>
            </button>

            <button
              onClick={() => onNavigate('stock_in_entry')}
              className="flex items-center gap-2 px-3.5 py-3 rounded-2xl bg-slate-800/90 hover:bg-slate-700 text-emerald-300 border border-slate-700 text-xs font-bold transition-all cursor-pointer"
              title="Record Inward Consignment from Publishers (Alt+9)"
            >
              <ArrowDownLeft className="w-3.5 h-3.5 text-emerald-400" />
              <span>Stock In</span>
            </button>

            <button
              onClick={() => onNavigate('items')}
              className="flex items-center gap-2 px-3.5 py-3 rounded-2xl bg-slate-800/90 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-bold transition-all cursor-pointer"
              title="Book Catalog & Titles Master (F5)"
            >
              <BookMarked className="w-3.5 h-3.5 text-amber-400" />
              <span>Book Catalog</span>
            </button>

            <button
              onClick={() => onNavigate('customers')}
              className="flex items-center gap-2 px-3.5 py-3 rounded-2xl bg-slate-800/90 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-bold transition-all cursor-pointer"
              title="Retail Bookstore & School Directory (F4)"
            >
              <Users className="w-3.5 h-3.5 text-cyan-400" />
              <span>Parties</span>
            </button>
          </div>
        </div>

        {/* Ambient subtle glow circles */}
        <div className="absolute -right-16 -top-16 w-80 h-80 bg-amber-500/10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute -left-16 -bottom-16 w-64 h-64 bg-blue-500/10 rounded-full blur-2xl pointer-events-none"></div>
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
                  {sub?.plan || 'Wholesale Book Agency Annual License'}
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
                  <span className="text-rose-600 font-semibold">Your yearly software subscription has expired. Please contact administration to renew.</span>
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

      {/* KPI Stats Grid (Agency Metrics) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3.5">

        {/* 1. Total Revenue */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-xs hover:border-slate-300 hover:shadow-sm transition-all group">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Total Book Sales</span>
            <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
              <span className="font-mono text-xs">{currency}</span>
            </div>
          </div>
          <div className="mt-2.5">
            <div className="text-xl font-black text-slate-900 font-mono tracking-tight group-hover:text-emerald-700 transition-colors">
              {currency}{Number(stats?.total_revenue || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <div className="text-[10px] text-slate-500 mt-1 flex items-center gap-1 font-medium">
              <TrendingUp className="w-3 h-3 text-emerald-600" />
              <span>{stats?.total_sales_count || 0} bills issued</span>
            </div>
          </div>
        </div>

        {/* 2. Today's Revenue */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-xs hover:border-slate-300 hover:shadow-sm transition-all group">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Today's Billing</span>
            <div className="w-7 h-7 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
              <Calendar className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-2.5">
            <div className="text-xl font-black text-amber-600 font-mono tracking-tight group-hover:text-amber-500 transition-colors">
              {currency}{Number(stats?.today_revenue || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <div className="text-[10px] text-slate-500 mt-1 font-medium">
              <strong className="text-slate-800">{stats?.today_sales_count || 0}</strong> invoices today
            </div>
          </div>
        </div>

        {/* 3. Book Titles & Stationary */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-xs hover:border-slate-300 hover:shadow-sm transition-all group">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Book Titles</span>
            <div className="w-7 h-7 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center">
              <BookOpen className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-2.5">
            <div className="text-xl font-black text-slate-900 tracking-tight group-hover:text-purple-600 transition-colors">
              {stats?.total_items || 0}
            </div>
            <div className="text-[10px] text-slate-500 mt-1 font-medium">
              Registered textbook titles
            </div>
          </div>
        </div>

        {/* 4. Retail Bookstores & Schools */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-xs hover:border-slate-300 hover:shadow-sm transition-all group">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Retailers / Schools</span>
            <div className="w-7 h-7 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <Users className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-2.5">
            <div className="text-xl font-black text-slate-900 tracking-tight group-hover:text-indigo-600 transition-colors">
              {stats?.total_customers || 0}
            </div>
            <div className="text-[10px] text-slate-500 mt-1 font-medium">
              Registered wholesale buyers
            </div>
          </div>
        </div>

        {/* 5. Publishers / Vendors */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-xs hover:border-slate-300 hover:shadow-sm transition-all group">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Publishers / Vendors</span>
            <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <Building2 className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-2.5">
            <div className="text-xl font-black text-slate-900 tracking-tight group-hover:text-blue-600 transition-colors">
              {stats?.total_suppliers || 0}
            </div>
            <div className="text-[10px] text-slate-500 mt-1 font-medium">
              Publishing houses & mills
            </div>
          </div>
        </div>

        {/* 6. Physical Inventory Units */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-xs hover:border-slate-300 hover:shadow-sm transition-all group">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Stock In Godown</span>
            <div className="w-7 h-7 rounded-lg bg-amber-50 text-amber-700 flex items-center justify-center">
              <Boxes className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-2.5">
            <div className="text-xl font-black text-amber-800 tracking-tight group-hover:text-amber-900 transition-colors">
              {Number(stats?.total_stock_units || 0).toLocaleString()}
            </div>
            <div className="text-[10px] text-slate-500 mt-1 font-medium">
              Total book copies in stock
            </div>
          </div>
        </div>

      </div>

      {/* Book Agency Core Operations Workflow Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <button
          onClick={() => onNavigate('pos')}
          className="p-3.5 rounded-2xl bg-white border border-slate-200/90 hover:border-amber-400 hover:shadow-md transition-all text-left cursor-pointer group flex flex-col justify-between"
        >
          <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center font-bold mb-2 group-hover:scale-110 transition-transform">
            <Receipt className="w-4 h-4" />
          </div>
          <div>
            <div className="font-extrabold text-xs text-slate-900 group-hover:text-amber-600">POS Billing</div>
            <div className="text-[10px] text-slate-400 mt-0.5">Quick sale invoices & book lot billing</div>
          </div>
        </button>

        <button
          onClick={() => onNavigate('credit_note_entry')}
          className="p-3.5 rounded-2xl bg-white border border-slate-200/90 hover:border-rose-400 hover:shadow-md transition-all text-left cursor-pointer group flex flex-col justify-between"
        >
          <div className="w-8 h-8 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center font-bold mb-2 group-hover:scale-110 transition-transform">
            <RotateCcw className="w-4 h-4" />
          </div>
          <div>
            <div className="font-extrabold text-xs text-slate-900 group-hover:text-rose-600">Credit Note</div>
            <div className="text-[10px] text-slate-400 mt-0.5">Student / Retailer book returns</div>
          </div>
        </button>

        <button
          onClick={() => onNavigate('debit_note_entry')}
          className="p-3.5 rounded-2xl bg-white border border-slate-200/90 hover:border-purple-400 hover:shadow-md transition-all text-left cursor-pointer group flex flex-col justify-between"
        >
          <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center font-bold mb-2 group-hover:scale-110 transition-transform">
            <RotateCcw className="w-4 h-4" />
          </div>
          <div>
            <div className="font-extrabold text-xs text-slate-900 group-hover:text-purple-600">Debit Note</div>
            <div className="text-[10px] text-slate-400 mt-0.5">Publisher returns & debit adjustments</div>
          </div>
        </button>

        <button
          onClick={() => onNavigate('stock_in_entry')}
          className="p-3.5 rounded-2xl bg-white border border-slate-200/90 hover:border-emerald-400 hover:shadow-md transition-all text-left cursor-pointer group flex flex-col justify-between"
        >
          <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold mb-2 group-hover:scale-110 transition-transform">
            <ArrowDownLeft className="w-4 h-4" />
          </div>
          <div>
            <div className="font-extrabold text-xs text-slate-900 group-hover:text-emerald-600">Stock Inward</div>
            <div className="text-[10px] text-slate-400 mt-0.5">Receive publisher lot consignments</div>
          </div>
        </button>

        <button
          onClick={() => onNavigate('stock_transfer_entry')}
          className="p-3.5 rounded-2xl bg-white border border-slate-200/90 hover:border-cyan-400 hover:shadow-md transition-all text-left cursor-pointer group flex flex-col justify-between"
        >
          <div className="w-8 h-8 rounded-xl bg-cyan-50 text-cyan-600 flex items-center justify-center font-bold mb-2 group-hover:scale-110 transition-transform">
            <ArrowRightLeft className="w-4 h-4" />
          </div>
          <div>
            <div className="font-extrabold text-xs text-slate-900 group-hover:text-cyan-600">Stock Transfer</div>
            <div className="text-[10px] text-slate-400 mt-0.5">Inter-godown & branch challans</div>
          </div>
        </button>

        <button
          onClick={() => onNavigate('reports')}
          className="p-3.5 rounded-2xl bg-white border border-slate-200/90 hover:border-blue-400 hover:shadow-md transition-all text-left cursor-pointer group flex flex-col justify-between"
        >
          <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold mb-2 group-hover:scale-110 transition-transform">
            <FileText className="w-4 h-4" />
          </div>
          <div>
            <div className="font-extrabold text-xs text-slate-900 group-hover:text-blue-600">Reports Hub</div>
            <div className="text-[10px] text-slate-400 mt-0.5">Daybook, cashbook, ledger & stock</div>
          </div>
        </button>
      </div>

      {/* Recent Invoices Table & Agency Profile */}
      <div className="grid grid-cols-1 lg:grid-cols-3 xl:grid-cols-4 gap-6">

        {/* Recent Wholesale Invoices Table */}
        <div className="lg:col-span-2 xl:col-span-3 bg-white border border-slate-200/90 rounded-2xl p-6 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-base font-extrabold text-slate-900">Recent Book Sale Invoices</h2>
              <p className="text-xs text-slate-500">Latest wholesale trade bills issued to bookstores & schools</p>
            </div>
            <button
              onClick={() => onNavigate('reports')}
              className="text-xs font-bold text-amber-600 hover:text-amber-700 flex items-center gap-1 cursor-pointer"
            >
              <span>View Invoices Register</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {recentSales.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-100 text-slate-500 font-bold uppercase text-[10px] tracking-wider bg-slate-50/60">
                    <th className="py-2.5 px-3">Bill #</th>
                    <th className="py-2.5 px-3">Retailer / School Party</th>
                    <th className="py-2.5 px-3">Date</th>
                    <th className="py-2.5 px-3">Payment Mode</th>
                    <th className="py-2.5 px-3 text-right">Bill Total</th>
                    <th className="py-2.5 px-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {recentSalesPagination.paginatedItems.map((sale) => (
                    <tr key={sale.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-3 font-mono font-bold text-amber-600">
                        {sale.invoice_no}
                      </td>
                      <td className="py-3 px-3 text-slate-900 font-semibold">
                        {sale.customer?.name || sale.customer_name || 'Retail Bookstore'}
                        {sale.customer?.city && (
                          <span className="text-[10px] text-slate-400 font-normal ml-1">
                            ({sale.customer.city})
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-3 text-slate-500 font-mono text-[11px]">
                        {sale.created_at ? formatDateDMY(sale.created_at) : 'Today'}
                      </td>
                      <td className="py-3 px-3">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-semibold uppercase ${
                          sale.payment_method === 'Credit'
                            ? 'bg-purple-50 text-purple-700 border border-purple-200'
                            : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        }`}>
                          {sale.payment_method || 'Credit'}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-right font-mono font-black text-slate-900">
                        {currency}{Number(sale.total_amount).toFixed(2)}
                      </td>
                      <td className="py-3 px-3 text-right">
                        <div className="inline-flex items-center gap-1.5 justify-end">
                          {onEditSale && (
                            <button
                              type="button"
                              onClick={() => onEditSale(sale)}
                              className="px-2 py-1 rounded-lg bg-blue-50 hover:bg-blue-600 hover:text-white text-blue-700 text-[11px] font-bold transition-all cursor-pointer shadow-xs inline-flex items-center gap-1"
                              title="Edit Bill"
                            >
                              <Edit className="w-3 h-3" />
                              <span>Edit</span>
                            </button>
                          )}
                          <button
                            onClick={() => onViewInvoice(sale)}
                            className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-amber-500 hover:text-slate-950 text-slate-700 text-[11px] font-bold transition-all cursor-pointer shadow-xs inline-flex items-center gap-1"
                            title="Print A4 Wholesale Bill"
                          >
                            <Printer className="w-3 h-3" />
                            <span>Print Bill</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <PaginationControls
                currentPage={recentSalesPagination.currentPage}
                pageSize={recentSalesPagination.pageSize}
                totalItems={recentSalesPagination.totalItems}
                onPageChange={recentSalesPagination.setCurrentPage}
                onPageSizeChange={recentSalesPagination.setPageSize}
                pageSizeOptions={[5, 10, 25, 999999]}
                className="rounded-none border-t border-slate-100 shadow-none px-3 py-2 text-[11px]"
              />
            </div>
          ) : (
            <div className="py-12 text-center text-slate-400 text-xs bg-slate-50/50 rounded-xl border border-dashed border-slate-200 space-y-2">
              <Receipt className="w-7 h-7 text-slate-300 mx-auto" />
              <p className="font-semibold text-slate-600">No book sale invoices recorded yet</p>
              <p className="text-[11px] text-slate-400">Click "POS Book Billing" above to start generating wholesale invoices.</p>
            </div>
          )}
        </div>

        {/* Book Agency Identity & Store Details */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-6 space-y-4 shadow-xs">
          <div>
            <h2 className="text-base font-extrabold text-slate-900">Agency Profile</h2>
            <p className="text-xs text-slate-500">Official publishing & distributor details</p>
          </div>

          <div className="space-y-2.5 text-xs">
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
              <div className="flex items-center gap-1 text-slate-400 text-[10px] uppercase font-bold tracking-wider mb-0.5">
                <Building2 className="w-3 h-3 text-slate-400" />
                <span>Agency Name</span>
              </div>
              <span className="font-black text-blue-900 text-sm">{storeName}</span>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
              <div className="flex items-center gap-1 text-slate-400 text-[10px] uppercase font-bold tracking-wider mb-0.5">
                <Hash className="w-3 h-3 text-slate-400" />
                <span>GSTIN / Tax Registration</span>
              </div>
              <span className="font-mono text-slate-900 font-bold">{tenant?.gst_number || tenant?.gstin || '10AYSPP3209J1ZC'}</span>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
              <div className="flex items-center gap-1 text-slate-400 text-[10px] uppercase font-bold tracking-wider mb-0.5">
                <Phone className="w-3 h-3 text-slate-400" />
                <span>Mobile Contact</span>
              </div>
              <span className="font-mono text-slate-800 font-medium">{tenant?.phone || '9939175603, 9430472515'}</span>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
              <div className="flex items-center gap-1 text-slate-400 text-[10px] uppercase font-bold tracking-wider mb-0.5">
                <MapPin className="w-3 h-3 text-slate-400" />
                <span>Operating Address</span>
              </div>
              <span className="text-slate-800 font-medium leading-relaxed">{tenant?.address || 'Prakash Nagar, Narkatiyaganj (Bihar) - 845455'}</span>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
              <div className="flex items-center gap-1 text-slate-400 text-[10px] uppercase font-bold tracking-wider mb-0.5">
                <Mail className="w-3 h-3 text-slate-400" />
                <span>Email Address</span>
              </div>
              <span className="text-slate-800 font-mono text-[11px]">{tenant?.email || 'krishnabookagency@gmail.com'}</span>
            </div>
          </div>
        </div>

      </div>

    </div>
  );
}
