const { PDFParse } = require('pdf-parse');
const fs = require('fs');

const pdfPath = 'C:\\Users\\sohai\\Desktop\\TODOS.pdf';

async function run() {
    try {
        console.log('--- 📑 PDF Parsing Started ---');
        const dataBuffer = fs.readFileSync(pdfPath);
        const uint8Array = new Uint8Array(dataBuffer);
        const parser = new PDFParse(uint8Array);
        await parser.load();
        const textResult = await parser.getText();
        
        // Combine all pages
        const fullText = textResult.pages.map(p => p.text).join('\n');
        
        // Split by the pattern that seems to end each ticket block
        // Pattern: SV L01 M01 1 [3]
        const blocks = fullText.split(/SV L\d+ M\d+ \d+ \[\d+\]/);
        console.log(`🔍 Total potential blocks found: ${blocks.length}`);

        const products = [];
        blocks.forEach((block, index) => {
            const lines = block.split('\n').map(l => l.trim()).filter(l => l.length > 0);
            if (lines.length < 2) return;

            // Name is usually the first line
            // But skip lines like "La unidad saldría a", "El Litro saldría a", etc.
            let name = lines[0];
            if (name.includes('saldría a') && lines.length > 1) {
                name = lines[1]; // fallback? No, let's be smarter.
            }

            // Better way: Name is usually uppercase and starts the block.
            // Let's refine the name extraction.
            let foundName = null;
            for(let i=0; i<lines.length; i++) {
                if (!lines[i].includes('saldría a') && lines[i].length > 5 && !/^\d/.test(lines[i])) {
                    foundName = lines[i];
                    break;
                }
            }

            // Extract Price: Pattern "digit space digit" followed by tab or comma
            // Example: "13 49 ," or "3 39 ,"
            let price = 0;
            const priceMatch = block.match(/(\d+)\s(\d{2})[\s\t]*,/);
            if (priceMatch) {
                price = parseFloat(`${priceMatch[1]}.${priceMatch[2]}`);
            } else {
                // Secondary price pattern if no comma
                const altPriceMatch = block.match(/(\d+)\s(\d{2})[\s\t,]*€/);
                if (altPriceMatch) {
                    price = parseFloat(`${altPriceMatch[1]}.${altPriceMatch[2]}`);
                }
            }

            // Extract EAN: 13 digits
            const eanMatch = block.match(/(\d{13})/);
            const ean = eanMatch ? eanMatch[1] : null;

            if (foundName && ean && price > 0) {
                products.push({
                    barcode: ean,
                    name: foundName,
                    price_buy: (price * 0.8).toFixed(2), // Estimated buy price (20% margin)
                    sell_price: price.toFixed(2),
                    stock_current: 20, // Default stock
                    expiry: '',
                    offer: 0
                });
            }
        });

        // Filter duplicates by EAN
        const uniqueProducts = Array.from(new Map(products.map(p => [p.barcode, p])).values());

        console.log(`✅ Extracted ${products.length} entries.`);
        console.log(`💎 Found ${uniqueProducts.length} unique products.`);

        fs.writeFileSync('extracted_products.json', JSON.stringify(uniqueProducts, null, 2));
        console.log('🚀 Data saved to extracted_products.json');

    } catch (err) {
        console.error('❌ Error during PDF processing:', err);
    }
}

run();
