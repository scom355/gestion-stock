# 🚀 Carrefour Stock Management - Deployment Guide (Hostinger)

Documento para actualizaciones rápidas y mantenimiento del POS.

## 🔄 Workflow para Actualizar (Local a Live)
Cuando hagas cambios en el POS o Diseño en tu PC, sigue estos pasos:

1.  **En tu PC**: Ejecuta `npm run build`. Esto actualiza la carpeta `dist`.
2.  **En Hostinger (File Manager)**: 
    - Copia el contenido de `dist/` a la raíz (`public_html/`). Reemplaza todo.
    - Sube el nuevo `server.cjs` si cambiaste algo del backend.
3.  **Reiniciar**: Si cambiaste el backend, usa el comando de reinicio en la terminal.

## 🌐 Información del Servidor (Live)
- **Dominio**: `https://plum-cheetah-602338.hostingersite.com/`
- **IP**: `82.25.102.174`
- **Puerto SSH**: `65002`
- **Usuario SSH**: `u394295194`
- **Ruta del Proyecto**: `/home/u394295194/domains/plum-cheetah-602338.hostingersite.com/public_html/`

## 🛠️ Comandos de Mantenimiento (SSH)
Debido a la configuración específica de Hostinger, siempre usa el PATH de Node 20:

### 1. Actualizar Dependencias
```bash
export PATH=/opt/alt/alt-nodejs20/root/usr/bin/:$PATH && npm install
```

### 2. Reiniciar el Servidor Backend
Si el Office Page no carga o da error 503:
```bash
pkill -f node
export PATH=/opt/alt/alt-nodejs20/root/usr/bin/:$PATH && nohup node server.cjs > server.log 2>&1 &
```

## 🏗️ Arquitectura de Despliegue
Para que Hostinger combine **Apache** (Frontend) con **Node.js** (Backend), hemos configurado:

1.  **Frontend Estático**: Los archivos de `dist/` se han copiado a la raíz (`public_html/`).
2.  **Proxy Bridge (`api/index.php`)**: Este archivo redirige las llamadas de `/api/*` al servidor Node.js que corre internamente en el puerto 5000.
3.  **Control de Acceso (`.htaccess`)**: Configurado para forzar HTTPS y manejar las rutas de React (SPA).

## 🗄️ Base de Datos (MySQL)
El sistema es **Híbrido**:
- Si los datos en `server.cjs` (Line 15) son correctos, usa **MySQL**.
- Si falla la conexión, usa **`db.json`** como respaldo (Fallback).

**Instrucciones de Base de Datos:**
1. Importar `database.sql` en phpMyAdmin.
2. Actualizar `user` y `password` en `server.cjs`.

## 📦 Archivos Críticos para Backup
- `server.cjs`: Lógica del servidor y conexión DB.
- `.htaccess`: Reglas de redirección y HTTPS.
- `api/index.php`: El puente entre el dominio y el backend.
- `db.json`: Almacenamiento local de respaldo.

---
*Documento generado por Antigravity AI para facilitar futuras actualizaciones.*
