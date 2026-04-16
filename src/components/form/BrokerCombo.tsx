import React from 'react';
import { BROKER_LIST } from '../../constants/formConstants';

interface BrokerComboProps {
  value: string;
  onChange: (v: string) => void;
}

const CUSTOM_VAL = '__custom__';

/** Aracı kurum seçici: listeden seç veya kendin yaz. */
export function BrokerCombo({ value, onChange }: BrokerComboProps) {
  const allItems = BROKER_LIST.flatMap(g => g.items);
  const isCustom = value !== '' && !allItems.includes(value);
  const [showCustom, setShowCustom] = React.useState(isCustom);

  function handleSelect(e: React.ChangeEvent<HTMLSelectElement>) {
    const v = e.target.value;
    if (v === CUSTOM_VAL) { setShowCustom(true); onChange(''); }
    else { setShowCustom(false); onChange(v); }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
      <select value={showCustom ? CUSTOM_VAL : (value || '')} onChange={handleSelect}>
        <option value="">— Seçiniz —</option>
        {BROKER_LIST.map(group => (
          <optgroup key={group.group} label={group.group}>
            {group.items.map(item => <option key={item} value={item}>{item}</option>)}
          </optgroup>
        ))}
        <option value={CUSTOM_VAL}>✏️ Diğer — kendiniz yazın</option>
      </select>
      {showCustom && (
        <input
          type="text"
          placeholder="Kurum adını yazın..."
          value={value}
          onChange={e => onChange(e.target.value)}
          autoFocus
          style={{ marginTop: 2 }}
        />
      )}
    </div>
  );
}
