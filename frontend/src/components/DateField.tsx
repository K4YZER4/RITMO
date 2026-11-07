import { CalendarDays } from 'lucide-react';

export function DateField({
  label,
  value,
  min,
  onChange,
  required = false,
}: {
  label: string;
  value: string;
  min?: string;
  onChange: (value: string) => void;
  required?: boolean;
}) {
  return (
    <label className="date-field">
      {label}
      <span>
        <input
          type="date"
          value={value}
          min={min}
          onChange={(event) => onChange(event.target.value)}
          required={required}
        />
        <CalendarDays size={18} />
      </span>
    </label>
  );
}
