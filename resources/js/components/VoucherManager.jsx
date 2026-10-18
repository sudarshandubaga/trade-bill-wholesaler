import React, { useState, useMemo, useEffect } from 'react';
import {
  Banknote,
  Plus,
  Search,
  ArrowDownLeft,
  ArrowUpRight,
  Calendar,
  Building,
  Users,
  CreditCard,
  Printer,
  Eye,
  CheckCircle2,
  X
} from 'lucide-react';
import axios from 'axios';
import SearchableSelect from './SearchableSelect';

export default function VoucherManager({
  vouchers = [],
  customers = [],
  suppliers = [],
  branches = [],
  tenant,
  fixedType = null, // 'receipt' | 'payment' | null
  onVoucherUpdated = () => { },
  addToast = () => { }
}) {
  const currency = tenant?.currency || '₹';
  const [activeType, setActiveType] = useState(fixedType || 'all'); // 'all', 'payment', 'receipt'
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [viewingVoucher, setViewingVoucher] = useState(null);
  const [isSaving, setIsSaving] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    type: 'receipt', // 'payment' or 'receipt'
    party_type: 'customer', // 'customer', 'supplier', 'expense', 'other'
    party_id: '',
    party_name: '',
    branch_id: '',
    voucher_date: new Date().toISOString().split('T')[0],
    amount: '',
    payment_mode: 'cash', // 'cash', 'bank', 'upi', 'cheque'
    reference_no: '',
    narration: ''
  });

  const voucherList = useMemo(() => {
    if (Array.isArray(vouchers)) return vouchers;
    if (Array.isArray(vouchers?.data)) return vouchers.data;
    return [];
  }, [vouchers]);

  const branchList = useMemo(() => {
    if (Array.isArray(branches)) return branches;
    if (Array.isArray(branches?.branches)) return branches.branches;
    if (Array.isArray(branches?.data)) return branches.data;
    return [];
  }, [branches]);

  const customerList = useMemo(() => {
    if (Array.isArray(customers)) return customers;
    if (Array.isArray(customers?.customers)) return customers.customers;
    if (Array.isArray(customers?.data)) return customers.data;
    return [];
  }, [customers]);

  const supplierList = useMemo(() => {
    if (Array.isArray(suppliers)) return suppliers;
    if (Array.isArray(suppliers?.suppliers)) return suppliers.suppliers;
    if (Array.isArray(suppliers?.data)) return suppliers.data;
    return [];
  }, [suppliers]);

  const headBranch = useMemo(() => {
    return branchList.find((b) => b.is_head || b.is_primary) || branchList[0] || null;
  }, [branchList]);

  const filteredVouchers = useMemo(() => {
    return voucherList.filter((v) => {
      const matchType = activeType === 'all' || v.type === activeType;
      const term = searchTerm.toLowerCase().trim();
      const matchSearch =
        !term ||
        v.voucher_no?.toLowerCase().includes(term) ||
        v.party_name?.toLowerCase().includes(term) ||
        v.reference_no?.toLowerCase().includes(term);
      return matchType && matchSearch;
    });
  }, [voucherList, activeType, searchTerm]);

  useEffect(() => {
    if (fixedType) {
      setActiveType(fixedType);
    }
  }, [fixedType]);

  const handleOpenAdd = (type = (fixedType || 'receipt')) => {
    const selectedType = fixedType || type;
    setFormData({
      type: selectedType,
      party_type: selectedType === 'receipt' ? 'customer' : 'supplier',
      party_id: '',
      party_name: '',
      branch_id: headBranch?.id || '',
      voucher_date: new Date().toISOString().split('T')[0],
      amount: '',
      payment_mode: 'cash',
      reference_no: '',
      narration: ''
    });
    setIsModalOpen(true);
  };

  const handlePartySelect = (id) => {
    if (!id) {
      setFormData((prev) => ({ ...prev, party_id: '', party_name: '' }));
      return;
    }

    if (formData.type === 'receipt') {
      const c = customerList.find((cust) => String(cust.id) === String(id));
      setFormData((prev) => ({
        ...prev,
        party_id: id,
        party_name: c ? c.name : ''
      }));
    } else {
      const s = supplierList.find((sup) => String(sup.id) === String(id));
      setFormData((prev) => ({
        ...prev,
        party_id: id,
        party_name: s ? s.name : ''
      }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.amount || Number(formData.amount) <= 0) {
      addToast('Please enter a valid voucher amount', 'error');
      return;
    }
    if (!formData.party_name.trim()) {
      addToast(`Please select a ${formData.type === 'receipt' ? 'customer' : 'supplier'}`, 'error');
      return;
    }

    try {
      setIsSaving(true);
      const payload = {
        ...formData,
        party_type: formData.type === 'receipt' ? 'customer' : 'supplier',
        branch_id: headBranch?.id || formData.branch_id || null
      };
      await axios.post('/api/vouchers', payload);
      addToast('Voucher entry saved and ledger updated.', 'success');
      setIsModalOpen(false);
      onVoucherUpdated();
    } catch (err) {
      addToast(err.response?.data?.message || 'Error recording voucher', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">

      {/* Top Banner (Light Theme) */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white border border-slate-200/90 p-5 rounded-3xl shadow-xs">
        <div className="flex items-center gap-3">
          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shadow-inner ${fixedType === 'receipt'
              ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-600'
              : fixedType === 'payment'
                ? 'bg-amber-500/10 border border-amber-500/30 text-amber-600'
                : 'bg-amber-500/10 border border-amber-500/30 text-amber-600'
            }`}>
            {fixedType === 'receipt' ? (
              <ArrowDownLeft className="w-6 h-6 stroke-[2.2]" />
            ) : fixedType === 'payment' ? (
              <ArrowUpRight className="w-6 h-6 stroke-[2.2]" />
            ) : (
              <Banknote className="w-6 h-6 stroke-[2.2]" />
            )}
          </div>
          <div>
            <h1 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
              {fixedType === 'receipt'
                ? 'Receipt Vouchers (Money In)'
                : fixedType === 'payment'
                  ? 'Payment Vouchers (Money Out)'
                  : 'Vouchers • Payment & Receipt Desk'}
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              {fixedType === 'receipt'
                ? 'Record customer cash collections, invoice receipts, and inward bank transfers'
                : fixedType === 'payment'
                  ? 'Record supplier payments, vendor settlement disbursements, and operational expenses'
                  : 'Record customer cash collections, supplier purchase settlements, and operational expenses'}
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          {(!fixedType || fixedType === 'receipt') && (
            <button
              onClick={() => handleOpenAdd('receipt')}
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold cursor-pointer transition-all shadow-sm"
            >
              <ArrowDownLeft className="w-4 h-4" />
              <span>+ New Receipt Voucher (Money IN)</span>
            </button>
          )}
          {(!fixedType || fixedType === 'payment') && (
            <button
              onClick={() => handleOpenAdd('payment')}
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold cursor-pointer transition-all shadow-sm"
            >
              <ArrowUpRight className="w-4 h-4" />
              <span>+ New Payment Voucher (Money OUT)</span>
            </button>
          )}
        </div>
      </div>

      {/* Filter & Subtabs (Light Theme) */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
        {!fixedType ? (
          <div className="flex items-center bg-slate-100 p-1.5 rounded-2xl border border-slate-200 w-full sm:w-auto shadow-2xs">
            <button
              onClick={() => setActiveType('all')}
              className={`px-4 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${activeType === 'all'
                  ? 'bg-amber-500 text-slate-950 font-black shadow-xs border border-amber-400'
                  : 'text-slate-600 hover:text-slate-900'
                }`}
            >
              All Vouchers
            </button>
            <button
              onClick={() => setActiveType('receipt')}
              className={`flex items-center gap-1 px-4 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${activeType === 'receipt'
                  ? 'bg-emerald-600 text-white font-black shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
                }`}
            >
              <ArrowDownLeft className="w-3.5 h-3.5" />
              <span>Receipts</span>
            </button>
            <button
              onClick={() => setActiveType('payment')}
              className={`flex items-center gap-1 px-4 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${activeType === 'payment'
                  ? 'bg-amber-500 text-slate-950 font-black shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
                }`}
            >
              <ArrowUpRight className="w-3.5 h-3.5" />
              <span>Payments</span>
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-2 text-xs font-bold text-slate-600">
            <span className="px-3 py-1.5 rounded-xl bg-white border border-slate-200 text-slate-700 shadow-2xs font-mono">
              Total {fixedType === 'receipt' ? 'Receipts' : 'Payments'}: <span className="text-amber-700 font-bold">{filteredVouchers.length}</span>
            </span>
          </div>
        )}

        <div className="relative w-full sm:w-72">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search voucher #, party name..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-2 rounded-xl bg-white border border-slate-200 text-slate-900 text-xs focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 shadow-2xs placeholder-slate-400 font-medium"
          />
        </div>
      </div>

      {/* Vouchers Table (Light Card) */}
      <div className="bg-white border border-slate-200/90 rounded-3xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 uppercase font-mono tracking-wider border-b border-slate-200 text-[11px]">
              <tr>
                <th className="px-5 py-3.5">Voucher # & Date</th>
                <th className="px-5 py-3.5">Type</th>
                <th className="px-5 py-3.5">Party / Ledger Account</th>
                <th className="px-5 py-3.5">Payment Mode</th>
                <th className="px-5 py-3.5">Amount ({currency})</th>
                <th className="px-5 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {filteredVouchers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-12 text-center text-slate-400">
                    No vouchers recorded yet.
                  </td>
                </tr>
              ) : (
                filteredVouchers.map((v) => (
                  <tr key={v.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-5 py-3.5">
                      <div className="font-mono font-bold text-slate-900 text-sm">{v.voucher_no}</div>
                      <div className="text-[11px] text-slate-500 mt-0.5 flex items-center gap-1 font-mono">
                        <Calendar className="w-3 h-3 text-slate-400" />
                        <span>{v.voucher_date}</span>
                      </div>
                    </td>

                    <td className="px-5 py-3.5">
                      {v.type === 'receipt' ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                          <ArrowDownLeft className="w-3 h-3" />
                          <span>Receipt (IN)</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                          <ArrowUpRight className="w-3 h-3" />
                          <span>Payment (OUT)</span>
                        </span>
                      )}
                    </td>

                    <td className="px-5 py-3.5">
                      <div className="font-bold text-slate-900">{v.party_name}</div>
                      <div className="text-[10px] text-slate-500 capitalize flex items-center gap-1">
                        <span>{v.type === 'receipt' ? 'Customer' : 'Supplier'}</span>
                        <span>&bull;</span>
                        <span className="font-medium text-slate-600">{v.branch?.name || headBranch?.name || 'Main Branch'}</span>
                      </div>
                    </td>

                    <td className="px-5 py-3.5">
                      <span className="inline-flex items-center gap-1 uppercase font-mono font-bold text-[10px] text-slate-700 bg-slate-100 px-2 py-0.5 rounded">
                        <CreditCard className="w-3 h-3 text-slate-500" />
                        <span>{v.payment_mode}</span>
                      </span>
                      {v.reference_no && (
                        <div className="text-[10px] text-slate-500 font-mono mt-0.5 truncate max-w-xs">Ref: {v.reference_no}</div>
                      )}
                    </td>

                    <td className="px-5 py-3.5">
                      <div className={`font-mono font-black text-sm ${v.type === 'receipt' ? 'text-emerald-700' : 'text-amber-700'}`}>
                        {v.type === 'receipt' ? '+' : '-'}{currency} {Number(v.amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </div>
                    </td>

                    <td className="px-5 py-3.5 text-right">
                      <button
                        onClick={() => setViewingVoucher(v)}
                        className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold cursor-pointer inline-flex items-center gap-1.5 transition-colors"
                      >
                        <Eye className="w-3.5 h-3.5 text-slate-500" />
                        <span>View</span>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Voucher Modal (Light Theme) */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="bg-white border border-slate-200 rounded-3xl w-full max-w-xl max-h-[92vh] shadow-2xl overflow-hidden flex flex-col text-slate-900">
            <div className="p-5 border-b border-slate-200 flex items-center justify-between bg-slate-50/80">
              <h3 className="font-bold text-base text-slate-900 flex items-center gap-2">
                <Banknote className="w-5 h-5 text-amber-600" />
                <span>
                  {fixedType === 'receipt'
                    ? 'Record Customer Receipt Voucher (Money IN)'
                    : fixedType === 'payment'
                      ? 'Record Supplier Payment Voucher (Money OUT)'
                      : `Record New Voucher (${formData.type === 'receipt' ? 'Receipt Money IN' : 'Payment Money OUT'})`}
                </span>
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 overflow-y-auto flex-1 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Voucher Date *</label>
                  <input
                    type="date"
                    required
                    value={formData.voucher_date}
                    onChange={(e) => setFormData({ ...formData, voucher_date: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-xs font-mono focus:bg-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    {formData.type === 'receipt' ? 'Returned / Received Into Branch' : 'Disbursed / Paid From Branch'}
                  </label>
                  <div className="px-3 py-2 rounded-xl bg-slate-100 border border-slate-200 text-slate-800 text-xs font-bold flex items-center justify-between">
                    <span className="flex items-center gap-1.5 truncate">
                      <Building className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                      <span className="truncate">{headBranch?.name || 'Main Branch'}</span>
                    </span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-500/15 text-amber-800 border border-amber-300 shrink-0 font-bold">
                      HEAD BRANCH
                    </span>
                  </div>
                </div>
              </div>

              {/* Dynamic Party Selector: Customer for Receipt, Supplier for Payment */}
              {formData.type === 'receipt' ? (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Select Customer *</label>
                  <SearchableSelect
                    options={customerList.map((c) => ({
                      value: c.id,
                      label: c.name,
                      sublabel: c.mobile_no ? `Mob: ${c.mobile_no}` : (c.email || ''),
                      badge: c.current_balance !== undefined ? `Bal: ${currency}${c.current_balance}` : '',
                      raw: c
                    }))}
                    value={formData.party_id}
                    onChange={(val) => handlePartySelect(val)}
                    placeholder="-- Search & Select Customer --"
                    searchPlaceholder="Search customer name or phone..."
                    allowClear
                    theme="light"
                  />
                </div>
              ) : (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Select Supplier *</label>
                  <SearchableSelect
                    options={supplierList.map((s) => ({
                      value: s.id,
                      label: s.name,
                      sublabel: s.phone ? `Mob: ${s.phone}` : (s.email || ''),
                      badge: s.current_balance !== undefined ? `Payable: ${currency}${s.current_balance}` : '',
                      raw: s
                    }))}
                    value={formData.party_id}
                    onChange={(val) => handlePartySelect(val)}
                    placeholder="-- Search & Select Supplier --"
                    searchPlaceholder="Search supplier name or phone..."
                    allowClear
                    theme="light"
                  />
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Payment Mode *</label>
                  <select
                    value={formData.payment_mode}
                    onChange={(e) => setFormData({ ...formData, payment_mode: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-xs font-bold focus:bg-white"
                  >
                    <option value="cash">💵 Cash In Hand</option>
                    <option value="bank">🏛️ Bank Account Transfer</option>
                    <option value="upi">📱 UPI / QR Scan</option>
                    <option value="cheque">📄 Cheque</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Amount ({currency}) *</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    placeholder="0.00"
                    value={formData.amount}
                    onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-amber-700 font-mono font-black text-sm focus:bg-white focus:border-amber-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Reference / UTR / Cheque #</label>
                <input
                  type="text"
                  placeholder="e.g. UTR-9821739218 or Cheque 004812"
                  value={formData.reference_no}
                  onChange={(e) => setFormData({ ...formData, reference_no: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-xs font-mono focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Narration / Remarks</label>
                <textarea
                  rows={2}
                  placeholder="Additional accounting notes..."
                  value={formData.narration}
                  onChange={(e) => setFormData({ ...formData, narration: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-xs focus:bg-white"
                />
              </div>

              <div className="pt-4 border-t border-slate-200 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-400 text-slate-950 font-black text-xs shadow-md shadow-amber-500/20 cursor-pointer disabled:opacity-50"
                >
                  {isSaving ? 'Saving...' : 'Authorize & Save Voucher'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* View Voucher Slip Modal (Light Theme) */}
      {viewingVoucher && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="bg-white border border-slate-200 rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden p-6 text-slate-900">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <span className="font-bold text-xs uppercase tracking-wider text-slate-500">Accounting Voucher Slip</span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => window.print()}
                  className="flex items-center gap-1 px-3 py-1 rounded-lg bg-amber-500 text-slate-950 text-xs font-bold cursor-pointer shadow-xs"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Print</span>
                </button>
                <button onClick={() => setViewingVoucher(null)} className="p-1 rounded text-slate-400 hover:text-slate-900 cursor-pointer">
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="pt-4 text-center pb-4 border-b border-slate-200">
              <h2 className="text-lg font-black uppercase text-slate-900">{tenant?.name}</h2>
              <div className="text-xs font-bold text-slate-600 uppercase mt-0.5">
                {viewingVoucher.type === 'receipt' ? 'CASH / BANK RECEIPT VOUCHER' : 'PAYMENT VOUCHER'}
              </div>
              <div className="text-xs font-mono text-slate-500 mt-1">
                Voucher #: {viewingVoucher.voucher_no} &bull; Date: {viewingVoucher.voucher_date}
              </div>
            </div>

            <div className="py-4 space-y-3 text-xs text-slate-700">
              <div className="flex justify-between">
                <span className="text-slate-500 font-bold">Party / Account:</span>
                <span className="font-bold text-slate-900">{viewingVoucher.party_name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 font-bold">Branch:</span>
                <span className="font-bold text-slate-900">{viewingVoucher.branch?.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 font-bold">Payment Mode:</span>
                <span className="uppercase font-mono font-bold text-slate-900">{viewingVoucher.payment_mode}</span>
              </div>
              {viewingVoucher.reference_no && (
                <div className="flex justify-between">
                  <span className="text-slate-500 font-bold">Reference / Cheque:</span>
                  <span className="font-mono text-slate-900">{viewingVoucher.reference_no}</span>
                </div>
              )}
              {viewingVoucher.narration && (
                <div className="pt-2 border-t border-slate-100 text-slate-600 italic">
                  Note: {viewingVoucher.narration}
                </div>
              )}
            </div>

            <div className="p-4 rounded-2xl bg-amber-50/70 border border-amber-200/80 flex items-center justify-between">
              <span className="text-xs font-bold uppercase text-slate-700">Amount Paid / Received:</span>
              <span className="text-xl font-black font-mono text-amber-700">
                {currency} {Number(viewingVoucher.amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </span>
            </div>

            <div className="pt-8 grid grid-cols-2 gap-8 text-center text-xs text-slate-400">
              <div className="border-t border-slate-200 pt-1">Accountant / Cashier</div>
              <div className="border-t border-slate-200 pt-1">Receiver Signature</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
