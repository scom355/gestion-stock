const fs = require('fs');
const path = require('path');

const DB_FILE = path.join(__dirname, 'db.json');
const PDF_PRODS_FILE = path.join(__dirname, 'extracted_products.json');

function merge() {
    try {
        console.log('--- 🔄 Merging PDF Products into db.json ---');
        
        if (!fs.existsSync(PDF_PRODS_FILE)) {
            console.error('❌ Error: extracted_products.json not found.');
            return;
        }

        const pdfProducts = JSON.parse(fs.readFileSync(PDF_PRODS_FILE, 'utf8'));
        const db = JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
        
        const existingBarcodes = new Set(db.products.map(p => String(p.barcode)));
        let addedCount = 0;
        let updatedCount = 0;

        pdfProducts.forEach(p => {
            const barcode = String(p.barcode);
            if (!existingBarcodes.has(barcode)) {
                // Add new product
                db.products.push({
                    id: Date.now() + Math.floor(Math.random() * 100000),
                    barcode: barcode,
                    name: p.name,
                    price_buy: parseFloat(p.price_buy || 0),
                    sell_price: parseFloat(p.sell_price || 0),
                    stock_current: parseInt(p.stock_current || 0),
                    expiry: p.expiry || '',
                    offer: parseInt(p.offer || 0)
                });
                existingBarcodes.add(barcode);
                addedCount++;
            } else {
                // Optionally update existing ones if they are "placeholder" like or just to be sure
                // For now, let's just count them. If the user wants a full refresh, we could clear db first.
                updatedCount++;
            }
        });

        fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2));
        console.log(`✅ Success!`);
        console.log(`➕ Added: ${addedCount} new products.`);
        console.log(`🔄 Skipped/Existing: ${updatedCount} products.`);
        console.log(`📦 Total in db.json: ${db.products.length}`);

    } catch (err) {
        console.error('❌ Merge Failed:', err.message);
    }
}

merge();
