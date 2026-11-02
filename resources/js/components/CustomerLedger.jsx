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
  ArrowRight,
  MessageCircle
} from 'lucide-react';
import { printElement, numberToWordsIndian } from '../utils/printHelper';
import { formatDateDMY } from '../utils/dateHelper';

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

  const handleSendWhatsAppReminder = () => {
    if (!selectedCustomer) return;

    const rawPhone = selectedCustomer.mobile_no || selectedCustomer.phone;
    if (!rawPhone) {
      alert('No mobile number available for this customer.');
      return;
    }

    let cleanPhone = String(rawPhone).replace(/[^0-9]/g, '');
    if (cleanPhone.length === 10) {
      cleanPhone = '91' + cleanPhone;
    }

    const dueAmount = Number(selectedCustomer.current_balance !== undefined ? selectedCustomer.current_balance : totalBilled);
    const storeName = tenant?.name || 'KRISHNA BOOK AGENCY';
    const partyName = selectedCustomer.name || 'Customer';

    const message = `Dear ${partyName},\n\nThis is a gentle payment reminder from *${storeName}*.\nYour current outstanding balance due is *₹${dueAmount > 0 ? dueAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '0.00'}*.\n\nKindly arrange the payment at your earliest convenience.\n\nThank you!\n*${storeName}*`;

    const waUrl = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;
    window.open(waUrl, '_blank', 'noopener,noreferrer');
  };

  return (
    <div id="printable-customer-ledger-panel" className="space-y-6">
      
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 no-print">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-amber-500/15 text-amber-700 flex items-center justify-center">
              <BookOpen className="w-5 h-5" />
            </div>
            <span>Customer Account Ledger</span>
          </h1>
          <p className="text-xs text-slate-500 mt-1 font-medium">
            Individual statement of account, wholesale orders, book supply invoices, and transaction ledger by party.
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
              type="button"
              onClick={handleSendWhatsAppReminder}
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs shadow-xs transition-all cursor-pointer no-print"
              title="Send WhatsApp payment reminder for due payment"
            >
              <MessageCircle className="w-4 h-4 text-white" />
              <span>WhatsApp Due Reminder</span>
            </button>

            <button
              type="button"
              onClick={() => {
                printElement('printable-customer-ledger-panel', {
                  title: `Statement - ${selectedCustomer.name}`
                });
              }}
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs transition-all shrink-0 shadow-xs cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print Statement</span>
            </button>
          </div>
        )}
      </div>

      {/* Customer Selector Search Bar */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-xs no-print" ref={dropdownRef}>
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
          {/* Customer Profile & Vehicle Header Card (no-print) */}
          <div className="bg-white text-slate-800 rounded-3xl p-6 border border-slate-200/90 shadow-xs relative overflow-hidden no-print">
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

          {/* Sale-Invoice-Style Customer Statement / Ledger */}
          <div className="bg-white p-1 sm:p-2 border border-slate-200 sm:border-0 rounded-none shadow-none">
            {/* Document Header Title */}
            <div className="text-center font-bold text-xs uppercase tracking-wider pb-1.5 text-black">
              PARTY STATEMENT / CUSTOMER LEDGER
            </div>

            {/* Master Box with 2px solid black border & sharp rectangular shape */}
            <table
              className="w-full border-collapse border-2 border-black"
              style={{ width: '100%', borderCollapse: 'collapse', border: '2px solid black' }}
            >
              <tbody>
                {/* Row 1: Header (Store Details Left & Party Details Right) */}
                <tr>
                  {/* Left Column: Store Details */}
                  <td
                    style={{ width: '50%', verticalAlign: 'top', padding: '12px 14px', borderRight: '2px solid black', borderBottom: '2px solid black' }}
                    className="w-1/2 p-3 sm:p-4 align-top border-r-2 border-b-2 border-black text-center sm:text-left print-header-cell"
                  >
                    <h1 className="text-xl sm:text-2xl font-black uppercase text-[#1e3a8a] tracking-tight mb-1 text-center">
                      {tenant?.name || ''}
                    </h1>
                    <div className="space-y-0.5 text-[11px] sm:text-xs text-slate-800 text-center font-medium">
                      {tenant?.address && <div>{tenant.address}</div>}
                      {tenant?.phone && <div>Mobile No: {tenant.phone}</div>}
                      {(tenant?.tax_number || tenant?.gst_number || tenant?.gstin) && (
                        <div className="font-mono">GST No. {tenant.tax_number || tenant.gst_number || tenant.gstin}</div>
                      )}
                      {tenant?.email && <div>Email: {tenant.email}</div>}
                    </div>
                  </td>

                  {/* Right Column: Customer Details */}
                  <td
                    style={{ width: '50%', verticalAlign: 'top', padding: '12px 14px', borderBottom: '2px solid black' }}
                    className="w-1/2 p-3 sm:p-4 align-top border-b-2 border-black text-xs space-y-1 print-header-cell"
                  >
                    <div className="flex items-start">
                      <span className="w-28 font-bold text-black shrink-0">Party Name:</span>
                      <span className="font-bold uppercase text-black text-sm">{selectedCustomer.name}</span>
                    </div>
                    {selectedCustomer.address && (
                      <div className="flex items-start">
                        <span className="w-28 font-bold text-black shrink-0">Address:-</span>
                        <span className="uppercase text-black">{selectedCustomer.address}</span>
                      </div>
                    )}
                    {selectedCustomer.mobile_no && (
                      <div className="flex items-center">
                        <span className="w-28 font-bold text-black shrink-0">Mobile No:-</span>
                        <span className="font-mono text-black">{selectedCustomer.mobile_no}</span>
                      </div>
                    )}
                    {selectedCustomer.email && (
                      <div className="flex items-center">
                        <span className="w-28 font-bold text-black shrink-0">Email:-</span>
                        <span className="text-black font-mono lowercase">{selectedCustomer.email}</span>
                      </div>
                    )}
                    <div className="flex items-center">
                      <span className="w-28 font-bold text-black shrink-0">Account Type:-</span>
                      <span className="font-bold uppercase text-slate-900">Customer (Receivable)</span>
                    </div>
                    <div className="flex items-center">
                      <span className="w-28 font-bold text-red-600 shrink-0">Statement Date:-</span>
                      <span className="font-bold text-red-600 font-mono">
                        {formatDateDMY(new Date())}
                      </span>
                    </div>
                  </td>
                </tr>

                {/* Row 2: Transactions Table */}
                <tr>
                  <td colSpan={2} style={{ padding: 0, borderBottom: '2px solid black' }} className="p-0 border-b-2 border-black">
                    <table
                      className="w-full text-left border-collapse invoice-table"
                      style={{ width: '100%', borderCollapse: 'collapse' }}
                    >
                      <thead>
                        <tr className="bg-white text-black font-bold uppercase text-xs">
                          <th style={{ border: '1px solid black', padding: '0px 8px', textAlign: 'center', width: '40px' }} className="border border-black py-0 px-2 text-center w-10">SN</th>
                          <th style={{ border: '1px solid black', padding: '0px 8px', textAlign: 'center', width: '90px' }} className="border border-black py-0 px-2 text-center w-24">Date</th>
                          <th style={{ border: '1px solid black', padding: '0px 10px', textAlign: 'center', width: '120px' }} className="border border-black py-0 px-2.5 text-center w-28">Invoice #</th>
                          <th style={{ border: '1px solid black', padding: '0px 12px', textAlign: 'left' }} className="border border-black py-0 px-3 text-left">Services / Books Supplied</th>
                          <th style={{ border: '1px solid black', padding: '0px 10px', textAlign: 'center', width: '90px' }} className="border border-black py-0 px-2.5 text-center w-24">Pay Mode</th>
                          <th style={{ border: '1px solid black', padding: '0px 10px', textAlign: 'right', width: '95px' }} className="border border-black py-0 px-2.5 text-right w-24">Subtotal</th>
                          <th style={{ border: '1px solid black', padding: '0px 10px', textAlign: 'right', width: '85px' }} className="border border-black py-0 px-2.5 text-right w-20">Discount</th>
                          <th style={{ border: '1px solid black', padding: '0px 10px', textAlign: 'right', width: '100px' }} className="border border-black py-0 px-2.5 text-right w-24">Debit ({currency})</th>
                          <th style={{ border: '1px solid black', padding: '0px 10px', textAlign: 'right', width: '100px' }} className="border border-black py-0 px-2.5 text-right w-24">Credit ({currency})</th>
                          <th style={{ border: '1px solid black', padding: '0px 8px', textAlign: 'center', width: '80px' }} className="border border-black py-0 px-2 text-center w-20 no-print">Action</th>
                        </tr>
                      </thead>
                      <tbody className="text-xs text-black">
                        {customerSales.map((sale, idx) => (
                          <tr key={sale.id} className="leading-snug">
                            <td style={{ border: '1px solid black', padding: '0px 8px', textAlign: 'center' }} className="border border-black py-0 px-2 text-center font-mono">{idx + 1}</td>
                            <td style={{ border: '1px solid black', padding: '0px 8px', textAlign: 'center' }} className="border border-black py-0 px-2 text-center font-mono">
                              {sale.created_at ? formatDateDMY(sale.created_at) : '—'}
                            </td>
                            <td style={{ border: '1px solid black', padding: '0px 10px', textAlign: 'center' }} className="border border-black py-0 px-2.5 text-center font-mono font-bold text-amber-700">
                              {sale.invoice_no}
                            </td>
                            <td style={{ border: '1px solid black', padding: '0px 12px', textAlign: 'left' }} className="border border-black py-0 px-3 font-semibold uppercase">
                              {sale.items && sale.items.length > 0 ? (
                                <span>
                                  {sale.items[0].item_name}
                                  {sale.items.length > 1 && (
                                    <span className="text-slate-600 font-normal ml-1">+{sale.items.length - 1} items</span>
                                  )}
                                </span>
                              ) : (
                                'Wholesale invoice'
                              )}
                            </td>
                            <td style={{ border: '1px solid black', padding: '0px 10px', textAlign: 'center' }} className="border border-black py-0 px-2.5 text-center font-mono uppercase">
                              {sale.payment_method}
                            </td>
                            <td style={{ border: '1px solid black', padding: '0px 10px', textAlign: 'right' }} className="border border-black py-0 px-2.5 text-right font-mono">
                              {Number(sale.subtotal || sale.total_amount).toFixed(2)}
                            </td>
                            <td style={{ border: '1px solid black', padding: '0px 10px', textAlign: 'right' }} className="border border-black py-0 px-2.5 text-right font-mono text-emerald-700">
                              {Number(sale.discount_amount) > 0 ? Number(sale.discount_amount).toFixed(2) : '-'}
                            </td>
                            <td style={{ border: '1px solid black', padding: '0px 10px', textAlign: 'right' }} className="border border-black py-0 px-2.5 text-right font-mono font-bold text-slate-900">
                              {Number(sale.total_amount).toFixed(2)}
                            </td>
                            <td style={{ border: '1px solid black', padding: '0px 10px', textAlign: 'right' }} className="border border-black py-0 px-2.5 text-right font-mono font-black text-emerald-700">
                              {Number(sale.total_amount).toFixed(2)}
                            </td>
                            <td style={{ border: '1px solid black', padding: '0px 8px', textAlign: 'center' }} className="border border-black py-0 px-2 text-center no-print">
                              <button
                                onClick={() => onViewInvoice(sale)}
                                className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-slate-100 hover:bg-amber-500 hover:text-slate-950 text-slate-700 text-[10px] font-bold transition-all shadow-xs cursor-pointer"
                              >
                                <Receipt className="w-3 h-3" />
                                <span>Bill</span>
                              </button>
                            </td>
                          </tr>
                        ))}

                        {customerSales.length === 0 && (
                          <tr>
                            <td colSpan={10} style={{ border: '1px solid black', padding: '8px', textAlign: 'center' }} className="border border-black py-2 text-center text-slate-400 text-xs">
                              No invoices recorded for {selectedCustomer.name} yet.
                            </td>
                          </tr>
                        )}

                        {/* Total Row */}
                        <tr className="font-bold text-xs bg-white">
                          <td style={{ border: '1px solid black', padding: '0px 8px' }} className="border border-black py-0 px-2"></td>
                          <td style={{ border: '1px solid black', padding: '0px 8px' }} className="border border-black py-0 px-2"></td>
                          <td style={{ border: '1px solid black', padding: '0px 10px', textAlign: 'center' }} className="border border-black py-0 px-2.5 text-center font-bold uppercase tracking-wider">Total</td>
                          <td style={{ border: '1px solid black', padding: '0px 12px' }} className="border border-black py-0 px-3"></td>
                          <td style={{ border: '1px solid black', padding: '0px 10px' }} className="border border-black py-0 px-2.5"></td>
                          <td style={{ border: '1px solid black', padding: '0px 10px' }} className="border border-black py-0 px-2.5"></td>
                          <td style={{ border: '1px solid black', padding: '0px 10px' }} className="border border-black py-0 px-2.5"></td>
                          <td style={{ border: '1px solid black', padding: '0px 10px', textAlign: 'right' }} className="border border-black py-0 px-2.5 text-right font-mono font-bold">
                            {totalBilled.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </td>
                          <td style={{ border: '1px solid black', padding: '0px 10px', textAlign: 'right' }} className="border border-black py-0 px-2.5 text-right font-mono font-bold text-emerald-700">
                            {totalBilled.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </td>
                          <td style={{ border: '1px solid black', padding: '0px 8px' }} className="border border-black py-0 px-2 no-print"></td>
                        </tr>
                      </tbody>
                    </table>
                  </td>
                </tr>

                {/* Row 3: Bottom Summary Section */}
                <tr>
                  {/* Amount in Words (Left Side - 58%) */}
                  <td
                    style={{ width: '58%', verticalAlign: 'top', padding: 0, borderRight: '2px solid black' }}
                    className="w-[58%] align-top p-0 border-r-2 border-black"
                  >
                    <table style={{ width: '100%', height: '100%', borderCollapse: 'collapse' }} className="w-full h-full border-collapse">
                      <tbody>
                        <tr>
                          <td
                            style={{ borderBottom: '1px solid black', padding: '0px 12px', fontWeight: 'bold', fontSize: '11px', textTransform: 'uppercase' }}
                            className="border-b border-black px-3 py-0 font-bold text-xs uppercase text-black bg-slate-50 print:bg-transparent"
                          >
                            Total Lifetime Billed in Words
                          </td>
                        </tr>
                        <tr>
                          <td
                            style={{ padding: '8px 12px', fontWeight: 'bold', fontSize: '12px', textTransform: 'uppercase', lineHeight: '1.4' }}
                            className="px-3 py-2 font-bold text-xs uppercase leading-relaxed text-black"
                          >
                            {numberToWordsIndian(totalBilled)}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </td>

                  {/* Financial Summary Table (Right Side - 42%) */}
                  <td
                    style={{ width: '42%', verticalAlign: 'top', padding: 0 }}
                    className="w-[42%] align-top p-0"
                  >
                    <table style={{ width: '100%', borderCollapse: 'collapse' }} className="w-full text-xs border-collapse">
                      <tbody>
                        <tr>
                          <td style={{ borderBottom: '1px solid black', padding: '0px 12px', fontWeight: 'bold' }} className="border-b border-black px-3 py-0 font-bold text-black">Total Lifetime Billed</td>
                          <td style={{ borderBottom: '1px solid black', padding: '0px 12px', fontWeight: 'bold', textAlign: 'right' }} className="border-b border-black px-3 py-0 font-bold font-mono text-right text-black">
                            {currency}{totalBilled.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </td>
                        </tr>
                        <tr>
                          <td style={{ borderBottom: '1px solid black', padding: '0px 12px', fontWeight: 'bold' }} className="border-b border-black px-3 py-0 font-bold text-black">Total Invoices</td>
                          <td style={{ borderBottom: '1px solid black', padding: '0px 12px', fontWeight: 'bold', textAlign: 'right' }} className="border-b border-black px-3 py-0 font-bold font-mono text-right text-black">
                            {customerSales.length}
                          </td>
                        </tr>
                        <tr>
                          <td style={{ padding: '0px 12px', fontWeight: '900', color: '#16a34a' }} className="px-3 py-0 font-black text-emerald-600">Balance Status</td>
                          <td style={{ padding: '0px 12px', fontWeight: '900', textAlign: 'right', color: '#16a34a', fontSize: '14px' }} className="px-3 py-0 font-black font-mono text-right text-emerald-600 text-sm">
                            SETTLED
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </td>
                </tr>
              </tbody>
            </table>

            {/* Footer below the box */}
            <div className="flex justify-end items-center pt-2 px-1 text-[11px] text-slate-700 font-medium">
              <span className="text-red-600 font-black text-sm tracking-wider">ACCOUNT STATEMENT</span>
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
