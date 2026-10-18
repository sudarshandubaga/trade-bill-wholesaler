import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import Navbar from './components/Navbar';
import Dashboard from './components/Dashboard';
import POS from './components/POS';
import ItemsServices from './components/ItemsServices';
import CategoryManager from './components/CategoryManager';
import AccountManager from './components/AccountManager';
import BrandManager from './components/BrandManager';
import HsnManager from './components/HsnManager';
import ChallanManager from './components/ChallanManager';
import InventoryManager from './components/InventoryManager';
import VoucherManager from './components/VoucherManager';
import CreditDebitNoteManager from './components/CreditDebitNoteManager';
import PurchaseManager from './components/PurchaseManager';
import ReportsHub from './components/ReportsHub';
import PaymentReminders from './components/PaymentReminders';
import { hasPermission } from './utils/permissions';

// Modals
import BranchManagerModal from './components/BranchManagerModal';
import UserManagerModal from './components/UserManagerModal';
import BarcodePrintingModal from './components/BarcodePrintingModal';
import BulkBarcodeModal from './components/BulkBarcodeModal';
import InvoiceReceiptModal from './components/InvoiceReceiptModal';
import SubscriptionModal from './components/SubscriptionModal';
import SubscriptionLockScreen from './components/SubscriptionLockScreen';
import LoginScreen from './components/LoginScreen';
import SettingsModal from './components/SettingsModal';
import AuthModals from './components/AuthModals';
import Toast from './components/Toast';

import {
  RefreshCw,
  Receipt,
  LayoutDashboard,
  Package,
  Users,
  History,
  Building2,
  Store,
  Warehouse,
  Truck,
  FileText,
  ShoppingCart,
  BarChart3,
  Tag,
  Hash,
  Coins,
  RotateCcw,
  Sparkles,
  ShieldAlert,
  ArrowLeft,
  ArrowDownLeft,
  ArrowUpRight,
  ArrowRightLeft,
  Boxes,
  Layers
} from 'lucide-react';

