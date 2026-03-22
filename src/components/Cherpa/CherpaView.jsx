import React, { useState } from 'react';
import CherpaCard from './CherpaCard';
import ConsultaArticulo from './ConsultaArticulo';
import PrecioView from './PrecioView';
import SpoolView from './SpoolView';
import AddProductView from './AddProductView';
import BandejaView from './BandejaView';

import iconScanner from '../../assets/cherpa/scanner.webp';
import iconPrecio from '../../assets/cherpa/precio.webp';
import iconAdd from '../../assets/cherpa/add_product.png';
import iconPedidos from '../../assets/cherpa/pedidos.jpg';
import iconBandejas from '../../assets/cherpa/bandejas.avif';
import iconSpool from '../../assets/cherpa/spool.avif';

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
      id: 'precio',
      label: 'Precio',
      color: '#004691',
      icon: <img src={iconPrecio} alt="Precio" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
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
      icon: (
        <svg viewBox="0 0 24 24">
          <path d="M21 8l-9-5-9 5v8l9 5 9-5V8zM12 22V12" />
        </svg>
      )
    },
    {
      id: 'faltas',
      label: 'Faltas',
      color: '#DB2777',
      icon: (
        <svg viewBox="0 0 24 24">
          <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2M9 13h6M9 17h3" />
        </svg>
      )
    },
    {
      id: 'spool',
      label: 'Spool',
      color: '#FACC15',
      icon: <img src={iconSpool} alt="Spool" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
    },
    {
      id: 'chat',
      label: 'Chat',
      color: '#0396A6',
      icon: (
        <svg viewBox="0 0 24 24">
          <path d="M21 11.5a8.38 8.38 0 01-.9 3.8 8.5 8.5 0 1 1-7.6-14.7 8.38 8.38 0 0 1 3.8.9L21 3l-1.5 5.5z" />
        </svg>
      )
    },
    {
      id: 'balance',
      label: 'Balance',
      color: '#65A30D',
      icon: (
        <svg viewBox="0 0 24 24">
          <path d="M18 20V10M12 20V4M6 20v-6" />
        </svg>
      )
    },
    {
      id: 'merma',
      label: 'Merma',
      color: '#475569',
      icon: (
        <svg viewBox="0 0 24 24">
          <path d="M21 8l-9-5-9 5v8l9 5 9-5V8zM12 22V12" />
          <path d="M11 9l-2 4h4l-2 4" />
        </svg>
      )
    },
    {
      id: 'staff',
      label: 'Staff',
      color: '#1E293B',
      icon: (
        <svg viewBox="0 0 24 24">
          <rect x="3" y="4" width="18" height="16" rx="2" />
          <circle cx="12" cy="10" r="3" />
        </svg>
      )
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
    const filename = `carne-${new Date().toISOString().slice(0,10)}-${Date.now()}.pdf`;
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

      {/* --- BOTTOM NAVIGATION BAR --- */}
      <nav className="cherpa-bottom-nav">
        <div className="nav-item" onClick={() => window.location.reload()} style={{ cursor: 'pointer' }}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="23 4 23 10 17 10"></polyline>
            <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"></path>
          </svg>
          <span>Sync</span>
        </div>
        <div className="nav-item" onClick={() => setActiveSubPage('scanner')}>
          <div className="nav-center-btn">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M3 7h4M21 7h-4M3 11V7a2 2 0 0 1 2-2h4M15 5h4a2 2 0 0 1 2 2v4M3 17v4a2 2 0 0 0 2 2h4M15 23h4a2 2 0 0 0 2-2v-4M7 12h10"></path></svg>
          </div>
        </div>
        <div className="nav-item" onClick={() => setActiveSubPage('stock')}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"></path><polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline><line x1="12" y1="22.08" x2="12" y2="12"></line></svg>
          <span>Stock</span>
        </div>
      </nav>

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
            {activeSubPage === 'precio' && (
              <PrecioView
                products={products}
                addToSpool={addToSpool}
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
            {!['scanner', 'precio', 'spool', 'add_product', 'bandejas'].includes(activeSubPage) && (
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
          width: 100vw;
          height: 100vh;
          background: #FFFFFF;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: flex-start;
          padding-top: 60px;
          z-index: 1000;
        }



        .cherpa-grid {
          display: grid;
          grid-template-columns: repeat(3, 110px);
          gap: 25px 15px;
          justify-content: center;
          align-content: flex-start;
          width: 100%;
          padding: 10px;
          margin-top: 25px;
          padding-bottom: 110px;
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
