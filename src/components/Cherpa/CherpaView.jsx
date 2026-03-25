import React, { useState } from 'react';
import CherpaCard from './CherpaCard';
import ConsultaArticulo from './ConsultaArticulo';
import PrecioView from './PrecioView';
import SpoolView from './SpoolView';
import AddProductView from './AddProductView';
import BandejaView from './BandejaView';
import CustomerKiosk from './CustomerKiosk';
import KioskQRView from './KioskQRView';

import iconScanner from '../../assets/cherpa/consulta articulo.jpeg';
import iconEditar from '../../assets/cherpa/setting.jpeg';
import iconTickets from '../../assets/cherpa/solicitar ticket.jpeg';
import iconAdd from '../../assets/cherpa/añadir producto.jpeg';
import iconPedidos from '../../assets/cherpa/pedido.jpeg';
import iconRecibo from '../../assets/cherpa/recibo.jpeg';
import iconFaltas from '../../assets/cherpa/falta.jpeg';
import iconChat from '../../assets/cherpa/chat.jpeg';
import iconBalance from '../../assets/cherpa/balance.jpeg';
import iconMerma from '../../assets/cherpa/merma.jpeg';
import iconStaff from '../../assets/cherpa/staff.jpeg';
import iconSpool from '../../assets/cherpa/spool.avif';
import iconReports from '../../assets/cherpa/reports.jpeg';
import iconBandejas from '../../assets/cherpa/carne_new.webp';
import iconReposicion from '../../assets/cherpa/reposicion.jpg';
import iconTareas from '../../assets/cherpa/tareas.jpg';
import iconLogistica from '../../assets/cherpa/logistica.jpg';
import iconA from '../../assets/cherpa/a.webp';
import iconB from '../../assets/cherpa/b.webp';
import iconC from '../../assets/cherpa/c.avif';
import iconSyncCloud from '../../assets/cherpa/sync_cloud.webp';

