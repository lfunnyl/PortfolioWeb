

interface PartialDateInputProps {
  year: string;  month: string;  day: string;
  onYearChange: (v: string) => void;
  onMonthChange: (v: string) => void;
  onDayChange: (v: string) => void;
  errors: Record<string, string>;
}

/** Yıl / Ay / Gün kısmî tarih giriş bileşeni. */
export function PartialDateInput({ year, month, day, onYearChange, onMonthChange, onDayChange, errors }: PartialDateInputProps) {
  const monthDisabled = !year;
  const dayDisabled   = !year || !month;

  const hint = !year       ? 'Yılı girerek başlayın — ay ve gün isteğe bağlı'
             : !month      ? 'Yalnızca yıl kaydedilecek — ay ve gün isteğe bağlı'
             : !day        ? 'Yıl ve ay kaydedilecek — gün isteğe bağlı'
             :               'Tam tarih girildi';

  return (
    <div className="form-group">
      <label>Alış Tarihi <span className="optional-tag">opsiyonel</span></label>
      <div className="date-partial-row">
        <div className="date-partial-field date-year-field">
          <span className="date-field-label">Yıl</span>
          <input type="number" placeholder="2024" min="1900" max="2100" value={year}
            onChange={e => { onYearChange(e.target.value); if (!e.target.value) { onMonthChange(''); onDayChange(''); } }}
            className={errors.year ? 'input-error' : ''} />
          {errors.year && <span className="form-error">{errors.year}</span>}
        </div>
        <div className="date-partial-field">
          <span className={`date-field-label ${monthDisabled ? 'label-disabled' : ''}`}>Ay</span>
          <input type="number" placeholder="1-12" min="1" max="12" value={month} disabled={monthDisabled}
            onChange={e => { onMonthChange(e.target.value); if (!e.target.value) onDayChange(''); }}
            className={errors.month ? 'input-error' : ''} />
          {errors.month && <span className="form-error">{errors.month}</span>}
        </div>
        <div className="date-partial-field">
          <span className={`date-field-label ${dayDisabled ? 'label-disabled' : ''}`}>Gün</span>
          <input type="number" placeholder="1-31" min="1" max="31" value={day} disabled={dayDisabled}
            onChange={e => onDayChange(e.target.value)}
            className={errors.day ? 'input-error' : ''} />
          {errors.day && <span className="form-error">{errors.day}</span>}
        </div>
      </div>
      <span className="form-hint">{hint}</span>
    </div>
  );
}
