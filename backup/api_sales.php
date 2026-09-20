<?php
header('Content-Type: application/json; charset=utf-8');
date_default_timezone_set('Asia/Bangkok');

$conn = new mysqli('127.0.0.1', 'root', '', 'pos_db');
$conn->set_charset("utf8mb4");

if ($conn->connect_error) {
    echo json_encode(['success' => false, 'message' => 'เชื่อมต่อฐานข้อมูลไม่สำเร็จ: ' . $conn->connect_error]);
    exit;
}

// ตรวจสอบและสร้างคอลัมน์ที่จำเป็นอัตโนมัติ
try { $conn->query("ALTER TABLE orders ADD COLUMN customer_name VARCHAR(255) DEFAULT ''"); } catch (Throwable $e) {}
try { $conn->query("ALTER TABLE orders ADD COLUMN debt_note TEXT DEFAULT ''"); } catch (Throwable $e) {}
try { $conn->query("ALTER TABLE products ADD COLUMN stock_qty INT DEFAULT 0"); } catch (Throwable $e) {}
try { $conn->query("ALTER TABLE products ADD COLUMN cost_price DECIMAL(10,2) DEFAULT 0.00"); } catch (Throwable $e) {}
try { $conn->query("ALTER TABLE products ADD COLUMN parent_id VARCHAR(50) DEFAULT NULL"); } catch (Throwable $e) {}
try { $conn->query("ALTER TABLE products ADD COLUMN multiplier INT DEFAULT 1"); } catch (Throwable $e) {}
try { $conn->query("ALTER TABLE order_items ADD COLUMN cost_price DECIMAL(10,2) DEFAULT 0.00"); } catch (Throwable $e) {}

