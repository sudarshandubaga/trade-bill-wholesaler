import React, { useState, useEffect, useRef } from 'react';
import {
  Receipt,
  Layers,
  FileText,
  ShoppingCart,
  BarChart3,
  LayoutDashboard,
  Building2,
  Store,
  Warehouse,
  Users,
  UserCheck,
  Package,
  Tag,
  Hash,
  Grid,
  Printer,
  Barcode,
  Truck,
  ArrowDownLeft,
  ArrowUpRight,
  RotateCcw,
  BadgeAlert,
  Coins,
  Banknote,
  BookOpen,
  Calendar,
  Clock,
  ShieldCheck,
  AlertTriangle,
  Settings,
  Lock,
  LogOut,
  ChevronDown,
  Sparkles,
  ChevronRight,
  MapPin,
  BellRing,
  Boxes,
  ArrowRightLeft
} from 'lucide-react';
import { hasPermission } from '../utils/permissions';

export default function Navbar({
  currentTab,
  setCurrentTab,
  reportSubTab = 'sales',
  setReportSubTab = () => { },
  purchaseFilter = 'all',
  setPurchaseFilter = () => { },
  tenant,
  currentUser,
  branches = [],
  activeBranch,
  onSwitchBranch = () => { },
  onOpenBranchModal = () => { },
  onOpenUserModal = () => { },
  onOpenBarcodePrintModal = () => { },
  onOpenBulkBarcodeModal = () => { },
  cartCount = 0,
  onOpenSubscriptionModal = () => { },
  onOpenSettings = () => { },
  onOpenChangePassword = () => { },
  onLogout = () => { },
}) {
  const branchList = Array.isArray(branches) ? branches : (branches?.branches || branches?.data || []);

  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const [branchDropdownOpen, setBranchDropdownOpen] = useState(false);
  const [activeMenu, setActiveMenu] = useState(null); // 'master' | 'voucher' | 'purchase' | 'reports' | null
  const [mobileMenuOpen, setMobileMenuOpen] = useState(null);
  const [currentTime, setCurrentTime] = useState(new Date());

  const navRef = useRef(null);

  // Live clock
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Close dropdowns on outside click or escape
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (navRef.current && !navRef.current.contains(e.target)) {
        setActiveMenu(null);
        setBranchDropdownOpen(false);
        setProfileDropdownOpen(false);
        setMobileMenuOpen(null);
      }
    };
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setActiveMenu(null);
        setBranchDropdownOpen(false);
        setProfileDropdownOpen(false);
        setMobileMenuOpen(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  const daysRemaining = tenant?.days_remaining ?? 0;
  const isExpired = tenant?.is_expired ?? false;
  const isExpiringSoon = !isExpired && daysRemaining <= 30;

  // Permission helpers
  const can = (perm) => hasPermission(currentUser, perm);
  const canAccessMaster = can(['customers', 'suppliers', 'categories', 'items']);
  const canAccessVoucher = can(['vouchers', 'payment_reminders', 'credit_debit_note', 'stock_dump']);
  const canAccessInventory = can(['items', 'challan', 'stock_in', 'stock_out', 'stock_transfer', 'inventory']);
  const canAccessReports = can(['reports', 'sale_reports', 'daybook']);

  // Active check helpers
  const isMasterActive = ['customers', 'suppliers', 'categories', 'items'].includes(currentTab);
  const isVoucherActive = [
    'vouchers',
    'receipt_vouchers',
    'payment_vouchers',
    'payment_reminders',
    'notes',
    'credit_notes',
    'debit_notes',
    'adjustments'
  ].includes(currentTab);
  const isInventoryActive = ['stock_in', 'stock_out', 'stock_transfer', 'inventory', 'challans'].includes(currentTab);
  const isReportsActive = currentTab === 'reports' || ['sales_history', 'cashbook', 'daybook', 'ledger'].includes(currentTab);

  const getBranchIcon = (type) => {
    switch (type) {
      case 'warehouse':
        return <Warehouse className="w-3.5 h-3.5 text-indigo-400" />;
      case 'mall_counter':
        return <Store className="w-3.5 h-3.5 text-purple-400" />;
      default:
        return <Building2 className="w-3.5 h-3.5 text-amber-400" />;
    }
  };

  const roleLabel = {
    super_admin: 'Super Admin',
    branch_manager: 'Branch Manager',
    saleperson: 'Salesperson',
  }[currentUser?.role] || currentUser?.role || 'Staff';

  return (
    <header
      ref={navRef}
      className="sticky top-0 z-40 bg-slate-950/95 backdrop-blur-xl border-b border-slate-800/80 shadow-2xl text-slate-100 transition-colors"
    >
      <div className="w-full px-2.5 sm:px-4 lg:px-6">
        <div className="flex items-center justify-between h-13 gap-2">

          {/* Left: Brand Identity & Active Branch Switcher */}
          <div className="flex items-center gap-2.5 shrink-0">
            {/* Logo */}
            <div
              className="flex items-center gap-2 cursor-pointer group"
              onClick={() => {
                setCurrentTab('dashboard');
                setActiveMenu(null);
              }}
              title="Go to TradeBill Dashboard"
            >
              <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-gradient-to-tr from-amber-500 via-amber-400 to-orange-500 flex items-center justify-center text-slate-950 font-black shadow-md shadow-amber-500/20 ring-1 ring-amber-300/40 group-hover:scale-105 transition-transform">
                <Store className="w-4 h-4 text-slate-950 stroke-[2.5]" />
              </div>
              <div className="flex flex-col">
                <div className="flex items-center gap-1">
                  <span className="font-extrabold text-xs sm:text-sm tracking-tight text-white flex items-center gap-0.5">
                    Trade<span className="text-amber-400 font-black">Bill</span>
                  </span>
                  <span className="hidden sm:inline-flex px-1 py-0.2 rounded bg-amber-500/15 border border-amber-500/30 text-amber-400 text-[8px] font-black uppercase tracking-wider">
                    ERP
                  </span>
                </div>
                <div className="text-[10px] text-slate-400 truncate max-w-[110px] sm:max-w-xs flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0"></span>
                  <span className="font-medium text-slate-300 truncate">{tenant?.name || 'Retail SuperStore'}</span>
                </div>
              </div>
            </div>

            {/* Branch / Store / Warehouse Selector Pill */}
            <div className="relative hidden md:block">
              <button
                type="button"
                id="branch-switcher-btn"
                onClick={() => {
                  setBranchDropdownOpen(!branchDropdownOpen);
                  setActiveMenu(null);
                  setProfileDropdownOpen(false);
                }}
                className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-slate-900/90 hover:bg-slate-800/90 border border-slate-700/70 hover:border-amber-500/50 text-slate-200 transition-all text-[11px] font-semibold shadow-inner cursor-pointer"
                title="Switch Active Branch or Warehouse"
              >
                <div className="p-0.5 rounded bg-slate-800 text-amber-400">
                  {getBranchIcon(activeBranch?.type)}
                </div>
                <div className="flex flex-col text-left leading-tight pr-0.5">
                  <span className="text-[9px] uppercase font-bold text-amber-400 font-mono tracking-wider leading-none">
                    {activeBranch?.code || 'BRANCH'}
                  </span>
                  <span className="text-[11px] font-bold text-slate-100 max-w-[120px] truncate leading-tight">
                    {activeBranch?.name || 'Main Store'}
                  </span>
                </div>
                <ChevronDown className={`w-3 h-3 text-slate-400 transition-transform ${branchDropdownOpen ? 'rotate-180 text-amber-400' : ''}`} />
              </button>

              {/* Branch Switcher Dropdown */}
              {branchDropdownOpen && (
                <div className="absolute left-0 mt-2 w-72 rounded-2xl bg-slate-900/98 border border-slate-800 shadow-2xl p-2 z-50 text-slate-200 backdrop-blur-2xl animate-in fade-in zoom-in-95">
                  <div className="px-3 py-2 border-b border-slate-800/80 mb-1 flex items-center justify-between">
                    <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 font-bold">
                      Switch Branch / Warehouse
                    </span>
                    <button
                      onClick={() => {
                        setBranchDropdownOpen(false);
                        onOpenBranchModal();
                      }}
                      className="text-[10px] text-amber-400 hover:text-amber-300 font-bold hover:underline"
                    >
                      + Manage All
                    </button>
                  </div>

                  <div className="max-h-60 overflow-y-auto space-y-1 pr-0.5">
                    {branchList.length === 0 ? (
                      <div className="px-3 py-3 text-center text-xs text-slate-400">
                        No branches configured
                      </div>
                    ) : (
                      branchList.map((b) => {
                        const isCurrent = activeBranch?.id === b.id;
                        return (
                          <button
                            key={b.id}
                            type="button"
                            onClick={() => {
                              onSwitchBranch(b.id);
                              setBranchDropdownOpen(false);
                            }}
                            className={`w-full flex items-center justify-between p-2 rounded-xl text-left transition-all cursor-pointer ${isCurrent
                                ? 'bg-amber-500/15 border border-amber-500/30 text-amber-300 font-bold'
                                : 'hover:bg-slate-800/80 text-slate-300 hover:text-white'
                              }`}
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              <div className={`p-1.5 rounded-lg ${isCurrent ? 'bg-amber-500/20 text-amber-400' : 'bg-slate-800 text-slate-400'}`}>
                                {getBranchIcon(b.type)}
                              </div>
                              <div className="min-w-0">
                                <div className="text-xs font-bold truncate flex items-center gap-1.5">
                                  <span>{b.name}</span>
                                  {b.is_primary && (
                                    <span className="text-[9px] px-1 py-0.2 rounded bg-emerald-500/20 text-emerald-400 font-bold">Primary</span>
                                  )}
                                </div>
                                <div className="text-[10px] text-slate-400 truncate flex items-center gap-1">
                                  <span className="font-mono text-slate-400">[{b.code}]</span>
                                  <span>&bull;</span>
                                  <span className="capitalize">{b.type?.replace('_', ' ')}</span>
                                </div>
                              </div>
                            </div>
                            {isCurrent && (
                              <CheckCircle2 className="w-4 h-4 text-amber-400 shrink-0 ml-2" />
                            )}
                          </button>
                        );
                      })
                    )}
                  </div>

                  <div className="pt-2 mt-1 border-t border-slate-800/80">
                    <button
                      type="button"
                      onClick={() => {
                        setBranchDropdownOpen(false);
                        onOpenBranchModal();
                      }}
                      className="w-full py-1.5 px-2 rounded-xl bg-slate-800/70 hover:bg-slate-800 text-slate-300 hover:text-amber-400 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
                    >
                      <Building2 className="w-3.5 h-3.5" />
                      <span>Add / Manage Branches & Stores</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Center: Main Software Navigation Bar (User-specified Hierarchy) */}
          <nav className="hidden lg:flex items-center gap-0.5 bg-slate-900/90 p-1 rounded-xl border border-slate-800/90 shadow-inner">

            {/* 1. POS Direct Action Link */}
            {can('pos') && (
              <button
                id="menu-pos-btn"
                onClick={() => {
                  setCurrentTab('pos');
                  setActiveMenu(null);
                }}
                className={`relative flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${currentTab === 'pos'
                    ? 'bg-gradient-to-r from-amber-500 to-amber-400 text-slate-950 font-black shadow-md shadow-amber-500/25 ring-1 ring-amber-300/50'
                    : 'text-amber-400 hover:text-amber-300 hover:bg-slate-800/70'
                  }`}
              >
                <Receipt className={`w-3.5 h-3.5 ${currentTab === 'pos' ? 'text-slate-950 stroke-[2.5]' : ''}`} />
                <span>POS</span>

                {cartCount > 0 && (
                  <span className={`inline-flex items-center justify-center px-1.5 py-0.2 rounded-full text-[9px] font-black ${currentTab === 'pos' ? 'bg-slate-950 text-amber-400' : 'bg-amber-500 text-slate-950'
                    }`}>
                    {cartCount}
                  </span>
                )}
              </button>
            )}

            {/* 2. Master Dropdown (Account & Items) */}
            {canAccessMaster && (
              <div className="relative">
                <button
                  id="menu-master-btn"
                  onClick={() => setActiveMenu(activeMenu === 'master' ? null : 'master')}
                  className={`relative flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${isMasterActive
                      ? 'bg-slate-800 text-amber-300 shadow-sm border border-slate-700/80 ring-1 ring-amber-500/30'
                      : activeMenu === 'master'
                        ? 'bg-slate-800 text-white'
                        : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
                    }`}
                >
                  <Layers className={`w-3.5 h-3.5 ${isMasterActive ? 'text-amber-400' : 'text-slate-400'}`} />
                  <span>Master</span>
                  <ChevronDown className={`w-3 h-3 text-slate-400 transition-transform ${activeMenu === 'master' ? 'rotate-180 text-amber-400' : ''}`} />
                  {isMasterActive && <span className="w-1 h-1 rounded-full bg-amber-400"></span>}
                </button>

                {activeMenu === 'master' && (
                  <div className="absolute left-0 mt-2 w-72 rounded-2xl bg-slate-900/98 border border-slate-800 shadow-2xl p-2 z-50 text-slate-200 backdrop-blur-2xl animate-in fade-in zoom-in-95">
                    {/* Account Section */}
                    {(can('customers') || can('suppliers')) && (
                      <>
                        <div className="px-2.5 py-1 text-[10px] font-mono uppercase tracking-wider text-amber-400 font-black border-b border-slate-800/80 mb-1 flex items-center gap-1.5">
                          <Users className="w-3 h-3 text-amber-400" />
                          <span>Account</span>
                        </div>
                        <div className="space-y-0.5 mb-2">
                          {can('customers') && (
                            <button
                              onClick={() => {
                                setCurrentTab('customers');
                                setActiveMenu(null);
                              }}
                              className={`w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-xl text-left text-xs transition-colors cursor-pointer ${currentTab === 'customers' ? 'bg-amber-500/20 text-amber-300 font-bold' : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
                                }`}
                            >
                              <Users className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                              <div>
                                <div className="font-bold">Customer</div>
                                <div className="text-[10px] text-slate-400">Buyers, credit limit & balances</div>
                              </div>
                            </button>
                          )}
                          {can('suppliers') && (
                            <button
                              onClick={() => {
                                setCurrentTab('suppliers');
                                setActiveMenu(null);
                              }}
                              className={`w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-xl text-left text-xs transition-colors cursor-pointer ${currentTab === 'suppliers' ? 'bg-amber-500/20 text-amber-300 font-bold' : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
                                }`}
                            >
                              <Truck className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                              <div>
                                <div className="font-bold">Supplier</div>
                                <div className="text-[10px] text-slate-400">Vendors, suppliers & payables</div>
                              </div>
                            </button>
                          )}
                        </div>
                      </>
                    )}

                    {/* Items Section */}
                    {(can('categories') || can('items')) && (
                      <>
                        <div className="px-2.5 py-1 text-[10px] font-mono uppercase tracking-wider text-amber-400 font-black border-b border-slate-800/80 mb-1 flex items-center gap-1.5">
                          <Package className="w-3 h-3 text-amber-400" />
                          <span>Items</span>
                        </div>
                        <div className="space-y-0.5">
                          {can('categories') && (
                            <button
                              onClick={() => {
                                setCurrentTab('categories');
                                setActiveMenu(null);
                              }}
                              className={`w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-xl text-left text-xs transition-colors cursor-pointer ${currentTab === 'categories' ? 'bg-amber-500/20 text-amber-300 font-bold' : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
                                }`}
                            >
                              <Grid className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                              <div>
                                <div className="font-bold">Category</div>
                                <div className="text-[10px] text-slate-400">Departments & merchandise groups</div>
                              </div>
                            </button>
                          )}
                          {can('items') && (
                            <button
                              onClick={() => {
                                setCurrentTab('items');
                                setActiveMenu(null);
                              }}
                              className={`w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-xl text-left text-xs transition-colors cursor-pointer ${currentTab === 'items' ? 'bg-amber-500/20 text-amber-300 font-bold' : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
                                }`}
                            >
                              <Package className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                              <div>
                                <div className="font-bold">Items</div>
                                <div className="text-[10px] text-slate-400">Product rates, units & stock</div>
                              </div>
                            </button>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* 3. Vouchers Dropdown */}
            {canAccessVoucher && (
              <div className="relative">
                <button
                  id="menu-voucher-btn"
                  onClick={() => setActiveMenu(activeMenu === 'voucher' ? null : 'voucher')}
                  className={`relative flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${isVoucherActive
                      ? 'bg-slate-800 text-amber-300 shadow-sm border border-slate-700/80 ring-1 ring-amber-500/30'
                      : activeMenu === 'voucher'
                        ? 'bg-slate-800 text-white'
                        : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
                    }`}
                >
                  <FileText className={`w-3.5 h-3.5 ${isVoucherActive ? 'text-amber-400' : 'text-slate-400'}`} />
                  <span>Vouchers</span>
                  <ChevronDown className={`w-3 h-3 text-slate-400 transition-transform ${activeMenu === 'voucher' ? 'rotate-180 text-amber-400' : ''}`} />
                  {isVoucherActive && <span className="w-1 h-1 rounded-full bg-amber-400"></span>}
                </button>

                {activeMenu === 'voucher' && (
                  <div className="absolute left-0 mt-2 w-72 rounded-2xl bg-slate-900/98 border border-slate-800 shadow-2xl p-2 z-50 text-slate-200 backdrop-blur-2xl animate-in fade-in zoom-in-95">
                    <div className="px-2.5 py-1 text-[10px] font-mono uppercase tracking-wider text-slate-400 font-bold border-b border-slate-800/80 mb-1">
                      Vouchers & Notes
                    </div>
                    <div className="space-y-0.5">
                      {can('vouchers') && (
                        <>
                          <button
                            onClick={() => {
                              setCurrentTab('receipt_vouchers');
                              setActiveMenu(null);
                            }}
                            className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-left text-xs transition-colors cursor-pointer ${currentTab === 'receipt_vouchers' ? 'bg-emerald-500/20 text-emerald-300 font-bold' : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
                              }`}
                          >
                            <ArrowDownLeft className="w-4 h-4 text-emerald-400 shrink-0" />
                            <div>
                              <div className="font-bold">Receipt Voucher (Money In)</div>
                              <div className="text-[10px] text-slate-400">Customer collections & inward receipts</div>
                            </div>
                          </button>
                          <button
                            onClick={() => {
                              setCurrentTab('payment_vouchers');
                              setActiveMenu(null);
                            }}
                            className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-left text-xs transition-colors cursor-pointer ${currentTab === 'payment_vouchers' ? 'bg-amber-500/20 text-amber-300 font-bold' : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
                              }`}
                          >
                            <ArrowUpRight className="w-4 h-4 text-amber-400 shrink-0" />
                            <div>
                              <div className="font-bold">Payment Voucher (Money Out)</div>
                              <div className="text-[10px] text-slate-400">Supplier disbursements & expenses</div>
                            </div>
                          </button>
                        </>
                      )}
                      {can('credit_debit_note') && (
                        <>
                          <button
                            onClick={() => {
                              setCurrentTab('credit_notes');
                              setActiveMenu(null);
                            }}
                            className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-left text-xs transition-colors cursor-pointer ${currentTab === 'credit_notes' ? 'bg-rose-500/20 text-rose-300 font-bold' : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
                              }`}
                          >
                            <RotateCcw className="w-4 h-4 text-rose-400 shrink-0" />
                            <div>
                              <div className="font-bold">Credit Note (Sales Return)</div>
                              <div className="text-[10px] text-slate-400">Buyer return adjustments (Zero GST)</div>
                            </div>
                          </button>
                          <button
                            onClick={() => {
                              setCurrentTab('debit_notes');
                              setActiveMenu(null);
                            }}
                            className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-left text-xs transition-colors cursor-pointer ${currentTab === 'debit_notes' ? 'bg-purple-500/20 text-purple-300 font-bold' : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
                              }`}
                          >
                            <RotateCcw className="w-4 h-4 text-purple-400 shrink-0" />
                            <div>
                              <div className="font-bold">Debit Note (Purchase Return)</div>
                              <div className="text-[10px] text-slate-400">Vendor purchase returns (Zero GST)</div>
                            </div>
                          </button>
                        </>
                      )}
                      {can(['vouchers', 'customers', 'pos']) && (
                        <button
                          onClick={() => {
                            setCurrentTab('payment_reminders');
                            setActiveMenu(null);
                          }}
                          className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-left text-xs transition-colors cursor-pointer ${currentTab === 'payment_reminders' ? 'bg-amber-500/20 text-amber-300 font-bold' : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
                            }`}
                        >
                          <BellRing className="w-4 h-4 text-amber-400 shrink-0" />
                          <div>
                            <div className="font-bold flex items-center gap-1.5">
                              <span>Payment Reminders</span>
                              <span className="px-1.5 py-0.2 rounded-full bg-amber-500/20 text-amber-300 text-[9px] font-black uppercase">Dues</span>
                            </div>
                            <div className="text-[10px] text-slate-400">Overdue bills, receivables & 1-click WhatsApp</div>
                          </div>
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* 4. Inventory Dropdown */}
            {canAccessInventory && (
              <div className="relative">
                <button
                  id="menu-inventory-btn"
                  onClick={() => setActiveMenu(activeMenu === 'inventory' ? null : 'inventory')}
                  className={`relative flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${isInventoryActive
                      ? 'bg-slate-800 text-amber-300 shadow-sm border border-slate-700/80 ring-1 ring-amber-500/30'
                      : activeMenu === 'inventory'
                        ? 'bg-slate-800 text-white'
                        : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
                    }`}
                >
                  <Boxes className={`w-3.5 h-3.5 ${isInventoryActive ? 'text-amber-400' : 'text-slate-400'}`} />
                  <span>Inventory</span>
                  <ChevronDown className={`w-3 h-3 text-slate-400 transition-transform ${activeMenu === 'inventory' ? 'rotate-180 text-amber-400' : ''}`} />
                  {isInventoryActive && <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span>}
                </button>

                {activeMenu === 'inventory' && (
                  <div className="absolute left-0 mt-2 w-72 rounded-2xl bg-slate-900/98 border border-slate-800 shadow-2xl p-2 z-50 text-slate-200 backdrop-blur-2xl animate-in fade-in zoom-in-95">
                    <div className="px-2.5 py-1 text-[10px] font-mono uppercase tracking-wider text-slate-400 font-bold border-b border-slate-800/80 mb-1">
                      Inventory & Stock Movements
                    </div>
                    <div className="space-y-0.5">
                      <button
                        onClick={() => {
                          setCurrentTab('stock_in');
                          setActiveMenu(null);
                        }}
                        className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-left text-xs transition-colors cursor-pointer ${currentTab === 'stock_in' ? 'bg-amber-500/20 text-amber-300 font-bold' : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
                          }`}
                      >
                        <ArrowDownLeft className="w-4 h-4 text-emerald-400 shrink-0" />
                        <div>
                          <div className="font-bold">Stock In</div>
                          <div className="text-[10px] text-slate-400">Inward stock receiving & item inventory entry</div>
                        </div>
                      </button>
                      <button
                        onClick={() => {
                          setCurrentTab('stock_out');
                          setActiveMenu(null);
                        }}
                        className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-left text-xs transition-colors cursor-pointer ${currentTab === 'stock_out' ? 'bg-amber-500/20 text-amber-300 font-bold' : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
                          }`}
                      >
                        <ArrowUpRight className="w-4 h-4 text-amber-400 shrink-0" />
                        <div>
                          <div className="font-bold">Stock Out</div>
                          <div className="text-[10px] text-slate-400">Outward stock dispatch & inventory issue</div>
                        </div>
                      </button>
                      <button
                        onClick={() => {
                          setCurrentTab('stock_transfer');
                          setActiveMenu(null);
                        }}
                        className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-left text-xs transition-colors cursor-pointer ${currentTab === 'stock_transfer' ? 'bg-amber-500/20 text-amber-300 font-bold' : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
                          }`}
                      >
                        <ArrowRightLeft className="w-4 h-4 text-cyan-400 shrink-0" />
                        <div>
                          <div className="font-bold">Stock Transfer</div>
                          <div className="text-[10px] text-slate-400">Inter-branch & warehouse transfer slips</div>
                        </div>
                      </button>
                      <button
                        onClick={() => {
                          setReportSubTab('stock');
                          setCurrentTab('reports');
                          setActiveMenu(null);
                        }}
                        className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-left text-xs transition-colors cursor-pointer ${currentTab === 'reports' && reportSubTab === 'stock' ? 'bg-amber-500/20 text-amber-300 font-bold' : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
                          }`}
                      >
                        <Package className="w-4 h-4 text-rose-400 shrink-0" />
                        <div>
                          <div className="font-bold">Stock Reports</div>
                          <div className="text-[10px] text-slate-400">Current branch & warehouse valuation report</div>
                        </div>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* 5. Reports Dropdown */}
            {canAccessReports && (
              <div className="relative">
                <button
                  id="menu-reports-btn"
                  onClick={() => setActiveMenu(activeMenu === 'reports' ? null : 'reports')}
                  className={`relative flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${isReportsActive
                      ? 'bg-slate-800 text-emerald-300 shadow-sm border border-slate-700/80 ring-1 ring-emerald-500/30'
                      : activeMenu === 'reports'
                        ? 'bg-slate-800 text-white'
                        : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
                    }`}
                >
                  <BarChart3 className={`w-3.5 h-3.5 ${isReportsActive ? 'text-emerald-400' : 'text-slate-400'}`} />
                  <span>Reports</span>
                  <ChevronDown className={`w-3 h-3 text-slate-400 transition-transform ${activeMenu === 'reports' ? 'rotate-180 text-emerald-400' : ''}`} />
                  {isReportsActive && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>}
                </button>

                {activeMenu === 'reports' && (
                  <div className="absolute left-0 mt-2 w-72 rounded-2xl bg-slate-900/98 border border-slate-800 shadow-2xl p-2 z-50 text-slate-200 backdrop-blur-2xl animate-in fade-in zoom-in-95">
                    <div className="px-2.5 py-1 text-[10px] font-mono uppercase tracking-wider text-slate-400 font-bold border-b border-slate-800/80 mb-1">
                      Store & Accounting Analytics
                    </div>
                    <div className="space-y-0.5">
                      <button
                        onClick={() => {
                          setReportSubTab('sale');
                          setCurrentTab('reports');
                          setActiveMenu(null);
                        }}
                        className="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-xl text-left text-xs text-slate-300 hover:bg-slate-800/80 hover:text-white transition-colors cursor-pointer"
                      >
                        <Receipt className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                        <div>
                          <div className="font-bold">Sale Reports</div>
                          <div className="text-[10px] text-slate-400">Invoices archive, payment modes & sales analysis</div>
                        </div>
                      </button>
                      <button
                        onClick={() => {
                          setReportSubTab('daybook');
                          setCurrentTab('reports');
                          setActiveMenu(null);
                        }}
                        className="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-xl text-left text-xs text-slate-300 hover:bg-slate-800/80 hover:text-white transition-colors cursor-pointer"
                      >
                        <Calendar className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                        <div>
                          <div className="font-bold">Daybook</div>
                          <div className="text-[10px] text-slate-400">Daily sales & movement timeline</div>
                        </div>
                      </button>
                      <button
                        onClick={() => {
                          setReportSubTab('cashbook');
                          setCurrentTab('reports');
                          setActiveMenu(null);
                        }}
                        className="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-xl text-left text-xs text-slate-300 hover:bg-slate-800/80 hover:text-white transition-colors cursor-pointer"
                      >
                        <Banknote className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                        <div>
                          <div className="font-bold">Cashbook</div>
                          <div className="text-[10px] text-slate-400">Cash drawer inflows, outflows & balances</div>
                        </div>
                      </button>
                      <button
                        onClick={() => {
                          setReportSubTab('bank');
                          setCurrentTab('reports');
                          setActiveMenu(null);
                        }}
                        className="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-xl text-left text-xs text-slate-300 hover:bg-slate-800/80 hover:text-white transition-colors cursor-pointer"
                      >
                        <Coins className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                        <div>
                          <div className="font-bold">Bank Entry</div>
                          <div className="text-[10px] text-slate-400">UPI, Card, Cheque & Bank transfer ledger</div>
                        </div>
                      </button>
                      <button
                        onClick={() => {
                          setReportSubTab('stock');
                          setCurrentTab('reports');
                          setActiveMenu(null);
                        }}
                        className="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-xl text-left text-xs text-slate-300 hover:bg-slate-800/80 hover:text-white transition-colors cursor-pointer"
                      >
                        <Package className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                        <div>
                          <div className="font-bold">Stock Reports</div>
                          <div className="text-[10px] text-slate-400">Current branch & warehouse inventory valuation</div>
                        </div>
                      </button>
                      <button
                        onClick={() => {
                          setReportSubTab('ledger');
                          setCurrentTab('reports');
                          setActiveMenu(null);
                        }}
                        className="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-xl text-left text-xs text-slate-300 hover:bg-slate-800/80 hover:text-white transition-colors cursor-pointer"
                      >
                        <BookOpen className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                        <div>
                          <div className="font-bold">Ledger</div>
                          <div className="text-[10px] text-slate-400">Party account statement (Customer / Supplier)</div>
                        </div>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* 6. Dashboard */}
            <button
              id="menu-dashboard-btn"
              onClick={() => {
                setCurrentTab('dashboard');
                setActiveMenu(null);
              }}
              className={`relative flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${currentTab === 'dashboard'
                  ? 'bg-slate-800 text-white shadow-sm border border-slate-700/80 ring-1 ring-slate-600'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
                }`}
            >
              <LayoutDashboard className="w-3.5 h-3.5 text-slate-400" />
              <span>Dashboard</span>
            </button>

          </nav>

          {/* Right Action: Clock, Subscription, User & Role Profile */}
          <div className="flex items-center gap-1.5 sm:gap-2">

            {/* Live Clock */}
            <div className="hidden 2xl:flex items-center gap-1.5 px-2 py-1 rounded-lg bg-slate-900/80 border border-slate-800/80 text-slate-300 text-[10px] font-medium">
              <Clock className="w-3 h-3 text-amber-400" />
              <span className="font-mono font-bold text-slate-200 text-[11px]">
                {currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
              <span className="text-slate-500">&bull;</span>
              <span className="text-[10px] text-slate-400">
                {currentTime.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' })}
              </span>
            </div>

            {/* Yearly Subscription Pill */}
            {tenant && (
              <div className="hidden sm:flex items-center">
                {isExpired ? (
                  <button
                    onClick={onOpenSubscriptionModal}
                    className="flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-bold bg-rose-500/15 border border-rose-500/40 text-rose-300 hover:bg-rose-500/25 transition-all cursor-pointer"
                    title="Subscription Expired"
                  >
                    <AlertTriangle className="w-3 h-3 text-rose-400" />
                    <span>Expired &bull; Renew</span>
                  </button>
                ) : isExpiringSoon ? (
                  <button
                    onClick={onOpenSubscriptionModal}
                    className="flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-bold bg-amber-500/15 border border-amber-500/40 text-amber-300 hover:bg-amber-500/25 transition-all cursor-pointer"
                  >
                    <Calendar className="w-3 h-3 text-amber-400" />
                    <span>{daysRemaining}d left</span>
                  </button>
                ) : (
                  <button
                    onClick={onOpenSubscriptionModal}
                    className="flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-bold bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 hover:bg-emerald-500/25 transition-all cursor-pointer"
                  >
                    <ShieldCheck className="w-3 h-3 text-emerald-400" />
                    <span className="hidden xl:inline">Yearly Active</span> ({daysRemaining}d)
                  </button>
                )}
              </div>
            )}

            {/* User Profile & Role Dropdown */}
            <div className="relative">
              <button
                onClick={() => {
                  setProfileDropdownOpen(!profileDropdownOpen);
                  setActiveMenu(null);
                  setBranchDropdownOpen(false);
                }}
                className="flex items-center gap-1.5 p-1 rounded-lg bg-slate-900/90 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 transition-all cursor-pointer"
              >
                <div className="w-6 h-6 rounded-md bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center text-slate-950 text-[10px] font-black uppercase shadow-xs">
                  {currentUser?.name ? currentUser.name.charAt(0) : 'U'}
                </div>
                <div className="hidden lg:flex flex-col text-left pr-0.5">
                  <span className="text-[11px] font-bold text-slate-200 leading-tight truncate max-w-[100px]">
                    {currentUser?.name || tenant?.name || 'User'}
                  </span>
                  <span className="text-[9px] text-amber-400 font-semibold leading-none flex items-center gap-0.5">
                    <UserCheck className="w-2.5 h-2.5" />
                    {roleLabel}
                  </span>
                </div>
                <ChevronDown className={`w-3 h-3 text-slate-400 transition-transform ${profileDropdownOpen ? 'rotate-180' : ''}`} />
              </button>

              {profileDropdownOpen && (
                <div
                  className="absolute right-0 mt-2 w-72 rounded-2xl bg-slate-900/98 border border-slate-800 shadow-2xl p-2 z-50 text-slate-200 backdrop-blur-2xl animate-in fade-in zoom-in-95"
                >
                  {/* User Profile Header */}
                  <div className="px-3 py-2.5 border-b border-slate-800/80 mb-1 bg-slate-950/70 rounded-xl">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-extrabold text-white truncate">{currentUser?.name || 'Administrator'}</p>
                      <span className="px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-300 text-[10px] font-bold border border-amber-500/30">
                        {roleLabel}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 truncate mt-0.5">{currentUser?.email || tenant?.email}</p>
                    <div className="mt-2 flex items-center justify-between text-[11px] pt-1.5 border-t border-slate-800/50">
                      <span className="text-slate-500">Active Branch:</span>
                      <span className="font-medium text-slate-300 truncate max-w-[130px]">{activeBranch?.name || 'Main Store'}</span>
                    </div>
                  </div>

                  <div className="space-y-0.5 text-xs">
                    {/* Manage Staff & Roles */}
                    {can('user_manage') && (
                      <button
                        onClick={() => {
                          setProfileDropdownOpen(false);
                          onOpenUserModal();
                        }}
                        className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-slate-300 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
                      >
                        <Users className="w-4 h-4 text-cyan-400" />
                        <span>Users, Roles & Permissions</span>
                      </button>
                    )}

                    {/* Manage Branches */}
                    {can('branch_manage') && (
                      <button
                        onClick={() => {
                          setProfileDropdownOpen(false);
                          onOpenBranchModal();
                        }}
                        className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-slate-300 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
                      >
                        <Building2 className="w-4 h-4 text-amber-400" />
                        <span>Branches, Stores & Warehouses</span>
                      </button>
                    )}

                    {/* Store Settings */}
                    {(currentUser?.role === 'super_admin' || currentUser?.role === 'admin') && (
                      <button
                        onClick={() => {
                          onOpenSettings();
                          setProfileDropdownOpen(false);
                        }}
                        className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-slate-300 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
                      >
                        <Settings className="w-4 h-4 text-slate-400" />
                        <span>Store & Invoice Settings</span>
                      </button>
                    )}

                    {/* Subscription Details */}
                    <button
                      onClick={() => {
                        onOpenSubscriptionModal();
                        setProfileDropdownOpen(false);
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-slate-300 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
                    >
                      <ShieldCheck className="w-4 h-4 text-emerald-400" />
                      <span>Subscription & Plan Status</span>
                    </button>

                    {/* Change Password */}
                    <button
                      onClick={() => {
                        onOpenChangePassword();
                        setProfileDropdownOpen(false);
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-slate-300 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
                    >
                      <Lock className="w-4 h-4 text-amber-400" />
                      <span>Change Password</span>
                    </button>

                    <div className="border-t border-slate-800/80 my-1"></div>

                    {/* Logout */}
                    <button
                      onClick={() => {
                        onLogout();
                        setProfileDropdownOpen(false);
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-rose-400 hover:bg-rose-500/10 hover:text-rose-300 transition-colors font-semibold cursor-pointer"
                    >
                      <LogOut className="w-4 h-4" />
                      <span>Sign Out</span>
                    </button>
                  </div>
                </div>
              )}
            </div>

          </div>
        </div>

        {/* Mobile Sub-Navigation Bar */}
        <div className="lg:hidden py-1.5 border-t border-slate-800/80 -mx-3 px-3 bg-slate-950/95 overflow-x-auto scrollbar-none">
          <div className="flex items-center gap-1.5 min-w-max">
            {/* POS Mobile */}
            {can('pos') && (
              <button
                onClick={() => {
                  setCurrentTab('pos');
                  setMobileMenuOpen(null);
                }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${currentTab === 'pos'
                    ? 'bg-gradient-to-r from-amber-500 to-amber-400 text-slate-950 font-black'
                    : 'text-amber-400 hover:bg-slate-900'
                  }`}
              >
                <Receipt className="w-3.5 h-3.5" />
                <span>POS</span>
                {cartCount > 0 && (
                  <span className="px-1.5 py-0.2 rounded-full text-[10px] font-black bg-slate-950 text-amber-400">
                    {cartCount}
                  </span>
                )}
              </button>
            )}

            {/* Master Toggle */}
            {canAccessMaster && (
              <button
                onClick={() => setMobileMenuOpen(mobileMenuOpen === 'master' ? null : 'master')}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${isMasterActive ? 'bg-slate-800 text-amber-300' : 'text-slate-400 hover:text-slate-200'
                  }`}
              >
                <Layers className="w-3.5 h-3.5 text-amber-400" />
                <span>Master</span>
                <ChevronDown className={`w-3 h-3 ${mobileMenuOpen === 'master' ? 'rotate-180' : ''}`} />
              </button>
            )}

            {/* Voucher Toggle */}
            {canAccessVoucher && (
              <button
                onClick={() => setMobileMenuOpen(mobileMenuOpen === 'voucher' ? null : 'voucher')}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${isVoucherActive ? 'bg-slate-800 text-amber-300' : 'text-slate-400 hover:text-slate-200'
                  }`}
              >
                <FileText className="w-3.5 h-3.5 text-amber-400" />
                <span>Vouchers</span>
                <ChevronDown className={`w-3 h-3 ${mobileMenuOpen === 'voucher' ? 'rotate-180' : ''}`} />
              </button>
            )}

            {/* Inventory Toggle */}
            {canAccessInventory && (
              <button
                onClick={() => setMobileMenuOpen(mobileMenuOpen === 'inventory' ? null : 'inventory')}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${isInventoryActive ? 'bg-slate-800 text-amber-300' : 'text-slate-400 hover:text-slate-200'
                  }`}
              >
                <Boxes className="w-3.5 h-3.5 text-amber-400" />
                <span>Inventory</span>
                <ChevronDown className={`w-3 h-3 ${mobileMenuOpen === 'inventory' ? 'rotate-180' : ''}`} />
              </button>
            )}

            {/* Reports Toggle */}
            {canAccessReports && (
              <button
                onClick={() => setMobileMenuOpen(mobileMenuOpen === 'reports' ? null : 'reports')}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${isReportsActive ? 'bg-slate-800 text-emerald-300' : 'text-slate-400 hover:text-slate-200'
                  }`}
              >
                <BarChart3 className="w-3.5 h-3.5 text-emerald-400" />
                <span>Reports</span>
                <ChevronDown className={`w-3 h-3 ${mobileMenuOpen === 'reports' ? 'rotate-180' : ''}`} />
              </button>
            )}

            {/* Dashboard */}
            <button
              onClick={() => {
                setCurrentTab('dashboard');
                setMobileMenuOpen(null);
              }}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${currentTab === 'dashboard' ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-slate-200'
                }`}
            >
              <LayoutDashboard className="w-3.5 h-3.5" />
              <span>Dashboard</span>
            </button>
          </div>

          {/* Mobile Master Menu Items */}
          {mobileMenuOpen === 'master' && canAccessMaster && (
            <div className="mt-2 pt-2 border-t border-slate-800/80 grid grid-cols-2 sm:grid-cols-3 gap-1.5">
              {can('customers') && (
                <button
                  onClick={() => { setCurrentTab('customers'); setMobileMenuOpen(null); }}
                  className="p-2 rounded-xl bg-slate-900 text-xs text-left text-slate-200 font-semibold hover:bg-slate-800"
                >
                  Customer
                </button>
              )}
              {can('suppliers') && (
                <button
                  onClick={() => { setCurrentTab('suppliers'); setMobileMenuOpen(null); }}
                  className="p-2 rounded-xl bg-slate-900 text-xs text-left text-slate-200 font-semibold hover:bg-slate-800"
                >
                  Supplier
                </button>
              )}
              {can('categories') && (
                <button
                  onClick={() => { setCurrentTab('categories'); setMobileMenuOpen(null); }}
                  className="p-2 rounded-xl bg-slate-900 text-xs text-left text-slate-200 font-semibold hover:bg-slate-800"
                >
                  Category
                </button>
              )}
              {can('items') && (
                <button
                  onClick={() => { setCurrentTab('items'); setMobileMenuOpen(null); }}
                  className="p-2 rounded-xl bg-slate-900 text-xs text-left text-amber-300 font-semibold hover:bg-slate-800"
                >
                  Item Catalog
                </button>
              )}
            </div>
          )}

          {/* Mobile Voucher Menu Items */}
          {mobileMenuOpen === 'voucher' && canAccessVoucher && (
            <div className="mt-2 pt-2 border-t border-slate-800/80 grid grid-cols-2 gap-1.5">
              {can('vouchers') && (
                <>
                  <button
                    onClick={() => { setCurrentTab('receipt_vouchers'); setMobileMenuOpen(null); }}
                    className="p-2 rounded-xl bg-slate-900 text-xs text-left text-emerald-300 font-semibold hover:bg-slate-800"
                  >
                    Receipt Voucher (In)
                  </button>
                  <button
                    onClick={() => { setCurrentTab('payment_vouchers'); setMobileMenuOpen(null); }}
                    className="p-2 rounded-xl bg-slate-900 text-xs text-left text-amber-300 font-semibold hover:bg-slate-800"
                  >
                    Payment Voucher (Out)
                  </button>
                </>
              )}
              {can('credit_debit_note') && (
                <>
                  <button
                    onClick={() => { setCurrentTab('credit_notes'); setMobileMenuOpen(null); }}
                    className="p-2 rounded-xl bg-slate-900 text-xs text-left text-rose-300 font-semibold hover:bg-slate-800"
                  >
                    Credit Note (Return In)
                  </button>
                  <button
                    onClick={() => { setCurrentTab('debit_notes'); setMobileMenuOpen(null); }}
                    className="p-2 rounded-xl bg-slate-900 text-xs text-left text-purple-300 font-semibold hover:bg-slate-800"
                  >
                    Debit Note (Return Out)
                  </button>
                </>
              )}
              {can(['vouchers', 'customers', 'pos']) && (
                <button
                  onClick={() => { setCurrentTab('payment_reminders'); setMobileMenuOpen(null); }}
                  className="p-2 rounded-xl bg-slate-900 text-xs text-left text-amber-300 font-semibold hover:bg-slate-800 flex items-center justify-between col-span-2"
                >
                  <span>Payment Reminders</span>
                  <span className="px-1 py-0.2 rounded bg-amber-500/20 text-[9px] font-black">DUES</span>
                </button>
              )}
            </div>
          )}

          {/* Mobile Inventory Menu Items */}
          {mobileMenuOpen === 'inventory' && (
            <div className="mt-2 pt-2 border-t border-slate-800/80 grid grid-cols-2 gap-1.5">
              <button
                onClick={() => { setCurrentTab('stock_in'); setMobileMenuOpen(null); }}
                className="p-2 rounded-xl bg-slate-900 text-xs text-left text-emerald-300 font-semibold hover:bg-slate-800"
              >
                Stock In
              </button>
              <button
                onClick={() => { setCurrentTab('stock_out'); setMobileMenuOpen(null); }}
                className="p-2 rounded-xl bg-slate-900 text-xs text-left text-amber-300 font-semibold hover:bg-slate-800"
              >
                Stock Out
              </button>
              <button
                onClick={() => { setCurrentTab('stock_transfer'); setMobileMenuOpen(null); }}
                className="p-2 rounded-xl bg-slate-900 text-xs text-left text-cyan-300 font-semibold hover:bg-slate-800"
              >
                Stock Transfer
              </button>
              <button
                onClick={() => { setReportSubTab('stock'); setCurrentTab('reports'); setMobileMenuOpen(null); }}
                className="p-2 rounded-xl bg-slate-900 text-xs text-left text-rose-300 font-semibold hover:bg-slate-800"
              >
                Stock Reports
              </button>
            </div>
          )}

          {/* Mobile Reports Menu Items */}
          {mobileMenuOpen === 'reports' && (
            <div className="mt-2 pt-2 border-t border-slate-800/80 grid grid-cols-2 sm:grid-cols-3 gap-1.5">
              <button
                onClick={() => { setReportSubTab('sale'); setCurrentTab('reports'); setMobileMenuOpen(null); }}
                className="p-2 rounded-xl bg-slate-900 text-xs text-left text-emerald-300 font-semibold hover:bg-slate-800"
              >
                Sale Reports
              </button>
              <button
                onClick={() => { setReportSubTab('daybook'); setCurrentTab('reports'); setMobileMenuOpen(null); }}
                className="p-2 rounded-xl bg-slate-900 text-xs text-left text-slate-200 font-semibold hover:bg-slate-800"
              >
                Daybook
              </button>
              <button
                onClick={() => { setReportSubTab('cashbook'); setCurrentTab('reports'); setMobileMenuOpen(null); }}
                className="p-2 rounded-xl bg-slate-900 text-xs text-left text-slate-200 font-semibold hover:bg-slate-800"
              >
                Cashbook
              </button>
              <button
                onClick={() => { setReportSubTab('bank'); setCurrentTab('reports'); setMobileMenuOpen(null); }}
                className="p-2 rounded-xl bg-slate-900 text-xs text-left text-slate-200 font-semibold hover:bg-slate-800"
              >
                Bank Entry
              </button>
              <button
                onClick={() => { setReportSubTab('stock'); setCurrentTab('reports'); setMobileMenuOpen(null); }}
                className="p-2 rounded-xl bg-slate-900 text-xs text-left text-rose-300 font-semibold hover:bg-slate-800"
              >
                Stock Reports
              </button>
              <button
                onClick={() => { setReportSubTab('ledger'); setCurrentTab('reports'); setMobileMenuOpen(null); }}
                className="p-2 rounded-xl bg-slate-900 text-xs text-left text-indigo-300 font-semibold hover:bg-slate-800 col-span-2"
              >
                Party Ledger
              </button>
            </div>
          )}
        </div>

      </div>
    </header>
  );
}