export default function MainApp() {
  // Navigation & Sub-Tab State
  const [currentTab, setCurrentTab] = useState('pos'); // Start directly on POS for swift billing
  const [reportSubTab, setReportSubTab] = useState('sale');
  const [purchaseFilter, setPurchaseFilter] = useState('all');

  // Authentication & Context
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [domainInfo, setDomainInfo] = useState(null);
  const [tenant, setTenant] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);

  // Branches & Active Branch (Store / Warehouse)
  const [branches, setBranches] = useState([]);
  const [activeBranch, setActiveBranch] = useState(null);

  // Masters & Data State
  const [stats, setStats] = useState(null);
  const [items, setItems] = useState([]);
  const [categories, setCategories] = useState([]);
  const [brands, setBrands] = useState([]);
  const [hsnCodes, setHsnCodes] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [sales, setSales] = useState([]);
  const [purchases, setPurchases] = useState([]);
  const [challans, setChallans] = useState([]);
  const [vouchers, setVouchers] = useState([]);
  const [creditDebitNotes, setCreditDebitNotes] = useState([]);

  const [isLoading, setIsLoading] = useState(true);

  // Cross-module states
  const [preselectedCustomerId, setPreselectedCustomerId] = useState(null);

  // Modals visibility
  const [activeInvoice, setActiveInvoice] = useState(null);
  const [branchModalOpen, setBranchModalOpen] = useState(false);
  const [userModalOpen, setUserModalOpen] = useState(false);
  const [barcodePrintModalOpen, setBarcodePrintModalOpen] = useState(false);
  const [bulkBarcodeModalOpen, setBulkBarcodeModalOpen] = useState(false);
  const [loginModalOpen, setLoginModalOpen] = useState(false);
  const [changePasswordModalOpen, setChangePasswordModalOpen] = useState(false);
  const [forgotPasswordModalOpen, setForgotPasswordModalOpen] = useState(false);
  const [subscriptionModalOpen, setSubscriptionModalOpen] = useState(false);
  const [settingsModalOpen, setSettingsModalOpen] = useState(false);

  // Loading indicators
  const [isProcessingSale, setIsProcessingSale] = useState(false);
  const [isSavingItem, setIsSavingItem] = useState(false);
  const [isSavingCategory, setIsSavingCategory] = useState(false);
  const [isSavingSettings, setIsSavingSettings] = useState(false);

  // Toast Notifications
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback((message, type = 'success') => {
    const id = Date.now() + Math.random().toString(36).substr(2, 5);
    setToasts((prev) => [...prev, { id, message, type }]);

    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4500);
  }, []);

  const dismissToast = (id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  // Axios response interceptor: kick to login if 401 Unauthorized received
  useEffect(() => {
    const interceptor = axios.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response && error.response.status === 401) {
          setIsAuthenticated(false);
          setTenant(null);
          setCurrentUser(null);
          setStats(null);
          setItems([]);
          setCustomers([]);
          setSales([]);
          setCategories([]);
          setSuppliers([]);
          setBranches([]);
        } else if (error.response && error.response.status === 403 && error.response.data?.is_expired) {
          setTenant((prev) => (prev ? { ...prev, is_expired: true } : { is_expired: true }));
        }
        return Promise.reject(error);
      }
    );

    return () => axios.interceptors.response.eject(interceptor);
  }, []);

  // Fetch all domain-scoped data when authenticated
  const fetchData = useCallback(async () => {
    try {
      const meRes = await axios.get('/api/me');

      if (!meRes.data.authenticated || !meRes.data.tenant) {
        setIsAuthenticated(false);
        setTenant(null);
        setCurrentUser(null);
        setDomainInfo(meRes.data.domain_info || null);
        setIsLoading(false);
        return;
      }

      const currentTenant = meRes.data.tenant;
      setTenant(currentTenant);
      setCurrentUser(meRes.data.user || null);
      setActiveBranch(meRes.data.active_branch || null);
      setIsAuthenticated(true);

      if (currentTenant?.is_expired) {
        setIsLoading(false);
        return;
      }

      // Fetch primary datasets in parallel
      const [
        statsRes,
        itemsRes,
        customersRes,
        suppliersRes,
        brandsRes,
        hsnRes,
        branchesRes,
        salesRes,
        purchasesRes,
        challansRes,
        vouchersRes,
        notesRes,
        catsRes
      ] = await Promise.all([
        axios.get('/api/dashboard/stats').catch(() => ({ data: null })),
        axios.get('/api/items').catch(() => ({ data: { items: [] } })),
        axios.get('/api/customers').catch(() => ({ data: [] })),
        axios.get('/api/suppliers').catch(() => ({ data: [] })),
        axios.get('/api/brands').catch(() => ({ data: [] })),
        axios.get('/api/hsn-codes').catch(() => ({ data: [] })),
        axios.get('/api/branches').catch(() => ({ data: [] })),
        axios.get('/api/sales').catch(() => ({ data: { data: [] } })),
        axios.get('/api/purchases').catch(() => ({ data: { data: [] } })),
        axios.get('/api/challans').catch(() => ({ data: { data: [] } })),
        axios.get('/api/vouchers').catch(() => ({ data: { data: [] } })),
        axios.get('/api/credit-debit-notes').catch(() => ({ data: { data: [] } })),
        axios.get('/api/categories').catch(() => ({ data: { categories: [] } })),
      ]);

      const extractArray = (resData, fallbackKey = null) => {
        if (Array.isArray(resData)) return resData;
        if (Array.isArray(resData?.data)) return resData.data;
        if (fallbackKey && Array.isArray(resData?.[fallbackKey])) return resData[fallbackKey];
        return [];
      };

      const branchList = Array.isArray(branchesRes.data)
        ? branchesRes.data
        : (branchesRes.data?.branches || branchesRes.data?.data || []);

      setStats(statsRes.data);
      setItems(itemsRes.data?.items || (Array.isArray(itemsRes.data) ? itemsRes.data : []));
      setCustomers(Array.isArray(customersRes.data) ? customersRes.data : (customersRes.data?.customers || []));
      setSuppliers(Array.isArray(suppliersRes.data) ? suppliersRes.data : (suppliersRes.data?.suppliers || []));
      setBrands(Array.isArray(brandsRes.data) ? brandsRes.data : (brandsRes.data?.brands || []));
      setHsnCodes(Array.isArray(hsnRes.data) ? hsnRes.data : (hsnRes.data?.codes || []));
      setBranches(branchList);
      setSales(extractArray(salesRes.data, 'sales'));
      setPurchases(extractArray(purchasesRes.data, 'purchases'));
      setChallans(extractArray(challansRes.data, 'challans'));
      setVouchers(extractArray(vouchersRes.data, 'vouchers'));
      setCreditDebitNotes(extractArray(notesRes.data, 'notes'));
      setCategories(catsRes.data?.categories || (Array.isArray(catsRes.data) ? catsRes.data : []));

      // If active branch not set yet, pick first primary branch
      if (!meRes.data.active_branch && branchList.length > 0) {
        const prim = branchList.find((b) => b.is_primary) || branchList[0];
        setActiveBranch(prim);
      }
    } catch (err) {
      console.error('Failed to load application data:', err);
      if (err.response?.status !== 401) {
        addToast('Error loading store workstation data', 'error');
      }
    } finally {
      setIsLoading(false);
    }
  }, [addToast]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Branch Switcher
  const handleSwitchBranch = async (branchId) => {
    try {
      const res = await axios.post('/api/branches/switch', { branch_id: branchId });
      setActiveBranch(res.data.active_branch);
      addToast(`Switched active branch to ${res.data.active_branch.name}`);
      await fetchData();
    } catch (err) {
      addToast(err.response?.data?.message || 'Failed to switch branch', 'error');
    }
  };

  // POS Sale Operation
  const handleCompleteSale = async (payload, onSuccess) => {
    try {
      setIsProcessingSale(true);
      const res = await axios.post('/api/sales', {
        ...payload,
        branch_id: activeBranch?.id || payload.branch_id || null,
      });
      const createdSale = res.data.sale;
      addToast(`Invoice ${createdSale.invoice_no} generated successfully!`);
      setActiveInvoice(createdSale);

      if (onSuccess) onSuccess();

      // Refresh sales, stock, and stats
      const [statsRes, salesRes, itemsRes] = await Promise.all([
        axios.get('/api/dashboard/stats'),
        axios.get('/api/sales'),
        axios.get('/api/items')
      ]);
      setStats(statsRes.data);
      setSales(salesRes.data?.data || salesRes.data || []);
      setItems(itemsRes.data?.items || itemsRes.data || []);
    } catch (err) {
      addToast(err.response?.data?.message || 'Failed to process sale', 'error');
    } finally {
      setIsProcessingSale(false);
    }
  };

  // Settings Operation (Store & Profile)
  const handleSaveSettings = async (settingsPayload) => {
    try {
      setIsSavingSettings(true);
      const res = await axios.put('/api/settings', settingsPayload);
      setTenant(res.data.tenant);
      addToast('Store settings saved successfully!');
      setSettingsModalOpen(false);
    } catch (err) {
      addToast(err.response?.data?.message || 'Failed to save settings', 'error');
    } finally {
      setIsSavingSettings(false);
    }
  };

  // Item Operations
  const handleSaveItem = async (arg1, arg2) => {
    try {
      setIsSavingItem(true);
      let data, id;
      if (typeof arg1 === 'object' && arg1 !== null) {
        data = arg1;
        id = arg2;
      } else {
        id = arg1;
        data = arg2;
      }

      if (id) {
        await axios.put(`/api/items/${id}`, data);
        addToast('Item updated successfully');
      } else {
        await axios.post('/api/items', data);
        addToast('New item registered successfully');
      }
      const itemsRes = await axios.get('/api/items');
      setItems(itemsRes.data?.items || itemsRes.data || []);
    } catch (err) {
      addToast(err.response?.data?.message || 'Failed to save item', 'error');
    } finally {
      setIsSavingItem(false);
    }
  };

  const handleDeleteItem = async (id) => {
    try {
      await axios.delete(`/api/items/${id}`);
      addToast('Item deleted');
      setItems((prev) => prev.filter((i) => i.id !== id));
    } catch (err) {
      addToast(err.response?.data?.message || 'Failed to delete item', 'error');
    }
  };

  // Category Operations
  const handleSaveCategory = async (data, id) => {
    try {
      setIsSavingCategory(true);
      if (id) {
        await axios.put(`/api/categories/${id}`, data);
        addToast('Category updated successfully');
      } else {
        await axios.post('/api/categories', data);
        addToast('New category created successfully');
      }
      const [catsRes, itemsRes] = await Promise.all([
        axios.get('/api/categories'),
        axios.get('/api/items')
      ]);
      setCategories(catsRes.data?.categories || []);
      setItems(itemsRes.data?.items || itemsRes.data || []);
    } catch (err) {
      addToast(err.response?.data?.message || 'Failed to save category', 'error');
      throw err;
    } finally {
      setIsSavingCategory(false);
    }
  };

  const handleDeleteCategory = async (id) => {
    try {
      setIsSavingCategory(true);
      await axios.delete(`/api/categories/${id}`);
      addToast('Category deleted');
      const catsRes = await axios.get('/api/categories');
      setCategories(catsRes.data?.categories || []);
    } catch (err) {
      addToast(err.response?.data?.message || 'Failed to delete category', 'error');
    } finally {
      setIsSavingCategory(false);
    }
  };

  // Quick Add Customer from POS
  const handleQuickAddCustomer = async (customerData) => {
    try {
      const res = await axios.post('/api/customers', customerData);
      addToast(`Customer ${res.data.customer?.name} registered!`);
      const custRes = await axios.get('/api/customers');
      setCustomers(custRes.data || []);
      return res.data.customer;
    } catch (err) {
      addToast(err.response?.data?.message || 'Failed to add customer', 'error');
      return null;
    }
  };

  const handleBillCustomer = (customerId) => {
    setPreselectedCustomerId(customerId);
    setCurrentTab('pos');
    addToast('Customer selected in POS terminal');
  };

  const handleOpenPartyLedger = (partyType, partyId) => {
    setReportSubTab('ledger');
    setCurrentTab('reports');
  };

  // Auth Operations
  const handleLogin = async (credentials) => {
    try {
      const res = await axios.post('/api/login', credentials);
      setTenant(res.data.tenant);
      setCurrentUser(res.data.user || null);
      setActiveBranch(res.data.active_branch || null);
      setIsAuthenticated(true);
      addToast(`Welcome back, ${res.data.user?.name || res.data.tenant?.name || 'Admin'}!`);
      await fetchData();
    } catch (err) {
      throw err;
    }
  };

  const handleChangePassword = async (data) => {
    try {
      const res = await axios.post('/api/change-password', data);
      addToast(res.data.message || 'Password changed successfully!');
    } catch (err) {
      const msg = err.response?.data?.errors?.current_password?.[0] ||
        err.response?.data?.message ||
        'Failed to change password';
      addToast(msg, 'error');
      throw err;
    }
  };

  const handleForgotPassword = async (email) => {
    try {
      const res = await axios.post('/api/forgot-password', { email });
      addToast(res.data.message || 'Reset token generated!');
      return res.data;
    } catch (err) {
      addToast(err.response?.data?.message || 'Failed to process forgot password', 'error');
      throw err;
    }
  };

  const handleResetPassword = async (payload) => {
    try {
      const res = await axios.post('/api/reset-password', payload);
      setTenant(res.data.tenant);
      setIsAuthenticated(true);
      addToast(res.data.message || 'Password reset successfully!');
      await fetchData();
    } catch (err) {
      addToast(err.response?.data?.message || 'Failed to reset password', 'error');
      throw err;
    }
  };

  const handleLogout = async () => {
    try {
      await axios.post('/api/logout');
    } catch (err) {
      console.error(err);
    } finally {
      setIsAuthenticated(false);
      setTenant(null);
      setCurrentUser(null);
      setActiveBranch(null);
      setStats(null);
      setItems([]);
      setCustomers([]);
      setSuppliers([]);
      setSales([]);
      setPurchases([]);
      setChallans([]);
      setVouchers([]);
      setCategories([]);
      addToast('Logged out of workstation', 'info');
    }
  };

  // Initial Loading Splash
  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-slate-300 gap-4">
        <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 shadow-xl shadow-amber-500/10">
          <Store className="w-8 h-8 animate-bounce stroke-[2.5]" />
        </div>
        <div className="flex items-center gap-2.5 font-bold text-sm text-slate-200">
          <RefreshCw className="w-4 h-4 animate-spin text-amber-400" />
          <span>Verifying {domainInfo?.name || 'TradeBill Wholesaler'} Station Access...</span>
        </div>
      </div>
    );
  }

  // Login Screen
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-slate-950 font-sans">
        <LoginScreen
          onLogin={handleLogin}
          onForgotPassword={handleForgotPassword}
          onResetPassword={handleResetPassword}
          domainInfo={domainInfo}
        />
        <Toast toasts={toasts} onDismiss={dismissToast} />
      </div>
    );
  }

  // Subscription Lockout
  if (tenant?.is_expired) {
    return (
      <div className="min-h-screen bg-slate-50 font-sans">
        <SubscriptionLockScreen
          tenant={tenant}
          onRefresh={fetchData}
          onLogout={handleLogout}
          addToast={addToast}
        />
        <Toast toasts={toasts} onDismiss={dismissToast} />
      </div>
    );
  }

  const currency = tenant?.currency || '₹';

  // Breadcrumbs & Section Title Configuration
  const tabTitles = {
    pos: { title: 'POS Billing Register', subtitle: 'Fast checkout, item row discounts & instant trade bills', icon: Receipt },
    dashboard: { title: 'Operations Overview', subtitle: 'Revenue, buyer orders, sales analytics & stock valuation', icon: LayoutDashboard },
    items: { title: 'Items Catalog', subtitle: 'Merchandise rates, stock units, and combo packs', icon: Package },
    customers: { title: 'Account: Customer Directory', subtitle: 'Buyer party records, credit ledger & account statements', icon: Users },
    suppliers: { title: 'Account: Supplier Directory', subtitle: 'Vendors, procurement payables & ledger balance', icon: Truck },
    brands: { title: 'Items: Brand Master', subtitle: 'Manufacturer labels, brands & product lines', icon: Tag },
    hsn: { title: 'Items: HSN / SAC Codes', subtitle: 'GST tax classifications & standard rates', icon: Hash },
    categories: { title: 'Items: Category Departments', subtitle: 'departments, product categories & merchandise groups', icon: Layers },
    stock_in: { title: 'Inventory: Stock In (Inward)', subtitle: 'Receive stock inward into branch or warehouse with line-item rates & batch notes', icon: Boxes },
    stock_transfer: { title: 'Inventory: Stock Transfer', subtitle: 'Inter-branch and inter-warehouse stock transfer with dispatch notes', icon: ArrowRightLeft },
    inventory: { title: 'Inventory Operations Desk', subtitle: 'Stock Inward and Inter-branch transfer operations', icon: Boxes },
    challans: { title: 'Inventory: Stock Movements', subtitle: 'Inward, outward & inter-warehouse transfer slips', icon: Boxes },
    vouchers: { title: 'Voucher Desk', subtitle: 'Cash & bank voucher transactions for customers & suppliers', icon: Coins },
    receipt_vouchers: { title: 'Voucher: Receipt Vouchers (Money In)', subtitle: 'Customer cash collections, inward receipts & party settlements', icon: ArrowDownLeft },
    payment_vouchers: { title: 'Voucher: Payment Vouchers (Money Out)', subtitle: 'Supplier payments, procurement settlements & expense disbursements', icon: ArrowUpRight },
    notes: { title: 'Voucher: Credit & Debit Notes', subtitle: 'Customer sales return & vendor purchase return with stock adjustments (Zero GST)', icon: RotateCcw },
    credit_notes: { title: 'Voucher: Credit Notes (Sales Return)', subtitle: 'Customer sales returns, credit adjustments & stock re-entries (Zero GST)', icon: RotateCcw },
    debit_notes: { title: 'Voucher: Debit Notes (Purchase Return)', subtitle: 'Supplier purchase returns, debit adjustments & outbound stock returns (Zero GST)', icon: RotateCcw },
    purchases: { title: 'Purchase Management', subtitle: 'Intra-state, Inter-state & Unregistered inward procurement', icon: ShoppingCart },
    reports: { title: 'Store & Accounting Reports Hub', subtitle: 'Purchases, sales, daybook, cashbook, bank entry, stock & party ledger', icon: BarChart3 },
  };

  const ActiveIcon = tabTitles[currentTab]?.icon || Receipt;

  return (
    <div className={`bg-slate-100/75 flex flex-col text-slate-900 font-sans ${currentTab === 'pos' ? 'h-screen max-h-screen overflow-hidden' : 'min-h-screen'}`}>

      {/* Top Navigation Software Header */}
      <Navbar
        currentTab={currentTab}
        setCurrentTab={setCurrentTab}
        reportSubTab={reportSubTab}
        setReportSubTab={setReportSubTab}
        purchaseFilter={purchaseFilter}
        setPurchaseFilter={setPurchaseFilter}
        tenant={tenant}
        currentUser={currentUser}
        branches={branches}
        activeBranch={activeBranch}
        onSwitchBranch={handleSwitchBranch}
        onOpenBranchModal={() => setBranchModalOpen(true)}
        onOpenUserModal={() => setUserModalOpen(true)}
        onOpenBarcodePrintModal={() => setBarcodePrintModalOpen(true)}
        onOpenBulkBarcodeModal={() => setBulkBarcodeModalOpen(true)}
        onOpenSubscriptionModal={() => setSubscriptionModalOpen(true)}
        onOpenSettings={() => setSettingsModalOpen(true)}
        onOpenChangePassword={() => setChangePasswordModalOpen(true)}
        onLogout={handleLogout}
      />

      {/* Sub-Header Context Bar */}
      <div className={`bg-white border-b border-slate-200/90 shadow-2xs shrink-0`}>
        <div className={`w-full ${currentTab === 'pos' ? 'px-3 sm:px-4 lg:px-6 py-1.5' : 'px-4 sm:px-6 lg:px-8 2xl:px-10 py-2.5'}`}>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">

            {/* Breadcrumb Info */}
            <div className="flex items-center gap-2.5">
              <div className="p-1.5 rounded-lg bg-amber-50 text-amber-700 border border-amber-200/60 shrink-0">
                <ActiveIcon className="w-4 h-4" />
              </div>
              <div className="flex items-center gap-2 text-xs">
                <span className="font-extrabold text-slate-900">
                  {tabTitles[currentTab]?.title || 'Billing Workstation'}
                </span>
                <span className="text-slate-300">&bull;</span>
                <span className="text-slate-500 hidden md:inline">
                  {tabTitles[currentTab]?.subtitle}
                </span>
              </div>
            </div>

            {/* Quick Stats Pill Strip */}
            <div className="flex items-center gap-2 text-xs overflow-x-auto pb-1 sm:pb-0 scrollbar-none">

              {/* Active Branch Pill */}
              {activeBranch && (
                <button
                  onClick={() => setBranchModalOpen(true)}
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-900 text-xs font-bold border border-amber-300 shadow-2xs transition-colors shrink-0 cursor-pointer"
                  title="Click to manage branches"
                >
                  <Store className="w-3.5 h-3.5 text-amber-600" />
                  <span>{activeBranch.name}</span>
                  <span className="text-[10px] text-amber-700 font-mono">[{activeBranch.code}]</span>
                </button>
              )}

              {/* Today's Revenue */}
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-50 border border-slate-200 text-slate-700 font-medium whitespace-nowrap">
                <span className="text-slate-400 text-[11px]">Today:</span>
                <span className="font-mono font-bold text-amber-700">
                  {currency}{Number(stats?.today_revenue || 0).toFixed(2)}
                </span>
              </div>

              {/* Total Invoices */}
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-50 border border-slate-200 text-slate-700 font-medium whitespace-nowrap">
                <span className="text-slate-400 text-[11px]">Sales:</span>
                <span className="font-mono font-bold text-slate-900">
                  {stats?.today_sales_count || 0}
                </span>
              </div>

              {/* Fast POS Button */}
              {currentTab !== 'pos' && (
                <button
                  onClick={() => setCurrentTab('pos')}
                  className="flex items-center gap-1 px-3 py-1 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs shadow-xs transition-colors cursor-pointer shrink-0"
                >
                  <Receipt className="w-3.5 h-3.5" />
                  <span>Go to POS</span>
                </button>
              )}
            </div>

          </div>
        </div>
      </div>

      {/* Main Workstation Desk Area */}
      <main className={`flex-1 w-full min-h-0 ${currentTab === 'pos' ? 'p-2 sm:p-2.5 flex flex-col overflow-hidden' : 'px-4 sm:px-6 lg:px-8 2xl:px-10 py-5 sm:py-6'}`}>

        {/* Permission Guard: Verify Staff User Has Access to the Current Tab */}
        {currentUser && !hasPermission(currentUser, {
          pos: 'pos',
          dashboard: 'dashboard',
          items: 'items',
          categories: 'categories',
          customers: 'customers',
          suppliers: 'suppliers',
          brands: 'brands',
          hsn: 'hsn',
          stock_in: 'items',
          stock_out: 'items',
          stock_transfer: 'items',
          inventory: 'items',
          challans: 'challan',
          vouchers: 'vouchers',
          receipt_vouchers: 'vouchers',
          payment_vouchers: 'vouchers',
          payment_reminders: 'payment_reminders',
          notes: 'credit_debit_note',
          credit_notes: 'credit_debit_note',
          debit_notes: 'credit_debit_note',
          purchases: 'purchase',
          reports: 'reports',
        }[currentTab] || currentTab) ? (
          <div className="flex flex-col items-center justify-center min-h-[460px] text-center p-8 bg-slate-900/80 border border-slate-800 rounded-3xl max-w-lg mx-auto my-12 shadow-2xl backdrop-blur-sm">
            <div className="w-16 h-16 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400 mb-5 shadow-lg shadow-rose-500/10">
              <ShieldAlert className="w-8 h-8" />
            </div>
            <h2 className="text-xl font-bold text-white mb-2">Access Restricted</h2>
            <p className="text-xs text-slate-400 leading-relaxed mb-6">
              Your staff user role (<span className="text-amber-400 font-semibold">{currentUser?.role || 'staff'}</span>) does not have permission to view the <strong className="text-slate-200 capitalize">{currentTab.replace('_', ' ')}</strong> module. Contact your store administrator for permission updates.
            </p>
            <button
              onClick={() => setCurrentTab('pos')}
              className="inline-flex items-center gap-2 px-5 py-2.5 text-xs font-bold text-slate-950 bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 rounded-xl transition shadow-lg shadow-amber-500/20"
            >
              <ArrowLeft className="w-4 h-4" />
              Return to POS Billing Terminal
            </button>
          </div>
        ) : (
          <>
            {/* 1. POS Billing Terminal */}
            {currentTab === 'pos' && (
              <POS
                items={items}
                customers={customers}
                tenant={tenant}
                activeBranch={activeBranch}
                onCompleteSale={handleCompleteSale}
                onQuickAddCustomer={handleQuickAddCustomer}
                isProcessingSale={isProcessingSale}
                preselectedCustomerId={preselectedCustomerId}
                onClearPreselectedCustomer={() => setPreselectedCustomerId(null)}
                categories={categories}
              />
            )}

            {/* 2. Dashboard */}
            {currentTab === 'dashboard' && (
              <Dashboard
                stats={stats}
                tenant={tenant}
                onNavigate={(tab) => {
                  if (tab === 'sales' || tab === 'sale') {
                    setReportSubTab('sale');
                    setCurrentTab('reports');
                  } else {
                    setCurrentTab(tab);
                  }
                }}
                onOpenSubscriptionModal={() => setSubscriptionModalOpen(true)}
                onViewInvoice={(sale) => setActiveInvoice(sale)}
              />
            )}

            {/* 3. Items Catalog */}
            {currentTab === 'items' && (
              <ItemsServices
                items={items}
                tenant={tenant}
                categories={categories}
                onSaveItem={handleSaveItem}
                onDeleteItem={handleDeleteItem}
                isSaving={isSavingItem}
                onNavigateToCategories={() => setCurrentTab('categories')}
                onItemsRefresh={fetchData}
                addToast={addToast}
              />
            )}

            {/* 3b. Dedicated Category Manager Page */}
            {currentTab === 'categories' && (
              <CategoryManager
                categories={categories}
                items={items}
                onSaveCategory={handleSaveCategory}
                onDeleteCategory={handleDeleteCategory}
                isSaving={isSavingCategory}
                onNavigateToItems={() => setCurrentTab('items')}
                addToast={addToast}
              />
            )}

            {/* 4. Account Master: Customers & Suppliers */}
            {(currentTab === 'customers' || currentTab === 'suppliers') && (
              <AccountManager
                activeSubTab={currentTab === 'suppliers' ? 'supplier' : 'customer'}
                setActiveSubTab={(sub) => setCurrentTab(sub === 'supplier' ? 'suppliers' : 'customers')}
                customers={customers}
                suppliers={suppliers}
                tenant={tenant}
                onCustomerUpdated={fetchData}
                onSupplierUpdated={fetchData}
                onSelectCustomerForBill={handleBillCustomer}
                onOpenLedger={handleOpenPartyLedger}
                addToast={addToast}
              />
            )}

            {/* 5. Items Master: Brands */}
            {currentTab === 'brands' && (
              <BrandManager
                brands={brands}
                onBrandUpdated={fetchData}
                addToast={addToast}
              />
            )}

            {/* 6. Items Master: HSN / SAC Codes */}
            {currentTab === 'hsn' && (
              <HsnManager
                hsnCodes={hsnCodes}
                onHsnUpdated={fetchData}
                addToast={addToast}
              />
            )}

            {/* 7. Inventory: Stock In, Stock Transfer, Movements */}
            {currentTab === 'stock_in' && (
              <InventoryManager
                fixedType="stock_in"
                challans={challans}
                branches={branches}
                suppliers={suppliers}
                items={items}
                tenant={tenant}
                onChallanUpdated={fetchData}
                addToast={addToast}
              />
            )}
            {currentTab === 'stock_transfer' && (
              <InventoryManager
                fixedType="stock_transfer"
                challans={challans}
                branches={branches}
                suppliers={suppliers}
                items={items}
                tenant={tenant}
                onChallanUpdated={fetchData}
                addToast={addToast}
              />
            )}
            {(currentTab === 'inventory' || currentTab === 'challans') && (
              <InventoryManager
                challans={challans}
                branches={branches}
                suppliers={suppliers}
                items={items}
                tenant={tenant}
                onChallanUpdated={fetchData}
                addToast={addToast}
              />
            )}

            {/* 8. Voucher: Payment & Receipt Vouchers (Desk & Dedicated Pages) */}
            {currentTab === 'vouchers' && (
              <VoucherManager
                vouchers={vouchers}
                customers={customers}
                suppliers={suppliers}
                branches={branches}
                tenant={tenant}
                onVoucherUpdated={fetchData}
                addToast={addToast}
              />
            )}
            {currentTab === 'receipt_vouchers' && (
              <VoucherManager
                fixedType="receipt"
                vouchers={vouchers}
                customers={customers}
                suppliers={suppliers}
                branches={branches}
                tenant={tenant}
                onVoucherUpdated={fetchData}
                addToast={addToast}
              />
            )}
            {currentTab === 'payment_vouchers' && (
              <VoucherManager
                fixedType="payment"
                vouchers={vouchers}
                customers={customers}
                suppliers={suppliers}
                branches={branches}
                tenant={tenant}
                onVoucherUpdated={fetchData}
                addToast={addToast}
              />
            )}

            {/* 9. Payment Reminders & Overdue Receivables Tracker */}
            {currentTab === 'payment_reminders' && (
              <PaymentReminders
                tenant={tenant}
                onDataUpdated={fetchData}
                addToast={addToast}
              />
            )}

            {/* 10. Voucher / Challan: Credit Notes & Debit Notes (Combined & Dedicated Pages) */}
            {currentTab === 'notes' && (
              <CreditDebitNoteManager
                notes={creditDebitNotes}
                customers={customers}
                suppliers={suppliers}
                branches={branches}
                items={items}
                tenant={tenant}
                onNoteUpdated={fetchData}
                addToast={addToast}
              />
            )}
            {currentTab === 'credit_notes' && (
              <CreditDebitNoteManager
                fixedType="credit_note"
                notes={creditDebitNotes}
                customers={customers}
                suppliers={suppliers}
                branches={branches}
                items={items}
                tenant={tenant}
                onNoteUpdated={fetchData}
                addToast={addToast}
              />
            )}
            {currentTab === 'debit_notes' && (
              <CreditDebitNoteManager
                fixedType="debit_note"
                notes={creditDebitNotes}
                customers={customers}
                suppliers={suppliers}
                branches={branches}
                items={items}
                tenant={tenant}
                onNoteUpdated={fetchData}
                addToast={addToast}
              />
            )}

            {/* 11. Purchases (Intra-State, Inter-State, Unregistered) */}
            {currentTab === 'purchases' && (
              <PurchaseManager
                purchases={purchases}
                suppliers={suppliers}
                branches={branches}
                items={items}
                tenant={tenant}
                initialType={purchaseFilter}
                onPurchaseUpdated={fetchData}
                addToast={addToast}
              />
            )}

            {/* 12. Reports Hub (Purchases, Sales, Daybook, Cashbook, Bank Entry, Stock, Ledger) */}
            {currentTab === 'reports' && (
              <ReportsHub
                initialSubTab={reportSubTab}
                branches={branches}
                customers={customers}
                suppliers={suppliers}
                items={items}
                tenant={tenant}
                addToast={addToast}
                onViewInvoice={(sale) => setActiveInvoice(sale)}
              />
            )}
          </>
        )}

      </main>

      {/* MODAL: Printable Bill / Invoice Receipt */}
      <InvoiceReceiptModal
        sale={activeInvoice}
        tenant={tenant}
        customers={customers}
        onClose={() => setActiveInvoice(null)}
      />

      {/* MODAL: Branch / Store / Warehouse Manager */}
      <BranchManagerModal
        isOpen={branchModalOpen}
        onClose={() => setBranchModalOpen(false)}
        branches={branches}
        activeBranch={activeBranch}
        onBranchUpdated={fetchData}
        onSelectBranch={handleSwitchBranch}
        addToast={addToast}
      />

      {/* MODAL: Users, Roles & Permissions Matrix */}
      <UserManagerModal
        isOpen={userModalOpen}
        onClose={() => setUserModalOpen(false)}
        branches={branches}
        addToast={addToast}
      />

      {/* MODAL: Barcode Thermal & Sheet Label Printing */}
      <BarcodePrintingModal
        isOpen={barcodePrintModalOpen}
        onClose={() => setBarcodePrintModalOpen(false)}
        items={items}
        tenant={tenant}
      />

      {/* MODAL: Bulk Barcode Updates & Auto EAN Generation */}
      <BulkBarcodeModal
        isOpen={bulkBarcodeModalOpen}
        onClose={() => setBulkBarcodeModalOpen(false)}
        items={items}
        onItemsUpdated={fetchData}
        addToast={addToast}
      />

      {/* MODAL: Subscription Details & Plan Status */}
      <SubscriptionModal
        isOpen={subscriptionModalOpen}
        onClose={() => setSubscriptionModalOpen(false)}
        tenant={tenant}
        stats={stats}
      />

      {/* MODAL: Store Settings & Points */}
      <SettingsModal
        isOpen={settingsModalOpen}
        onClose={() => setSettingsModalOpen(false)}
        tenant={tenant}
        onSaveSettings={handleSaveSettings}
        isSaving={isSavingSettings}
      />

      {/* MODAL: Change Password */}
      <AuthModals
        loginOpen={false}
        changePasswordOpen={changePasswordModalOpen}
        forgotPasswordOpen={forgotPasswordModalOpen}
        onCloseAll={() => {
          setLoginModalOpen(false);
          setChangePasswordModalOpen(false);
          setForgotPasswordModalOpen(false);
        }}
        onLogin={handleLogin}
        onChangePassword={handleChangePassword}
        onForgotPassword={handleForgotPassword}
        onResetPassword={handleResetPassword}
        activeTenant={tenant}
      />

      {/* Toast Notifications Container */}
      <Toast toasts={toasts} onDismiss={dismissToast} />

    </div>
  );
}
