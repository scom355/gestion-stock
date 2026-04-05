import React, { useState, useEffect } from 'react';

const PanaderiaPedido = ({ API_BASE, onAddToBucket }) => {
    const [bakeryItems, setBakeryItems] = useState([]);
    const [quantities, setQuantities] = useState({});
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        fetchCatalog();
    }, []);

    const fetchCatalog = async () => {
        setIsLoading(true);
        try {
            const res = await fetch(`${API_BASE}/catalog/panaderia`);
            if (res.ok) {
                const data = await res.json();
                setBakeryItems(data || []);
            }
        } catch (e) { console.error(e); }
        setIsLoading(false);
    };

    const handleConfirm = (id, name) => {
        const qty = quantities[id];
        if (!qty || qty === '0') return;
        const label = isNaN(qty) ? qty : `${qty} CAJAS`;
        onAddToBucket(name, label);
        setQuantities({ ...quantities, [id]: '' });
    };

    return (
        <div className="panaderia-static-sheet">
            {isLoading ? (
                <div style={{ padding: '20px', textAlign: 'center', fontWeight: '1000', color: '#64748b' }}>Cargando catálogo...</div>
            ) : bakeryItems.length === 0 ? (
                <div style={{ padding: '40px', textAlign: 'center' }}>
                    <p style={{ fontWeight: '1000', color: '#94a3b8' }}>No hay productos configurados.</p>
                </div>
            ) : (
                <table className="bakery-table">
                    <thead>
                        <tr>
                            <th width="30">#</th>
                            <th width="50">IMG</th>
                            <th>PRODUCTO</th>
                            <th width="90">CANTIDAD</th>
                            <th width="45">OK</th>
                        </tr>
                    </thead>
                    <tbody>
                        {bakeryItems.map((p, index) => (
                            <tr key={p.id}>
                                <td className="row-num">{index + 1}</td>
                                <td className="row-img">
                                    <div className="p-img-box">
                                        {p.image_url ? (
                                            p.image_url.length < 10 ? <span>{p.image_url}</span> : <img src={p.image_url} alt="" />
                                        ) : <span>🥖</span>}
                                    </div>
                                </td>
                                <td className="p-name">{p.name}</td>
                                <td className="p-qty">
                                    <input 
                                        type="text" 
                                        inputMode="decimal"
                                        placeholder="0"
                                        value={quantities[p.id] || ''}
                                        onChange={(e) => setQuantities({ ...quantities, [p.id]: e.target.value })}
                                        onBlur={() => handleConfirm(p.id, p.name)}
                                    />
                                </td>
                                <td>
                                    <button className="btn-ok-mini" onClick={() => handleConfirm(p.id, p.name)}>✅</button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            )}

            <style>{`
                .panaderia-static-sheet { background: #fff; border-radius: 15px; border: 1.5px solid #e2e8f0; margin-top: 10px; min-height: 200px; }
                .bakery-table { width: 100%; border-collapse: collapse; }
                .bakery-table th { background: #f8fafc; padding: 10px; font-size: 10px; font-weight: 1000; color: #64748b; text-align: left; border-bottom: 2px solid #e2e8f0; }
                .bakery-table td { padding: 8px; border-bottom: 1px solid #f1f5f9; vertical-align: middle; }
                .row-num { font-size: 11px; font-weight: 1000; color: #64748b; text-align: center; }
                .p-img-box { width: 40px; height: 40px; background: #f1f5f9; border-radius: 10px; display: flex; align-items: center; justify-content: center; overflow: hidden; font-size: 20px; }
                .p-img-box img { width: 100%; height: 100%; object-fit: cover; }
                .p-name { font-size: 13px; font-weight: 700; color: #1a1a1a; line-height: 1.4; text-transform: uppercase; padding: 12px 5px; }
                .p-qty input { width: 100%; padding: 12px 0px; border-radius: 12px; border: 3px solid #cbd5e1; font-weight: 1000; font-size: 16px; text-align: center; color: #000; outline: none; }
                .btn-ok-mini { height: 45px; width: 45px; border-radius: 12px; border: none; background: #f0fdf4; font-size: 20px; cursor: pointer; border: 1.5px solid #dcfce7; }
            `}</style>
        </div>
    );
};

export default PanaderiaPedido;
