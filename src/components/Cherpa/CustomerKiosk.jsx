import React, { useState, useRef, useEffect } from 'react';
import logo from '../../assets/logo.jpg';

/** 
 * CUSTOMER KIOSK (FINAL SECURE MOBILE-OPTIMIZED VERSION)
 */
const CustomerKiosk = ({ CameraScanner, API_BASE }) => {
  const [viewState, setViewState] = useState('welcome');
  const [product, setProduct] = useState(null);
  const [barcode, setBarcode] = useState('');
  const [isError, setIsError] = useState(false);
  const [scanMode, setScanMode] = useState('manual'); 
  const inputRef = useRef(null);

  // --- SECURITY: AUTO-RESET TIMER (30 Seconds) ---
  const timerRef = useRef(null);
  const startResetTimer = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      setViewState('welcome');
      resetScanner();
    }, 30000); 
  };

  const handleSearch = async (forcedBarcode = null) => {
    const finalBarcode = (forcedBarcode || barcode).trim();
    if (!finalBarcode) return;
    
    startResetTimer();

    try {
      const res = await fetch(`${API_BASE}/kiosk/${encodeURIComponent(finalBarcode)}`);
      if (!res.ok) throw new Error("404");
      const data = await res.json();
      if (data && data.barcode) {
        setProduct(data);
        setIsError(false);
      } else {
        throw new Error("404");
      }
    } catch (err) {
      setProduct(null);
      setIsError(true);
    }
    setBarcode('');
  };

  const handleCameraScan = (code) => {
    setScanMode('manual');
    handleSearch(code);
    startResetTimer();
  };

  const resetScanner = () => {
    setProduct(null);
    setBarcode('');
    setIsError(false);
    setScanMode('manual');
  };

  // SECURITY: DISABLE RIGHT-CLICK & INSPECT
  useEffect(() => {
    const disableRC = (e) => e.preventDefault();
    const disableKeys = (e) => {
      if (e.keyCode === 123 || (e.ctrlKey && e.shiftKey && (e.keyCode === 73 || e.keyCode === 74 || e.keyCode === 67)) || (e.ctrlKey && e.keyCode === 85)) {
        e.preventDefault();
      }
    };
    document.addEventListener('contextmenu', disableRC);
    document.addEventListener('keydown', disableKeys);
    return () => {
      document.removeEventListener('contextmenu', disableRC);
      document.removeEventListener('keydown', disableKeys);
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  // Hidden input focus for external scanners
  useEffect(() => {
    if (viewState === 'scanning' && scanMode === 'manual') {
      const keepFocus = () => {
        if (inputRef.current && document.activeElement !== inputRef.current) {
          inputRef.current.focus();
        }
      };
      const interval = setInterval(keepFocus, 300);
      return () => clearInterval(interval);
    }
  }, [viewState, scanMode]);

  // Reset timer on any interaction
  useEffect(() => {
    const handleActivity = () => { if (viewState === 'scanning') startResetTimer(); };
    window.addEventListener('mousedown', handleActivity);
    return () => window.removeEventListener('mousedown', handleActivity);
  }, [viewState]);

  // --- UI COMPONENTS ---
  const KioskHeader = ({ showBack = false }) => (
    <div className="premium-header-container">
       {showBack && (
         <button className="btn-floating-back" onClick={() => { setViewState('welcome'); resetScanner(); }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" width="20" height="20"><polyline points="15 18 9 12 15 6"></polyline></svg>
         </button>
       )}
       <div className="brand-stack">
          <h1 className="header-brand">
             <span className="blue">CARREFOUR</span> <span className="red">express</span>
          </h1>
          <div className="header-address">RONDA DE OUTEIRO 112</div>
          <div className="header-tag">CONSULTA PRECIO</div>
       </div>
    </div>
  );

  if (viewState === 'welcome') {
    return (
      <div className="kiosk-standalone-root animate-fadeIn">
        <div className="kiosk-watermark-bg">
           <img src={logo} alt="" />
        </div>
        <div className="welcome-glass-card">
          <KioskHeader />
          <button className="btn-main-launch" onClick={() => { setViewState('scanning'); setScanMode('camera'); }}>
             VERIFICAR PRECIO
             <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" width="22" height="22"><polyline points="9 18 15 12 9 6"></polyline></svg>
          </button>
        </div>
        <style>{KIOSK_STYLES}</style>
      </div>
    );
  }

  return (
    <div className="kiosk-standalone-root">
      {isError && (
        <div className="kiosk-modal-overlay animate-fadeIn">
          <div className="error-card animate-pop">
            <div className="error-icon">⚠️</div>
            <h3 className="error-head">LO SIENTO</h3>
            <p className="error-desc-red">PRODUCTO NO ENCONTRADO.<br/>CONSULTA RESPONSABLE O CAJERA, POR FAVOR.</p>
            <button className="btn-modal-close" onClick={() => setIsError(false)}>INTENTAR DE NUEVO</button>
          </div>
        </div>
      )}
      <input ref={inputRef} className="kiosk-hidden-input" value={barcode} onChange={(e) => setBarcode(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') handleSearch(); }} />
      <div className="kiosk-main-layout">
        <KioskHeader showBack={true} />
        <div className="kiosk-scroll-body mobile-centered">
          {product ? (
            <div className="kiosk-price-card animate-pop">
              <div className="status-found">PRODUCTO ENCONTRADO</div>
              <h1 className="p-name">{product.name}</h1>
              <div className="p-barcode-label">{product.barcode}</div>
              <div className="p-price-display-v3">
                <span className="p-cur">€</span>
                <span className="p-val">{parseFloat(product.sell_price).toFixed(2).replace('.', ',')}</span>
              </div>
              {product.offer > 0 && <div className="p-promo-v3">🔥 SEGUNDA UNIDAD -50% 🔥</div>}
              <button className="btn-done-scan" onClick={() => { setViewState('welcome'); resetScanner(); }}>ESCANEADO SIGUIENTE</button>
            </div>
          ) : (
            <div className="kiosk-scan-view-v4 animate-fadeIn">
              <div className="scanner-instruction-box-v4">
                 <h3>{scanMode === 'camera' ? 'CÁMARA ACTIVADA' : 'MODO SCANNER'}</h3>
                 <p>{scanMode === 'camera' ? 'Apunta el código a la cámara' : 'Coloca el producto frente al lector'}</p>
              </div>
              
              {scanMode === 'camera' ? (
                <div className="camera-viewport-v4 animate-pop">
                  <CameraScanner onScan={handleCameraScan} />
                  <button className="btn-exit-cam-v4" onClick={() => { setScanMode('manual'); setViewState('welcome'); }}>CERRAR CÁMARA</button>
                </div>
              ) : (
                <div className="placeholder-container-v4">
                  <div className="visual-sim-v4 animate-pulse-slow">
                     <div className="sim-laser-v4"></div>
                     <div className="sim-barcode-v4">║▌║█║▌│║▌║▌█</div>
                  </div>
                  <div className="v4-actions">
                    <button className="btn-cam-trigger-v4" onClick={() => setScanMode('camera')}>
                      <div className="btn-ico-bg">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" width="18" height="18">
                          <circle cx="12" cy="12" r="3" /><path d="M4 19h16v-9l-3-3H7L4 10v9zM9 5l1.5-2h3L15 5h-6z" />
                        </svg>
                      </div>
                      <span>USAR CÁMARA MÓVIL</span>
                    </button>
                    <button className="btn-volver-v4" onClick={() => setViewState('welcome')}>VOLVER</button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
      <style>{KIOSK_STYLES}</style>
    </div>
  );
};

const KIOSK_STYLES = `
  .kiosk-standalone-root {
    width: 100%; height: 100vh; background: #ffffff; 
    font-family: 'Montserrat', 'Inter', sans-serif;
    display: flex; flex-direction: column; overflow: hidden; position: relative;
    user-select: none;
  }
  .kiosk-hidden-input { position: absolute; left: -9999px; opacity: 0; pointer-events: none; }
  .kiosk-watermark-bg { position: absolute; top:0; left:0; width:100%; height:100%; display:flex; align-items:center; justify-content:center; opacity: 0.12; filter: blur(2px); pointer-events: none; z-index: 1; }
  .kiosk-watermark-bg img { width: 140%; height: auto; transform: rotate(-15deg); }

  /* PREMIUM HEADER */
  .premium-header-container { width: 100%; padding: 40px 20px 20px; text-align: center; position: relative; z-index: 100; }
  .brand-stack { display: flex; flex-direction: column; align-items: center; }
  .header-brand { font-size: 34px; font-weight: 950; margin: 0; text-transform: uppercase; letter-spacing: -1.5px; line-height: 1; }
  .header-brand .blue { color: #003986; }
  .header-brand .red { color: #E1000F; }
  .header-address { font-size: 13px; font-weight: 950; color: #000; margin-top: 8px; letter-spacing: 0.5px; }
  .header-tag { font-size: 14px; font-weight: 900; color: #94a3b8; letter-spacing: 2.5px; margin-top: 15px; text-transform: uppercase; border-top: 1.5px solid #f1f5f9; padding-top: 5px; }
  
  .btn-floating-back { 
    position: absolute; left: 20px; top: 40px; background: #f8fafc; border: 1.5px solid #e2e8f0; 
    width: 48px; height: 48px; border-radius: 15px; display: flex; align-items: center; justify-content: center; cursor: pointer; color: #1e293b;
    transition: 0.2s;
  }
  .btn-floating-back:active { transform: scale(0.9); background: #f1f5f9; }

  /* WELCOME SCREEN */
  .welcome-glass-card { background: rgba(255, 255, 255, 0.85); backdrop-filter: blur(20px); border: 1.5px solid #f1f5f9; border-radius: 50px; padding: 40px 30px 60px; width: 90%; max-width: 450px; text-align: center; margin: auto; box-shadow: 0 40px 90px rgba(0, 57, 134, 0.08); z-index: 10; }
  .btn-main-launch { background: #003986; color: #fff; border: none; padding: 22px 30px; border-radius: 25px; font-size: 15px; font-weight: 950; width: 100%; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 15px; box-shadow: 0 15px 35px rgba(0, 57, 134, 0.2); margin-top: 40px; }

  /* SCANNING LAYOUT V4 (MOBILE OPTIMIZED) */
  .kiosk-main-layout { flex: 1; display: flex; flex-direction: column; overflow: hidden; z-index: 10; }
  .kiosk-scroll-body { flex:1; overflow-y: auto; padding: 0 25px 40px; display: flex; flex-direction: column; align-items: center; }
  .mobile-centered { justify-content: center; } /* Centers the main scanner area vertically */

  .kiosk-scan-view-v4 { width: 100%; max-width: 450px; display: flex; flex-direction: column; align-items: center; margin-top: -20px; }
  .scanner-instruction-box-v4 { text-align: center; margin-bottom: 25px; }
  .scanner-instruction-box-v4 h3 { font-size: 18px; font-weight: 950; color: #003986; margin-bottom: 4px; text-transform: uppercase; letter-spacing: 0.5px; }
  .scanner-instruction-box-v4 p { font-size: 13px; font-weight: 700; color: #64748b; }

  .camera-viewport-v4 { width: 100%; border: 6px solid #003986; border-radius: 40px; overflow: hidden; background: #000; box-shadow: 0 30px 60px rgba(0,0,0,0.1); }
  .btn-exit-cam-v4 { width: 100%; border: none; padding: 18px; background: #ef4444; color: #fff; font-weight: 950; font-size: 13px; cursor: pointer; }

  /* PLACEHOLDER / DESKTOP EMULATION */
  .placeholder-container-v4 { width: 100%; display: flex; flex-direction: column; align-items: center; }
  .visual-sim-v4 {
    width: 250px; height: 160px; background: #fff; border: 2.5px solid #f1f5f9; border-radius: 40px;
    display: flex; align-items: center; justify-content: center; position: relative; overflow: hidden;
    box-shadow: 0 15px 40px rgba(0,0,0,0.02); margin-bottom: 30px;
  }
  .sim-laser-v4 { position: absolute; width: 100%; height: 3px; background: #ef4444; box-shadow: 0 0 15px #ef4444; animation: s4 3s infinite; }
  @keyframes s4 { 0%, 100% { top: 20%; } 50% { top: 80%; } }
  .sim-barcode-v4 { font-size: 40px; color: #1e293b; opacity: 0.7; letter-spacing: -2px; }

  .v4-actions { width: 100%; display: flex; gap: 15px; }
  .btn-cam-trigger-v4 { 
    flex: 1; background: #fff; border: 1.5px solid #e2e8f0; padding: 16px; border-radius: 25px; 
    display: flex; align-items: center; justify-content: center; gap: 15px; cursor: pointer;
    box-shadow: 0 8px 15px rgba(0,0,0,0.02);
  }
  .btn-cam-trigger-v4 span { font-weight: 950; color: #003986; font-size: 11px; }
  .btn-ico-bg { width: 38px; height: 38px; background: #003986; color: #fff; border-radius: 50%; display: flex; align-items: center; justify-content: center; }
  .btn-volver-v4 { flex: 0.4; background: #f1f5f9; border: none; border-radius: 25px; font-weight: 950; color: #64748b; font-size: 12px; cursor: pointer; }

  /* RESULT CARD */
  .kiosk-price-card { background: #fff; border-radius: 50px; padding: 50px 30px; width: 100%; max-width: 480px; text-align: center; border: 2.5px solid #f1f5f9; box-shadow: 0 40px 100px rgba(0,0,0,0.06); }
  .p-val { font-size: 110px; font-weight: 950; letter-spacing: -4px; line-height: 0.9; }

  /* MOBILE RESPONSIVE OVERRIDES */
  @media (max-width: 600px) {
    .premium-header-container { padding: 30px 20px 10px; }
    .header-brand { font-size: 28px; }
    .header-tag { margin-top: 10px; }
    .btn-floating-back { top: 30px; width: 42px; height: 42px; left: 15px; }
    .kiosk-scroll-body { padding: 0 15px 30px; }
    .kiosk-scan-view-v4 { margin-top: -10px; }
    .scanner-instruction-box-v4 { margin-bottom: 20px; }
    .camera-viewport-v4 { border-radius: 35px; border-width: 4px; }
  }

  /* MODAL */
  .kiosk-modal-overlay { position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0, 0, 0, 0.7); backdrop-filter: blur(12px); display: flex; align-items: center; justify-content: center; z-index: 1000000; padding: 25px; }
  .error-card { background: #fff; border-radius: 45px; padding: 50px 40px; width: 100%; max-width: 400px; text-align: center; }
  .error-desc-red { font-size: 16px; font-weight: 950; color: #ef4444; text-transform: uppercase; line-height: 1.4; margin-bottom: 40px; }
  .btn-modal-close { background: #003986; color: #fff; border: none; padding: 22px; border-radius: 22px; font-weight: 950; width: 100%; font-size: 15px; }

  .animate-fadeIn { animation: f4 0.5s ease-out; }
  @keyframes f4 { from { opacity: 0; transform: translateY(15px); } to { opacity: 1; transform: translateY(0); } }
  .animate-pop { animation: p4o 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275); }
  @keyframes p4o { from { scale: 0.8; opacity: 0; } to { scale: 1; opacity: 1; } }
  .animate-pulse-slow { animation: pul4 4s infinite; }
  @keyframes pul4 { 0%, 100% { opacity: 1; } 50% { opacity: 0.8; } }
`;

export default CustomerKiosk;
