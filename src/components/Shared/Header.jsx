import React, { useState } from 'react';
import logo from '../../assets/logo.jpg';
import brandLogo from '../../assets/carrefour_logo_new.png';

import iconScanner from '../../assets/cherpa/consulta articulo.jpeg';
import iconEditar from '../../assets/cherpa/setting.jpeg';
import iconTickets from '../../assets/cherpa/solicitar ticket.jpeg';
import iconAdd from '../../assets/cherpa/añadir producto.jpeg';
import iconPedidos from '../../assets/cherpa/pedido.jpeg';
import iconBandejas from '../../assets/cherpa/carne_new.webp';
import iconRecibo from '../../assets/cherpa/recibo.jpeg';
import iconFaltas from '../../assets/cherpa/falta.jpeg';
import iconSpool from '../../assets/cherpa/spool.avif';
import iconChat from '../../assets/cherpa/chat.jpeg';
import iconSync from '../../assets/cherpa/b.webp';
import iconReports from '../../assets/cherpa/reports.jpeg';
import iconReposicion from '../../assets/cherpa/reposicion.jpg';
import iconTareas from '../../assets/cherpa/tareas.jpg';
import iconLogistica from '../../assets/cherpa/logistica.jpg';
import iconA from '../../assets/cherpa/a.webp';
import iconC from '../../assets/cherpa/c.avif';
import iconSyncCloud from '../../assets/cherpa/sync_cloud.webp';
import iconBalance from '../../assets/cherpa/balance.jpeg';
import iconMerma from '../../assets/cherpa/merma.jpeg';
import iconStaff from '../../assets/cherpa/staff.jpeg';

// Import Home Icon too
const iconHome = "🏠"; 

const Header = ({ currentView, setView, setCherpaSubPage, onAddProduct }) => {
  const [menuOpen, setMenuOpen] = useState(false);

  const menuItems = [
    { id: 'landing', label: 'Home', icon: iconHome },
    { id: 'cherpa_scanner', label: 'Consulta articulo', icon: iconScanner },
    { id: 'cherpa_editar_producto', label: 'Editar producto', icon: iconEditar },
    { id: 'cherpa_tickets', label: 'Solicitar etiquetas', icon: iconTickets },
    { id: 'cherpa_add_product', label: 'Añadir producto', icon: iconAdd },
    { id: 'cherpa_pedidos', label: 'Pedidos', icon: iconPedidos },
    { id: 'cherpa_bandejas', label: 'Bandejas Carne', icon: iconBandejas },
    { id: 'cherpa_recibo', label: 'Recibo', icon: iconRecibo },
    { id: 'cherpa_faltas', label: 'Faltas', icon: iconFaltas },
    { id: 'cherpa_spool', label: 'Spool', icon: iconSpool },
    { id: 'cherpa_chat', label: 'Consulta Digital', icon: iconChat },
    { id: 'cherpa_balance', label: 'Carteleria', icon: iconBalance },
    { id: 'cherpa_merma', label: 'Merma', icon: iconMerma },
    { id: 'cherpa_staff', label: 'Staff', icon: iconStaff },
    { id: 'cherpa_reports', label: 'Reports', icon: iconReports },
    { id: 'cherpa_reposicion', label: 'Reposición', icon: iconReposicion },
    { id: 'cherpa_tareas', label: 'Tareas', icon: iconTareas },
    { id: 'cherpa_logistica', label: 'Entrada Mercancia', icon: iconLogistica },
    { id: 'cherpa_vouchers', label: 'Vouchers', icon: iconA },
    { id: 'cherpa_sync', label: 'Sync', icon: iconSync },
    { id: 'cherpa_promos', label: 'Promos Especiales', icon: iconC },
    { id: 'cherpa_cloud_sync', label: 'Cloud Sync', icon: iconSyncCloud }
  ];

  return (
    <header className="universal-header">
      <div className="header-left-side">
        <button className="hamburger-btn" onClick={() => setMenuOpen(!menuOpen)}>
          <img src={brandLogo} alt="Menu" className="hamburger-logo-btn" />
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
          padding: 8px;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: 0.2s;
        }

        .hamburger-logo-btn {
          height: 38px;
          width: 38px;
          object-fit: contain;
          border-radius: 10px;
          transition: 0.2s;
        }

        .hamburger-btn:active .hamburger-logo-btn {
          transform: scale(0.9);
        }


        .dropdown-menu {
          position: absolute;
          top: 50px;
          left: 0;
          background: #fff;
          width: 240px;
          border-radius: 20px;
          box-shadow: 0 20px 45px rgba(0,0,0,0.2);
          overflow: hidden;
          animation: slideInDown 0.2s ease-out;
          border: 1px solid #f1f5f9;
          z-index: 100000;
        }

        .menu-item {
          padding: 14px 20px;
          font-weight: 800;
          color: #475569;
          font-family: 'Inter', -apple-system, sans-serif;
          font-size: 14px;
          cursor: pointer;
          transition: 0.2s;
          display: flex;
          align-items: center;
          gap: 16px; /* CLEAR GAP */
          border-bottom: 1px solid #f8fafc;
        }

        .menu-icon-wrapper {
          width: 28px;
          height: 28px;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          pointer-events: none;
        }

        .menu-icon-img {
          width: 100%;
          height: 100%;
          object-fit: contain;
          border-radius: 6px;
        }

        .menu-item:hover, .menu-item.active {
          background: #fdf2f2;
          color: #E1000F;
          padding-left: 20px;
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
