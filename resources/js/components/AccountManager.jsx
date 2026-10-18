import React, { useState, useMemo } from 'react';
import {
  Users,
  Building,
  Plus,
  Search,
  Edit2,
  Trash2,
  Phone,
  Mail,
  MapPin,
  FileText,
  DollarSign,
  TrendingDown,
  TrendingUp,
  Receipt,
  ShoppingCart,
  BookOpen,
  X
} from 'lucide-react';
import axios from 'axios';

export default function AccountManager({
  activeSubTab = 'customer', // 'customer' or 'supplier'
  setActiveSubTab,
  customers = [],
  suppliers = [],
  tenant,
  onCustomerUpdated = () => {},
  onSupplierUpdated = () => {},
  onSelectCustomerForBill = () => {},
  onOpenLedger = () => {},
  addToast = () => {}
}) {
  const currency = tenant?.currency || '₹';
  const [searchTerm, setSearchTerm] = useState('');

  // Customer modal
  const [isCustomerModalOpen, setIsCustomerModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState(null);
  const [customerFormData, setCustomerFormData] = useState({
    name: '',
    mobile_no: '',
    email: '',
    gstin: '',
    state: '',
    city: '',
    address: '',
    opening_balance: 0
  });

  // Supplier modal
  const [isSupplierModalOpen, setIsSupplierModalOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState(null);
  const [supplierFormData, setSupplierFormData] = useState({
    name: '',
    company_name: '',
    mobile_no: '',
    email: '',
    gstin: '',
    state: '',
    city: '',
    address: '',
    opening_balance: 0
  });

  const [isSaving, setIsSaving] = useState(false);

  // Filtered lists
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

  const filteredCustomers = useMemo(() => {
    const term = searchTerm.toLowerCase().trim();
    if (!term) return customerList;
    return customerList.filter(
      (c) =>
        c.name?.toLowerCase().includes(term) ||
        c.mobile_no?.toLowerCase().includes(term) ||
        c.email?.toLowerCase().includes(term) ||
        c.gstin?.toLowerCase().includes(term)
    );
  }, [customerList, searchTerm]);

  const filteredSuppliers = useMemo(() => {
    const term = searchTerm.toLowerCase().trim();
    if (!term) return supplierList;
    return supplierList.filter(
      (s) =>
        s.name?.toLowerCase().includes(term) ||
        s.company_name?.toLowerCase().includes(term) ||
        s.mobile_no?.toLowerCase().includes(term) ||
        s.gstin?.toLowerCase().includes(term)
    );
  }, [supplierList, searchTerm]);

  // Customer Handlers
  const handleOpenAddCustomer = () => {
    setEditingCustomer(null);
    setCustomerFormData({
      name: '',
      mobile_no: '',
      email: '',
      gstin: '',
      state: '',
      city: '',
      address: '',
      opening_balance: 0
    });
    setIsCustomerModalOpen(true);
  };

  const handleOpenEditCustomer = (c) => {
    setEditingCustomer(c);
    setCustomerFormData({
      name: c.name,
      mobile_no: c.mobile_no || '',
      email: c.email || '',
      gstin: c.gstin || '',
      state: c.state || '',
      city: c.city || '',
      address: c.address || '',
      opening_balance: c.opening_balance || 0
    });
    setIsCustomerModalOpen(true);
  };

  const handleSaveCustomer = async (e) => {
    e.preventDefault();
    if (!customerFormData.name.trim()) {
      addToast('Customer name is required', 'error');
      return;
    }

    try {
      setIsSaving(true);
      if (editingCustomer) {
        await axios.put(`/api/customers/${editingCustomer.id}`, customerFormData);
        addToast('Customer details updated', 'success');
      } else {
        await axios.post('/api/customers', customerFormData);
        addToast('Customer registered successfully', 'success');
      }
      setIsCustomerModalOpen(false);
      onCustomerUpdated();
    } catch (err) {
      addToast(err.response?.data?.message || 'Error saving customer', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteCustomer = async (id, name) => {
    if (!window.confirm(`Delete customer "${name}"?`)) return;
    try {
      await axios.delete(`/api/customers/${id}`);
      addToast('Customer deleted', 'success');
      onCustomerUpdated();
    } catch (err) {
      addToast('Cannot delete customer with billing history', 'error');
    }
  };

  // Supplier Handlers
  const handleOpenAddSupplier = () => {
    setEditingSupplier(null);
    setSupplierFormData({
      name: '',
      company_name: '',
      mobile_no: '',
      email: '',
      gstin: '',
      state: '',
      city: '',
      address: '',
      opening_balance: 0
    });
    setIsSupplierModalOpen(true);
  };

  const handleOpenEditSupplier = (s) => {
    setEditingSupplier(s);
    setSupplierFormData({
      name: s.name,
      company_name: s.company_name || '',
      mobile_no: s.mobile_no || '',
      email: s.email || '',
      gstin: s.gstin || '',
      state: s.state || '',
      city: s.city || '',
      address: s.address || '',
      opening_balance: s.opening_balance || 0
    });
    setIsSupplierModalOpen(true);
  };

  const handleSaveSupplier = async (e) => {
    e.preventDefault();
    if (!supplierFormData.name.trim()) {
      addToast('Supplier / Vendor name is required', 'error');
      return;
    }

    try {
      setIsSaving(true);
      if (editingSupplier) {
        await axios.put(`/api/suppliers/${editingSupplier.id}`, supplierFormData);
        addToast('Supplier updated successfully', 'success');
      } else {
        await axios.post('/api/suppliers', supplierFormData);
        addToast('Supplier added successfully', 'success');
      }
      setIsSupplierModalOpen(false);
      onSupplierUpdated();
    } catch (err) {
      addToast(err.response?.data?.message || 'Error saving supplier', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteSupplier = async (id, name) => {
    if (!window.confirm(`Delete supplier "${name}"?`)) return;
    try {
      await axios.delete(`/api/suppliers/${id}`);
      addToast('Supplier deleted', 'success');
      onSupplierUpdated();
    } catch (err) {
      addToast('Cannot delete supplier with active purchase records', 'error');
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner & Sub-Tabs */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white border border-slate-200/90 p-5 rounded-3xl shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-600 shadow-xs">
            {activeSubTab === 'customer' ? <Users className="w-6 h-6" /> : <Building className="w-6 h-6" />}
          </div>
          <div>
            <h1 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
              Master &bull; Account Desk
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Manage Customer clientele directory, wholesale Suppliers & vendor balances
            </p>
          </div>
        </div>

        {/* Toggle between Customer & Supplier */}
        <div className="flex items-center bg-slate-100 p-1.5 rounded-2xl border border-slate-200">
          <button
            onClick={() => setActiveSubTab('customer')}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeSubTab === 'customer'
                ? 'bg-amber-500 text-slate-950 font-black shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Customers ({customers.length})</span>
          </button>
          <button
            onClick={() => setActiveSubTab('supplier')}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeSubTab === 'supplier'
                ? 'bg-amber-500 text-slate-950 font-black shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
            }`}
          >
            <Building className="w-4 h-4" />
            <span>Suppliers ({suppliers.length})</span>
          </button>
        </div>
      </div>

      {/* Action Bar (Search & Add) */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder={`Search ${activeSubTab === 'customer' ? 'customers by name, mobile, city' : 'suppliers by vendor name, firm, city'}...`}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-xs focus:bg-white focus:border-amber-400 outline-none transition-colors"
          />
        </div>

        <button
          onClick={activeSubTab === 'customer' ? handleOpenAddCustomer : handleOpenAddSupplier}
          className="w-full sm:w-auto flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs shadow-xs cursor-pointer transition-all"
        >
          <Plus className="w-4 h-4 stroke-[2.5]" />
          <span>{activeSubTab === 'customer' ? 'Add New Customer' : 'Add New Supplier'}</span>
        </button>
      </div>

      {/* Customer List View */}
      {activeSubTab === 'customer' && (
        <div className="bg-white border border-slate-200/90 rounded-3xl overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 uppercase font-mono tracking-wider border-b border-slate-200">
                <tr>
                  <th className="px-5 py-3.5">Customer Name & Contact</th>
                  <th className="px-5 py-3.5">City & Location</th>
                  <th className="px-5 py-3.5">Current Balance</th>
                  <th className="px-5 py-3.5 text-right">Quick Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {filteredCustomers.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-5 py-12 text-center text-slate-400">
                      No customers found matching search filter.
                    </td>
                  </tr>
                ) : (
                  filteredCustomers.map((c) => (
                    <tr key={c.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="px-5 py-3.5">
                        <div className="font-bold text-slate-900 text-sm">{c.name}</div>
                        <div className="flex items-center gap-3 text-[11px] text-slate-500 mt-1">
                          {c.mobile_no && (
                            <span className="flex items-center gap-1 font-mono">
                              <Phone className="w-3 h-3 text-slate-400" />
                              {c.mobile_no}
                            </span>
                          )}
                          {c.email && (
                            <span className="flex items-center gap-1">
                              <Mail className="w-3 h-3 text-slate-400" />
                              {c.email}
                            </span>
                          )}
                        </div>
                      </td>

                      <td className="px-5 py-3.5">
                        <div className="font-semibold text-slate-900 text-xs">
                          {c.city || 'Local Area'}
                        </div>
                        <div className="text-[11px] text-slate-500 mt-1 flex items-center gap-1">
                          <MapPin className="w-3 h-3 text-slate-400" />
                          <span>{c.address || c.state || 'Local'}</span>
                        </div>
                      </td>

                      <td className="px-5 py-3.5">
                        <div className="font-mono font-bold text-xs text-slate-900">
                          {currency} {Number(c.current_balance || 0).toLocaleString()}
                        </div>
                        <span className="text-[10px] text-slate-500">
                          {Number(c.current_balance || 0) > 0 ? 'Receivable' : 'Settled'}
                        </span>
                      </td>

                      <td className="px-5 py-3.5 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => onSelectCustomerForBill(c)}
                            title="Bill Customer in POS"
                            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs font-bold border border-emerald-200 cursor-pointer"
                          >
                            <Receipt className="w-3.5 h-3.5" />
                            <span>Bill</span>
                          </button>
                          <button
                            onClick={() => onOpenLedger('customer', c.id)}
                            title="View Customer Ledger Statement"
                            className="p-1.5 rounded-lg text-slate-400 hover:text-sky-600 hover:bg-slate-100 transition-colors cursor-pointer"
                          >
                            <BookOpen className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleOpenEditCustomer(c)}
                            title="Edit Customer"
                            className="p-1.5 rounded-lg text-slate-400 hover:text-amber-600 hover:bg-slate-100 transition-colors cursor-pointer"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteCustomer(c.id, c.name)}
                            title="Delete Customer"
                            className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-slate-100 transition-colors cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Supplier List View */}
      {activeSubTab === 'supplier' && (
        <div className="bg-white border border-slate-200/90 rounded-3xl overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 uppercase font-mono tracking-wider border-b border-slate-200">
                <tr>
                  <th className="px-5 py-3.5">Vendor / Firm Name</th>
                  <th className="px-5 py-3.5">Contact Details</th>
                  <th className="px-5 py-3.5">City & State</th>
                  <th className="px-5 py-3.5">Payable Balance</th>
                  <th className="px-5 py-3.5 text-right">Quick Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {filteredSuppliers.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-5 py-12 text-center text-slate-400">
                      No suppliers found. Click "Add New Supplier" to register one.
                    </td>
                  </tr>
                ) : (
                  filteredSuppliers.map((s) => (
                    <tr key={s.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="px-5 py-3.5">
                        <div className="font-bold text-slate-900 text-sm">{s.name}</div>
                        {s.company_name && (
                          <div className="text-[11px] text-slate-500 font-medium mt-0.5">
                            {s.company_name}
                          </div>
                        )}
                      </td>

                      <td className="px-5 py-3.5">
                        <div className="space-y-0.5 text-[11px] text-slate-500">
                          {s.mobile_no && (
                            <div className="flex items-center gap-1 font-mono">
                              <Phone className="w-3 h-3 text-slate-400" />
                              {s.mobile_no}
                            </div>
                          )}
                          {s.email && (
                            <div className="flex items-center gap-1">
                              <Mail className="w-3 h-3 text-slate-400" />
                              {s.email}
                            </div>
                          )}
                        </div>
                      </td>

                      <td className="px-5 py-3.5">
                        <div className="font-semibold text-slate-900 text-xs">
                          {s.city || 'Local Area'}
                        </div>
                        <div className="text-[11px] text-slate-500 mt-1 flex items-center gap-1">
                          <MapPin className="w-3 h-3 text-slate-400" />
                          <span>{s.state || s.address || 'Local'}</span>
                        </div>
                      </td>

                      <td className="px-5 py-3.5">
                        <div className="font-mono font-bold text-xs text-slate-900">
                          {currency} {Number(s.current_balance || 0).toLocaleString()}
                        </div>
                        <span className="text-[10px] text-slate-500">Payable amount</span>
                      </td>

                      <td className="px-5 py-3.5 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => onOpenLedger('supplier', s.id)}
                            title="View Supplier Ledger Statement"
                            className="p-1.5 rounded-lg text-slate-400 hover:text-sky-600 hover:bg-slate-100 transition-colors cursor-pointer"
                          >
                            <BookOpen className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleOpenEditSupplier(s)}
                            title="Edit Supplier"
                            className="p-1.5 rounded-lg text-slate-400 hover:text-amber-600 hover:bg-slate-100 transition-colors cursor-pointer"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteSupplier(s.id, s.name)}
                            title="Delete Supplier"
                            className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-slate-100 transition-colors cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Customer Modal */}
      {isCustomerModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="bg-white border border-slate-200/90 rounded-3xl w-full max-w-2xl shadow-xl overflow-hidden p-6 text-slate-800">
            <div className="flex items-center justify-between pb-4 border-b border-slate-200 mb-5">
              <h3 className="font-bold text-base text-slate-900 flex items-center gap-2">
                <Users className="w-4 h-4 text-amber-500" />
                {editingCustomer ? 'Edit Customer' : 'Add New Customer'}
              </h3>
              <button onClick={() => setIsCustomerModalOpen(false)} className="text-slate-400 hover:text-slate-700 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveCustomer} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Customer Full Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Aarav Mehta"
                    value={customerFormData.name}
                    onChange={(e) => setCustomerFormData({ ...customerFormData, name: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-xs focus:bg-white focus:border-amber-400 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Mobile Number</label>
                  <input
                    type="text"
                    placeholder="+91 98201 11223"
                    value={customerFormData.mobile_no}
                    onChange={(e) => setCustomerFormData({ ...customerFormData, mobile_no: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-xs focus:bg-white focus:border-amber-400 outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Email Address</label>
                  <input
                    type="email"
                    placeholder="customer@example.com"
                    value={customerFormData.email}
                    onChange={(e) => setCustomerFormData({ ...customerFormData, email: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-xs focus:bg-white focus:border-amber-400 outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">City</label>
                  <input
                    type="text"
                    placeholder="Mumbai"
                    value={customerFormData.city}
                    onChange={(e) => setCustomerFormData({ ...customerFormData, city: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-xs focus:bg-white focus:border-amber-400 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">State</label>
                  <input
                    type="text"
                    placeholder="Maharashtra"
                    value={customerFormData.state}
                    onChange={(e) => setCustomerFormData({ ...customerFormData, state: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-xs focus:bg-white focus:border-amber-400 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Opening Balance ({currency})</label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={customerFormData.opening_balance}
                    onChange={(e) => setCustomerFormData({ ...customerFormData, opening_balance: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-xs font-mono focus:bg-white focus:border-amber-400 outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Street Address</label>
                <textarea
                  rows={2}
                  placeholder="Apartment, building, locality..."
                  value={customerFormData.address}
                  onChange={(e) => setCustomerFormData({ ...customerFormData, address: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-xs focus:bg-white focus:border-amber-400 outline-none"
                />
              </div>

              <div className="pt-4 border-t border-slate-200 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsCustomerModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 text-xs font-bold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs shadow-xs cursor-pointer disabled:opacity-50"
                >
                  {isSaving ? 'Saving...' : editingCustomer ? 'Update Customer' : 'Save Customer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Supplier Modal */}
      {isSupplierModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="bg-white border border-slate-200/90 rounded-3xl w-full max-w-2xl shadow-xl overflow-hidden p-6 text-slate-800">
            <div className="flex items-center justify-between pb-4 border-b border-slate-200 mb-5">
              <h3 className="font-bold text-base text-slate-900 flex items-center gap-2">
                <Building className="w-4 h-4 text-amber-500" />
                {editingSupplier ? 'Edit Supplier' : 'Register New Supplier'}
              </h3>
              <button onClick={() => setIsSupplierModalOpen(false)} className="text-slate-400 hover:text-slate-700 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveSupplier} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Supplier / Vendor Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Apex Wholesale Traders"
                    value={supplierFormData.name}
                    onChange={(e) => setSupplierFormData({ ...supplierFormData, name: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-xs focus:bg-white focus:border-amber-400 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Company / Firm Name</label>
                  <input
                    type="text"
                    placeholder="e.g. Apex Logistics Corp"
                    value={supplierFormData.company_name}
                    onChange={(e) => setSupplierFormData({ ...supplierFormData, company_name: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-xs focus:bg-white focus:border-amber-400 outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Phone Number</label>
                  <input
                    type="text"
                    placeholder="+91 98200 12345"
                    value={supplierFormData.mobile_no}
                    onChange={(e) => setSupplierFormData({ ...supplierFormData, mobile_no: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-xs focus:bg-white focus:border-amber-400 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Email Address</label>
                  <input
                    type="email"
                    placeholder="sales@apexwholesale.com"
                    value={supplierFormData.email}
                    onChange={(e) => setSupplierFormData({ ...supplierFormData, email: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-xs focus:bg-white focus:border-amber-400 outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">State</label>
                  <input
                    type="text"
                    placeholder="Maharashtra"
                    value={supplierFormData.state}
                    onChange={(e) => setSupplierFormData({ ...supplierFormData, state: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-xs focus:bg-white focus:border-amber-400 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">City</label>
                  <input
                    type="text"
                    placeholder="Mumbai"
                    value={supplierFormData.city}
                    onChange={(e) => setSupplierFormData({ ...supplierFormData, city: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-xs focus:bg-white focus:border-amber-400 outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Opening Payable Balance ({currency})</label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={supplierFormData.opening_balance}
                    onChange={(e) => setSupplierFormData({ ...supplierFormData, opening_balance: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-xs font-mono focus:bg-white focus:border-amber-400 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Vendor Address</label>
                  <input
                    type="text"
                    placeholder="Market yard, building, area..."
                    value={supplierFormData.address}
                    onChange={(e) => setSupplierFormData({ ...supplierFormData, address: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-xs focus:bg-white focus:border-amber-400 outline-none"
                  />
                </div>
              </div>

              <div className="pt-4 border-t border-slate-200 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsSupplierModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 text-xs font-bold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs shadow-xs cursor-pointer disabled:opacity-50"
                >
                  {isSaving ? 'Saving...' : editingSupplier ? 'Update Supplier' : 'Save Supplier'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
