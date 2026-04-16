import { useState } from 'react';
import { searchYahooFinance } from '../../services/searchService';

interface CustomAssetSearchProps {
  customName: string;
  customSymbol: string;
  onNameChange: (v: string) => void;
  onSymbolChange: (v: string) => void;
  errors: Record<string, string>;
}

/** Global hisse arama ve özel varlık oluşturma bileşeni. */
export function CustomAssetSearch({ customName, customSymbol, onNameChange, onSymbolChange, errors }: CustomAssetSearchProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  async function handleSearch() {
    if (!searchQuery.trim()) return;
    setIsSearching(true);
    try {
      const results = await searchYahooFinance(searchQuery);
      setSearchResults(results);
    } catch (e) {
      console.error(e);
    } finally {
      setIsSearching(false);
    }
  }

  return (
    <div className="form-group custom-asset-box">
      <label>✨ Global Hisse Arama (BIST, NASDAQ, NYSE vb.)</label>
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' }}>
        <input
          type="text"
          placeholder="Hisse adı veya sembolü ara (Örn: Apple, TSLA, ASELS)"
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleSearch(); } }}
        />
        <button type="button" onClick={handleSearch} disabled={isSearching}
          className="btn-magic"
          style={{ padding: '0 1rem', background: 'var(--accent)', color: 'white', borderRadius: '4px', border: 'none', cursor: 'pointer' }}>
          {isSearching ? '⏳' : '🔍 Ara'}
        </button>
      </div>

      {searchResults.length > 0 && (
        <div style={{ background: 'var(--bg-2)', border: '1px solid var(--border)', borderRadius: '4px', maxHeight: '150px', overflowY: 'auto', marginBottom: '1rem' }}>
          {searchResults.map((res: any, idx: number) => (
            <div key={idx}
              style={{ padding: '0.5rem', borderBottom: '1px solid var(--border)', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
              onClick={() => { onNameChange(res.longname || res.shortname || res.symbol); onSymbolChange(res.symbol); setSearchResults([]); setSearchQuery(''); }}
              onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-1)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <strong style={{ fontSize: '0.9rem' }}>{res.longname || res.shortname}</strong>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{res.exchange} • {res.quoteType}</span>
              </div>
              <span style={{ background: 'var(--accent)22', color: 'var(--accent)', padding: '0.2rem 0.5rem', borderRadius: '4px', fontSize: '0.8rem', fontWeight: 600 }}>{res.symbol}</span>
            </div>
          ))}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
        <input type="text" placeholder="Hisse Şirket Adı" value={customName}
          onChange={e => onNameChange(e.target.value)} className={errors.customName ? 'input-error' : ''} />
        <input type="text" placeholder="Sembol (DOAS.IS, AAPL vb.)" value={customSymbol}
          onChange={e => onSymbolChange(e.target.value)} className={errors.customSymbol ? 'input-error' : ''} />
      </div>
      {(errors.customName || errors.customSymbol) && (
        <span className="form-error">Hisse adı ve sembolü boş bırakılamaz. Türk hisseleri için sonuna .IS ekleyiniz.</span>
      )}
      <span className="form-hint">Arama ile bulduysanız doğrudan kaydedebilirsiniz. Bu hisse sistemde kalıcı saklanacaktır.</span>
    </div>
  );
}
