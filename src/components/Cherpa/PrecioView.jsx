import React, { useState, useEffect, useRef, useCallback } from 'react';
import EditProductView from './EditProductView';

const PrecioView = ({ products, addToSpool, ticketSpool, onAddProduct, onUpdateProduct, CameraScanner, API_BASE, inputRef: externalInputRef, forceMode }) => {
  const [mode, setMode] = useState(forceMode || null);
  const [barcode, setBarcode] = useState('');
  const [result, setResult] = useState(null);
  const [notFoundBarcode, setNotFoundBarcode] = useState('');
  const [isEditingPrice, setIsEditingPrice] = useState(false);
  const [showSyncSuccess, setShowSyncSuccess] = useState(false);
  const [filteredList, setFilteredList] = useState([]);
  const [keyboardForced, setKeyboardForced] = useState(() => {
    const saved = localStorage.getItem('keyboardForced');
    return saved === null ? true : saved === 'true';
  });
  const [scanMode, setScanMode] = useState('manual');

  // New states for auto-ticket flow
  const [ticketModal, setTicketModal] = useState(null);
  const [extraCantidad, setExtraCantidad] = useState(1);
  const [duplicateError, setDuplicateError] = useState(null);
  const [isAskingTicket, setIsAskingTicket] = useState(false);

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

  // Focus management: always keep input focused unless camera active or editing price
  useEffect(() => {
    const keepFocus = () => {
      if (isEditingPrice || isAskingTicket || scanMode === 'camera') return;
      // We removed "if (ticketModal) return;" so that the user can scan another item instantly
      if (inputRef.current && mode) {
        inputRef.current.focus();
      }
    };
    const interval = setInterval(keepFocus, 300);
    return () => clearInterval(interval);
  }, [mode, isEditingPrice, result, scanMode, ticketModal]);

  // Live text search (non-barcode)
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

  // ── CORE: Auto-add ticket then show modal OR show duplicate error ────────
  const triggerTicketFlow = useCallback((product) => {
    // 0. Check for duplicates
    const isDuplicate = ticketSpool && ticketSpool.some(t => t.id === product.id || t.barcode === product.barcode);
    
    if (isDuplicate) {
      setDuplicateError(product);
      setBarcode('');
      setFilteredList([]);
      setResult(null);
      setNotFoundBarcode('');
      setScanMode('manual');
      setTimeout(() => setDuplicateError(null), 3000);
      return; // Skip adding to spool and skip showing the modal
    }

    // 1. Immediately add 1 ticket to spool
    addToSpool(product);

    // 2. Show extra qty modal (as a non-blocking toast at the bottom)
    setTicketModal({ product });
    setExtraCantidad(1);

    // 3. Reset search bar immediately (ready for next scan)
    setBarcode('');
    setFilteredList([]);
    setResult(null);
    setNotFoundBarcode('');
    setScanMode('manual');

    // 4. Flash success briefly
    setShowSyncSuccess(true);
    setTimeout(() => setShowSyncSuccess(false), 800);
  }, [addToSpool, ticketSpool]);

  // Add extra tickets from modal
  const handleAddExtra = () => {
    if (!ticketModal) return;
    for (let i = 0; i < extraCantidad; i++) {
      addToSpool(ticketModal.product);
    }
    setShowSyncSuccess(true);
    setTimeout(() => setShowSyncSuccess(false), 800);
    closeModal();
  };

  const closeModal = () => {
    setTicketModal(null);
    setExtraCantidad(1);
    setTimeout(() => {
      if (inputRef.current) inputRef.current.focus();
    }, 100);
  };

  const handleTicketDecision = (wantTicket) => {
    if (wantTicket) {
      addToSpool(result);
      setShowSyncSuccess(true);
      setTimeout(() => {
        setShowSyncSuccess(false);
        setResult(null);
        setScanMode('manual');
        if (inputRef.current) inputRef.current.focus();
      }, 1000);
    } else {
      setResult(null);
      setScanMode('manual');
      if (inputRef.current) inputRef.current.focus();
    }
    setIsAskingTicket(false);
  };

  // Product selected from list
  const handleSelectProduct = (product) => {
    setFilteredList([]);
    if (mode === 'ticket') {
      triggerTicketFlow(product);
    } else {
      setResult(product);
      setBarcode('');
    }
  };

  // Barcode/text search
  const handleSearch = async (e, forcedBarcode = null) => {
    if (e) e.preventDefault();
    const finalBarcode = (forcedBarcode || barcode).trim();
    if (!finalBarcode) return;
    if (/^\d+$/.test(finalBarcode) && finalBarcode.length > 5) {
      try {
        const resExact = await fetch(`${API_BASE}/product/${encodeURIComponent(finalBarcode)}`);
        const pExact = await resExact.json();
        if (pExact && pExact.id) {
          if (mode === 'ticket') {
            triggerTicketFlow(pExact);
          } else {
            setResult(pExact);
            setNotFoundBarcode('');
            setBarcode('');
            setScanMode('manual');
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

  // MODE SELECTION
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

      {/* ── TICKET QUANTITY MODAL (NON-BLOCKING OVERLAY) ──────────────── */}
      {ticketModal && (
        <div className="ticket-modal-overlay">
          <div className="ticket-modal-card animate-slideUp">
            <div className="tmo-header">
              <div className="tmo-check">✅</div>
              <div className="tmo-added-label">1 TICKET AÑADIDO</div>
              <div className="tmo-product-name">{ticketModal.product.name}</div>
              <div className="tmo-price">€{parseFloat(ticketModal.product.sell_price).toFixed(2)}</div>
            </div>

            <div className="tmo-body">
              <div className="tmo-qty-label">¿AÑADIR MÁS TICKETS? (OPCIONAL)</div>
              <div className="tmo-qty-row">
                <button className="tmo-qty-btn minus" onClick={() => setExtraCantidad(q => Math.max(1, q - 1))}>－</button>
                <span className="tmo-qty-num">{extraCantidad}</span>
                <button className="tmo-qty-btn plus" onClick={() => setExtraCantidad(q => q + 1)}>＋</button>
              </div>
              <div className="tmo-actions">
                <button className="tmo-btn-add" onClick={handleAddExtra}>
                  ＋ AÑADIR {extraCantidad} MÁS
                </button>
                <button className="tmo-btn-close" onClick={closeModal}>
                  ✔ LISTO
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── STICKY SEARCH HEADER ──────────────────────────────────────────── */}
      <div className="search-sticky-header">
        <button className="btn-back-mode" onClick={() => { if (!forceMode) setMode(null); setResult(null); setTicketModal(null); }}>✖</button>

        <div className={`precio-search-bar ${scanMode === 'camera' ? 'cam-on' : ''}`}>
          {scanMode === 'manual' ? (
            <>
              <label htmlFor="price-input-mobile" className="precio-icon-glass" style={{ 'pointerEvents': 'none' }}>
                {mode === 'ticket' ? '🎫' : '🔍'}
              </label>
              <input
                id="price-input-mobile"
                ref={inputRef}
                type="text"
                placeholder={mode === 'ticket' ? "Escanea para ticket..." : "Escanea o escribe código..."}
                inputMode={keyboardForced ? "text" : "none"}
                autoComplete="off"
                spellCheck="false"
                enterKeyHint="search"
                value={barcode}
                onChange={(e) => { setBarcode(e.target.value); if (result) setResult(null); }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.target.blur();
                    handleSearch();
                  }
                }}
                autoFocus
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

        {mode === 'ticket' && (
          <div className="ticket-mode-badge">🎫 AUTO</div>
        )}
      </div>

      <div className="precio-content-scroll">
        {scanMode === 'camera' && (
          <div className="camera-wrapper-v3 animate-pop">
            <CameraScanner onScan={handleCameraScan} />
          </div>
        )}

        {/* Success Banner */}
        {showSyncSuccess && !duplicateError && (
          <div className="sync-banner-modern animate-pop" style={{ background: mode === 'edit' ? '#003986' : '#16A34A' }}>
            {mode === 'edit' ? '✅ PRECIO ACTUALIZADO' : '✅ TICKET EN COLA'}
          </div>
        )}

        {/* Duplicate Error Banner */}
        {duplicateError && (
          <div className="sync-banner-modern duplicate-banner animate-pop">
            ⚠️ ¡El ticket de <strong>{duplicateError.name || duplicateError.barcode}</strong> ya se ha generado antes!
          </div>
        )}

        {mode === 'ticket' && !result && filteredList.length === 0 && !showSyncSuccess && !duplicateError && (
          <div className="ticket-scan-guide animate-slideUp">
            <div className="tsg-icon">📡</div>
            <div className="tsg-title">LISTO PARA ESCANEAR</div>
            <div className="tsg-sub">Escanea un producto. El ticket se añade automáticamente y el buscador queda listo al instante.</div>
          </div>
        )}

        {/* Live results */}
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

        {/* Edit mode product card */}
        {result && result !== 'not_found' && mode === 'edit' && (
          <div className="product-details-card animate-slideUp">
            <div className="card-main-header">
              <h2>{result.name}</h2>
              <span className="barcode-badge">{result.barcode}</span>
            </div>

            <div className="content-area">
              {isAskingTicket ? (
                <div className="ticket-prompt-v2" style={{ textAlign: 'center', padding: '40px 20px' }}>
                  <p style={{fontSize: '18px', marginBottom: '20px', color: '#1e293b', fontWeight: '950'}}>
                    ¿Generar ticket para <br/><span style={{color: '#16A34A', fontSize: '22px'}}>{result.name}</span>?
                  </p>
                  <div className="prompt-actions-v2" style={{display: 'flex', gap: '15px', marginTop: '30px'}}>
                    <button className="btn-no" style={{flex: 1, padding: '20px', borderRadius: '15px', background: '#f1f5f9', color: '#64748b', fontWeight: '950', border: 'none', fontSize: '13px'}} 
                      onClick={() => handleTicketDecision(false)}>
                      ✖ NO GRACIAS
                    </button>
                    <button className="btn-yes" style={{flex: 1, padding: '20px', borderRadius: '15px', background: '#16A34A', color: '#fff', fontWeight: '950', border: 'none', fontSize: '13px', boxShadow: '0 8px 20px rgba(22,163,74,0.2)'}} 
                      onClick={() => handleTicketDecision(true)}>
                      🎫 SÍ, IMPRIMIR
                    </button>
                  </div>
                </div>
              ) : isEditingPrice ? (
                <EditProductView
                  product={result}
                  onUpdate={async (idOrResult, payloadOrFlag) => {
                    if (payloadOrFlag !== true) {
                      // First callback from EditProductView: save to DB
                      if (onUpdateProduct) {
                        return await onUpdateProduct(idOrResult, payloadOrFlag);
                      }
                      return true;
                    } else {
                      // Second callback: Transition UI after success
                      setResult(idOrResult);
                      setIsEditingPrice(false);
                      setShowSyncSuccess(true);
                      setTimeout(() => { 
                        setShowSyncSuccess(false); 
                        setIsAskingTicket(true);
                      }, 800);
                    }
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
                  <button className="btn-edit-main" onClick={() => setIsEditingPrice(true)} style={{ marginTop: "20px" }}>EDITAR PRODUCTO</button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      <style>{`
        .precio-viewer-v3 { width: 100%; height: 100%; display: flex; flex-direction: column; background: #fff; }
        .search-sticky-header { width: 100%; padding: 10px; box-sizing: border-box; display: flex; align-items: center; gap: 8px; border-bottom: 1px solid #f1f5f9; background: #fff; z-index: 50; }
        
        .ticket-mode-badge {
          background: #16A34A; color: #fff; font-size: 10px; font-weight: 950;
          padding: 6px 12px; border-radius: 20px; white-space: nowrap; letter-spacing: 0.5px;
          animation: pulse-badge 2s infinite;
        }
        @keyframes pulse-badge { 0%,100% { opacity: 1; } 50% { opacity: 0.6; } }

        .btn-back-mode { background: #f1f5f9; border: none; width: 40px; height: 40px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 16px; color: #64748b; flex-shrink: 0; }
        
        .precio-search-bar { 
          flex: 1; display: flex; align-items: center; background: #fff; border: 2px solid #e2e8f0; border-radius: 50px; padding: 0 5px 0 15px; height: 50px; gap: 6px; transition: 0.3s cubic-bezier(0.4, 0, 0.2, 1); box-shadow: 0 4px 15px rgba(0,0,0,0.03); box-sizing: border-box;
          position: relative;
        }
        .precio-search-bar:focus-within { border-color: #16A34A; box-shadow: 0 4px 20px rgba(22, 163, 74, 0.15); }
        .precio-search-bar.cam-on { border-color: #EA580C; background: #fffaf5; }
        .precio-icon-glass { font-size: 16px; opacity: 0.7; pointer-events: none; }
        .precio-search-bar input { flex: 1; min-width: 0; border: none; background: transparent; padding: 10px 0; font-size: 15px; font-weight: 800; outline: none; color: #000000; box-sizing: border-box; }
        
        .precio-actions-group { display: flex; gap: 4px; align-items: center; flex-shrink: 0; }
        .btn-keyboard-toggle { background: transparent; color: #94a3b8; border: none; display: flex; align-items: center; justify-content: center; width: 36px; height: 36px; border-radius: 50%; transition: 0.2s; font-size: 14px; }
        .btn-keyboard-toggle.active { background: #f1f5f9; color: #16A34A; }
        .btn-camera { border: none; color: #fff; display: flex; align-items: center; justify-content: center; width: 36px; height: 36px; border-radius: 50%; box-shadow: 0 4px 12px rgba(0,0,0,0.15); transition: 0.2s; font-size: 14px; }

        .camera-active-banner { flex: 1; display: flex; justify-content: space-between; align-items: center; font-weight: 950; font-size: 13px; color: #EA580C; letter-spacing: 0.5px; padding: 0 10px; }
        .btn-exit-scan { background: #EA580C; color: #fff; border: none; padding: 8px 18px; border-radius: 20px; font-size: 11px; font-weight: 950; text-transform: uppercase; }

        .precio-content-scroll { flex: 1; padding: 20px 15px; overflow-y: auto; padding-bottom: 300px; /* Space for toast modal */ }
        .camera-wrapper-v3 { border-radius: 30px; overflow: hidden; border: 4px solid #f1f5f9; margin-bottom: 30px; }

        /* Guide */
        .ticket-scan-guide { text-align: center; padding: 60px 20px; }
        .tsg-icon { font-size: 64px; margin-bottom: 20px; animation: radar 2s ease-in-out infinite; }
        @keyframes radar { 0%,100% { transform: scale(1); opacity: 1; } 50% { transform: scale(1.1); opacity: 0.7; } }
        .tsg-title { font-size: 18px; font-weight: 950; color: #16A34A; margin-bottom: 10px; letter-spacing: 1px; }
        .tsg-sub { font-size: 13px; color: #94a3b8; font-weight: 700; max-width: 280px; margin: 0 auto; line-height: 1.6; }

        /* General lists / banners */
        .live-results-list { display: flex; flex-direction: column; gap: 8px; margin-bottom: 30px; }
        .live-result-item { background: #fff; padding: 15px 20px; display: flex; justify-content: space-between; border-radius: 18px; border: 1px solid #f1f5f9; cursor: pointer; transition: 0.2s; }
        .live-result-item:hover { transform: scale(1.02); border-color: #16A34A; }
        .item-name { font-weight: 950; color: #0f172a; text-transform: uppercase; font-size: 14px; display: block; }
        .item-barcode { font-size: 11px; color: #94a3b8; font-family: monospace; }
        .item-price { font-weight: 950; color: #16A34A; font-size: 17px; }

        .error-card-v3 { background: #fff; border: 3px dashed #cbd5e1; padding: 60px 30px; border-radius: 35px; text-align: center; }
        .warn-icon { font-size: 50px; margin-bottom: 20px; }
        .ean-failed { font-family: monospace; font-size: 18px; color: #94a3b8; margin: 10px 0 30px; }
        .btn-quick-add { background: #EA580C; color: #fff; border: none; padding: 20px 40px; border-radius: 20px; font-weight: 950; }

        .sync-banner-modern { padding: 18px; border-radius: 20px; color: #fff; font-weight: 950; text-align: center; margin-bottom: 20px; box-shadow: 0 10px 20px rgba(0,0,0,0.1); }
        .duplicate-banner { background: #EA580C !important; }

        /* Edit Mode Card */
        .product-details-card { background: #fff; border-radius: 35px; box-shadow: 0 25px 50px rgba(0,0,0,0.1); border: 1px solid #f1f5f9; overflow: hidden; }
        .card-main-header { padding: 35px 25px; border-bottom: 1.5px solid #f8fafc; text-align: center; }
        .card-main-header h2 { font-size: 24px; font-weight: 950; color: #0f172a; text-transform: uppercase; margin-bottom: 8px; }
        .barcode-badge { font-size: 12px; transform: scale(1.1); color: #94a3b8; background: #f8fafc; padding: 4px 15px; border-radius: 10px; font-family: monospace; }
        .price-hero-modern { background: #f8fafc; padding: 45px 20px; border-radius: 30px; text-align: center; margin: 0 20px 30px; border: 1px solid #e2e8f0; }
        .h-label { display: block; font-size: 12px; font-weight: 950; color: #94a3b8; letter-spacing: 1px; margin-bottom: 10px; }
        .h-value { font-size: 72px; font-weight: 950; color: #003986; line-height: 1; display: block; margin-bottom: 25px; }
        .btn-edit-main { background: #003986; color: #fff; border: none; padding: 18px 40px; border-radius: 20px; font-weight: 950; font-size: 13px; box-shadow: 0 10px 20px rgba(0, 57, 134, 0.1); }

        /* ── TICKET MODAL ─────────────────────────────────────────────────── */
        .ticket-modal-overlay {
          position: fixed; bottom: 0; left: 0; right: 0; z-index: 100000;
          display: flex; justify-content: center; pointer-events: none;
        }
        .ticket-modal-card {
          pointer-events: auto;
          background: #fff; border-radius: 32px 32px 0 0;
          width: 100%; max-width: 480px; padding: 20px 24px 30px;
          box-shadow: 0 -20px 60px rgba(0,0,0,0.25);
          border: 1px solid #e2e8f0; border-bottom: none;
        }
        .tmo-header { text-align: center; margin-bottom: 18px; }
        .tmo-check { font-size: 32px; margin-bottom: 5px; animation: pop-bounce 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275); }
        @keyframes pop-bounce { from { transform: scale(0); opacity: 0; } to { transform: scale(1); opacity: 1; } }
        .tmo-added-label { font-size: 10px; font-weight: 950; color: #16A34A; letter-spacing: 1.5px; margin-bottom: 4px; }
        .tmo-product-name { font-size: 14px; font-weight: 950; color: #0f172a; text-transform: uppercase; line-height: 1.2; margin-bottom: 4px; }
        .tmo-price { font-size: 20px; font-weight: 950; color: #16A34A; }

        .tmo-qty-label { text-align: center; font-size: 9px; font-weight: 950; color: #94a3b8; letter-spacing: 1px; margin-bottom: 10px; }
        .tmo-qty-row {
          display: flex; align-items: center; justify-content: center; gap: 20px;
          background: #f8fafc; border-radius: 20px; padding: 12px; margin-bottom: 15px;
        }
        .tmo-qty-btn {
          width: 44px; height: 44px; border-radius: 50%; border: none;
          background: #fff; font-size: 20px; font-weight: 950; cursor: pointer;
          box-shadow: 0 4px 10px rgba(0,0,0,0.06); transition: transform 0.1s;
        }
        .tmo-qty-btn:active { transform: scale(0.9); }
        .tmo-qty-btn.minus { color: #64748b; }
        .tmo-qty-btn.plus { color: #16A34A; }
        .tmo-qty-num { font-size: 32px; font-weight: 950; color: #1e293b; min-width: 44px; text-align: center; }

        .tmo-actions { display: flex; gap: 10px; }
        .tmo-btn-add {
          flex: 2; padding: 14px; border-radius: 16px; border: none;
          background: #16A34A; color: #fff; font-size: 12px; font-weight: 950;
          box-shadow: 0 8px 16px rgba(22, 163, 74, 0.2); cursor: pointer;
        }
        .tmo-btn-close {
          flex: 1; padding: 14px; border-radius: 16px; border: 2px solid #e2e8f0;
          background: #fff; color: #475569; font-size: 11px; font-weight: 950; cursor: pointer;
        }

        .animate-pop { animation: pop 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275); }
        .animate-slideUp { animation: slideUp 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275); }
        @keyframes pop { from { scale: 0.8; opacity: 0; } to { scale: 1; opacity: 1; } }
        @keyframes slideUp { from { transform: translateY(100%); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
      `}</style>
    </div>
  );
};

export default PrecioView;
