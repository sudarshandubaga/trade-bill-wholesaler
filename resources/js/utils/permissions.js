/**
 * Robust Client-Side Permission Checking Helper for TradeBill ERP
 */

export const hasPermission = (user, requiredPerm) => {
  if (!user) return false;

  // 1. Super Admin has unrestricted access to everything
  if (user.role === 'super_admin' || user.role === 'admin') {
    return true;
  }

  // 2. Extract effective permissions
  const perms = Array.isArray(user.effective_permissions) && user.effective_permissions.length > 0
    ? user.effective_permissions
    : (Array.isArray(user.permissions) ? user.permissions : []);

  if (perms.includes('*')) {
    return true;
  }

  // Fallback defaults based on role if permissions array is somehow empty
  let activePerms = [...perms];
  if (activePerms.length === 0) {
    if (user.role === 'branch_manager') {
      activePerms = [
        'pos', 'customers', 'suppliers', 'brands', 'hsn', 'categories',
        'items', 'barcode_print', 'challan', 'vouchers', 'credit_debit_note',
        'purchase', 'reports', 'stock_dump',
      ];
    } else if (user.role === 'saleperson') {
      activePerms = ['pos', 'customers', 'barcode_print', 'daybook', 'sale_reports'];
    } else {
      activePerms = ['pos'];
    }
  }

  // 3. Handle Array of required permissions (allow if ANY match)
  if (Array.isArray(requiredPerm)) {
    return requiredPerm.some((p) => hasPermission(user, p));
  }

  if (!requiredPerm || requiredPerm === 'all' || requiredPerm === 'dashboard') {
    return true;
  }

  // 4. Exact match
  if (activePerms.includes(requiredPerm)) {
    return true;
  }

  // 5. Alias mapping
  const aliases = {
    purchases: 'purchase',
    purchase: 'purchases',
    challans: 'challan',
    challan: 'challans',
    vouchers: 'voucher',
    voucher: 'vouchers',
    receipt_vouchers: 'vouchers',
    payment_vouchers: 'vouchers',
    payment_reminders: ['vouchers', 'customers', 'pos'],
    notes: 'credit_debit_note',
    credit_debit_note: 'notes',
    credit_notes: 'credit_debit_note',
    debit_notes: 'credit_debit_note',
    stock_in: ['items', 'challan'],
    stock_out: ['items', 'challan'],
    stock_transfer: ['items', 'challan'],
    inventory: ['items', 'challan'],
    adjustments: 'stock_dump',
    stock_dump: 'adjustments',
    items: 'item',
    item: 'items',
    sales_history: ['reports', 'sale_reports', 'pos'],
    daybook: ['reports', 'daybook', 'sale_reports'],
    cashbook: ['reports'],
    ledger: ['reports', 'customers', 'suppliers'],
    reports: ['sale_reports', 'daybook'],
  };

  const aliasVal = aliases[requiredPerm];
  if (aliasVal) {
    if (Array.isArray(aliasVal)) {
      if (aliasVal.some((a) => activePerms.includes(a))) return true;
    } else if (activePerms.includes(aliasVal)) {
      return true;
    }
  }

  return false;
};
