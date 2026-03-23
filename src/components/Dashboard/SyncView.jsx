import React, { useState, useEffect } from 'react';

const SyncView = ({ API_BASE }) => {
  const [config, setConfig] = useState({ host: '', user: '', password: '', remoteDir: '/public_html' });
  const [logs, setLogs] = useState([]);
  const [isDeploying, setIsDeploying] = useState(false);

  useEffect(() => {
    fetch(`${API_BASE}/deploy-config`)
      .then(res => res.json())
      .then(data => setConfig(data))
      .catch(e => console.error('Error fetching config:', e));
  }, [API_BASE]);

  const handleSave = async (e) => {
    e.preventDefault();
    const res = await fetch(`${API_BASE}/deploy-config`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(config)
    });
    if (res.ok) alert('✅ Configuración guardada localmente');
  };

  const handleSync = async () => {
    setIsDeploying(true);
    setLogs(prev => ['🚀 Iniciando Proceso de Sincronización...', ...prev]);

    try {
      const res = await fetch(`${API_BASE}/deploy-to-live`, { method: 'POST' });
      const data = await res.json();

      if (data.logs) {
        setLogs(data.logs);
      }

      if (!res.ok) {
        throw new Error(data.error || 'Error desconocido del servidor');
      }

      setLogs(prev => [...prev, '✅ Sincronización finalizada correctamente']);
    } catch (e) {
      console.error(e);
      setLogs(prev => [...prev, `❌ ERROR: ${e.message}`]);
    } finally {
      setIsDeploying(false);
    }
  };

  return (
    <div className="sync-view animate-pop" style={{ padding: '20px', height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div className="mini-view-header" style={{ marginBottom: '20px' }}>
        <h3>☁️ SINCRONIZACIÓN CON HOSTINGER</h3>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.5fr', gap: '20px', flex: 1, paddingBottom: '30px' }}>
        <div style={{ background: '#fff', borderRadius: '15px', padding: '20px', boxShadow: '0 4px 15px rgba(0,0,0,0.05)', height: 'fit-content' }}>
          <h4 style={{ color: '#003986', marginBottom: '15px' }}>CONFIGURACIÓN FTP</h4>
          <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div className="input-group-compact">
              <label>Host / Servidor</label>
              <input
                value={config.host || ''}
                onChange={e => setConfig({ ...config, host: e.target.value })}
                placeholder="ftp.tudominio.com" required className="input-compact"
              />
            </div>
            <div className="input-group-compact">
              <label>Usuario FTP</label>
              <input
                value={config.user || ''}
                onChange={e => setConfig({ ...config, user: e.target.value })}
                placeholder="u12345678" required className="input-compact"
              />
            </div>
            <div className="input-group-compact">
              <label>Contraseña</label>
              <input
                type="password"
                value={config.password || ''}
                onChange={e => setConfig({ ...config, password: e.target.value })}
                placeholder="********" required className="input-compact"
              />
            </div>
            <div className="input-group-compact">
              <label>Carpeta Remota</label>
              <input
                value={config.remoteDir || '/public_html'}
                onChange={e => setConfig({ ...config, remoteDir: e.target.value })}
                className="input-compact"
              />
            </div>
            <button type="submit" className="btn-submit-compact" style={{ marginTop: '10px' }}>💾 GUARDAR CONFIG</button>
          </form>
        </div>

        <div style={{ background: '#000', borderRadius: '15px', padding: '20px', display: 'flex', flexDirection: 'column', minHeight: '300px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
            <h4 style={{ color: '#0ea5e9' }}>CONSOLA DE DESPLIEGUE</h4>
            <button
              className="btn-primary-glow"
              style={{ padding: '8px 20px', background: isDeploying ? '#666' : '#0ea5e9', cursor: isDeploying ? 'not-allowed' : 'pointer' }}
              disabled={isDeploying}
              onClick={handleSync}
            >
              {isDeploying ? '⏳ SYNCING...' : '🚀 SYNC TO LIVE'}
            </button>
          </div>
          <div style={{
            flex: 1,
            background: 'rgba(255,255,255,0.05)',
            borderRadius: '10px',
            padding: '15px',
            fontFamily: 'monospace',
            fontSize: '0.85rem',
            color: '#aaa',
            overflowY: 'auto'
          }}>
            {logs.length === 0 ? 'Esperando acción...' : logs.map((log, i) => (
              <div key={i} style={{ color: log.includes('✅') || log.includes('🎉') ? '#39FF14' : log.includes('❌') ? '#f43f5e' : '#aaa', marginBottom: '4px' }}>{log}</div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SyncView;
