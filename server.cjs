const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const fs = require('fs');
const path = require('path');
const nodemailer = require('nodemailer');
const mysql = require('mysql2/promise');
const ftp = require('basic-ftp');
const { execSync } = require('child_process');

const app = express();
const PORT = process.env.PORT || 5000;
const DB_FILE = path.join(__dirname, 'db.json');

console.log('--- 🔍 DEBUG: SERVER STARTUP 🔍 ---');
console.log(`📂 CWD: ${process.cwd()}`);
console.log(`📂 DIRNAME: ${__dirname}`);
console.log(`📦 dist/ exists: ${fs.existsSync(path.join(__dirname, 'dist'))}`);
console.log(`📄 dist/index.html exists: ${fs.existsSync(path.join(__dirname, 'dist', 'index.html'))}`);
console.log('---------------------------------');

// --- JSON STORAGE CORE (Always Initialized) ---
const initJSON = () => {
    try {
        if (!fs.existsSync(DB_FILE)) {
            const initialData = { products: [], categories: ['General'], sales: [], parked_sales: [], ticket_spool: [] };
            fs.writeFileSync(DB_FILE, JSON.stringify(initialData, null, 2));
            console.log('📦 db.json (Full Backup) created from scratch.');
        }
    } catch (e) {
        console.error('❌ Failed to init JSON backup:', e);
    }
};
initJSON();

const normalizeStr = (str) => {
    if (!str) return '';
    return str.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
};

let dbCache = null;

const readJSON = () => {
    if (dbCache) return dbCache;
    try {
        if (!fs.existsSync(DB_FILE)) return { products: [], categories: ['General'], sales: [], parked_sales: [], ticket_spool: [] };
        const content = fs.readFileSync(DB_FILE, 'utf8');
        dbCache = JSON.parse(content || '{}');
        // Ensure arrays
        if (!dbCache.products) dbCache.products = [];
        if (!dbCache.categories) dbCache.categories = ['General'];
        if (!dbCache.sales) dbCache.sales = [];
        if (!dbCache.parked_sales) dbCache.parked_sales = [];
        if (!dbCache.ticket_spool) dbCache.ticket_spool = [];
        return dbCache;
    } catch (e) {
        return { products: [], categories: ['General'], sales: [], parked_sales: [], ticket_spool: [] };
    }
};

const writeJSON = (data) => {
    try {
        dbCache = data; // Update cache immediately
        fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
    } catch (e) {
        console.error('❌ Database Write Failed:', e);
    }
};

// --- HYBRID DATABASE LOGIC ---
const DB_CONFIG = {
    host: '127.0.0.1',
    user: 'u394295194_sohail',
    password: '@Outlook.com1@',
    database: 'u394295194_carrefour',
    waitForConnections: true,
    connectionLimit: 15,
    queueLimit: 0,
    enableKeepAlive: true,
    keepAliveInitialDelay: 10000
};

let pool = null;
let useMySQL = false;

async function initDB() {
    try {
        console.log('⏳ Connecting to MySQL (localhost)...');
        pool = mysql.createPool(DB_CONFIG);
        const [test] = await pool.query('SELECT 1');
        useMySQL = true;
        console.log('✅ MySQL Connected Successfully');

        // Create tables if missing
        await pool.query(`CREATE TABLE IF NOT EXISTS products (
            id INT AUTO_INCREMENT PRIMARY KEY,
            barcode VARCHAR(50) NOT NULL UNIQUE,
            name VARCHAR(200) NOT NULL,
            price_buy DECIMAL(10, 2) DEFAULT 0.00,
            sell_price DECIMAL(10, 2) NOT NULL,
            stock_current INT DEFAULT 0,
            expiry VARCHAR(50) DEFAULT '',
            offer INT DEFAULT 0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )`);

        await pool.query(`CREATE TABLE IF NOT EXISTS sales (
            id INT AUTO_INCREMENT PRIMARY KEY, total DECIMAL(10, 2) NOT NULL,
            items_count INT DEFAULT 0, timestamp DATETIME NOT NULL
        )`);

        await pool.query(`CREATE TABLE IF NOT EXISTS sales_details (
            id INT AUTO_INCREMENT PRIMARY KEY, sale_id INT NOT NULL,
            product_id BIGINT, name VARCHAR(200), price DECIMAL(10, 2), qty INT
        )`);

        await pool.query(`CREATE TABLE IF NOT EXISTS ticket_spool (
            id INT AUTO_INCREMENT PRIMARY KEY,
            barcode VARCHAR(50),
            name VARCHAR(200),
            sell_price DECIMAL(10, 2),
            qty INT DEFAULT 1,
            is_bandeja TINYINT(1) DEFAULT 0,
            price_kilo DECIMAL(10, 2) DEFAULT 0.00,
            weight DECIMAL(10, 3) DEFAULT 0.000,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )`);

        await pool.query(`CREATE TABLE IF NOT EXISTS ticket_history (
            id INT AUTO_INCREMENT PRIMARY KEY,
            filename VARCHAR(255) NOT NULL,
            items_count INT DEFAULT 0,
            timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
        )`);

        // Migration for existing tables
        try {
            await pool.query("ALTER TABLE ticket_spool ADD COLUMN is_bandeja TINYINT(1) DEFAULT 0");
            await pool.query("ALTER TABLE ticket_spool ADD COLUMN price_kilo DECIMAL(10,2) DEFAULT 0.00");
            await pool.query("ALTER TABLE ticket_spool ADD COLUMN weight DECIMAL(10,3) DEFAULT 0.000");
        } catch (e) { /* ignore if already exists */ }

        console.log('✅ All MySQL Tables Ready');
    } catch (err) {
        console.warn('⚠️ FALLBACK: MySQL connection failed. Using JSON backup mode only.');
        useMySQL = false;
    }
}