const CherpaView = ({ onBack, products, addToSpool, clearSpool, updateSpool, removeFromSpool, ticketSpool, setTicketSpool, onGeneratePDF, onAddProduct, onUpdateProduct, activeSubPage, setActiveSubPage, CameraScanner, API_BASE, ticketHistory = [], inputRef }) => {
  const [predefinedBarcode, setPredefinedBarcode] = useState('');

  const menuItems = [
    {
      id: 'scanner',
      label: 'Consulta articulo',
      color: '#E1000F',
      icon: <img src={iconScanner} alt="Scanner" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
    },
    {
      id: 'editar_producto',
      label: 'Editar producto',
      color: '#003986',
      icon: <img src={iconEditar} alt="Editar" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
    },
    {
      id: 'tickets',
      label: 'Solicitar etiquetas',
      color: '#16A34A',
      icon: <img src={iconTickets} alt="Tickets" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
    },
    {
      id: 'add_product',
      label: 'Añadir producto',
      color: '#16A34A',
      icon: <img src={iconAdd} alt="Add" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
    },
    {
      id: 'pedidos',
      label: 'Pedidos',
      color: '#EA580C',
      icon: <img src={iconPedidos} alt="Pedidos" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
    },
    {
      id: 'bandejas',
      label: 'Bandejas Carne',
      color: '#9333EA',
      icon: <img src={iconBandejas} alt="Bandejas" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
    },
    {
      id: 'recibo',
      label: 'Recibo',
      color: '#0891B2',
      icon: <img src={iconRecibo} alt="Recibo" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
    },
    {
      id: 'faltas',
      label: 'Faltas',
      color: '#DB2777',
      icon: <img src={iconFaltas} alt="Faltas" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
    },
    {
      id: 'spool',
      label: 'Spool',
      color: '#FACC15',
      icon: <img src={iconSpool} alt="Spool" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
    },
    {
      id: 'chat',
      label: 'Consulta Digital',
      color: '#0396A6',
      icon: (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: '5px' }}>
          <img src={iconChat} alt="Chat" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
        </div>
      )
    },
    {
      id: 'balance',
      label: 'Carteleria',
      color: '#65A30D',
      icon: <img src={iconBalance} alt="Balance" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
    },
    {
      id: 'merma',
      label: 'Merma',
      color: '#475569',
      icon: <img src={iconMerma} alt="Merma" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
    },
    {
      id: 'staff',
      label: 'Staff',
      color: '#1E293B',
      icon: <img src={iconStaff} alt="Staff" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
    },
    {
      id: 'reports',
      label: 'Reports',
      color: '#F43F5E',
      icon: <img src={iconReports} alt="Reports" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
    },
    {
      id: 'reposicion',
      label: 'Reposición',
      color: '#004691',
      icon: <img src={iconReposicion} alt="Reposición" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
    },
    {
      id: 'tareas',
      label: 'Tareas',
      color: '#004691',
      icon: <img src={iconTareas} alt="Tareas" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
    },
    {
      id: 'logistica',
      label: 'Entrada Mercancia',
      color: '#004691',
      icon: <img src={iconLogistica} alt="Logística" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
    },
    {
      id: 'vouchers',
      label: 'Vouchers',
      color: '#004691',
      icon: <img src={iconA} alt="Vouchers" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
    },
    {
      id: 'sync',
      label: 'Sync',
      color: '#16A34A',
      action: () => window.location.reload(),
      icon: <img src={iconB} alt="Sync" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
    },
    {
      id: 'promos',
      label: 'Promos Especiales',
      color: '#004691',
      icon: <img src={iconC} alt="Promos" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
    },
    {
      id: 'cloud_sync',
      label: 'Cloud Sync',
      color: '#0284c7',
      icon: <img src={iconSyncCloud} alt="Sync Cloud" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
    }
  ];

  const handleCardClick = (item) => {
    if (item.id === 'add_product') {
      handleAddProductClick('');
    } else if (item.action) {
      item.action();
    } else {
      setActiveSubPage(item.id);
    }
  };

  const handleAddProductClick = (barcode = '') => {
    setPredefinedBarcode(typeof barcode === 'string' ? barcode : '');
    setActiveSubPage('add_product');
  };

  // NEW: Back office style logic (add + redirect)
  const handleAddToSpoolAndNav = (product) => {
    addToSpool(product);
    setActiveSubPage('spool');
  };

  const handleAddBack = (wantTicket, ticketData) => {
    if (wantTicket && ticketData) {
      for (let i = 0; i < ticketData.qty; i++) {
        addToSpool(ticketData.product);
      }
    }
    // setActiveSubPage(null); // REMOVED: Stay on Add Product screen to allow multiple additions
  };

  const handleDirectPrint = async () => {
    if (totalPrice <= 0) return;
    const n = parseInt(copies) || 1;
    const items = [];
    for (let i = 0; i < n; i++) {
      items.push({
        id: `CARNE-${Date.now()}-${i}`,
        name: selectedProduct ? selectedProduct.name : "CARNE BANDEJA",
        barcode: generatedBarcode,
        sell_price: totalPrice,
        price_kilo: kiloPrice,
        weight: weight,
        isBandeja: true,
        is_bandeja: true,
        qty: 1
      });
    }
    // Generate PDF directly - skipDelete=true so spool is NOT affected
    const filename = `carne-${new Date().toISOString().slice(0, 10)}-${Date.now()}.pdf`;
    await onGeneratePDF({ filename, orientation: 'landscape' }, items, true);
    setWeight('');
    setKiloPrice('');
    setCopies(1);
  };

  return (
    <div className="cherpa-container">
      <div className="cherpa-grid">
        {menuItems.map((item) => (
          <CherpaCard
            key={item.id}
            icon={item.icon}
            label={item.label}
            color={item.color}
            onClick={() => handleCardClick(item)}
          />
        ))}
      </div>

      <div className="cherpa-mini-footer">
        <div className="status-indicator">
          <span className="blue-dot"></span>
          <span className="status-text">SERVIDOR CONECTADO | v1.2</span>
        </div>
      </div>


      {/* --- SUB PAGES (MODALS) --- */}
      {activeSubPage && (
        <div className="cherpa-sub-page">
          <div className="cherpa-sub-page-header">
            <button className="back-arrow-btn" onClick={() => setActiveSubPage(null)}>
              <svg viewBox="0 0 24 24" fill="none" stroke="black" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="15 18 9 12 15 6"></polyline>
              </svg>
            </button>
            <span className="sub-page-title">{activeSubPage.toUpperCase()}</span>
          </div>

          <div className="sub-page-content">
            {activeSubPage === 'scanner' && (
              <ConsultaArticulo
                products={products}
                addToSpool={handleAddToSpoolAndNav}
                onAddProduct={handleAddProductClick}
                CameraScanner={CameraScanner}
                API_BASE={API_BASE}
                inputRef={inputRef}
              />
            )}
            {activeSubPage === 'editar_producto' && (
              <PrecioView
                forceMode="edit"
                products={products}
                addToSpool={addToSpool}
                onAddProduct={handleAddProductClick}
                onUpdateProduct={onUpdateProduct}
                CameraScanner={CameraScanner}
                API_BASE={API_BASE}
                inputRef={inputRef}
              />
            )}
            {activeSubPage === 'tickets' && (
              <PrecioView
                forceMode="ticket"
                products={products}
                addToSpool={addToSpool}
                ticketSpool={ticketSpool}
                onAddProduct={handleAddProductClick}
                onUpdateProduct={onUpdateProduct}
                CameraScanner={CameraScanner}
                API_BASE={API_BASE}
                inputRef={inputRef}
              />
            )}
            {activeSubPage === 'spool' && (
              <SpoolView
                ticketSpool={ticketSpool}
                setTicketSpool={setTicketSpool}
                onGeneratePDF={onGeneratePDF}
                onClear={clearSpool}
                onUpdate={updateSpool}
                onRemove={removeFromSpool}
                ticketHistory={ticketHistory}
                API_BASE={API_BASE}
                onBack={() => setActiveSubPage(null)}
              />
            )}
            {activeSubPage === 'add_product' && (
              <AddProductView
                onSave={onAddProduct}
                onBack={handleAddBack}
                initialBarcode={predefinedBarcode}
                CameraScanner={CameraScanner}

              />
            )}
            {activeSubPage === 'bandejas' && (
              <BandejaView
                products={products}
                addToSpool={addToSpool}
                onDirectPrint={onGeneratePDF}
                API_BASE={API_BASE}
                onBack={() => setActiveSubPage(null)}
              />
            )}
            {activeSubPage === 'kiosk' && (
              <CustomerKiosk
                CameraScanner={CameraScanner}
                API_BASE={API_BASE}
              />
            )}
            {activeSubPage === 'chat' && (
              <KioskQRView />
            )}
            {!['scanner', 'editar_producto', 'tickets', 'spool', 'add_product', 'bandejas', 'reports', 'kiosk', 'chat'].includes(activeSubPage) && (
              <div style={{ textAlign: 'center', padding: '40px' }}>
                <div style={{ fontSize: '50px', marginBottom: '20px' }}>🚀</div>
                <h2 style={{ color: '#004691', fontWeight: 900 }}>{activeSubPage.toUpperCase()}</h2>
                <p>Módulo en desarrollo...</p>
              </div>
            )}
          </div>
        </div>
      )}

      <style>{`
        .cherpa-container {
          position: fixed;
          top: 0;
          left: 0;
          width: 100%;
          height: 100vh;
          background: #FFFFFF;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: flex-start;
          padding-top: 60px;
          z-index: 1000;
          overflow-y: auto; /* Allow scrolling for long lists of icons */
          -webkit-overflow-scrolling: touch;
        }
        .cherpa-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 10px;
          justify-content: center;
          align-content: flex-start;
          width: 100%;
          max-width: 500px; /* Centered mobile-like width on desktop */
          margin: 10px auto; /* Centered */
          padding: 10px 8px;
          padding-bottom: 120px; /* Increased safe space for last row and footer */
          flex-grow: 1;
        }

        .cherpa-bottom-nav {
          position: fixed;
          bottom: 0;
          left: 0;
          width: 100%;
          height: 70px;
          background: rgba(255, 255, 255, 0.9);
          backdrop-filter: blur(20px);
          display: flex;
          justify-content: space-around;
          align-items: center;
          border-top: 1px solid #f1f5f9;
          z-index: 10000;
        }

        .nav-item {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 4px;
          color: #94a3b8;
          font-weight: 800;
          font-size: 10px;
        }

        .nav-item.active { color: #004691; }

        .nav-center-btn {
          width: 55px;
          height: 55px;
          background: #004691;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          box-shadow: 0 8px 20px rgba(0, 57, 134, 0.3);
          margin-top: -35px;
          border: 4px solid white;
        }

        .cherpa-mini-footer {
          position: fixed;
          bottom: 0;
          left: 0;
          width: 100%;
          height: 25px;
          background: #16A34A; /* Green */
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 10002;
          box-shadow: 0 -2px 10px rgba(0,0,0,0.1);
        }

        .status-indicator {
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .blue-dot {
          width: 8px;
          height: 8px;
          background: #00BFFF; /* Electric Blue */
          border-radius: 50%;
          box-shadow: 0 0 8px #00BFFF;
          animation: pulse-blue 2s infinite;
        }

        .status-text {
          color: white;
          font-size: 9px;
          font-weight: 900;
          letter-spacing: 0.5px;
          text-transform: uppercase;
        }

        @keyframes pulse-blue {
          0% { transform: scale(0.9); opacity: 0.7; box-shadow: 0 0 4px #00BFFF; }
          50% { transform: scale(1.1); opacity: 1; box-shadow: 0 0 12px #00BFFF; }
          100% { transform: scale(0.9); opacity: 0.7; box-shadow: 0 0 4px #00BFFF; }
        }

        .cherpa-sub-page {
          position: fixed;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background: #FFFFFF;
          z-index: 10001;
          display: flex;
          flex-direction: column;
        }

        .cherpa-sub-page-header {
          margin-top: 60px; /* Below main header */
          height: 50px;
          display: flex;
          align-items: center;
          padding: 0 15px;
          background: #fff;
          border-bottom: 1px solid #f1f5f9;
        }

        .back-arrow-btn {
          background: none;
          border: none;
          padding: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
        }

        .back-arrow-btn svg {
          width: 24px;
          height: 24px;
        }

        .sub-page-title {
          font-weight: 800;
          font-size: 14px;
          color: #1e293b;
          margin-left: 5px;
          letter-spacing: 0.5px;
          pointer-events: none;
        }

        .sub-page-content {
          flex: 1;
          display: flex;
          flex-direction: column;
          overflow: hidden;
        }

        .stock-list {
          display: flex;
          flex-direction: column;
          gap: 10px;
          max-height: 70vh;
          overflow-y: auto;
        }

        .stock-item {
          background: #f8fafc;
          padding: 15px;
          border-radius: 12px;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
      `}</style>
    </div>
  );
};

export default React.memo(CherpaView);
