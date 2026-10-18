import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import {
  BellRing,
  Send,
  MessageSquare,
  CheckCircle2,
  Clock,
  AlertCircle,
  Search,
  RefreshCw,
  Phone,
  Calendar,
  CreditCard,
  Building2,
  FileText,
  Copy,
  ExternalLink,
  DollarSign,
  TrendingUp,
  History,
  X,
  User,
  ArrowRight
} from 'lucide-react';

export default function PaymentReminders({ tenant, onDataUpdated, addToast }) {
  const [data, setData] = useState({
    summary: {
      total_receivables: 0,
      pending_invoices_count: 0,
      unique_customers_count: 0,
      overdue_30_amount: 0,
      total_reminders_sent: 0,
    },
    receivables: [],
    recent_reminders: [],
  });

  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState('all'); // 'all', 'overdue_7', 'overdue_30', 'high_value'
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Settlement Modal State
  const [settleModalOpen, setSettleModalOpen] = useState(false);
  const [selectedReceivable, setSelectedReceivable] = useState(null);
  const [settleForm, setSettleForm] = useState({
    amount: '',
    payment_mode: 'cash',
    reference_no: '',
    narration: '',
  });
  const [isSubmittingSettle, setIsSubmittingSettle] = useState(false);

  // History Tab / Modal State
  const [showHistoryModal, setShowHistoryModal] = useState(false);

  // Currency symbol helper
  const currencySymbol = tenant?.currency || '₹';

  const fetchReminders = async () => {
    try {
      setIsRefreshing(true);
      const res = await axios.get('/api/payment-reminders');
      if (res.data) {
        setData(res.data);
      }
    } catch (err) {
      console.error('Failed to load payment reminders:', err);
      if (addToast) addToast('Failed to load payment reminders.', 'error');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchReminders();
  }, []);

  // Filtered Receivables
  const filteredReceivables = useMemo(() => {
    let items = data.receivables || [];

    // Filter chip logic
    if (activeFilter === 'overdue_30') {
      items = items.filter((r) => r.days_overdue >= 30);
    } else if (activeFilter === 'overdue_7') {
      items = items.filter((r) => r.days_overdue >= 7);
    } else if (activeFilter === 'high_value') {
      items = items.filter((r) => r.due_amount >= 500);
    }

    // Text Search
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      items = items.filter((r) =>
        (r.customer_name && r.customer_name.toLowerCase().includes(q)) ||
        (r.invoice_no && r.invoice_no.toLowerCase().includes(q)) ||
        (r.mobile_no && r.mobile_no.includes(q)) ||
        (r.branch_name && r.branch_name.toLowerCase().includes(q))
      );
    }

    return items;
  }, [data.receivables, activeFilter, searchQuery]);

  // Handle WhatsApp Reminder Click
  const handleSendWhatsApp = async (rec) => {
    if (!rec.whatsapp_url) {
      if (addToast) addToast('No valid mobile number available for this customer.', 'error');
      return;
    }

    // Open WhatsApp URL in new window/tab
    window.open(rec.whatsapp_url, '_blank', 'noopener,noreferrer');

    // Auto-log reminder to backend
    try {
      await axios.post('/api/payment-reminders/log', {
        customer_id: rec.customer_id,
        sale_id: rec.sale_id,
        channel: 'whatsapp',
        recipient: rec.mobile_no,
        amount: rec.due_amount,
        message: rec.reminder_message,
        notes: `WhatsApp reminder dispatched for ${rec.invoice_no}`,
      });

      if (addToast) addToast(`WhatsApp reminder dispatched to ${rec.customer_name}!`, 'success');

      // Refresh list in background to update reminder count
      fetchReminders();
    } catch (err) {
      console.error('Failed to log reminder event:', err);
    }
  };

  // Copy Reminder Text
  const handleCopyMessage = (text) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    if (addToast) addToast('Reminder message copied to clipboard!', 'success');
  };

  // Open Settlement Modal
  const handleOpenSettle = (rec) => {
    setSelectedReceivable(rec);
    setSettleForm({
      amount: rec.due_amount.toString(),
      payment_mode: 'cash',
      reference_no: rec.invoice_no !== 'LEDGER-BAL' ? rec.invoice_no : '',
      narration: `Payment received against ${rec.invoice_no}`,
    });
    setSettleModalOpen(true);
  };

  // Submit Settlement
  const handleSubmitSettle = async (e) => {
    e.preventDefault();
    if (!selectedReceivable) return;

    const amountNum = parseFloat(settleForm.amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      if (addToast) addToast('Please enter a valid payment amount.', 'error');
      return;
    }

    try {
      setIsSubmittingSettle(true);
      const payload = {
        customer_id: selectedReceivable.customer_id,
        sale_id: selectedReceivable.sale_id,
        amount: amountNum,
        payment_mode: settleForm.payment_mode,
        reference_no: settleForm.reference_no,
        narration: settleForm.narration,
      };

      const res = await axios.post('/api/payment-reminders/settle', payload);

      if (addToast) addToast('Payment settled and receipt voucher created successfully!', 'success');

      setSettleModalOpen(false);
      setSelectedReceivable(null);

      // Refresh data
      fetchReminders();
      if (onDataUpdated) onDataUpdated();
    } catch (err) {
      console.error('Failed to settle payment:', err);
      const msg = err.response?.data?.message || 'Failed to settle payment.';
      if (addToast) addToast(msg, 'error');
    } finally {
      setIsSubmittingSettle(false);
    }
  };  return (
    <div className="space-y-6 pb-12">
      {/* Header Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-600 shadow-inner">
              <BellRing className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
                Payment Reminders & Receivables
                <span className="text-[11px] px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-300 font-bold">
                  WhatsApp Enabled
                </span>
              </h1>
              <p className="text-xs text-slate-500 mt-0.5">
                Track pending wholesale buyer balances, dispatch 1-click WhatsApp reminders, and record quick payment receipts.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowHistoryModal(true)}
            className="flex items-center gap-2 px-3 py-2 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-xl transition cursor-pointer"
          >
            <History className="w-3.5 h-3.5 text-amber-600" />
            <span>Reminder History</span>
          </button>
          <button
            onClick={fetchReminders}
            disabled={isRefreshing}
            className="flex items-center gap-2 px-3.5 py-2 text-xs font-bold text-slate-950 bg-amber-500 hover:bg-amber-400 rounded-xl transition shadow-xs cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* KPI Summary Cards (Light Background) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Receivables */}
        <div className="bg-white border border-rose-200 rounded-2xl p-4 shadow-xs relative overflow-hidden group">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-rose-700 uppercase tracking-wider">Total Receivables</span>
            <div className="w-8 h-8 rounded-lg bg-rose-50 border border-rose-200 flex items-center justify-center text-rose-600">
              <AlertCircle className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-black text-slate-900 tracking-tight font-mono">
              {currencySymbol}{Number(data.summary?.total_receivables || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </div>
            <div className="text-[11px] text-slate-500 mt-1 flex items-center gap-1 font-medium">
              <span className="text-rose-600 font-bold">{data.summary?.pending_invoices_count || 0}</span> pending bills/ledgers
            </div>
          </div>
        </div>

        {/* Unique Customers in Due */}
        <div className="bg-white border border-amber-200 rounded-2xl p-4 shadow-xs relative overflow-hidden group">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-amber-800 uppercase tracking-wider">Overdue Accounts</span>
            <div className="w-8 h-8 rounded-lg bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600">
              <User className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-black text-slate-900 tracking-tight font-mono">
              {data.summary?.unique_customers_count || 0}
            </div>
            <div className="text-[11px] text-slate-500 mt-1 flex items-center gap-1 font-medium">
              Active buyers with open debt
            </div>
          </div>
        </div>

        {/* 30+ Days Overdue */}
        <div className="bg-white border border-orange-200 rounded-2xl p-4 shadow-xs relative overflow-hidden group">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-orange-800 uppercase tracking-wider">Overdue &gt; 30 Days</span>
            <div className="w-8 h-8 rounded-lg bg-orange-50 border border-orange-200 flex items-center justify-center text-orange-600">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-black text-slate-900 tracking-tight font-mono">
              {currencySymbol}{Number(data.summary?.overdue_30_amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </div>
            <div className="text-[11px] text-slate-500 mt-1 font-medium">
              Requires immediate follow-up
            </div>
          </div>
        </div>

        {/* Reminders Sent */}
        <div className="bg-white border border-emerald-200 rounded-2xl p-4 shadow-xs relative overflow-hidden group">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-emerald-800 uppercase tracking-wider">Total Reminders Sent</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600">
              <Send className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-black text-slate-900 tracking-tight font-mono">
              {data.summary?.total_reminders_sent || 0}
            </div>
            <div className="text-[11px] text-slate-500 mt-1 font-medium">
              WhatsApp & recorded dispatches
            </div>
          </div>
        </div>
      </div>

      {/* Filters and Search Bar (Light Background) */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white border border-slate-200/90 p-3 rounded-2xl shadow-xs">
        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
          {[
            { id: 'all', label: 'All Dues' },
            { id: 'overdue_7', label: 'Overdue > 7 Days' },
            { id: 'overdue_30', label: 'Overdue > 30 Days' },
            { id: 'high_value', label: 'High Value (₹500+)' },
          ].map((pill) => (
            <button
              key={pill.id}
              onClick={() => setActiveFilter(pill.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                activeFilter === pill.id
                  ? 'bg-amber-500 text-slate-950 font-black shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              {pill.label}
            </button>
          ))}
        </div>

        {/* Search Input */}
        <div className="relative w-full sm:w-72">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search customer, invoice or mobile..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:border-amber-500 transition font-medium"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
            >
              <X className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>

      {/* Receivables Table (Light Background) */}
      <div className="bg-white border border-slate-200/90 rounded-2xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-mono uppercase text-slate-600 tracking-wider">
                <th className="py-3.5 px-4">Customer & Contact</th>
                <th className="py-3.5 px-4">Ref / Invoice</th>
                <th className="py-3.5 px-4">Branch</th>
                <th className="py-3.5 px-4 text-right">Bill Total</th>
                <th className="py-3.5 px-4 text-right">Paid</th>
                <th className="py-3.5 px-4 text-right">Due Amount</th>
                <th className="py-3.5 px-4 text-center">Overdue Status</th>
                <th className="py-3.5 px-4 text-center">Reminders</th>
                <th className="py-3.5 px-4 text-right">Quick Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {isLoading ? (
                <tr>
                  <td colSpan="9" className="py-12 text-center text-slate-400">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-amber-500" />
                    Loading payment receivables...
                  </td>
                </tr>
              ) : filteredReceivables.length === 0 ? (
                <tr>
                  <td colSpan="9" className="py-12 text-center text-slate-400">
                    <CheckCircle2 className="w-10 h-10 mx-auto mb-2 text-emerald-500/70" />
                    <div className="font-bold text-slate-700">No overdue receivables found</div>
                    <div className="text-[11px] text-slate-500 mt-1">
                      {searchQuery ? 'Try matching a different keyword or reset filters.' : 'All customer accounts and bills are fully settled!'}
                    </div>
                  </td>
                </tr>
              ) : (
                filteredReceivables.map((rec) => {
                  const isHighOverdue = rec.days_overdue >= 30;
                  const isModerateOverdue = rec.days_overdue >= 7 && rec.days_overdue < 30;

                  return (
                    <tr
                      key={rec.id}
                      className="hover:bg-slate-50/80 transition-colors group"
                    >
                      {/* Customer & Contact */}
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-slate-900 group-hover:text-amber-700 transition-colors">
                          {rec.customer_name}
                        </div>
                        <div className="flex items-center gap-2 mt-0.5 text-[11px] text-slate-500">
                          {rec.mobile_no ? (
                            <span className="flex items-center gap-1 font-mono text-slate-600 font-medium">
                              <Phone className="w-3 h-3 text-slate-400" />
                              {rec.mobile_no}
                            </span>
                          ) : (
                            <span className="text-slate-400 italic">No phone</span>
                          )}
                        </div>
                      </td>

                      {/* Invoice No & Date */}
                      <td className="py-3.5 px-4">
                        <div className="font-mono text-slate-900 font-bold">
                          {rec.invoice_no}
                        </div>
                        <div className="text-[11px] text-slate-400 flex items-center gap-1 font-mono">
                          <Calendar className="w-3 h-3 text-slate-400" />
                          {rec.invoice_date}
                        </div>
                      </td>

                      {/* Branch */}
                      <td className="py-3.5 px-4">
                        <span className="inline-flex items-center gap-1 text-[11px] text-slate-700 bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200">
                          <Building2 className="w-3 h-3 text-slate-500" />
                          {rec.branch_name}
                        </span>
                      </td>

                      {/* Bill Total */}
                      <td className="py-3.5 px-4 text-right font-mono text-slate-600 font-medium">
                        {currencySymbol}{Number(rec.total_amount).toFixed(2)}
                      </td>

                      {/* Paid Amount */}
                      <td className="py-3.5 px-4 text-right font-mono text-emerald-700 font-bold">
                        {currencySymbol}{Number(rec.paid_amount).toFixed(2)}
                      </td>

                      {/* Due Amount */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="font-mono font-black text-rose-600 text-sm">
                          {currencySymbol}{Number(rec.due_amount).toFixed(2)}
                        </div>
                      </td>

                      {/* Overdue Status */}
                      <td className="py-3.5 px-4 text-center">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${
                            isHighOverdue
                              ? 'bg-rose-50 text-rose-700 border-rose-300'
                              : isModerateOverdue
                              ? 'bg-amber-50 text-amber-800 border-amber-300'
                              : 'bg-emerald-50 text-emerald-800 border-emerald-300'
                          }`}
                        >
                          <Clock className="w-3 h-3" />
                          {rec.days_overdue} days
                        </span>
                      </td>

                      {/* Reminders count / status */}
                      <td className="py-3.5 px-4 text-center">
                        {rec.reminders_count > 0 ? (
                          <div className="inline-flex flex-col items-center">
                            <span className="text-[11px] font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                              {rec.reminders_count} sent
                            </span>
                            {rec.last_reminded_at && (
                              <span className="text-[9px] text-slate-400 mt-0.5 font-mono">
                                {rec.last_reminded_at.split(',')[0]}
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-[11px] text-slate-400 font-medium">None yet</span>
                        )}
                      </td>

                      {/* Quick Actions */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* 1-Click WhatsApp Reminder */}
                          <button
                            onClick={() => handleSendWhatsApp(rec)}
                            disabled={!rec.mobile_no}
                            title={rec.mobile_no ? 'Send WhatsApp Payment Reminder' : 'No mobile number'}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-bold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs transition cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                          >
                            <MessageSquare className="w-3.5 h-3.5 fill-current" />
                            WhatsApp
                          </button>

                          {/* Copy Message */}
                          <button
                            onClick={() => handleCopyMessage(rec.reminder_message)}
                            title="Copy reminder message"
                            className="p-1.5 text-slate-500 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-lg transition cursor-pointer"
                          >
                            <Copy className="w-3.5 h-3.5" />
                          </button>

                          {/* Collect / Quick Settle */}
                          <button
                            onClick={() => handleOpenSettle(rec)}
                            title="Collect Payment & Create Voucher"
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-bold rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-xs transition cursor-pointer"
                          >
                            <CreditCard className="w-3.5 h-3.5" />
                            Settle
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Footer info */}
        <div className="px-4 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
          <div>
            Showing <span className="font-bold text-slate-900">{filteredReceivables.length}</span> of{' '}
            <span className="font-bold text-slate-900">{data.receivables?.length || 0}</span> overdue accounts
          </div>
          <div className="text-[11px] text-slate-400">
            Clicking WhatsApp instantly opens WhatsApp Web / Mobile App with pre-filled invoice reminder & logs the interaction.
          </div>
        </div>
      </div>

      {/* QUICK SETTLEMENT MODAL */}
      {settleModalOpen && selectedReceivable && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white border border-slate-200 rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden text-slate-900">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-5 border-b border-slate-200 bg-slate-50/80">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-600">
                  <CreditCard className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Record Payment Receipt</h3>
                  <p className="text-xs text-slate-500">
                    Settle balance for <span className="text-amber-700 font-bold">{selectedReceivable.customer_name}</span>
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSettleModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSubmitSettle} className="p-5 space-y-4">
              {/* Summary Overview */}
              <div className="grid grid-cols-2 gap-3 p-3 bg-slate-50 rounded-2xl border border-slate-200 text-xs">
                <div>
                  <span className="text-slate-500 font-semibold">Ref / Invoice:</span>
                  <div className="font-bold text-slate-900 font-mono mt-0.5">{selectedReceivable.invoice_no}</div>
                </div>
                <div>
                  <span className="text-slate-500 font-semibold">Current Due:</span>
                  <div className="font-black text-rose-600 font-mono text-sm mt-0.5">
                    {currencySymbol}{Number(selectedReceivable.due_amount).toFixed(2)}
                  </div>
                </div>
              </div>

              {/* Amount to Collect */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Settlement Amount ({currencySymbol}) *
                </label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={settleForm.amount}
                  onChange={(e) => setSettleForm({ ...settleForm, amount: e.target.value })}
                  placeholder="0.00"
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-mono font-bold text-sm focus:bg-white focus:outline-none focus:border-amber-500"
                />
              </div>

              {/* Payment Mode */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Payment Mode *
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {[
                    { id: 'cash', label: '💵 Cash' },
                    { id: 'upi', label: '📱 UPI' },
                    { id: 'bank', label: '🏛️ Bank' },
                    { id: 'cheque', label: '📄 Cheque' },
                  ].map((mode) => (
                    <button
                      key={mode.id}
                      type="button"
                      onClick={() => setSettleForm({ ...settleForm, payment_mode: mode.id })}
                      className={`py-2 text-xs font-bold rounded-xl border transition cursor-pointer ${
                        settleForm.payment_mode === mode.id
                          ? 'bg-amber-50 border-amber-400 text-amber-900 shadow-2xs'
                          : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      {mode.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Reference / Txn No */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Reference / Transaction No. (Optional)
                </label>
                <input
                  type="text"
                  value={settleForm.reference_no}
                  onChange={(e) => setSettleForm({ ...settleForm, reference_no: e.target.value })}
                  placeholder="e.g. UPI Ref, Cheque #, or Bank Trx ID"
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:border-amber-500"
                />
              </div>

              {/* Narration */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Narration / Notes
                </label>
                <input
                  type="text"
                  value={settleForm.narration}
                  onChange={(e) => setSettleForm({ ...settleForm, narration: e.target.value })}
                  placeholder="Payment remarks..."
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:border-amber-500"
                />
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setSettleModalOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-xl transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingSettle}
                  className="px-5 py-2 text-xs font-black text-slate-950 bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 rounded-xl transition shadow-sm cursor-pointer disabled:opacity-50"
                >
                  {isSubmittingSettle ? 'Recording Settlement...' : 'Record Receipt Voucher'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* REMINDER HISTORY MODAL */}
      {showHistoryModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white border border-slate-200 rounded-3xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh] text-slate-900">
            <div className="flex items-center justify-between p-5 border-b border-slate-200 bg-slate-50/80">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-600">
                  <History className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Payment Reminder Dispatch History</h3>
                  <p className="text-xs text-slate-500">Recent reminders sent across WhatsApp & manual channels</p>
                </div>
              </div>
              <button
                onClick={() => setShowHistoryModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg cursor-pointer transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 overflow-y-auto space-y-3 flex-1">
              {(data.recent_reminders || []).length === 0 ? (
                <div className="py-12 text-center text-slate-400 text-xs font-medium">
                  No reminder history recorded yet. Dispatch a WhatsApp reminder to begin tracking.
                </div>
              ) : (
                data.recent_reminders.map((log) => (
                  <div
                    key={log.id}
                    className="p-3 bg-slate-50 border border-slate-200 rounded-2xl flex items-start justify-between gap-3 text-xs"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900">
                          {log.customer?.name || 'Customer'}
                        </span>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-emerald-50 text-emerald-800 border border-emerald-200">
                          {log.channel}
                        </span>
                        {log.sale?.invoice_no && (
                          <span className="text-[11px] font-mono font-bold text-slate-500">
                            Inv: {log.sale.invoice_no}
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-slate-600 mt-1 line-clamp-2">
                        {log.message || log.notes}
                      </div>
                      <div className="text-[10px] text-slate-400 mt-1 font-mono">
                        Recipient: {log.recipient || 'N/A'} • Sent at: {new Date(log.reminded_at).toLocaleString()}
                      </div>
                    </div>
                    <div className="text-right whitespace-nowrap">
                      <div className="font-mono font-black text-amber-700">
                        {currencySymbol}{Number(log.amount).toFixed(2)}
                      </div>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-200 text-slate-700 font-bold capitalize">
                        {log.status}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="p-4 border-t border-slate-200 bg-slate-50/80 text-right">
              <button
                onClick={() => setShowHistoryModal(false)}
                className="px-4 py-2 text-xs font-bold text-slate-700 bg-white hover:bg-slate-100 border border-slate-200 rounded-xl transition cursor-pointer"
              >
                Close History
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
