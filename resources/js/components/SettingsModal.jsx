import React, { useState, useEffect } from 'react';
import {
  Settings,
  X,
  Percent,
  Coins,
  Store,
  Phone,
  MapPin,
  DollarSign,
  Save,
  CheckCircle2,
  Sparkles,
  HelpCircle,
  Receipt
} from 'lucide-react';

export default function SettingsModal({
  isOpen,
  onClose,
  tenant,
  onSaveSettings = () => {},
  isSaving = false
}) {
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    address: '',
    currency: '₹',
  });

  useEffect(() => {
    if (tenant) {
      setFormData({
        name: tenant.name || '',
        phone: tenant.phone || '',
        address: tenant.address || '',
        currency: tenant.currency || '₹',
      });
    }
  }, [tenant, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    await onSaveSettings(formData);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white border border-slate-200 rounded-3xl max-w-xl w-full p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in-95 max-h-[92vh] overflow-y-auto">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/15 text-amber-700 flex items-center justify-center ring-1 ring-amber-500/20">
              <Settings className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <h3 className="font-black text-slate-900 text-lg leading-tight">
                Store Settings
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Configure wholesale billing preferences & business profile
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1.5 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5 text-xs">

          {/* Business Profile */}
          <div className="space-y-3">
            <h4 className="font-extrabold text-slate-900 text-xs flex items-center gap-1.5">
              <Store className="w-3.5 h-3.5 text-slate-600" />
              <span>Business Profile Information</span>
            </h4>

            <div>
              <label className="text-slate-700 block mb-1 font-bold text-[11px]">
                Garage / Workshop Name <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 focus:outline-none focus:border-amber-500 focus:bg-white font-medium"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-slate-700 block mb-1 font-bold text-[11px]">
                  Contact Phone
                </label>
                <input
                  type="text"
                  placeholder="+91 98765 43210"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 focus:outline-none focus:border-amber-500 focus:bg-white font-mono"
                />
              </div>

              <div>
                <label className="text-slate-700 block mb-1 font-bold text-[11px]">
                  Billing Currency Symbol
                </label>
                <input
                  type="text"
                  maxLength={5}
                  value={formData.currency}
                  onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 focus:outline-none focus:border-amber-500 focus:bg-white font-mono font-bold"
                />
              </div>
            </div>

            <div>
              <label className="text-slate-700 block mb-1 font-bold text-[11px]">
                Workshop Address
              </label>
              <textarea
                rows={2}
                placeholder="Shop No., Street, City, State, PIN"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 focus:outline-none focus:border-amber-500 focus:bg-white resize-none"
              />
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 font-bold cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="px-5 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 text-slate-950 font-black shadow-md shadow-amber-500/20 flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              <Save className="w-3.5 h-3.5" />
              <span>{isSaving ? 'Saving Settings...' : 'Save Settings'}</span>
            </button>
          </div>

        </form>

      </div>
    </div>
  );
}