// --- MIDDLEWARE ---
app.use(cors());
app.use(bodyParser.json({ limit: '100mb' }));
app.use(bodyParser.urlencoded({ limit: '100mb', extended: true }));

// --- EMAIL ---
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: 'slwforever143@gmail.com',
        pass: 'slwl elaf zzwl rrjf'
    }
});

app.post('/api/send-email', async (req, res) => {
    const { pdfBase64, targetEmail, saleData } = req.body;

    try {
        let mailOptions = {
            from: '"Carrefour Auto-Stock" <slwforever143@gmail.com>',
            to: targetEmail || 'slwforever143@gmail.com',
            subject: saleData ? '💰 Nueva Venta Realizada' : '🖨️ Tickets Carrefour',
            text: saleData ? `Venta Realizada:\nTotal: €${saleData.total}\nItems: ${saleData.items.length}\nFecha: ${saleData.timestamp}` : 'Adjunto encontrará los tickets.',
        };

        if (pdfBase64) {
            const base64Content = pdfBase64.includes("base64,") ? pdfBase64.split("base64,")[1] : pdfBase64;
            mailOptions.attachments = [{ filename: `tickets-${Date.now()}.pdf`, content: base64Content, encoding: 'base64' }];
        }

        if (saleData) {
            mailOptions.html = `
                <div style="font-family: Arial, sans-serif; max-width: 400px; border: 1px solid #ccc; padding: 20px; border-radius: 10px;">
                    <h2 style="text-align: center; color: #003986;">RECIBO DE VENTA</h2>
                    <hr/>
                    <div style="font-size: 14px;">
                        ${saleData.items.map(item => `
                            <div style="display: flex; justify-content: space-between; margin: 5px 0;">
                                <span>${item.name} x${item.qty}</span>
                                <span style="font-weight: bold;">€${(item.sell_price * item.qty).toFixed(2)}</span>
                            </div>
                        `).join('')}
                    </div>
                    <hr/>
                    <div style="display: flex; justify-content: space-between; font-size: 18px; font-weight: bold;">
                        <span>TOTAL</span>
                        <span style="color: #E1000F;">€${saleData.total.toFixed(2)}</span>
                    </div>
                    <div style="margin-top: 20px; font-size: 12px; color: #666; text-align: center;">
                        ${new Date(saleData.timestamp).toLocaleString()}
                    </div>
                </div>
            `;
        }

        await transporter.sendMail(mailOptions);

        console.log('✅ Email sent successfully');
        res.json({ success: true, message: 'Email sent successfully' });
    } catch (error) {
        console.error('❌ Email sending failed:', error.message);
        res.status(500).json({ success: false, error: error.message });
    }
});

// --- API ROUTES ---

app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', version: '1.1.5', dbMode: useMySQL ? 'MySQL' : 'JSON' });
});

