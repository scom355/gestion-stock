import React, { useState } from 'react';

const SyncView = ({ API_BASE }) => {
  const [syncLogs, setSyncLogs] = useState([]);
  const [syncStatus, setSyncStatus] = useState('IDLE');

  const runSync = async () => {
    setSyncStatus('SYNCING');
    setSyncLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] Iniciando Sincronización Local...`]);
    try {
      const res = await fetch(`${API_BASE}/sync`);
      const data = await res.json();
      setSyncStatus('DONE');
      setSyncLogs(prev => [...prev, ...data.logs, `[${new Date().toLocaleTimeString()}] ✅ Sync Correcto.`]);
    } catch (e) {
      setSyncStatus('ERROR');
      setSyncLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] ❌ Sync FALLIDO.`]);
    }
  };

  return (
    <div className="sync-view" style={{ padding: '20px' }}>
      <h3>Sincronización Local a Cloud (Sync Live)</h3>
      <p>Este proceso copia los datos de su servidor local (si existe) a la nube de Hostinger.</p>
      <button onClick={runSync} disabled={syncStatus === 'SYNCING'} style={{ background: '#003986', color: 'white', padding: '15px 30px', border: 'none', borderRadius: '15px', fontWeight: 900, cursor: 'pointer' }}>
        {syncStatus === 'SYNCING' ? '⏳ Sincronizando...' : '🔄 Iniciar Sincronización Real-Time'}
      </button>
      <div className="sync-logs" style={{ marginTop: '20px', background: '#000', color: '#0f0', padding: '15px', borderRadius: '10px', height: '200px', overflowY: 'auto', fontFamily: 'monospace', fontSize: '11px' }}>
        {syncLogs.map((log, i) => <div key={i}>{log}</div>)}
        {syncLogs.length === 0 && <div style={{ opacity: 0.5 }}>Esperando acción...</div>}
      </div>
    </div>
  );
};

export default SyncView;
