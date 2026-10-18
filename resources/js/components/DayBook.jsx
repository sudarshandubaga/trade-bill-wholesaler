import React, { useState, useMemo } from 'react';
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  Printer,
  Receipt,
  Search,
  Banknote,
  QrCode,
  CreditCard,
  Building,
  TrendingUp,
  Percent,
  Clock,
  Car,
  FileSpreadsheet
} from 'lucide-react';

export default function DayBook({
  sales,
  tenant,
  onViewInvoice = () => {}
}) {
  const currency = tenant?.currency || '₹';

  // Today's date YYYY-MM-DD
  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);
  const [selectedDate, setSelectedDate] = useState(todayStr);

  const handlePrevDay = () => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() - 1);
    setSelectedDate(d.toISOString().split('T')[0]);
  };

  const handleNextDay = () => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() + 1);
    setSelectedDate(d.toISOString().split('T')[0]);
  };

  const salesList = useMemo(() => {
    return Array.isArray(sales) ? sales : (sales?.data || sales?.sales || []);
  }, [sales]);

  // Filter sales for the selected date
  const daySales = useMemo(() => {
    return salesList.filter((s) => {
      if (!s.created_at) return false;
      const sDateStr = new Date(s.created_at).toISOString().split('T')[0];
      return sDateStr === selectedDate;
    });
  }, [sales, selectedDate]);

  // Aggregate day financial metrics
  const dayGrossSubtotal = useMemo(() => {
    return daySales.reduce((acc, curr) => acc + Number(curr.subtotal || curr.total_amount || 0), 0);
  }, [daySales]);

  const dayDiscountTotal = useMemo(() => {
    return daySales.reduce((acc, curr) => acc + Number(curr.discount_amount || 0), 0);
  }, [daySales]);

  const dayTaxTotal = useMemo(() => {
    return daySales.reduce((acc, curr) => acc + Number(curr.tax_amount || 0), 0);
  }, [daySales]);

  const dayNetTotal = useMemo(() => {
    return daySales.reduce((acc, curr) => acc + Number(curr.total_amount || 0), 0);
  }, [daySales]);

  // Payment method breakdown
  const paymentBreakdown = useMemo(() => {
    const breakdown = {
      Cash: { amount: 0, count: 0 },
      UPI: { amount: 0, count: 0 },
      Card: { amount: 0, count: 0 },
      'Bank Transfer': { amount: 0, count: 0 },
    };

    daySales.forEach((s) => {
      const m = s.payment_method || 'Cash';
      const amt = Number(s.total_amount || 0);
      if (breakdown[m]) {
        breakdown[m].amount += amt;
        breakdown[m].count += 1;
      } else {
        breakdown[m] = { amount: amt, count: 1 };
      }
    });

    return breakdown;
  }, [daySales]);

  return (
    <div className="space-y-6">
      
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-amber-500/15 text-amber-700 flex items-center justify-center">
              <Calendar className="w-5 h-5" />
            </div>
            <span>Day Book / Daily Sales Journal</span>
          </h1>
          <p className="text-xs text-slate-500 mt-1 font-medium">
            Chronological register of all services billed and payments recorded for any chosen date.
          </p>
        </div>

        {/* Date Selector Navigation */}
        <div className="flex items-center gap-2">
          <div className="flex items-center bg-white border border-slate-300 rounded-xl p-1 shadow-xs">
            <button
              onClick={handlePrevDay}
              className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-600 transition-colors cursor-pointer"
              title="Previous Day"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="px-2 py-1 text-xs font-bold text-slate-900 bg-transparent border-0 focus:outline-none cursor-pointer"
            />
            <button
              onClick={handleNextDay}
              className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-600 transition-colors cursor-pointer"
              title="Next Day"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <button
            onClick={() => setSelectedDate(todayStr)}
            className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold transition-colors cursor-pointer"
          >
            Today
          </button>

          <button
            onClick={() => window.print()}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white hover:bg-slate-50 text-slate-800 border border-slate-300 text-xs font-bold transition-all shadow-xs cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print Day Book</span>
          </button>
        </div>
      </div>

      {/* Day Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-xs">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
            Net Day Billing
          </span>
          <div className="text-2xl font-black text-amber-700 font-mono mt-1">
            {currency}{dayNetTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <span className="text-[11px] text-slate-500 mt-0.5 block">
            {daySales.length} {daySales.length === 1 ? 'invoice' : 'invoices'} on {new Date(selectedDate).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}
          </span>
        </div>

        <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-xs">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
            Gross Subtotal
          </span>
          <div className="text-2xl font-black text-slate-900 font-mono mt-1">
            {currency}{dayGrossSubtotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <span className="text-[11px] text-slate-500 mt-0.5 block">
            Before discounts and taxes
          </span>
        </div>

        <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-xs">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
            Discounts Allowed
          </span>
          <div className="text-2xl font-black text-emerald-700 font-mono mt-1">
            {currency}{dayDiscountTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <span className="text-[11px] text-slate-500 mt-0.5 block">
            Customer rebates on labor & parts
          </span>
        </div>

        <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-xs">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
            Tax / GST Collected
          </span>
          <div className="text-2xl font-black text-slate-900 font-mono mt-1">
            {currency}{dayTaxTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <span className="text-[11px] text-slate-500 mt-0.5 block">
            Total tax billed for the day
          </span>
        </div>

      </div>

      {/* Payment Method Breakdown Strip */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-4 space-y-3 shadow-xs">
        <span className="text-xs font-black text-slate-900 uppercase tracking-wider block">
          Day Payment Mode Breakdown
        </span>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { id: 'Cash', label: 'Cash', icon: Banknote, color: 'text-emerald-700 bg-emerald-50 border-emerald-200' },
            { id: 'UPI', label: 'UPI / QR', icon: QrCode, color: 'text-amber-800 bg-amber-50 border-amber-200' },
            { id: 'Card', label: 'Card Swipe', icon: CreditCard, color: 'text-indigo-800 bg-indigo-50 border-indigo-200' },
            { id: 'Bank Transfer', label: 'Bank / NEFT', icon: Building, color: 'text-purple-800 bg-purple-50 border-purple-200' },
          ].map((mode) => {
            const Icon = mode.icon;
            const data = paymentBreakdown[mode.id] || { amount: 0, count: 0 };
            return (
              <div key={mode.id} className={`p-3 rounded-xl border ${mode.color}`}>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold">{mode.label}</span>
                  <Icon className="w-4 h-4 opacity-80" />
                </div>
                <div className="text-base font-black font-mono mt-2">
                  {currency}{data.amount.toFixed(2)}
                </div>
                <span className="text-[10px] opacity-80 block mt-0.5">
                  {data.count} {data.count === 1 ? 'ticket' : 'tickets'}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Day Journal Table */}
      <div className="bg-white border border-slate-200/90 rounded-2xl overflow-hidden shadow-xs">
        <div className="p-4 border-b border-slate-200 flex items-center justify-between">
          <h2 className="font-extrabold text-sm text-slate-900">
            Day Journal Entries ({daySales.length})
          </h2>
          <span className="text-xs text-slate-500 font-mono">
            {new Date(selectedDate).toLocaleDateString([], { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50/80 text-slate-600 font-bold uppercase text-[10px] tracking-wider border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">Time</th>
                <th className="py-3 px-4">Invoice #</th>
                <th className="py-3 px-4">Customer Details</th>
                <th className="py-3 px-4">Vehicle Plate</th>
                <th className="py-3 px-4">Particulars</th>
                <th className="py-3 px-4">Payment Method</th>
                <th className="py-3 px-4 text-right">Subtotal</th>
                <th className="py-3 px-4 text-right">Discount</th>
                <th className="py-3 px-4 text-right font-black">Net Total</th>
                <th className="py-3 px-4 text-right">Receipt</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {daySales.map((sale) => (
                <tr key={sale.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="py-3.5 px-4 text-slate-500 font-mono whitespace-nowrap">
                    {sale.created_at ? new Date(sale.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'}
                  </td>
                  <td className="py-3.5 px-4 font-mono font-bold text-amber-700 whitespace-nowrap">
                    {sale.invoice_no}
                  </td>
                  <td className="py-3.5 px-4 whitespace-nowrap">
                    <span className="font-bold text-slate-900 block">{sale.customer?.name || 'Walk-in Customer'}</span>
                    {sale.customer?.mobile_no && (
                      <span className="text-[10px] text-slate-400 font-mono">{sale.customer.mobile_no}</span>
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
                  <td className="py-3.5 px-4 text-slate-600 max-w-xs truncate">
                    {sale.items && sale.items.length > 0 ? (
                      <span>
                        {sale.items[0].item_name}
                        {sale.items.length > 1 && (
                          <span className="text-amber-700 font-bold ml-1">+{sale.items.length - 1} more</span>
                        )}
                      </span>
                    ) : (
                      'Service bill'
                    )}
                  </td>
                  <td className="py-3.5 px-4 whitespace-nowrap">
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase bg-slate-100 text-slate-700 border border-slate-200">
                      {sale.payment_method}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-right font-mono text-slate-700">
                    {currency}{Number(sale.subtotal || sale.total_amount).toFixed(2)}
                  </td>
                  <td className="py-3.5 px-4 text-right font-mono text-emerald-700">
                    {Number(sale.discount_amount) > 0 ? `-${currency}${Number(sale.discount_amount).toFixed(2)}` : '—'}
                  </td>
                  <td className="py-3.5 px-4 text-right font-mono font-black text-slate-900 text-sm whitespace-nowrap">
                    {currency}{Number(sale.total_amount).toFixed(2)}
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
              ))}

              {daySales.length === 0 && (
                <tr>
                  <td colSpan={10} className="py-12 text-center text-slate-400">
                    No transactions recorded on {new Date(selectedDate).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}.
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
