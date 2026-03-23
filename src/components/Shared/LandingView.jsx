import React from 'react';

const LandingView = ({ setView, logo, isMobile }) => {
  return (
    <div className="landing-container">
      <div className="landing-branding" style={{ marginTop: '20px' }}>
        <img src={logo} alt="Carrefour" className="landing-branding-logo" />
        <h1 className="landing-branding-title" style={{ marginTop: '10px' }}>
          <span className="blue">Carrefour</span> <span className="red">express</span>
        </h1>
        <p className="landing-branding-subtitle">SISTEMA INTEGRAL DE GESTIÓN</p>
      </div>

      <div className="landing-grid">
        <div className="landing-card card-1" onClick={() => setView('scan')}>
          <h3>1. Carrefour Cherpa</h3>
          <p>App Staff Mobile</p>
        </div>
        <div className="landing-card card-2" onClick={() => setView('dashboard')}>
          <h3>2. Back Office</h3>
          <p>Inventario & Consulta</p>
        </div>
        <div className={`landing-card card-3 ${isMobile ? 'mobile-restricted' : ''}`} onClick={() => setView('pos')}>
          <div className="mobile-status-badge">{isMobile ? '🖥️ SÓLO ESCRITORIO' : '✅ STOCK ACTIVE'}</div>
          <h3>3. POS Terminal {isMobile && '🚫'}</h3>
          <p>{isMobile ? '⚠️ Restringido en Móvil' : 'Punto de Venta'}</p>
        </div>
      </div>
    </div>
  );
};

export default LandingView;
