import React, { useState, useEffect } from 'react';

const PedidosManager = ({ API_BASE }) => {
    const [view, setView] = useState('orders'); // 'orders' or 'catalog'
    const [pedidos, setPedidos] = useState([]);
    const [catalogItems, setCatalogItems] = useState([]);
    const [activeCatalogDept, setActiveCatalogDept] = useState('panaderia');
    const [newItemName, setNewItemName] = useState('');
    const [newItemImage, setNewItemImage] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [filter, setFilter] = useState('pending');

    const departments = {
        'panaderia': { label: 'PANADERÍA', icon: '🥐', color: '#f59e0b' },
        'fruteria': { label: 'FRUTERÍA', icon: '🍎', color: '#ef4444' },
        'congelado': { label: 'CONGELADOS', icon: '❄️', color: '#3b82f6' },
        'seca': { label: 'ALIMENTACIÓN', icon: '📦', color: '#65a30d' }
    };

    useEffect(() => {
        if (view === 'orders') loadAllPedidos();
        else loadCatalog(activeCatalogDept);
    }, [view, activeCatalogDept]);

    const loadAllPedidos = async () => {
        setIsLoading(true);
        try {
            const res = await fetch(`${API_BASE}/pedidos`);
            if (res.ok) {
                const data = await res.json();
                setPedidos(data || []);
            }
        } catch (e) { console.error(e); }
        setIsLoading(false);
    };

    const loadCatalog = async (dept) => {
        setIsLoading(true);
        try {
            const res = await fetch(`${API_BASE}/catalog/${dept}`);
            if (res.ok) {
                const data = await res.json();
                setCatalogItems(data || []);
            }
        } catch (e) { console.error(e); }
        setIsLoading(false);
    };

    const addCatalogItem = async () => {
        if (!newItemName.trim()) return;
        try {
            const res = await fetch(`${API_BASE}/catalog/${activeCatalogDept}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: newItemName.toUpperCase(),
                    image_url: newItemImage
                })
            });
            if (res.ok) {
                setNewItemName('');
                setNewItemImage('');
                loadCatalog(activeCatalogDept);
            }
        } catch (e) { console.error(e); }
    };

    const deleteCatalogItem = async (id) => {
        if (!window.confirm("¿Eliminar este producto?")) return;
        try {
            const res = await fetch(`${API_BASE}/catalog/${activeCatalogDept}/${id}`, { method: 'DELETE' });
            if (res.ok) {
                // Optimistic UI update or just reload
                loadCatalog(activeCatalogDept);
            } else {
                alert("Error al eliminar del servidor.");
            }
        } catch (e) { console.error(e); }
    };

    const updateStatus = async (id, newStatus) => {
        try {
            const res = await fetch(`${API_BASE}/pedidos/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: newStatus })
            });
            if (res.ok) loadAllPedidos();
        } catch (e) { console.error(e); }
    };

    const deletePedido = async (id) => {
        if (!window.confirm("¿Seguro que deseas eliminar este pedido?")) return;
        try {
            await fetch(`${API_BASE}/pedidos/${id}`, { method: 'DELETE' });
            loadAllPedidos();
        } catch (e) { console.error(e); }
    };

    const filteredPedidos = (pedidos || []).filter(p => !filter || p.status === filter);

    return (
        <div className="pedidos-manager-v2">
            <div className="pm-top-nav">
                <button className={`nav-tab ${view === 'orders' ? 'active' : ''}`} onClick={() => setView('orders')}>
                    📋 PEDIDOS
                </button>
                <button className={`nav-tab ${view === 'catalog' ? 'active' : ''}`} onClick={() => setView('catalog')}>
                    🏷️ CATÁLOGO
                </button>
            </div>

            {view === 'orders' ? (
                <>
                    <div className="pm-header">
                        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                            <h2 className="pm-title">📦 CONTROL DE PEDIDOS</h2>
                            <span className="count-badge">{filteredPedidos.length}</span>
                        </div>
                        <div className="pm-filters" style={{ display: 'flex', gap: '10px' }}>
                            <button className={`f-btn ${filter === 'pending' ? 'active' : ''}`} onClick={() => setFilter('pending')}>PENDIENTES</button>
                            <button className={`f-btn ${filter === 'prepared' ? 'active' : ''}`} onClick={() => setFilter('prepared')}>PREPARADOS</button>
                            <button className={`f-btn ${filter === '' ? 'active' : ''}`} onClick={() => setFilter('')}>TODOS</button>
                            <button className="refresh-btn" onClick={loadAllPedidos}>🔄</button>
                        </div>
                    </div>

                    <div className="pm-grid">
                        {isLoading ? (
                            <div className="pm-loader">Cargando pedidos...</div>
                        ) : filteredPedidos.length === 0 ? (
                            <div className="pm-empty">
                                <div style={{ fontSize: '50px' }}>🛒</div>
                                <h3>NO HAY PEDIDOS</h3>
                                <p>Los pedidos aparecerán aquí cuando alguien los realice.</p>
                            </div>
                        ) : (
                            filteredPedidos.map(p => {
                                const dept = departments[p.department] || { label: 'GENERAL', icon: '📦', color: '#94a3b8' };
                                return (
                                    <div key={p.id} className="p-card" style={{ borderTop: `5px solid ${dept.color}` }}>
                                        <div className="p-top">
                                            <div className="p-dept-info">
                                                <span className="p-icon">{dept.icon}</span>
                                                <label>{dept.label}</label>
                                            </div>
                                            <span className={`p-status-tag ${p.status}`}>{p.status.toUpperCase()}</span>
                                        </div>
                                        <div className="p-client-row">
                                            <div className="p-client-name">{p.customer_name}</div>
                                            <div className="p-time">{new Date(p.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                                        </div>
                                        <div className="p-items-list">
                                            {p.items && p.items.map((it, idx) => (
                                                <div key={idx} className="p-item">
                                                    <span className="p-qty">{it.qty}</span>
                                                    <span className="p-prod">{it.name}</span>
                                                </div>
                                            ))}
                                        </div>
                                        <div className="p-actions">
                                            {p.status === 'pending' && (
                                                <button className="btn-action check" onClick={() => updateStatus(p.id, 'prepared')}>
                                                    ✅ Preparado
                                                </button>
                                            )}
                                            {p.status === 'prepared' && (
                                                <button className="btn-action deliver" onClick={() => updateStatus(p.id, 'delivered')}>
                                                    📦 Entregado
                                                </button>
                                            )}
                                            <button className="btn-action delete" onClick={() => deletePedido(p.id)}>🗑️</button>
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>
                </>
            ) : (
                <div className="catalog-manager animate-fade-in">
                    <div className="catalog-header-main">
                        <div className="catalog-title-group">
                            <h2 className="catalog-title">🏷️ GESTIÓN DE CATÁLOGO</h2>
                            <p>Configura los productos que el trabajador verá en cada departamento.</p>
                        </div>
                        <div className="dept-tabs-mini">
                            {Object.entries(departments).map(([key, d]) => (
                                <button key={key} className={`dept-tab-btn ${activeCatalogDept === key ? 'active' : ''}`}
                                    onClick={() => setActiveCatalogDept(key)}
                                    style={{ '--d-color': d.color }}>
                                    <span>{d.icon}</span> {d.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="catalog-content-layout">
                        <div className="catalog-add-box">
                            <h4>Nuevo Producto ({departments[activeCatalogDept].label})</h4>
                            <div className="add-input-group">
                                <label style={{ fontSize: '10px', fontWeight: '950', color: '#64748b' }}>NOMBRE</label>
                                <input
                                    type="text"
                                    placeholder="Ej: BAGUETTE..."
                                    value={newItemName}
                                    onChange={(e) => setNewItemName(e.target.value)}
                                />
                                <label style={{ fontSize: '10px', fontWeight: '950', color: '#64748b', marginTop: '10px' }}>IMAGEN O ICONO (Emoji o URL)</label>
                                <input
                                    type="text"
                                    placeholder="Ej: 🥖 o URL de imagen..."
                                    value={newItemImage}
                                    onChange={(e) => setNewItemImage(e.target.value)}
                                    onKeyPress={(e) => e.key === 'Enter' && addCatalogItem()}
                                />
                                <button className="btn-add-cat" style={{ marginTop: '10px' }} onClick={addCatalogItem}>AÑADIR AL CATÁLOGO</button>
                            </div>
                        </div>

                        <div className="catalog-list">
                            {isLoading ? (
                                <p className="cat-loading">Cargando...</p>
                            ) : catalogItems.length === 0 ? (
                                <div className="cat-empty">
                                    <div style={{ fontSize: '40px' }}>📝</div>
                                    <p>No hay productos en este departamento.</p>
                                </div>
                            ) : (
                                <div className="cat-grid">
                                    {catalogItems.map(item => (
                                        <div key={item.id} className="cat-item-card">
                                            <div className="cat-item-left">
                                                <div className="cat-img-preview">
                                                    {item.image_url ? (
                                                        item.image_url.length < 10 ? <span>{item.image_url}</span> : <img src={item.image_url} alt="" />
                                                    ) : <span>📦</span>}
                                                </div>
                                                <span className="cat-item-name">{item.name}</span>
                                            </div>
                                            <button className="btn-del-cat" onClick={() => deleteCatalogItem(item.id)}>🗑️</button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            <style>{`
                .pedidos-manager-v2 { padding: 5px; height: 100%; display: flex; flex-direction: column; gap: 15px; }
                .pm-top-nav { display: flex; gap: 10px; padding: 10px; background: rgba(0, 57, 134, 0.03); border-radius: 15px; }
                .nav-tab { flex: 1; padding: 15px; border: none; border-radius: 12px; font-weight: 1000; cursor: pointer; transition: 0.3s; background: #fff; color: #64748b; font-size: 13px; }
                .nav-tab.active { background: #003986; color: #fff; box-shadow: 0 5px 15px rgba(0, 57, 134, 0.2); }
                .pm-header { display: flex; justify-content: space-between; align-items: center; background: #fff; padding: 20px; border-radius: 20px; box-shadow: 0 4px 15px rgba(0,0,0,0.05); }
                .pm-title { font-size: 1.4rem; font-weight: 1000; color: #003986; margin: 0; }
                .count-badge { background: #E1000F; color: #fff; padding: 4px 12px; border-radius: 10px; font-weight: 900; font-size: 14px; }
                .pm-filters .f-btn { border: 2px solid #e2e8f0; background: #fff; padding: 8px 15px; border-radius: 12px; font-weight: 950; font-size: 11px; color: #64748b; cursor: pointer; }
                .pm-filters .f-btn.active { background: #003986; color: #fff; border-color: #003986; }
                .refresh-btn { border: none; background: #f1f5f9; padding: 8px 12px; border-radius: 10px; cursor: pointer; }
                .pm-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 20px; overflow-y: auto; padding-bottom: 50px; }
                .p-card { background: #fff; border-radius: 20px; padding: 20px; box-shadow: 0 5px 20px rgba(0,0,0,0.06); transition: 0.2s; border: 1px solid #f1f5f9; }
                .p-top { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; }
                .p-dept-info { display: flex; align-items: center; gap: 8px; }
                .p-dept-info label { font-size: 10px; font-weight: 1000; color: #64748b; }
                .p-status-tag { font-size: 9px; font-weight: 1000; padding: 4px 10px; border-radius: 8px; }
                .p-status-tag.pending { background: #fff7ed; color: #f59e0b; }
                .p-status-tag.prepared { background: #f0fdf4; color: #22c55e; }
                .p-status-tag.delivered { background: #f1f5f9; color: #64748b; }
                .p-client-row { display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 15px; border-bottom: 1px dashed #e2e8f0; padding-bottom: 10px; }
                .p-client-name { font-size: 17px; font-weight: 1000; color: #1e293b; }
                .p-time { font-size: 11px; font-weight: 900; color: #94a3b8; }
                .p-items-list { display: flex; flex-direction: column; gap: 8px; margin-bottom: 20px; min-height: 80px; }
                .p-item { display: flex; align-items: center; gap: 10px; background: #f8fafc; padding: 8px 12px; border-radius: 10px; }
                .p-qty { font-weight: 1000; color: #003986; font-size: 13px; min-width: 40px; text-align: center; border-right: 2px solid #e2e8f0; padding-right: 10px; }
                .p-prod { font-weight: 900; font-size: 12px; color: #1e293b; }
                .p-actions { display: flex; gap: 8px; }
                .btn-action { flex: 1; padding: 10px; border: none; border-radius: 10px; font-weight: 1000; font-size: 11px; cursor: pointer; transition: 0.2s; }
                .btn-action.check { background: #003986; color: #fff; }
                .btn-action.deliver { background: #22c55e; color: #fff; }
                .btn-action.delete { width: 40px; flex: none; background: #fee2e2; color: #ef4444; }

                .catalog-manager { background: #fff; border-radius: 25px; padding: 30px; box-shadow: 0 10px 30px rgba(0,0,0,0.05); flex: 1; display: flex; flex-direction: column; gap: 30px; }
                .catalog-header-main { display: flex; flex-direction: column; gap: 20px; border-bottom: 1px solid #f1f5f9; padding-bottom: 25px; }
                .catalog-title { font-size: 1.6rem; font-weight: 1000; color: #1e293b; margin: 0; }
                .catalog-title-group p { color: #64748b; font-size: 13px; margin: 5px 0 0; font-weight: 800; }
                .dept-tabs-mini { display: flex; gap: 10px; overflow-x: auto; padding-bottom: 5px; }
                .dept-tab-btn { padding: 10px 20px; border: 2px solid #f1f5f9; border-radius: 15px; background: #fff; font-weight: 1000; font-size: 11px; cursor: pointer; white-space: nowrap; transition: 0.3s; display: flex; align-items: center; gap: 8px; }
                .dept-tab-btn.active { background: var(--d-color); color: #fff; border-color: var(--d-color); box-shadow: 0 8px 20px rgba(0,0,0,0.1); }
                .dept-tab-btn span { font-size: 16px; transition: transform 0.3s; }
                .dept-tab-btn.active span { transform: scale(1.2); }
                .catalog-content-layout { display: grid; grid-template-columns: 350px 1fr; gap: 30px; flex: 1; overflow: hidden; }
                .catalog-add-box { background: #f8fafc; padding: 25px; border-radius: 20px; border: 2px dashed #e2e8f0; height: fit-content; }
                .catalog-add-box h4 { margin: 0 0 15px; font-size: 13px; font-weight: 1000; color: #1e293b; }
                .add-input-group { display: flex; flex-direction: column; gap: 8px; }
                .add-input-group input { padding: 12px 15px; border-radius: 12px; border: 2px solid #e2e8f0; font-weight: 950; font-size: 13px; outline: none; background: #fff; }
                .btn-add-cat { padding: 15px; background: #003986; color: #fff; border: none; border-radius: 12px; font-weight: 1000; cursor: pointer; font-size: 12px; }
                .catalog-list { overflow-y: auto; padding-right: 10px; }
                .cat-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); gap: 12px; }
                .cat-item-card { background: #fff; border: 1.5px solid #f1f5f9; border-radius: 18px; padding: 10px 15px; display: flex; justify-content: space-between; align-items: center; transition: 0.2s; box-shadow: 0 4px 10px rgba(0,0,0,0.02); }
                .cat-item-card:hover { border-color: #003986; transform: translateY(-3px); box-shadow: 0 8px 20px rgba(0,57,134,0.08); }
                .cat-item-left { display: flex; align-items: center; gap: 12px; }
                .cat-img-preview { width: 45px; height: 45px; background: #f1f5f9; border-radius: 12px; display: flex; align-items: center; justify-content: center; overflow: hidden; font-size: 22px; }
                .cat-img-preview img { width: 100%; height: 100%; object-fit: cover; }
                .cat-item-name { font-size: 12px; font-weight: 1000; color: #334155; text-transform: uppercase; }
                .btn-del-cat { width: 35px; height: 35px; border-radius: 10px; border: none; background: #fee2e2; color: #ef4444; cursor: pointer; font-size: 15px; transition: 0.2s; }
                .btn-del-cat:hover { background: #ef4444; color: #fff; }
                .cat-loading, .cat-empty { text-align: center; padding: 50px; color: #94a3b8; font-weight: 900; }
                .animate-fade-in { animation: fadeIn 0.4s ease-out; }
                @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
            `}</style>
        </div>
    );
};

export default PedidosManager;
