import React, { useState } from 'react';
import Barcode from 'react-barcode';

const SpoolView = ({ ticketSpool, setTicketSpool, onGeneratePDF, onClear, onUpdate, onRemove, ticketHistory = [], API_BASE, onBack }) => {
  const [viewMode, setViewMode] = useState('list'); // 'list' or 'preview'
  const [currentPage, setCurrentPage] = useState(0);

  const handleRemove = (item, index) => {
    if (item.id && onRemove) {
      onRemove(item.id);
    } else {
      const newSpool = [...ticketSpool];
      newSpool.splice(index, 1);
      onUpdate(newSpool);
    }
  };

  const handleClear = () => {
    if (window.confirm('¿Estás seguro de que quieres vaciar todo el spool?')) {
      onClear();
    }
  };

  const handlePrint = async () => {
    const carneItems = ticketSpool.filter(item => item.is_bandeja == 1 || item.isBandeja);
    const productItems = ticketSpool.filter(item => !(item.is_bandeja == 1 || item.isBandeja));

    if (carneItems.length > 0 && productItems.length > 0) {
      // MIXED: Auto-split into two files
      // Use true for skipDelete on the FIRST call so we don't clear the server-side spool yet
      await onGeneratePDF("CARNE BANDEJA", carneItems, true);
      // Small delay for browser to handle first tab open
      await new Promise(r => setTimeout(r, 2000));
      // Second call clears the spool (skipDelete = false)
      await onGeneratePDF("PRODUCTOS STOCK", productItems, false);
    } else if (carneItems.length > 0) {
      await onGeneratePDF("CARNE BANDEJA", carneItems, false);
    } else if (productItems.length > 0) {
      await onGeneratePDF("PRODUCTOS STOCK", productItems, false);
    }
  };

  const generateCarneBarcode = (item) => {
    if (!item) return '0000000000000';
    // If pre-generated Carrefour barcode stored → use directly
    if (item.barcode && item.barcode.startsWith('2') && item.barcode.length === 13) {
      return item.barcode;
    }
    const getEANChecksum = (s) => {
      let sum = 0;
      for (let i = 0; i < 12; i++) sum += parseInt(s[i]) * (i % 2 === 0 ? 1 : 3);
      return (10 - (sum % 10)) % 10;
    };
    // FIXED product code '946562' (from Carrefour bandeja) - only price changes
    const FIXED_CODE = '946562';
    const cents = Math.round(parseFloat(item.sell_price || 0) * 100);
    const priceStr = String(cents).padStart(5, '0');
    const full12 = `2${FIXED_CODE}${priceStr}`;
    return `${full12}${getEANChecksum(full12)}`;
  };

  return (
    <div className="spool-viewer-refined">
      {viewMode === 'list' ? (
        <>
          <div className="spool-header-sticky">
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '15px' }}>
              <div className="spool-stats-banner" style={{ margin: 0, flex: 1 }}>
                <div className="stat-main">
                  <span className="stat-number">{ticketSpool.length}</span>
                  <span className="stat-label">TICKETS ACTIVOS</span>
                </div>
              </div>
            </div>

            <div className="template-selector-box" onClick={() => setViewMode('preview')}>
              <div className="template-icon">📄</div>
              <div className="template-info">
                <span className="template-name">Layout Landscape A4</span>
                <span className="template-meta">Orientación Horizontal</span>
              </div>
              <div className="template-arrow">→</div>
            </div>

            <div className="spool-actions-row" style={{ display: 'flex', gap: '10px' }}>
              <button
                className="btn-print-direct"
                onClick={handlePrint}
                disabled={ticketSpool.length === 0}
                style={{
                  flex: 2,
                  background: '#16A34A',
                  color: '#fff',
                  border: 'none',
                  padding: '12px',
                  borderRadius: '12px',
                  fontWeight: '950',
                  fontSize: '14px',
                  boxShadow: '0 4px 12px rgba(22, 163, 74, 0.2)'
                }}
              >
                🖨️ GENERAR PDF
              </button>
              <button className="btn-clear-spool" onClick={handleClear} disabled={ticketSpool.length === 0} style={{ flex: 1, padding: '10px', fontSize: '11px' }}>
                LIMPIAR
              </button>
            </div>
          </div>

          <div className="spool-list-container">
            {ticketSpool.length > 0 ? (
              <div className="spool-items-list">
                {ticketSpool.map((item, index) => (
                  <div key={`${item.id}-${index}`} className="spool-item-card animate-slide-up">
                    <div className="item-info">
                      <div className="item-name">{item.name}</div>
                      <div className="item-details">
                        <span className="item-price">€{parseFloat(item.sell_price).toFixed(2)}</span>
                        <span className="item-ean">{(item.is_bandeja == 1 || item.isBandeja) ? generateCarneBarcode(item) : item.barcode}</span>
                      </div>
                    </div>
                    <button className="btn-remove-item" onClick={() => handleRemove(item, index)}>×</button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="spool-empty-state">
                <div className="empty-icon">📂</div>
                <h3>SPOOL VACÍO</h3>
                <p>Añada productos para generar etiquetas.</p>
              </div>
            )}

            {/* --- NEW: HISTORY SECTION IN SPOOL --- */}
            <div className="spool-history-mobile">
              <div className="history-header">🕒 ÚLTIMOS ARCHIVADOS (24H)</div>
              <div className="history-scroll-x">
                {ticketHistory.map(h => (
                  <a
                    key={h.id}
                    className="history-card-mini"
                    href={`${API_BASE}/spool/download/${h.filename}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ textDecoration: 'none', cursor: 'pointer' }}
                  >
                    <div className="h-time">{new Date(h.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                    <div className="h-count">{h.items_count} TICKETS</div>
                    <div className="h-btn">ABRIR PDF</div>
                  </a>
                ))}
                {ticketHistory.length === 0 && (
                  <div className="history-empty">No hay archivos hoy.</div>
                )}
              </div>
            </div>
          </div>
        </>
      ) : (
        <div className="spool-preview-overlay animate-slide-up">
          <div className="preview-toolbar" style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
            <button
              onClick={() => setViewMode('list')}
              style={{
                background: '#004691',
                color: '#fff',
                border: 'none',
                padding: '10px 18px',
                borderRadius: '12px',
                fontWeight: '950',
                fontSize: '13px'
              }}
            >
              ← VOLVER
            </button>
            <span className="preview-title" style={{ fontWeight: '950', fontSize: '12px', color: '#000' }}>VISTA PREVIA LANDSCAPE</span>
          </div>

          <div className="a4-preview-scroll">
            <div className="a4-landscape-mockup-standard">
              <div className={`a4-sheet-container landscape ${ (ticketSpool[currentPage * 20]?.is_bandeja == 1 || ticketSpool[currentPage * 20]?.isBandeja) ? 'carne-no-margin' : ''}`}>
                <div className="a4-grid-20" style={{ columnGap: '3.78px', rowGap: '7.56px' }}>
                  {ticketSpool.slice(currentPage * 20, (currentPage + 1) * 20).map((item, i) => (
                    <div key={i} className="ticket-cell">
                      {item.is_bandeja == 1 || item.isBandeja ? (
                        <div className="ticket-carne-layout" style={{ display: 'flex', flexDirection: 'column', height: '100%', padding: '1mm' }}>
                          {/* Preview 1cm Header: PRECIO left, PESO right */}
                          <div className="tc-top-row" style={{ display: 'flex', gap: '5px', height: '10mm', marginBottom: '2mm' }}>
                            <div className="tc-box-small" style={{ flex: 1, border: '1pt solid black', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                              <span style={{ fontSize: '5pt', fontWeight: '800' }}>PRECIO €/kg</span>
                              <span style={{ fontSize: '8pt', fontWeight: '950' }}>{parseFloat(item.price_kilo || 0).toFixed(2)}</span>
                            </div>
                            <div className="tc-box-small" style={{ flex: 1, border: '1pt solid black', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                              <span style={{ fontSize: '5pt', fontWeight: '800' }}>PESO (kg)</span>
                              <span style={{ fontSize: '8pt', fontWeight: '950' }}>{parseFloat(item.weight || 0).toFixed(3)}</span>
                            </div>
                          </div>

                          {/* Bottom split 50/50 Mirror */}
                          <div style={{ display: 'flex', height: '14mm', gap: '5px', alignItems: 'center' }}>
                            <div className="tc-big-pvp-box-half" style={{ flex: 1, height: '11mm', border: '1.2pt solid black', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                              <span style={{ fontSize: '7pt', fontWeight: '950', lineHeight: 1 }}>PVP €</span>
                              <span style={{ fontSize: '18pt', fontWeight: '950', letterSpacing: '-0.5px', lineHeight: 1 }}>
                                {parseFloat(item.sell_price || 0).toFixed(2).replace('.', ',')}
                              </span>
                            </div>
                            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                              <Barcode value={generateCarneBarcode(item)} width={0.9} height={20} displayValue={false} margin={0} background="transparent" />
                              <div style={{ fontSize: '8pt', fontWeight: '400' }}>{generateCarneBarcode(item)}</div>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <>
                          <div className="ticket-name-top">{item.name}</div>
                          <div className="ticket-body-placeholder">
                            <div className="ticket-price-area">
                              <span className="price-integer">{Math.floor(parseFloat(item.sell_price || 0))}</span>
                              <div className="price-decimal-box">
                                <span className="price-comma">,</span>
                                <span className="price-fraction">{(parseFloat(item.sell_price || 0) % 1).toFixed(2).substring(2)}</span>
                                <span className="price-currency">€</span>
                              </div>
                            </div>
                          </div>
                          <div className="ticket-footer">
                            <div className="ticket-barcode-container">
                              <Barcode value={item.barcode || '0000000000000'} width={1.1} height={22} displayValue={false} margin={0} background="transparent" />
                            </div>
                            <div className="ticket-info-right">
                              <div className="info-row-bold">{item.barcode}</div>
                            </div>
                          </div>
                        </>
                      )}
                    </div>
                  ))}
                  {Array.from({ length: Math.max(0, 20 - (ticketSpool.slice(currentPage * 20, (currentPage + 1) * 20).length)) }).map((_, i) => (
                    <div key={`empty-${i}`} className="ticket-cell empty">
                      <div style={{ color: '#ccc', fontSize: '10px' }}>LIBRE {ticketSpool.length + i + 1}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            {ticketSpool.length > 20 && (
              <div className="spool-pagination-ctrls">
                <button
                  className="btn-page-nav"
                  disabled={currentPage === 0}
                  onClick={() => setCurrentPage(prev => Math.max(0, prev - 1))}
                >
                  ◀ ANTERIOR
                </button>
                <span className="page-indicator">PÁGINA {currentPage + 1} DE {Math.ceil(ticketSpool.length / 20)}</span>
                <button
                  className="btn-page-nav"
                  disabled={currentPage >= Math.ceil(ticketSpool.length / 20) - 1}
                  onClick={() => setCurrentPage(prev => prev + 1)}
                >
                  SIGUIENTE ▶
                </button>
              </div>
            )}
          </div>

          <div className="preview-bottom-action">
            <button className="btn-imprimir-final" onClick={handlePrint}>
              🖨️ GENERAR PDF (NUEVAS MEDIDAS)
            </button>
          </div>
        </div>
      )}

      <style>{`
        .spool-viewer-refined {
          width: 100%;
          height: 100%;
          display: flex;
          flex-direction: column;
          background: #f8fafc;
        }

        .spool-header-sticky {
          background: #fff;
          padding: 15px;
          border-bottom: 2px solid #e2e8f0;
        }

        .spool-stats-banner {
          background: #004691;
          color: #fff;
          padding: 15px;
          border-radius: 12px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 15px;
        }

        .stat-number { font-size: 24px; font-weight: 950; }
        .stat-label { font-size: 10px; font-weight: 800; opacity: 0.8; }
        .stat-secondary { font-size: 11px; font-weight: 900; opacity: 0.9; }

        .template-selector-box {
            background: #fff;
            border: 3px solid #000;
            border-radius: 15px;
            padding: 15px;
            display: flex;
            align-items: center;
            gap: 15px;
            margin-bottom: 15px;
            box-shadow: 0 4px 10px rgba(0,0,0,0.05);
        }

        .template-icon { font-size: 30px; }
        .template-info { flex: 1; display: flex; flex-direction: column; }
        .template-name { font-weight: 950; font-size: 16px; color: #000; }
        .template-meta { font-size: 11px; font-weight: 700; color: #64748b; }
        .template-arrow { font-weight: 950; font-size: 18px; color: #CBD5E1; }

        .spool-actions-row { display: flex; gap: 10px; }
        .btn-clear-spool { flex: 1; padding: 10px; border-radius: 10px; border: 2px solid #e2e8f0; background: #fff; font-weight: 900; color: #94a3b8; font-size: 11px; }

        .spool-list-container { flex: 1; padding: 15px; overflow-y: auto; display: flex; flex-direction: column; }
        .spool-items-list { display: flex; flex-direction: column; gap: 8px; flex: 1; }
        
        .spool-history-mobile {
          margin-top: 30px;
          padding-bottom: 20px;
        }
        .history-header { font-weight: 950; font-size: 12px; color: #004691; margin-bottom: 12px; letter-spacing: 0.5px; }
        .history-scroll-x { display: flex; gap: 12px; overflow-x: auto; padding-bottom: 10px; scrollbar-width: none; }
        .history-scroll-x::-webkit-scrollbar { display: none; }
        
        .history-card-mini {
          min-width: 120px;
          background: #fff;
          padding: 12px;
          border-radius: 15px;
          border: 1.5px solid #e2e8f0;
          box-shadow: 0 4px 10px rgba(0,0,0,0.03);
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 5px;
        }
        .h-time { font-size: 10px; font-weight: 800; color: #94a3b8; }
        .h-count { font-size: 12px; font-weight: 950; color: #1e293b; }
        .h-btn { margin-top: 5px; background: #004691; color: #fff; font-size: 9px; font-weight: 900; padding: 5px 10px; border-radius: 20px; text-transform: uppercase; }
        .history-empty { font-size: 11px; color: #cbd5e1; font-weight: 700; padding: 10px; }

        .spool-item-card { background: #fff; padding: 12px 15px; border-radius: 12px; display: flex; align-items: center; gap: 10px; border: 1px solid #e2e8f0; }
        .item-info { flex: 1; }
        .item-name { font-weight: 900; font-size: 13px; color: #1e293b; text-transform: uppercase; }
        .item-details { font-size: 11px; display: flex; gap: 10px; margin-top: 2px; }
        .item-price { color: #004691; font-weight: 900; }
        .item-ean { color: #94a3b8; font-weight: 700; }
        .btn-remove-item { background: #fee2e2; color: #ef4444; border: none; width: 28px; height: 28px; border-radius: 8px; font-weight: 950; font-size: 16px; }

        .a4-grid-20 {
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            grid-template-rows: repeat(5, calc((100% - 8mm) / 5));
            width: 100%;
            height: 100%;
            column-gap: 1mm;
            row-gap: 2mm;
            box-sizing: border-box;
        }

        .spool-preview-overlay {
            position: fixed;
            top: 0; left: 0; width: 100%; height: 100%;
            background: #F1F5F9;
            z-index: 999999; /* Ensure it's on top of Cherpa header */
            display: flex;
            flex-direction: column;
            padding-top: 80px; /* Leave space for Carrefour main header */
        }

        .preview-toolbar {
            background: #fff;
            padding: 15px;
            display: flex;
            align-items: center;
            gap: 15px;
            border-bottom: 2px solid #e2e8f0;
        }

        .btn-back-preview { background: #000; color: #fff; border: none; padding: 8px 15px; border-radius: 20px; font-weight: 900; font-size: 12px; }
        .preview-title { font-weight: 950; font-size: 13px; color: #000; }

        .a4-preview-scroll { flex: 1; padding: 20px; overflow-y: auto; display: flex; flex-direction: column; align-items: center; }
        .a4-landscape-mockup-standard {
            width: 297mm;
            height: 210mm;
            background: #fff;
            box-shadow: 0 10px 40px rgba(0,0,0,0.1);
            transform: scale(0.28); 
            transform-origin: top center;
        }

        /* Override A4 Container for mobile preview scaling */
        .a4-landscape-mockup-standard .a4-sheet-container {
            box-shadow: none !important;
            margin: 0 !important;
            transform: none !important;
        }

        .more-pages-hint-ls { margin-top: -100px; font-weight: 900; color: #94a3b8; font-size: 14px; }

        .spool-pagination-ctrls {
            display: flex;
            align-items: center;
            gap: 20px;
            margin-top: -120px;
            margin-bottom: 20px;
            z-index: 50;
        }

        .btn-page-nav {
            background: #004691;
            color: #fff;
            border: none;
            padding: 10px 20px;
            border-radius: 10px;
            font-weight: 900;
            font-size: 12px;
        }

        .btn-page-nav:disabled {
            background: #cbd5e1;
            cursor: not-allowed;
        }

        .page-indicator {
            font-weight: 950;
            font-size: 14px;
            color: #004691;
        }

        .preview-bottom-action {
            background: #fff;
            padding: 15px;
            border-top: 2px solid #e2e8f0;
        }

        .btn-imprimir-final {
            width: 100%;
            background: #16A34A;
            color: #fff;
            border: none;
            padding: 18px;
            border-radius: 15px;
            font-weight: 950;
            font-size: 16px;
            box-shadow: 0 10px 20px rgba(22, 163, 74, 0.2);
        }

        .spool-empty-state { text-align: center; padding-top: 100px; color: #94a3b8; }
        .empty-icon { font-size: 60px; margin-bottom: 15px; }

        .animate-slide-up { animation: slideUp 0.3s ease-out; }
        @keyframes slideUp { from { transform: translateY(20px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
      `}</style>
    </div>
  );
};

export default SpoolView;
