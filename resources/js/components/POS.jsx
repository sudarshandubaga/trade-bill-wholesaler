import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  Plus,
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
  editingSale = null,
  onCancelEditSale,
  onUpdateSale,
  onQuickAddCustomer,
  isProcessingSale,
  preselectedCustomerId,
  onClearPreselectedCustomer,
  categories: categoriesList = [],
  isInvoiceModalOpen = false
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
  const [highlightedCustomerIndex, setHighlightedCustomerIndex] = useState(0);

  // Modal Visibility State
  const [isCustomerModalOpen, setIsCustomerModalOpen] = useState(false);
  const [isAddProductModalOpen, setIsAddProductModalOpen] = useState(false);
  const [isPopupProductDropdownOpen, setIsPopupProductDropdownOpen] = useState(false);

  const clientDropdownRef = useRef(null);
  const customerInputRef = useRef(null);
  const customerDropdownListRef = useRef(null);
  const customerItemRefs = useRef([]);
  const completeSaleButtonRef = useRef(null);

  // Focus customer selection input on mount or whenever bill resets / invoice modal closes
  useEffect(() => {
    if (!isInvoiceModalOpen && !selectedCustomerId && !isCustomerModalOpen) {
      setIsAddProductModalOpen(false);
      setIsPopupProductDropdownOpen(false);
      setIsClientDropdownOpen(true);
      setHighlightedCustomerIndex(0);
      const timer = setTimeout(() => {
        customerInputRef.current?.focus();
        customerInputRef.current?.select();
      }, 60);
      return () => clearTimeout(timer);
    }
  }, [isInvoiceModalOpen, selectedCustomerId, isCustomerModalOpen]);

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
  const quickCustomerInputRefs = useRef([]);
  const [newCustomer, setNewCustomer] = useState({
    name: '',
    mobile_no: '',
    email: '',
    city: '',
    address: '',
    opening_balance: 0,
  });

  useEffect(() => {
    if (isCustomerModalOpen) {
      setTimeout(() => {
        quickCustomerInputRefs.current[0]?.focus();
      }, 50);
    }
  }, [isCustomerModalOpen]);

  // -------------------------------------------------------------
  // CART / BILL TABLE STATE
  // Cart item: { item, quantity, unit_price, discount_percent, discount_amount }
  // -------------------------------------------------------------
  const [cart, setCart] = useState([]);
  const [discountAmount, setDiscountAmount] = useState(0);
  const [bulkDiscountPercent, setBulkDiscountPercent] = useState('');
  const [notes, setNotes] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('Credit');
  const [paidAmount, setPaidAmount] = useState('');

  // Load editing sale if present
  useEffect(() => {
    if (editingSale) {
      if (editingSale.customer_id) {
        setSelectedCustomerId(String(editingSale.customer_id));
      } else if (editingSale.customer_name) {
        setSelectedCustomerId('walkin');
      }
      if (editingSale.payment_method) {
        setPaymentMethod(editingSale.payment_method);
      }
      if (editingSale.notes) {
        setNotes(editingSale.notes);
      }
      if (editingSale.discount_amount !== undefined) {
        setDiscountAmount(Number(editingSale.discount_amount) || 0);
      }
      if (editingSale.items && Array.isArray(editingSale.items)) {
        const loadedCart = editingSale.items.map((it) => {
          const matchedItem = itemList.find((i) => String(i.id) === String(it.item_id)) || {
            id: it.item_id || `temp-${Math.random()}`,
            name: it.item_name,
            short_name: it.short_name,
            price: it.unit_price,
            stock_quantity: 9999,
          };
          return {
            item: matchedItem,
            quantity: Number(it.quantity) || 1,
            unit_price: Number(it.unit_price) || 0,
            discount_percent: it.discount_percent !== null && it.discount_percent !== undefined ? String(it.discount_percent) : '',
            discount_amount: it.discount_amount !== null && it.discount_amount !== undefined ? String(it.discount_amount) : '',
          };
        });
        setCart(loadedCart);
      }
    }
  }, [editingSale, itemList]);

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
    setPopupDiscountPercent('');
    setNotes('');
    setPaidAmount('');
    setSelectedCustomerId('');
    setClientSearchQuery('');
    setPaymentMethod('Credit');
    setIsAddProductModalOpen(false);
    setIsPopupProductDropdownOpen(false);
    setIsClientDropdownOpen(true);
    setHighlightedCustomerIndex(0);
    if (onClearPreselectedCustomer) onClearPreselectedCustomer();
    if (onCancelEditSale) onCancelEditSale();
    setTimeout(() => {
      customerInputRef.current?.focus();
      customerInputRef.current?.select();
    }, 50);
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
    if (!selectedCustomerId) return null;
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

  const selectableCustomerOptions = useMemo(() => {
    return filteredDropdownCustomers.map((c) => ({
      id: String(c.id),
      name: c.name,
      mobile_no: c.mobile_no,
      city: c.city,
      raw: c,
      subtitle: `${c.mobile_no || 'No mobile'}${c.city ? ` • ${c.city}` : ''}`
    }));
  }, [filteredDropdownCustomers]);

  const handleSelectCustomer = (opt) => {
    if (!opt) return;
    setSelectedCustomerId(String(opt.id || opt.raw?.id));
    setClientSearchQuery('');
    setIsClientDropdownOpen(false);
    setHighlightedCustomerIndex(0);

    // After selection of customer, open Add Product Popup!
    setIsAddProductModalOpen(true);
  };

  const handleResetCustomer = () => {
    setSelectedCustomerId('');
    setClientSearchQuery('');
    setIsAddProductModalOpen(false);
    setIsPopupProductDropdownOpen(false);
    setIsClientDropdownOpen(true);
    setHighlightedCustomerIndex(0);
    setTimeout(() => {
      customerInputRef.current?.focus();
      customerInputRef.current?.select();
    }, 50);
  };

  const handleCustomerKeyDown = (e) => {
    if (!isClientDropdownOpen) {
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault();
        setIsClientDropdownOpen(true);
        return;
      }
      if (e.key === 'Enter') {
        e.preventDefault();
        const target = selectableCustomerOptions[highlightedCustomerIndex] || selectableCustomerOptions[0];
        if (target) {
          handleSelectCustomer(target);
        } else {
          setIsClientDropdownOpen(true);
        }
        return;
      }
      return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightedCustomerIndex((prev) => {
        const next = prev < selectableCustomerOptions.length - 1 ? prev + 1 : 0;
        customerItemRefs.current[next]?.scrollIntoView({ block: 'nearest' });
        return next;
      });
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedCustomerIndex((prev) => {
        const next = prev > 0 ? prev - 1 : selectableCustomerOptions.length - 1;
        customerItemRefs.current[next]?.scrollIntoView({ block: 'nearest' });
        return next;
      });
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const target = selectableCustomerOptions[highlightedCustomerIndex] || selectableCustomerOptions[0];
      if (target) {
        handleSelectCustomer(target);
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setIsClientDropdownOpen(false);
    }
  };

  // -------------------------------------------------------------
  // ADD PRODUCT POPUP MODAL STATE & LOGIC
  // -------------------------------------------------------------
  const [popupSelectedProduct, setPopupSelectedProduct] = useState(null);
  const [popupProductSearchQuery, setPopupProductSearchQuery] = useState('');
  const [popupHighlightedProductIndex, setPopupHighlightedProductIndex] = useState(0);
  const [popupQty, setPopupQty] = useState('1');
  const [popupDiscountPercent, setPopupDiscountPercent] = useState('');
  const [popupFeedbackMsg, setPopupFeedbackMsg] = useState('');

  const popupProductSearchInputRef = useRef(null);
  const popupQtyInputRef = useRef(null);
  const popupDiscountInputRef = useRef(null);
  const popupDropdownRef = useRef(null);
  const popupItemRefs = useRef([]);

  // Auto focus product search input when Add Product popup opens
  useEffect(() => {
    if (isAddProductModalOpen) {
      const timer = setTimeout(() => {
        popupProductSearchInputRef.current?.focus();
      }, 60);
      return () => clearTimeout(timer);
    }
  }, [isAddProductModalOpen]);

  // Close popup product dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (popupDropdownRef.current && !popupDropdownRef.current.contains(event.target)) {
        setIsPopupProductDropdownOpen(false);
      }
    }
    if (isPopupProductDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isPopupProductDropdownOpen]);

  const handleCloseAddProductModal = () => {
    setIsPopupProductDropdownOpen(false);
    setIsAddProductModalOpen(false);
    setTimeout(() => {
      completeSaleButtonRef.current?.focus();
    }, 50);
  };

  // Keyboard shortcut: F2 to open Add Product popup, Esc to close product popup or reset customer,
  // and Enter to complete sale / generate invoice when customer is selected & products exist & popup is closed
  useEffect(() => {
    const handleGlobalKeyDown = (e) => {
      // When invoice print modal is open, let that modal handle Enter / Escape
      if (isInvoiceModalOpen) return;

      if (e.key === 'F2') {
        e.preventDefault();
        setIsAddProductModalOpen(true);
      } else if (e.key === 'Escape') {
        if (isAddProductModalOpen) {
          e.preventDefault();
          handleCloseAddProductModal();
          return;
        }
        if (selectedCustomerId && cart.length === 0) {
          e.preventDefault();
          handleResetCustomer();
          return;
        }
      } else if (e.key === 'Enter') {
        // If customer quick-add modal is open, let its form submit handle it
        if (isCustomerModalOpen) return;

        // If add product popup is open, popup fields handle Enter
        if (isAddProductModalOpen) return;

        // If client search dropdown is open, client dropdown handles Enter
        if (isClientDropdownOpen) return;

        // If no customer selected, customer search field handles Enter
        if (!selectedCustomerId) return;

        // If customer is selected but cart is empty, open Add Product popup
        if (cart.length === 0) {
          e.preventDefault();
          setIsAddProductModalOpen(true);
          return;
        }

        // Customer is selected and items exist in cart: Generate Wholesale Invoice!
        if (!isProcessingSale) {
          e.preventDefault();
          handleCheckoutRef.current?.();
        }
      }
    };
    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [
    isInvoiceModalOpen,
    isAddProductModalOpen,
    selectedCustomerId,
    cart.length,
    isProcessingSale,
    isCustomerModalOpen,
    isClientDropdownOpen
  ]);

  // Products filtered for the popup search
  const popupFilteredProducts = useMemo(() => {
    const q = popupProductSearchQuery.toLowerCase().trim();
    if (!q) {
      return itemList.filter((it) => it.is_active !== false).slice(0, 40);
    }
    return itemList.filter((it) => {
      if (it.is_active === false) return false;
      const matchName = String(it.name || '').toLowerCase().includes(q);
      const matchSku = String(it.short_name || it.sku || it.code || '').toLowerCase().includes(q);
      const matchCat = String(it.category || '').toLowerCase().includes(q);
      return matchName || matchSku || matchCat;
    }).slice(0, 40);
  }, [itemList, popupProductSearchQuery]);

  const handlePopupSelectProduct = (product) => {
    if (!product) return;
    setPopupSelectedProduct(product);
    setPopupProductSearchQuery(product.name || '');
    setIsPopupProductDropdownOpen(false);
    if (popupDiscountPercent === '' && bulkDiscountPercent !== '') {
      setPopupDiscountPercent(bulkDiscountPercent);
    }
    // Auto-focus Qty input after selecting product
    setTimeout(() => {
      popupQtyInputRef.current?.focus();
      popupQtyInputRef.current?.select();
    }, 50);
  };

  const handlePopupProductKeyDown = (e) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      handleCloseAddProductModal();
      return;
    }

    if (!isPopupProductDropdownOpen) {
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault();
        setIsPopupProductDropdownOpen(true);
        return;
      }
      if (e.key === 'Enter') {
        e.preventDefault();
        if (popupFilteredProducts.length > 0) {
          handlePopupSelectProduct(popupFilteredProducts[popupHighlightedProductIndex] || popupFilteredProducts[0]);
        } else if (popupSelectedProduct) {
          popupQtyInputRef.current?.focus();
          popupQtyInputRef.current?.select();
        } else {
          setIsPopupProductDropdownOpen(true);
        }
        return;
      }
      return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setPopupHighlightedProductIndex((prev) => {
        const next = prev < popupFilteredProducts.length - 1 ? prev + 1 : 0;
        popupItemRefs.current[next]?.scrollIntoView({ block: 'nearest' });
        return next;
      });
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setPopupHighlightedProductIndex((prev) => {
        const next = prev > 0 ? prev - 1 : popupFilteredProducts.length - 1;
        popupItemRefs.current[next]?.scrollIntoView({ block: 'nearest' });
        return next;
      });
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (popupFilteredProducts.length > 0 && popupFilteredProducts[popupHighlightedProductIndex]) {
        handlePopupSelectProduct(popupFilteredProducts[popupHighlightedProductIndex]);
      } else if (popupFilteredProducts.length > 0) {
        handlePopupSelectProduct(popupFilteredProducts[0]);
      }
    }
  };

  const handleAddProductFromPopup = (e) => {
    if (e) {
      if (typeof e.preventDefault === 'function') e.preventDefault();
      if (typeof e.stopPropagation === 'function') e.stopPropagation();
    }
    if (!popupSelectedProduct) {
      setIsPopupProductDropdownOpen(true);
      popupProductSearchInputRef.current?.focus();
      return;
    }

    const parsedQty = parseFloat(popupQty);
    const qtyToAdd = (!isNaN(parsedQty) && parsedQty > 0) ? parsedQty : 1;
    const rate = Number(popupSelectedProduct.price ?? popupSelectedProduct.rate ?? popupSelectedProduct.unit_price ?? 0) || 0;
    const discPct = popupDiscountPercent !== '' ? Math.min(100, Math.max(0, parseFloat(popupDiscountPercent) || 0)) : '';

    setCart((prev) => {
      const existingIdx = prev.findIndex((i) => String(i.item?.id) === String(popupSelectedProduct.id));
      if (existingIdx !== -1) {
        const updated = [...prev];
        const existing = updated[existingIdx];
        const newQty = Math.round(((Number(existing.quantity) || 0) + qtyToAdd) * 1000) / 1000;
        const newGross = newQty * (Number(existing.unit_price) || 0);

        let newDiscAmt = existing.discount_amount;
        const effectiveDiscPct = discPct !== '' ? discPct : existing.discount_percent;
        if (effectiveDiscPct !== '' && Number(effectiveDiscPct) > 0) {
          const pct = Math.min(100, Number(effectiveDiscPct));
          newDiscAmt = Math.round(((newGross * pct) / 100) * 100) / 100;
        }

        updated[existingIdx] = {
          ...existing,
          quantity: newQty,
          discount_percent: effectiveDiscPct !== '' ? String(effectiveDiscPct) : '',
          discount_amount: newDiscAmt > 0 ? String(newDiscAmt) : ''
        };
        return updated;
      }

      let initialDiscAmt = '';
      if (discPct !== '' && Number(discPct) > 0) {
        const amt = Math.round(((rate * qtyToAdd * discPct) / 100) * 100) / 100;
        initialDiscAmt = amt > 0 ? String(amt) : '';
      }

      return [
        ...prev,
        {
          item: popupSelectedProduct,
          quantity: qtyToAdd,
          unit_price: rate,
          discount_percent: discPct !== '' ? String(discPct) : '',
          discount_amount: initialDiscAmt
        }
      ];
    });

    const addedName = popupSelectedProduct.name;
    setPopupFeedbackMsg(`Added ${qtyToAdd}x "${addedName}" to bill!`);
    setTimeout(() => {
      setPopupFeedbackMsg('');
    }, 2500);

    // Reset popup input fields for the next product
    setPopupSelectedProduct(null);
    setPopupProductSearchQuery('');
    setPopupQty('1');
    // Discount remains previous value (do not reset popupDiscountPercent)
    setIsPopupProductDropdownOpen(false);

    // Add Product popup remains OPEN as requested by user.
    // Focus automatically returns to product search for seamless consecutive entries!
    setTimeout(() => {
      popupProductSearchInputRef.current?.focus();
    }, 50);
  };

  const popupPrice = popupSelectedProduct ? Number(popupSelectedProduct.price ?? popupSelectedProduct.rate ?? 0) : 0;
  const popupQtyNum = parseFloat(popupQty) || 0;
  const popupGross = Math.round(popupPrice * popupQtyNum * 100) / 100;
  const popupDiscNum = parseFloat(popupDiscountPercent) || 0;
  const popupDiscAmt = popupDiscNum > 0 ? Math.round(((popupGross * popupDiscNum) / 100) * 100) / 100 : 0;
  const popupLineTotal = Math.max(0, Math.round((popupGross - popupDiscAmt) * 100) / 100);

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
    if (cart.length === 0 || isProcessingSale) return;
    if (!selectedCustomerId) {
      if (customerInputRef.current) {
        customerInputRef.current.focus();
      }
      return;
    }

    const payload = {
      branch_id: activeBranch?.id || null,
      customer_id: Number(selectedCustomerId),
      items: cart.map((i) => {
        const c = calculateRow(i);
        const parsedQty = parseFloat(i.quantity);
        const finalQty = (!isNaN(parsedQty) && parsedQty > 0) ? parsedQty : 1;
        return {
          item_id: i.item?.id,
          item_name: i.item?.name || i.item?.label || 'Item',
          short_name: i.item?.short_name || null,
          unit_price: Number(i.unit_price) || 0,
          quantity: finalQty,
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

    if (editingSale && onUpdateSale) {
      onUpdateSale(editingSale.id, payload, () => {
        clearCart();
      });
    } else {
      onCompleteSale(payload, () => {
        clearCart();
      });
    }
  };

  const handleCheckoutRef = useRef();
  handleCheckoutRef.current = handleCheckout;

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
      // After selection of customer, open Add Product Popup
      setIsAddProductModalOpen(true);
    }
  };

  return (
    <div className="flex flex-col h-full min-h-0 gap-2 w-full overflow-hidden font-sans">

      {/* Edit Mode Alert Banner */}
      {editingSale && (
        <div className="bg-amber-500/15 border-2 border-amber-500/40 rounded-2xl p-2.5 px-4 flex items-center justify-between shadow-xs shrink-0 animate-in fade-in">
          <div className="flex items-center gap-2.5">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse"></span>
            <span className="text-xs font-black text-amber-950 uppercase tracking-wide">
              Editing Wholesale Bill #{editingSale.invoice_no}
            </span>
            <span className="text-[11px] text-amber-800 font-medium hidden sm:inline">
              (Adjust items, rates, discounts or customer and click Update Bill)
            </span>
          </div>
          <button
            type="button"
            onClick={() => {
              clearCart();
              onCancelEditSale?.();
            }}
            className="px-3 py-1 rounded-xl bg-white hover:bg-slate-100 text-slate-800 border border-slate-300 text-xs font-bold transition-colors cursor-pointer shadow-2xs"
          >
            Cancel Edit
          </button>
        </div>
      )}

      {/* 1. TOP BAR: CUSTOMER / PARTY SELECTION */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-2 sm:px-3 sm:py-2 shadow-2xs shrink-0">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">

          <div className="flex-1 max-w-xl" ref={clientDropdownRef}>
            {selectedCustomer ? (
              <div className="p-1 px-2.5 rounded-xl bg-amber-50 border border-amber-300 shadow-2xs flex items-center justify-between">
                <div className="flex items-center gap-2 min-w-0">
                  <div className={`w-6 h-6 rounded-lg font-black flex items-center justify-center text-xs shrink-0 ${selectedCustomer.isWalkIn ? 'bg-slate-300 text-slate-800' : 'bg-amber-500 text-slate-950'
                    }`}>
                    {selectedCustomer.isWalkIn ? <User className="w-3.5 h-3.5" /> : selectedCustomer.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0 flex items-center gap-2">
                    <span className="font-extrabold text-slate-900 text-xs truncate">
                      {selectedCustomer.name}
                    </span>
                    <span className="text-[10px] text-slate-500 font-mono truncate">
                      {selectedCustomer.mobile_no || 'Counter Sale'} {selectedCustomer.city ? `(${selectedCustomer.city})` : ''}
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleResetCustomer}
                  className="px-2 py-0.5 rounded-lg bg-white border border-slate-200 text-slate-700 text-[11px] font-semibold flex items-center gap-1 hover:bg-slate-100 cursor-pointer shrink-0"
                  title="Change customer party"
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
                    ref={customerInputRef}
                    type="text"
                    value={clientSearchQuery}
                    onChange={(e) => {
                      setClientSearchQuery(e.target.value);
                      setIsClientDropdownOpen(true);
                      setHighlightedCustomerIndex(0);
                    }}
                    onFocus={(e) => {
                      e.target.select();
                      setIsClientDropdownOpen(true);
                    }}
                    onKeyDown={handleCustomerKeyDown}
                    placeholder="Search party by name, firm, mobile (or counter cash)..."
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-8 py-1.5 text-xs text-slate-900 font-medium placeholder-slate-400 focus:outline-none focus:border-amber-500 focus:bg-white focus:ring-1 focus:ring-amber-500/20"
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
                  <div
                    ref={customerDropdownListRef}
                    className="absolute left-0 right-0 top-full mt-1 z-50 bg-white border border-slate-200 rounded-2xl shadow-xl max-h-56 overflow-y-auto p-1.5 space-y-0.5 animate-in fade-in"
                  >
                    {selectableCustomerOptions.map((opt, idx) => {
                      const isHighlighted = idx === highlightedCustomerIndex;
                      return (
                        <button
                          key={opt.id || idx}
                          ref={(el) => (customerItemRefs.current[idx] = el)}
                          type="button"
                          onClick={() => handleSelectCustomer(opt)}
                          onMouseEnter={() => setHighlightedCustomerIndex(idx)}
                          className={`w-full flex items-center justify-between p-2 rounded-xl text-left transition-colors cursor-pointer ${isHighlighted
                              ? 'bg-amber-100 text-amber-950 font-bold border border-amber-300 ring-1 ring-amber-400/30'
                              : 'hover:bg-slate-50 text-slate-800'
                            }`}
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <div className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs shrink-0 ${opt.isWalkIn ? 'bg-slate-100 text-slate-600' : 'bg-amber-500/20 text-amber-800'
                              }`}>
                              {opt.isWalkIn ? <User className="w-3.5 h-3.5" /> : opt.name.charAt(0).toUpperCase()}
                            </div>
                            <div className="min-w-0">
                              <span className={`text-xs block truncate ${isHighlighted ? 'font-black text-amber-950' : 'font-extrabold text-slate-900'}`}>
                                {opt.name}
                              </span>
                              <span className="text-[10px] text-slate-500 font-mono truncate block">
                                {opt.subtitle}
                              </span>
                            </div>
                          </div>
                          {opt.badge ? (
                            <span className="text-[10px] font-bold text-slate-500 px-2 py-0.5 rounded bg-slate-100 shrink-0 ml-2">
                              {opt.badge}
                            </span>
                          ) : (
                            <span className="text-[10px] font-bold text-amber-700 shrink-0 ml-2">
                              Select &rarr;
                            </span>
                          )}
                        </button>
                      );
                    })}

                    {selectableCustomerOptions.length === 0 && (
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

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsAddProductModalOpen(true)}
                data-add-new-btn="true"
                className="px-2.5 py-1 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs flex items-center gap-1 shadow-2xs cursor-pointer transition-colors"
                title="Open Add Product popup (Alt+N or F2)"
              >
                <Plus className="w-3.5 h-3.5 stroke-[3]" />
                <span>+ Add Product</span>
                <kbd className="hidden sm:inline-block px-1 text-[10px] font-mono bg-amber-600/30 text-slate-950 rounded">Alt+N</kbd>
              </button>

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
                          min="0.001"
                          step="any"
                          value={quantity}
                          onFocus={(e) => e.target.select()}
                          onChange={(e) => updateRowQuantity(itemId, e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              e.stopPropagation();
                              const discInput = e.target.closest('tr')?.querySelector('input[title="Discount percentage"]');
                              discInput?.focus();
                              discInput?.select();
                            }
                          }}
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
                              step="any"
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
                        Open the Add Product popup (F2) to add items.
                      </p>
                      <button
                        type="button"
                        onClick={() => setIsAddProductModalOpen(true)}
                        className="mt-3 px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs inline-flex items-center gap-1.5 shadow-xs cursor-pointer transition-colors"
                      >
                        <Plus className="w-3.5 h-3.5 stroke-[3]" />
                        <span>Add Product Popup (F2)</span>
                      </button>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
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
                    className={`flex flex-col items-center justify-center p-1.5 rounded-xl border text-[10px] font-bold transition-all cursor-pointer ${isSelected
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
            ref={completeSaleButtonRef}
            type="button"
            onClick={handleCheckout}
            disabled={cart.length === 0 || isProcessingSale}
            className={`complete-sale-btn w-full py-2.5 sm:py-3 rounded-xl font-black text-xs tracking-wide transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer shrink-0 mt-auto focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2 ${cart.length === 0 || isProcessingSale
                ? 'bg-slate-200 text-slate-400 cursor-not-allowed border border-slate-200 shadow-none'
                : 'bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 text-slate-950 shadow-amber-500/25 ring-1 ring-amber-300/60 transform hover:-translate-y-0.5 active:translate-y-0'
              }`}
          >
            {isProcessingSale ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin text-slate-950" />
                <span>{editingSale ? 'Updating Bill...' : 'Generating Wholesale Bill...'}</span>
              </>
            ) : editingSale ? (
              <>
                <Receipt className="w-4 h-4 stroke-[2.5]" />
                <span>Update Bill #{editingSale.invoice_no} (Enter) &bull; {currency}{grandTotal.toFixed(2)}</span>
              </>
            ) : (
              <>
                <Receipt className="w-4 h-4 stroke-[2.5]" />
                <span>Complete Sale (Enter) &bull; {currency}{grandTotal.toFixed(2)}</span>
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
                  ref={(el) => (quickCustomerInputRefs.current[0] = el)}
                  type="text"
                  required
                  placeholder="e.g. Metro Traders / Ramesh Kumar"
                  value={newCustomer.name}
                  onFocus={(e) => e.target.select()}
                  onChange={(e) => setNewCustomer({ ...newCustomer, name: e.target.value })}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      quickCustomerInputRefs.current[1]?.focus();
                      quickCustomerInputRefs.current[1]?.select();
                    }
                  }}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 focus:outline-none focus:border-amber-500 focus:bg-white"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-bold text-slate-700 block mb-1">
                    Mobile Number
                  </label>
                  <input
                    ref={(el) => (quickCustomerInputRefs.current[1] = el)}
                    type="tel"
                    placeholder="e.g. 9876543210"
                    value={newCustomer.mobile_no}
                    onFocus={(e) => e.target.select()}
                    onChange={(e) => setNewCustomer({ ...newCustomer, mobile_no: e.target.value })}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        quickCustomerInputRefs.current[2]?.focus();
                        quickCustomerInputRefs.current[2]?.select();
                      }
                    }}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 focus:outline-none focus:border-amber-500 focus:bg-white"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-700 block mb-1">
                    City / Town
                  </label>
                  <input
                    ref={(el) => (quickCustomerInputRefs.current[2] = el)}
                    type="text"
                    placeholder="e.g. Mumbai / Pune"
                    value={newCustomer.city}
                    onFocus={(e) => e.target.select()}
                    onChange={(e) => setNewCustomer({ ...newCustomer, city: e.target.value })}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        quickCustomerInputRefs.current[3]?.focus();
                        quickCustomerInputRefs.current[3]?.select();
                      }
                    }}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 focus:outline-none focus:border-amber-500 focus:bg-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-bold text-slate-700 block mb-1">
                    Email Address (Optional)
                  </label>
                  <input
                    ref={(el) => (quickCustomerInputRefs.current[3] = el)}
                    type="email"
                    placeholder="contact@business.com"
                    value={newCustomer.email}
                    onFocus={(e) => e.target.select()}
                    onChange={(e) => setNewCustomer({ ...newCustomer, email: e.target.value })}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        quickCustomerInputRefs.current[4]?.focus();
                        quickCustomerInputRefs.current[4]?.select();
                      }
                    }}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 focus:outline-none focus:border-amber-500 focus:bg-white"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-700 block mb-1">
                    Opening Balance ({currency})
                  </label>
                  <input
                    ref={(el) => (quickCustomerInputRefs.current[4] = el)}
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={newCustomer.opening_balance}
                    onFocus={(e) => e.target.select()}
                    onChange={(e) => setNewCustomer({ ...newCustomer, opening_balance: e.target.value })}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        quickCustomerInputRefs.current[5]?.focus();
                        quickCustomerInputRefs.current[5]?.select();
                      }
                    }}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 font-mono focus:outline-none focus:border-amber-500 focus:bg-white"
                  />
                </div>
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-700 block mb-1">
                  Street Address
                </label>
                <input
                  ref={(el) => (quickCustomerInputRefs.current[5] = el)}
                  type="text"
                  placeholder="Market road, shop number, area..."
                  value={newCustomer.address}
                  onFocus={(e) => e.target.select()}
                  onChange={(e) => setNewCustomer({ ...newCustomer, address: e.target.value })}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleCreateQuickCustomer(e);
                    }
                  }}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 focus:outline-none focus:border-amber-500 focus:bg-white"
                />
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

      {/* 4. ADD PRODUCT POPUP MODAL (REMAINS OPEN UNTIL USER CLOSES, SHOWS BACKGROUND BILL LISTING) */}
      {isAddProductModalOpen && (
        <div
          className="fixed inset-0 z-50 bg-slate-950/40 backdrop-blur-[1.5px] flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-in fade-in duration-150"
          onClick={handleCloseAddProductModal}
        >
          <div
            className="bg-white border border-slate-200 rounded-3xl max-w-xl w-full p-4 sm:p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-150 relative text-left"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-9 h-9 rounded-2xl bg-amber-500 text-slate-950 font-black flex items-center justify-center text-sm shadow-2xs shrink-0">
                  <Package className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <h3 className="font-black text-slate-900 text-sm sm:text-base leading-tight">
                    Add Product to Bill
                  </h3>
                  <p className="text-[11px] text-slate-500 font-medium truncate">
                    {selectedCustomer ? (
                      <>Party: <span className="font-bold text-amber-800">{selectedCustomer.name}</span></>
                    ) : (
                      'Direct bill entry'
                    )} • <span className="font-mono font-bold text-slate-700">{cart.length} lines in bill ({currency}{grandTotal.toFixed(2)})</span>
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                <span className="hidden sm:inline-block text-[10px] font-mono text-slate-400 bg-slate-100 px-2 py-0.5 rounded-md">
                  Esc to close & complete
                </span>
                <button
                  type="button"
                  onClick={handleCloseAddProductModal}
                  className="w-8 h-8 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 flex items-center justify-center cursor-pointer transition-colors"
                  title="Close popup (Esc)"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Success Feedback banner if product was just added */}
            {popupFeedbackMsg && (
              <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center justify-between animate-in fade-in">
                <span>✓ {popupFeedbackMsg}</span>
                <span className="text-[10px] text-emerald-600 font-mono">Added to bill in background</span>
              </div>
            )}

            {/* Form Fields: Product Select, Price (disabled), Qty, Discount % */}
            <form onSubmit={handleAddProductFromPopup} className="space-y-4">

              {/* Field 1: Product Select */}
              <div className="relative" ref={popupDropdownRef}>
                <label className="text-xs font-bold text-slate-700 mb-1 flex items-center justify-between">
                  <span>Product <span className="text-rose-500">*</span></span>
                  <span className="text-[10px] text-slate-400 font-mono">Type & use ↑ / ↓ & Enter</span>
                </label>

                <div className="relative">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    ref={popupProductSearchInputRef}
                    type="text"
                    value={popupProductSearchQuery}
                    onChange={(e) => {
                      setPopupProductSearchQuery(e.target.value);
                      setIsPopupProductDropdownOpen(true);
                      setPopupHighlightedProductIndex(0);
                    }}
                    onFocus={(e) => {
                      e.target.select();
                      setIsPopupProductDropdownOpen(true);
                    }}
                    onKeyDown={handlePopupProductKeyDown}
                    placeholder="Search product by name, SKU, code, category..."
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-9 py-2 text-xs font-semibold text-slate-900 placeholder-slate-400 focus:outline-none focus:border-amber-500 focus:bg-white focus:ring-1 focus:ring-amber-500/20"
                  />
                  {popupProductSearchQuery && (
                    <button
                      type="button"
                      onClick={() => {
                        setPopupProductSearchQuery('');
                        setPopupSelectedProduct(null);
                        setIsPopupProductDropdownOpen(true);
                        popupProductSearchInputRef.current?.focus();
                      }}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {/* Dropdown Results */}
                {isPopupProductDropdownOpen && (
                  <div className="absolute left-0 right-0 top-full mt-1.5 z-50 bg-white border border-slate-200 rounded-2xl shadow-2xl max-h-56 overflow-y-auto p-1.5 space-y-0.5 animate-in fade-in">
                    {popupFilteredProducts.map((p, idx) => {
                      const isHighlighted = idx === popupHighlightedProductIndex;
                      const pPrice = Number(p.price ?? p.rate ?? p.unit_price ?? 0);
                      return (
                        <div
                          key={p.id}
                          ref={(el) => (popupItemRefs.current[idx] = el)}
                          onClick={() => handlePopupSelectProduct(p)}
                          onMouseEnter={() => setPopupHighlightedProductIndex(idx)}
                          className={`w-full flex items-center justify-between p-2 rounded-xl text-left transition-colors cursor-pointer ${isHighlighted
                              ? 'bg-amber-100 text-amber-950 font-bold border border-amber-300 ring-1 ring-amber-400/40'
                              : 'hover:bg-slate-50 text-slate-800'
                            }`}
                        >
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className={`text-xs truncate ${isHighlighted ? 'font-black text-amber-950' : 'font-bold text-slate-900'}`}>
                                {p.name}
                              </span>
                              {(p.short_name || p.sku || p.code) && (
                                <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-slate-100 text-slate-600 border border-slate-200">
                                  {p.short_name || p.sku || p.code}
                                </span>
                              )}
                              {p.category && (
                                <span className="text-[10px] text-slate-500 bg-amber-50 text-amber-800 px-1.5 rounded">
                                  {p.category}
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] text-slate-500 font-mono mt-0.5 flex items-center gap-2">
                              <span>Stock: {p.stock_quantity ?? 0} {p.unit || 'Pcs'}</span>
                              <span>&bull;</span>
                              <span className="font-bold text-slate-700">{currency}{pPrice.toFixed(2)}</span>
                            </div>
                          </div>
                          <span className="text-[11px] font-mono font-black text-amber-800 shrink-0 ml-2">
                            {currency}{pPrice.toFixed(2)}
                          </span>
                        </div>
                      );
                    })}

                    {popupFilteredProducts.length === 0 && (
                      <div className="p-4 text-center text-xs text-slate-400">
                        No product matches "{popupProductSearchQuery}"
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* 3 Columns: Price (disabled & auto fetch), Qty, Discount % */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">

                {/* Field 2: Price (disabled & auto fetch) */}
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    Price / Rate <span className="text-[10px] font-normal text-slate-400 font-mono">(Auto Fetch)</span>
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400 font-mono">
                      {currency}
                    </span>
                    <input
                      type="text"
                      disabled
                      readOnly
                      value={popupSelectedProduct ? Number(popupSelectedProduct.price ?? popupSelectedProduct.rate ?? popupSelectedProduct.unit_price ?? 0).toFixed(2) : '0.00'}
                      placeholder="0.00"
                      className="w-full bg-slate-100 border border-slate-200 rounded-xl pl-7 pr-3 py-2 text-xs font-mono font-bold text-slate-700 cursor-not-allowed select-none"
                      title="Rate auto fetched from selected product (disabled)"
                    />
                  </div>
                </div>

                {/* Field 3: Qty */}
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    Quantity <span className="text-rose-500">*</span>
                  </label>
                  <input
                    ref={popupQtyInputRef}
                    type="number"
                    min="0.001"
                    step="any"
                    required
                    value={popupQty}
                    onFocus={(e) => e.target.select()}
                    onChange={(e) => setPopupQty(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        e.stopPropagation();
                        popupDiscountInputRef.current?.focus();
                        popupDiscountInputRef.current?.select();
                      } else if (e.key === 'Escape') {
                        e.preventDefault();
                        e.stopPropagation();
                        handleCloseAddProductModal();
                      }
                    }}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono font-black text-slate-900 focus:outline-none focus:border-amber-500 focus:bg-white focus:ring-1 focus:ring-amber-500/20"
                    placeholder="1"
                    title="Enter quantity (Press Enter to move to Discount %)"
                  />
                </div>

                {/* Field 4: Discount % */}
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    Discount % <span className="text-[10px] font-normal text-slate-400 font-mono">(Optional)</span>
                  </label>
                  <div className="relative">
                    <input
                      ref={popupDiscountInputRef}
                      type="number"
                      min="0"
                      max="100"
                      step="any"
                      value={popupDiscountPercent}
                      onFocus={(e) => e.target.select()}
                      onChange={(e) => setPopupDiscountPercent(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          e.stopPropagation();
                          handleAddProductFromPopup(e);
                        } else if (e.key === 'Escape') {
                          e.preventDefault();
                          e.stopPropagation();
                          handleCloseAddProductModal();
                        }
                      }}
                      placeholder="0"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-3 pr-7 py-2 text-xs font-mono font-bold text-slate-900 focus:outline-none focus:border-amber-500 focus:bg-white focus:ring-1 focus:ring-amber-500/20"
                      title="Enter discount percentage (Press Enter to add to bill)"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-amber-700 font-mono">
                      %
                    </span>
                  </div>
                </div>

              </div>

              {/* Line Amount Preview Bar */}
              <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-between text-xs">
                <div className="space-y-0.5">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
                    Calculated Line Total
                  </span>
                  <div className="text-[11px] text-slate-600 font-mono">
                    Gross: {currency}{popupGross.toFixed(2)}
                    {popupDiscAmt > 0 && (
                      <span className="text-amber-700 font-bold ml-1.5">
                        &bull; Disc: -{currency}{popupDiscAmt.toFixed(2)} ({popupDiscNum}%)
                      </span>
                    )}
                  </div>
                </div>
                <div className="text-right">
                  <span className="font-mono text-base font-black text-slate-900">
                    {currency}{popupLineTotal.toFixed(2)}
                  </span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={handleCloseAddProductModal}
                  className="px-4 py-2 rounded-xl text-slate-600 hover:text-slate-800 text-xs font-bold hover:bg-slate-100 cursor-pointer transition-colors"
                >
                  Close & Complete Bill (Esc)
                </button>

                <div className="flex items-center gap-2">
                  <button
                    type="submit"
                    disabled={!popupSelectedProduct}
                    className={`px-5 py-2.5 rounded-xl font-black text-xs flex items-center gap-1.5 shadow-md transition-all cursor-pointer ${popupSelectedProduct
                        ? 'bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-amber-500/20 ring-1 ring-amber-300'
                        : 'bg-slate-200 text-slate-400 cursor-not-allowed shadow-none'
                      }`}
                  >
                    <Plus className="w-4 h-4 stroke-[3]" />
                    <span>Add to Bill & Continue (Enter)</span>
                  </button>
                </div>
              </div>

            </form>
          </div>
        </div>
      )}

    </div>
  );
}
