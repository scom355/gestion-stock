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
        console.log('--- 🔄 Bulk PDF Stock Import Started ---');
        connection = await mysql.createConnection(config);
        
        const jsonPath = path.join(__dirname, 'extracted_products.json');
        if (!fs.existsSync(jsonPath)) {
            console.error('❌ Error: extracted_products.json not found.');
            return;
        }

        const products = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
        console.log(`📦 Found ${products.length} products to import.`);

        // Process in batches of 100 to be efficient
        const batchSize = 100;
        for (let i = 0; i < products.length; i += batchSize) {
            const batch = products.slice(i, i + batchSize);
            
            // Build bulk insert query
            // barcode, name, price_buy, sell_price, stock_current, expiry, offer
            const values = [];
            const placeholders = batch.map(() => '(?, ?, ?, ?, ?, ?, ?)').join(', ');
            
            batch.forEach(p => {
                values.push(
                    String(p.barcode),
                    p.name,
                    parseFloat(p.price_buy || 0),
                    parseFloat(p.sell_price || 0),
                    parseInt(p.stock_current || 0),
                    p.expiry || '',
                    p.offer || 0
                );
            });

            const query = `REPLACE INTO products (barcode, name, price_buy, sell_price, stock_current, expiry, offer) VALUES ${placeholders}`;
            await connection.query(query, values);
            
            const progress = Math.min(i + batchSize, products.length);
            console.log(`⏳ Imported ${progress}/${products.length} products...`);
        }

        console.log('✅ Bulk Import Complete! All products from PDF are now in MySQL.');

    } catch (err) {
        console.error('❌ Bulk Import Failed:', err.message);
    } finally {
        if (connection) await connection.end();
        process.exit();
    }
}

sync();
