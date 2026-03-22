<?php
/**
 * 🚀 CARREFOUR EXPRESS - STABLE PHP BACKEND (V2.0)
 * This is now the PRIMARY API. It talks directly to MySQL.
 * PHP is extremely stable on Hostinger and solves the "DB stopped working" issue.
 */

header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With");
header("Content-Type: application/json");

if ($_SERVER['REQUEST_METHOD'] == 'OPTIONS') {
    exit(0);
}

// --- CONFIGURATION ---
$DB_FILE = __DIR__ . '/../db.json';
$MYSQL_CONF = [
    'host' => '127.0.0.1',
    'user' => 'u394295194_sohail',
    'pass' => '@Outlook.com1@',
    'db' => 'u394295194_carrefour'
];

error_reporting(E_ALL);
ini_set('display_errors', 0);

// --- MYSQL CONNECTION ---
$conn = null;
$useMySQL = false;

try {
    $conn = new mysqli($MYSQL_CONF['host'], $MYSQL_CONF['user'], $MYSQL_CONF['pass'], $MYSQL_CONF['db']);
    if ($conn->connect_error) {
        throw new Exception("Connection failed: " . $conn->connect_error);
    }
    $useMySQL = true;
    $conn->set_charset("utf8mb4");

    // Ensure ticket_spool table looks correct
    $conn->query("CREATE TABLE IF NOT EXISTS ticket_spool (
        id INT AUTO_INCREMENT PRIMARY KEY,
        barcode VARCHAR(50),
        name VARCHAR(255),
        sell_price DECIMAL(10,2),
        qty INT DEFAULT 1,
        is_bandeja TINYINT(1) DEFAULT 0,
        price_kilo DECIMAL(10,2) DEFAULT 0.00,
        weight DECIMAL(10,3) DEFAULT 0.000,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
    )");

    // Ensure ticket_history table exists
    $conn->query("CREATE TABLE IF NOT EXISTS ticket_history (
        id INT AUTO_INCREMENT PRIMARY KEY,
        filename VARCHAR(255) NOT NULL,
        items_count INT DEFAULT 0,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
    )");

    // Migration for existing tables
    $conn->query("ALTER TABLE ticket_spool ADD COLUMN is_bandeja TINYINT(1) DEFAULT 0");
    $conn->query("ALTER TABLE ticket_spool ADD COLUMN price_kilo DECIMAL(10,2) DEFAULT 0.00");
    $conn->query("ALTER TABLE ticket_spool ADD COLUMN weight DECIMAL(10,3) DEFAULT 0.000");

} catch (Exception $e) {
    // Fallback to JSON will happen automatically in the routes
}

// --- JSON HELPERS ---
function get_db_json()
{
    global $DB_FILE;
    if (!file_exists($DB_FILE))
        return ["products" => [], "sales" => [], "ticket_spool" => [], "categories" => ["General"]];
    $data = json_decode(file_get_contents($DB_FILE), true);
    return is_array($data) ? $data : ["products" => [], "sales" => [], "ticket_spool" => []];
}

function save_db_json($data)
{
    global $DB_FILE;
    file_put_contents($DB_FILE, json_encode($data, JSON_PRETTY_PRINT));
}

// --- ROUTING ---
$uri = $_SERVER['REQUEST_URI'];
$method = $_SERVER['REQUEST_METHOD'];
$body = file_get_contents('php://input');
$data = json_decode($body, true) ?? [];

// Get the base path of the script (e.g., /api)
$script_dir = str_replace('\\', '/', dirname($_SERVER['SCRIPT_NAME']));
if ($script_dir == '/')
    $script_dir = '';

// Extract the path after /api
$req_path = explode('?', $uri)[0];
$api_path = '/' . ltrim(str_replace($script_dir, '', $req_path), '/');
$api_path = rtrim($api_path, '/'); // Remove trailing slash
if ($api_path == '')
    $api_path = '/';

// Logging helper for debugging
function log_msg($msg)
{
    file_put_contents(__DIR__ . '/api_log.txt', date('[Y-m-d H:i:s] ') . $msg . PHP_EOL, FILE_APPEND);
}

