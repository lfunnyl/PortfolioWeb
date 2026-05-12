import React from 'react';
import { PORTFOLIO_GROUPS } from '../../constants/formConstants';

interface PortfolioGroupComboProps {
  value: string;
  onChange: (v: string) => void;
  extraGroups?: string[];
}

const CUSTOM_VAL = '__custom__';

/** Portföy grubu seçici: listeden seç veya kendin yaz. */
export function PortfolioGroupCombo({ value, onChange, extraGroups = [] }: PortfolioGroupComboProps) {
  // Varsayılan gruplar + kullanıcının halihazırda kullandığı grupları birleştir
  const allPredefined = Array.from(new Set([...PORTFOLIO_GROUPS, ...extraGroups]));
  const isCustom = value !== '' && !allPredefined.includes(value);
  const [showCustom, setShowCustom] = React.useState(isCustom);

  function handleSelect(e: React.ChangeEvent<HTMLSelectElement>) {
    const v = e.target.value;
    if (v === CUSTOM_VAL) {
      setShowCustom(true);
      onChange('');
    } else {
      setShowCustom(false);
      onChange(v);
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
      <select value={showCustom ? CUSTOM_VAL : (value || '')} onChange={handleSelect}>
        <option value="">— Seçiniz —</option>
        {allPredefined.map(g => (
          <option key={g} value={g}>{g}</option>
        ))}
        <option value={CUSTOM_VAL}>✏️ Diğer — kendiniz yazın</option>
      </select>
      {showCustom && (
        <input
          type="text"
          placeholder="Grup adını yazın..."
          value={value}
          onChange={e => onChange(e.target.value)}
          autoFocus
          style={{ marginTop: 2 }}
        />
      )}
    </div>
  );
}
