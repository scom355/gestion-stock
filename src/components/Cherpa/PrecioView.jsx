import React, { useState, useEffect, useRef } from 'react';
import EditProductView from './EditProductView';

const PrecioView = ({ products, addToSpool, onAddProduct, onUpdateProduct, CameraScanner, API_BASE, inputRef: externalInputRef }) => {
  const [mode, setMode] = useState(null);
  const [barcode, setBarcode] = useState('');
  const [result, setResult] = useState(null);
  const [notFoundBarcode, setNotFoundBarcode] = useState('');
  const [isEditingPrice, setIsEditingPrice] = useState(false);
  const [newPrice, setNewPrice] = useState('');
  const [cantidad, setCantidad] = useState(1);
  const [showSyncSuccess, setShowSyncSuccess] = useState(false);
  const [isAskingTicket, setIsAskingTicket] = useState(false);
  const [filteredList, setFilteredList] = useState([]);
  const [keyboardForced, setKeyboardForced] = useState(() => {
    const saved = localStorage.getItem('keyboardForced');
    return saved === null ? true : saved === 'true';
  });
  const [scanMode, setScanMode] = useState('manual');
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
      // If keyboard is forced, only auto-focus on desktop to avoid popping keyboard on mobile
      const isMobile = window.innerWidth < 1024;
      if (isMobile && keyboardForced) return;
      if (isEditingPrice || isAskingTicket || scanMode === 'camera') return;
      if (inputRef.current && mode) inputRef.current.focus();
    };
    const interval = setInterval(keepFocus, 300);
    return () => clearInterval(interval);
  }, [mode, isEditingPrice, isAskingTicket, result, scanMode]);

  useEffect(() => {
    const term = barcode.trim();
    if (!term || /^\d+$/.test(term)) {
      setFilteredList([]);
      return;
    }
    const controller = new AbortController();
    if (term.length >= 1) {
      const triggerSearch = async () => {
        try {
          const response = await fetch(`${API_BASE}/products?search=${encodeURIComponent(term)}&limit=15`, { signal: controller.signal });
          const data = await response.json();
          if (data && data.products) {
            setFilteredList(data.products.slice(0, 20));
          }
        } catch (err) { if (err.name !== 'AbortError') console.error("Search error:", err); }
      };
      const timer = setTimeout(triggerSearch, 100);
      return () => { clearTimeout(timer); controller.abort(); };
    } else {
      setFilteredList([]);
    }
  }, [barcode, API_BASE]);

  const handleSelectProduct = (product) => {
    setResult(product);
    setBarcode('');
    setFilteredList([]);
    if (mode === 'ticket') {
      setIsAskingTicket(true);
      setCantidad(1);
    }
  };

  const handleSearch = async (e, forcedBarcode = null) => {
    if (e) e.preventDefault();
    const finalBarcode = (forcedBarcode || barcode).trim();
    if (!finalBarcode) return;
    if (/^\d+$/.test(finalBarcode) && finalBarcode.length > 5) {
      try {
        const resExact = await fetch(`${API_BASE}/product/${encodeURIComponent(finalBarcode)}`);
        const pExact = await resExact.json();
        if (pExact && pExact.id) {
          setResult(pExact);
          setNotFoundBarcode('');
          setBarcode('');
          setCantidad(1);
          setScanMode('manual');
          if (mode === 'ticket') {
            setIsAskingTicket(true);
          }
          return;
        }
      } catch (err) { console.error("Exact lookup error:", err); }
    } else {
      try {
        const resSearch = await fetch(`${API_BASE}/products?search=${encodeURIComponent(finalBarcode)}&limit=50`);
        const dataSearch = await resSearch.json();
        if (dataSearch.products && dataSearch.products.length > 0) {
          setResult(null);
          setFilteredList(dataSearch.products);
          setScanMode('manual');
          return;
        }
      } catch (err) { console.error("Global search error:", err); }
    }
    setNotFoundBarcode(finalBarcode);
    setResult('not_found');
    setBarcode('');
    setIsEditingPrice(false);
    setScanMode('manual');
  };

  const handleCameraScan = (code) => {
    setBarcode(code);
    handleSearch(null, code);
  };

  const handleTicketDecision = (wantTicket) => {
    if (wantTicket) {
      for (let i = 0; i < cantidad; i++) {
        addToSpool(result);
      }
      setShowSyncSuccess(true);
      setTimeout(() => { setShowSyncSuccess(false); setResult(null); setIsAskingTicket(false); }, 1000);
    } else {
      setResult(null);
      setIsAskingTicket(false);
    }
  };

  if (!mode) {
    return (
      <div className="precio-mode-selection animate-slideUp">
        <div className="selection-grid">
          <button className="mode-option" onClick={() => setMode('edit')}>
            <div className="mode-circle-icon edit">📝</div>
            <span className="mode-label">EDITAR PRECIO</span>
          </button>
          <button className="mode-option" onClick={() => setMode('ticket')}>
            <div className="mode-circle-icon ticket">🎫</div>
            <span className="mode-label">AÑADIR TICKET</span>
          </button>
        </div>
        <style>{`
          .precio-mode-selection { padding-top: 80px; display: flex; justify-content: center; }
          .selection-grid { display: flex; gap: 40px; }
          .mode-option { border: none; background: transparent; cursor: pointer; display: flex; flex-direction: column; align-items: center; gap: 20px; transition: 0.2s; }
          .mode-option:active { transform: scale(0.9); }
          .mode-circle-icon { width: 110px; height: 110px; border-radius: 40px; display: flex; align-items: center; justify-content: center; font-size: 45px; box-shadow: 0 15px 35px rgba(0,0,0,0.1); transition: 0.3s; }
          .edit { background: #003986; color: #fff; } 
          .ticket { background: #16A34A; color: #fff; }
          .mode-label { font-size: 11px; font-weight: 950; color: #1e293b; letter-spacing: 0.5px; }
        `}</style>
      </div>
    );
  }

  return (
    <div className="precio-viewer-v3">
      <div className="search-sticky-header">
        <button className="btn-back-mode" onClick={() => { setMode(null); setResult(null); }}>✖</button>

        <div className={`precio-search-bar ${scanMode === 'camera' ? 'cam-on' : ''}`}>
          {scanMode === 'manual' ? (
            <>
              <label htmlFor="price-input-mobile" className="precio-icon-glass" style={{'pointerEvents': 'none'}}>🔍</label>
              <input
                  id="price-input-mobile"
                ref={inputRef}
                type="text"
                placeholder="Escanea o escribe código..."
                inputMode={keyboardForced ? "text" : "none"}
                autoComplete="off"
                spellCheck="false"
                enterKeyHint="search"
                value={barcode}
                onChange={(e) => { setBarcode(e.target.value); if (result) setResult(null); }}
                onKeyDown={(e) => {
                  if(e.key === 'Enter') {
                    e.target.blur();
                    handleSearch();
                  }
                }}
              /* autoFocus removed for mobile reliability */
              />
              <div className="precio-actions-group">
                <button
                  type="button"
                  className={`btn-keyboard-toggle ${keyboardForced ? 'active' : ''}`}
                  onClick={toggleKeyboard}
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
                <button className="btn-camera" style={{ background: mode === 'edit' ? '#003986' : '#16A34A' }} onClick={() => setScanMode('camera')}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" width="20" height="20">
                    <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                    <circle cx="12" cy="13" r="4" />
                  </svg>
                </button>
              </div>
            </>
          ) : (
            <div className="camera-active-banner">
              <span>CÁMARA ACTIVADA</span>
              <button className="btn-exit-scan" onClick={() => setScanMode('manual')}>SALIR</button>
            </div>
          )}
        </div>
      </div>

      <div className="precio-content-scroll">
        {scanMode === 'camera' && (
          <div className="camera-wrapper-v3 animate-pop">
            <CameraScanner onScan={handleCameraScan} />
          </div>
        )}

        {showSyncSuccess && (
          <div className="sync-banner-modern animate-pop" style={{ background: mode === 'edit' ? '#003986' : '#16A34A' }}>
            {mode === 'edit' ? '✅ PRECIO ACTUALIZADO' : '✅ TICKET EN COLA'}
          </div>
        )}

        {!result && filteredList.length > 0 && (
          <div className="live-results-list animate-pop">
            {filteredList.map(p => (
              <div key={p.id} className="live-result-item" onClick={() => handleSelectProduct(p)}>
                <div className="item-info">
                  <span className="item-name">{p.name}</span>
                  <span className="item-barcode">{p.barcode}</span>
                </div>
                <div className="item-price">€{parseFloat(p.sell_price).toFixed(2)}</div>
              </div>
            ))}
          </div>
        )}

        {result === 'not_found' && (
          <div className="error-card-v3 animate-pop">
            <div className="warn-icon">📦?</div>
            <h3>NO ENCONTRADO</h3>
            <p className="ean-failed">{notFoundBarcode}</p>
            <button className="btn-quick-add" onClick={() => onAddProduct(notFoundBarcode)}>➕ ALTA RÁPIDA</button>
          </div>
        )}

        {result && result !== 'not_found' && (
          <div className="product-details-card animate-slideUp">
            <div className="card-main-header">
              <h2>{result.name}</h2>
              <span className="barcode-badge">{result.barcode}</span>
            </div>

            <div className="content-area">
              {isAskingTicket ? (
                <div className="ticket-prompt-v2">
                  <p>Añadir a spool: <br /> <strong>{result.name}</strong></p>
                  <div className="qty-label">CANTIDAD DE TICKETS</div>
                  <div className="qty-selector-modern">
                    <button onClick={() => setCantidad(Math.max(1, cantidad - 1))}>－</button>
                    <span className="qty-number">{cantidad}</span>
                    <button onClick={() => setCantidad(cantidad + 1)}>＋</button>
                  </div>
                  <div className="prompt-actions-v2">
                    <button className="btn-no" onClick={() => handleTicketDecision(false)}>OTRA VEZ</button>
                    <button className="btn-yes" onClick={() => handleTicketDecision(true)}>AÑADIR AHORA</button>
                  </div>
                </div>
              ) : isEditingPrice ? (
                <EditProductView
                  product={result}
                  onUpdate={async (uResult) => {
                    setResult(uResult);
                    setIsEditingPrice(false);
                    setShowSyncSuccess(true);
                    setTimeout(() => { setShowSyncSuccess(false); setIsAskingTicket(true); }, 800);
                  }}
                  onCancel={() => setIsEditingPrice(false)}
                  CameraScanner={CameraScanner}
                />
              ) : (
                <div className="price-hero-modern">
                  <span className="h-label">PRECIO VENTA</span>
                  <span className="h-value">€{parseFloat(result.sell_price).toFixed(2)}</span>
                  <div className="extra-info-row" style={{ display: "flex", justifyContent: "space-between", padding: "10px 20px", background: "#fff", borderRadius: "15px", marginTop: "20px" }}>
                    <span style={{ fontSize: "10px", fontWeight: "950", color: "#94a3b8" }}>CAT: {result.category || "General"}</span>
                    <span style={{ fontSize: "10px", fontWeight: "950", color: "#16A34A" }}>{result.offer > 0 ? "PROMO ACTIVA" : ""}</span>
                  </div>
                  {mode === 'edit' && <button className="btn-edit-main" onClick={() => setIsEditingPrice(true)} style={{ marginTop: "20px" }}>EDITAR PRODUCTO</button>}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      <style>{`
        .precio-viewer-v3 { width: 100%; height: 100%; display: flex; flex-direction: column; background: #fff; }
        .search-sticky-header { width: 100%; padding: 12px 15px; display: flex; align-items: center; gap: 12px; border-bottom: 1px solid #f1f5f9; background: #fff; }
        
        .btn-back-mode { background: #f1f5f9; border: none; width: 45px; height: 45px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 18px; color: #64748b; }
        
        .precio-search-bar { 
          flex: 1; display: flex; align-items: center; background: #f8fafc; border: 1.5px solid #e2e8f0; border-radius: 100px; padding: 0 15px; height: 55px; gap: 12px; transition: 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .search-glass { font-size: 18px; opacity: 0.5; pointer-events: none; }
        .precio-search-bar input { flex: 1; border: none; background: transparent; padding: 12px 0; font-size: 16px; font-weight: 800; outline: none; color: #000000; }
        
        .precio-actions-group { display: flex; gap: 8px; }
        .btn-keyboard-toggle { background: #f1f5f9; color: #64748b; border: none; display: flex; align-items: center; justify-content: center; width: 44px; height: 44px; border-radius: 50%; transition: 0.2s; }
        .btn-keyboard-toggle.active { background: #003986; color: #fff; box-shadow: 0 4px 12px rgba(0, 57, 134, 0.25); }
        .btn-camera { border: none; color: #fff; display: flex; align-items: center; justify-content: center; width: 44px; height: 44px; border-radius: 50%; box-shadow: 0 4px 12px rgba(0,0,0,0.15); transition: 0.2s; }

        .camera-active-banner { flex: 1; display: flex; justify-content: space-between; align-items: center; font-weight: 950; font-size: 12px; color: #EA580C; letter-spacing: 0.5px; }
        .btn-exit-scan { background: #EA580C; color: #fff; border: none; padding: 6px 15px; border-radius: 20px; font-size: 10px; font-weight: 950; }

        .precio-content-scroll { flex: 1; padding: 20px 15px; overflow-y: auto; }
        .camera-wrapper-v3 { border-radius: 30px; overflow: hidden; border: 4px solid #f1f5f9; margin-bottom: 30px; }

        .live-results-list { display: flex; flex-direction: column; gap: 8px; margin-bottom: 30px; }
        .live-result-item { background: #fff; padding: 15px 20px; display: flex; justify-content: space-between; border-radius: 18px; border: 1px solid #f1f5f9; cursor: pointer; transition: 0.2s; }
        .live-result-item:hover { transform: scale(1.02); border-color: #003986; }
        .item-name { font-weight: 950; color: #0f172a; text-transform: uppercase; font-size: 14px; display: block; }
        .item-barcode { font-size: 11px; color: #94a3b8; font-family: monospace; }
        .item-price { font-weight: 950; color: #003986; font-size: 17px; }

        .product-details-card { background: #fff; border-radius: 35px; box-shadow: 0 25px 50px rgba(0,0,0,0.1); border: 1px solid #f1f5f9; overflow: hidden; }
        .card-main-header { padding: 35px 25px; border-bottom: 1.5px solid #f8fafc; text-align: center; }
        .card-main-header h2 { font-size: 24px; font-weight: 950; color: #0f172a; text-transform: uppercase; margin-bottom: 8px; }
        .barcode-badge { font-size: 12px; transform: scale(1.1); color: #94a3b8; background: #f8fafc; padding: 4px 15px; border-radius: 10px; font-family: monospace; }

        .price-hero-modern { background: #f8fafc; padding: 45px 20px; border-radius: 30px; text-align: center; margin: 0 20px 30px; border: 1px solid #e2e8f0; }
        .h-label { display: block; font-size: 12px; font-weight: 950; color: #94a3b8; letter-spacing: 1px; margin-bottom: 10px; }
        .h-value { font-size: 72px; font-weight: 950; color: #003986; line-height: 1; display: block; margin-bottom: 25px; }
        .btn-edit-main { background: #003986; color: #fff; border: none; padding: 18px 40px; border-radius: 20px; font-weight: 950; font-size: 13px; box-shadow: 0 10px 20px rgba(0, 57, 134, 0.1); }

        .ticket-prompt-v2 { padding: 40px 25px; text-align: center; }
        .ticket-prompt-v2 p { font-size: 18px; color: #475569; margin-bottom: 20px; }
        .qty-label { font-size: 10px; font-weight: 950; color: #94a3b8; margin-bottom: 10px; }
        .qty-selector-modern { display: flex; align-items: center; justify-content: center; gap: 30px; margin-bottom: 40px; background: #f8fafc; padding: 20px; border-radius: 30px; }
        .qty-selector-modern button { width: 55px; height: 55px; border-radius: 50%; border: none; background: #fff; font-size: 24px; font-weight: 950; box-shadow: 0 4px 10px rgba(0,0,0,0.05); }
        .qty-number { font-size: 42px; font-weight: 950; color: #1e293b; min-width: 60px; }
        .prompt-actions-v2 { display: flex; gap: 15px; }
        .prompt-actions-v2 button { flex: 1; padding: 22px; border-radius: 22px; border: none; font-weight: 950; font-size: 14px; transition: 0.2s; }
        .btn-no { background: #f1f5f9; color: #64748b; }
        .btn-yes { background: #16A34A; color: #fff; box-shadow: 0 10px 20px rgba(22, 163, 74, 0.2); }

        .error-card-v3 { background: #fff; border: 3px dashed #cbd5e1; padding: 60px 30px; border-radius: 35px; text-align: center; }
        .warn-icon { font-size: 50px; margin-bottom: 20px; }
        .ean-failed { font-family: monospace; font-size: 18px; color: #94a3b8; margin: 10px 0 30px; }
        .btn-quick-add { background: #EA580C; color: #fff; border: none; padding: 20px 40px; border-radius: 20px; font-weight: 950; }

        .sync-banner-modern { padding: 18px; border-radius: 20px; color: #fff; font-weight: 950; text-align: center; margin-bottom: 20px; box-shadow: 0 10px 20px rgba(0,0,0,0.1); }
        
        .animate-pop { animation: pop 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275); }
        .animate-slideUp { animation: slideUp 0.5s ease; }
        @keyframes pop { from { scale: 0.8; opacity: 0; } to { scale: 1; opacity: 1; } }
        @keyframes slideUp { from { transform: translateY(40px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
      `}</style>
    </div>
  );
};

export default PrecioView;
