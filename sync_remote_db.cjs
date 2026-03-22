const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');

const config = {
    host: '127.0.0.1',
    user: 'u394295194_sohail',
    password: '@Outlook.com1@',
    database: 'u394295194_carrefour'
};

async function sync() {
    let connection;
    try {
        console.log('--- 🔄 Database Sync Started ---');
        connection = await mysql.createConnection(config);
        
        const dbPath = path.join(__dirname, 'db.json');
        if (!fs.existsSync(dbPath)) {
            console.error('❌ Error: db.json not found in current directory.');
            return;
        }

        const data = JSON.parse(fs.readFileSync(dbPath, 'utf8'));
        const products = data.products || [];
        
        console.log(`📦 Found ${products.length} products to sync.`);

        for (const p of products) {
            try {
                // Use INSERT IGNORE or REPLACE INTO to handle existing barcodes
                await connection.query(
                    'REPLACE INTO products (barcode, name, price_buy, sell_price, stock_current, expiry, offer) VALUES (?, ?, ?, ?, ?, ?, ?)',
                    [
                        String(p.barcode),
                        p.name,
                        parseFloat(p.price_buy || 0),
                        parseFloat(p.sell_price || 0),
                        parseInt(p.stock_current || 0),
                        p.expiry || '',
                        p.offer || 0
                    ]
                );
            } catch (err) {
                console.warn(`⚠️ Failed to sync product ${p.barcode}:`, err.message);
            }
        }

        console.log('✅ Sync Complete! All products imported to MySQL.');

    } catch (err) {
        console.error('❌ Sync Failed:', err.message);
    } finally {
        if (connection) await connection.end();
        process.exit();
    }
}

sync();
