import React, { useState, useMemo } from 'react';
import {
  Banknote,
  Search,
  Receipt,
  Printer,
  Calendar,
  Filter,
  ArrowUpRight,
  TrendingUp,
  X,
  Car,
  FileSpreadsheet,
  Clock,
  CheckCircle2,
  DollarSign
} from 'lucide-react';

export default function CashBook({
  sales,
  tenant,
  onViewInvoice = () => {}
}) {
  const currency = tenant?.currency || '₹';

  const [dateFilter, setDateFilter] = useState('All'); // 'Today', 'Yesterday', 'ThisWeek', 'ThisMonth', 'All'
  const [searchTerm, setSearchTerm] = useState('');

  const salesList = useMemo(() => {
    return Array.isArray(sales) ? sales : (sales?.data || sales?.sales || []);
  }, [sales]);

  // Filter only Cash transactions
  const cashSales = useMemo(() => {
    return salesList.filter((s) => s.payment_method?.toLowerCase() === 'cash');
  }, [salesList]);

  // Date filtering logic
  const filteredCashSales = useMemo(() => {
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];

    const yesterday = new Date(now);
    yesterday.setDate(now.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];

    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay());
    startOfWeek.setHours(0, 0, 0, 0);

    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    return cashSales.filter((s) => {
      const saleDate = s.created_at ? new Date(s.created_at) : null;
      const saleDateStr = saleDate ? saleDate.toISOString().split('T')[0] : '';

      // Date match
      let matchDate = true;
      if (dateFilter === 'Today') {
        matchDate = saleDateStr === todayStr;
      } else if (dateFilter === 'Yesterday') {
        matchDate = saleDateStr === yesterdayStr;
      } else if (dateFilter === 'ThisWeek') {
        matchDate = saleDate && saleDate >= startOfWeek;
      } else if (dateFilter === 'ThisMonth') {
        matchDate = saleDate && saleDate >= startOfMonth;
      }

      // Search match
      const q = searchTerm.toLowerCase().trim();
      const matchSearch =
        !q ||
        s.invoice_no?.toLowerCase().includes(q) ||
        (s.customer && s.customer.name?.toLowerCase().includes(q)) ||
        (s.customer && s.customer.mobile_no && s.customer.mobile_no.includes(q)) ||
        (s.customer && s.customer.vehicle_no && s.customer.vehicle_no.toLowerCase().includes(q));

      return matchDate && matchSearch;
    });
  }, [cashSales, dateFilter, searchTerm]);

  // Calculations
  const totalCashBilled = useMemo(() => {
    return filteredCashSales.reduce((acc, curr) => acc + Number(curr.total_amount || 0), 0);
  }, [filteredCashSales]);

  const totalCashTendered = useMemo(() => {
    return filteredCashSales.reduce((acc, curr) => {
      const paid = Number(curr.paid_amount);
      return acc + (paid && paid > 0 ? paid : Number(curr.total_amount || 0));
    }, 0);
  }, [filteredCashSales]);

  const totalChangeReturned = useMemo(() => {
    return filteredCashSales.reduce((acc, curr) => {
      const paid = Number(curr.paid_amount);
      const total = Number(curr.total_amount || 0);
      if (paid && paid > total) {
        return acc + (paid - total);
      }
      return acc;
    }, 0);
  }, [filteredCashSales]);

  return (
    <div className="space-y-6">
      
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-amber-500/15 text-amber-700 flex items-center justify-center">
              <Banknote className="w-5 h-5" />
            </div>
            <span>Cash Book / Cash Register</span>
          </h1>
          <p className="text-xs text-slate-500 mt-1 font-medium">
            Daily cash receipts, customer cash tenders, change returned, and net counter cash drawer totals.
          </p>
        </div>

        <button
          onClick={() => window.print()}
          className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-white hover:bg-slate-50 text-slate-800 border border-slate-300 text-xs font-bold transition-all shrink-0 shadow-xs cursor-pointer"
        >
          <Printer className="w-4 h-4 text-slate-600" />
          <span>Print Cash Report</span>
        </button>
      </div>

      {/* Summary KPI Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Net Cash In Drawer */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-xs">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
            Net Cash Revenue
          </span>
          <div className="text-2xl font-black text-emerald-700 font-mono mt-1">
            {currency}{totalCashBilled.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <span className="text-[11px] text-slate-500 mt-0.5 block">
            Net cash settled in drawer
          </span>
        </div>

        {/* Total Cash Received */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-xs">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
            Cash Tendered (Handed In)
          </span>
          <div className="text-2xl font-black text-slate-900 font-mono mt-1">
            {currency}{totalCashTendered.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <span className="text-[11px] text-slate-500 mt-0.5 block">
            Physical cash given by clients
          </span>
        </div>

        {/* Change Returned */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-xs">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
            Change Returned Back
          </span>
          <div className="text-2xl font-black text-amber-700 font-mono mt-1">
            {currency}{totalChangeReturned.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <span className="text-[11px] text-slate-500 mt-0.5 block">
            Change handed back to clients
          </span>
        </div>

        {/* Cash Invoices Count */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-xs">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
            Cash Receipts Issued
          </span>
          <div className="text-2xl font-black text-slate-900 font-mono mt-1">
            {filteredCashSales.length}
          </div>
          <span className="text-[11px] text-slate-500 mt-0.5 block">
            Total cash bills in selected period
          </span>
        </div>

      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-4 flex flex-col md:flex-row gap-3.5 items-center justify-between shadow-xs">
        
        {/* Search Input */}
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search invoice #, customer, vehicle plate..."
            className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-9 py-2 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-amber-500 focus:bg-white font-medium"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Period Filter Buttons */}
        <div className="flex items-center gap-1.5 overflow-x-auto w-full md:w-auto pb-1 md:pb-0 scrollbar-none">
          {[
            { id: 'All', label: 'All Time' },
            { id: 'Today', label: 'Today' },
            { id: 'Yesterday', label: 'Yesterday' },
            { id: 'ThisWeek', label: 'This Week' },
            { id: 'ThisMonth', label: 'This Month' },
          ].map((period) => {
            const isSelected = dateFilter === period.id;
            return (
              <button
                key={period.id}
                onClick={() => setDateFilter(period.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-amber-500 text-slate-950 font-black shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:text-slate-900 hover:bg-slate-200 border border-slate-200'
                }`}
              >
                {period.label}
              </button>
            );
          })}
        </div>

      </div>

      {/* Cash Book Table */}
      <div className="bg-white border border-slate-200/90 rounded-2xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50/80 text-slate-600 font-bold uppercase text-[10px] tracking-wider border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">Invoice #</th>
                <th className="py-3 px-4">Date & Time</th>
                <th className="py-3 px-4">Customer Details</th>
                <th className="py-3 px-4">Vehicle Plate</th>
                <th className="py-3 px-4 text-right">Bill Amount</th>
                <th className="py-3 px-4 text-right">Cash Received</th>
                <th className="py-3 px-4 text-right">Change Given</th>
                <th className="py-3 px-4 text-right font-black">Net Cash</th>
                <th className="py-3 px-4 text-right">Receipt</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredCashSales.map((sale) => {
                const paid = Number(sale.paid_amount) || Number(sale.total_amount);
                const total = Number(sale.total_amount);
                const change = paid > total ? paid - total : 0;
                return (
                  <tr key={sale.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3.5 px-4 font-mono font-bold text-amber-700 whitespace-nowrap">
                      {sale.invoice_no}
                    </td>
                    <td className="py-3.5 px-4 text-slate-600 whitespace-nowrap">
                      <span className="font-semibold text-slate-800 block">
                        {sale.created_at ? new Date(sale.created_at).toLocaleDateString() : '—'}
                      </span>
                      <span className="text-[10px] text-slate-400">
                        {sale.created_at ? new Date(sale.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <div className="font-bold text-slate-900">
                        {sale.customer?.name || 'Walk-in Customer'}
                      </div>
                      {sale.customer?.mobile_no && (
                        <div className="text-[11px] text-slate-500 font-mono">
                          {sale.customer.mobile_no}
                        </div>
                      )}
                    </td>
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      {sale.customer?.vehicle_no ? (
                        <span className="px-2 py-0.5 rounded font-mono font-bold text-[10px] bg-amber-50 text-amber-900 border border-amber-200">
                          {sale.customer.vehicle_no}
                        </span>
                      ) : (
                        <span className="text-slate-400 italic">No plate</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono font-bold text-slate-800">
                      {currency}{total.toFixed(2)}
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono text-slate-700">
                      {currency}{paid.toFixed(2)}
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono text-amber-700 font-semibold">
                      {change > 0 ? `${currency}${change.toFixed(2)}` : '—'}
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono font-black text-emerald-700 text-sm whitespace-nowrap">
                      {currency}{total.toFixed(2)}
                    </td>
                    <td className="py-3.5 px-4 text-right whitespace-nowrap">
                      <button
                        onClick={() => onViewInvoice(sale)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-amber-500 hover:text-slate-950 text-slate-700 text-[11px] font-bold transition-all shadow-xs cursor-pointer"
                      >
                        <Receipt className="w-3.5 h-3.5" />
                        <span>View</span>
                      </button>
                    </td>
                  </tr>
                );
              })}

              {filteredCashSales.length === 0 && (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400">
                    No cash transactions recorded for the selected period.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}
