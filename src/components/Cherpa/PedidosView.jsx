import React, { useState, useEffect } from 'react';
import PanaderiaPedido from './Pedidos/PanaderiaPedido';
import FruteriaPedido from './Pedidos/FruteriaPedido';
import CongeladoPedido from './Pedidos/CongeladoPedido';
import AlimentacionPedido from './Pedidos/AlimentacionPedido';

const PedidosView = ({ API_BASE }) => {
    const [activeDept, setActiveDept] = useState(null); // NULL initially for 4 buttons view
    const [customerName, setCustomerName] = useState('');
    const [currentOrderItems, setCurrentOrderItems] = useState([]);
    const [pedidos, setPedidos] = useState([]);
    const [isLoading, setIsLoading] = useState(false);

    const departments = [
        { id: 'panaderia', label: 'PANADERÍA', icon: '🍞', color: '#f59e0b', desc: 'Bakery & Bollería' },
        { id: 'fruteria', label: 'FRUTERÍA', icon: '🍎', color: '#ef4444', desc: 'Frutas y Verduras' },
        { id: 'congelado', label: 'CONGELADOS', icon: '❄️', color: '#3b82f6', desc: 'Hielo, Pizzas y Pescado' },
        { id: 'seca', label: 'ALIMENTACIÓN', icon: '📦', color: '#65a30d', desc: 'Grocery y Seco' }
    ];

    const activeDeptInfo = departments.find(d => d.id === activeDept);

    useEffect(() => {
        fetchSavedPedidos();
    }, [activeDept]);

    const fetchSavedPedidos = async () => {
        try {
            const res = await fetch(`${API_BASE}/pedidos`);
            if (res.ok) setPedidos(await res.json());
        } catch (e) { console.error(e); }
    };

    const submitPedido = async () => {
        if (!customerName || currentOrderItems.length === 0) {
            alert("Nombre del cliente y productos necesarios!");
            return;
        }
        setIsLoading(true);
        try {
            const res = await fetch(`${API_BASE}/pedidos`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    customer_name: customerName.toUpperCase(),
                    department: activeDept,
                    items: currentOrderItems,
                    total: 0
                })
            });
            if (res.ok) {
                alert("✅ PEDIDO GUARDADO CON ÉXITO!");
                setCustomerName('');
                setCurrentOrderItems([]);
                setActiveDept(null); // Go back home after save
            }
        } catch (e) { console.error(e); }
        setIsLoading(false);
    };

    const deletePedido = async (id) => {
        if (!window.confirm("¿Borrar?")) return;
        await fetch(`${API_BASE}/pedidos/${id}`, { method: 'DELETE' });
        fetchSavedPedidos();
    };

    // --- RENDER 4 BUTTONS HOME ---
    if (!activeDept) {
        return (
            <div className="ped-home animate-slideUp">
                <div className="ped-welcome">
                    <h3>📦 GESTIÓN DE PEDIDOS</h3>
                    <p>Selecciona un departamento para comenzar</p>
                </div>

                <div className="ped-grid-buttons">
                    {departments.map(d => (
                        <button key={d.id} className="big-dept-btn" onClick={() => setActiveDept(d.id)} style={{ borderLeft: `8px solid ${d.color}` }}>
                            <div className="btn-icon-wrap" style={{ background: `${d.color}15` }}>
                                <span className="icon">{d.icon}</span>
                            </div>
                            <div className="btn-text-wrap">
                                <span className="label" style={{ color: d.color }}>{d.label}</span>
                                <span className="desc">{d.desc}</span>
                            </div>
                            <span className="arrow">❯</span>
                        </button>
                    ))}
                </div>

                <style>{`
                    .ped-home { padding: 30px 20px; display: flex; flex-direction: column; gap: 30px; background: #fff; height: 100vh; overflow-y: auto; }
                    .ped-welcome h3 { font-size: 20px; font-weight: 1000; color: #003986; margin: 0; letter-spacing: 1px; }
                    .ped-welcome p { font-size: 11px; font-weight: 900; color: #64748b; margin-top: 5px; }
                    
                    .ped-grid-buttons { display: flex; flex-direction: column; gap: 15px; }
                    .big-dept-btn { background: #fff; border: 2.5px solid #e2e8f0; border-radius: 25px; padding: 25px 23px; cursor: pointer; display: flex; align-items: center; gap: 20px; transition: 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275); text-align: left; position: relative; }
                    .big-dept-btn:hover { transform: scale(1.02); border-color: #003986; box-shadow: 0 10px 30px rgba(0,0,0,0.08); }
                    
                    .btn-icon-wrap { width: 60px; height: 60px; border-radius: 20px; display: flex; align-items: center; justify-content: center; font-size: 32px; flex-shrink: 0; }
                    .btn-text-wrap { flex: 1; display: flex; flex-direction: column; }
                    .label { font-size: 16px; font-weight: 1000; letter-spacing: 1px; }
                    .desc { font-size: 10px; font-weight: 900; color: #94a3b8; margin-top: 2px; }
                    .arrow { font-size: 18px; color: #cbd5e1; font-weight: 1000; }

                    .animate-slideUp { animation: slideUp 0.5s ease-out; }
                    @keyframes slideUp { from { transform: translateY(30px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
                `}</style>
            </div>
        );
    }

    // --- RENDER SPECIFIC ORDER SHEET ---
    return (
        <div className="ped-sheet animate-slideUp">

            {/* STICKY HEADER - TITLE ONLY */}
            <div className="ped-back-nav">
                <div className="active-dept-pill" style={{ background: `${activeDeptInfo.color}15`, border: `2px solid ${activeDeptInfo.color}`, margin: '0 auto' }}>
                    <span className="icon">{activeDeptInfo.icon}</span>
                    <span className="lbl" style={{ color: activeDeptInfo.color }}>{activeDeptInfo.label}</span>
                </div>
            </div>

            {/* BUCKET SUMMARY */}
            <div className="ped-bucket-v5" style={{ background: activeDeptInfo.color }}>
                <input type="text" placeholder="NOMBRE DEL OPERADOR..." value={customerName} onChange={(e) => setCustomerName(e.target.value)} className="cli-input-v5" />

                {currentOrderItems.length > 0 && (
                    <div className="bucket-list-v5">
                        {currentOrderItems.map((it, i) => (
                            <div key={i} className="bit-v5">
                                <span className="bit-q-v5">{it.qty}</span>
                                <span className="bit-n-v5">{it.name}</span>
                                <button className="bit-rem-v5" onClick={() => setCurrentOrderItems(currentOrderItems.filter((_, idx) => idx !== i))}>✖</button>
                            </div>
                        ))}
                    </div>
                )}

                <button className="btn-save-v5" onClick={submitPedido} disabled={isLoading || currentOrderItems.length === 0}>
                    {isLoading ? 'GUARDANDO...' : `✅ FINALIZAR Y GUARDAR (${currentOrderItems.length})`}
                </button>
            </div>

            {/* DEPT COMPONENT */}
            <div className="dept-component-wrap">
                {activeDept === 'panaderia' && <PanaderiaPedido API_BASE={API_BASE} onAddToBucket={(n, q) => setCurrentOrderItems([...currentOrderItems, { name: n, qty: q }])} color={activeDeptInfo.color} />}
                {activeDept === 'fruteria' && <FruteriaPedido API_BASE={API_BASE} onAddToBucket={(n, q) => setCurrentOrderItems([...currentOrderItems, { name: n, qty: q }])} color={activeDeptInfo.color} />}
                {activeDept === 'congelado' && <CongeladoPedido API_BASE={API_BASE} onAddToBucket={(n, q) => setCurrentOrderItems([...currentOrderItems, { name: n, qty: q }])} color={activeDeptInfo.color} />}
                {activeDept === 'seca' && <AlimentacionPedido API_BASE={API_BASE} onAddToBucket={(n, q) => setCurrentOrderItems([...currentOrderItems, { name: n, qty: q }])} color={activeDeptInfo.color} />}
            </div>

            <style>{`
                .ped-sheet { padding: 15px; display: flex; flex-direction: column; gap: 20px; background: #fff; height: 100%; overflow-y: auto; padding-bottom: 250px; }
                
                .ped-back-nav { display: flex; justify-content: space-between; align-items: center; position: sticky; top: -15px; background: #fff; z-index: 100; padding: 10px 0; border-bottom: 1px solid #f1f5f9; }
                .btn-back-home { background: #f1f5f9; border: none; padding: 10px 15px; border-radius: 12px; font-weight: 1000; font-size: 11px; cursor: pointer; color: #003986; }
                .active-dept-pill { padding: 8px 15px; border-radius: 20px; display: flex; align-items: center; gap: 8px; font-weight: 1000; font-size: 11px; }

                .ped-bucket-v5 { border-radius: 25px; padding: 20px; box-shadow: 0 10px 30px rgba(0,0,0,0.1); }
                .cli-input-v5 { width: 100%; padding: 15px; border-radius: 15px; border: none; font-weight: 1000; font-size: 16px; margin-bottom: 12px; }
                .bucket-list-v5 { background: rgba(255,255,255,0.9); border-radius: 15px; padding: 12px; margin-bottom: 12px; max-height: 200px; overflow-y: auto; }
                .bit-v5 { display: flex; align-items: center; gap: 10px; margin-bottom: 8px; font-size: 12px; font-weight: 900; }
                .bit-q-v5 { color: #003986; font-weight: 1000; background: #fff; padding: 2px 8px; border-radius: 6px; min-width: 30px; text-align: center; }
                .bit-n-v5 { flex: 1; color: #003986; line-height: 1.1; }
                .bit-rem-v5 { border: none; background: #fee2e2; color: #ef4444; width: 22px; height: 22px; border-radius: 5px; font-weight: 1000; cursor: pointer; }
                .btn-save-v5 { background: #003986; color: #fff; width: 100%; padding: 15px; border-radius: 15px; border: none; font-weight: 1000; box-shadow: 0 5px 15px rgba(0,0,0,0.2); cursor: pointer; }

                .animate-slideUp { animation: slideUp 0.4s ease-out; }
            `}</style>
        </div>
    );
};

export default PedidosView;
