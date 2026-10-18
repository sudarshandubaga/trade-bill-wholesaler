import React, { useState } from 'react';
import {
  Building2,
  Plus,
  Calendar,
  ShieldCheck,
  AlertTriangle,
  RefreshCw,
  X,
  ExternalLink,
  Edit2,
  Mail,
  Lock,
  Globe,
  DollarSign
} from 'lucide-react';

export default function TenantsManager({
  tenants,
  activeTenant,
  onSwitchTenant,
  onRenewSubscription,
  onCreateTenant,
  onUpdateTenant,
  isSaving
}) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTenant, setEditingTenant] = useState(null);

  const tenantList = Array.isArray(tenants)
    ? tenants
    : (tenants?.data || tenants?.tenants || []);

  const [formData, setFormData] = useState({
    name: '',
    domain_name: '',
    email: '',
    password: '',
    phone: '',
    address: '',
    currency: '$',
    subscription_plan: 'Annual Garage Pro (Yearly)',
    expires_at: '',
  });

  const handleOpenAdd = () => {
    setEditingTenant(null);
    // Default expires_at to 1 year from now
    const oneYearLater = new Date();
    oneYearLater.setFullYear(oneYearLater.getFullYear() + 1);
    const dateStr = oneYearLater.toISOString().split('T')[0];

    setFormData({
      name: '',
      domain_name: '',
      email: '',
      password: '',
      phone: '',
      address: '',
      currency: '$',
      subscription_plan: 'Annual Garage Pro (Yearly)',
      expires_at: dateStr,
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (t) => {
    setEditingTenant(t);
    const dateStr = t.expires_at ? t.expires_at.split('T')[0] : '';
    setFormData({
      name: t.name,
      domain_name: t.domain_name,
      email: t.email,
      password: '', // leave empty unless changing
      phone: t.phone || '',
      address: t.address || '',
      currency: t.currency || '$',
      subscription_plan: t.subscription_plan || 'Annual Garage Pro (Yearly)',
      expires_at: dateStr,
    });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name || !formData.domain_name || !formData.email) return;

    if (editingTenant) {
      await onUpdateTenant(editingTenant.id, formData);
    } else {
      if (!formData.password) {
        alert('Password is required for new tenant account.');
        return;
      }
      await onCreateTenant(formData);
    }

    setIsModalOpen(false);
  };

  return (
    <div className="space-y-6">
      
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2.5">
            <Building2 className="w-6 h-6 text-amber-500" />
            <span>SaaS Tenants & Yearly Subscriptions</span>
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Manage multi-tenant motor service garage accounts, domain mappings, and annual subscription renewals.
          </p>
        </div>

        <button
          onClick={handleOpenAdd}
          className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs shadow-xs transition-all shrink-0 cursor-pointer"
        >
          <Plus className="w-4 h-4 stroke-[2.5]" />
          <span>Register New Motor Service Tenant</span>
        </button>
      </div>

      {/* Tenants Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
        {tenantList.map((t) => {
          const isActive = t.id === activeTenant?.id;
          const isExpired = t.is_expired;
          const daysRemaining = t.days_remaining ?? 0;

          return (
            <div
              key={t.id}
              className={`rounded-2xl border p-5 flex flex-col justify-between transition-all shadow-xs ${
                isActive
                  ? 'bg-amber-50/70 border-amber-300 ring-1 ring-amber-300'
                  : 'bg-white hover:bg-slate-50/60 border-slate-200/90'
              }`}
            >
              <div>
                {/* Header with status badge */}
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-extrabold text-slate-900 text-base">{t.name}</h3>
                      {isActive && (
                        <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-300">
                          Active Session
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-amber-700 font-mono mt-0.5">
                      <Globe className="w-3.5 h-3.5 text-slate-400" />
                      <span>{t.domain_name}</span>
                    </div>
                  </div>

                  <button
                    onClick={() => handleOpenEdit(t)}
                    className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-400 hover:text-slate-700 transition-colors cursor-pointer"
                    title="Edit Tenant"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Subscription Info Card */}
                <div className={`p-3 rounded-xl border text-xs mb-4 space-y-1.5 ${
                  isExpired
                    ? 'bg-rose-50 border-rose-200 text-rose-800'
                    : daysRemaining <= 30
                    ? 'bg-amber-50 border-amber-200 text-amber-800'
                    : 'bg-slate-50 border-slate-200 text-slate-700'
                }`}>
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-slate-500">Plan:</span>
                    <span className="font-bold text-slate-900">{t.subscription_plan || 'Annual Garage Pro'}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-slate-500">Expires At:</span>
                    <span className="font-mono font-semibold">
                      {t.expires_at ? new Date(t.expires_at).toLocaleDateString() : 'N/A'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between pt-1 border-t border-slate-200/80">
                    <span className="font-medium text-slate-500">Status:</span>
                    <span className={`font-bold ${isExpired ? 'text-rose-600' : 'text-emerald-700'}`}>
                      {isExpired ? 'Subscription Expired' : `${daysRemaining} days remaining`}
                    </span>
                  </div>
                </div>

                {/* Tenant metadata */}
                <div className="space-y-1.5 text-xs text-slate-500">
                  <div className="flex items-center gap-2 truncate">
                    <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span className="truncate">{t.email}</span>
                  </div>
                  {t.phone && (
                    <div className="flex items-center gap-2 truncate">
                      <span className="text-slate-400 font-mono text-[11px] shrink-0">TEL:</span>
                      <span>{t.phone}</span>
                    </div>
                  )}
                  {t.address && (
                    <div className="truncate text-[11px] text-slate-500">
                      {t.address}
                    </div>
                  )}
                </div>

                {/* Tenant stats counter */}
                <div className="grid grid-cols-3 gap-2 text-center text-xs mt-4 pt-3 border-t border-slate-100">
                  <div className="bg-slate-50 border border-slate-200/60 p-2 rounded-lg">
                    <span className="text-[10px] uppercase font-bold text-slate-500 block">Services</span>
                    <span className="font-mono font-bold text-slate-900 text-sm">{t.items_count ?? 0}</span>
                  </div>
                  <div className="bg-slate-50 border border-slate-200/60 p-2 rounded-lg">
                    <span className="text-[10px] uppercase font-bold text-slate-500 block">Clients</span>
                    <span className="font-mono font-bold text-slate-900 text-sm">{t.customers_count ?? 0}</span>
                  </div>
                  <div className="bg-slate-50 border border-slate-200/60 p-2 rounded-lg">
                    <span className="text-[10px] uppercase font-bold text-slate-500 block">Bills</span>
                    <span className="font-mono font-bold text-slate-900 text-sm">{t.sales_count ?? 0}</span>
                  </div>
                </div>
              </div>

              {/* Bottom Actions */}
              <div className="mt-5 pt-3 border-t border-slate-100 flex items-center gap-2">
                <button
                  onClick={() => onRenewSubscription(t.id)}
                  className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold border border-slate-200 transition-colors cursor-pointer"
                  title="Extend subscription by 1 Year"
                >
                  <RefreshCw className="w-3.5 h-3.5 text-amber-600" />
                  <span>Renew +1 Yr</span>
                </button>

                {!isActive && (
                  <button
                    onClick={() => onSwitchTenant(t.id)}
                    className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-black transition-all shadow-xs cursor-pointer"
                  >
                    <span>Switch Tenant</span>
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Add / Edit Tenant Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200/90 rounded-2xl max-w-lg w-full p-6 shadow-xl space-y-4 animate-in fade-in zoom-in-95 text-slate-800">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div className="flex items-center gap-2">
                <Building2 className="w-5 h-5 text-amber-500" />
                <h3 className="font-bold text-slate-900 text-base">
                  {editingTenant ? 'Edit Tenant Garage' : 'Register New SaaS Tenant'}
                </h3>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3 text-xs">
              <div>
                <label className="text-slate-700 block mb-1 font-semibold">Garage / Shop Name *</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g. Apex Auto Care & Performance"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 focus:bg-white focus:border-amber-400 outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-700 block mb-1 font-semibold">Domain / Subdomain Slug *</label>
                  <input
                    type="text"
                    required
                    value={formData.domain_name}
                    onChange={(e) => setFormData({ ...formData, domain_name: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '') })}
                    placeholder="e.g. apex-motors"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 font-mono focus:bg-white focus:border-amber-400 outline-none"
                  />
                </div>

                <div>
                  <label className="text-slate-700 block mb-1 font-semibold">Currency Symbol</label>
                  <input
                    type="text"
                    value={formData.currency}
                    onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
                    placeholder="$ or ₹"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 font-mono focus:bg-white focus:border-amber-400 outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-700 block mb-1 font-semibold">Owner Email *</label>
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="owner@apexmotors.com"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 focus:bg-white focus:border-amber-400 outline-none"
                  />
                </div>

                <div>
                  <label className="text-slate-700 block mb-1 font-semibold">
                    {editingTenant ? 'New Password (Optional)' : 'Login Password *'}
                  </label>
                  <input
                    type="password"
                    required={!editingTenant}
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    placeholder="••••••••"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 focus:bg-white focus:border-amber-400 outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-700 block mb-1 font-semibold">Yearly Expiration Date *</label>
                  <input
                    type="date"
                    required
                    value={formData.expires_at}
                    onChange={(e) => setFormData({ ...formData, expires_at: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 focus:bg-white focus:border-amber-400 outline-none"
                  />
                </div>

                <div>
                  <label className="text-slate-700 block mb-1 font-semibold">Contact Phone</label>
                  <input
                    type="text"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="+1 (555) 234-5678"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 focus:bg-white focus:border-amber-400 outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="text-slate-700 block mb-1 font-semibold">Garage Address</label>
                <input
                  type="text"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  placeholder="Street, City, State, ZIP"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 focus:bg-white focus:border-amber-400 outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 font-bold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black shadow-xs cursor-pointer transition-all disabled:opacity-50"
                >
                  {isSaving ? 'Saving...' : editingTenant ? 'Update Tenant' : 'Register Tenant (+1 Yr)'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
