import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Search, ChevronDown, Check, Plus, X, Building2, Package, Barcode } from 'lucide-react';

/**
 * Normalizes Arabic text for flexible matching (همزات، تاء مربوطة، ي/ى، تشكيل)
 */
export function normalizeArabic(text) {
  if (!text) return '';
  return String(text)
    .toLowerCase()
    .replace(/[أإآٱ]/g, 'ا')
    .replace(/[ى]/g, 'ي')
    .replace(/[ة]/g, 'ه')
    .replace(/[\u064B-\u065F]/g, '') // remove diacritics / tashkeel
    .trim();
}

/**
 * SearchableCombobox
 * High-performance, keyboard-first dropdown component with real-time fuzzy Arabic filtering.
 * Supports: ArrowUp/Down navigation, Enter selection, Escape dismiss, auto-scrolling,
 * custom item rendering, and on-the-fly item creation.
 */
export default function SearchableCombobox({
  options = [],
  value = '',
  onChange,
  onSelectOption,
  placeholder = 'ابحث بالكتابة أو مسح الباركود...',
  searchKeys = ['name'],
  renderOption,
  renderSelected,
  onAddNew,
  addNewLabel = '+ إضافة جديد باسم',
  disabled = false,
  autoFocus = false,
  className = '',
  inputClassName = '',
  dropdownClassName = '',
  noResultsText = 'لا توجد نتائج مطابقة',
  allowCustomInput = false,
  onKeyDownCustom,
  id,
  name,
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [highlightedIndex, setHighlightedIndex] = useState(0);

  const containerRef = useRef(null);
  const inputRef = useRef(null);
  const listRef = useRef(null);

  // Find currently selected option
  const selectedOption = useMemo(() => {
    if (!value && value !== 0) return null;
    return options.find((opt) => String(opt.id) === String(value) || String(opt.value) === String(value));
  }, [options, value]);

  // Sync display text with selected option when not actively typing/open
  useEffect(() => {
    if (!isOpen) {
      if (selectedOption) {
        setQuery(selectedOption.name || selectedOption.label || selectedOption.title || '');
      } else if (!allowCustomInput) {
        setQuery('');
      }
    }
  }, [selectedOption, isOpen, allowCustomInput]);

  // Autofocus if requested
  useEffect(() => {
    if (autoFocus && inputRef.current) {
      const timer = setTimeout(() => {
        inputRef.current?.focus();
      }, 80);
      return () => clearTimeout(timer);
    }
  }, [autoFocus]);

  // Close on outside click
  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
        // Reset query to selected option label if closed without selecting
        if (selectedOption) {
          setQuery(selectedOption.name || selectedOption.label || '');
        } else if (!allowCustomInput) {
          setQuery('');
        }
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleOutsideClick);
      document.addEventListener('touchstart', handleOutsideClick);
    }
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      document.removeEventListener('touchstart', handleOutsideClick);
    };
  }, [isOpen, selectedOption, allowCustomInput]);

  // Filter options based on normalized query
  const filteredOptions = useMemo(() => {
    const normQ = normalizeArabic(query);
    if (!normQ) return options;

    return options.filter((opt) => {
      return searchKeys.some((key) => {
        const val = opt[key];
        if (!val) return false;
        return normalizeArabic(val).includes(normQ);
      });
    });
  }, [options, query, searchKeys]);

  // Auto-reset highlighted index on filter changes
  useEffect(() => {
    setHighlightedIndex(0);
  }, [filteredOptions]);

  // Auto-scroll dropdown list to keep highlighted item in view
  useEffect(() => {
    if (isOpen && listRef.current) {
      const activeEl = listRef.current.children[highlightedIndex];
      if (activeEl) {
        activeEl.scrollIntoView({ block: 'nearest' });
      }
    }
  }, [highlightedIndex, isOpen]);

  const handleSelect = (option) => {
    if (!option) return;
    setIsOpen(false);
    setQuery(option.name || option.label || '');
    if (onChange) {
      onChange(option.id !== undefined ? option.id : option.value);
    }
    if (onSelectOption) {
      onSelectOption(option);
    }
  };

  const handleClear = (e) => {
    e.stopPropagation();
    setQuery('');
    setIsOpen(false);
    if (onChange) onChange('');
    if (onSelectOption) onSelectOption(null);
    inputRef.current?.focus();
  };

  const handleKeyDown = (e) => {
    if (onKeyDownCustom) {
      onKeyDownCustom(e);
      if (e.defaultPrevented) return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (!isOpen) {
        setIsOpen(true);
      } else {
        const max = onAddNew && query.trim() ? filteredOptions.length : filteredOptions.length - 1;
        setHighlightedIndex((prev) => (prev < max ? prev + 1 : 0));
      }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (!isOpen) {
        setIsOpen(true);
      } else {
        const max = onAddNew && query.trim() ? filteredOptions.length : filteredOptions.length - 1;
        setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : max));
      }
    } else if (e.key === 'Enter') {
      if (isOpen) {
        e.preventDefault();
        // If "Add New" index is highlighted
        if (onAddNew && highlightedIndex === filteredOptions.length && query.trim()) {
          onAddNew(query.trim());
          setIsOpen(false);
        } else if (filteredOptions[highlightedIndex]) {
          handleSelect(filteredOptions[highlightedIndex]);
        }
      } else {
        // Dropdown closed -> open it
        setIsOpen(true);
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setIsOpen(false);
      if (selectedOption) {
        setQuery(selectedOption.name || selectedOption.label || '');
      }
    } else if (e.key === 'Tab') {
      if (isOpen && filteredOptions[highlightedIndex]) {
        // Optionally select on tab
        handleSelect(filteredOptions[highlightedIndex]);
      }
      setIsOpen(false);
    }
  };

  const handleInputChange = (e) => {
    const val = e.target.value;
    setQuery(val);
    setIsOpen(true);
    if (allowCustomInput && onChange) {
      onChange(val);
    }
  };

  const showAddNewRow = onAddNew && query.trim() && !filteredOptions.some(
    (opt) => normalizeArabic(opt.name || opt.label) === normalizeArabic(query.trim())
  );

  return (
    <div ref={containerRef} className={`relative text-right ${className}`}>
      {/* Search Input Box */}
      <div className="relative flex items-center">
        <input
          ref={inputRef}
          id={id}
          name={name}
          type="text"
          value={query}
          disabled={disabled}
          placeholder={placeholder}
          onFocus={() => {
            setIsOpen(true);
            // Select text on focus for rapid re-typing
            inputRef.current?.select();
          }}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          autoComplete="off"
          className={`w-full min-h-[42px] pr-9 pl-9 rounded-xl bg-slate-950 border text-white text-xs font-bold transition focus:outline-none focus:ring-1 ${
            isOpen
              ? 'border-amber-400 focus:ring-amber-400/30'
              : selectedOption
              ? 'border-white/20'
              : 'border-white/10'
          } ${disabled ? 'opacity-50 cursor-not-allowed' : ''} ${inputClassName}`}
        />

        {/* Magnifier / Indicator Icon on the right (RTL start) */}
        <div className="absolute right-3 pointer-events-none text-slate-400 flex items-center">
          <Search className="w-3.5 h-3.5 text-slate-400" />
        </div>

        {/* Clear (X) or Dropdown Arrow on the left (RTL end) */}
        <div className="absolute left-2.5 flex items-center gap-1">
          {query && !disabled && (
            <button
              type="button"
              onClick={handleClear}
              className="p-1 rounded-md text-slate-400 hover:text-white hover:bg-white/10 transition"
              title="مسح التحديد"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
          <button
            type="button"
            tabIndex={-1}
            disabled={disabled}
            onClick={() => {
              if (!disabled) {
                setIsOpen((prev) => !prev);
                inputRef.current?.focus();
              }
            }}
            className="p-1 text-slate-400 hover:text-white transition"
          >
            <ChevronDown
              className={`w-3.5 h-3.5 transition-transform duration-150 ${isOpen ? 'rotate-180 text-amber-400' : ''}`}
            />
          </button>
        </div>
      </div>

      {/* Floating Dropdown List */}
      {isOpen && (
        <div
          ref={listRef}
          className={`absolute z-50 left-0 right-0 top-full mt-1.5 max-h-64 overflow-y-auto rounded-2xl bg-slate-900/98 border border-white/20 shadow-2xl backdrop-blur-2xl p-1.5 divide-y divide-white/5 animate-in fade-in zoom-in-95 duration-100 ${dropdownClassName}`}
        >
          {filteredOptions.length > 0 ? (
            filteredOptions.map((option, index) => {
              const isSelected = selectedOption && (String(selectedOption.id) === String(option.id));
              const isHighlighted = highlightedIndex === index;

              return (
                <div
                  key={option.id !== undefined ? option.id : index}
                  onClick={() => handleSelect(option)}
                  onMouseEnter={() => setHighlightedIndex(index)}
                  className={`p-2.5 rounded-xl cursor-pointer text-xs transition flex items-center justify-between gap-2 ${
                    isHighlighted
                      ? 'bg-amber-500/20 text-white font-bold border border-amber-500/30'
                      : isSelected
                      ? 'bg-white/5 text-amber-300 font-bold'
                      : 'text-slate-200 hover:bg-white/5'
                  }`}
                >
                  <div className="flex-1 min-w-0">
                    {renderOption ? (
                      renderOption(option, { isSelected, isHighlighted })
                    ) : (
                      <div className="flex items-center justify-between">
                        <span className="truncate">{option.name || option.label}</span>
                        {option.secondary && (
                          <span className="text-[11px] text-slate-400 font-mono mr-2">{option.secondary}</span>
                        )}
                      </div>
                    )}
                  </div>
                  {isSelected && <Check className="w-4 h-4 text-amber-400 shrink-0" />}
                </div>
              );
            })
          ) : (
            <div className="p-3 text-center text-slate-400 text-xs">
              <p>{noResultsText}</p>
            </div>
          )}

          {/* Add New on the fly button */}
          {showAddNewRow && (
            <div
              onClick={() => {
                onAddNew(query.trim());
                setIsOpen(false);
              }}
              onMouseEnter={() => setHighlightedIndex(filteredOptions.length)}
              className={`p-2.5 rounded-xl cursor-pointer text-xs transition flex items-center gap-2 mt-1 ${
                highlightedIndex === filteredOptions.length
                  ? 'bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/40'
                  : 'bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20'
              }`}
            >
              <Plus className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>
                {addNewLabel} <strong className="text-white font-black">"{query.trim()}"</strong> (اضغط Enter)
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
