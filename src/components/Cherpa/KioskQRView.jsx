import React from 'react';

const KioskQRView = () => {
  const publicLink = `${window.location.origin}${window.location.pathname}?view=kiosk`;
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(publicLink)}`;

  return (
    <div className="kiosk-qr-container">
      <div className="kqr-header">
        <div className="kqr-icon">📱</div>
        <h2>MODO PÚBLICO (KIOSCO)</h2>
        <p>Muestra este código a tus clientes para que consulten precios desde su propio móvil.</p>
      </div>

      <div className="kqr-card animate-pop">
        <div className="kqr-tag">URL DE ACCESO LIMITADO</div>
        <div className="qr-wrapper">
          <img src={qrUrl} alt="QR Code" />
        </div>
        <div className="kqr-link-display">{publicLink}</div>
        <button className="btn-copy" onClick={() => {
            navigator.clipboard.writeText(publicLink);
            alert("Enlace copiado al portapapeles");
        }}>
           📋 COPIAR ENLACE
        </button>
      </div>

      <div className="kqr-info-section">
          <h3>¿Cómo funciona?</h3>
          <ul>
              <li>🔒 <strong>Seguro:</strong> El cliente NO podrá ver el inventario ni los beneficios.</li>
              <li>⚡ <strong>Rápido:</strong> Solo escanea y el precio aparece al instante.</li>
              <li>🛒 <strong>Autogestión:</strong> Reduce las preguntas de "¿Cuánto cuesta?" en caja.</li>
          </ul>
      </div>

      <style>{`
        .kiosk-qr-container {
          padding: 30px 20px;
          display: flex;
          flex-direction: column;
          align-items: center;
          background: #fff;
          height: 100%;
          overflow-y: auto;
          font-family: 'Montserrat', sans-serif;
        }

        .kqr-header { text-align: center; margin-bottom: 30px; }
        .kqr-icon { font-size: 50px; margin-bottom: 10px; }
        .kqr-header h2 { font-size: 20px; font-weight: 950; color: #003986; margin-bottom: 8px; }
        .kqr-header p { font-size: 13px; color: #64748b; font-weight: 700; line-height: 1.5; max-width: 300px; margin: 0 auto; }

        .kqr-card {
           background: #f8fafc;
           padding: 30px;
           border-radius: 40px;
           border: 2px dashed #003986;
           display: flex;
           flex-direction: column;
           align-items: center;
           box-shadow: 0 20px 40px rgba(0,0,0,0.05);
           width: 100%;
           max-width: 350px;
        }

        .kqr-tag { font-size: 9px; font-weight: 950; color: #003986; background: #e0f2fe; padding: 5px 12px; border-radius: 20px; margin-bottom: 20px; }
        .qr-wrapper { background: #fff; padding: 15px; border-radius: 25px; box-shadow: 0 10px 25px rgba(0,0,0,0.05); margin-bottom: 20px; }
        .qr-wrapper img { width: 220px; height: 220px; display: block; }
        
        .kqr-link-display { font-size: 10px; color: #94a3b8; font-family: monospace; word-break: break-all; text-align: center; margin-bottom: 20px; max-width: 250px; }
        
        .btn-copy {
           background: #003986; color: #fff; border: none; padding: 12px 25px; border-radius: 15px;
           font-weight: 950; font-size: 12px; cursor: pointer; transition: 0.2s;
        }
        .btn-copy:active { transform: scale(0.95); }

        .kqr-info-section { margin-top: 40px; width: 100%; max-width: 350px; }
        .kqr-info-section h3 { font-size: 14px; font-weight: 950; color: #1e293b; margin-bottom: 15px; }
        .kqr-info-section ul { list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 15px; }
        .kqr-info-section li { font-size: 12px; color: #475569; position: relative; padding-left: 0; line-height: 1.4; }
        .kqr-info-section li strong { color: #1e293b; }

        .animate-pop { animation: pop 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275); }
        @keyframes pop { from { scale: 0.8; opacity: 0; } to { scale: 1; opacity: 1; } }
      `}</style>
    </div>
  );
};

export default KioskQRView;
