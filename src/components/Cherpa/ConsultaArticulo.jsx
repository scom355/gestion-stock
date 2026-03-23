import React, { useState, useEffect, useRef } from 'react';

const DataRow = React.memo(({ label, value }) => (
  <div className="data-row">
    <span className="row-label">{label}</span>
    <span className="row-value">{value}</span>
  </div>
));

const highlightText = (text, highlight) => {
  if (!text) return '';
  if (!highlight || !highlight.trim()) return text;
  const escapedHighlight = highlight.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const parts = text.split(new RegExp(`(${escapedHighlight})`, 'gi'));
  return (
    <span>
      {parts.map((part, i) => (
        part.toLowerCase() === highlight.toLowerCase() ? (
          <mark key={i} style={{ backgroundColor: '#FFD700', color: '#000', padding: '0 2px', borderRadius: '4px', fontWeight: '950' }}>{part}</mark>
        ) : part
      ))}
    </span>
  );
};

const ConsultaArticulo = React.memo(({ products, onAddProduct, CameraScanner, API_BASE, inputRef: externalInputRef }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [result, setResult] = useState(null);
  const [filteredList, setFilteredList] = useState([]);
  const [scanMode, setScanMode] = useState('manual');
  const [failedTerm, setFailedTerm] = useState('');
  const [keyboardForced, setKeyboardForced] = useState(() => {
    const saved = localStorage.getItem('keyboardForced');
    return saved === null ? true : saved === 'true';
  });
  const localInputRef = useRef(null);
  const inputRef = externalInputRef || localInputRef;

  const toggleKeyboard = () => {
    const newState = !keyboardForced;
    setKeyboardForced(newState);
    localStorage.setItem('keyboardForced', newState);
    if (inputRef.current) {
      const el = inputRef.current;
      el.blur();
      setTimeout(() => {
        el.setAttribute('inputmode', newState ? "text" : "none");
        el.focus();
        el.click();
      }, 200);
    }
  };

  useEffect(() => {
    const keepFocus = () => {
      if (scanMode === 'camera') return;
      
      // If keyboard is forced, only auto-focus on desktop to avoid popping keyboard on mobile
      const isMobile = window.innerWidth < 1024;
      if (isMobile && keyboardForced) return;

      const activeEl = document.activeElement;
      if (activeEl && (activeEl.tagName === 'INPUT' || activeEl.tagName === 'TEXTAREA') && activeEl !== inputRef.current) return;
      if (inputRef.current) {
        inputRef.current.focus();
        // click helps trigger focus in some mobile browsers if inputmode is none
        if (!keyboardForced) inputRef.current.click();
      }
    };
    const interval = setInterval(keepFocus, 300);
    setTimeout(keepFocus, 100);
    return () => clearInterval(interval);
  }, [scanMode, result, keyboardForced]);

  useEffect(() => {
    const term = searchTerm.trim();
    if (!term || /^\d+$/.test(term)) {
      setFilteredList([]);
      return;
    }
    const controller = new AbortController();
    if (term.length >= 1) {
      const triggerSearch = async () => {
        try {
          const query = term.toLowerCase();
          const localMatch = products.filter(p => p.name && p.name.toLowerCase().includes(query)).slice(0, 10);
          setFilteredList(localMatch);
          const response = await fetch(`${API_BASE}/products?search=${encodeURIComponent(term)}&limit=20`, { signal: controller.signal });
          const data = await response.json();
          if (data && data.products) {
            setFilteredList(prev => {
              const existingIds = new Set(prev.map(p => p.id));
              const serverNew = data.products.filter(p => !existingIds.has(p.id));
              return [...prev, ...serverNew].slice(0, 30);
            });
          }
        } catch (err) { if (err.name !== 'AbortError') console.error("Search error:", err); }
      };
      const timer = setTimeout(triggerSearch, 100);
      return () => { clearTimeout(timer); controller.abort(); };
    } else {
      setFilteredList([]);
    }
  }, [searchTerm, products, API_BASE]);

  const handleSelectProduct = (product) => {
    setResult(product);
    setSearchTerm('');
    setFilteredList([]);
  };

  const handleSearch = async (e, forcedTerm = null) => {
    if (e) e.preventDefault();
    const finalTerm = (forcedTerm || searchTerm).trim();
    if (!finalTerm) return;
    const isEAN = /^\d+$/.test(finalTerm);
    if (isEAN) {
      let found = products.find(p => p.barcode === finalTerm);
      if (!found) {
        try {
          const response = await fetch(`${API_BASE}/product/${encodeURIComponent(finalTerm)}`);
          const serverFound = await response.json();
          if (serverFound && serverFound.id) found = serverFound;
        } catch (err) { console.error("Server search error:", err); }
      }
      if (found) {
        setResult(found);
        setSearchTerm('');
        setFilteredList([]);
        return;
      }
    } else {
      try {
        const resSearch = await fetch(`${API_BASE}/products?search=${encodeURIComponent(finalTerm)}&limit=100`);
        const dataSearch = await resSearch.json();
        if (dataSearch.products && dataSearch.products.length > 0) {
          setResult(null);
          setFilteredList(dataSearch.products);
          return;
        }
      } catch (err) { console.error("Global search error:", err); }
    }
    setResult('no_found');
    setFailedTerm(finalTerm);
    setSearchTerm('');
  };

  const handleCameraScan = (code) => {
    setSearchTerm(code);
    setScanMode('manual');
    handleSearch(null, code);
  };

  return (
    <div className="consulta-articulo-wrapper">
      <div className="search-header">
        <div className={`search-bar-premium ${scanMode === 'camera' ? 'cam-on' : ''}`}>
          {scanMode === 'manual' ? (
            <>
              <label htmlFor="search-input-mobile" className="search-icon-glass" style={{'pointerEvents': 'none'}}>🔍</label>
              <input
                id="search-input-mobile"
                ref={inputRef}
                type="text"
                placeholder="Escribe o busca nombre..."
                inputMode={keyboardForced ? "text" : "none"}
                autoComplete="off"
                spellCheck="false"
                enterKeyHint="search"
                value={searchTerm}
                onChange={(e) => { setSearchTerm(e.target.value); if (result) setResult(null); }}
                onKeyDown={(e) => {
                   if(e.key === 'Enter') {
                     e.target.blur();
                     handleSearch();
                   }
                }}
              // autoFocus removed for mobile reliability
              />
              <div className="search-actions-modern">
                <button
                  type="button"
                  className={`btn-keyboard-toggle ${keyboardForced ? 'active' : ''}`}
                  onClick={toggleKeyboard}
                  title={keyboardForced ? "Desactivar Teclado" : "Activar Teclado"}
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" width="20" height="20">
                    <path d="M21 15a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                    <line x1="7" y1="10" x2="7" y2="10" />
                    <line x1="11" y1="10" x2="11" y2="10" />
                    <line x1="15" y1="10" x2="15" y2="10" />
                    <line x1="7" y1="14" x2="7" y2="14" />
                    <line x1="11" y1="14" x2="11" y2="14" />
                    <line x1="15" y1="14" x2="15" y2="14" />
                  </svg>
                </button>
                <button className="btn-cam-trigger" onClick={() => setScanMode('camera')}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" width="20" height="20">
                    <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                    <circle cx="12" cy="13" r="4" />
                  </svg>
                </button>
              </div>
            </>
          ) : (
            <div className="camera-header-mode">
              <span>CÁMARA ACTIVA</span>
              <button className="btn-cancel-cam" onClick={() => setScanMode('manual')}>CERRAR</button>
            </div>
          )}
        </div>
      </div>

      <div className="results-container">
        {scanMode === 'camera' && (
          <div className="camera-inline-box animate-pop">
            <CameraScanner onScan={handleCameraScan} />
          </div>
        )}
        {!result && filteredList.length > 0 && (
          <div className="live-results-list animate-pop">
            {filteredList.map(p => (
              <div key={p.id} className="live-result-item" onClick={() => handleSelectProduct(p)}>
                <div className="item-info">
                  <span className="item-name">{highlightText(p.name, searchTerm)}</span>
                  <span className="item-barcode">{p.barcode}</span>
                </div>
                <div className="item-price">€{parseFloat(p.sell_price).toFixed(2)}</div>
              </div>
            ))}
          </div>
        )}

        {result === 'no_found' && (
          <div className="not-found-state animate-pop">
            <div className="p-icon">🤷‍♂️</div>
            <h3>Producto no encontrado</h3>
            <button className="add-now-btn" onClick={() => onAddProduct(failedTerm)}>+ AÑADIR NUEVO</button>
          </div>
        )}

        {result && result !== 'no_found' && (
          <div className="product-details-card animate-slideUp">
            <div className="card-header-v2">
              <div className="header-main-info">
                <h3>{result.name}</h3>
                <span className="barcode-tag">{result.barcode}</span>
              </div>
              <button className="btn-close-card" onClick={() => setResult(null)}>✖</button>
            </div>

            <div className="price-hero-section">
              <div className="price-box">
                <span className="price-label">PRECIO VENTA</span>
                <span className="price-value">€{parseFloat(result.sell_price).toFixed(2)}</span>
              </div>
            </div>

            <div className="rows-list">
              <DataRow label="STOCK" value={`${result.stock_current} uds`} />
              <DataRow label="CAT" value={result.category || 'Sin Cat.'} />
              <DataRow label="OFERTA" value={result.offer > 0 ? "2 UNIDAD -50%" : "No"} />
            </div>
          </div>
        )}
      </div>

      <style>{`
        .consulta-articulo-wrapper { width: 100%; height: 100%; display: flex; flex-direction: column; background: #fff; align-items: center; }
        .search-header { width: 100%; padding: 10px; background: #fff; display: flex; justify-content: center; box-sizing: border-box; }
        
        .search-bar-premium { 
          display: flex; align-items: center; background: #f8fafc; padding: 0 5px 0 15px; border-radius: 50px; gap: 6px; 
          border: 1px solid #e2e8f0; width: 100%; max-width: 600px; height: 50px; transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          box-shadow: 0 2px 10px rgba(0,0,0,0.02); box-sizing: border-box;
        }
        .search-bar-premium:focus-within { background: #fff; box-shadow: 0 10px 30px rgba(0,0,0,0.08); border-color: #004691; }
        .search-bar-premium.cam-on { border-color: #E1000F; background: #fef2f2; }
        .search-icon-glass { font-size: 16px; opacity: 0.5; pointer-events: none; }
        .search-bar-premium input { flex: 1; min-width: 0; border: none; background: transparent; outline: none; font-size: 15px; font-weight: 800; color: #000000; height: 100%; box-sizing: border-box; }
        
        .search-actions-modern { display: flex; gap: 4px; align-items: center; flex-shrink: 0; }
        .btn-keyboard-toggle { background: #f1f5f9; color: #64748b; border: none; display: flex; align-items: center; justify-content: center; width: 36px; height: 36px; border-radius: 50%; transition: 0.2s; }
        .btn-keyboard-toggle.active { background: #004691; color: #fff; box-shadow: 0 4px 12px rgba(0, 70, 145, 0.25); }
        .btn-cam-trigger { background: #004691; color: #fff; border: none; display: flex; align-items: center; justify-content: center; width: 36px; height: 36px; border-radius: 50%; box-shadow: 0 4px 12px rgba(0, 70, 145, 0.25); transition: 0.2s; }

        .camera-header-mode { display: flex; flex: 1; justify-content: space-between; align-items: center; font-weight: 950; font-size: 12px; color: #E1000F; }
        .btn-cancel-cam { background: #E1000F; color: #fff; border: none; padding: 6px 15px; border-radius: 20px; font-size: 10px; font-weight: 950; }

        .results-container { width: 100%; max-width: 800px; flex: 1; padding: 15px; overflow-y: auto; }
        .camera-inline-box { border-radius: 25px; overflow: hidden; border: 3px solid #004691; margin-bottom: 20px; }

        .live-results-list { display: flex; flex-direction: column; gap: 8px; }
        .live-result-item { background: #fff; padding: 15px 20px; display: flex; justify-content: space-between; align-items: center; border: 1px solid #f1f5f9; border-radius: 18px; transition: 0.2s; cursor: pointer; }
        .live-result-item:hover { transform: translateY(-2px); box-shadow: 0 5px 15px rgba(0,0,0,0.05); border-color: #004691; }
        
        .item-info { display: flex; flex-direction: column; }
        .item-name { font-weight: 950; color: #1e293b; font-size: 14px; text-transform: uppercase; }
        .item-barcode { font-size: 11px; color: #94a3b8; font-family: monospace; }
        .item-price { font-weight: 950; color: #004691; font-size: 16px; }

        .product-details-card { background: #fff; border-radius: 30px; box-shadow: 0 20px 60px rgba(0,0,0,0.1); overflow: hidden; border: 1px solid #f1f5f9; margin-bottom: 40px; }
        .card-header-v2 { padding: 30px; display: flex; justify-content: space-between; align-items: flex-start; }
        .header-main-info h3 { font-size: 24px; font-weight: 950; color: #0f172a; margin-bottom: 5px; text-transform: uppercase; }
        .barcode-tag { font-size: 13px; font-weight: 800; color: #94a3b8; font-family: monospace; background: #f8fafc; padding: 4px 12px; border-radius: 10px; }
        .btn-close-card { background: #f1f5f9; border: none; width: 40px; height: 40px; border-radius: 50%; font-weight: 950; font-size: 18px; color: #64748b; }

        .price-hero-section { background: #f8fafc; margin: 0 30px 30px; padding: 35px; border-radius: 25px; border: 1px solid #e2e8f0; text-align: center; }
        .price-label { font-size: 12px; font-weight: 950; color: #94a3b8; display: block; margin-bottom: 8px; letter-spacing: 1px; }
        .price-value { font-size: 64px; font-weight: 950; color: #004691; line-height: 1; }

        .rows-list { padding: 0 30px 30px; }
        .data-row { display: flex; justify-content: space-between; padding: 18px 0; border-bottom: 1.5px solid #f8fafc; }
        .row-label { font-size: 12px; font-weight: 950; color: #94a3b8; text-transform: uppercase; }
        .row-value { font-size: 16px; font-weight: 950; color: #1e293b; }

        .not-found-state { text-align: center; padding: 60px 40px; background: #f8fafc; border-radius: 30px; border: 2px dashed #e2e8f0; margin-top: 20px; }
        .p-icon { font-size: 60px; margin-bottom: 20px; }
        .add-now-btn { background: #E1000F; color: #fff; border: none; padding: 20px; border-radius: 20px; font-weight: 950; font-size: 14px; width: 100%; margin-top: 30px; box-shadow: 0 10px 20px rgba(225, 0, 15, 0.15); }

        .animate-pop { animation: pop 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275); }
        .animate-slideUp { animation: slideUp 0.5s ease-out; }
        @keyframes pop { from { scale: 0.9; opacity: 0; } to { scale: 1; opacity: 1; } }
        @keyframes slideUp { from { transform: translateY(30px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
      `}</style>
    </div>
  );
});

export default ConsultaArticulo;
