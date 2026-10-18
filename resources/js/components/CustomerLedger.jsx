import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  BookOpen,
  Search,
  User,
  Car,
  Phone,
  Mail,
  MapPin,
  Calendar,
  Receipt,
  Printer,
  ChevronDown,
  X,
  TrendingUp,
  CreditCard,
  Banknote,
  Clock,
  Sparkles,
  ArrowRight
} from 'lucide-react';

export default function CustomerLedger({
  customers,
  sales,
  tenant,
  onViewInvoice = () => {},
  onBillCustomer = () => {}
}) {
  const currency = tenant?.currency || '₹';

  const customerList = useMemo(() => {
    return Array.isArray(customers)
      ? customers
      : (customers?.data || customers?.customers || []);
  }, [customers]);

  const salesList = useMemo(() => {
    return Array.isArray(sales)
      ? sales
      : (sales?.data || sales?.sales || []);
  }, [sales]);

  // Selected customer state
  const [selectedCustomerId, setSelectedCustomerId] = useState(
    Array.isArray(customers) && customers.length > 0 ? String(customers[0]?.id || '') : ''
  );

  useEffect(() => {
    if (!selectedCustomerId && customerList.length > 0) {
      setSelectedCustomerId(String(customerList[0].id));
    }
  }, [customerList, selectedCustomerId]);

  // Search combobox state
  const [customerSearchQuery, setCustomerSearchQuery] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Filtered customers for combobox
  const filteredCustomers = useMemo(() => {
    const q = customerSearchQuery.toLowerCase().trim();
    if (!q) return customerList.slice(0, 30);
    return customerList.filter(
      (c) =>
        (c?.name || '').toLowerCase().includes(q) ||
        (c?.mobile_no && c.mobile_no.includes(q)) ||
        (c?.vehicle_no && c.vehicle_no.toLowerCase().includes(q)) ||
        (c?.vehicle_model && c.vehicle_model.toLowerCase().includes(q))
    ).slice(0, 30);
  }, [customerList, customerSearchQuery]);

  const selectedCustomer = useMemo(() => {
    return customerList.find((c) => c.id === Number(selectedCustomerId));
  }, [customerList, selectedCustomerId]);

  // All sales for this specific customer
  const customerSales = useMemo(() => {
    if (!selectedCustomerId) return [];
    return salesList
      .filter((s) => s.customer_id === Number(selectedCustomerId))
      .sort((a, b) => new Date(a.created_at || 0) - new Date(b.created_at || 0)); // Chronological for ledger
  }, [salesList, selectedCustomerId]);

  // Aggregate metrics
  const totalBilled = useMemo(() => {
    return customerSales.reduce((acc, curr) => acc + Number(curr.total_amount || 0), 0);
  }, [customerSales]);

  const totalDiscount = useMemo(() => {
    return customerSales.reduce((acc, curr) => acc + Number(curr.discount_amount || 0), 0);
  }, [customerSales]);

  return (
    <div className="space-y-6">
      
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-amber-500/15 text-amber-700 flex items-center justify-center">
              <BookOpen className="w-5 h-5" />
            </div>
            <span>Customer Account Ledger</span>
          </h1>
          <p className="text-xs text-slate-500 mt-1 font-medium">
            Individual statement of account, vehicle repair history, and transaction ledger by customer.
          </p>
        </div>

        {selectedCustomer && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => onBillCustomer(selectedCustomer.id)}
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 text-slate-950 font-black text-xs shadow-md shadow-amber-500/20 transition-all cursor-pointer"
            >
              <Receipt className="w-4 h-4" />
              <span>Bill This Client</span>
            </button>

            <button
              onClick={() => window.print()}
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-white hover:bg-slate-50 text-slate-800 border border-slate-300 text-xs font-bold transition-all shrink-0 shadow-xs cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print Statement</span>
            </button>
          </div>
        )}
      </div>

      {/* Customer Selector Search Bar */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-xs" ref={dropdownRef}>
        <label className="text-[10px] font-black uppercase tracking-wider text-slate-500 block mb-1.5">
          Select or Search Customer Account
        </label>

        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={customerSearchQuery}
            onChange={(e) => {
              setCustomerSearchQuery(e.target.value);
              setIsDropdownOpen(true);
            }}
            onFocus={() => setIsDropdownOpen(true)}
            placeholder={selectedCustomer ? `${selectedCustomer.name} (${selectedCustomer.vehicle_no || 'No Plate'})` : 'Type customer name, phone, or vehicle plate...'}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-10 py-2.5 text-xs text-slate-900 font-medium placeholder-slate-400 focus:outline-none focus:border-amber-500 focus:bg-white focus:ring-2 focus:ring-amber-500/10 transition-all"
          />
          <button
            type="button"
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 cursor-pointer"
          >
            <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${isDropdownOpen ? 'rotate-180' : ''}`} />
          </button>

          {/* Floating Dropdown Results */}
          {isDropdownOpen && (
            <div className="absolute left-0 right-0 top-full mt-1.5 z-40 bg-white border border-slate-200 rounded-2xl shadow-2xl max-h-72 overflow-y-auto p-1.5 space-y-0.5 animate-in fade-in zoom-in-95">
              {filteredCustomers.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => {
                    setSelectedCustomerId(String(c.id));
                    setCustomerSearchQuery('');
                    setIsDropdownOpen(false);
                  }}
                  className={`w-full flex items-center justify-between p-2.5 rounded-xl text-left transition-colors cursor-pointer border ${
                    selectedCustomerId === String(c.id)
                      ? 'bg-amber-50 border-amber-300 text-amber-950 font-bold'
                      : 'hover:bg-slate-50 border-transparent text-slate-800'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-8 h-8 rounded-lg bg-amber-500/15 text-amber-800 flex items-center justify-center font-black text-xs shrink-0 uppercase">
                      {c.name.charAt(0)}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-xs truncate">{c.name}</span>
                        {c.vehicle_no && (
                          <span className="px-2 py-0.2 rounded font-mono font-black text-[10px] bg-amber-100 text-amber-950 border border-amber-300">
                            {c.vehicle_no}
                          </span>
                        )}
                      </div>
                      <div className="text-[10px] text-slate-500 truncate mt-0.5">
                        {c.vehicle_model && <span>{c.vehicle_model} &bull; </span>}
                        <span className="font-mono">{c.mobile_no || 'No mobile listed'}</span>
                      </div>
                    </div>
                  </div>

                  <span className="text-[10px] font-semibold text-slate-400">
                    Open Ledger &rarr;
                  </span>
                </button>
              ))}

              {filteredCustomers.length === 0 && (
                <div className="p-4 text-center text-xs text-slate-400">
                  No customer found matching "{customerSearchQuery}"
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {selectedCustomer ? (
        <>
          {/* Customer Profile & Vehicle Header Card */}
          <div className="bg-white text-slate-800 rounded-3xl p-6 border border-slate-200/90 shadow-xs relative overflow-hidden">
            <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
              
              {/* Client Info */}
              <div className="flex items-start gap-4">
                <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-600 font-black text-xl uppercase shadow-xs shrink-0">
                  {selectedCustomer.name.charAt(0)}
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-2.5">
                    <h2 className="text-xl font-black text-slate-900 tracking-tight">{selectedCustomer.name}</h2>
                    {selectedCustomer.vehicle_no && (
                      <span className="px-2.5 py-0.5 rounded-md bg-amber-50 text-amber-700 border border-amber-200 font-mono font-black text-xs tracking-wider uppercase shadow-2xs">
                        {selectedCustomer.vehicle_no}
                      </span>
                    )}
                  </div>
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500">
                    {selectedCustomer.vehicle_model && (
                      <span className="flex items-center gap-1.5 text-slate-700">
                        <Car className="w-3.5 h-3.5 text-amber-600" />
                        <span>{selectedCustomer.vehicle_model}</span>
                      </span>
                    )}
                    {selectedCustomer.mobile_no && (
                      <span className="flex items-center gap-1.5 font-mono">
                        <Phone className="w-3.5 h-3.5 text-slate-400" />
                        <span>{selectedCustomer.mobile_no}</span>
                      </span>
                    )}
                    {selectedCustomer.email && (
                      <span className="flex items-center gap-1.5">
                        <Mail className="w-3.5 h-3.5 text-slate-400" />
                        <span>{selectedCustomer.email}</span>
                      </span>
                    )}
                  </div>
                  {selectedCustomer.address && (
                    <div className="text-[11px] text-slate-500 flex items-center gap-1.5 pt-0.5">
                      <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                      <span>{selectedCustomer.address}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Financial Summary Badges */}
              <div className="flex flex-wrap items-center gap-3 shrink-0">
                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3 min-w-[130px] text-right">
                  <span className="text-[10px] uppercase font-bold text-slate-500 block">Total Lifetime Billed</span>
                  <span className="text-lg font-black font-mono text-amber-600">
                    {currency}{totalBilled.toFixed(2)}
                  </span>
                </div>
                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3 min-w-[110px] text-right">
                  <span className="text-[10px] uppercase font-bold text-slate-500 block">Invoices</span>
                  <span className="text-lg font-black font-mono text-slate-900">
                    {customerSales.length}
                  </span>
                </div>
                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3 min-w-[110px] text-right">
                  <span className="text-[10px] uppercase font-bold text-slate-500 block">Balance Due</span>
                  <span className="text-lg font-black font-mono text-emerald-600">
                    Settled
                  </span>
                </div>
              </div>

            </div>
          </div>

          {/* Ledger Statement Table */}
          <div className="bg-white border border-slate-200/90 rounded-2xl overflow-hidden shadow-xs">
            <div className="p-4 border-b border-slate-200 flex items-center justify-between">
              <div>
                <h3 className="font-extrabold text-sm text-slate-900">
                  Statement of Account ({customerSales.length} Transactions)
                </h3>
                <p className="text-xs text-slate-500">Chronological service orders and payment vouchers</p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50/80 text-slate-600 font-bold uppercase text-[10px] tracking-wider border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-4">Date</th>
                    <th className="py-3 px-4">Invoice #</th>
                    <th className="py-3 px-4">Services / Parts Provided</th>
                    <th className="py-3 px-4">Payment Mode</th>
                    <th className="py-3 px-4 text-right">Subtotal</th>
                    <th className="py-3 px-4 text-right">Discount</th>
                    <th className="py-3 px-4 text-right">Debit (Billed)</th>
                    <th className="py-3 px-4 text-right font-black">Credit (Paid)</th>
                    <th className="py-3 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {customerSales.map((sale) => (
                    <tr key={sale.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3.5 px-4 text-slate-600 font-mono whitespace-nowrap">
                        <span className="font-semibold text-slate-800 block">
                          {sale.created_at ? new Date(sale.created_at).toLocaleDateString() : '—'}
                        </span>
                        <span className="text-[10px] text-slate-400">
                          {sale.created_at ? new Date(sale.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 font-mono font-bold text-amber-700 whitespace-nowrap">
                        {sale.invoice_no}
                      </td>
                      <td className="py-3.5 px-4 text-slate-700 max-w-xs truncate">
                        {sale.items && sale.items.length > 0 ? (
                          <span>
                            {sale.items[0].item_name}
                            {sale.items.length > 1 && (
                              <span className="text-amber-700 font-bold ml-1">+{sale.items.length - 1} items</span>
                            )}
                          </span>
                        ) : (
                          'Service bill'
                        )}
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-slate-100 text-slate-700 border border-slate-200">
                          {sale.payment_method}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono text-slate-600">
                        {currency}{Number(sale.subtotal || sale.total_amount).toFixed(2)}
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono text-emerald-700">
                        {Number(sale.discount_amount) > 0 ? `-${currency}${Number(sale.discount_amount).toFixed(2)}` : '—'}
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono font-bold text-slate-900">
                        {currency}{Number(sale.total_amount).toFixed(2)}
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono font-black text-emerald-700 whitespace-nowrap">
                        {currency}{Number(sale.total_amount).toFixed(2)}
                      </td>
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <button
                          onClick={() => onViewInvoice(sale)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-amber-500 hover:text-slate-950 text-slate-700 text-[11px] font-bold transition-all shadow-xs cursor-pointer"
                        >
                          <Receipt className="w-3.5 h-3.5" />
                          <span>Receipt</span>
                        </button>
                      </td>
                    </tr>
                  ))}

                  {customerSales.length === 0 && (
                    <tr>
                      <td colSpan={9} className="py-12 text-center text-slate-400">
                        No invoices recorded for {selectedCustomer.name} yet. Click "Bill This Client" above to create their first ticket.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      ) : (
        <div className="py-16 text-center text-slate-400 bg-white rounded-3xl border border-slate-200">
          <User className="w-10 h-10 text-slate-300 mx-auto mb-2" />
          <p className="font-bold text-slate-700">No Customer Selected</p>
          <p className="text-xs text-slate-400 mt-1">Search and select a customer above to view their statement of account.</p>
        </div>
      )}

    </div>
  );
}