$conn->query("
    CREATE TABLE IF NOT EXISTS debt_payments (
        id INT AUTO_INCREMENT PRIMARY KEY,
        customer_name VARCHAR(255) NOT NULL,
        amount DECIMAL(10,2) NOT NULL,
        payment_method VARCHAR(50) DEFAULT 'cash',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
");

$action = $_GET['action'] ?? '';

// 1. บันทึกข้อมูลการขายใหม่
if ($action === 'save_sale') {
    $saleData = json_decode($_POST['sale_data'] ?? '{}', true);

    if (empty($saleData) || empty($saleData['items'])) {
        echo json_encode(['success' => false, 'message' => 'ไม่มีข้อมูลสินค้าในตะกร้า']);
        exit;
    }

    $today = date('Ymd');
    $prefix = "TX" . $today . "-";

    $stmtCheck = $conn->prepare("SELECT id FROM orders WHERE id LIKE CONCAT(?, '%') ORDER BY id DESC LIMIT 1");
    $stmtCheck->bind_param("s", $prefix);
    $stmtCheck->execute();
    $resCheck = $stmtCheck->get_result();

    if ($resCheck && $row = $resCheck->fetch_assoc()) {
        $lastNum = intval(substr($row['id'], strrpos($row['id'], '-') + 1));
        $newNum = $lastNum + 1;
    } else {
        $newNum = 1;
    }

    $orderId = $prefix . str_pad($newNum, 4, '0', STR_PAD_LEFT);
    $total = floatval($saleData['total']);
    $paymentMethod = trim($saleData['payment_method'] ?? 'cash');
    $customerName = trim($saleData['customer_name'] ?? '');
    $debtNote = trim($saleData['debt_note'] ?? '');
    
    $received = ($paymentMethod === 'debt') ? 0 : floatval($saleData['received']);
    $change = ($paymentMethod === 'debt') ? 0 : floatval($saleData['change']);

    $conn->begin_transaction();
    try {
        $stmt = $conn->prepare("INSERT INTO orders (id, total, received, change_amount, payment_method, customer_name, debt_note, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, NOW())");
        $stmt->bind_param("sdddsss", $orderId, $total, $received, $change, $paymentMethod, $customerName, $debtNote);
        $stmt->execute();

        $itemStmt = $conn->prepare("INSERT INTO order_items (order_id, product_id, product_name, cost_price, price, qty) VALUES (?, ?, ?, ?, ?, ?)");
        $stockDeductStmt = $conn->prepare("UPDATE products SET stock_qty = stock_qty - ? WHERE id = ?");
        $checkParentStmt = $conn->prepare("SELECT parent_id, multiplier FROM products WHERE id = ?");

        foreach ($saleData['items'] as $item) {
            $pId = strval($item['id']);
            $pName = strval($item['name']);
            $pCost = floatval($item['cost_price'] ?? 0);
            $pPrice = floatval($item['price']);
            $pQty = intval($item['qty']);

            $itemStmt->bind_param("sssddi", $orderId, $pId, $pName, $pCost, $pPrice, $pQty);
            $itemStmt->execute();

            $targetStockId = $pId;
            $deductQty = $pQty;

            $checkParentStmt->bind_param("s", $pId);
            $checkParentStmt->execute();
            $pRes = $checkParentStmt->get_result();
            if ($pRes && $pRow = $pRes->fetch_assoc()) {
                if (!empty($pRow['parent_id'])) {
                    $targetStockId = $pRow['parent_id'];
                    $multiplier = intval($pRow['multiplier']) > 0 ? intval($pRow['multiplier']) : 1;
                    $deductQty = $pQty * $multiplier;
                }
            }

            $stockDeductStmt->bind_param("is", $deductQty, $targetStockId);
            $stockDeductStmt->execute();
        }

        $conn->commit();
        echo json_encode(['success' => true, 'order_id' => $orderId]);
    } catch (Exception $e) {
        $conn->rollback();
        echo json_encode(['success' => false, 'message' => 'เกิดข้อผิดพลาดในการบันทึกการขาย: ' . $e->getMessage()]);
    }
    exit;
}

// 2. ดึงประวัติการขาย
if ($action === 'get_history') {
    $sqlAll = "SELECT id, total, received, change_amount, payment_method, customer_name, debt_note, created_at FROM orders ORDER BY created_at DESC";
    $resultAll = $conn->query($sqlAll);
    
    $billsPool = [];
    $stmtItems = $conn->prepare("
        SELECT oi.product_id as id, oi.product_name as name, 
               COALESCE(NULLIF(oi.cost_price, 0), p.cost_price, 0) as cost_price, 
               oi.price, oi.qty 
        FROM order_items oi 
        LEFT JOIN products p ON oi.product_id = p.id 
        WHERE oi.order_id = ?
    ");

    if ($resultAll) {
        while ($row = $resultAll->fetch_assoc()) {
            $orderId = $row['id'];
            
            $stmtItems->bind_param("s", $orderId);
            $stmtItems->execute();
            $itemsRes = $stmtItems->get_result();
            
            $items = [];
            if ($itemsRes) {
                while ($item = $itemsRes->fetch_assoc()) {
                    $items[] = [
                        'id' => $item['id'],
                        'name' => $item['name'],
                        'cost_price' => floatval($item['cost_price']),
                        'price' => floatval($item['price']),
                        'qty' => intval($item['qty'])
                    ];
                }
            }

            $billsPool[] = [
                'id' => $row['id'],
                'total' => floatval($row['total']),
                'received' => floatval($row['received']),
                'change' => floatval($row['change_amount']),
                'payment_method' => $row['payment_method'],
                'customer_name' => $row['customer_name'],
                'debt_note' => $row['debt_note'] ?? '',
                'timestamp' => $row['created_at'],
                'items' => $items
            ];
        }
    }

    echo json_encode($billsPool);
    exit;
}

// 3. บันทึกแก้ไขบิลเดิม
if ($action === 'update_bill' && $_SERVER['REQUEST_METHOD'] === 'POST') {
    $billId = trim($_POST['id'] ?? '');
    $total = floatval($_POST['total'] ?? 0);
    $received = floatval($_POST['received'] ?? 0);
    $change = floatval($_POST['change'] ?? 0);
    $paymentMethod = trim($_POST['payment_method'] ?? 'cash');
    $customerName = trim($_POST['customer_name'] ?? '');
    $debtNote = trim($_POST['debt_note'] ?? '');
    $items = json_decode($_POST['items'] ?? '[]', true);

    if (empty($billId) || empty($items)) {
        echo json_encode(['success' => false, 'message' => 'ข้อมูลบิลหรือสินค้าไม่ถูกต้อง']);
        exit;
    }

    $conn->begin_transaction();
    try {
        $stmtOldItems = $conn->prepare("SELECT product_id, qty FROM order_items WHERE order_id = ?");
        $stmtOldItems->bind_param("s", $billId);
        $stmtOldItems->execute();
        $oldItemsRes = $stmtOldItems->get_result();

        $stockRestoreStmt = $conn->prepare("UPDATE products SET stock_qty = stock_qty + ? WHERE id = ?");
        $checkParentStmt = $conn->prepare("SELECT parent_id, multiplier FROM products WHERE id = ?");

        if ($oldItemsRes) {
            while ($oldIt = $oldItemsRes->fetch_assoc()) {
                $pId = $oldIt['product_id'];
                $rQty = intval($oldIt['qty']);
                $targetId = $pId;

                $checkParentStmt->bind_param("s", $pId);
                $checkParentStmt->execute();
                $pRes = $checkParentStmt->get_result();
                if ($pRes && $pRow = $pRes->fetch_assoc()) {
                    if (!empty($pRow['parent_id'])) {
                        $targetId = $pRow['parent_id'];
                        $rQty = $rQty * (intval($pRow['multiplier']) > 0 ? intval($pRow['multiplier']) : 1);
                    }
                }

                $stockRestoreStmt->bind_param("is", $rQty, $targetId);
                $stockRestoreStmt->execute();
            }
        }

        $stmtOrder = $conn->prepare("UPDATE orders SET total = ?, received = ?, change_amount = ?, payment_method = ?, customer_name = ?, debt_note = ? WHERE id = ?");
        $stmtOrder->bind_param("dddssss", $total, $received, $change, $paymentMethod, $customerName, $debtNote, $billId);
        $stmtOrder->execute();

        $stmtDel = $conn->prepare("DELETE FROM order_items WHERE order_id = ?");
        $stmtDel->bind_param("s", $billId);
        $stmtDel->execute();

        $itemStmt = $conn->prepare("INSERT INTO order_items (order_id, product_id, product_name, cost_price, price, qty) VALUES (?, ?, ?, ?, ?, ?)");
        $stockDeductStmt = $conn->prepare("UPDATE products SET stock_qty = stock_qty - ? WHERE id = ?");

        foreach ($items as $item) {
            $pId = strval($item['id']);
            $pName = strval($item['name']);
            $pCost = floatval($item['cost_price'] ?? 0);
            $pPrice = floatval($item['price']);
            $pQty = intval($item['qty']);

            $itemStmt->bind_param("sssddi", $billId, $pId, $pName, $pCost, $pPrice, $pQty);
            $itemStmt->execute();

            $targetId = $pId;
            $dQty = $pQty;

            $checkParentStmt->bind_param("s", $pId);
            $checkParentStmt->execute();
            $pRes = $checkParentStmt->get_result();
            if ($pRes && $pRow = $pRes->fetch_assoc()) {
                if (!empty($pRow['parent_id'])) {
                    $targetId = $pRow['parent_id'];
                    $dQty = $pQty * (intval($pRow['multiplier']) > 0 ? intval($pRow['multiplier']) : 1);
                }
            }

            $stockDeductStmt->bind_param("is", $dQty, $targetId);
            $stockDeductStmt->execute();
        }

        $conn->commit();
        echo json_encode(['success' => true]);
    } catch (Exception $e) {
        $conn->rollback();
        echo json_encode(['success' => false, 'message' => 'เกิดข้อผิดพลาด: ' . $e->getMessage()]);
    }
    exit;
}

// 4. ยกเลิกบิล
if ($action === 'cancel_bill') {
    $billId = trim($_GET['id'] ?? '');

    if (empty($billId)) {
        echo json_encode(['success' => false, 'message' => 'ไม่พบรหัสบิล']);
        exit;
    }

    $conn->begin_transaction();
    try {
        $stmtItems = $conn->prepare("SELECT product_id, qty FROM order_items WHERE order_id = ?");
        $stmtItems->bind_param("s", $billId);
        $stmtItems->execute();
        $itemsRes = $stmtItems->get_result();

        $stockRestoreStmt = $conn->prepare("UPDATE products SET stock_qty = stock_qty + ? WHERE id = ?");
        $checkParentStmt = $conn->prepare("SELECT parent_id, multiplier FROM products WHERE id = ?");

        if ($itemsRes) {
            while ($it = $itemsRes->fetch_assoc()) {
                $pId = $it['product_id'];
                $rQty = intval($it['qty']);
                $targetId = $pId;

                $checkParentStmt->bind_param("s", $pId);
                $checkParentStmt->execute();
                $pRes = $checkParentStmt->get_result();
                if ($pRes && $pRow = $pRes->fetch_assoc()) {
                    if (!empty($pRow['parent_id'])) {
                        $targetId = $pRow['parent_id'];
                        $rQty = $rQty * (intval($pRow['multiplier']) > 0 ? intval($pRow['multiplier']) : 1);
                    }
                }

                $stockRestoreStmt->bind_param("is", $rQty, $targetId);
                $stockRestoreStmt->execute();
            }
        }

        $stmtDelItems = $conn->prepare("DELETE FROM order_items WHERE order_id = ?");
        $stmtDelItems->bind_param("s", $billId);
        $stmtDelItems->execute();

        $stmtDelOrder = $conn->prepare("DELETE FROM orders WHERE id = ?");
        $stmtDelOrder->bind_param("s", $billId);
        $stmtDelOrder->execute();

        $conn->commit();
        echo json_encode(['success' => true]);
    } catch (Exception $e) {
        $conn->rollback();
        echo json_encode(['success' => false, 'message' => 'เกิดข้อผิดพลาด: ' . $e->getMessage()]);
    }
    exit;
}
?>