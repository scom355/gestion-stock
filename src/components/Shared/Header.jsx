import React, { useState } from 'react';
import logo from '../../assets/logo.jpg';

const Header = ({ currentView, setView, setCherpaSubPage, onAddProduct }) => {
  const [menuOpen, setMenuOpen] = useState(false);

  const menuItems = [
    { id: 'landing', label: '🏠 Home' },
    { id: 'cherpa_scanner', label: '🔍 Consulta articulo' },
    { id: 'cherpa_precio', label: '📦 Precio' },
    { id: 'cherpa_bandejas', label: '🥩 Bandejas Carne' },
    { id: 'cherpa_add_product', label: '➕ Añadir producto' },
    { id: 'cherpa_pedidos', label: '🚚 Pedidos' },
    { id: 'cherpa_tareas', label: '✅ Tareas' },
    { id: 'cherpa_recibo', label: '🧾 Recibo' },
    { id: 'cherpa_faltas', label: '❌ Faltas' },
    { id: 'cherpa_spool', label: '🖨️ Spool' },
    { id: 'cherpa_chat', label: '💬 Chat' },
    { id: 'cherpa_balance', label: '📈 Balance' },
    { id: 'cherpa_merma', label: '🗑️ Merma' },
    { id: 'cherpa_staff', label: '👥 Staff' },
  ];

  return (
    <header className="universal-header">
      <div className="header-left-side">
        <button className="hamburger-btn" onClick={() => setMenuOpen(!menuOpen)}>
          <div className={`line ${menuOpen ? 'open' : ''}`}></div>
          <div className={`line ${menuOpen ? 'open' : ''}`}></div>
          <div className={`line ${menuOpen ? 'open' : ''}`}></div>
        </button>

        {menuOpen && (
          <div className="dropdown-menu">
            {menuItems.map((item) => (
              <div 
                key={item.id} 
                className={`menu-item ${currentView === item.id ? 'active' : ''}`}
                onClick={() => {
                  if (item.id === 'cherpa_add_product') {
                    onAddProduct();
                    setMenuOpen(false);
                    return;
                  }
                  
                  if (item.id.startsWith('cherpa_')) {
                    const subPage = item.id.replace('cherpa_', '');
                    setView('scan');
                    setCherpaSubPage(subPage);
                  } else {
                    setView(item.id);
                  }
                  setMenuOpen(false);
                }}
              >
                {item.label}
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="header-brand" onClick={() => { setView('landing'); setCherpaSubPage(null); }}>
        <img src={logo} alt="Logo" className="header-logo" />
        <div className="brand-text">
          <div className="main-name"><span className="blue">CARREFOUR</span> <span className="red">EXPRESS</span></div>
          <div className="sub-addr">RONDA DE OUTEIRO 112</div>
        </div>
      </div>

      <div className="header-right-side">
        <div className="header-icon-btn">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path><path d="M13.73 21a2 2 0 0 1-3.46 0"></path></svg>
        </div>
        <img src="https://ui-avatars.com/api/?name=Staff&background=004691&color=fff" className="user-avatar" alt="User" />
      </div>

      <style>{`
        .universal-header {
          position: fixed;
          top: 0.2cm;
          left: 0;
          width: 100%;
          height: 60px;
          background: #fff;
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0 15px;
          border-bottom: 2px solid #f1f5f9;
          z-index: 99999;
          box-shadow: 0 4px 12px rgba(0,0,0,0.05);
        }

        .header-left-side { position: relative; }

        .hamburger-btn {
          background: none;
          border: none;
          display: flex;
          flex-direction: column;
          gap: 5px;
          cursor: pointer;
          padding: 10px;
          border-radius: 8px;
          transition: 0.2s;
        }
        .hamburger-btn:active { background: #f1f5f9; }

        .line {
          width: 22px;
          height: 3px;
          background: #004691;
          border-radius: 5px;
          transition: 0.3s;
        }

        .dropdown-menu {
          position: absolute;
          top: 50px;
          left: 0;
          background: #fff;
          width: 200px;
          border-radius: 15px;
          box-shadow: 0 10px 30px rgba(0,0,0,0.15);
          overflow: hidden;
          animation: slideInDown 0.2s ease-out;
          border: 1px solid #f1f5f9;
        }

        .menu-item {
          padding: 15px 20px;
          font-weight: 800;
          color: #475569;
          font-size: 14px;
          cursor: pointer;
          transition: 0.2s;
        }

        .menu-item:hover, .menu-item.active {
          background: #f1f5f9;
          color: #004691;
          padding-left: 25px;
        }

        .header-brand {
          display: flex;
          align-items: center;
          gap: 10px;
          cursor: pointer;
        }

        .header-logo { height: 38px; border-radius: 8px; }

        .brand-text { display: flex; flex-direction: column; }
        .main-name { font-weight: 950; font-size: 16px; letter-spacing: -0.5px; }
        .main-name .blue { color: #004691; }
        .main-name .red { color: #E1000F; }
        .sub-addr { font-size: 9px; color: #94a3b8; font-weight: 800; }

        .header-right-side { display: flex; align-items: center; gap: 12px; }
        .header-icon-btn { 
          width: 35px; height: 35px; background: #f8fafc; border-radius: 10px;
          display: flex; align-items: center; justify-content: center;
        }
        .user-avatar { width: 34px; height: 34px; border-radius: 50%; border: 2px solid #004691; padding: 2px; }

        @keyframes slideInDown {
          from { transform: translateY(-10px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }

        @media (max-width: 600px) {
          .sub-addr { display: none; }
          .main-name { font-size: 14px; }
        }
      `}</style>
    </header>
  );
};

export default Header;
