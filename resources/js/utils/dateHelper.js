/**
 * Universal Date Formatting Utilities for TradeBill ERP
 * Enforces DD/MM/YYYY formatting across the entire application and prints.
 */

/**
 * Formats any date input (string, Date, timestamp) to DD/MM/YYYY
 * e.g., "2026-10-31T17:51:26.000Z" -> "31/10/2026"
 * e.g., "2026-10-31" -> "31/10/2026"
 */
export function formatDateDMY(dateInput) {
  if (!dateInput) return '—';
  
  // If already in DD/MM/YYYY format
  if (typeof dateInput === 'string' && /^\d{2}\/\d{2}\/\d{4}$/.test(dateInput.trim())) {
    return dateInput.trim();
  }

  // Handle standard YYYY-MM-DD string without timezone skew
  if (typeof dateInput === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dateInput.trim())) {
    const [year, month, day] = dateInput.trim().split('-');
    return `${day}/${month}/${year}`;
  }

  const d = new Date(dateInput);
  if (isNaN(d.getTime())) {
    return String(dateInput);
  }

  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();

  return `${day}/${month}/${year}`;
}

/**
 * Returns today's date formatted as DD/MM/YYYY
 */
export function getTodayDMY() {
  return formatDateDMY(new Date());
}