// Response helper
function send_json($data, $code = 200)
{
    http_response_code($code);
    echo json_encode($data);
    exit;
}

    // --- API ENDPOINTS ---
    switch (true) {
        case ($api_path == '/health' && $method == 'GET'):
            send_json([
                "status" => "ok",
                "version" => "2.0.1",
                "dbMode" => $useMySQL ? "MySQL" : "JSON Fallback",
                "engine" => "PHP Direct"
            ]);
            break;

        case ($api_path == '/products' && $method == 'GET'):
        if ($useMySQL) {
            $page = isset($_GET['page']) ? intval($_GET['page']) : 1;
            $limit = isset($_GET['limit']) ? intval($_GET['limit']) : 50;
            $search = isset($_GET['search']) ? $conn->real_escape_string($_GET['search']) : '';
            $offset = ($page - 1) * $limit;

            $where = "";
            if ($search !== '') {
                if (ctype_digit($search)) {
                    $where = "AND p.barcode = '$search'";
                } else {
                    $where = "AND p.name LIKE '%$search%'";
                }
            }

            // Total count using unique barcodes
            $countRes = $conn->query("SELECT COUNT(DISTINCT barcode) as total FROM products");
            $totalCount = $countRes ? $countRes->fetch_assoc()['total'] : 0;

            // De-duplicated results using subquery to get max(id) per barcode
            $sql = "SELECT p.* FROM products p 
                    INNER JOIN (SELECT MAX(id) as max_id FROM products GROUP BY barcode) as latest 
                    ON p.id = latest.max_id 
                    WHERE 1=1 $where 
                    ORDER BY p.id DESC LIMIT $limit OFFSET $offset";

            $res = $conn->query($sql);
            $products = [];
            if ($res) {
                while ($row = $res->fetch_assoc()) {
                    $row['sell_price'] = floatval($row['sell_price']);
                    $row['price_buy'] = floatval($row['price_buy']);
                    $row['stock_current'] = intval($row['stock_current']);
                    $products[] = $row;
                }
            }

            send_json([
                "products" => $products,
                "total" => intval($totalCount),
                "page" => $page,
                "limit" => $limit
            ]);
        }
        send_json(["products" => get_db_json()['products'], "total" => count(get_db_json()['products'])]);
        break;

    case ($api_path == '/products' && $method == 'POST'):
        if ($useMySQL) {
            $stmt = $conn->prepare("INSERT INTO products (barcode, name, sell_price, price_buy, stock_current, expiry, offer) VALUES (?, ?, ?, ?, ?, ?, ?)");
            $stmt->bind_param("ssddisi", $data['barcode'], $data['name'], $data['sell_price'], $data['price_buy'], $data['stock_current'], $data['expiry'], $data['offer']);
            if ($stmt->execute()) {
                $id = $conn->insert_id;
                send_json(["success" => true, "id" => $id]);
            }
            send_json(["success" => false, "error" => $conn->error], 500);
        }
        // JSON Fallback logic...
        $db = get_db_json();
        $data['id'] = time();
        $db['products'][] = $data;
        save_db_json($db);
        send_json(["success" => true, "id" => $data['id'], "fallback" => true]);
        break;

    case (preg_match('/\/product\/(.+)/', $api_path, $m) && $method == 'PUT'):
        $id = $m[1];
        if ($useMySQL) {
            $updates = [];
            $types = "";
            $vals = [];

            // Map of field names to their database types
            $allowedFields = [
                'barcode' => 's',
                'name' => 's',
                'sell_price' => 'd',
                'price_buy' => 'd',
                'stock_current' => 'i',
                'expiry' => 's',
                'offer' => 'i'
            ];

            foreach ($allowedFields as $field => $type) {
                if (isset($data[$field])) {
                    $updates[] = "$field = ?";
                    $types .= $type;
                    $vals[] = $data[$field];
                }
            }

            if (!empty($updates)) {
                $sql = "UPDATE products SET " . implode(', ', $updates) . " WHERE id = ? OR barcode = ?";
                $types .= "ss";
                $vals[] = $id;
                $vals[] = $id;

                $stmt = $conn->prepare($sql);
                if ($stmt) {
                    $stmt->bind_param($types, ...$vals);
                    if ($stmt->execute()) {
                        send_json(["success" => true]);
                    } else {
                        send_json(["success" => false, "error" => $stmt->error], 500);
                    }
                } else {
                    send_json(["success" => false, "error" => $conn->error], 500);
                }
            }
        }

        // JSON Fallback / Standalone mode
        $db = get_db_json();
        $foundIndices = [];
        foreach ($db['products'] as $idx => &$p) {
            if ($p['id'] == $id || $p['barcode'] == $id) {
                foreach ($data as $k => $v) {
                    if ($k !== 'id') {
                        // Cast values correctly
                        if ($k == 'sell_price' || $k == 'price_buy')
                            $p[$k] = floatval($v);
                        elseif ($k == 'stock_current' || $k == 'offer')
                            $p[$k] = intval($v);
                        else
                            $p[$k] = $v;
                    }
                }
                $foundIndices[] = $idx;
                break; // Just update one
            }
        }

        if (!empty($foundIndices)) {
            save_db_json($db);
            send_json(["success" => true, "note" => "Updated in JSON"]);
        }

        send_json(["success" => false, "error" => "Product not found or database sync failed"], 404);
        break;


    case (preg_match('/\/product\/(.+)/', $api_path, $m) && $method == 'DELETE'):
        $id = $m[1];
        if ($useMySQL) {
            $conn->query("DELETE FROM products WHERE id='$id' OR barcode='$id'");
            send_json(["success" => true]);
        }
        send_json(["success" => false], 500);
        break;

    case (preg_match('/\/product\/(.+)/', $api_path, $m) && $method == 'GET'):
        $id_raw = urldecode($m[1]);
        if ($useMySQL) {
            $id = $conn->real_escape_string($id_raw);
            // Priority 1: Exact Barcode or ID (Always latest entry)
            $sql = "SELECT * FROM products WHERE (barcode='$id' OR id='$id') ORDER BY id DESC LIMIT 1";
            $res = $conn->query($sql);
            $row = $res->fetch_assoc();

            // Priority 2: Fallback to name search if not found
            if (!$row) {
                $sqlName = "SELECT * FROM products WHERE name LIKE '%$id%' ORDER BY id DESC LIMIT 1";
                $resName = $conn->query($sqlName);
                if ($resName)
                    $row = $resName->fetch_assoc();
            }

            send_json($row ?? (object) []);
        }
        send_json((object) []);
        break;

    // 2. SALES
    case ($api_path == '/sales' && $method == 'POST'):
        if ($useMySQL) {
            $conn->begin_transaction();
            try {
                $stmt = $conn->prepare("INSERT INTO sales (total, items_count, timestamp) VALUES (?, ?, ?)");
                $items_count = count($data['items']);
                $stmt->bind_param("dis", $data['total'], $items_count, $data['timestamp']);
                $stmt->execute();
                $saleId = $conn->insert_id;

                foreach ($data['items'] as $item) {
                    $stmt2 = $conn->prepare("INSERT INTO sales_details (sale_id, product_id, name, price, qty) VALUES (?, ?, ?, ?, ?)");
                    $stmt2->bind_param("iisdi", $saleId, $item['id'], $item['name'], $item['sell_price'], $item['qty']);
                    $stmt2->execute();
                    // Update stock
                    $conn->query("UPDATE products SET stock_current = stock_current - {$item['qty']} WHERE id='{$item['id']}' OR barcode='{$item['barcode']}'");
                }
                $conn->commit();
                send_json(["success" => true, "id" => $saleId]);
            } catch (Exception $e) {
                $conn->rollback();
                send_json(["success" => false, "error" => $e->getMessage()], 500);
            }
        }
        send_json(["success" => false, "error" => "MySQL Offline"], 500);
        break;

    case ($api_path == '/sales' && $method == 'GET'):
        if ($useMySQL) {
            $res = $conn->query("SELECT * FROM sales ORDER BY id DESC LIMIT 100");
            $out = [];
            while ($r = $res->fetch_assoc())
                $out[] = $r;
            send_json($out);
        }
        send_json([]);
        break;

    // 3. TICKET SPOOL
    case ($api_path == '/spool' && $method == 'GET'):
        if ($useMySQL) {
            $res = $conn->query("SELECT * FROM ticket_spool ORDER BY id ASC");
            $out = [];
            while ($r = $res->fetch_assoc())
                $out[] = $r;
            send_json($out);
        }
        send_json(get_db_json()['ticket_spool'] ?? []);
        break;

    case ($api_path == '/spool' && $method == 'POST'):
        $items = isset($data[0]) ? $data : [$data];
        if ($useMySQL) {
            foreach ($items as $item) {
                $stmt = $conn->prepare("INSERT INTO ticket_spool (barcode, name, sell_price, qty, is_bandeja, price_kilo, weight) VALUES (?, ?, ?, ?, ?, ?, ?)");
                $isB = isset($item['isBandeja']) ? 1 : 0;
                $pK = $item['display_price_kilo'] ?? 0;
                $w = $item['display_weight'] ?? 0;
                $stmt->bind_param("ssdiidd", $item['barcode'], $item['name'], $item['sell_price'], $item['qty'], $isB, $pK, $w);
                $stmt->execute();
            }
            send_json(["success" => true]);
        }
        // JSON Fallback
        $db = get_db_json();
        if (!isset($db['ticket_spool'])) $db['ticket_spool'] = [];
        foreach ($items as $item) {
            $item['is_bandeja'] = isset($item['isBandeja']) ? true : false;
            $db['ticket_spool'][] = $item;
        }
        save_db_json($db);
        send_json(["success" => true, "fallback" => true]);
        break;

    case ($api_path == '/spool' && $method == 'DELETE'):
        if ($useMySQL) {
            $conn->query("DELETE FROM ticket_spool");
            send_json(["success" => true]);
        }
        send_json(["success" => false], 500);
        break;

    // --- TICKET HISTORY ARCHIVE ---
    case ($api_path == '/spool/history' && $method == 'GET'):
        if ($useMySQL) {
            $res = $conn->query("SELECT * FROM ticket_history ORDER BY id DESC LIMIT 5");
            $out = [];
            while ($r = $res->fetch_assoc())
                $out[] = $r;
            send_json($out);
        }
        send_json([]);
        break;

    case ($api_path == '/spool/archive' && $method == 'POST'):
        $pdfBase64 = $data['pdfBase64'] ?? '';
        $itemsCount = $data['itemsCount'] ?? 0;
        if (!$pdfBase64)
            send_json(["success" => false, "error" => "No PDF data"], 400);

        // Save file
        $fname = "spool_" . date('Ymd_His') . ".pdf";
        $targetDir = __DIR__ . '/tickets';
        if (!is_dir($targetDir))
            mkdir($targetDir, 0755, true);

        $raw = base64_decode(strpos($pdfBase64, 'base64,') !== false ? explode('base64,', $pdfBase64)[1] : $pdfBase64);
        file_put_contents($targetDir . '/' . $fname, $raw);

        if ($useMySQL) {
            $stmt = $conn->prepare("INSERT INTO ticket_history (filename, items_count) VALUES (?, ?)");
            $stmt->bind_param("si", $fname, $itemsCount);
            $stmt->execute();

            // --- AUTO-CLEANUP LOGIC ---
            
            // 1. Keep only last 5 files (Clean up records beyond the 5th most recent)
            $resExtra = $conn->query("SELECT id, filename FROM ticket_history ORDER BY id DESC LIMIT 5, 100");
            if ($resExtra) {
                while ($row = $resExtra->fetch_assoc()) {
                    $delPath = __DIR__ . '/tickets/' . $row['filename'];
                    if (file_exists($delPath)) @unlink($delPath);
                    $conn->query("DELETE FROM ticket_history WHERE id = " . $row['id']);
                }
            }

            // 2. Delete files older than 24 hours
            $resOld = $conn->query("SELECT id, filename FROM ticket_history WHERE timestamp < DATE_SUB(NOW(), INTERVAL 1 DAY)");
            if ($resOld) {
                while ($row = $resOld->fetch_assoc()) {
                    $delPath = __DIR__ . '/tickets/' . $row['filename'];
                    if (file_exists($delPath)) @unlink($delPath);
                    $conn->query("DELETE FROM ticket_history WHERE id = " . $row['id']);
                }
            }

            send_json(["success" => true, "filename" => $fname]);
        }
        send_json(["success" => false], 500);
        break;

    case (preg_match('/\/spool\/download\/(.+)/', $api_path, $m) && $method == 'GET'):
        $fname = $m[1];
        $targetFile = __DIR__ . '/tickets/' . $fname;
        if (file_exists($targetFile)) {
            header('Content-Type: application/pdf');
            header('Content-Disposition: attachment; filename="' . $fname . '"');
            readfile($targetFile);
            exit;
        }
        send_json(["error" => "File not found"], 404);
        break;

    // 4. DASHBOARD & REPORTS
    case ($api_path == '/dashboard' && $method == 'GET'):
        $totalProducts = 0;
        if ($useMySQL) {
            $res = $conn->query("SELECT COUNT(DISTINCT barcode) as ts FROM products");
            $totalProducts = $res->fetch_assoc()['ts'] ?? 0;
        }
        send_json([
            "dashboard" => "Strategic (PHP Power)",
            "kpis" => [
                "a1" => ["value" => "S", "label" => "SCANNER", "color" => "#003986"],
                "a2" => ["value" => strval($totalProducts), "label" => "INVENTARIO", "color" => "#E1000F"],
                "a3" => ["value" => "A", "label" => "ANÁLISIS", "color" => "#009E49"],
                "a4" => ["value" => "!", "label" => "ALERTAS", "color" => "#F89406"],
                "a5" => ["value" => "P", "label" => "SPOOL", "color" => "#9b59b6"],
                "a6" => ["value" => "€", "label" => "VENTAS", "color" => "#1abc9c"],
                "a7" => ["value" => "T", "label" => "TOOLS", "color" => "#e91e63"],
                "a8" => ["value" => "R", "label" => "REPORTES", "color" => "#d9534f"]
            ]
        ]);
        break;

    case ($api_path == '/reports/summary' && $method == 'GET'):
        if ($useMySQL) {
            $r1 = $conn->query("SELECT SUM(total) as rev FROM sales")->fetch_assoc();
            $r2 = $conn->query("SELECT COUNT(*) as cnt FROM sales")->fetch_assoc();
            send_json(["total_revenue" => floatval($r1['rev'] ?? 0), "total_orders" => intval($r2['cnt'] ?? 0)]);
        }
        send_json(["total_revenue" => 0, "total_orders" => 0]);
        break;

    // 5. EMAIL (Simplified Bridge + Fallback)
    case ($api_path == '/send-email' && $method == 'POST'):
        $targetEmail = $data['targetEmail'] ?? 'slwforever143@gmail.com';
        $pdfBase64 = $data['pdfBase64'] ?? '';
        $saleData = $data['saleData'] ?? null;
        $subject = $saleData ? "💰 Nueva Venta" : "🖨️ Tickets Carrefour";

        // --- STRATEGY: TRY BRIDGE TO NODE.JS FIRST (Working logic from last night) ---
        $nodeUrl = "http://127.0.0.1:5000/api/send-email";
        $ch = curl_init($nodeUrl);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_POST, true);
        curl_setopt($ch, CURLOPT_POSTFIELDS, $body);
        curl_setopt($ch, CURLOPT_HTTPHEADER, ['Content-Type: application/json']);
        curl_setopt($ch, CURLOPT_TIMEOUT, 5);
        $nodeRes = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);

        if ($httpCode >= 200 && $httpCode < 300) {
            log_msg("✅ Email sent via Node.js Bridge successfully.");
            send_json(["success" => true, "method" => "node_bridge"]);
        }

        // --- FALLBACK: Standard PHP Mail if Node is down ---
        log_msg("⚠️ Node Bridge failed or down (Code $httpCode). Falling back to PHP mail()...");

        $boundary = md5(time());
        $domain = $_SERVER['HTTP_HOST'];
        $from = "admin@" . $domain;
        $headers = "From: Carrefour Express <$from>\r\n";
        $headers .= "Reply-To: slwforever143@gmail.com\r\n";
        $headers .= "MIME-Version: 1.0\r\n";
        $headers .= "Content-Type: multipart/mixed; boundary=\"$boundary\"\r\n";

        $msg_body = "--$boundary\r\nContent-Type: text/html; charset=UTF-8\r\n\r\n";
        $msg_body .= $saleData ? "<h2>Venta Realizada</h2><p>Total: €{$saleData['total']}</p>" : "Adjunto encontrara los tickets de Carrefour Express.<br>Localidad: Ronda de Outeiro 112";
        $msg_body .= "\r\n";

        if ($pdfBase64) {
            $raw = base64_decode(strpos($pdfBase64, 'base64,') !== false ? explode('base64,', $pdfBase64)[1] : $pdfBase64);
            $msg_body .= "--$boundary\r\nContent-Type: application/pdf; name=\"tickets.pdf\"\r\nContent-Transfer-Encoding: base64\r\nContent-Disposition: attachment; filename=\"tickets.pdf\"\r\n\r\n" . chunk_split(base64_encode($raw)) . "\r\n";
        }
        $msg_body .= "--$boundary--";

        if (mail($targetEmail, $subject, $msg_body, $headers, "-f$from")) {
            log_msg("✅ Email sent via PHP mail() fallback.");
            send_json(["success" => true, "method" => "php_mail"]);
        } else {
            send_json(["success" => false, "error" => "All email methods failed"], 500);
        }
        break;


    default:
        send_json(["status" => "not_found", "path" => $api_path], 404);
        break;
}