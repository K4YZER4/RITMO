import { Check, ChevronDown } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

export type SelectOption = { value: string; label: string; description?: string };

export function SelectMenu({
  value,
  options,
  placeholder,
  onChange,
}: {
  value: string;
  options: SelectOption[];
  placeholder: string;
  onChange: (value: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const selected = options.find((option) => option.value === value);
  useEffect(() => {
    const close = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);
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
          {options.map((option) => (
            <button
              type="button"
              role="option"
              aria-selected={option.value === value}
              className="select-option"
              key={option.value}
              onClick={() => {
                onChange(option.value);
                setOpen(false);
              }}
            >
              <span>
                <b>{option.label}</b>
                {option.description && <small>{option.description}</small>}
              </span>
              {option.value === value && <Check size={17} />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
