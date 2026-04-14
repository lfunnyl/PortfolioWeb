import { useState, useRef, forwardRef } from 'react';

interface FormattedNumberInputProps {
  value: string;                       // ham sayı string'i ("5000", "1500000.5")
  onChange: (raw: string) => void;     // ham sayı string'ini döndürür
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  id?: string;
}

/**
 * Türkçe formatlı sayı giriş kutusu.
 * Görüntüde binlik ayracı olarak nokta kullanır: 1.000.000
 * Ondalıklı kısım için virgül desteklenir: 1.234,56
 *
 * onChange her zaman raw sayısal string döner: "1000000" veya "1234.56"
 */
export const FormattedNumberInput = forwardRef<HTMLInputElement, FormattedNumberInputProps>(
  ({ value, onChange, placeholder, disabled, className, id }, _ref) => {
    const [focused, setFocused] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);

    /** Ham string'i Türkçe formatlı gösterime çevir */
    function format(raw: string): string {
      if (!raw) return '';
      // "1234567.89" → "1.234.567,89"
      const [intPart, decPart] = raw.split('.');
      const intFormatted = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
      return decPart !== undefined ? `${intFormatted},${decPart}` : intFormatted;
    }

    /** Görüntüdeki formatlı değeri ham string'e çevir */
    function unformat(display: string): string {
      if (!display) return '';
      // Önce tüm noktaları kaldır (binlik ayraç), virgülü noktaya çevir (ondalık)
      return display.replace(/\./g, '').replace(',', '.');
    }

    function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
      const raw = unformat(e.target.value);
      // Yalnızca geçerli sayısal karakterler
      if (raw === '' || /^-?\d*\.?\d*$/.test(raw)) {
        onChange(raw);
      }
    }

    // Odak dışındayken formatted, odakta ham değeri göster
    const displayValue = focused ? value : format(value);

    return (
      <input
        ref={inputRef}
        id={id}
        type="text"
        inputMode="decimal"
        value={displayValue}
        placeholder={placeholder}
        disabled={disabled}
        className={className}
        onChange={handleChange}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
      />
    );
  }
);

FormattedNumberInput.displayName = 'FormattedNumberInput';
