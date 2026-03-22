const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');

const config = {
    host: '127.0.0.1',
    user: 'u394295194_sohail',
    password: '@Outlook.com1@',
    database: 'u394295194_carrefour'
};

async function syncBack() {
    let connection;
    try {
        console.log('--- 🔄 Internal Sync: MySQL -> db.json ---');
        connection = await mysql.createConnection(config);
        
        const [products] = await connection.query('SELECT * FROM products');
        console.log(`📊 Found ${products.length} products in MySQL.`);

        const dbPath = path.join(__dirname, 'db.json');
        let db = { products: [], categories: ['General'], sales: [], parked_sales: [], ticket_spool: [] };
        
        if (fs.existsSync(dbPath)) {
            try {
                const content = fs.readFileSync(dbPath, 'utf8');
                db = JSON.parse(content || '{}');
            } catch (e) { console.warn('Old db.json read failed, starting fresh.'); }
        }

        // Standardize products for JSON
        db.products = products.map(p => ({
            id: p.id,
            barcode: p.barcode,
            name: p.name,
            price_buy: parseFloat(p.price_buy),
            sell_price: parseFloat(p.sell_price),
            stock_current: parseInt(p.stock_current),
            expiry: p.expiry || '',
            offer: p.offer || 0
        }));

        fs.writeFileSync(dbPath, JSON.stringify(db, null, 2));
        console.log('✅ db.json updated successfully with MySQL data.');

    } catch (err) {
        console.error('❌ Sync Back Failed:', err.message);
    } finally {
        if (connection) await connection.end();
        process.exit();
    }
}

syncBack();
