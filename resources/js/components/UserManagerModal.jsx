import React, { useState, useEffect } from 'react';
import {
  Users,
  ShieldCheck,
  UserPlus,
  Key,
  Edit2,
  Trash2,
  CheckCircle2,
  X,
  Lock,
  Building2,
  Shield,
  Layers,
  Sparkles
} from 'lucide-react';
import axios from 'axios';
import SearchableSelect from './SearchableSelect';

export default function UserManagerModal({
  isOpen,
  onClose,
  branches = [],
  addToast = () => {}
}) {
  const branchList = Array.isArray(branches) ? branches : (branches?.branches || branches?.data || []);

  const [activeTab, setActiveTab] = useState('users'); // 'users' or 'roles'
  const [users, setUsers] = useState([]);
  const [roles, setRoles] = useState([]);
  const [availablePermissions, setAvailablePermissions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // User form modal
  const [isUserFormOpen, setIsUserFormOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [isSavingUser, setIsSavingUser] = useState(false);

  const [userFormData, setUserFormData] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    role: 'saleperson',
    branch_id: '',
    permissions: [],
    is_active: true
  });

  // Role form modal
  const [isRoleFormOpen, setIsRoleFormOpen] = useState(false);
  const [editingRole, setEditingRole] = useState(null);
  const [isSavingRole, setIsSavingRole] = useState(false);

  const [roleFormData, setRoleFormData] = useState({
    name: '',
    description: '',
    permissions: []
  });

  const fetchUsersAndRoles = async () => {
    try {
      setIsLoading(true);
      const res = await axios.get('/api/users');
      setUsers(res.data.users || []);
      setRoles(res.data.roles || []);
      setAvailablePermissions(res.data.available_permissions || []);
    } catch (err) {
      console.error(err);
      addToast('Failed to load user directory', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchUsersAndRoles();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleOpenAddUser = () => {
    setEditingUser(null);
    setUserFormData({
      name: '',
      email: '',
      phone: '',
      password: '',
      role: 'saleperson',
      branch_id: branchList[0]?.id || '',
      permissions: ['pos', 'customers', 'barcode_print', 'daybook', 'sale_reports'],
      is_active: true
    });
    setIsUserFormOpen(true);
  };

  const handleOpenEditUser = (u) => {
    setEditingUser(u);
    const initialPerms = (Array.isArray(u.permissions) && u.permissions.length > 0)
      ? u.permissions
      : (Array.isArray(u.effective_permissions) ? u.effective_permissions : []);
    setUserFormData({
      name: u.name,
      email: u.email,
      phone: u.phone || '',
      password: '',
      role: u.role || 'saleperson',
      branch_id: u.branch_id || '',
      permissions: initialPerms,
      is_active: u.is_active ?? true
    });
    setIsUserFormOpen(true);
  };

  const handleSaveUser = async (e) => {
    e.preventDefault();
    if (!userFormData.name.trim() || !userFormData.email.trim()) {
      addToast('Name and email are required', 'error');
      return;
    }
    if (!editingUser && !userFormData.password) {
      addToast('Password is required for new users', 'error');
      return;
    }

    try {
      setIsSavingUser(true);
      if (editingUser) {
        await axios.put(`/api/users/${editingUser.id}`, userFormData);
        addToast('Staff user updated successfully', 'success');
      } else {
        await axios.post('/api/users', userFormData);
        addToast('New staff user created successfully', 'success');
      }
      setIsUserFormOpen(false);
      fetchUsersAndRoles();
    } catch (err) {
      console.error(err);
      addToast(err.response?.data?.message || 'Failed to save user', 'error');
    } finally {
      setIsSavingUser(false);
    }
  };

  const handleDeleteUser = async (u) => {
    if (!window.confirm(`Delete user "${u.name}"?`)) return;
    try {
      await axios.delete(`/api/users/${u.id}`);
      addToast('User deleted', 'success');
      fetchUsersAndRoles();
    } catch (err) {
      addToast(err.response?.data?.message || 'Error deleting user', 'error');
    }
  };

  const handleOpenAddRole = () => {
    setEditingRole(null);
    setRoleFormData({
      name: '',
      description: '',
      permissions: ['pos', 'customers']
    });
    setIsRoleFormOpen(true);
  };

  const handleOpenEditRole = (r) => {
    setEditingRole(r);
    setRoleFormData({
      name: r.name,
      description: r.description || '',
      permissions: r.permissions || []
    });
    setIsRoleFormOpen(true);
  };

  const handleSaveRole = async (e) => {
    e.preventDefault();
    if (!roleFormData.name.trim()) {
      addToast('Role name is required', 'error');
      return;
    }

    try {
      setIsSavingRole(true);
      if (editingRole) {
        await axios.put(`/api/roles/${editingRole.id}`, roleFormData);
        addToast('Role updated successfully', 'success');
      } else {
        await axios.post('/api/roles', roleFormData);
        addToast('New custom role created', 'success');
      }
      setIsRoleFormOpen(false);
      fetchUsersAndRoles();
    } catch (err) {
      addToast(err.response?.data?.message || 'Failed to save role', 'error');
    } finally {
      setIsSavingRole(false);
    }
  };

  const togglePermission = (permKey, currentList, setter) => {
    if (currentList.includes(permKey)) {
      setter(currentList.filter((k) => k !== permKey));
    } else {
      setter([...currentList, permKey]);
    }
  };

  // Group permissions by category
  const permissionGroups = availablePermissions.reduce((acc, curr) => {
    acc[curr.group] = acc[curr.group] || [];
    acc[curr.group].push(curr);
    return acc;
  }, {});

  const getRoleBadge = (roleSlug) => {
    switch (roleSlug) {
      case 'super_admin':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'branch_manager':
        return 'bg-purple-50 text-purple-700 border-purple-200';
      case 'saleperson':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      default:
        return 'bg-sky-50 text-sky-700 border-sky-200';
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 backdrop-blur-xs p-4 animate-in fade-in">
      <div className="bg-white border border-slate-200/90 rounded-3xl w-full max-w-5xl max-h-[90vh] shadow-xl overflow-hidden flex flex-col text-slate-800">
        
        {/* Header */}
        <div className="p-6 border-b border-slate-200 flex items-center justify-between bg-white">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-600 shadow-xs">
              <ShieldCheck className="w-6 h-6 stroke-[2.2]" />
            </div>
            <div>
              <h2 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
                Users & Roles Governance
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Manage Super Admins, Branch Managers, Salepersons, and custom permissions
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-400 hover:text-slate-700 flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="px-6 pt-4 border-b border-slate-200 flex items-center gap-2">
          <button
            onClick={() => setActiveTab('users')}
            className={`px-4 py-2.5 rounded-t-xl text-xs font-bold transition-all border-b-2 cursor-pointer flex items-center gap-2 ${
              activeTab === 'users'
                ? 'border-amber-500 text-amber-700 bg-amber-50/50'
                : 'border-transparent text-slate-500 hover:text-slate-900 hover:bg-slate-50'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Staff Users ({users.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('roles')}
            className={`px-4 py-2.5 rounded-t-xl text-xs font-bold transition-all border-b-2 cursor-pointer flex items-center gap-2 ${
              activeTab === 'roles'
                ? 'border-amber-500 text-amber-700 bg-amber-50/50'
                : 'border-transparent text-slate-500 hover:text-slate-900 hover:bg-slate-50'
            }`}
          >
            <Shield className="w-4 h-4" />
            <span>Roles & Permissions Matrix ({roles.length})</span>
          </button>
        </div>

        {/* Content Area */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          {activeTab === 'users' && !isUserFormOpen && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-500">
                  Assign user roles and allocate staff members to specific store counters or warehouses.
                </span>
                <button
                  onClick={handleOpenAddUser}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs shadow-xs cursor-pointer transition-all"
                >
                  <UserPlus className="w-4 h-4 stroke-[2.5]" />
                  <span>Create User Account</span>
                </button>
              </div>

              {/* Users Table */}
              <div className="border border-slate-200/90 rounded-2xl overflow-hidden bg-white shadow-xs">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-500 uppercase font-mono tracking-wider border-b border-slate-200">
                    <tr>
                      <th className="px-4 py-3">Staff Member</th>
                      <th className="px-4 py-3">Role</th>
                      <th className="px-4 py-3">Assigned Location</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {users.map((u) => (
                      <tr key={u.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="px-4 py-3">
                          <div className="font-bold text-slate-900">{u.name}</div>
                          <div className="text-[11px] text-slate-500 font-mono mt-0.5">{u.email}</div>
                          {u.phone && <div className="text-[10px] text-slate-400 mt-0.5">{u.phone}</div>}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-[11px] font-bold uppercase font-mono border ${getRoleBadge(u.role)}`}>
                            {u.roleModel?.name || u.role?.replace('_', ' ')}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          {u.branch ? (
                            <div className="flex items-center gap-1.5 text-slate-800 font-medium">
                              <Building2 className="w-3.5 h-3.5 text-slate-500" />
                              <span>{u.branch.name}</span>
                            </div>
                          ) : (
                            <span className="text-slate-400 italic">All Branches (Global)</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          {u.is_active ? (
                            <span className="text-emerald-600 flex items-center gap-1 font-semibold text-[11px]">
                              <CheckCircle2 className="w-3.5 h-3.5" /> Active
                            </span>
                          ) : (
                            <span className="text-red-500 font-semibold text-[11px]">Disabled</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => handleOpenEditUser(u)}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-amber-600 hover:bg-slate-100 transition-colors cursor-pointer"
                              title="Edit user"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDeleteUser(u)}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-slate-100 transition-colors cursor-pointer"
                              title="Delete user"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* User Form Sub-screen */}
          {activeTab === 'users' && isUserFormOpen && (
            <form onSubmit={handleSaveUser} className="space-y-5">
              <div className="flex items-center justify-between pb-3 border-b border-slate-200">
                <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
                  <UserPlus className="w-4 h-4 text-amber-500" />
                  {editingUser ? 'Edit Staff User Account' : 'Create New Staff User'}
                </h3>
                <button
                  type="button"
                  onClick={() => setIsUserFormOpen(false)}
                  className="text-xs font-bold text-slate-500 hover:text-slate-800 cursor-pointer"
                >
                  Cancel & Back
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Full Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Pooja Verma"
                    value={userFormData.name}
                    onChange={(e) => setUserFormData({ ...userFormData, name: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-xs focus:bg-white focus:border-amber-400 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Email / Login ID *</label>
                  <input
                    type="email"
                    required
                    placeholder="pooja@tradebill.com"
                    value={userFormData.email}
                    onChange={(e) => setUserFormData({ ...userFormData, email: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-xs focus:bg-white focus:border-amber-400 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    {editingUser ? 'Password (leave blank to keep unchanged)' : 'Login Password *'}
                  </label>
                  <input
                    type="password"
                    placeholder="Min 6 characters"
                    value={userFormData.password}
                    onChange={(e) => setUserFormData({ ...userFormData, password: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-xs focus:bg-white focus:border-amber-400 outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Primary Role *</label>
                  <select
                    value={userFormData.role}
                    onChange={(e) => {
                      const newRole = e.target.value;
                      let perms = [];
                      if (newRole === 'super_admin') {
                        perms = ['*'];
                      } else if (newRole === 'branch_manager') {
                        perms = [
                          'pos', 'customers', 'suppliers', 'brands', 'hsn', 'categories',
                          'items', 'barcode_print', 'challan', 'vouchers', 'credit_debit_note',
                          'purchase', 'reports', 'stock_dump',
                        ];
                      } else if (newRole === 'saleperson') {
                        perms = ['pos', 'customers', 'barcode_print', 'daybook', 'sale_reports'];
                      } else {
                        const matchRole = roles.find((r) => r.slug === newRole);
                        perms = matchRole?.permissions || ['pos', 'customers'];
                      }
                      setUserFormData({ ...userFormData, role: newRole, permissions: perms });
                    }}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-xs focus:bg-white focus:border-amber-400 outline-none"
                  >
                    <option value="super_admin">👑 Super Admin (All Permissions)</option>
                    <option value="branch_manager">🏢 Branch Manager</option>
                    <option value="saleperson">🛒 Saleperson (POS Billing)</option>
                    {roles
                        .filter((r) => !['super_admin', 'branch_manager', 'saleperson'].includes(r.slug))
                      .map((r) => (
                        <option key={r.id} value={r.slug}>
                          ⚙️ {r.name}
                        </option>
                      ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Assigned Location</label>
                  <SearchableSelect
                    options={[
                      { value: '', label: 'All Branches / Global' },
                      ...branchList.map((b) => ({
                        value: b.id,
                        label: `${b.type === 'warehouse' ? '🏭 ' : '🏬 '}${b.name}`,
                        badge: b.type
                      }))
                    ]}
                    value={userFormData.branch_id || ''}
                    onChange={(val) => setUserFormData({ ...userFormData, branch_id: val })}
                    placeholder="All Branches / Global"
                    searchPlaceholder="Search branch or warehouse..."
                    theme="light"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Phone Number</label>
                  <input
                    type="text"
                    placeholder="+91 98765 43210"
                    value={userFormData.phone}
                    onChange={(e) => setUserFormData({ ...userFormData, phone: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-xs focus:bg-white focus:border-amber-400 outline-none"
                  />
                </div>
              </div>

              {/* User Permissions Matrix */}
              <div className="pt-2 border-t border-slate-200 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-xs font-bold text-slate-900">Custom Permissions & Access Matrix:</span>
                    <span className="text-[11px] text-slate-500 block">
                      Fine-tune individual permissions granted to this user.
                    </span>
                  </div>
                  {userFormData.role !== 'super_admin' && (
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          const allKeys = availablePermissions.map((p) => p.key);
                          setUserFormData({ ...userFormData, permissions: allKeys });
                        }}
                        className="text-[10px] text-amber-700 hover:text-amber-800 font-bold hover:underline"
                      >
                        Grant All
                      </button>
                      <span className="text-slate-300">|</span>
                      <button
                        type="button"
                        onClick={() => {
                          setUserFormData({ ...userFormData, permissions: ['pos'] });
                        }}
                        className="text-[10px] text-slate-500 hover:text-slate-700 font-bold hover:underline"
                      >
                        Reset Min
                      </button>
                    </div>
                  )}
                </div>

                {userFormData.role === 'super_admin' ? (
                  <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-800 font-medium flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-amber-600 shrink-0" />
                    <span>Super Admin accounts automatically possess unrestricted access (`*`) across all modules, branches and settings.</span>
                  </div>
                ) : (
                  <div className="space-y-3 max-h-56 overflow-y-auto pr-1">
                    {Object.entries(permissionGroups).map(([group, perms]) => (
                      <div key={group} className="p-2.5 rounded-xl bg-slate-50 border border-slate-200">
                        <div className="text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-2 font-mono">
                          {group}
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                          {perms.map((p) => {
                            const isChecked = Array.isArray(userFormData.permissions) && (
                              userFormData.permissions.includes('*') || userFormData.permissions.includes(p.key)
                            );
                            return (
                              <label
                                key={p.key}
                                className={`flex items-center gap-2 p-1.5 rounded-lg border text-xs cursor-pointer transition-colors ${
                                  isChecked
                                    ? 'bg-amber-50 border-amber-300 text-amber-950 font-bold shadow-xs'
                                    : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-100'
                                }`}
                              >
                                <input
                                  type="checkbox"
                                  checked={isChecked}
                                  onChange={() => {
                                    const currentPerms = Array.isArray(userFormData.permissions) ? userFormData.permissions : [];
                                    togglePermission(p.key, currentPerms, (newP) =>
                                      setUserFormData({ ...userFormData, permissions: newP })
                                    );
                                  }}
                                  className="w-3.5 h-3.5 accent-amber-500 rounded"
                                />
                                <span className="truncate">{p.label}</span>
                              </label>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="pt-4 border-t border-slate-200 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsUserFormOpen(false)}
                  className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 text-xs font-bold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingUser}
                  className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-black shadow-xs cursor-pointer disabled:opacity-50"
                >
                  {isSavingUser ? 'Saving...' : editingUser ? 'Update Staff Account' : 'Create Staff Account'}
                </button>
              </div>
            </form>
          )}

          {/* Roles Tab */}
          {activeTab === 'roles' && !isRoleFormOpen && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-500">
                  Role presets define system modules accessible by each staff level.
                </span>
                <button
                  onClick={handleOpenAddRole}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs shadow-xs cursor-pointer transition-all"
                >
                  <Plus className="w-4 h-4 stroke-[2.5]" />
                  <span>Create Custom Role</span>
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {roles.map((r) => (
                  <div key={r.id} className="p-5 rounded-2xl bg-white border border-slate-200/90 shadow-xs space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-bold text-slate-900 text-sm">{r.name}</h4>
                          <span className={`text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded border ${getRoleBadge(r.slug)}`}>
                            {r.slug}
                          </span>
                        </div>
                        {r.description && <p className="text-xs text-slate-500 mt-1">{r.description}</p>}
                      </div>
                      {!r.is_system && (
                        <button
                          onClick={() => handleOpenEditRole(r)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-amber-600 hover:bg-slate-100 transition-colors cursor-pointer"
                          title="Edit role"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>

                    <div className="pt-2 border-t border-slate-100">
                      <div className="text-[11px] font-semibold text-slate-500 mb-1.5">Permitted Modules:</div>
                      <div className="flex flex-wrap gap-1.5">
                        {r.permissions && r.permissions.includes('*') ? (
                          <span className="px-2 py-0.5 rounded-md bg-amber-50 text-amber-700 text-[10px] font-bold border border-amber-200">
                            ⭐ All System Access (Unrestricted)
                          </span>
                        ) : (
                          (r.permissions || []).map((p) => (
                            <span key={p} className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 text-[10px] font-mono border border-slate-200">
                              {p}
                            </span>
                          ))
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Custom Role Form */}
          {activeTab === 'roles' && isRoleFormOpen && (
            <form onSubmit={handleSaveRole} className="space-y-5">
              <div className="flex items-center justify-between pb-3 border-b border-slate-200">
                <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
                  <Shield className="w-4 h-4 text-amber-500" />
                  {editingRole ? 'Edit Custom Role' : 'Create Custom Role'}
                </h3>
                <button
                  type="button"
                  onClick={() => setIsRoleFormOpen(false)}
                  className="text-xs font-bold text-slate-500 hover:text-slate-800 cursor-pointer"
                >
                  Cancel & Back
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Role Title *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Inventory Manager"
                    value={roleFormData.name}
                    onChange={(e) => setRoleFormData({ ...roleFormData, name: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-xs focus:bg-white focus:border-amber-400 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Description</label>
                  <input
                    type="text"
                    placeholder="e.g. Oversees warehouse stock, inward challans and purchase bills"
                    value={roleFormData.description}
                    onChange={(e) => setRoleFormData({ ...roleFormData, description: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-xs focus:bg-white focus:border-amber-400 outline-none"
                  />
                </div>
              </div>

              {/* Permissions Checkbox Matrix */}
              <div className="space-y-4">
                <div className="text-xs font-bold text-slate-800">Select Granted Permissions Matrix:</div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {Object.entries(permissionGroups).map(([group, perms]) => (
                    <div key={group} className="p-4 rounded-xl bg-slate-50/80 border border-slate-200 space-y-2.5">
                      <div className="text-xs font-bold text-amber-700 uppercase tracking-wider">{group}</div>
                      <div className="space-y-2">
                        {perms.map((p) => {
                          const isChecked = roleFormData.permissions.includes(p.key);
                          return (
                            <label
                              key={p.key}
                              className="flex items-center gap-2.5 text-xs text-slate-700 cursor-pointer hover:text-slate-900"
                            >
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={() =>
                                  togglePermission(p.key, roleFormData.permissions, (newP) =>
                                    setRoleFormData({ ...roleFormData, permissions: newP })
                                  )
                                }
                                className="w-4 h-4 rounded text-amber-500 bg-white border-slate-300 focus:ring-amber-400 cursor-pointer"
                              />
                              <span>{p.label}</span>
                              <span className="text-[10px] text-slate-400 font-mono">({p.key})</span>
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="pt-4 border-t border-slate-200 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsRoleFormOpen(false)}
                  className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 text-xs font-bold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingRole}
                  className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-black shadow-xs cursor-pointer disabled:opacity-50"
                >
                  {isSavingRole ? 'Saving...' : editingRole ? 'Update Role' : 'Create Role'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