app.get('/api/categories', async (req, res) => {
    if (useMySQL) {
        try {
            const [rows] = await pool.query('SELECT DISTINCT name FROM categories');
            return res.json(rows.map(r => r.name));
        } catch (e) {
            console.error('MySQL Categories Error:', e.message);
        }
    }
    const db = readJSON();
    res.json(db.categories || ['General']);
});

app.get('/api/products', async (req, res) => {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const search = (req.query.search || '').trim();
    const offset = (page - 1) * limit;

    try {
        if (useMySQL) {
            let whereClause = '';
            let params = [];
            const isNumeric = /^\d+$/.test(search);

            if (search) {
                if (isNumeric) {
                    whereClause = ' WHERE barcode = ?';
                    params = [search];
                } else {
                    whereClause = ' WHERE name LIKE ?';
                    params = [`%${search}%`];
                }
            }

            const [[{ total }]] = await pool.query(`SELECT COUNT(*) as total FROM products ${whereClause}`, params);

            // Priority: starts with match first
            let orderSql = 'ORDER BY id DESC';
            let finalParams = [...params];
            if (search && !isNumeric) {
                orderSql = `ORDER BY (CASE WHEN name LIKE ? THEN 1 ELSE 2 END) ASC, id DESC`;
                finalParams.push(`${search}%`);
            }

            const [rows] = await pool.query(
                `SELECT id, barcode, name, price_buy, sell_price, stock_current, expiry, offer FROM products ${whereClause} ${orderSql} LIMIT ? OFFSET ?`,
                [...finalParams, limit, offset]
            );

            console.log(`🔍 [MySQL Search] Query: "${search}" | Results: ${rows.length}/${total}`);
            return res.json({ products: rows, total, page, limit });
        }

        const db = readJSON();
        let allProducts = (db.products || []);

        if (search) {
            const lowSearch = normalizeStr(search);
            const isNumeric = /^\d+$/.test(search);

            if (isNumeric) {
                allProducts = allProducts.filter(p => p.barcode === search);
            } else {
                allProducts = allProducts.filter(p => {
                    if (!p.name) return false;
                    const normName = normalizeStr(p.name);
                    return normName.includes(lowSearch);
                }).sort((a, b) => {
                    const aNorm = normalizeStr(a.name);
                    const bNorm = normalizeStr(b.name);
                    const aStarts = aNorm.startsWith(lowSearch);
                    const bStarts = bNorm.startsWith(lowSearch);
                    if (aStarts && !bStarts) return -1;
                    if (!aStarts && bStarts) return 1;
                    return (b.id || 0) - (a.id || 0);
                });
            }
        } else {
            allProducts.sort((a, b) => (b.id || 0) - (a.id || 0));
        }

        const paginated = allProducts.slice(offset, offset + limit);
        console.log(`🔍 [JSON Search] Query: "${search}" | Results: ${paginated.length}/${allProducts.length}`);

        res.json({
            products: paginated,
            total: allProducts.length,
            page,
            limit
        });
    } catch (e) {
        console.error('Products Error:', e.message);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

app.get('/api/dashboard', async (req, res) => {
    let totalCount = 0;
    try {
        if (useMySQL) {
            const [[{ count }]] = await pool.query('SELECT COUNT(DISTINCT barcode) as count FROM products');
            totalCount = count || 0;
        } else {
            const db = readJSON();
            totalCount = (db.products || []).length;
        }
    } catch (e) {
        console.error('Dashboard Stats Error:', e.message);
    }

    res.json({
        "dashboard": "Strategic",
        "kpis": {
            "a1": { "value": "🔍", "label": "SCANNER", "color": "#003986" },
            "a2": { "value": totalCount.toString(), "label": "INVENTARIO", "color": "#E1000F" },
            "a3": { "value": "📈", "label": "ANÁLISIS", "color": "#009E49" },
            "a4": { "value": "🔔", "label": "ALERTAS", "color": "#F89406" },
            "a5": { "value": "📄", "label": "SPOOL", "color": "#9b59b6" },
            "a6": { "value": "💶", "label": "VENTAS", "color": "#1abc9c" },
            "a7": { "value": "🛠️", "label": "TOOLS", "color": "#e91e63" },
            "a8": { "value": "📊", "label": "REPORTES", "color": "#d9534f" }
        }
    });
});

// --- TICKET SPOOL API ---
app.get('/api/spool', async (req, res) => {
    if (useMySQL) {
        try {
            const [rows] = await pool.query('SELECT * FROM ticket_spool ORDER BY id ASC');
            return res.json(rows);
        } catch (e) { console.error(e); }
    }
    const db = readJSON();
    res.json(db.ticket_spool || []);
});

app.post('/api/spool', async (req, res) => {
    const items = Array.isArray(req.body) ? req.body : [req.body];
    if (useMySQL) {
        try {
            for (const item of items) {
                const isB = item.isBandeja || item.is_bandeja ? 1 : 0;
                const pK = item.display_price_kilo || item.price_kilo || 0;
                const w = item.display_weight || item.weight || 0;
                await pool.query('INSERT INTO ticket_spool (barcode, name, sell_price, qty, is_bandeja, price_kilo, weight) VALUES (?, ?, ?, ?, ?, ?, ?)',
                    [item.barcode, item.name, item.sell_price, item.qty || 1, isB, pK, w]);
            }
            return res.json({ success: true });
        } catch (e) { return res.status(500).json({ error: e.message }); }
    }
    const db = readJSON();
    db.ticket_spool = [...(db.ticket_spool || []), ...items];
    writeJSON(db);
    res.json({ success: true });
});

app.delete('/api/spool', async (req, res) => {
    try {
        if (useMySQL) {
            await pool.query('DELETE FROM ticket_spool');
        } else {
            const db = readJSON();
            db.ticket_spool = [];
            writeJSON(db);
        }
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.delete('/api/spool/:id', async (req, res) => {
    const { id } = req.params;
    try {
        if (useMySQL) {
            await pool.query('DELETE FROM ticket_spool WHERE id = ?', [id]);
        } else {
            const db = readJSON();
            db.ticket_spool = (db.ticket_spool || []).filter((_, idx) => idx != id && _.id != id);
            writeJSON(db);
        }
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// --- TICKET ARCHIVE & HISTORY ---
app.get('/api/spool/history', async (req, res) => {
    try {
        if (useMySQL) {
            const [rows] = await pool.query('SELECT * FROM ticket_history ORDER BY id DESC LIMIT 5');
            return res.json(rows);
        }
        res.json([]);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/spool/archive', async (req, res) => {
    try {
        const { pdfBase64, itemsCount } = req.body;
        if (!pdfBase64) return res.status(400).json({ error: 'No PDF data' });

        const filename = `spool_${Date.now()}.pdf`;
        const targetDir = path.join(__dirname, 'api', 'tickets');
        if (!fs.existsSync(targetDir)) fs.mkdirSync(targetDir, { recursive: true });

        const base64Data = pdfBase64.includes(',') ? pdfBase64.split(',')[1] : pdfBase64;
        fs.writeFileSync(path.join(targetDir, filename), base64Data, 'base64');

        if (useMySQL) {
            await pool.query('INSERT INTO ticket_history (filename, items_count) VALUES (?, ?)', [filename, itemsCount]);

            // AUTO-CLEANUP: Keep only last 5
            const [extra] = await pool.query('SELECT id, filename FROM ticket_history ORDER BY id DESC LIMIT 5, 100');
            for (const row of extra) {
                const fpath = path.join(targetDir, row.filename);
                if (fs.existsSync(fpath)) fs.unlinkSync(fpath);
                await pool.query('DELETE FROM ticket_history WHERE id = ?', [row.id]);
            }

            // AUTO-CLEANUP: Delete older than 24h
            const [oldies] = await pool.query('SELECT id, filename FROM ticket_history WHERE timestamp < DATE_SUB(NOW(), INTERVAL 1 DAY)');
            for (const row of oldies) {
                const fpath = path.join(targetDir, row.filename);
                if (fs.existsSync(fpath)) fs.unlinkSync(fpath);
                await pool.query('DELETE FROM ticket_history WHERE id = ?', [row.id]);
            }
        }

        res.json({ success: true, filename });
    } catch (e) {
        console.error('Archive Error:', e.message);
        res.status(500).json({ error: e.message });
    }
});

app.get('/api/spool/download/:filename', (req, res) => {
    const fpath = path.join(__dirname, 'api', 'tickets', req.params.filename);
    if (fs.existsSync(fpath)) {
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `inline; filename=${req.params.filename}`);
        res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
        return res.sendFile(fpath);
    }
    res.status(404).send('File not found');
});

app.get('/api/kiosk/:barcode', async (req, res) => {
    const id = req.params.barcode;
    const safeFields = 'barcode, name, sell_price, offer';

    try {
        if (useMySQL) {
            const [rows] = await pool.query(`SELECT ${safeFields} FROM products WHERE barcode = ?`, [id]);
            if (rows.length > 0) return res.json(rows[0]);
        } else {
            const db = readJSON();
            const p = db.products.find(p => p.barcode === id);
            if (p) {
                const { barcode, name, sell_price, offer } = p;
                return res.json({ barcode, name, sell_price, offer });
            }
        }
        res.json({});
    } catch (e) {
        console.error('Kiosk API Error:', e.message);
        res.status(500).json({ error: 'Server Error' });
    }
});

app.get('/api/product/:barcode', async (req, res) => {
    const id = req.params.barcode;
    if (useMySQL) {
        try {
            // Priority 1: Exact Barcode
            const [rows] = await pool.query('SELECT id, barcode, name, price_buy, sell_price, stock_current, expiry, offer FROM products WHERE barcode = ?', [id]);
            if (rows.length > 0) return res.json(rows[0]);

            // Priority 2: Exact Name Match
            const [rowsName] = await pool.query('SELECT id, barcode, name, price_buy, sell_price, stock_current, expiry, offer FROM products WHERE name = ?', [id]);
            if (rowsName.length > 0) return res.json(rowsName[0]);

            // Priority 3: Starts With Name Match (New functionality)
            const [rowsPrefix] = await pool.query('SELECT id, barcode, name, price_buy, sell_price, stock_current, expiry, offer FROM products WHERE name LIKE ? LIMIT 1', [`${id}%`]);
            return res.json(rowsPrefix[0] || {});
        } catch (e) {
            console.error('MySQL Product Lookup Error:', e.message);
        }
    }
    const db = readJSON();
    let p = db.products.find(p => p.barcode === id || (p.name && normalizeStr(p.name) === normalizeStr(id)));

    // Priority 3: First name that STARTS with the input
    if (!p) {
        const lowId = normalizeStr(id);
        p = db.products.find(p => p.name && normalizeStr(p.name).startsWith(lowId));
    }

    res.json(p || {});
});

app.post('/api/products', async (req, res) => {
    try {
        console.log('📩 POST /api/products received:', JSON.stringify(req.body));
        const { barcode, name, sell_price, price_buy, stock_current, expiry, offer } = req.body;

        if (!barcode || !name) {
            return res.status(400).json({ success: false, error: 'Código y Nombre son obligatorios.' });
        }

        console.log('➕ Attempting to add product:', name, '(' + barcode + ')');

        const newItem = {
            id: Date.now(),
            barcode,
            name,
            sell_price: parseFloat(sell_price) || 0,
            price_buy: parseFloat(price_buy) || 0,
            stock_current: parseInt(stock_current) || 0,
            expiry: expiry || '',
            offer: parseInt(offer) || 0
        };

        if (useMySQL) {
            // Check if barcode already exists
            const [existing] = await pool.query('SELECT id FROM products WHERE barcode = ?', [barcode]);
            if (existing && existing.length > 0) {
                console.log('⚠️ Duplicate barcode attempt:', barcode);
                return res.status(400).json({ success: false, error: 'Este código de barras ya existe.' });
            }

            const [result] = await pool.query(
                'INSERT INTO products (barcode, name, sell_price, price_buy, stock_current, expiry, offer) VALUES (?, ?, ?, ?, ?, ?, ?)',
                [barcode, name, newItem.sell_price, newItem.price_buy, newItem.stock_current, newItem.expiry, newItem.offer]
            );
            newItem.id = result.insertId;
            console.log('✅ Product added to MySQL, ID:', result.insertId);

            // --- SYNC TO JSON BACKUP (Non-blocking) ---
            const syncBackup = async () => {
                try {
                    const db = readJSON();
                    db.products.push(newItem);
                    writeJSON(db);
                    console.log('📦 JSON Backup Updated (Background)');
                } catch (jsonErr) { console.error('Backup fail:', jsonErr); }
            };
            syncBackup(); // Call without await

            return res.json({ success: true, id: result.insertId });
        }

        const db = readJSON();
        db.products.push(newItem);
        writeJSON(db);
        console.log('✅ Product added to JSON (Standalone), ID:', newItem.id);
        res.json({ success: true, id: newItem.id });
    } catch (e) {
        console.error('❌ Error adding product:', e.message);
        res.status(500).json({ success: false, error: 'Error del servidor: ' + e.message });
    }
});

app.put('/api/product/:id', async (req, res) => {
    try {
        console.log(`📩 PUT /api/product/${req.params.id} received:`, JSON.stringify(req.body));
        if (useMySQL) {
            // Map frontend fields to MySQL column names
            const updateData = {};
            if (req.body.barcode) updateData.barcode = req.body.barcode;
            if (req.body.name) updateData.name = req.body.name;
            if (req.body.price_buy !== undefined) updateData.price_buy = parseFloat(req.body.price_buy) || 0;
            if (req.body.sell_price !== undefined) updateData.sell_price = parseFloat(req.body.sell_price) || 0;
            if (req.body.offer !== undefined) updateData.offer = parseInt(req.body.offer) || 0;
            if (req.body.stock_current !== undefined) updateData.stock_current = parseInt(req.body.stock_current) || 0;
            if (req.body.expiry !== undefined) updateData.expiry = req.body.expiry || null;

            await pool.query('UPDATE products SET ? WHERE id = ? OR barcode = ?', [updateData, req.params.id, req.body.barcode || req.params.id]);

            // --- SYNC TO JSON BACKUP (Non-blocking) ---
            const syncUpdate = async () => {
                try {
                    const db = readJSON();
                    const idx = db.products.findIndex(p => p.id == req.params.id || p.barcode == req.params.id || p.barcode == req.body.barcode);
                    if (idx !== -1) {
                        db.products[idx] = { ...db.products[idx], ...req.body };
                        writeJSON(db);
                        console.log('📦 JSON Backup Updated (Background)');
                    }
                } catch (e) { console.error('JSON Sync fail'); }
            };
            syncUpdate(); // Call without await

            return res.json({ success: true });
        }
        const db = readJSON();
        const idx = db.products.findIndex(p => p.id == req.params.id);
        if (idx !== -1) {
            db.products[idx] = { ...db.products[idx], ...req.body };
            writeJSON(db);
            return res.json({ success: true });
        }
        res.status(404).json({ error: 'Not found' });
    } catch (e) {
        console.error('Update Product Error:', e.message);
        res.status(500).json({ success: false, error: e.message });
    }
});

app.delete('/api/product/:id', async (req, res) => {
    try {
        if (useMySQL) {
            await pool.query('DELETE FROM products WHERE id = ? OR barcode = ?', [req.params.id, req.params.id]);

            // --- SYNC TO JSON BACKUP ---
            try {
                const db = readJSON();
                db.products = db.products.filter(p => p.id != req.params.id && p.barcode != req.params.id);
                writeJSON(db);
            } catch (e) { console.error('JSON Sync fail'); }

            return res.json({ success: true });
        }
        const db = readJSON();
        db.products = db.products.filter(p => p.id != req.params.id);
        writeJSON(db);
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// --- SALES & REPORTS ---
app.post('/api/sales', async (req, res) => {
    try {
        const { items, total, timestamp } = req.body;
        console.log(`💰 New Sale: Total €${total}, Items: ${items.length}`);

        const newSale = { id: Date.now(), items, total, timestamp };

        if (useMySQL) {
            const [result] = await pool.query('INSERT INTO sales (total, items_count, timestamp) VALUES (?, ?, ?)', [total, items.length, timestamp]);
            const saleId = result.insertId;
            newSale.id = saleId;

            for (const item of items) {
                await pool.query('INSERT INTO sales_details (sale_id, product_id, name, price, qty) VALUES (?, ?, ?, ?, ?)', [saleId, item.id, item.name, item.sell_price, item.qty]);
                await pool.query('UPDATE products SET stock_current = stock_current - ? WHERE id = ? OR barcode = ?', [item.qty, item.id, item.barcode || item.id]);
            }

            // --- SYNC TO JSON BACKUP ---
            try {
                const db = readJSON();
                db.sales.push(newSale);
                items.forEach(item => {
                    const pIdx = db.products.findIndex(p => p.id == item.id || p.barcode == item.barcode);
                    if (pIdx !== -1) db.products[pIdx].stock_current -= item.qty;
                });
                writeJSON(db);
                console.log('📦 JSON Backup Updated');
            } catch (jsonErr) { console.warn('JSON Sync failed'); }

            return res.json({ success: true, id: saleId });
        }

        const db = readJSON();
        db.sales.push(newSale);

        // Update Stock in JSON
        items.forEach(item => {
            const pIdx = db.products.findIndex(p => p.id == item.id);
            if (pIdx !== -1) {
                db.products[pIdx].stock_current = (parseInt(db.products[pIdx].stock_current) || 0) - item.qty;
            }
        });

        writeJSON(db);
        res.json({ success: true, id: newSale.id });
    } catch (e) {
        console.error('❌ Sale error:', e.message);
        res.status(500).json({ error: e.message });
    }
});

app.get('/api/sales', async (req, res) => {
    try {
        if (useMySQL) {
            const [rows] = await pool.query('SELECT * FROM sales ORDER BY id DESC LIMIT 100');
            return res.json(rows);
        }
        const db = readJSON();
        res.json(db.sales || []);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.get('/api/reports/summary', async (req, res) => {
    try {
        if (useMySQL) {
            const [[{ total_sales }]] = await pool.query('SELECT SUM(total) as total_sales FROM sales');
            const [[{ count }]] = await pool.query('SELECT COUNT(*) as count FROM sales');
            return res.json({ total_revenue: total_sales || 0, total_orders: count || 0 });
        }
        const db = readJSON();
        const total = (db.sales || []).reduce((acc, s) => acc + (parseFloat(s.total) || 0), 0);
        res.json({ total_revenue: total, total_orders: (db.sales || []).length });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// --- PARKED SALES (APARCAR TICKET) ---
app.post('/api/parked-sales', async (req, res) => {
    try {
        const { id, cart_data } = req.body;
        const timestamp = new Date().toISOString().slice(0, 19).replace('T', ' ');

        if (useMySQL) {
            await pool.query('INSERT INTO parked_sales (id, cart_data, timestamp) VALUES (?, ?, ?)', [id, JSON.stringify(cart_data), timestamp]);
            return res.json({ success: true });
        }

        const db = readJSON();
        if (!db.parked_sales) db.parked_sales = [];
        db.parked_sales.push({ id, cart_data, timestamp });
        writeJSON(db);
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.get('/api/parked-sales/:id', async (req, res) => {
    try {
        if (useMySQL) {
            const [rows] = await pool.query('SELECT * FROM parked_sales WHERE id = ?', [req.params.id]);
            if (rows.length > 0) {
                const data = rows[0];
                return res.json({ success: true, cart_data: typeof data.cart_data === 'string' ? JSON.parse(data.cart_data) : data.cart_data });
            }
            return res.status(404).json({ success: false, error: 'Ticket no encontrado' });
        }

        const db = readJSON();
        const found = (db.parked_sales || []).find(ps => ps.id === req.params.id);
        if (found) return res.json({ success: true, cart_data: found.cart_data });
        res.status(404).json({ success: false, error: 'Ticket no encontrado' });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.delete('/api/parked-sales/:id', async (req, res) => {
    try {
        if (useMySQL) {
            await pool.query('DELETE FROM parked_sales WHERE id = ?', [req.params.id]);
            return res.json({ success: true });
        }

        const db = readJSON();
        db.parked_sales = (db.parked_sales || []).filter(ps => ps.id !== req.params.id);
        writeJSON(db);
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// --- DEPLOYMENT (SYNC TO LIVE) ---
const DEPLOY_CONFIG_FILE = path.join(__dirname, 'deploy-config.json');

const readDeployConfig = () => {
    try {
        if (!fs.existsSync(DEPLOY_CONFIG_FILE)) return { host: '', user: '', password: '', remoteDir: '/public_html' };
        return JSON.parse(fs.readFileSync(DEPLOY_CONFIG_FILE));
    } catch (e) { return {}; }
};

app.get('/api/deploy-config', (req, res) => {
    const config = readDeployConfig();
    // Don't send password back for security or send it masked
    res.json({ ...config, password: config.password ? '********' : '' });
});

app.post('/api/deploy-config', (req, res) => {
    const current = readDeployConfig();
    const newConfig = { ...current, ...req.body };
    // If password is masked, keep the old one
    if (req.body.password === '********') newConfig.password = current.password;
    fs.writeFileSync(DEPLOY_CONFIG_FILE, JSON.stringify(newConfig, null, 2));
    res.json({ success: true });
});

app.post('/api/deploy-to-live', async (req, res) => {
    const config = readDeployConfig();
    const logs = [];
    const addLog = (msg) => {
        console.log(`[DEPLOY] ${msg}`);
        logs.push(`${new Date().toLocaleTimeString()} - ${msg}`);
    };

    if (!config.host || !config.user || !config.password) {
        return res.status(400).json({ error: 'Configuración de FTP incompleta.' });
    }

    try {
        addLog('🚀 Iniciando Proceso de Sincronización...');

        // 1. Build
        addLog('📦 Generando Build (Vite)...');
        execSync('npx vite build', { stdio: 'inherit' });
        addLog('✅ Build completada con éxito.');

        // 2. FTP Upload
        addLog(`📂 Conectando a FTP (${config.host})...`);
        const client = new ftp.Client();
        client.ftp.verbose = true;

        try {
            await client.access({
                host: config.host,
                user: config.user,
                password: config.password,
                secure: false // Set to true if server supports FTPS
            });

            addLog('📡 Conectado! Subiendo archivos...');

            const remoteRoot = config.remoteDir || '/public_html';
            await client.ensureDir(remoteRoot);

            // 1. Upload Frontend (Contents of dist -> remote root)
            addLog('📤 Subiendo Frontend (Assets & HTML)...');
            await client.uploadFromDir(path.join(__dirname, 'dist'), remoteRoot);

            // 2. Upload Backend & Config
            addLog('📤 Subiendo Configuración y Servidor...');
            await client.uploadFrom(path.join(__dirname, 'server.cjs'), `${remoteRoot}/server.cjs`);
            await client.uploadFrom(path.join(__dirname, 'package.json'), `${remoteRoot}/package.json`);

            if (fs.existsSync(path.join(__dirname, '.htaccess'))) {
                await client.uploadFrom(path.join(__dirname, '.htaccess'), `${remoteRoot}/.htaccess`);
            }

            if (fs.existsSync(path.join(__dirname, 'api'))) {
                await client.uploadFromDir(path.join(__dirname, 'api'), `${remoteRoot}/api`);
            }

            addLog('✅ Todos los archivos subidos correctamente.');
            addLog('⚠️ NOTA: Si cambiaste el servidor (Backend), recuerda reiniciarlo desde la terminal SSH!');
            addLog('🎉 Sincronización Finalizada con ÉXITO!');
            res.json({ success: true, logs });

        } catch (ftpError) {
            addLog(`❌ Error de FTP: ${ftpError.message}`);
            res.status(500).json({ error: ftpError.message, logs });
        } finally {
            client.close();
        }

    } catch (buildError) {
        addLog(`❌ Error de Build: ${buildError.message}`);
        res.status(500).json({ error: buildError.message, logs });
    }
});

// --- FRONTEND ---
const staticPath = fs.existsSync(path.join(__dirname, 'dist'))
    ? path.join(__dirname, 'dist')
    : __dirname;

console.log(`🌐 Serving static files from: ${staticPath}`);

// If serving from root, we should avoid serving server.cjs and db.json for security
if (staticPath === __dirname) {
    app.get(['/server.cjs', '/db.json', '/package.json', '/.htaccess'], (req, res) => {
        res.status(403).send('Access Forbidden');
    });
}

app.use(express.static(staticPath));
// Also serve 'public' for sub-apps like consulta-precio if it's not already covered
if (fs.existsSync(path.join(__dirname, 'public'))) {
    app.use(express.static(path.join(__dirname, 'public')));
}

// Security: Public Poster Export
app.post('/api/export-poster', bodyParser.raw({ type: 'application/pdf', limit: '10mb' }), (req, res) => {
    try {
        const desktopPath = path.join(process.env.USERPROFILE || '', 'Desktop', 'poster.pdf');
        fs.writeFileSync(desktopPath, req.body);
        console.log('✅ Poster PDF saved to Desktop:', desktopPath);
        res.json({ success: true, path: desktopPath });
    } catch (e) {
        console.error('❌ Failed to save PDF to Desktop:', e.message);
        res.status(500).json({ error: e.message });
    }
});

app.get(/(.*)/, (req, res) => {
    // If it's an API call that wasn't caught yet, it's a 404
    if (req.path.startsWith('/api')) return res.status(404).json({ error: 'API not found' });

    // Otherwise, fall back to index.html for React SPA routing
    const indexPath = path.join(__dirname, 'dist', 'index.html');
    if (fs.existsSync(indexPath)) res.sendFile(indexPath);
    else res.status(404).send('Dashboard not found');
});

app.listen(PORT, '0.0.0.0', () => {
    console.log(`✅ Server is LIVE on port ${PORT}`);
    initDB();
});
