import React, { useState, useRef, useEffect } from 'react';

const AddProductView = ({ onSave, onBack, initialBarcode = '', CameraScanner }) => {
  const [formData, setFormData] = useState({
    barcode: initialBarcode,
    name: '',
    price_buy: '',
    sell_price: '',
    stock: '',
    offer: '0',
    expiry: ''
  });
  const [margin, setMargin] = useState('0.0%');
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [askTicket, setAskTicket] = useState(false);
  const [savedProduct, setSavedProduct] = useState(null);
  const [cantidad, setCantidad] = useState(1);
  const [showCamera, setShowCamera] = useState(false);

  const [keyboardForced, setKeyboardForced] = useState(() => {
    const saved = localStorage.getItem('keyboardForced');
    return saved === null ? true : saved === 'true';
  });
  const barcodeRef = useRef(null);
  const nameRef = useRef(null);
  const dateRef = useRef(null);

  useEffect(() => {
    const keepFocus = () => {
      const isMobile = window.innerWidth < 1024;
      if (isMobile && keyboardForced) return;
      const activeEl = document.activeElement;
      const isOtherInputActive = activeEl && (activeEl.tagName === 'INPUT' || activeEl.tagName === 'TEXTAREA') && activeEl !== barcodeRef.current;

      if (!isOtherInputActive && barcodeRef.current && !formData.barcode && !askTicket) {
        barcodeRef.current.focus();
      }
    };
    const interval = setInterval(keepFocus, 500);
    return () => clearInterval(interval);
  }, [formData.barcode, askTicket, keyboardForced]);

  useEffect(() => {
    if (barcodeRef.current && !initialBarcode) {
      barcodeRef.current.focus();
    }
  }, [initialBarcode]);

  const toggleKeyboard = (targetRef) => {
    const newState = !keyboardForced;
    setKeyboardForced(newState);
    localStorage.setItem('keyboardForced', newState);
    if (targetRef && targetRef.current) {
      const el = targetRef.current;
      el.blur();
      setTimeout(() => {
        el.setAttribute('inputmode', newState ? "text" : "numeric");
        el.focus();
      }, 200);
    }
  };

  useEffect(() => {
    const buy = parseFloat(formData.price_buy) || 0;
    const sell = parseFloat(formData.sell_price) || 0;
    if (buy > 0 && sell > 0) {
      const m = ((sell - buy) / buy * 100).toFixed(1);
      setMargin(m + '%');
    } else {
      setMargin('0.0%');
    }
  }, [formData.price_buy, formData.sell_price]);

  const handleChange = (e) => {
    const { name, value, checked } = e.target;
    let finalValue = name === 'name' ? value.toUpperCase() : value;

    if (name === 'offer') {
      finalValue = checked ? '1' : '0';
    } else if (['price_buy', 'sell_price', 'stock'].includes(name)) {
      finalValue = finalValue.replace(',', '.');
      if (finalValue !== '' && !/^[0-9]*\.?[0-9]*$/.test(finalValue)) {
        return;
      }
    }
    setFormData(prev => ({ ...prev, [name]: finalValue }));
  };

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    if (isSaving) return;
    setIsSaving(true);
    const dataToSave = {
      barcode: formData.barcode,
      name: formData.name,
      price_buy: formData.price_buy,
      sell_price: formData.sell_price,
      offer: formData.offer,
      stock_current: parseInt(formData.stock) || 0,
      expiry: formData.expiry
    };
    const result = await onSave(dataToSave);
    if (result && result.success) {
      setSavedProduct(result.product || { ...dataToSave, id: result.id });
      setSaveSuccess(true);
      setTimeout(() => {
        setSaveSuccess(false);
        setAskTicket(true);
      }, 500);
    } else {
      alert(result?.error || 'Error al guardar');
      setIsSaving(false);
    }
  };

  const resetForm = () => {
    setFormData({ barcode: '', name: '', price_buy: '', sell_price: '', stock: '', offer: '0', expiry: '' });
    setMargin('0.0%');
    setIsSaving(false);
    setSaveSuccess(false);
    setAskTicket(false);
    setSavedProduct(null);
    setCantidad(1);
    setTimeout(() => { if (barcodeRef.current) barcodeRef.current.focus(); }, 100);
  };

  const handleTicketDecision = (wantTicket) => {
    if (wantTicket) { onBack(true, { product: savedProduct, qty: cantidad }); }
    else { onBack(false); }
    resetForm();
  };

  if (askTicket) {
    return (
      <div className="add-success-screen">
        <div className="success-lottie-placeholder">✅</div>
        <h2>GUARDADO CON EXITO</h2>
        <p>¿Añadir tickets de <strong>{savedProduct.name}</strong>?</p>
        <div className="qty-label">CANTIDAD DE TICKETS</div>
        <div className="qty-prompt-picker">
          <button type="button" onClick={() => setCantidad(Math.max(1, cantidad - 1))}> - </button>
          <span>{cantidad}</span>
          <button type="button" onClick={() => setCantidad(cantidad + 1)}> + </button>
        </div>
        <div className="decision-actions">
          <button type="button" className="btn-yes" onClick={() => handleTicketDecision(true)}>SI, AÑADIR</button>
          <button type="button" className="btn-no" onClick={() => handleTicketDecision(false)}>NO, VOLVER</button>
        </div>
        <style>{`
          .add-success-screen { padding: 40px 20px; text-align: center; height: 100%; display: flex; flex-direction: column; justify-content: center; align-items: center; background: #fff; }
          .success-lottie-placeholder { font-size: 80px; margin-bottom: 20px; animation: pop 0.5s; }
          .add-success-screen h2 { font-weight: 950; color: #16A34A; margin-bottom: 10px; }
          .qty-label { font-size: 10px; font-weight: 950; color: #94a3b8; margin-bottom: 10px; }
          .qty-prompt-picker { display: flex; align-items: center; gap: 20px; margin-bottom: 40px; background: #f1f5f9; padding: 15px 30px; border-radius: 20px; }
          .qty-prompt-picker button { width: 45px; height: 45px; border-radius: 50%; border: none; background: #fff; font-weight: 950; font-size: 20px; }
          .qty-prompt-picker span { font-size: 32px; font-weight: 950; }
          .btn-yes { background: #16A34A; color: white; border: none; padding: 20px; border-radius: 16px; font-weight: 950; width: 100%; box-shadow: 0 8px 16px rgba(22, 163, 74, 0.2); }
          .btn-no { background: #f1f5f9; color: #64748b; border: none; padding: 18px; border-radius: 16px; font-weight: 950; width: 100%; margin-top: 10px; }
          @keyframes pop { from { scale: 0.5; opacity: 0; } to { scale: 1; opacity: 1; } }
        `}</style>
      </div>
    );
  }

  return (
    <div className="add-product-view-modern">
      {showCamera && CameraScanner && (
        <div className="camera-overlay-mini">
          <div className="camera-container-v2">
            <button type="button" className="camera-top-close-btn" onClick={() => setShowCamera(false)}>✕</button>
            <CameraScanner onScan={(code) => { setFormData(prev => ({ ...prev, barcode: code })); setShowCamera(false); }} />
            <button type="button" className="btn-close-cam" onClick={() => setShowCamera(false)}>CERRAR</button>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="modern-form">
        <div className="form-section">
          <label>CÓDIGO DE BARRAS / EAN</label>
          <div className="input-with-icon">
            <input ref={barcodeRef} name="barcode" type="tel" inputMode="numeric" value={formData.barcode} onChange={handleChange} placeholder="Escanea o escribe..." required />
            <div className="input-actions-mini">
              <div
                className={`keyboard-mini-icon ${keyboardForced ? 'active' : ''}`}
                onClick={() => toggleKeyboard(barcodeRef)}
                title="Toggle Keyboard"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" width="18" height="18">
                  <path d="M21 15a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                  <line x1="7" y1="10" x2="7" y2="10" />
                  <line x1="11" y1="10" x2="11" y2="10" />
                  <line x1="15" y1="10" x2="15" y2="10" />
                  <line x1="7" y1="14" x2="7" y2="14" />
                  <line x1="11" y1="14" x2="11" y2="14" />
                  <line x1="15" y1="14" x2="15" y2="14" />
                </svg>
              </div>
              <div className="scan-mini-icon" onClick={() => setShowCamera(true)}>
                <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" width="20" height="20"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" /><circle cx="12" cy="13" r="4" /></svg>
              </div>
            </div>
          </div>
        </div>

        <div className="form-section">
          <label>NOMBRE DEL PRODUCTO</label>
          <input ref={nameRef} name="name" value={formData.name} onChange={handleChange} placeholder="Nombre del artículo" required maxLength="28" className="uppercase" />
        </div>

        <div className="dual-row">
          <div className="form-section">
            <label>PRECIO COMPRA</label>
            <div className="price-input-wrapper">
              <span className="currency-prefix">€</span>
              <input name="price_buy" type="text" inputMode="decimal" value={formData.price_buy} onChange={handleChange} placeholder="Ej: 1.20" required />
            </div>
          </div>
          <div className="form-section">
            <label>PRECIO VENTA</label>
            <div className="price-input-wrapper">
              <span className="currency-prefix">€</span>
              <input name="sell_price" type="text" inputMode="decimal" value={formData.sell_price} onChange={handleChange} placeholder="Ej: 1.99" required />
            </div>
          </div>
        </div>

        <div className="stats-row-modern">
          <div className="stat-pill">
            <span className="stat-label">MARGEN ESTIMADO</span>
            <span className="stat-value">{margin}</span>
          </div>
          <div className="stat-pill">
            <span className="stat-label">STOCK INICIAL</span>
            <input name="stock" type="text" inputMode="numeric" value={formData.stock} onChange={handleChange} placeholder="0" required className="mini-input" />
          </div>
        </div>

        <div className="form-section promo-toggle-section">
          <div className="promo-label-box">
            <label>PROMO 2ª UNIDAD -50%</label>
          </div>
          <label className="switch">
            <input type="checkbox" name="offer" checked={formData.offer === '1'} onChange={handleChange} />
            <span className="slider round"></span>
          </label>
        </div>

        <div className="form-section calendar-section">
          <label>FECHA DE CADUCIDAD</label>
          <div className="modern-date-picker">
            <input ref={dateRef} type="date" name="expiry" value={formData.expiry} onChange={handleChange} className="native-date-input" />
          </div>
        </div>

        <button type="submit" className="btn-main-save" disabled={isSaving}>
          {isSaving ? 'GUARDANDO...' : '✅ GUARDAR PRODUCTO'}
        </button>
      </form>

      <style>{`
        .add-product-view-modern { padding: 15px; background: #fff; height: 100%; overflow-y: auto; position: relative; }
        .camera-overlay-mini { position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.9); z-index: 1000; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 20px; }
        .camera-container-v2 { width: 100%; max-width: 400px; background: #000; border-radius: 20px; overflow: hidden; position: relative; border: 2px solid #004691; }
        .camera-top-close-btn { position: absolute; top: 15px; right: 15px; width: 35px; height: 35px; background: rgba(0,0,0,0.5); color: #fff; border: none; border-radius: 50%; }
        .btn-close-cam { width: 100%; background: #1f2937; color: #fff; border: none; padding: 15px; font-weight: 950; }

        .modern-form { display: flex; flex-direction: column; gap: 18px; padding-bottom: 30px; }
        .form-section label { font-size: 10px; font-weight: 950; color: #94a3b8; display: block; margin-bottom: 6px; }
        .input-with-icon { position: relative; }
        .input-actions-mini { position: absolute; right: 8px; top: 50%; transform: translateY(-50%); display: flex; gap: 8px; }
        .keyboard-mini-icon { width: 42px; height: 42px; background: #f1f5f9; color: #64748b; border: none; border-radius: 50%; display: flex; align-items: center; justify-content: center; cursor: pointer; transition: 0.2s; }
        .keyboard-mini-icon.active { background: #004691; color: #fff; box-shadow: 0 4px 12px rgba(0, 70, 145, 0.3); }
        .scan-mini-icon { width: 42px !important; height: 42px !important; background: #004691 !important; color: #fff !important; border: none !important; border-radius: 50% !important; display: flex !important; align-items: center !important; justify-content: center !important; cursor: pointer !important; box-shadow: 0 4px 12px rgba(0, 70, 145, 0.3) !important; z-index: 10; }
        
        input:not(.mini-input) { width: 100%; min-width: 0; background: #f8fafc; border: 2.5px solid #f1f5f9; border-radius: 12px; padding: 14px 18px; font-size: 16px; font-weight: 800; outline: none; color: #000000; }
        input:focus { border-color: #004691; }

        .dual-row { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
        .price-input-wrapper { position: relative; }
        .currency-prefix { position: absolute; left: 15px; top: 50%; transform: translateY(-50%); font-weight: 900; color: #94a3b8; }
        .price-input-wrapper input { padding-left: 35px !important; }

        .stats-row-modern { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
        .stat-pill { background: #f8fafc; border: 2.5px solid #f1f5f9; border-radius: 12px; padding: 12px; }
        .stat-label { font-size: 9px; font-weight: 950; color: #94a3b8; }
        .stat-value { font-size: 18px; font-weight: 950; }
        .mini-input { border: none !important; background: transparent !important; padding: 0 !important; font-size: 18px !important; font-weight: 950 !important; width: 100%; outline: none; color: #000000; }

        .promo-toggle-section { display: flex; justify-content: space-between; align-items: center; background: #f0fdf4; padding: 15px; border-radius: 14px; border: 2px dashed #16A34A; }
        .switch { position: relative; display: inline-block; width: 44px; height: 24px; }
        .switch input { opacity: 0; width: 0; height: 0; }
        .slider { position: absolute; cursor: pointer; top: 0; left: 0; right: 0; bottom: 0; background-color: #cbd5e1; transition: .4s; border-radius: 34px; }
        .slider:before { position: absolute; content: ""; height: 16px; width: 16px; left: 4px; bottom: 4px; background-color: white; borderRadius: 50%; transition: .4s; }
        input:checked + .slider { background-color: #16A34A; }
        input:checked + .slider:before { transform: translateX(20px); }

        .native-date-input { width: 100%; background: #f8fafc; border: 2.5px solid #f1f5f9; border-radius: 12px; padding: 12px; font-weight: 800; font-family: inherit; }

        .btn-main-save { background: #004691; color: #fff; border: none; padding: 18px; border-radius: 16px; font-size: 16px; font-weight: 950; margin-top: 10px; width: 100%; box-shadow: 0 8px 16px rgba(0, 70, 145, 0.2); }
        @keyframes pop { from { scale: 0.9; opacity: 0; } to { scale: 1; opacity: 1; } }
      `}</style>
    </div>
  );
};

export default React.memo(AddProductView);









