import React, { useState, useMemo } from 'react';
import {
  History,
  Search,
  Receipt,
  Printer,
  Calendar,
  CreditCard,
  Banknote,
  QrCode,
  Building,
  Car,
  TrendingUp,
  FileSpreadsheet,
  X,
  Filter
} from 'lucide-react';

export default function SalesHistory({
  sales,
  tenant,
  onViewInvoice,
  onRefreshSales
}) {
  const currency = tenant?.currency || '₹';

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedMethod, setSelectedMethod] = useState('All');

  const salesList = useMemo(() => {
    return Array.isArray(sales) ? sales : (sales?.data || sales?.sales || []);
  }, [sales]);

  const filteredSales = useMemo(() => {
    return salesList.filter((s) => {
      const matchMethod = selectedMethod === 'All' || s.payment_method === selectedMethod;
      const term = searchTerm.toLowerCase().trim();
      const matchSearch =
        !term ||
        s.invoice_no?.toLowerCase().includes(term) ||
        (s.customer && s.customer.name?.toLowerCase().includes(term)) ||
        (s.customer && s.customer.mobile_no && s.customer.mobile_no.includes(term)) ||
        (s.customer && s.customer.vehicle_no && s.customer.vehicle_no.toLowerCase().includes(term)) ||
        (s.customer && s.customer.vehicle_model && s.customer.vehicle_model.toLowerCase().includes(term));
      return matchMethod && matchSearch;
    });
  }, [sales, selectedMethod, searchTerm]);

  // Aggregate stats
  const totalFilteredRevenue = useMemo(() => {
    return filteredSales.reduce((acc, curr) => acc + Number(curr.total_amount || 0), 0);
  }, [filteredSales]);

  const averageTicket = useMemo(() => {
    if (filteredSales.length === 0) return 0;
    return totalFilteredRevenue / filteredSales.length;
  }, [totalFilteredRevenue, filteredSales.length]);

  return (
    <div className="space-y-6">
      
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-amber-500/15 text-amber-700 flex items-center justify-center">
              <History className="w-5 h-5" />
            </div>
            <span>Sales & Invoice History</span>
          </h1>
          <p className="text-xs text-slate-500 mt-1 font-medium">
            Searchable transaction logs, printable client receipts, and workshop billing breakdown.
          </p>
        </div>

        {onRefreshSales && (
          <button
            onClick={onRefreshSales}
            className="flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 text-xs font-bold transition-all shrink-0 shadow-xs cursor-pointer"
          >
            <span>Refresh Archive</span>
          </button>
        )}
      </div>

      {/* Summary KPI Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-xs">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
            Filtered Revenue
          </span>
          <div className="text-xl font-black text-slate-900 font-mono mt-1">
            {currency}{totalFilteredRevenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <span className="text-[11px] text-slate-500 font-medium">
            Across {filteredSales.length} {filteredSales.length === 1 ? 'invoice' : 'invoices'}
          </span>
        </div>

        <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-xs">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
            Total Invoices Issued
          </span>
          <div className="text-xl font-black text-amber-600 font-mono mt-1">
            {filteredSales.length}
          </div>
          <span className="text-[11px] text-slate-500 font-medium">
            Completed service tickets
          </span>
        </div>

        <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-xs">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
            Average Ticket Value
          </span>
          <div className="text-xl font-black text-emerald-700 font-mono mt-1">
            {currency}{averageTicket.toFixed(2)}
          </div>
          <span className="text-[11px] text-slate-500 font-medium">
            Average spending per visit
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

        {/* Payment Method Filter */}
        <div className="flex items-center gap-1.5 overflow-x-auto w-full md:w-auto pb-1 md:pb-0 scrollbar-none">
          {['All', 'Cash', 'UPI', 'Card', 'Bank Transfer'].map((m) => {
            const isSelected = selectedMethod === m;
            return (
              <button
                key={m}
                onClick={() => setSelectedMethod(m)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-amber-500 text-slate-950 font-black shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:text-slate-900 hover:bg-slate-200/80 border border-slate-200'
                }`}
              >
                {m}
              </button>
            );
          })}
        </div>

      </div>

      {/* Invoices Table */}
      <div className="bg-white border border-slate-200/90 rounded-2xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50/80 text-slate-600 font-bold uppercase text-[10px] tracking-wider border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">Invoice #</th>
                <th className="py-3 px-4">Date & Time</th>
                <th className="py-3 px-4">Customer Details</th>
                <th className="py-3 px-4">Vehicle Plate</th>
                <th className="py-3 px-4">Services / Parts</th>
                <th className="py-3 px-4">Method</th>
                <th className="py-3 px-4 text-right">Total Amount</th>
                <th className="py-3 px-4 text-right">Receipt</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredSales.map((sale) => (
                <tr key={sale.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="py-3.5 px-4 font-mono font-bold text-amber-600 whitespace-nowrap">
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
                  <td className="py-3.5 px-4 text-slate-600 max-w-xs">
                    <div className="truncate font-medium">
                      {sale.items && sale.items.length > 0 ? (
                        <span>
                          {sale.items[0].item_name}
                          {sale.items.length > 1 && (
                            <span className="text-amber-700 font-bold ml-1">
                              +{sale.items.length - 1} more
                            </span>
                          )}
                        </span>
                      ) : (
                        'Service bill'
                      )}
                    </div>
                  </td>
                  <td className="py-3.5 px-4 whitespace-nowrap">
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase bg-slate-100 text-slate-700 border border-slate-200">
                      {sale.payment_method}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-right font-mono font-black text-slate-900 text-sm whitespace-nowrap">
                    {currency}{Number(sale.total_amount).toFixed(2)}
                  </td>
                  <td className="py-3.5 px-4 text-right whitespace-nowrap">
                    <button
                      onClick={() => onViewInvoice(sale)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-amber-500 hover:text-slate-950 text-slate-700 text-[11px] font-bold transition-all shadow-xs cursor-pointer"
                    >
                      <Printer className="w-3.5 h-3.5" />
                      <span>Print</span>
                    </button>
                  </td>
                </tr>
              ))}

              {filteredSales.length === 0 && (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    No sales invoices found matching your filter criteria.
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
