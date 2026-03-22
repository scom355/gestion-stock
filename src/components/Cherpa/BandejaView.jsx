import React, { useState, useEffect, useRef } from 'react';
import Barcode from 'react-barcode';

const BandejaView = ({ products, addToSpool, onDirectPrint, API_BASE, onBack }) => {
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [kiloPrice, setKiloPrice] = useState('');
  const [weight, setWeight] = useState('');
  const [copies, setCopies] = useState(1);
  const [totalPrice, setTotalPrice] = useState(0);
  const [generatedBarcode, setGeneratedBarcode] = useState('');
  const [showPreview, setShowPreview] = useState(false);
  const [pendingItems, setPendingItems] = useState([]);
  const weightRef = useRef(null);
  const kiloPriceRef = useRef(null);


  // Live Calculation
  useEffect(() => {
    const w = parseFloat(weight) || 0;
    const p = parseFloat(kiloPrice) || 0;
    const total = (w * p).toFixed(2);
    setTotalPrice(total);

    if (total > 0) {
      // Fixed product code used - only price matters
      generateCarrefourBarcode(total);
    }
  }, [weight, kiloPrice, selectedProduct]);

  useEffect(() => {
    const isMobile = window.innerWidth < 1024;
    if (isMobile) return;

    const keepFocus = () => {
      // Focus kiloPrice if empty, else weight if empty
      if (kiloPriceRef.current && !kiloPrice) {
        kiloPriceRef.current.focus();
      } else if (weightRef.current && !weight) {
        weightRef.current.focus();
      }
    };
    const interval = setInterval(keepFocus, 300);
    return () => clearInterval(interval);
  }, [kiloPrice, weight]);

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
    // === CARREFOUR EAN-13 FIXED PRODUCT FORMAT ===
    // Fixed product code '946562' for ALL Carne/Bandeja items
    // Only the price (in cents) changes per bandeja
    const FIXED_CODE = '946562';
    const priceCents = Math.round(parseFloat(price) * 100).toString().padStart(5, '0');
    const raw12 = `2${FIXED_CODE}${priceCents}`;
    let sum = 0;
    for (let i = 0; i < 12; i++) {
      sum += parseInt(raw12[i]) * (i % 2 === 0 ? 1 : 3);
    }
    const checkDigit = (10 - (sum % 10)) % 10;
    setGeneratedBarcode(`${raw12}${checkDigit}`);
  };

  const handleAddToSpool = () => {
    if (totalPrice <= 0) return;

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
    alert(`✅ ${n} ticket${n > 1 ? 's' : ''} añadido${n > 1 ? 's' : ''} al Spool`);
    setWeight('');
    setKiloPrice('');
    setCopies(1);
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

        <div className="input-group">
          <label>Producto (Opcional)</label>
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

        <div className="row-inputs">
          <div className="input-group">
            <label>Precio €/kg</label>
            <input
              ref={kiloPriceRef}
              type="text"
              inputMode="decimal"
              step="0.01"
              value={kiloPrice}
              placeholder="0.00"
              autoFocus
              onChange={(e) => {
                const val = e.target.value.replace(',', '.');
                // Only allow numbers and one dot
                if (/^[0-9]*\.?[0-9]*$/.test(val)) {
                  setKiloPrice(val);
                }
              }}
              style={{ color: '#000' }}
            />
          </div>
          <div className="input-group">
            <label>Peso (kg)</label>
            <input
              ref={weightRef}
              type="text"
              inputMode="decimal"
              placeholder="ej: 0.592"
              value={weight}
              onChange={(e) => {
                const val = e.target.value.replace(',', '.');
                // Only allow numbers and one dot
                if (/^[0-9]*\.?[0-9]*$/.test(val)) {
                  setWeight(val);
                }
              }}
              style={{ color: '#000', background: '#fff', WebkitTextFillColor: '#000', opacity: 1 }}
            />
          </div>
        </div>

        {totalPrice > 0 && (
          <div className="total-display">
            <span className="label">TOTAL A PAGAR:</span>
            <span className="amount">€{totalPrice}</span>
          </div>
        )}
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
              disabled={pendingItems.length === 0}
              onClick={async () => {
                if (pendingItems.length === 0) return;
                const filename = `carne-${new Date().toISOString().slice(0, 10)}-${Date.now()}.pdf`;
                await onDirectPrint({ filename, orientation: 'landscape' }, pendingItems, true);
                setPendingItems([]);
              }}
              style={{ background: pendingItems.length === 0 ? '#94a3b8' : '#16a34a', color: '#fff', border: 'none', padding: '8px 16px', borderRadius: '10px', fontWeight: '900', fontSize: '12px', cursor: pendingItems.length === 0 ? 'not-allowed' : 'pointer', boxShadow: '0 4px 10px rgba(22, 163, 74, 0.2)' }}>
              🖨️ IMPRIMIR PDF ({Math.ceil(pendingItems.length / 30)} {Math.ceil(pendingItems.length / 30) > 1 ? 'PÁGINAS' : 'PÁGINA'})
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
                width: '100%', background: '#f8fafc', aspectRatio: '297/210',
                border: '1px solid #cbd5e1', borderRadius: '8px', padding: '3mm',
                boxSizing: 'border-box', display: 'grid',
                gridTemplateColumns: 'repeat(5, 1fr)',
                gridTemplateRows: 'repeat(6, 1fr)',
                columnGap: '2mm', rowGap: '3mm',
                boxShadow: '0 10px 30px rgba(0,0,0,0.1)'
              }}>
                {Array.from({ length: 30 }).map((_, i) => {
                  const item = pageItems[i];
                  if (!item) return <div key={i} style={{ border: '1px dashed #cbd5e1', background: '#f8fafc' }} />;
                  return (
                    <div key={i} style={{ display: 'flex', flexDirection: 'column', height: '100%', boxSizing: 'border-box', background: '#fff' }}>
                      <div style={{ padding: '0.5mm', height: '100%', display: 'flex', flexDirection: 'column' }}>
                        {/* Header: PRECIO/PESO */}
                        <div style={{ display: 'flex', gap: '2px', height: '10mm', marginBottom: '2mm' }}>
                          <div style={{ flex: 1, border: '0.6pt solid black', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                            <span style={{ fontSize: '5pt', fontWeight: '800' }}>PRECIO €/kg</span>
                            <span style={{ fontSize: '9pt', fontWeight: '950' }}>{parseFloat(item.price_kilo || 0).toFixed(2)}</span>
                          </div>
                          <div style={{ flex: 1, border: '0.6pt solid black', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                            <span style={{ fontSize: '5pt', fontWeight: '800' }}>PESO (kg)</span>
                            <span style={{ fontSize: '9pt', fontWeight: '950' }}>{parseFloat(item.weight || 0).toFixed(3)}</span>
                          </div>
                        </div>
                        {/* Bottom: PVP + Barcode (Fixed 15mm section) */}
                        <div style={{ display: 'flex', height: '15mm', gap: '3px', alignItems: 'center' }}>
                          {/* Price Box: Fixed 12mm */}
                          <div style={{ flex: 1, height: '12mm', border: '0.6pt solid black', display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: '2px', padding: '0 1px' }}>
                            <span style={{ fontSize: '8pt', fontWeight: '950' }}>PVP €</span>
                            <span style={{ fontSize: '24pt', fontWeight: '950', letterSpacing: '-1.5px' }}>
                              {parseFloat(item.sell_price || 0).toFixed(2).replace('.', ',')}
                            </span>
                          </div>
                          {/* Barcode/EAN Box: Fixed 12mm WITH BORDER (Safe width 1.0 to prevent cutting) */}
                          <div style={{ flex: 1, height: '12mm', border: '0.6pt solid black', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', boxSizing: 'border-box', overflow: 'hidden' }}>
                            <Barcode value={item.barcode || '0000000000000'} width={1.0} height={25} displayValue={false} margin={2} background="transparent" />
                            <div style={{ fontSize: '6.5pt', fontWeight: '600', marginTop: '-1px' }}>{item.barcode}</div>
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
