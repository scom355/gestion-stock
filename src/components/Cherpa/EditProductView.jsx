import React, { useState, useRef, useEffect } from 'react';

const EditProductView = ({ product, onUpdate, onCancel, CameraScanner }) => {
  const [formData, setFormData] = useState({
    id: product.id,
    barcode: product.barcode || '',
    name: product.name || '',
    price_buy: product.price_buy || '',
    sell_price: product.sell_price || '',
    stock: product.stock_current || '0',
    offer: product.offer || '0',
    expiry: product.expiry || ''
  });
  const [margin, setMargin] = useState('0.0%');
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [showCamera, setShowCamera] = useState(false);

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

  const handleDateClick = () => {
    if (dateRef.current) {
      try {
        if (dateRef.current.showPicker) {
          dateRef.current.showPicker();
        } else {
          dateRef.current.focus();
          dateRef.current.click();
        }
      } catch (e) { dateRef.current.click(); }
    }
  };

  const barcodeRef = useRef(null);
  const dateRef = useRef(null);

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    if (isSaving) return;

    setIsSaving(true);
    const dataToUpdate = {
      barcode: formData.barcode,
      name: formData.name,
      price_buy: formData.price_buy,
      sell_price: formData.sell_price,
      offer: formData.offer,
      stock_current: parseInt(formData.stock) || 0,
      expiry: formData.expiry
    };

    const result = await onUpdate(product.id, dataToUpdate);
    if (result) {
      setSaveSuccess(true);
      setTimeout(() => {
        setSaveSuccess(false);
        onUpdate({ ...product, ...dataToUpdate }, true);
      }, 800);
    } else {
      setIsSaving(false);
    }
  };

  return (
    <div className="edit-product-view-modern">
      {showCamera && CameraScanner && (
        <div className="camera-overlay-mini">
           <div className="camera-container-v2">
              <button type="button" className="camera-top-close-btn" onClick={() => setShowCamera(false)}>✕</button>
              <CameraScanner 
                onScan={(code) => {
                  setFormData(prev => ({ ...prev, barcode: code }));
                  setShowCamera(false);
                }} 
              />
              <button type="button" className="btn-close-cam" onClick={() => setShowCamera(false)}>CERRAR</button>
           </div>
        </div>
      )}

      {saveSuccess && <div className="edit-success-banner">✅ ACTUALIZADO</div>}

      <form onSubmit={handleSubmit} className="modern-form">
        <div className="form-section">
          <label>CÓDIGO DE BARRAS</label>
          <div className="input-with-icon">
              <input ref={barcodeRef} name="barcode" type="text" inputMode="numeric" value={formData.barcode} onChange={handleChange} required />
              <div className="scan-mini-icon" onClick={() => setShowCamera(true)}>📸</div>
          </div>
        </div>

        <div className="form-section">
          <label>NOMBRE DEL PRODUCTO</label>
          <input name="name" value={formData.name} onChange={handleChange} required maxLength="35" autoComplete="off" />
        </div>

        <div className="dual-row">
          <div className="form-section">
            <label>P. COMPRA (€)</label>
            <div className="price-input-wrapper">
              <span className="currency-prefix">€</span>
              <input name="price_buy" type="text" inputMode="decimal" value={formData.price_buy} onChange={handleChange} required />
            </div>
          </div>
          <div className="form-section">
            <label>P. VENTA (€)</label>
            <div className="price-input-wrapper">
              <span className="currency-prefix">€</span>
              <input name="sell_price" type="text" inputMode="decimal" value={formData.sell_price} onChange={handleChange} required />
            </div>
          </div>
        </div>

        <div className="stats-row-modern">
          <div className="stat-pill">
            <span className="stat-label">MARGEN</span>
            <span className="stat-value">{margin}</span>
          </div>
          <div className="stat-pill">
            <span className="stat-label">STOCK</span>
            <input name="stock" type="text" inputMode="numeric" value={formData.stock} onChange={handleChange} required className="mini-input" />
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

        <div className="actions-row-edit">
          <button type="button" className="btn-cancel-edit" onClick={onCancel}>CANCELAR</button>
          <button type="submit" className="btn-save-edit" disabled={isSaving}>
            {isSaving ? 'GUARDANDO...' : '✅ GUARDAR'}
          </button>
        </div>
      </form>

      <style>{`
        .edit-product-view-modern { background: #fff; padding: 10px 0; }
        .modern-form { display: flex; flex-direction: column; gap: 15px; }
        .form-section label { font-size: 10px; font-weight: 950; color: #94a3b8; }
        .input-with-icon { position: relative; }
        .scan-mini-icon { position: absolute; right: 8px; top: 50%; transform: translateY(-50%); cursor: pointer; }
        
        .modern-form input:not(.mini-input) { width: 100%; background: #f8fafc; border: 2.5px solid #f1f5f9; border-radius: 12px; padding: 14px 18px; font-size: 15px; font-weight: 800; outline: none; }
        .modern-form input:focus { border-color: #003986; }

        .dual-row { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
        .price-input-wrapper { position: relative; }
        .currency-prefix { position: absolute; left: 12px; top: 50%; transform: translateY(-50%); font-weight: 900; color: #94a3b8; }
        .price-input-wrapper input { padding-left: 30px !important; }

        .stats-row-modern { display: grid; grid-template-columns: 1.2fr 1fr; gap: 12px; }
        .stat-pill { background: #f8fafc; border: 2.5px solid #f1f5f9; border-radius: 12px; padding: 10px 15px; }
        .mini-input { border: none !important; background: transparent !important; padding: 0 !important; font-size: 18px !important; font-weight: 950 !important; width: 100%; outline: none; }

        .promo-toggle-section { display: flex; justify-content: space-between; align-items: center; background: #f0fdf4; padding: 12px 15px; border-radius: 14px; border: 2px dashed #16A34A; }
        .switch { position: relative; display: inline-block; width: 44px; height: 24px; }
        .switch input { opacity: 0; width: 0; height: 0; }
        .slider { position: absolute; cursor: pointer; top: 0; left: 0; right: 0; bottom: 0; background-color: #cbd5e1; transition: .4s; border-radius: 34px; }
        .slider:before { position: absolute; content: ""; height: 16px; width: 16px; left: 4px; bottom: 4px; background-color: white; borderRadius: 50%; transition: .4s; }
        input:checked + .slider { background-color: #16A34A; }
        input:checked + .slider:before { transform: translateX(20px); }

        .btn-save-edit { flex: 2; background: #003986; color: #fff; border: none; padding: 16px; border-radius: 14px; font-weight: 950; }
        .btn-cancel-edit { flex: 1; background: #f1f5f9; color: #64748b; border: none; padding: 16px; border-radius: 14px; font-weight: 950; }
      `}</style>
    </div>
  );
};

export default EditProductView;
