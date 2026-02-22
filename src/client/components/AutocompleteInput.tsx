import { useState, useRef, useEffect } from 'react';
import type { Suggestion } from '../types';
import * as api from '../api';

interface Props {
  listId: number;
  categoryId: number;
  onAdd: () => void;
  autoFocus?: boolean;
}

export default function AutocompleteInput({ listId, categoryId, onAdd, autoFocus }: Props) {
  const [value, setValue] = useState('');
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const timerRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const abortRef = useRef<AbortController>(undefined);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (autoFocus) {
      inputRef.current?.focus();
    }
  }, [autoFocus]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleChange = (input: string) => {
    setValue(input);
    setSelectedIndex(-1);

    if (timerRef.current) clearTimeout(timerRef.current);
    if (abortRef.current) abortRef.current.abort();

    if (input.trim().length < 2) {
      setSuggestions([]);
      setShowDropdown(false);
      return;
    }

    timerRef.current = setTimeout(async () => {
      abortRef.current = new AbortController();
      try {
        const results = await api.getSuggestions(input, listId);
        setSuggestions(results);
        setShowDropdown(results.length > 0);
      } catch {
        // Aborted or network error
      }
    }, 200);
  };

  const submitItem = async (text: string, catId: number) => {
    if (!text.trim()) return;
    await api.addItem(listId, text.trim(), catId);
    setValue('');
    setSuggestions([]);
    setShowDropdown(false);
    setSelectedIndex(-1);
    onAdd();
    // Keep focus in the input so user can immediately add another item
    requestAnimationFrame(() => inputRef.current?.focus());
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (showDropdown && suggestions.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex(prev => (prev < suggestions.length - 1 ? prev + 1 : 0));
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex(prev => (prev > 0 ? prev - 1 : suggestions.length - 1));
        return;
      }
      if (e.key === 'Escape') {
        setShowDropdown(false);
        setSelectedIndex(-1);
        return;
      }
    }

    if (e.key === 'Enter') {
      e.preventDefault();
      if (selectedIndex >= 0 && selectedIndex < suggestions.length) {
        const s = suggestions[selectedIndex];
        submitItem(s.text, s.category_id);
      } else {
        submitItem(value, categoryId);
      }
    }
  };

  return (
    <div ref={wrapperRef} className="relative mt-1">
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={e => handleChange(e.target.value)}
        onKeyDown={handleKeyDown}
        onFocus={() => { if (suggestions.length > 0) setShowDropdown(true); }}
        placeholder="Add item..."
        className="w-full text-base border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/40 bg-gray-50"
      />

      {showDropdown && suggestions.length > 0 && (
        <div className="absolute z-10 left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
          {suggestions.map((s, i) => (
            <button
              key={`${s.text}-${s.category_id}`}
              type="button"
              onMouseDown={() => submitItem(s.text, s.category_id)}
              className={`w-full text-left px-3 py-2 text-sm flex items-center justify-between cursor-pointer ${
                i === selectedIndex ? 'bg-primary/10 text-primary' : 'hover:bg-gray-50 text-gray-700'
              }`}
            >
              <span>{s.text}</span>
              {s.category_id !== categoryId && (
                <span className="text-xs text-gray-400">{s.category_name}</span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
