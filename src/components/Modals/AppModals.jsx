
import React from 'react';
import CameraScanner from '../Shared/CameraScanner';

const AppModals = React.memo(({
  showAddModal,
  setShowAddModal,
  editingProduct,
  setEditingProduct,
  products,
  lookupBarcode,
  scanMode,
  setScanMode,
  handleSaveProduct,
  handleUpdateProduct,
  handleDeleteProduct
}) => {
  // Local states for controlled inputs to prevent cursor jumps
  const [localAddName, setLocalAddName] = React.useState('');
  const [localEditName, setLocalEditName] = React.useState('');

  // Sync edit name when product changes
  React.useEffect(() => {
    if (editingProduct) {
      setLocalEditName(editingProduct.name || '');
    } else {
      setLocalEditName('');
    }
  }, [editingProduct]);

  // Sync add name when modal opens
  React.useEffect(() => {
    if (!showAddModal) setLocalAddName('');
  }, [showAddModal]);

  const handleNameChange = (e, setter) => {
    const { selectionStart, selectionEnd, value } = e.target;
    const upperValue = value.toUpperCase();
    setter(upperValue);

    // Crucial: Restore cursor position after state update
    // We use requestAnimationFrame to ensure it happens after React render cycle if needed,
    // but usually setting it directly in onChange works in modern React for controlled inputs
    // if we are quick. To be 100% safe, we can use a ref, but let's try direct first.
    setTimeout(() => {
      if (e.target && selectionStart !== null) {
        e.target.setSelectionRange(selectionStart, selectionEnd);
      }
    }, 0);
  };

  return (
    <>
      {/* SMALL FLOATING ADD MODAL */}
      {showAddModal && (
        <div className="modal-overlay" onClick={() => setShowAddModal(false)}>
          <div className="small-add-modal-compact animate-pop" onClick={e => e.stopPropagation()}>
            <div className="modal-header-mini">
              <h3>➕ NUEVO PRODUCTO</h3>
              <button
                className="btn-camera-modal"
                onClick={() => setScanMode(scanMode === 'camera' ? 'manual' : 'camera')}
                style={{ border: 'none', background: '#f0f0f0', padding: '5px 10px', borderRadius: '10px', cursor: 'pointer' }}
              >
                {scanMode === 'camera' ? '🚫 Parar' : '📷 Scan'}
              </button>
              <button className="close-x-btn" onClick={() => { setShowAddModal(false); setScanMode('manual'); }}>×</button>
            </div>

            {scanMode === 'camera' && (
              <div className="modal-camera-box" style={{ width: '100%', height: '180px', overflow: 'hidden', borderRadius: '15px', marginBottom: '15px' }}>
                <CameraScanner onScan={(code) => {
                  const barcodeInput = document.querySelector('input[name="barcode"]');
                  if (barcodeInput) {
                    barcodeInput.value = code;
                    setScanMode('manual');
                    const existing = products.find(p => p.barcode === code);
                    if (existing) alert("⚠️ Este producto ya existe: " + existing.name);
                  }
                }} />
              </div>
            )}

            <form className="carrefour-form-compact" onSubmit={handleSaveProduct}>
              <div className="input-group-compact">
                <label>📦 Código EAN</label>
                <input
                  name="barcode"
                  type="tel"
                  inputMode="numeric"
                  defaultValue={lookupBarcode || ''}
                  placeholder="8480000..."
                  required
                  autoFocus
                  className="input-compact"
                  style={{ textTransform: 'uppercase' }}
                  spellCheck="false"
                  autoComplete="off"
                />
              </div>
              <div className="input-group-compact">
                <label>🏷️ Nombre</label>
                <input
                  name="name"
                  value={localAddName}
                  onChange={(e) => handleNameChange(e, setLocalAddName)}
                  placeholder="Ej: COCA COLA 2L"
                  required
                  maxLength="28"
                  className="input-compact"
                  style={{ textTransform: 'uppercase' }}
                  spellCheck="false"
                  autoComplete="off"
                />
              </div>
              <div className="input-row-triple">
                <div className="input-group-compact">
                  <label>💰 Compra</label>
                  <input
                    name="price_buy"
                    type="text"
                    inputMode="decimal"
                    placeholder="0.00"
                    required
                    className="input-compact"
                    spellCheck="false"
                    autoComplete="off"
                    onChange={(e) => {
                      const { selectionStart, selectionEnd, value } = e.target;
                      const v = value.replace(',', '.');
                      if (v !== '' && !/^[0-9]*\.?[0-9]*$/.test(v)) return;
                      e.target.value = v;
                      if (selectionStart !== null && selectionEnd !== null) {
                        e.target.setSelectionRange(selectionStart, selectionEnd);
                      }
                    }}
                  />
                </div>
                <div className="input-group-compact">
                  <label>💵 Venta</label>
                  <input
                    name="price_sell"
                    type="text"
                    inputMode="decimal"
                    placeholder="0.00"
                    required
                    className="input-compact"
                    spellCheck="false"
                    autoComplete="off"
                    onChange={(e) => {
                      const { selectionStart, selectionEnd, value } = e.target;
                      const v = value.replace(',', '.');
                      if (v !== '' && !/^[0-9]*\.?[0-9]*$/.test(v)) return;
                      e.target.value = v;
                      if (selectionStart !== null && selectionEnd !== null) {
                        e.target.setSelectionRange(selectionStart, selectionEnd);
                      }
                    }}
                  />
                </div>
                <div className="input-group-compact"><label>📊 Margen</label><input name="margin_display" type="text" placeholder="0%" readOnly className="input-compact margin-display" /></div>
              </div>
              <div className="input-row-dual">
                <div className="input-group-compact"><label>📦 Stock</label><input name="stock" type="text" inputMode="numeric" placeholder="Cant." required className="input-compact" /></div>
                <div className="input-group-compact"><label>🎁 Oferta</label><select name="offer" className="input-compact"><option value="0">Sin Oferta</option><option value="50">2ª -50%</option><option value="70">2ª -70%</option></select></div>
              </div>
              <div className="input-group-compact"><label>📅 Caducidad (Opcional)</label><input name="expiry" type="date" className="input-compact" /></div>
              <button type="submit" className="btn-submit-compact">✅ GUARDAR PRODUCTO</button>
            </form>
          </div>
        </div>
      )}

      {/* EDIT PRODUCT MODAL */}
      {editingProduct && (
        <div className="modal-overlay" onClick={() => setEditingProduct(null)}>
          <div className="small-add-modal-compact animate-pop" onClick={e => e.stopPropagation()}>
            <div className="modal-header-mini">
              <h3>📝 EDITAR PRODUCTO</h3>
              <button className="close-x-btn" onClick={() => setEditingProduct(null)}>×</button>
            </div>
            <form className="carrefour-form-compact" onSubmit={handleUpdateProduct}>
              <div className="input-group-compact">
                <label>📦 Código EAN</label>
                <input
                  name="barcode"
                  type="tel"
                  inputMode="numeric"
                  defaultValue={editingProduct.barcode}
                  required
                  className="input-compact"
                  style={{ textTransform: 'uppercase' }}
                  spellCheck="false"
                  autoComplete="off"
                />
              </div>
              <div className="input-group-compact">
                <label>🏷️ Nombre</label>
                <input
                  name="name"
                  value={localEditName}
                  onChange={(e) => handleNameChange(e, setLocalEditName)}
                  required
                  maxLength="28"
                  className="input-compact"
                  style={{ textTransform: 'uppercase' }}
                  spellCheck="false"
                  autoComplete="off"
                />
              </div>
              <div className="input-row-triple">
                <div className="input-group-compact">
                  <label>💰 Compra</label>
                  <input
                    name="price_buy"
                    type="text"
                    inputMode="decimal"
                    defaultValue={editingProduct.price_buy}
                    required
                    className="input-compact"
                    spellCheck="false"
                    autoComplete="off"
                    onChange={(e) => {
                      const { selectionStart, selectionEnd, value } = e.target;
                      const v = value.replace(',', '.');
                      if (v !== '' && !/^[0-9]*\.?[0-9]*$/.test(v)) return;
                      e.target.value = v;
                      if (selectionStart !== null && selectionEnd !== null) {
                        e.target.setSelectionRange(selectionStart, selectionEnd);
                      }
                    }}
                  />
                </div>
                <div className="input-group-compact">
                  <label>💵 Venta</label>
                  <input
                    name="price_sell"
                    type="text"
                    inputMode="decimal"
                    defaultValue={editingProduct.sell_price}
                    required
                    className="input-compact"
                    spellCheck="false"
                    autoComplete="off"
                    onChange={(e) => {
                      const { selectionStart, selectionEnd, value } = e.target;
                      const v = value.replace(',', '.');
                      if (v !== '' && !/^[0-9]*\.?[0-9]*$/.test(v)) return;
                      e.target.value = v;
                      if (selectionStart !== null && selectionEnd !== null) {
                        e.target.setSelectionRange(selectionStart, selectionEnd);
                      }
                    }}
                  />
                </div>
              </div>
              <div className="input-row-dual">
                <div className="input-group-compact"><label>📦 Stock</label><input name="stock" type="text" inputMode="numeric" defaultValue={editingProduct.stock_current} required className="input-compact" /></div>
                <div className="input-group-compact"><label>🎁 Oferta</label><select name="offer" defaultValue={editingProduct.offer} className="input-compact"><option value="0">Sin Oferta</option><option value="50">2ª -50%</option><option value="70">2ª -70%</option></select></div>
              </div>
              <button type="submit" className="btn-submit-compact">💾 ACTUALIZAR ARTÍCULO</button>
              <button type="button" className="btn-delete-compact" style={{ marginTop: '10px', background: '#fee2e2', color: '#dc2626', border: 'none', padding: '12px', borderRadius: '12px', width: '100%', fontWeight: 900 }} onClick={() => handleDeleteProduct(editingProduct.id)}>🗑️ ELIMINAR</button>
            </form>
          </div>
        </div>
      )}
    </>
  );
});

export default AppModals;

