import React, { useState, useMemo, useEffect, useRef } from 'react';
import SearchableSelect from './SearchableSelect';
import {
  Plus,
  Minus,
  Trash2,
  Receipt,
  UserPlus,
  Building,
  RefreshCw,
  X,
  ChevronDown,
  User,
  Coins,
  Wallet,
  Banknote,
  QrCode,
  Package,
  Layers,
  Search
} from 'lucide-react';

export default function POS({
  items = [],
  customers = [],
  tenant,
  activeBranch,
  onCompleteSale,
  onQuickAddCustomer,
  isProcessingSale,
  preselectedCustomerId,
  onClearPreselectedCustomer,
  categories: categoriesList = []
}) {
  const currency = tenant?.currency || '₹';

  const itemList = useMemo(() => {
    if (Array.isArray(items)) return items;
    if (Array.isArray(items?.items)) return items.items;
    if (Array.isArray(items?.data)) return items.data;
    return [];
  }, [items]);

  const customerList = useMemo(() => {
    if (Array.isArray(customers)) return customers;
    if (Array.isArray(customers?.customers)) return customers.customers;
    if (Array.isArray(customers?.data)) return customers.data;
    return [];
  }, [customers]);

  // Categories list
  const categoryOptions = useMemo(() => {
    const fromItems = itemList.map((i) => i.category).filter(Boolean);
    const fromProps = (categoriesList || []).map((c) => (typeof c === 'string' ? c : c?.name)).filter(Boolean);
    const unique = Array.from(new Set([...fromItems, ...fromProps]));
    return unique.length > 0 ? unique : ['General'];
  }, [itemList, categoriesList]);

  // Customer Selection State
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [clientSearchQuery, setClientSearchQuery] = useState('');
  const [isClientDropdownOpen, setIsClientDropdownOpen] = useState(false);
  const clientDropdownRef = useRef(null);

  // Sync preselected customer from external tabs
  useEffect(() => {
    if (preselectedCustomerId) {
      setSelectedCustomerId(String(preselectedCustomerId));
    }
  }, [preselectedCustomerId]);

  // Close customer dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event) {
      if (clientDropdownRef.current && !clientDropdownRef.current.contains(event.target)) {
        setIsClientDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Quick Add Wholesale Customer modal state
  const [isCustomerModalOpen, setIsCustomerModalOpen] = useState(false);
  const [newCustomer, setNewCustomer] = useState({
    name: '',
    mobile_no: '',
    email: '',
    city: '',
    address: '',
    opening_balance: 0,
  });

  // -------------------------------------------------------------
  // CART / BILL TABLE STATE
  // Cart item: { item, quantity, unit_price, discount_percent, discount_amount }
  // -------------------------------------------------------------
  const [cart, setCart] = useState([]);
  const [discountAmount, setDiscountAmount] = useState(0);
  const [bulkDiscountPercent, setBulkDiscountPercent] = useState('');
  const [notes, setNotes] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('Cash');
  const [paidAmount, setPaidAmount] = useState('');

  const tableContainerRef = useRef(null);
  const prevCartLengthRef = useRef(0);

  useEffect(() => {
    if (cart.length > prevCartLengthRef.current) {
      if (tableContainerRef.current) {
        tableContainerRef.current.scrollTop = tableContainerRef.current.scrollHeight;
      }
    }
    prevCartLengthRef.current = cart.length;
  }, [cart.length]);

  // Apply discount % across all products in the cart
  const handleApplyBulkDiscountPercent = (pctVal) => {
    setBulkDiscountPercent(pctVal);
    if (pctVal === '' || pctVal === null) {
      setCart((prev) =>
        prev.map((i) => ({
          ...i,
          discount_percent: '',
          discount_amount: ''
        }))
      );
      return;
    }

    const pct = Math.min(100, Math.max(0, parseFloat(pctVal) || 0));
    setCart((prev) =>
      prev.map((i) => {
        const qty = Math.max(0, Number(i.quantity) || 0);
        const rate = Math.max(0, Number(i.unit_price) || 0);
        const gross = qty * rate;
        const amt = gross > 0 ? Math.round(((gross * pct) / 100) * 100) / 100 : 0;
        return {
          ...i,
          discount_percent: pctVal,
          discount_amount: amt > 0 ? String(amt) : ''
        };
      })
    );
  };

  // Row calculation helper
  const calculateRow = (row) => {
    const qty = Math.max(0.01, Number(row.quantity) || 1);
    const rate = Math.max(0, Number(row.unit_price) || 0);
    const amount = Math.round(qty * rate * 100) / 100;

    let discAmt = 0;
    let discPct = 0;

    if (row.discount_amount !== undefined && row.discount_amount !== '' && Number(row.discount_amount) > 0) {
      discAmt = Math.min(amount, Number(row.discount_amount) || 0);
      discPct = amount > 0 ? Math.round((discAmt / amount) * 10000) / 100 : 0;
    } else if (row.discount_percent !== undefined && row.discount_percent !== '' && Number(row.discount_percent) > 0) {
      discPct = Math.min(100, Number(row.discount_percent) || 0);
      discAmt = Math.round(((amount * discPct) / 100) * 100) / 100;
    }

    const subtotal = Math.max(0, Math.round((amount - discAmt) * 100) / 100);
    return { amount, discAmt, discPct, subtotal };
  };

  // -------------------------------------------------------------
  // SIMPLE "ADD PRODUCT TO BILL" SECTION: ONLY CATEGORY & PRODUCT
  // Product is added automatically when selected (qty = 1, disc = 0, rate = item.price)
  // -------------------------------------------------------------
  const [entryCategory, setEntryCategory] = useState('All');

  // Products available in the selected category
  const availableProducts = useMemo(() => {
    return itemList.filter((it) => {
      const matchCat = entryCategory === 'All' || it.category === entryCategory;
      return it.is_active !== false && matchCat;
    });
  }, [itemList, entryCategory]);

  // Automatically add product when selected from dropdown
  const handleProductSelectAndAdd = (productId, rawItem) => {
    if (!productId) return;
    // Always lookup authentic item from itemList
    let it = itemList.find((item) => String(item.id) === String(productId));
    if (!it && rawItem) {
      it = rawItem.raw ? rawItem.raw : rawItem;
    }
    if (!it) return;

    const rate = Number(it.price ?? it.rate ?? it.unit_price ?? 0) || 0;
    const qty = 1;

    setCart((prev) => {
      const existingIdx = prev.findIndex((i) => String(i.item?.id) === String(it.id));
      if (existingIdx !== -1) {
        const updated = [...prev];
        const existing = updated[existingIdx];
        const newQty = (Number(existing.quantity) || 0) + 1;
        const newGross = newQty * (Number(existing.unit_price) || 0);

        let newDiscAmt = existing.discount_amount;
        if (existing.discount_percent !== '' && Number(existing.discount_percent) > 0) {
          const pct = Math.min(100, Number(existing.discount_percent));
          newDiscAmt = Math.round(((newGross * pct) / 100) * 100) / 100;
        }

        updated[existingIdx] = {
          ...existing,
          quantity: newQty,
          discount_amount: newDiscAmt > 0 ? String(newDiscAmt) : ''
        };
        return updated;
      }

      let initialDiscPct = '';
      let initialDiscAmt = '';
      if (bulkDiscountPercent !== '' && Number(bulkDiscountPercent) > 0) {
        initialDiscPct = bulkDiscountPercent;
        const pct = Math.min(100, Number(bulkDiscountPercent));
        const amt = Math.round(((rate * qty * pct) / 100) * 100) / 100;
        initialDiscAmt = amt > 0 ? String(amt) : '';
      }

      return [
        ...prev,
        {
          item: it,
          quantity: qty,
          unit_price: rate,
          discount_percent: initialDiscPct,
          discount_amount: initialDiscAmt
        }
      ];
    });
  };

  // Table Row Modifiers with automatic two-way linked discounts
  const updateRowQuantity = (itemId, newQty) => {
    if (newQty !== '' && Number(newQty) <= 0) {
      removeFromCart(itemId);
      return;
    }
    setCart((prev) =>
      prev.map((i) => {
        if (String(i.item?.id) !== String(itemId)) return i;
        const qty = newQty === '' ? '' : Math.max(0.01, parseFloat(newQty) || 0);
        const rate = Math.max(0, Number(i.unit_price) || 0);
        const newGross = (Number(qty) || 0) * rate;

        let newDiscAmt = i.discount_amount;
        if (i.discount_percent !== '' && Number(i.discount_percent) > 0) {
          const pct = Math.min(100, Number(i.discount_percent));
          newDiscAmt = Math.round(((newGross * pct) / 100) * 100) / 100;
        }

        return {
          ...i,
          quantity: newQty,
          discount_amount: newDiscAmt > 0 ? String(newDiscAmt) : ''
        };
      })
    );
  };

  const updateRowRate = (itemId, newRate) => {
    setCart((prev) =>
      prev.map((i) => {
        if (String(i.item?.id) !== String(itemId)) return i;
        const rate = newRate === '' ? '' : Math.max(0, parseFloat(newRate) || 0);
        const qty = Math.max(0, Number(i.quantity) || 0);
        const newGross = qty * (Number(rate) || 0);

        let newDiscAmt = i.discount_amount;
        if (i.discount_percent !== '' && Number(i.discount_percent) > 0) {
          const pct = Math.min(100, Number(i.discount_percent));
          newDiscAmt = Math.round(((newGross * pct) / 100) * 100) / 100;
        }

        return {
          ...i,
          unit_price: newRate,
          discount_amount: newDiscAmt > 0 ? String(newDiscAmt) : ''
        };
      })
    );
  };

  // Edit discount % in table row -> auto-calculates amount
  const updateRowDiscountPercent = (itemId, pctVal) => {
    setCart((prev) =>
      prev.map((i) => {
        if (String(i.item?.id) !== String(itemId)) return i;
        const qty = Math.max(0, Number(i.quantity) || 0);
        const rate = Math.max(0, Number(i.unit_price) || 0);
        const gross = qty * rate;

        if (pctVal === '' || pctVal === null) {
          return { ...i, discount_percent: '', discount_amount: '' };
        }

        const pct = Math.min(100, Math.max(0, parseFloat(pctVal) || 0));
        const amt = gross > 0 ? Math.round(((gross * pct) / 100) * 100) / 100 : 0;
        return {
          ...i,
          discount_percent: pctVal,
          discount_amount: amt > 0 ? String(amt) : ''
        };
      })
    );
  };

  // Edit discount amount in table row -> auto-calculates %
  const updateRowDiscountAmount = (itemId, amtVal) => {
    setCart((prev) =>
      prev.map((i) => {
        if (String(i.item?.id) !== String(itemId)) return i;
        const qty = Math.max(0, Number(i.quantity) || 0);
        const rate = Math.max(0, Number(i.unit_price) || 0);
        const gross = qty * rate;

        if (amtVal === '' || amtVal === null) {
          return { ...i, discount_percent: '', discount_amount: '' };
        }

        const amt = Math.min(gross, Math.max(0, parseFloat(amtVal) || 0));
        const pct = gross > 0 ? Math.round(((amt / gross) * 100) * 100) / 100 : 0;
        return {
          ...i,
          discount_amount: amtVal,
          discount_percent: pct > 0 ? String(pct) : ''
        };
      })
    );
  };

  const removeFromCart = (itemId) => {
    setCart((prev) => prev.filter((i) => String(i.item?.id) !== String(itemId)));
  };

  const clearCart = () => {
    setCart([]);
    setDiscountAmount(0);
    setBulkDiscountPercent('');
    setNotes('');
    setPaidAmount('');
    if (onClearPreselectedCustomer) onClearPreselectedCustomer();
  };

  // Totals
  const { grossSubtotal, totalLineDiscounts, netSubtotal } = useMemo(() => {
    let gross = 0;
    let disc = 0;
    let net = 0;
    cart.forEach((row) => {
      const c = calculateRow(row);
      gross += c.amount;
      disc += c.discAmt;
      net += c.subtotal;
    });
    return {
      grossSubtotal: Math.round(gross * 100) / 100,
      totalLineDiscounts: Math.round(disc * 100) / 100,
      netSubtotal: Math.round(net * 100) / 100,
    };
  }, [cart]);

  const totalItemsCount = useMemo(() => {
    return cart.reduce((acc, curr) => acc + (Number(curr.quantity) || 0), 0);
  }, [cart]);

  const selectedCustomer = useMemo(() => {
    return customerList.find((c) => c.id === Number(selectedCustomerId));
  }, [customerList, selectedCustomerId]);

  const filteredDropdownCustomers = useMemo(() => {
    const q = clientSearchQuery.toLowerCase().trim();
    if (!q) return customerList.slice(0, 30);
    return customerList.filter(
      (c) =>
        c.name?.toLowerCase().includes(q) ||
        (c.mobile_no && c.mobile_no.includes(q)) ||
        (c.city && c.city.toLowerCase().includes(q))
    ).slice(0, 40);
  }, [customerList, clientSearchQuery]);

  const manualBillDiscount = Number(discountAmount) || 0;
  const grandTotal = Math.max(0, Math.round((netSubtotal - manualBillDiscount) * 100) / 100);

  const changeDue = useMemo(() => {
    if (paymentMethod !== 'Cash') return 0;
    const paid = Number(paidAmount);
    if (!paid || paid < grandTotal) return 0;
    return paid - grandTotal;
  }, [paidAmount, grandTotal, paymentMethod]);

  const handleApplyDiscountPercent = (pct) => {
    const calculated = (netSubtotal * pct) / 100;
    setDiscountAmount(Math.round(calculated));
  };

  const handleCheckout = () => {
    if (cart.length === 0) return;

    const payload = {
      branch_id: activeBranch?.id || null,
      customer_id: selectedCustomerId ? Number(selectedCustomerId) : null,
      items: cart.map((i) => {
        const c = calculateRow(i);
        return {
          item_id: i.item?.id,
          item_name: i.item?.name || i.item?.label || 'Item',
          short_name: i.item?.short_name || null,
          unit_price: Number(i.unit_price) || 0,
          quantity: Number(i.quantity) || 1,
          discount_percent: Math.round(c.discPct * 100) / 100,
          discount_amount: Math.round(c.discAmt * 100) / 100,
          total_price: Math.round(c.subtotal * 100) / 100,
          gst_percent: 0,
          tax_amount: 0,
        };
      }),
      subtotal: netSubtotal,
      discount_amount: manualBillDiscount,
      points_redeemed: 0,
      points_discount: 0,
      tax_amount: 0,
      total_amount: grandTotal,
      payment_method: paymentMethod,
      paid_amount: paymentMethod === 'Credit'
        ? 0
        : (paidAmount !== '' ? Number(paidAmount) : grandTotal),
      notes,
    };

    onCompleteSale(payload, () => {
      clearCart();
    });
  };

  const handleCreateQuickCustomer = async (e) => {
    e.preventDefault();
    if (!newCustomer.name) {
      alert('Party name is required.');
      return;
    }

    const created = await onQuickAddCustomer({
      name: newCustomer.name,
      mobile_no: newCustomer.mobile_no || null,
      email: newCustomer.email || null,
      city: newCustomer.city || null,
      address: newCustomer.address || null,
      opening_balance: Number(newCustomer.opening_balance) || 0,
    });

    if (created) {
      setSelectedCustomerId(String(created.id));
      setClientSearchQuery('');
      setIsClientDropdownOpen(false);
      setIsCustomerModalOpen(false);
      setNewCustomer({
        name: '',
        mobile_no: '',
        email: '',
        city: '',
        address: '',
        opening_balance: 0,
      });
    }
  };

  return (
    <div className="flex flex-col h-full min-h-0 gap-2 w-full overflow-hidden font-sans">
      
      {/* 1. TOP BAR: CUSTOMER / PARTY SELECTION */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-2 sm:px-3 sm:py-2 shadow-2xs shrink-0">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
          
          <div className="flex-1 max-w-xl" ref={clientDropdownRef}>
            {selectedCustomer ? (
              <div className="p-1 px-2.5 rounded-xl bg-amber-50 border border-amber-300 shadow-2xs flex items-center justify-between">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="w-6 h-6 rounded-lg bg-amber-500 text-slate-950 font-black flex items-center justify-center text-xs shrink-0">
                    {selectedCustomer.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0 flex items-center gap-2">
                    <span className="font-extrabold text-slate-900 text-xs truncate">
                      {selectedCustomer.name}
                    </span>
                    <span className="text-[10px] text-slate-500 font-mono truncate">
                      {selectedCustomer.mobile_no || 'No mobile'} {selectedCustomer.city ? `(${selectedCustomer.city})` : ''}
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedCustomerId('');
                    setClientSearchQuery('');
                  }}
                  className="px-2 py-0.5 rounded-lg bg-white border border-slate-200 text-slate-700 text-[11px] font-semibold flex items-center gap-1 hover:bg-slate-100 cursor-pointer shrink-0"
                >
                  Change
                  <X className="w-3 h-3 text-slate-400" />
                </button>
              </div>
            ) : (
              <div className="relative flex items-center gap-2">
                <div className="relative flex-1">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={clientSearchQuery}
                    onChange={(e) => {
                      setClientSearchQuery(e.target.value);
                      setIsClientDropdownOpen(true);
                    }}
                    onFocus={(e) => {
                      e.target.select();
                      setIsClientDropdownOpen(true);
                    }}
                    placeholder="Search party by name, firm, mobile (or counter cash)..."
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-8 py-1.5 text-xs text-slate-900 font-medium placeholder-slate-400 focus:outline-none focus:border-amber-500 focus:bg-white"
                  />
                  <button
                    type="button"
                    onClick={() => setIsClientDropdownOpen(!isClientDropdownOpen)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 cursor-pointer"
                  >
                    <ChevronDown className="w-3.5 h-3.5" />
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => setIsCustomerModalOpen(true)}
                  className="px-2.5 py-1.5 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-300 font-bold flex items-center gap-1 text-[11px] cursor-pointer whitespace-nowrap shrink-0 transition-colors"
                  title="Register new wholesale party"
                >
                  <UserPlus className="w-3.5 h-3.5 text-amber-700" />
                  <span className="hidden sm:inline">+ Register Party</span>
                </button>

                {isClientDropdownOpen && (
                  <div className="absolute left-0 right-0 top-full mt-1 z-50 bg-white border border-slate-200 rounded-2xl shadow-xl max-h-56 overflow-y-auto p-1.5 space-y-0.5 animate-in fade-in">
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedCustomerId('');
                        setClientSearchQuery('');
                        setIsClientDropdownOpen(false);
                      }}
                      className="w-full flex items-center justify-between p-2 rounded-xl hover:bg-slate-100 text-left transition-colors cursor-pointer"
                    >
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg bg-slate-100 text-slate-600 flex items-center justify-center font-bold text-xs">
                          <User className="w-3.5 h-3.5" />
                        </div>
                        <div>
                          <span className="font-extrabold text-xs text-slate-900 block">
                            Walk-in Cash Customer (Counter Sale)
                          </span>
                          <span className="text-[10px] text-slate-400">Immediate cash billing</span>
                        </div>
                      </div>
                      <span className="text-[10px] font-bold text-slate-400 px-2 py-0.5 rounded bg-slate-100">
                        Cash
                      </span>
                    </button>

                    <div className="border-t border-slate-100 my-1"></div>

                    {filteredDropdownCustomers.map((c) => (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => {
                          setSelectedCustomerId(String(c.id));
                          setClientSearchQuery('');
                          setIsClientDropdownOpen(false);
                        }}
                        className="w-full flex items-center justify-between p-2 rounded-xl hover:bg-amber-50 text-left transition-colors cursor-pointer"
                      >
                        <div className="min-w-0">
                          <span className="font-bold text-xs text-slate-900 block truncate">{c.name}</span>
                          <span className="text-[10px] text-slate-400 font-mono">
                            {c.mobile_no || 'No mobile'} {c.city ? `• ${c.city}` : ''}
                          </span>
                        </div>
                        <span className="text-[10px] font-bold text-amber-700">Select &rarr;</span>
                      </button>
                    ))}

                    {filteredDropdownCustomers.length === 0 && (
                      <div className="p-3 text-center text-xs text-slate-400">
                        No party matches "{clientSearchQuery}"
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {activeBranch && (
              <div className="px-2.5 py-1 rounded-xl bg-slate-50 border border-slate-200 text-right">
                <span className="text-[9px] uppercase font-bold text-slate-400 block leading-tight">Branch</span>
                <span className="font-bold text-xs text-slate-800 leading-tight">{activeBranch.name}</span>
              </div>
            )}
            <div className="px-2.5 py-1 rounded-xl bg-amber-50 border border-amber-200 text-right">
              <span className="text-[9px] uppercase font-bold text-amber-700 block leading-tight">Bill Items</span>
              <span className="font-black text-xs text-amber-900 font-mono leading-tight">
                {cart.length} lines &bull; {totalItemsCount} units
              </span>
            </div>
          </div>

        </div>
      </div>

      {/* 2. MAIN SECTION: BILL ITEMS (WITH INLINE ADD BELOW LISTING) & CHECKOUT SUMMARY */}
      <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-12 gap-2.5 h-full overflow-hidden">
        
        {/* LEFT / CENTER: BILL ITEMS TABLE + INLINE PRODUCT ADD */}
        <div className="lg:col-span-8 flex flex-col h-full min-h-0 bg-white border border-slate-200/90 rounded-2xl shadow-xs overflow-hidden">
          
          {/* Header */}
          <div className="px-3 py-2 border-b border-slate-100 flex items-center justify-between bg-slate-50/80 shrink-0">
            <div className="flex items-center gap-2">
              <Receipt className="w-4 h-4 text-amber-600" />
              <h2 className="font-black text-xs uppercase tracking-wider text-slate-900">
                Bill Items List
              </h2>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-slate-200 text-slate-700">
                {cart.length} lines
              </span>
            </div>

            {cart.length > 0 && (
              <button
                type="button"
                onClick={clearCart}
                className="text-xs text-rose-600 hover:text-rose-700 font-bold flex items-center gap-1 px-2 py-0.5 rounded-lg hover:bg-rose-50 cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Clear Bill</span>
              </button>
            )}
          </div>

          {/* Scrollable Table Area */}
          <div ref={tableContainerRef} className="flex-1 min-h-0 overflow-y-auto overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="sticky top-0 z-10 bg-slate-100 text-slate-700 border-b border-slate-200 text-[11px] font-black uppercase tracking-wider shadow-2xs">
                <tr>
                  <th className="py-2.5 px-3 text-center w-12">S.NO.</th>
                  <th className="py-2.5 px-3">Particulars & Rate</th>
                  <th className="py-2.5 px-3 text-center w-20">Qty</th>
                  <th className="py-2.5 px-3 text-right w-24">Amount</th>
                  <th className="py-1.5 px-2 text-center w-48">
                    <div className="flex flex-col items-center justify-center gap-1">
                      <span className="text-[10px] font-black uppercase tracking-wider text-slate-700">
                        Discount (% or Amt)
                      </span>
                      <div className="inline-flex items-center gap-1 bg-white border border-amber-300 rounded-md px-1.5 py-0.5 shadow-2xs font-normal">
                        <span className="text-[9px] font-bold text-slate-500 uppercase tracking-tight">All:</span>
                        <input
                          type="number"
                          min="0"
                          max="100"
                          step="0.5"
                          placeholder="0"
                          value={bulkDiscountPercent}
                          onFocus={(e) => e.target.select()}
                          onChange={(e) => handleApplyBulkDiscountPercent(e.target.value)}
                          className="w-10 text-right font-mono font-bold text-slate-900 text-[11px] outline-none"
                          title="Apply discount % to all products in bill"
                        />
                        <span className="text-[9px] font-mono font-bold text-amber-700">%</span>
                        {bulkDiscountPercent !== '' && (
                          <button
                            type="button"
                            onClick={() => handleApplyBulkDiscountPercent('')}
                            className="text-slate-400 hover:text-rose-600 p-0.5 cursor-pointer ml-0.5"
                            title="Clear discount across all products"
                          >
                            <X className="w-2.5 h-2.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  </th>
                  <th className="py-2.5 px-3 text-right w-24">Subtotal</th>
                  <th className="py-2.5 px-3 text-center w-10"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {cart.map((row, idx) => {
                  const { item, quantity, unit_price, discount_percent, discount_amount } = row;
                  const calc = calculateRow(row);
                  const itemId = item?.id ?? idx;

                  return (
                    <tr key={itemId} className="hover:bg-slate-50/80 transition-colors">
                      
                      {/* 1. S.NO. */}
                      <td className="py-2 px-3 text-center font-mono font-bold text-slate-400">
                        {idx + 1}
                      </td>

                      {/* 2. Particulars & Rate */}
                      <td className="py-2 px-3">
                        <div className="space-y-0.5">
                          <div className="font-extrabold text-slate-900 text-xs">
                            {item?.name || item?.label || 'Unnamed Item'}
                          </div>
                          
                          <div className="flex items-center gap-1.5 flex-wrap text-[10px]">
                            {(item?.short_name || item?.sku || item?.code) && (
                              <span className="font-mono font-bold text-slate-700 bg-slate-100 border border-slate-200 px-1 rounded">
                                {item?.short_name || item?.sku || item?.code}
                              </span>
                            )}
                            <span className="text-slate-400 font-mono">
                              Unit: {item?.unit || 'Pcs'}
                            </span>

                            {/* Editable Rate input */}
                            <div className="flex items-center gap-1 bg-slate-50 border border-slate-200 rounded px-1.5 py-0.5">
                              <span className="text-[10px] text-slate-400 font-mono">{currency}</span>
                              <input
                                type="number"
                                min="0"
                                step="0.01"
                                value={unit_price}
                                onFocus={(e) => e.target.select()}
                                onChange={(e) => updateRowRate(itemId, e.target.value)}
                                className="w-16 text-right font-mono font-bold text-slate-900 text-xs bg-transparent outline-none focus:bg-white rounded px-0.5"
                                title="Edit unit selling rate"
                              />
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* 3. Qty (plus / minus removed, text selected on focus) */}
                      <td className="py-2 px-3 text-center">
                        <input
                          type="number"
                          min="0.01"
                          step="1"
                          value={quantity}
                          onFocus={(e) => e.target.select()}
                          onChange={(e) => updateRowQuantity(itemId, e.target.value)}
                          className="w-14 text-center font-black text-slate-900 font-mono text-xs bg-slate-50 border border-slate-200 rounded-lg py-1 px-1 outline-none focus:bg-white focus:border-amber-500 focus:ring-1 focus:ring-amber-400"
                          title="Quantity"
                        />
                      </td>

                      {/* 4. Amount */}
                      <td className="py-2 px-3 text-right font-mono font-bold text-slate-700">
                        {currency}{calc.amount.toFixed(2)}
                      </td>

                      {/* 5. Discount (% or Amt) with 2 linked auto-calculating fields */}
                      <td className="py-2 px-3 text-center">
                        <div className="inline-flex items-center gap-1.5 bg-amber-50/60 p-1 rounded-lg border border-amber-200">
                          {/* % Field */}
                          <div className="relative">
                            <input
                              type="number"
                              min="0"
                              max="100"
                              step="0.5"
                              placeholder="0"
                              value={discount_percent}
                              onFocus={(e) => e.target.select()}
                              onChange={(e) => updateRowDiscountPercent(itemId, e.target.value)}
                              className="w-11 text-right font-mono font-bold text-slate-900 text-xs bg-white border border-amber-300 rounded px-1 py-0.5 outline-none focus:ring-1 focus:ring-amber-400"
                              title="Discount percentage"
                            />
                            <span className="text-[9px] font-mono font-bold text-amber-700 ml-0.5">%</span>
                          </div>

                          <span className="text-slate-300 text-[10px]">&bull;</span>

                          {/* Amt Field */}
                          <div className="relative">
                            <span className="text-[9px] font-mono font-bold text-amber-700 mr-0.5">{currency}</span>
                            <input
                              type="number"
                              min="0"
                              step="0.5"
                              placeholder="0"
                              value={discount_amount}
                              onFocus={(e) => e.target.select()}
                              onChange={(e) => updateRowDiscountAmount(itemId, e.target.value)}
                              className="w-13 text-right font-mono font-bold text-slate-900 text-xs bg-white border border-amber-300 rounded px-1 py-0.5 outline-none focus:ring-1 focus:ring-amber-400"
                              title="Discount amount"
                            />
                          </div>
                        </div>
                      </td>

                      {/* 6. Subtotal */}
                      <td className="py-2 px-3 text-right">
                        <span className="font-mono font-black text-slate-950 text-xs">
                          {currency}{calc.subtotal.toFixed(2)}
                        </span>
                      </td>

                      {/* Delete Action */}
                      <td className="py-2 px-3 text-center">
                        <button
                          type="button"
                          onClick={() => removeFromCart(itemId)}
                          className="p-1 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 cursor-pointer transition-colors"
                          title="Remove row"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>

                    </tr>
                  );
                })}

                {cart.length === 0 && (
                  <tr>
                    <td colSpan={7} className="py-10 text-center text-slate-400">
                      <div className="w-10 h-10 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto mb-2 border border-amber-200/60 shadow-2xs">
                        <Receipt className="w-5 h-5 stroke-[1.5]" />
                      </div>
                      <p className="font-black text-slate-700 text-xs">No items added to the bill yet</p>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        Search and select a product in the inline row below to instantly add it to this bill.
                      </p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* INLINE PRODUCT ADD ROW (DIRECTLY BELOW LISTING OF ADDED PRODUCTS) */}
          <div className="relative z-30 shrink-0 p-2 sm:p-2.5 bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent border-t border-amber-300/80">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
              
              {/* Line indicator badge */}
              <div className="hidden sm:flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-amber-500 text-slate-950 font-black text-xs shrink-0 shadow-2xs">
                <Plus className="w-3.5 h-3.5 stroke-[3]" />
                <span className="whitespace-nowrap">Line {cart.length + 1}</span>
              </div>

              {/* Category selector */}
              <div className="w-full sm:w-44 shrink-0">
                <SearchableSelect
                  options={[
                    { value: 'All', label: `All (${itemList.length})` },
                    ...categoryOptions.map((cat) => ({
                      value: cat,
                      label: cat,
                      badge: `${itemList.filter((i) => i.category === cat && i.is_active !== false).length}`
                    }))
                  ]}
                  value={entryCategory}
                  onChange={(cat) => setEntryCategory(cat || 'All')}
                  placeholder="All Categories"
                  searchPlaceholder="Filter category..."
                  size="sm"
                  theme="light"
                  direction="up"
                />
              </div>

              {/* Product selector (auto-adds on select, direction="up" so dropdown opens upwards) */}
              <div className="flex-1 min-w-0">
                <SearchableSelect
                  options={availableProducts.map((it) => ({
                    ...it,
                    value: it.id,
                    label: it.name,
                    sublabel: it.short_name ? `SKU: ${it.short_name}` : '',
                    badge: `${currency}${Number(it.price || 0).toFixed(2)} • Stock: ${it.stock_quantity ?? 0} ${it.unit || 'Pcs'}`,
                    raw: it
                  }))}
                  value=""
                  onChange={(productId, rawItem) => handleProductSelectAndAdd(productId, rawItem)}
                  placeholder="🔍 Type product name, SKU or scan barcode to add..."
                  searchPlaceholder="Type name or code, press Enter to add..."
                  size="sm"
                  theme="light"
                  direction="up"
                />
              </div>

            </div>
          </div>

          {/* Bill Bottom Delivery Notes */}
          <div className="shrink-0 px-3 py-1.5 bg-slate-50 border-t border-slate-100">
            <input
              type="text"
              placeholder="Delivery remarks, transport name, LR No., customer PO ref (optional)..."
              value={notes}
              onFocus={(e) => e.target.select()}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-amber-500 font-medium"
            />
          </div>

        </div>

        {/* RIGHT: BILL SUMMARY & CHECKOUT */}
        <div className="lg:col-span-4 flex flex-col h-full min-h-0 bg-white border border-slate-200/90 rounded-2xl p-3 sm:p-3.5 shadow-xs space-y-2.5 overflow-y-auto">
          
          <div className="flex items-center justify-between border-b border-slate-100 pb-1.5 shrink-0">
            <h3 className="font-black text-slate-900 text-xs uppercase tracking-wider">
              Bill Summary
            </h3>
            <span className="font-mono text-xs font-bold text-slate-500">
              {cart.length} lines &bull; {totalItemsCount} units
            </span>
          </div>

          {/* Financial Breakdown */}
          <div className="space-y-1.5 text-xs text-slate-600 bg-slate-50/80 p-2.5 rounded-xl border border-slate-200/80 shrink-0">
            <div className="flex justify-between items-center">
              <span>Items Gross Amount:</span>
              <span className="font-mono font-bold text-slate-900">{currency}{grossSubtotal.toFixed(2)}</span>
            </div>

            {totalLineDiscounts > 0 && (
              <div className="flex justify-between items-center text-amber-700 font-semibold">
                <span>Line Item Discounts:</span>
                <span className="font-mono font-bold">-{currency}{totalLineDiscounts.toFixed(2)}</span>
              </div>
            )}

            <div className="flex justify-between items-center pt-1 border-t border-slate-200/60 font-semibold text-slate-800">
              <span>Items Subtotal:</span>
              <span className="font-mono font-bold text-slate-950">{currency}{netSubtotal.toFixed(2)}</span>
            </div>

            {/* Extra Bill Discount */}
            <div className="flex flex-col gap-1 pt-1 border-t border-slate-200/60">
              <div className="flex items-center justify-between">
                <span>Extra Bill Discount ({currency}):</span>
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={discountAmount}
                  onFocus={(e) => e.target.select()}
                  onChange={(e) => setDiscountAmount(Math.max(0, Number(e.target.value)))}
                  className="w-20 bg-white border border-slate-200 rounded-lg px-2 py-0.5 text-right font-mono text-slate-900 text-xs focus:outline-none focus:border-amber-500 font-bold"
                />
              </div>
              <div className="flex items-center justify-end gap-1">
                {[0, 2, 5, 10].map((pct) => (
                  <button
                    key={pct}
                    type="button"
                    onClick={() => handleApplyDiscountPercent(pct)}
                    className="px-1.5 py-0.2 rounded text-[10px] font-semibold bg-white border border-slate-200 text-slate-600 hover:text-amber-700 hover:border-amber-300 cursor-pointer"
                  >
                    {pct === 0 ? 'Clear' : `${pct}%`}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Total Payable Ribbon */}
          <div className="bg-slate-950 text-white p-2.5 sm:p-3 rounded-xl border border-slate-800 shadow-md flex items-center justify-between shrink-0">
            <div>
              <span className="text-[10px] uppercase font-bold tracking-widest text-slate-400 block">
                Total Payable
              </span>
              <span className="text-[10px] text-slate-400 font-medium">
                Net Amount
              </span>
            </div>
            <div className="text-right">
              <span className="text-xl sm:text-2xl font-black text-amber-400 font-mono tracking-tight">
                {currency}{grandTotal.toFixed(2)}
              </span>
            </div>
          </div>

          {/* Payment Modes */}
          <div className="shrink-0">
            <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider block mb-1">
              Payment Mode
            </span>
            <div className="grid grid-cols-4 gap-1 text-xs">
              {[
                { id: 'Cash', icon: Banknote },
                { id: 'Credit', icon: Wallet },
                { id: 'UPI', icon: QrCode },
                { id: 'Bank Transfer', icon: Building },
              ].map((m) => {
                const Icon = m.icon;
                const isSelected = paymentMethod === m.id;
                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setPaymentMethod(m.id)}
                    className={`flex flex-col items-center justify-center p-1.5 rounded-xl border text-[10px] font-bold transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-xs font-black'
                        : 'bg-slate-50 border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5 mb-0.5" />
                    <span className="truncate">{m.id}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Cash Tendered & Change */}
          {paymentMethod === 'Cash' && (
            <div className="space-y-1.5 bg-slate-50 p-2 rounded-xl border border-slate-200 text-xs shrink-0">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] uppercase font-bold text-slate-500 block mb-0.5">Cash Paid:</label>
                  <input
                    type="number"
                    placeholder={grandTotal.toFixed(2)}
                    value={paidAmount}
                    onFocus={(e) => e.target.select()}
                    onChange={(e) => setPaidAmount(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-lg px-2 py-0.5 text-slate-900 font-mono text-xs focus:outline-none focus:border-amber-500 font-bold"
                  />
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-500 block mb-0.5">Change Due:</span>
                  <div className="text-emerald-700 font-mono font-black text-xs py-0.5">
                    {currency}{changeDue.toFixed(2)}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-1 pt-1 border-t border-slate-200">
                <span className="text-[9px] text-slate-400 font-semibold">Exact:</span>
                <button
                  type="button"
                  onClick={() => setPaidAmount(String(grandTotal))}
                  className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-white border border-slate-200 hover:bg-amber-50 text-slate-700 cursor-pointer"
                >
                  Exact
                </button>
                {[500, 1000, 2000].map((val) => (
                  <button
                    key={val}
                    type="button"
                    onClick={() => setPaidAmount(String(val))}
                    className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-white border border-slate-200 hover:bg-amber-50 text-slate-700 cursor-pointer"
                  >
                    {currency}{val}
                  </button>
                ))}
              </div>
            </div>
          )}

          {paymentMethod === 'Credit' && (
            <div className="p-2 rounded-xl bg-amber-50 border border-amber-200 text-[11px] text-amber-900 flex items-center gap-2 shrink-0">
              <Wallet className="w-4 h-4 text-amber-600 shrink-0" />
              <span>Credit will be booked to {selectedCustomer?.name || 'Party'} Ledger account.</span>
            </div>
          )}

          {(paymentMethod === 'UPI' || paymentMethod === 'Bank Transfer') && (
            <div className="p-2 rounded-xl bg-slate-50 border border-slate-200 text-[11px] text-slate-600 flex items-center gap-2 shrink-0">
              <QrCode className="w-4 h-4 text-slate-500 shrink-0" />
              <span>Digital settlement recorded for {paymentMethod}.</span>
            </div>
          )}

          {/* Complete Sale Button */}
          <button
            type="button"
            onClick={handleCheckout}
            disabled={cart.length === 0 || isProcessingSale}
            className={`w-full py-2.5 sm:py-3 rounded-xl font-black text-xs tracking-wide transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer shrink-0 mt-auto ${
              cart.length === 0 || isProcessingSale
                ? 'bg-slate-200 text-slate-400 cursor-not-allowed border border-slate-200 shadow-none'
                : 'bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 text-slate-950 shadow-amber-500/25 ring-1 ring-amber-300/60 transform hover:-translate-y-0.5 active:translate-y-0'
            }`}
          >
            {isProcessingSale ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin text-slate-950" />
                <span>Generating Wholesale Bill...</span>
              </>
            ) : (
              <>
                <Receipt className="w-4 h-4 stroke-[2.5]" />
                <span>Complete Sale &bull; {currency}{grandTotal.toFixed(2)}</span>
              </>
            )}
          </button>
        </div>

      </div>

      {/* Quick Add Wholesale Customer / Party Modal */}
      {isCustomerModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-700 flex items-center justify-center">
                  <UserPlus className="w-4 h-4" />
                </div>
                <h3 className="font-extrabold text-slate-900 text-base">Register Wholesale Party / Customer</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsCustomerModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateQuickCustomer} className="space-y-3.5 text-xs">
              <div>
                <label className="text-[11px] font-bold text-slate-700 block mb-1">
                  Customer / Business Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Metro Traders / Ramesh Kumar"
                  value={newCustomer.name}
                  onFocus={(e) => e.target.select()}
                  onChange={(e) => setNewCustomer({ ...newCustomer, name: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 focus:outline-none focus:border-amber-500 focus:bg-white"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-bold text-slate-700 block mb-1">
                    Mobile Number
                  </label>
                  <input
                    type="tel"
                    placeholder="e.g. 9876543210"
                    value={newCustomer.mobile_no}
                    onFocus={(e) => e.target.select()}
                    onChange={(e) => setNewCustomer({ ...newCustomer, mobile_no: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 focus:outline-none focus:border-amber-500 focus:bg-white"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-700 block mb-1">
                    City / Town
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Mumbai / Pune"
                    value={newCustomer.city}
                    onFocus={(e) => e.target.select()}
                    onChange={(e) => setNewCustomer({ ...newCustomer, city: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 focus:outline-none focus:border-amber-500 focus:bg-white"
                  />
                </div>
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-700 block mb-1">
                  Shop / Business Address
                </label>
                <input
                  type="text"
                  placeholder="Market road, shop number, area..."
                  value={newCustomer.address}
                  onFocus={(e) => e.target.select()}
                  onChange={(e) => setNewCustomer({ ...newCustomer, address: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 focus:outline-none focus:border-amber-500 focus:bg-white"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-bold text-slate-700 block mb-1">
                    Email Address (Optional)
                  </label>
                  <input
                    type="email"
                    placeholder="contact@business.com"
                    value={newCustomer.email}
                    onFocus={(e) => e.target.select()}
                    onChange={(e) => setNewCustomer({ ...newCustomer, email: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 focus:outline-none focus:border-amber-500 focus:bg-white"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-700 block mb-1">
                    Opening Balance ({currency})
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={newCustomer.opening_balance}
                    onFocus={(e) => e.target.select()}
                    onChange={(e) => setNewCustomer({ ...newCustomer, opening_balance: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 font-mono focus:outline-none focus:border-amber-500 focus:bg-white"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsCustomerModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-slate-600 hover:text-slate-800 text-xs font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs shadow-md shadow-amber-500/20 cursor-pointer"
                >
                  Save & Select Party
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
