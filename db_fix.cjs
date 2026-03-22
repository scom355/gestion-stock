const mysql = require("mysql2/promise");
const config = { host: "127.0.0.1", user: "u394295194_sohail", password: "@Outlook.com1@", database: "u394295194_carrefour" };

async function run() {
    let p;
    try {
        p = await mysql.createConnection(config);
        console.log("Checking schema...");

        // Rename old sales if it doesn't have 'total'
        const [cols] = await p.query("DESCRIBE sales");
        const hasTotal = cols.some(c => c.Field === 'total');

        if (!hasTotal) {
            console.log("Old sales table found. Renaming to sales_old...");
            await p.query("RENAME TABLE sales TO sales_old");
        }

        // Create new tables with correct schema
        console.log("Creating/Fixing tables...");
        await p.query(`CREATE TABLE IF NOT EXISTS sales (
            id INT AUTO_INCREMENT PRIMARY KEY,
            total DECIMAL(10, 2) NOT NULL,
            items_count INT DEFAULT 0,
            timestamp DATETIME NOT NULL
        )`);

        await p.query(`CREATE TABLE IF NOT EXISTS sales_details (
            id INT AUTO_INCREMENT PRIMARY KEY,
            sale_id INT NOT NULL,
            product_id BIGINT,
            name VARCHAR(200),
            price DECIMAL(10, 2),
            qty INT
        )`);

        console.log("✅ Schema updated successfully");

    } catch (e) {
        console.error("❌ Schema update error:", e.message);
    } finally {
        if (p) await p.end();
        process.exit();
    }
}

run();
