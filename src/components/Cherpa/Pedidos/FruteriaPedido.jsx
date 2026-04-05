import React, { useState, useEffect } from 'react';

const FruteriaPedido = ({ API_BASE, onAddToBucket, color }) => {
    const [catalogItems, setCatalogItems] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [quantities, setQuantities] = useState({});

    useEffect(() => {
        fetchCatalog();
    }, []);

    const fetchCatalog = async () => {
        setIsLoading(true);
        try {
            const res = await fetch(`${API_BASE}/catalog/fruteria`);
            if (res.ok) {
                const data = await res.json();
                setCatalogItems(data || []);
            }
        } catch (e) { console.error(e); }
        setIsLoading(false);
    };

    const handleAdd = (p) => {
        const qty = quantities[p.id] || "1";
        const label = isNaN(qty) ? qty : `${qty} KG`;
        onAddToBucket(p.name, label);
        setQuantities({ ...quantities, [p.id]: '' });
    };

    return (
        <div className="dept-ped-sheet">
            <div className="stock-list-container">
                {isLoading ? (
                    <div className="loading-state">Cargando catálogo... 🍎</div>
                ) : catalogItems.length === 0 ? (
                    <div className="empty-state" style={{ padding: '40px', textAlign: 'center', color: '#94a3b8', fontWeight: '1000' }}>
                        No hay productos configurados en el Back Office.
                    </div>
                ) : (
                    <table className="stock-table">
                        <thead>
                            <tr>
                                <th width="50">#</th>
                                <th width="60">IMG</th>
                                <th>PRODUCTO (FRUTERÍA)</th>
                                <th width="100">KILOS</th>
                                <th width="50">OK</th>
                            </tr>
                        </thead>
                        <tbody>
                            {catalogItems.map((p, idx) => (
                                <tr key={p.id}>
                                    <td className="row-num" style={{ fontSize: '11px', textAlign: 'center', fontWeight: '900', color: '#94a3b8' }}>{idx + 1}</td>
                                    <td className="row-img">
                                        <div className="p-img-box">
                                            {p.image_url ? (
                                                p.image_url.length < 10 ? <span>{p.image_url}</span> : <img src={p.image_url} alt="" />
                                            ) : <span>🍎</span>}
                                        </div>
                                    </td>
                                    <td className="p-name">{p.name}</td>
                                    <td>
                                        <input 
                                            type="text" 
                                            placeholder="1" 
                                            inputMode="decimal"
                                            value={quantities[p.id] || ''} 
                                            onChange={(e) => setQuantities({ ...quantities, [p.id]: e.target.value })} 
                                            className="qty-input" 
                                            onBlur={() => handleAdd(p)}
                                        />
                                    </td>
                                    <td>
                                        <button className="btn-add-tick" onClick={() => handleAdd(p)} style={{ color }}>✅</button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>

            <style>{`
                .dept-ped-sheet { background: #fff; border-radius: 15px; border: 1.5px solid #e2e8f0; margin-top: 10px; min-height: 200px; }
                .stock-table { width: 100%; border-collapse: collapse; }
                .stock-table th { background: #f8fafc; padding: 10px; font-size: 10px; font-weight: 1000; color: #64748b; text-align: left; border-bottom: 2px solid #e2e8f0; }
                .stock-table td { padding: 8px; border-bottom: 1px solid #f1f5f9; vertical-align: middle; }
                .p-img-box { width: 45px; height: 45px; background: #f1f5f9; border-radius: 12px; display: flex; align-items: center; justify-content: center; overflow: hidden; font-size: 22px; }
                .p-img-box img { width: 100%; height: 100%; object-fit: cover; }
                .p-name { font-size: 13px; font-weight: 700; color: #1a1a1a; line-height: 1.4; text-transform: uppercase; padding: 12px 5px; }
                .qty-input { width: 80px; padding: 12px 0px; border-radius: 12px; border: 3px solid #cbd5e1; font-weight: 1000; font-size: 16px; text-align: center; color: #000; outline: none; }
                .btn-add-tick { height: 45px; width: 45px; border-radius: 12px; border: none; background: #f0fdf4; font-size: 20px; cursor: pointer; border: 1.5px solid #dcfce7; }
                .loading-state { padding: 40px; text-align: center; font-weight: 1000; color: #64748b; }
            `}</style>
        </div>
    );
};

export default FruteriaPedido;
