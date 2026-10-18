import React, { useState, useMemo } from 'react';
import {
  Users,
  Plus,
  Search,
  Edit2,
  Trash2,
  X,
  Phone,
  Mail,
  MapPin,
  Car,
  Receipt,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  Coins
} from 'lucide-react';

export default function Customers({
  customers,
  onSaveCustomer,
  onDeleteCustomer,
  onBillCustomer,
  isSaving,
  tenant
}) {
  const currency = tenant?.currency || '₹';
  const [searchTerm, setSearchTerm] = useState('');

  // Add / Edit Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState(null);

  const [formData, setFormData] = useState({
    name: '',
    mobile_no: '',
    email: '',
    address: '',
    vehicle_no: '',
    vehicle_model: '',
  });

  const customerList = useMemo(() => {
    return Array.isArray(customers)
      ? customers
      : (customers?.data || customers?.customers || []);
  }, [customers]);

  const filteredCustomers = useMemo(() => {
    const term = searchTerm.toLowerCase().trim();
    if (!term) return customerList;
    return customerList.filter(
      (c) =>
        (c?.name || '').toLowerCase().includes(term) ||
        (c?.mobile_no && c.mobile_no.includes(term)) ||
        (c?.email && c.email.toLowerCase().includes(term)) ||
        (c?.vehicle_no && c.vehicle_no.toLowerCase().includes(term)) ||
        (c?.vehicle_model && c.vehicle_model.toLowerCase().includes(term))
    );
  }, [customerList, searchTerm]);

  const handleOpenAdd = () => {
    setEditingCustomer(null);
    setFormData({
      name: '',
      mobile_no: '',
      email: '',
      address: '',
      vehicle_no: '',
      vehicle_model: '',
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (c) => {
    setEditingCustomer(c);
    setFormData({
      name: c.name,
      mobile_no: c.mobile_no || '',
      email: c.email || '',
      address: c.address || '',
      vehicle_no: c.vehicle_no || '',
      vehicle_model: c.vehicle_model || '',
    });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name || !formData.vehicle_no) return;

    await onSaveCustomer(
      {
        ...formData,
        vehicle_no: formData.vehicle_no.toUpperCase(),
      },
      editingCustomer?.id
    );
    setIsModalOpen(false);
  };

  return (
    <div className="space-y-6">
      
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-amber-500/15 text-amber-700 flex items-center justify-center">
              <Users className="w-5 h-5" />
            </div>
            <span>Customer & Vehicle Directory</span>
          </h1>
          <p className="text-xs text-slate-500 mt-1 font-medium">
            Manage registered vehicle owners, license plates, contact details, and past garage tickets.
          </p>
        </div>

        <button
          onClick={handleOpenAdd}
          className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 text-slate-950 font-black text-xs shadow-md shadow-amber-500/20 ring-1 ring-amber-300/60 transition-all shrink-0 cursor-pointer transform hover:-translate-y-0.5"
        >
          <Plus className="w-4 h-4 stroke-[2.5]" />
          <span>Add New Customer</span>
        </button>
      </div>

      {/* Search Bar & Count */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-xs">
        <div className="relative w-full max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by customer name, mobile, vehicle plate (e.g. MH 12), or car model..."
            className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-9 py-2.5 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-amber-500 focus:bg-white font-medium"
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

        <div className="text-xs font-bold text-slate-600 flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
          <span>Showing {filteredCustomers.length} of {customerList.length} registered customers</span>
        </div>
      </div>

      {/* Customer Cards Grid - Full Screen Responsive */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4">
        {filteredCustomers.map((customer) => (
          <div
            key={customer.id}
            className="bg-white hover:bg-slate-50/70 border border-slate-200/90 hover:border-slate-300 rounded-2xl p-5 transition-all shadow-xs hover:shadow-sm flex flex-col justify-between group"
          >
            <div>
              {/* Header with Avatar & Actions */}
              <div className="flex items-start justify-between gap-3 mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-amber-500/20 to-orange-500/20 border border-amber-300/40 flex items-center justify-center text-amber-800 font-black text-sm uppercase shadow-xs">
                    {customer.name.charAt(0)}
                  </div>
                  <div>
                    <h3 className="font-extrabold text-slate-900 text-sm group-hover:text-amber-600 transition-colors">
                      {customer.name}
                    </h3>
                    <div className="flex items-center gap-1.5 text-xs text-slate-500 mt-0.5">
                      <Phone className="w-3 h-3 text-slate-400" />
                      <span className={customer.mobile_no ? 'font-mono font-medium text-slate-700' : 'italic text-slate-400'}>
                        {customer.mobile_no || 'No mobile listed'}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handleOpenEdit(customer)}
                    className="p-1.5 rounded-lg bg-slate-100 hover:bg-amber-100 hover:text-amber-900 text-slate-600 transition-colors cursor-pointer"
                    title="Edit Customer"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => {
                      if (confirm(`Delete customer "${customer.name}"?`)) {
                        onDeleteCustomer(customer.id);
                      }
                    }}
                    className="p-1.5 rounded-lg bg-slate-100 hover:bg-rose-50 text-slate-400 hover:text-rose-600 transition-colors cursor-pointer"
                    title="Delete Customer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Realistic Vehicle Plate Number Badge */}
              <div className="p-3 rounded-xl bg-slate-50 text-slate-800 border border-slate-200 space-y-1.5 my-3 shadow-2xs">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
                    <Car className="w-3.5 h-3.5 text-amber-600" />
                    <span className="font-semibold text-slate-700">
                      {customer.vehicle_model || 'Registered Vehicle'}
                    </span>
                  </div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    License Plate
                  </span>
                </div>

                {customer.vehicle_no ? (
                  <div className="inline-flex items-center gap-2 bg-amber-400 text-slate-950 px-2.5 py-1 rounded-md font-mono font-black text-xs tracking-wider uppercase shadow-2xs">
                    <span className="w-1.5 h-1.5 rounded-full bg-slate-950"></span>
                    <span>{customer.vehicle_no}</span>
                  </div>
                ) : (
                  <div className="text-[11px] text-slate-400 italic">No license plate added</div>
                )}
              </div>

              {/* Extra details (Email & Address) */}
              <div className="space-y-1.5 text-xs text-slate-500 mt-2">
                {customer.email && (
                  <div className="flex items-center gap-2 truncate">
                    <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span className="truncate">{customer.email}</span>
                  </div>
                )}
                {customer.address && (
                  <div className="flex items-center gap-2 truncate">
                    <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span className="truncate">{customer.address}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Bottom Actions: Bill this customer */}
            <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-[11px] text-slate-400 font-medium">
                  {customer.sales_count ?? 0} {customer.sales_count === 1 ? 'bill' : 'bills'}
                </span>
              </div>

              <button
                onClick={() => onBillCustomer(customer.id)}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-amber-500/15 hover:bg-amber-500 text-amber-900 hover:text-slate-950 text-xs font-bold border border-amber-500/30 transition-all cursor-pointer shadow-xs"
              >
                <Receipt className="w-3.5 h-3.5" />
                <span>Create Bill / POS</span>
              </button>
            </div>
          </div>
        ))}

        {filteredCustomers.length === 0 && (
          <div className="col-span-full py-16 text-center text-slate-400 text-xs bg-white rounded-2xl border border-slate-200 space-y-2">
            <Users className="w-8 h-8 text-slate-300 mx-auto" />
            <p className="font-bold text-slate-600">No customers found</p>
            <p className="text-[11px] text-slate-400">
              No registered client matches your search filter "{searchTerm}".
            </p>
          </div>
        )}
      </div>

      {/* Add / Edit Customer Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-700 flex items-center justify-center">
                  <Users className="w-4 h-4" />
                </div>
                <h3 className="font-extrabold text-slate-900 text-base">
                  {editingCustomer ? 'Edit Customer Details' : 'Register New Customer'}
                </h3>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3.5 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-700 block mb-1 font-bold text-[11px]">
                    Customer Full Name <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Ramesh Patel"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 focus:outline-none focus:border-amber-500 focus:bg-white"
                  />
                </div>

                <div>
                  <label className="text-slate-700 block mb-1 font-bold text-[11px]">
                    Mobile Phone Number
                  </label>
                  <input
                    type="tel"
                    placeholder="e.g. +91 98765 43210"
                    value={formData.mobile_no}
                    onChange={(e) => setFormData({ ...formData, mobile_no: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 focus:outline-none focus:border-amber-500 focus:bg-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-700 block mb-1 font-bold text-[11px]">
                    Vehicle Registration Plate <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. MH 12 AB 1234"
                    value={formData.vehicle_no}
                    onChange={(e) => setFormData({ ...formData, vehicle_no: e.target.value.toUpperCase() })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 font-mono font-bold uppercase focus:outline-none focus:border-amber-500 focus:bg-white"
                  />
                </div>

                <div>
                  <label className="text-slate-700 block mb-1 font-bold text-[11px]">
                    Vehicle Make / Model
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Toyota Innova / Honda Activa"
                    value={formData.vehicle_model}
                    onChange={(e) => setFormData({ ...formData, vehicle_model: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 focus:outline-none focus:border-amber-500 focus:bg-white"
                  />
                </div>
              </div>

              <div>
                <label className="text-slate-700 block mb-1 font-bold text-[11px]">
                  Email Address (Optional)
                </label>
                <input
                  type="email"
                  placeholder="client@example.com"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 focus:outline-none focus:border-amber-500 focus:bg-white"
                />
              </div>

              <div>
                <label className="text-slate-700 block mb-1 font-bold text-[11px]">
                  Residential / Workshop Address
                </label>
                <input
                  type="text"
                  placeholder="e.g. 104, MG Road, Pune"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 focus:outline-none focus:border-amber-500 focus:bg-white"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-slate-600 hover:text-slate-800 text-xs font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs shadow-md shadow-amber-500/20 cursor-pointer disabled:opacity-50"
                >
                  {isSaving ? 'Saving...' : editingCustomer ? 'Update Customer' : 'Create Customer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
