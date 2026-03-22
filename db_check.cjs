const mysql = require("mysql2/promise");
const config = { host: "127.0.0.1", user: "u394295194_sohail", password: "@Outlook.com1@", database: "u394295194_carrefour" };
async function check() {
    try {
        const p = await mysql.createConnection(config);
        const [r] = await p.query("SELECT COUNT(*) as count FROM products");
        console.log("PRODUCT COUNT:", r[0].count);

        if (r[0].count > 0) {
            const [rows] = await p.query("SELECT * FROM products LIMIT 5");
            console.log("SAMPLE PRODUCTS:", JSON.stringify(rows, null, 2));
        }
    } catch (e) {
        console.log("ERR:", e.message);
    }
    process.exit();
}
check();
