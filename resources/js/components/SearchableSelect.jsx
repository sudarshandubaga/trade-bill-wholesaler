import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Search, ChevronDown, X, Check } from 'lucide-react';

/**
 * Premium Searchable Select Dropdown Component for TradeBill ERP
 * 
 * Supports dynamic objects with valueKey/labelKey/sublabelKey/badgeKey or simple option arrays.
 * Supports theme="light" | "dark" for seamless integration into light dialogs or dark consoles.
 */
export default function SearchableSelect({
  options = [],
  value = '',
  onChange,
  placeholder = 'Select an option...',
  searchPlaceholder = 'Type to search...',
  valueKey = 'value',
  labelKey = 'label',
  sublabelKey = 'sublabel',
  badgeKey = 'badge',
  disabled = false,
  required = false,
  allowClear = false,
  className = '',
  dropdownClassName = '',
  size = 'md', // 'sm' or 'md'
  theme = 'light', // 'light' or 'dark'
  direction = 'down', // 'down' or 'up'
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const containerRef = useRef(null);
  const searchInputRef = useRef(null);

  const isLight = theme === 'light';

  // Normalize options into a standard shape
  const normalizedOptions = useMemo(() => {
    if (!Array.isArray(options)) return [];
    return options.map((opt) => {
      if (opt === null || opt === undefined) return null;
      if (typeof opt === 'string' || typeof opt === 'number') {
        return {
          value: opt,
          label: String(opt),
          sublabel: '',
          badge: '',
          raw: opt,
        };
      }
      return {
        ...opt,
        value: opt[valueKey] !== undefined ? opt[valueKey] : opt.id,
        label: opt[labelKey] !== undefined ? opt[labelKey] : (opt.name || opt.title || String(opt.value || '')),
        sublabel: opt[sublabelKey] || opt.phone || opt.mobile_no || opt.email || opt.sku || opt.code || '',
        badge: opt[badgeKey] || (opt.role ? opt.role : '') || (opt.current_balance !== undefined ? `Bal: ₹${opt.current_balance}` : ''),
        raw: opt.raw || opt,
      };
    }).filter(Boolean);
  }, [options, valueKey, labelKey, sublabelKey, badgeKey]);

  // Find currently selected option
  const selectedOption = useMemo(() => {
    if (value === '' || value === null || value === undefined) return null;
    return normalizedOptions.find((opt) => String(opt.value) === String(value)) || null;
  }, [normalizedOptions, value]);

  // Filter options based on search query
  const filteredOptions = useMemo(() => {
    if (!searchQuery.trim()) return normalizedOptions;
    const q = searchQuery.toLowerCase().trim();
    return normalizedOptions.filter((opt) => {
      const matchLabel = String(opt.label || '').toLowerCase().includes(q);
      const matchSub = String(opt.sublabel || '').toLowerCase().includes(q);
      const matchBadge = String(opt.badge || '').toLowerCase().includes(q);
      const matchVal = String(opt.value || '').toLowerCase().includes(q);
      return matchLabel || matchSub || matchBadge || matchVal;
    });
  }, [normalizedOptions, searchQuery]);

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
        setSearchQuery('');
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Autofocus input when opened
  useEffect(() => {
    if (isOpen && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [isOpen]);

  const handleSelect = (opt) => {
    if (onChange) {
      onChange(opt ? opt.value : '', opt ? (opt.raw?.raw || opt.raw) : null);
    }
    setIsOpen(false);
    setSearchQuery('');
  };

  const handleClear = (e) => {
    e.stopPropagation();
    if (onChange) {
      onChange('', null);
    }
  };

  const handleKeyDown = (e) => {
    if (disabled) return;
    if (e.key === 'Escape') {
      setIsOpen(false);
      setSearchQuery('');
    } else if (e.key === 'Enter') {
      if (isOpen && filteredOptions.length > 0) {
        e.preventDefault();
        handleSelect(filteredOptions[0]);
      }
    }
  };

  const isSmall = size === 'sm';

  // Base styling depending on theme
  const triggerThemeStyles = isLight
    ? `bg-slate-50 border-slate-200 text-slate-800 hover:border-slate-300 ${isOpen ? 'border-amber-500 ring-1 ring-amber-500/20 bg-white' : ''}`
    : `bg-slate-900 border-slate-700/80 text-white hover:border-slate-600 ${isOpen ? 'border-amber-500 ring-1 ring-amber-500/30' : ''}`;

  const dropdownThemeStyles = isLight
    ? 'bg-white border-slate-200 text-slate-800 shadow-xl'
    : 'bg-slate-900 border-slate-700/90 text-white shadow-2xl';

  const searchBoxThemeStyles = isLight
    ? 'border-slate-100 bg-slate-50/80'
    : 'border-slate-800 bg-slate-950/60';

  const inputThemeStyles = isLight
    ? 'text-slate-800 placeholder-slate-400'
    : 'text-white placeholder-slate-500';

  return (
    <div
      ref={containerRef}
      onKeyDown={handleKeyDown}
      className={`relative inline-block w-full text-left font-sans ${disabled ? 'opacity-60 cursor-not-allowed' : ''}`}
    >
      {/* Hidden input to support standard HTML form validation if required */}
      {required && (
        <input
          tabIndex={-1}
          autoComplete="off"
          style={{ opacity: 0, width: 0, height: 0, position: 'absolute', pointerEvents: 'none' }}
          value={value || ''}
          onChange={() => {}}
          required={required}
        />
      )}

      {/* Select Trigger Box */}
      <div
        role="button"
        tabIndex={disabled ? -1 : 0}
        onClick={() => !disabled && setIsOpen(!isOpen)}
        className={`w-full flex items-center justify-between gap-2 border transition-all cursor-pointer select-none rounded-xl ${triggerThemeStyles} ${
          isSmall ? 'px-2.5 py-1.5 text-xs' : 'px-3 py-2 text-xs'
        } ${className}`}
      >
        <div className="flex items-center gap-2 min-w-0 flex-1 truncate">
          {selectedOption ? (
            <div className="flex items-center gap-1.5 min-w-0 truncate">
              <span className={`font-semibold truncate ${isLight ? 'text-slate-900' : 'text-slate-100'}`}>
                {selectedOption.label}
              </span>
              {selectedOption.badge && (
                <span className={`text-[10px] px-1.5 py-0.2 rounded font-medium whitespace-nowrap ${
                  isLight
                    ? 'bg-amber-100 text-amber-800 border border-amber-200'
                    : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                }`}>
                  {selectedOption.badge}
                </span>
              )}
            </div>
          ) : (
            <span className={`${isLight ? 'text-slate-400' : 'text-slate-400'} truncate`}>
              {placeholder}
            </span>
          )}
        </div>

        <div className="flex items-center gap-1 shrink-0 text-slate-400">
          {allowClear && selectedOption && !disabled && (
            <button
              type="button"
              onClick={handleClear}
              className={`p-0.5 rounded transition ${isLight ? 'hover:text-slate-700 hover:bg-slate-200' : 'hover:text-white hover:bg-slate-800'}`}
              title="Clear selection"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
          <ChevronDown
            className={`w-3.5 h-3.5 transition-transform duration-200 ${isOpen ? 'rotate-180 text-amber-500' : ''}`}
          />
        </div>
      </div>

      {/* Dropdown Menu Overlay */}
      {isOpen && (
        <div
          className={`absolute z-50 left-0 right-0 ${direction === 'up' ? 'bottom-full mb-1' : 'top-full mt-1'} border rounded-xl overflow-hidden backdrop-blur-md animate-in fade-in zoom-in-95 duration-100 ${dropdownThemeStyles} ${dropdownClassName}`}
        >
          {/* Search Box */}
          <div className={`p-2 border-b flex items-center gap-2 ${searchBoxThemeStyles}`}>
            <Search className="w-3.5 h-3.5 text-slate-400 shrink-0 ml-1" />
            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onFocus={(e) => e.target.select()}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={searchPlaceholder}
              className={`w-full bg-transparent text-xs focus:outline-none ${inputThemeStyles}`}
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="text-slate-400 hover:text-slate-600 p-0.5 rounded transition"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>

          {/* Options List */}
          <div className={`max-h-56 overflow-y-auto py-1 divide-y ${isLight ? 'divide-slate-100' : 'divide-slate-800/40'}`}>
            {allowClear && (
              <div
                onClick={() => handleSelect(null)}
                className={`px-3 py-1.5 text-xs italic cursor-pointer transition flex items-center justify-between ${
                  isLight ? 'text-slate-400 hover:bg-slate-50 hover:text-slate-700' : 'text-slate-400 hover:bg-slate-800/60 hover:text-white'
                }`}
              >
                <span>-- Clear selection --</span>
              </div>
            )}

            {filteredOptions.length === 0 ? (
              <div className="py-4 text-center text-xs text-slate-400">
                No matching options found
              </div>
            ) : (
              filteredOptions.map((opt) => {
                const isSelected = selectedOption && String(selectedOption.value) === String(opt.value);
                const optSelectedClasses = isSelected
                  ? isLight
                    ? 'bg-amber-50 text-amber-900 font-semibold'
                    : 'bg-amber-500/15 text-amber-300 font-semibold'
                  : isLight
                    ? 'text-slate-700 hover:bg-amber-50/70 hover:text-amber-950'
                    : 'text-slate-200 hover:bg-slate-800/80 hover:text-white';

                return (
                  <div
                    key={String(opt.value)}
                    onClick={() => handleSelect(opt)}
                    className={`px-3 py-2 text-xs cursor-pointer transition flex items-center justify-between gap-2 ${optSelectedClasses}`}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="truncate flex items-center gap-1.5">
                        <span className="truncate">{opt.label}</span>
                        {opt.badge && (
                          <span className={`text-[10px] px-1.5 py-0.2 rounded font-normal whitespace-nowrap ${
                            isLight ? 'bg-slate-100 text-slate-600 border border-slate-200' : 'bg-slate-800 text-slate-400 border border-slate-700/60'
                          }`}>
                            {opt.badge}
                          </span>
                        )}
                      </div>
                      {opt.sublabel && (
                        <div className={`text-[11px] truncate mt-0.5 ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                          {opt.sublabel}
                        </div>
                      )}
                    </div>
                    {isSelected && (
                      <Check className="w-3.5 h-3.5 text-amber-500 shrink-0 ml-1" />
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
