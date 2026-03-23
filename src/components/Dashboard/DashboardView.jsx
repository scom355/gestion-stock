import React from 'react';
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import CameraScanner from '../Shared/CameraScanner';
import SyncView from '../Shared/SyncView';

const DashboardView = ({
  selectedKpi,
  setSelectedKpi,
  dashboardData,
  products,
  totalProducts,
  productSearch,
  setProductSearch,
  setCurrentProductPage,
  setView,
  setEditingProduct,
  setReportProduct,
  handleDeleteProduct,
  lastAddedId,
  setLastAddedId,
  addToSpool,
  setShowToast,
  highlightText,
  loading,
  lookupResult,
  lookupBarcode,
  setLookupBarcode,
  lookupInputRef,
  handleLookup,
  scanMode,
  setScanMode,
  sales,
  reportSummary,
  API_BASE,
  DashboardIcons
}) => {
  return (
    <div className={`dashboard-container ${selectedKpi ? 'is-split' : ''}`}>
      <div className="view-header-row">
        <div className="h-left">
          <button className="btn-action" onClick={() => {
            if (selectedKpi) setSelectedKpi(null);
            else setView('landing');
          }}>
            ← {selectedKpi ? 'DASHBOARD' : 'VOLVER'}
          </button>
        </div>

        <div className="h-center desktop-only">
          <h1>Dashboard Back Office</h1>
        </div>

        <div className="h-right">
          <div className="header-add-box" onClick={() => setView('add')}>
            <div className="add-icon">+</div>
            <div className="add-text">PRODUCTO</div>
          </div>
        </div>
      </div>

      <div className="dashboard-layout-engine">
        {/* LEFT SIDEBAR */}
        {selectedKpi && (
          <div className="kpi-left-sidebar">
            <div className="sidebar-kpi-heading">
              <div className="sidebar-icon">
                {DashboardIcons[selectedKpi] ? DashboardIcons[selectedKpi]() : <span>📊</span>}
              </div>
              <div className="sidebar-title">
                {selectedKpi === 'a1' && 'Consulta'}
                {selectedKpi === 'a2' && 'Inventario'}
                {selectedKpi === 'a3' && 'Análisis'}
                {selectedKpi === 'a4' && 'Alertas'}
                {selectedKpi === 'a5' && 'Ajustes App'}
                {selectedKpi === 'a6' && 'Ventas'}
                {selectedKpi === 'a7' && 'Acciones'}
                {selectedKpi === 'a8' && 'Reportes'}
                {selectedKpi === 'a9' && 'Sync Live'}
              </div>
            </div>

            {selectedKpi === 'a5' ? (
              <div className="sidebar-sections" style={{ padding: '15px' }}>
                <div style={{ background: 'rgba(51, 65, 85, 0.05)', padding: '20px', borderRadius: '15px', border: '1px solid #e2e8f0', textAlign: 'center' }}>
                  <div style={{ fontSize: '30px', marginBottom: '10px' }}>⚙️</div>
                  <h4 style={{ fontSize: '12px', fontWeight: '900', color: '#1e293b' }}>CONFIGURACIÓN</h4>
                  <p style={{ fontSize: '10px', color: '#64748b', marginTop: '5px' }}>Opciones disponibles en la próxima versión.</p>
                </div>
              </div>
            ) : (
              <div className="sidebar-sections">
                {/* Empty for now */}
              </div>
            )}
          </div>
        )}

        {/* MAIN AREA */}
        <div className="main-display-area">
          {!selectedKpi ? (
            <div className="stats-grid">
              {dashboardData && dashboardData.kpis && Object.entries(dashboardData.kpis).map(([key, kpi]) => (
                <div
                  key={key}
                  className="kpi-card compact"
                  style={{ "--accent": kpi.color }}
                  onClick={() => setSelectedKpi(key)}
                >
                  <div className="kpi-main-content">
                    <div className="kpi-icon-seal">
                      {DashboardIcons[key] ? DashboardIcons[key]() : <span>?</span>}
                    </div>
                    <div className="kpis-dynamic-val" style={{ fontSize: '1.2rem', fontWeight: '900', color: 'var(--accent)', marginTop: '5px' }}>
                      {kpi.value || '0'}
                    </div>
                  </div>
                  <div className="kpi-label-footer">{kpi.label}</div>
                </div>
              ))}
            </div>
          ) : (
            <div className="full-detail-hub animate-slideIn">
              {selectedKpi === 'a1' && (
                <div className="cherpa-backoffice-module animate-pop">
                  <div className="module-header-modern">
                    <div className="header-info">
                      <span className="module-tag">Buscador Universal</span>
                      <h3 className="module-title">Consulta de Artículos</h3>
                    </div>
                    <button className="btn-mobile-bridge" onClick={() => setView('scan')}>
                      Mobile View 📱
                    </button>
                  </div>

                  <div className="modern-search-bar compact">
                    <form onSubmit={handleLookup} className="search-form-flex" style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                      <div className="input-with-icon" style={{ flex: 1, position: 'relative' }}>
                        <span className="search-icon">🔍</span>
                        <input
                          ref={lookupInputRef}
                          className="premium-lookup-input"
                          placeholder="Escanear o nombre..."
                          value={lookupBarcode}
                          onChange={(e) => setLookupBarcode(e.target.value)}
                          onFocus={(e) => e.target.select()}
                          autoFocus
                        />
                      </div>
                      <button type="submit" className="btn-modern-search">BUSCAR</button>
                      <button
                        type="button"
                        className={`btn-cam-toggle ${scanMode === 'camera' ? 'active' : ''}`}
                        onClick={() => setScanMode(scanMode === 'camera' ? 'manual' : 'camera')}
                      >
                        📷
                      </button>
                    </form>
                  </div>

                  <div className="module-content-area compact">
                    {scanMode === 'camera' && !lookupResult && (
                      <div className="scanner-preview-box mini">
                        <CameraScanner onScan={(code) => { setLookupBarcode(code); setScanMode('manual'); handleLookup(null, code); }} />
                      </div>
                    )}

                    {loading && (
                      <div className="module-loader">
                        <div className="spinner mini"></div>
                      </div>
                    )}

                    {lookupResult && lookupResult !== 'no_found' && (
                      <div className="ultra-compact-card animate-slideUp">
                        <div className="main-row">
                          <div className="left-info">
                            <h2 className="u-name">{lookupResult.name}</h2>
                            <code className="u-ean">{lookupResult.barcode}</code>
                          </div>
                          <div className="right-price">
                            <span className="u-label">PRECIO</span>
                            <div className="u-price">€{parseFloat(lookupResult.sell_price).toFixed(2)}</div>
                          </div>
                        </div>

                        <div className="stats-row-compact">
                          <div className="s-tile">
                            <label>STOCK</label>
                            <b className={lookupResult.stock_current <= 5 ? 'text-red' : ''}>{lookupResult.stock_current} uds</b>
                          </div>
                          <div className="s-tile">
                            <label>COMPRA</label>
                            <b>€{parseFloat(lookupResult.price_buy || 0).toFixed(2)}</b>
                          </div>
                          <div className="s-tile">
                            <label>MARGEN</label>
                            <b className="text-green">{lookupResult.price_buy > 0 ? (((lookupResult.sell_price - lookupResult.price_buy) / lookupResult.price_buy) * 100).toFixed(0) + '%' : '---'}</b>
                          </div>
                          <div className="s-tile">
                            <label>OFERTA</label>
                            <b className={lookupResult.offer > 0 ? 'text-red' : ''}>{lookupResult.offer}%</b>
                          </div>
                        </div>

                        <div className="actions-row-compact">
                          <button
                            className={`u-btn spool spool-special ${lastAddedId === lookupResult.id ? 'added-success' : ''}`}
                            onClick={() => {
                              addToSpool(lookupResult);
                              setLastAddedId(lookupResult.id);
                              setShowToast(true);
                              setTimeout(() => {
                                setShowToast(false);
                                setLastAddedId(null);
                              }, 2000);
                            }}
                          >
                            {lastAddedId === lookupResult.id && <span className="btn-feedback-float">✅</span>}
                            🎫 TICKET
                          </button>
                        </div>
                      </div>
                    )}

                    {lookupResult === 'no_found' && (
                      <div className="module-error-card mini animate-shake">
                        <h4>⚠️ NO ENCONTRADO</h4>
                        <button onClick={() => setView('add')}>+ CREAR</button>
                      </div>
                    )}

                    {!lookupResult && !loading && (
                      <div className="module-idle mini">
                        <div className="idle-animation mini">🔍</div>
                        <h4>LISTO</h4>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {selectedKpi === 'a2' && (
                <div className="stock-list-mini-view animate-pop">
                  <div className="mini-view-header glass-header" style={{ padding: '20px', borderRadius: '20px 20px 0 0', background: 'rgba(255,255,255,0.85)', backdropFilter: 'blur(10px)', borderBottom: '1px solid #ddd', marginBottom: '0' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', width: '100%', maxWidth: '900px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                        <h3 style={{ margin: 0, color: '#003986', fontSize: '1.4rem', fontWeight: '950', letterSpacing: '-0.5px' }}>📦 STOCK MASTER</h3>
                        <span className="premium-badge" style={{ background: '#E1000F', color: 'white', padding: '3px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: '900' }}>TOTAL: {totalProducts}</span>
                      </div>
                      <div className="premium-search-container" style={{ position: 'relative', width: '100%', marginTop: '10px', display: 'flex', gap: '10px', alignItems: 'center' }}>
                        <div style={{ position: 'relative', flex: 1 }}>
                          <span style={{ position: 'absolute', left: '15px', top: '50%', transform: 'translateY(-50%)', fontSize: '1.2rem', opacity: 0.5 }}>🔍</span>
                          <input
                            type="text"
                            placeholder="Scan o busca por nombre..."
                            value={productSearch}
                            onChange={(e) => {
                              setProductSearch(e.target.value);
                              setCurrentProductPage(1);
                            }}
                            className="glass-input-glow"
                            style={{ width: '100%', padding: '16px 45px 16px 50px', borderRadius: '18px', border: '1px solid rgba(0, 57, 134, 0.2)', background: 'rgba(255,255,255,0.9)', boxShadow: '0 4px 15px rgba(0,0,0,0.05)', fontSize: '15px', fontWeight: '600', transition: 'all 0.3s ease', color: '#003986' }}
                          />
                          {productSearch && <button onClick={() => setProductSearch('')} style={{ position: 'absolute', right: '15px', top: '50%', transform: 'translateY(-50%)', background: '#f1f5f9', border: 'none', width: '24px', height: '24px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', fontWeight: '900', color: '#64748b', cursor: 'pointer' }}>×</button>}
                        </div>
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '12px' }}>
                      <button className="btn-primary-premium" onClick={() => setView('add')} style={{ background: 'linear-gradient(135deg, #003986, #0056b3)', color: 'white', border: 'none', padding: '12px 25px', borderRadius: '15px', fontWeight: '900', fontSize: '13px', boxShadow: '0 5px 15px rgba(0, 57, 134, 0.3)', cursor: 'pointer' }}>+ NUEVO PRODUCTO</button>
                    </div>
                  </div>

                  <div className="mini-table-container">
                    <table className="mini-table">
                      <thead>
                        <tr><th>PRODUCTO</th><th>CÓDIGO</th><th>PRECIO</th><th>STOCK</th><th>ACCIONES</th></tr>
                      </thead>
                      <tbody>
                        {products.length > 0 ? products.map((p, pIdx) => (
                          <tr key={p.id}>
                            <td className="p-name-cell">{highlightText(p.name, productSearch)}{pIdx < 3 && !productSearch && <span style={{ marginLeft: '10px', background: '#FFD700', color: '#000', padding: '2px 6px', borderRadius: '4px', fontSize: '10px', fontWeight: '900' }}>NEW</span>}</td>
                            <td className="p-code-cell">{highlightText(p.barcode, productSearch)}</td>
                            <td>€{parseFloat(p.sell_price).toFixed(2)}</td>
                            <td><span className={`mini-stock-badge ${p.stock_current < 10 ? 'low' : ''}`}>{p.stock_current}</span></td>
                            <td>
                              <div className="mini-actions">
                                <button className={`btn-mini spool-special ${lastAddedId === p.id ? 'added-success' : ''}`} style={{ width: '40px', height: '40px' }} onClick={() => { addToSpool(p); setLastAddedId(p.id); setShowToast(true); setTimeout(() => { setShowToast(false); setLastAddedId(null); }, 2000); }}>{lastAddedId === p.id && <span className="btn-feedback-float">✅</span>}🎫</button>
                                <button className="btn-mini edit" onClick={() => setEditingProduct(p)}>✎</button>
                                <button className="btn-mini report" onClick={() => setReportProduct(p)}>📈</button>
                                <button className="btn-mini delete" onClick={() => handleDeleteProduct(p.id)}>×</button>
                              </div>
                            </td>
                          </tr>
                        )) : <tr><td colSpan="5" style={{ textAlign: 'center', padding: '100px 20px', background: '#f8fafc' }}><div style={{ fontSize: '50px', marginBottom: '20px' }}>🔍</div><div style={{ fontSize: '18px', fontWeight: '900', color: '#003986' }}>NO SE ENCONTRARON PRODUCTOS</div><button onClick={() => setView('add')} style={{ marginTop: '25px', background: '#E1000F', color: 'white', border: 'none', padding: '12px 30px', borderRadius: '12px', fontWeight: '950', cursor: 'pointer' }}>+ CREAR NUEVO PRODUCTO</button></td></tr>}
                      </tbody>
                    </table>
                  </div>

                  {products.length < totalProducts && (
                    <div className="mini-view-footer" style={{ background: 'rgba(255,255,255,0.7)', padding: '25px', textAlign: 'center', borderRadius: '0 0 20px 20px', borderTop: '1px dashed rgba(0, 0, 0, 0.1)' }}>
                      <button className="btn-load-more" onClick={() => setCurrentProductPage(p => p + 1)} style={{ background: 'white', color: '#003986', border: '2px solid #003986', padding: '15px 40px', borderRadius: '40px', fontWeight: '950', fontSize: '15px', cursor: 'pointer', transition: 'all 0.3s ease', boxShadow: '0 5px 15px rgba(0,0,0,0.05)' }}>➕ MOSTRAR MÁS PRODUCTOS (SIGUIENTES 50)</button>
                    </div>
                  )}
                </div>
              )}

              {selectedKpi === 'a3' && (
                <div className="analysis-view animate-pop" style={{ padding: '20px', height: '100%', display: 'flex', flexDirection: 'column' }}>
                  <h3>📈 ANÁLISIS Y TENDENCIAS</h3>
                  <div style={{ flex: 1, display: 'flex', gap: '20px', flexDirection: 'column', marginTop: '10px' }}>
                    <div style={{ background: '#fff', borderRadius: '15px', padding: '20px', boxShadow: '0 4px 15px rgba(0,0,0,0.05)', flex: 1 }}>
                      <h4>Ventas de la Última Semana (€)</h4>
                      <ResponsiveContainer width="100%" height={220}>
                        <AreaChart data={[{ name: 'Lun', ventas: 420 }, { name: 'Mar', ventas: 380 }, { name: 'Mié', ventas: 510 }, { name: 'Jue', ventas: 460 }, { name: 'Vie', ventas: 680 }, { name: 'Sáb', ventas: 890 }, { name: 'Dom', ventas: 740 }]}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eaeaea" />
                          <XAxis dataKey="name" tick={{ fill: '#666', fontSize: 12 }} axisLine={false} tickLine={false} />
                          <YAxis tick={{ fill: '#666', fontSize: 12 }} axisLine={false} tickLine={false} tickFormatter={(val) => `€${val}`} />
                          <Tooltip contentStyle={{ borderRadius: '10px', border: 'none', boxShadow: '0 5px 15px rgba(0,0,0,0.1)' }} />
                          <Area type="monotone" dataKey="ventas" stroke="#E1000F" strokeWidth={3} fillOpacity={1} fill="url(#colorVentas)" />
                          <defs><linearGradient id="colorVentas" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#E1000F" stopOpacity={0.3} /><stop offset="95%" stopColor="#E1000F" stopOpacity={0} /></linearGradient></defs>
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                    <div style={{ background: '#fff', borderRadius: '15px', padding: '20px', boxShadow: '0 4px 15px rgba(0,0,0,0.05)', flex: 1 }}>
                      <h4>Categorías Top</h4>
                      <ResponsiveContainer width="100%" height={220}>
                        <BarChart data={[{ name: 'Bebidas', valor: 850 }, { name: 'Panadería', valor: 620 }, { name: 'Lácteos', valor: 540 }, { name: 'Snacks', valor: 490 }, { name: 'Limpieza', valor: 380 }]}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eaeaea" />
                          <XAxis dataKey="name" tick={{ fill: '#666', fontSize: 12 }} axisLine={false} tickLine={false} />
                          <YAxis tick={{ fill: '#666', fontSize: 12 }} axisLine={false} tickLine={false} />
                          <Tooltip cursor={{ fill: 'transparent' }} contentStyle={{ borderRadius: '10px', border: 'none', boxShadow: '0 5px 15px rgba(0,0,0,0.1)' }} />
                          <Bar dataKey="valor" fill="#003986" radius={[8, 8, 0, 0]} barSize={40} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </div>
              )}

              {selectedKpi === 'a6' && (
                <div className="sales-history-view animate-pop" style={{ padding: '20px' }}>
                  <h3>💰 HISTORIAL DE VENTAS</h3>
                  <div className="mini-table-container">
                    <table className="mini-table">
                      <thead><tr><th>FECHA</th><th>ARTÍCULOS</th><th>TOTAL</th><th>ACCIÓN</th></tr></thead>
                      <tbody>
                        {sales.map(s => (
                          <tr key={s.id}>
                            <td>{new Date(s.timestamp).toLocaleDateString()} {new Date(s.timestamp).toLocaleTimeString()}</td>
                            <td>{Array.isArray(s.items) ? s.items.length : s.items_count}</td>
                            <td className="bold">€{parseFloat(s.total).toFixed(2)}</td>
                            <td><button className="btn-mini" onClick={() => alert('Detalle de venta no disponible')}>👁️</button></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {selectedKpi === 'a8' && (
                <div className="reports-view animate-pop" style={{ padding: '20px' }}>
                  <h3>📊 INFORMES ESTRATÉGICOS</h3>
                  <div className="reports-stats-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px', marginTop: '20px' }}>
                    <div className="report-stat-card" style={{ padding: '20px', background: '#f8fafc', borderRadius: '15px', border: '1px solid #e2e8f0' }}>
                      <label style={{ fontSize: '10px', color: '#64748b', fontWeight: 900 }}>REVENUE TOTAL</label>
                      <div className="val" style={{ fontSize: '1.5rem', fontWeight: 950, color: '#003986' }}>€{reportSummary.total_revenue.toFixed(2)}</div>
                    </div>
                    <div className="report-stat-card" style={{ padding: '20px', background: '#f8fafc', borderRadius: '15px', border: '1px solid #e2e8f0' }}>
                      <label style={{ fontSize: '10px', color: '#64748b', fontWeight: 900 }}>ORDENES</label>
                      <div className="val" style={{ fontSize: '1.5rem', fontWeight: 950, color: '#003986' }}>{reportSummary.total_orders}</div>
                    </div>
                  </div>
                </div>
              )}

              {selectedKpi === 'a9' && <SyncView API_BASE={API_BASE} />}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DashboardView;
