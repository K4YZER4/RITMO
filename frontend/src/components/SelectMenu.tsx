import { Check, ChevronDown, Search } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

export type SelectOption = { value: string; label: string; description?: string };

export function SelectMenu({
  value,
  options,
  placeholder,
  onChange,
  searchable = true,
}: {
  value: string;
  options: SelectOption[];
  placeholder: string;
  onChange: (value: string) => void;
  searchable?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const ref = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const selected = options.find((option) => option.value === value);

  useEffect(() => {
    const close = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setOpen(false);
        setSearch('');
      }
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);

  useEffect(() => {
    if (open && searchable) {
      setSearch('');
      const timer = setTimeout(() => {
        inputRef.current?.focus();
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [open, searchable]);

  const cleanText = (t: string) =>
    t
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/_/g, ' ')
      .trim();

  const filteredOptions = options.filter((option) => {
    if (!search.trim()) return true;
    const q = cleanText(search);
    const label = cleanText(option.label);
    const desc = option.description ? cleanText(option.description) : '';

    if (label.includes(q) || desc.includes(q)) return true;

    // Búsqueda flexible por palabras (ej. "hombro" con "hombros", "smith" con "maquina smith")
    const words = q.split(/\s+/).filter(Boolean);
    return words.every((w) => label.includes(w) || w.startsWith(label) || label.startsWith(w));
  });

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      setOpen(false);
      setSearch('');
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filteredOptions.length > 0) {
        onChange(filteredOptions[0].value);
        setOpen(false);
        setSearch('');
      }
    }
  };

  return (
    <div className="select-menu" ref={ref}>
      <button
        type="button"
        className={`select-trigger ${open ? 'open' : ''}`}
        onClick={() => setOpen(!open)}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <span className={selected ? '' : 'placeholder'}>{selected?.label || placeholder}</span>
        <ChevronDown size={18} />
      </button>

      {open && (
        <div className="select-options" role="listbox">
          {searchable && options.length > 0 && (
            <div
              className="select-search-box"
              onClick={(e) => {
                e.stopPropagation();
                inputRef.current?.focus();
              }}
            >
              <Search size={14} className="select-search-icon" />
              <input
                ref={inputRef}
                type="text"
                className="select-search-input"
                placeholder="Escribe para filtrar (ej. hombro)..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={handleKeyDown}
                onClick={(e) => e.stopPropagation()}
              />
            </div>
          )}

          <div className="select-options-list">
            {filteredOptions.length > 0 ? (
              filteredOptions.map((option) => (
                <button
                  type="button"
                  role="option"
                  aria-selected={option.value === value}
                  className="select-option"
                  key={option.value}
                  onClick={() => {
                    onChange(option.value);
                    setOpen(false);
                    setSearch('');
                  }}
                >
                  <span>
                    <b>{option.label}</b>
                    {option.description && <small>{option.description}</small>}
                  </span>
                  {option.value === value && <Check size={17} />}
                </button>
              ))
            ) : (
              <div className="select-empty">
                {options.length === 0
                  ? 'No hay más opciones disponibles'
                  : `Sin coincidencias para "${search}"`}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
