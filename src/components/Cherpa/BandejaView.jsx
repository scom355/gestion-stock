import React, { useState, useEffect, useRef } from 'react';
import Barcode from 'react-barcode';

const MEAT_CATALOG = {
  '978815': 'CHULETA DE AGUJA',
  '978816': 'CHULETA DE LOMO',
  '978820': 'CARNE PICADA VACUNO',
  '978825': 'CARNE PICADA CERDO',
  '978830': 'PECHUGA DE POLLO',
  '978835': 'CONTRAMUSLO POLLO',
  '984501': 'COSTILLA CERDO',
  '984505': 'SOLOMILLO CERDO',
  '984400': 'FILETE TERNERA',
  '984410': 'ALITAS DE POLLO'
};

const BandejaView = ({ products, addToSpool, onDirectPrint, CameraScanner, API_BASE, onBack }) => {
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [kiloPrice, setKiloPrice] = useState('');
  const [supplierKiloPrice, setSupplierKiloPrice] = useState('');
  const [weight, setWeight] = useState('');
  const [copies, setCopies] = useState(1);
  const [totalPrice, setTotalPrice] = useState(0);
  const [generatedBarcode, setGeneratedBarcode] = useState('');
  const [showPreview, setShowPreview] = useState(false);
  const [pendingItems, setPendingItems] = useState([]);
  const [isPrinting, setIsPrinting] = useState(false);

  // Smart Scan States
  const [scanInput, setScanInput] = useState('');
  const [lastScanData, setLastScanData] = useState(null);
  const [scanMode, setScanMode] = useState('manual'); // 'manual' or 'camera'
  const [selectedMargin, setSelectedMargin] = useState(null);

  const weightRef = useRef(null);
  const kiloPriceRef = useRef(null);
  const scanInputRef = useRef(null);
  const supplierPriceRef = useRef(null);
  const totalInputRef = useRef(null);

  // Generate Barcode on Total Price change (PVP of Tray to Caja)
  useEffect(() => {
    if (parseFloat(totalPrice) > 0) {
      generateCarrefourBarcode(totalPrice);
    } else {
      setGeneratedBarcode('');
    }
  }, [totalPrice, selectedProduct, lastScanData]);

  // Live Calculation from Weight / Kilo
  useEffect(() => {
    // DO NOT override if user is actively typing the total price
    if (document.activeElement === totalInputRef.current) return;

    const w = parseFloat(weight) || 0;
    const p = parseFloat(kiloPrice) || 0;
    const total = (w * p).toFixed(2);
    setTotalPrice(total);
  }, [weight, kiloPrice]);

  // Main focus to smart scan
  useEffect(() => {
    const keepFocus = () => {
      if (scanMode === 'camera') return;
      
      const activeEl = document.activeElement;
      // DO NOT steal focus if user is actively in another input (like supplier price)
      if (activeEl && (activeEl.tagName === 'INPUT' || activeEl.tagName === 'TEXTAREA') && activeEl !== scanInputRef.current) {
        return;
      }
      
      if (scanInputRef.current && document.activeElement !== scanInputRef.current) {
        if (!selectedProduct && !weight && !kiloPrice) {
           scanInputRef.current.focus();
        }
      }
    };
    const interval = setInterval(keepFocus, 2000);
    return () => clearInterval(interval);
  }, [selectedProduct, weight, kiloPrice, scanMode]);

  const processBarcodeData = (val) => {
    if (!val || val.length < 12) return;
    
    // Detect Supplier Barcode: Starts with 2
    if (val.startsWith('2')) {
      const productId = val.substring(1, 7);
      const supplierTotalPriceCents = parseInt(val.substring(7, 12));
      const supplierTotalPrice = supplierTotalPriceCents / 100;

      let prodName = MEAT_CATALOG[productId] || 'PRODUCTO DESCONOCIDO';
      // Match by 6-digit ID OR the full 13-digit EAN that was scanned
      const localMatch = products.find(p => p.barcode === productId || p.barcode === val);
      
      if (localMatch) {
         prodName = localMatch.name;
         if (localMatch.price_buy) setSupplierKiloPrice(localMatch.price_buy);
      }

      setLastScanData({ productId, totalPrice: supplierTotalPrice, name: prodName });
      setSearchTerm(prodName);
      
      const sPrice = (localMatch && localMatch.price_buy) || (supplierKiloPrice);
      if (sPrice && parseFloat(sPrice) > 0) {
        const calculatedWeight = (supplierTotalPrice / parseFloat(sPrice)).toFixed(3);
        setWeight(calculatedWeight);
        
        // Priority 1: Use existing product's retail price (sell_price)
        // Priority 2: Automatically apply +1.00 margin
        if (localMatch && localMatch.sell_price && parseFloat(localMatch.sell_price) > 0) {
          setKiloPrice(parseFloat(localMatch.sell_price).toFixed(2));
        } else {
          setKiloPrice((parseFloat(sPrice) + 1.00).toFixed(2));
        }
        // NORMAL BEHAVIOR: No force-focus if item exists with price
      } else {
        // NEW PRODUCT OR MISSING PRICE: FORCE FOCUS SILENTLY
        setWeight('');
        setKiloPrice('');
        if (supplierPriceRef.current) {
          setTimeout(() => supplierPriceRef.current.focus(), 200);
        }
      }
    }
  };

  const [toastMsg, setToastMsg] = useState('');
  const toast = (msg) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(''), 4000);
  };

  const handleSmartScan = (e) => {
    e.preventDefault();
    processBarcodeData(scanInput.trim());
    if (scanInputRef.current) scanInputRef.current.blur();
    // SCAN INPUT IS NOT CLEARED SO IT REMAINS VISIBLE
  };

  const handleCameraScan = (code) => {
    setScanInput(code); // SHOW Camera code in the input
    processBarcodeData(code);
    setScanMode('manual');
  };

  const applyMargin = (extra) => {
    const base = parseFloat(supplierKiloPrice) || 0;
    if (base > 0) {
      setKiloPrice((base + extra).toFixed(2));
      setSelectedMargin(extra);
    }
  };

  const handleManualTotalPriceChange = (newTotal) => {
    setTotalPrice(newTotal);
    const w = parseFloat(weight) || 0;
    if (w > 0) {
      const calculatedKiloPrice = (parseFloat(newTotal) / w).toFixed(2);
      setKiloPrice(calculatedKiloPrice);
      setSelectedMargin(null); // Clear margin selection if manual override
    }
  };

  const handleProductSearch = (term) => {
    setSearchTerm(term);
    if (term.length > 1) {
      const results = (products || []).filter(p =>
        (p.name && p.name.toLowerCase().includes(term.toLowerCase())) ||
        (p.barcode && p.barcode.includes(term))
      ).slice(0, 5);
      setFilteredProducts(results);
    } else {
      setFilteredProducts([]);
    }
  };

  const selectProduct = (p) => {
    setSelectedProduct(p);
    setKiloPrice(p.sell_price);
    setSearchTerm(p.name);
    setFilteredProducts([]);
  };

  const generateCarrefourBarcode = (price) => {
    const productBase = lastScanData?.productId || (selectedProduct?.barcode?.length === 6 ? selectedProduct.barcode : '946562');
    const priceCents = Math.round(parseFloat(price) * 100).toString().padStart(5, '0');
    const raw12 = `2${productBase.toString().padStart(6, '0')}${priceCents}`;
    let sum = 0;
    for (let i = 0; i < 12; i++) {
      sum += parseInt(raw12[i]) * (i % 2 === 0 ? 1 : 3);
    }
    const checkDigit = (10 - (sum % 10)) % 10;
    setGeneratedBarcode(`${raw12}${checkDigit}`);
  };

  const handleAddToSpool = async () => {
    if (totalPrice <= 0) return;

    // --- AUTO-SAVE NEW PRODUCT KEY (6-DIGIT + SUPPLIER PRICE ONLY) ---
    if (lastScanData && lastScanData.productId) {
      const exists = products?.find(p => p.barcode === lastScanData.productId);
      if (!exists && supplierKiloPrice) {
        try {
          await fetch(`${API_BASE}/products`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              name: "CARNE " + lastScanData.productId,
              barcode: lastScanData.productId,
              price_buy: supplierKiloPrice, 
              sell_price: "", // STRICTLY EMPTY SO RETAIL MARGIN IS DYNAMIC
              category: "Bandejas",
              stock: "0"
            })
          });
        } catch (e) {
          console.error("Failed to auto-save Bandeja config:", e);
        }
      }
    }

    const n = parseInt(copies) || 1;
    for (let i = 0; i < n; i++) {
      const ticketItem = {
        id: `CARNE-${Date.now()}-${i}`,
        name: selectedProduct ? selectedProduct.name : "CARNE BANDEJA",
        barcode: generatedBarcode,
        sell_price: totalPrice,
        price_kilo: kiloPrice,
        weight: weight,
        display_price_kilo: kiloPrice,
        display_weight: weight,
        isBandeja: true,
        is_bandeja: true,
        qty: 1
      };
      addToSpool(ticketItem);
    }
    
    toast(`✅ ${n} ticket${n > 1 ? 's' : ''} añadido${n > 1 ? 's' : ''}`);

    // --- MEMORY WASH (Completely reset form state) ---
    setScanInput('');
    setLastScanData(null);
    setSearchTerm('');
    setSupplierKiloPrice('');
    setWeight('');
    setKiloPrice('');
    setTotalPrice('');
    setGeneratedBarcode('');
    setSelectedProduct(null);
    setSelectedMargin(null);
    setCopies(1);
    
    // Silent focus reset back to scanner for continuous flow
    if (scanInputRef.current) {
      setTimeout(() => scanInputRef.current.focus(), 100);
    }
  };

  return (
    <div className="bandeja-container">
      <div className="bandeja-form-card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
          <h3 style={{ color: '#004691', margin: 0 }}>🥩 BANDEJAS</h3>
          <button
            onClick={onBack}
            style={{
              background: '#004691',
              color: '#fff',
              border: 'none',
              padding: '10px 20px',
              borderRadius: '12px',
              fontWeight: '900',
              fontSize: '13px',
              boxShadow: '0 4px 10px rgba(0, 70, 145, 0.2)'
            }}
          >
            ← VOLVER
          </button>
        </div>

        {/* PREMIUM SMART SCAN SECTION */}
        <div className="smart-scan-glass-card">
          {scanMode === 'manual' ? (
            <>
              <div className="scan-indicator-row">
                <span className="scan-status-icon">📡</span>
                <div className="scan-labels">
                  <span className="main-scan-label">MODO AUTO-LECTURA ACTIVADO</span>
                  <span className="sub-scan-label">Escanear etiqueta de proveedor para procesar peso y precio</span>
                </div>
              </div>
              <form onSubmit={handleSmartScan} className="scan-form-container" style={{ display: 'flex', gap: '8px' }}>
                <input
                  ref={scanInputRef}
                  type="text"
                  className="glass-scan-input"
                  placeholder="Listo para escanear... (2XXXXXX...)"
                  value={scanInput}
                  onChange={(e) => setScanInput(e.target.value)}
                  onFocus={(e) => e.target.select()}
                  autoComplete="off"
                />
                <button
                  type="button"
                  className="btn-glass-cam"
                  onClick={() => setScanMode('camera')}
                  style={{
                    background: 'rgba(255,255,255,0.1)',
                    border: '1px solid rgba(255,255,255,0.2)',
                    borderRadius: '12px',
                    width: '54px',
                    height: '54px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    color: '#fff'
                  }}
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" width="24" height="24">
                    <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                    <circle cx="12" cy="13" r="4" />
                  </svg>
                </button>
              </form>
            </>
          ) : (
            <div className="camera-active-container">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                 <span style={{ fontWeight: '900', color: '#38bdf8', fontSize: '12px' }}>CÁMARA AUTO-LECTURA</span>
                 <button onClick={() => setScanMode('manual')} style={{ background: '#ef4444', border: 'none', color: '#fff', padding: '5px 15px', borderRadius: '8px', fontWeight: '900', fontSize: '10px' }}>CERRAR</button>
              </div>
              <div className="camera-preview-wrapper" style={{ borderRadius: '15px', overflow: 'hidden', border: '2px solid #38bdf8' }}>
                <CameraScanner onScan={handleCameraScan} />
              </div>
            </div>
          )}
        </div>

        {/* TOAST MESSAGE */}
        {toastMsg && (
          <div style={{ position: 'fixed', top: '80px', left: '50%', transform: 'translateX(-50%)', background: '#0f172a', color: '#38bdf8', border: '1px solid #38bdf8', padding: '12px 25px', borderRadius: '50px', fontWeight: '950', fontSize: '12px', zIndex: 100000, boxShadow: '0 10px 40px rgba(0,0,0,0.4)', animation: 'pop 0.3s' }}>
            {toastMsg}
          </div>
        )}

        <div className="input-group">
          <label>Producto {lastScanData ? `(Detectado: ${lastScanData.productId})` : '(Opcional)'}</label>
          <input
            type="text"
            placeholder="Buscar por nombre..."
            value={searchTerm}
            onChange={(e) => handleProductSearch(e.target.value)}
            style={{ color: '#000' }}
          />
          {filteredProducts.length > 0 && (
            <div className="search-results">
              {filteredProducts.map(p => (
                <div key={p.id} className="search-item" onClick={() => selectProduct(p)}>
                  {p.name} - €{p.sell_price}/kg
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="row-inputs" style={{ alignItems: 'flex-end', gap: '10px' }}>
          <div className="input-group" style={{ flex: 1 }}>
            <label>Precio Compra (Supplier) €/kg</label>
            <input
              ref={supplierPriceRef}
              type="text"
              inputMode="decimal"
              value={supplierKiloPrice}
              placeholder="5.19"
              onChange={(e) => {
                const val = e.target.value.replace(',', '.');
                if (/^[0-9]*\.?[0-9]*$/.test(val)) {
                  setSupplierKiloPrice(val);
                  // Auto-calculate weight if we have a scanned total price
                  if (lastScanData && val > 0) {
                     setWeight((lastScanData.totalPrice / val).toFixed(3));
                  }
                }
              }}
              style={{ color: '#000', fontSize: '14px', background: '#f1f5f9' }}
            />
          </div>
          
          <div style={{ display: 'flex', gap: '4px', paddingBottom: '15px' }}>
            <button onClick={() => applyMargin(0.50)} style={{ padding: '8px', borderRadius: '8px', border: '1px solid #004691', background: selectedMargin === 0.50 ? '#16a34a' : '#fff', fontSize: '10px', fontWeight: '900', color: selectedMargin === 0.50 ? '#fff' : '#004691' }}>+0.50</button>
            <button onClick={() => applyMargin(0.75)} style={{ padding: '8px', borderRadius: '8px', border: '1px solid #004691', background: selectedMargin === 0.75 ? '#16a34a' : '#fff', fontSize: '10px', fontWeight: '900', color: selectedMargin === 0.75 ? '#fff' : '#004691' }}>+0.75</button>
            <button onClick={() => applyMargin(1.00)} style={{ padding: '8px', borderRadius: '8px', border: '1px solid #004691', background: selectedMargin === 1.00 ? '#16a34a' : '#fff', fontSize: '10px', fontWeight: '900', color: selectedMargin === 1.00 ? '#fff' : '#004691' }}>+1.00</button>
          </div>

          <div className="input-group" style={{ flex: 1 }}>
            <label style={{ color: '#004691', fontWeight: '900' }}>P.V.P A CAJA (€)</label>
            <input
              ref={totalInputRef}
              type="text"
              inputMode="decimal"
              value={totalPrice}
              placeholder="0.00"
              onChange={(e) => {
                const val = e.target.value.replace(',', '.');
                if (/^[0-9]*\.?[0-9]*$/.test(val)) {
                  handleManualTotalPriceChange(val);
                }
              }}
              style={{ color: '#fff', background: '#004691', fontWeight: '950', fontSize: '18px', border: '2px solid #004691' }}
            />
          </div>
        </div>

        <div className="row-inputs" style={{ alignItems: 'flex-end', gap: '10px' }}>
          <div className="input-group" style={{ flex: 1 }}>
              <label>Peso (kg)</label>
              <input
                ref={weightRef}
                type="text"
                inputMode="decimal"
                placeholder="ej: 0.645"
                value={weight}
                onChange={(e) => {
                  const val = e.target.value.replace(',', '.');
                  if (/^[0-9]*\.?[0-9]*$/.test(val)) {
                    setWeight(val);
                  }
                }}
                style={{ color: '#000', background: '#f0fdf4', border: '2px solid #16a34a' }}
              />
          </div>

          <div className="input-group" style={{ flex: 1 }}>
              <label>Precio €/kg Base</label>
              <input
                ref={kiloPriceRef}
                type="text"
                inputMode="decimal"
                placeholder="0.00"
                value={kiloPrice}
                readOnly
                style={{ color: '#94a3b8', fontSize: '14px', background: '#f1f5f9', border: '1px solid #e2e8f0', cursor: 'not-allowed', userSelect: 'none' }}
              />
          </div>
        </div>
        {/* Copies +/- counter */}
        <div className="input-group" style={{ marginTop: '10px' }}>
          <label>Nº de Tickets</label>
          <div style={{ display: 'flex', alignItems: 'center', border: '2px solid #e2e8f0', borderRadius: '12px', overflow: 'hidden', background: '#fff', height: '52px' }}>
            <button
              type="button"
              onClick={() => setCopies(c => Math.max(1, (parseInt(c) || 1) - 1))}
              style={{ width: '52px', height: '100%', background: '#f1f5f9', border: 'none', borderRight: '2px solid #e2e8f0', fontSize: '24px', fontWeight: '900', cursor: 'pointer', color: '#004691' }}
            >−</button>
            <div style={{ flex: 1, textAlign: 'center', fontSize: '24px', fontWeight: '900', color: '#000', userSelect: 'none' }}>
              {copies || 1}
            </div>
            <button
              type="button"
              onClick={() => setCopies(c => Math.min(50, (parseInt(c) || 1) + 1))}
              style={{ width: '52px', height: '100%', background: '#004691', border: 'none', borderLeft: '2px solid #e2e8f0', fontSize: '24px', fontWeight: '900', cursor: 'pointer', color: '#fff' }}
            >+</button>
          </div>
        </div>

        <button
          className="btn-add-spool"
          disabled={totalPrice <= 0}
          onClick={() => {
            if (totalPrice <= 0) return;
            const n = parseInt(copies) || 1;
            const newItems = [];
            for (let i = 0; i < n; i++) {
              newItems.push({
                id: `CARNE-${Date.now()}-${i}`,
                name: selectedProduct ? selectedProduct.name : 'CARNE BANDEJA',
                barcode: generatedBarcode,
                sell_price: totalPrice,
                price_kilo: kiloPrice,
                weight: weight,
                isBandeja: true,
                is_bandeja: true,
                qty: 1
              });
            }
            setPendingItems(prev => [...prev, ...newItems]);
            setWeight('');
            setKiloPrice('');
            setCopies(1);
          }}
          style={{ background: '#9333EA', marginTop: '10px' }}
        >
          ➕ AÑADIR ({copies} {parseInt(copies) > 1 ? 'TICKETS' : 'TICKET'})
        </button>
      </div>
      {/* === INLINE A4 PREVIEW (Multi-page) === */}
      <div style={{ marginTop: '4px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', background: '#f8fafc', padding: '10px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
          <span style={{ fontWeight: '900', fontSize: '14px', color: '#004691' }}>
            TICKETS EN SPOOL: {pendingItems.length}
          </span>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button onClick={() => setPendingItems([])}
              style={{ background: '#ef4444', color: '#fff', border: 'none', padding: '8px 16px', borderRadius: '10px', fontWeight: '900', fontSize: '12px', cursor: 'pointer', boxShadow: '0 4px 10px rgba(239, 68, 68, 0.2)' }}>
              🗑️ LIMPIAR TODO
            </button>
            <button
              disabled={pendingItems.length === 0 || isPrinting}
              onClick={async () => {
                if (pendingItems.length === 0) return;
                setIsPrinting(true);
                const filename = `carne-${new Date().toISOString().slice(0, 10)}-${Date.now()}.pdf`;
                try {
                  await onDirectPrint({ filename, orientation: 'portrait' }, pendingItems, true);
                  setPendingItems([]);
                } catch (e) {
                  console.error(e);
                } finally {
                  setIsPrinting(false);
                }
              }}
              style={{
                background: pendingItems.length === 0 ? '#94a3b8' : '#16a34a',
                color: '#fff', border: 'none', padding: '8px 16px', borderRadius: '10px',
                fontWeight: '900', fontSize: '12px',
                cursor: (pendingItems.length === 0 || isPrinting) ? 'not-allowed' : 'pointer',
                boxShadow: '0 4px 10px rgba(22, 163, 74, 0.2)',
                display: 'flex', alignItems: 'center', gap: '5px'
              }}>
              {isPrinting ? '⏳ PROCESANDO...' : `🖨️ IMPRIMIR (${Math.ceil(pendingItems.length / 30)} PÁG)`}
            </button>
          </div>
        </div>

        {/* Dynamic Pages */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {(pendingItems.length === 0 ? [[]] : Array.from({ length: Math.ceil(pendingItems.length / 30) }, (_, i) => pendingItems.slice(i * 30, (i + 1) * 30))).map((pageItems, pageIdx) => (
            <div key={pageIdx} style={{ position: 'relative' }}>
              <div style={{ position: 'absolute', top: '-10px', left: '20px', background: '#004691', color: '#fff', padding: '2px 10px', borderRadius: '5px', fontSize: '10px', fontWeight: '900', zIndex: 1 }}>
                PÁGINA {pageIdx + 1}
              </div>
              <div style={{
                width: '100%', maxWidth: '210mm', margin: '0 auto', background: '#fff', aspectRatio: '210/297',
                border: '1px solid #cbd5e1', borderRadius: '2px', padding: '0mm',
                boxSizing: 'border-box', display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gridTemplateRows: 'repeat(10, 1fr)',
                columnGap: '2mm', rowGap: '2mm',
                boxShadow: '0 10px 40px rgba(0,0,0,0.15)'
              }}>
                {Array.from({ length: 30 }).map((_, i) => {
                  const item = pageItems[i];
                  if (!item) return <div key={i} style={{ border: '1px dashed #cbd5e1', background: '#f8fafc' }} />;
                  return (
                    <div key={i} style={{ display: 'flex', flexDirection: 'column', height: '100%', boxSizing: 'border-box', background: '#fff' }}>
                      <div style={{ padding: '0.5mm', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                        {/* Top Section: Price and Weight - Height 10mm */}
                        <div style={{ display: 'flex', gap: '1mm', height: '10mm' }}>
                          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                            <span style={{ fontSize: '5.5pt', fontWeight: '400', color: '#666' }}>PRECIO €/kg</span>
                            <span style={{ fontSize: '10pt', fontWeight: '600', color: '#000' }}>{parseFloat(item.price_kilo || 0).toFixed(2)}</span>
                          </div>
                          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                            <span style={{ fontSize: '5.5pt', fontWeight: '400', color: '#666' }}>PESO (kg)</span>
                            <span style={{ fontSize: '10pt', fontWeight: '600', color: '#000' }}>{parseFloat(item.weight || 0).toFixed(3)}</span>
                          </div>
                        </div>

                        {/* Bottom Section: PVP and Barcode - Height 16mm */}
                        <div style={{ display: 'flex', height: '17mm', gap: '1mm', alignItems: 'center', overflow: 'hidden' }}>
                          <div style={{ width: '16mm', marginLeft: '2mm', height: '15mm', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                            <span style={{ fontSize: '6pt', fontWeight: '900', color: '#555', marginBottom: '0.5mm' }}>PVP €</span>
                            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'center', lineHeight: 1 }}>
                              <span style={{ fontSize: '20pt', fontWeight: '1000', color: '#000', letterSpacing: '-1px' }}>
                                {parseFloat(item.sell_price || 0).toFixed(2).split('.')[0]}
                              </span>
                              <span style={{ fontSize: '11pt', fontWeight: '1000', color: '#000', marginTop: '1.5px' }}>
                                ,{parseFloat(item.sell_price || 0).toFixed(2).split('.')[1]}
                              </span>
                            </div>
                          </div>
                          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <Barcode 
                              value={item.barcode || '0000000000000'} 
                              width={1.6} 
                              height={45} 
                              displayValue={true} 
                              fontSize={10}
                              margin={0} 
                              format="EAN13"
                              background="transparent" 
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>

      <style>{`
        .bandeja-container { padding: 15px; display: flex; flex-direction: column; gap: 20px; overflow-y: auto; height: 100%; color: #000; }
        .bandeja-form-card { background: #f8fafc; padding: 20px; border-radius: 20px; border: 1px solid #e2e8f0; }

        /* PREMIUM SCAN FIELD CSS */
        .smart-scan-glass-card {
          padding: 18px;
          border-radius: 20px;
          background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
          color: #fff;
          margin-bottom: 20px;
          box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1);
          border: 1px solid rgba(255, 255, 255, 0.1);
          position: relative;
          overflow: hidden;
        }
        .scan-indicator-row {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-bottom: 12px;
        }
        .scan-status-icon {
          font-size: 24px;
          animation: pulse-glow 2s infinite ease-in-out;
        }
        @keyframes pulse-glow {
          0% { transform: scale(1); opacity: 0.8; }
          50% { transform: scale(1.1); opacity: 1; filter: drop-shadow(0 0 8px #38bdf8); }
          100% { transform: scale(1); opacity: 0.8; }
        }
        .scan-labels { display: flex; flex-direction: column; }
        .main-scan-label {
          font-weight: 950;
          font-size: 11px;
          letter-spacing: 1.5px;
          color: #38bdf8;
          text-transform: uppercase;
        }
        .sub-scan-label {
          font-size: 10px;
          opacity: 0.7;
          font-weight: 500;
          color: #cbd5e1;
        }
        .scan-form-container { position: relative; }
        .glass-scan-input {
          width: 100%;
          padding: 14px 18px;
          border-radius: 12px;
          background: rgba(255, 255, 255, 0.05) !important;
          border: 1px solid rgba(255, 255, 255, 0.2) !important;
          color: #fff !important;
          font-size: 18px !important;
          font-weight: 800 !important;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          outline: none;
        }
        .glass-scan-input:focus {
          background: rgba(255, 255, 255, 0.1) !important;
          border-color: #38bdf8 !important;
          box-shadow: 0 0 20px rgba(56, 189, 248, 0.2);
        }
        .glass-scan-input::placeholder {
          color: rgba(255, 255, 255, 0.3);
        }

        .input-group { display: flex; flex-direction: column; gap: 5px; margin-bottom: 15px; position: relative; }
        .input-group label { font-weight: 800; font-size: 12px; color: #64748b; }
        .input-group input { padding: 12px; border-radius: 12px; border: 2px solid #e2e8f0; font-size: 16px; font-weight: 700; width: 100%; color: #000 !important; background: #fff; }
        .row-inputs { display: flex; gap: 15px; }
        .search-results { position: absolute; top: 100%; left: 0; width: 100%; background: white; border: 1px solid #ddd; border-top: none; z-index: 10; border-radius: 0 0 12px 12px; box-shadow: 0 10px 15px rgba(0,0,0,0.1); }
        .search-item { padding: 12px; border-bottom: 1px solid #eee; cursor: pointer; color: #000; text-align: left; }
        .search-item:hover { background: #eff6ff; }
        .total-display { text-align: center; padding: 20px; background: #004691; color: white; border-radius: 15px; margin-bottom: 20px; }
        .total-display .label { display: block; font-size: 12px; font-weight: 900; opacity: 0.8; }
        .total-display .amount { font-size: 40px; font-weight: 950; }
        .btn-add-spool { width: 100%; padding: 15px; border-radius: 15px; border: none; background: #16a34a; color: white; font-weight: 900; font-size: 16px; cursor: pointer; }
        .btn-add-spool:disabled { background: #cbd5e1; cursor: not-allowed; }

        .ticket-preview-box { border-top: 2px dashed #e2e8f0; padding-top: 20px; margin-top: 10px; }
        .carrefour-label-mockup { width: 260px; background: white; border: 2px solid #000; padding: 10px; margin: 0 auto; font-family: 'Arial', sans-serif; display: flex; flex-direction: column; gap: 8px; color: #000; }
        .label-header { text-align: center; border-bottom: 2px solid #000; padding-bottom: 5px; }
        .meat-category { font-weight: 950; font-size: 14px; background: #000; color: #fff; display: inline-block; padding: 2px 12px; border-radius: 4px; }
        .product-name { font-weight: 950; font-size: 18px; margin-top: 10px; text-transform: uppercase; line-height: 1.1; color: #000; }
        .pvp-box { border: 2px dashed #000; text-align: center; padding: 10px; margin: 5px 0; }
        .pvp-label { font-size: 14px; font-weight: 900; letter-spacing: 2px; color: #000; }
        .pvp-value { font-size: 38px; font-weight: 950; margin-top: 5px; color: #000; }
        .detail-boxes { display: flex; border: 2px solid #000; }
        .detail-box { flex: 1; padding: 8px 5px; text-align: center; border-right: 2px solid #000; color: #000; }
        .detail-box:last-child { border-right: none; }
        .d-label { font-size: 11px; font-weight: 800; color: #333; margin-bottom: 3px; }
        .d-val { font-size: 14px; font-weight: 950; color: #000; }
        .barcode-box { display: flex; justify-content: center; padding: 10px 0; background: white; }
      `}</style>
    </div>
  );
};

export default BandejaView;
