<?php
header('Content-Type: application/json');
require_once 'db.php';

// สร้างคอลัมน์อัตโนมัติทันที ป้องกัน SQL Error
try { $conn->exec("ALTER TABLE products ADD COLUMN is_no_barcode TINYINT DEFAULT 0"); } catch (Exception $e) {}
try { $conn->exec("ALTER TABLE products ADD COLUMN cost_price DECIMAL(10,2) DEFAULT 0.00"); } catch (Exception $e) {}
try { $conn->exec("ALTER TABLE products ADD COLUMN stock_qty INT DEFAULT 0"); } catch (Exception $e) {}
try { $conn->exec("ALTER TABLE products ADD COLUMN parent_id VARCHAR(50) DEFAULT NULL"); } catch (Exception $e) {}
try { $conn->exec("ALTER TABLE products ADD COLUMN multiplier INT DEFAULT 1"); } catch (Exception $e) {}
try { $conn->exec("ALTER TABLE products ADD COLUMN min_stock INT NOT NULL DEFAULT 5"); } catch (Exception $e) {} // ⭐️ เพิ่มบรรทัดนี้
try { $conn->exec("ALTER TABLE products ADD COLUMN max_stock INT NOT NULL DEFAULT 20"); } catch (Exception $e) {} // ⭐️ เพิ่มบรรทัดนี้
try { $conn->exec("ALTER TABLE categories ADD COLUMN sort_order INT DEFAULT 0"); } catch (Exception $e) {}

$action = $_GET['action'] ?? '';

// 1. ดึงหมวดหมู่ทั้งหมด
if ($action === 'get_categories') {
    $stmt = $conn->prepare("SELECT * FROM categories ORDER BY sort_order ASC, id ASC");
    $stmt->execute();
    echo json_encode($stmt->fetchAll(PDO::FETCH_ASSOC));
    exit;
}

// 2. เพิ่มหมวดหมู่ใหม่
if ($action === 'add_category' && $_SERVER['REQUEST_METHOD'] === 'POST') {
    $labelName = trim($_POST['label_name'] ?? '');
    if (empty($labelName)) {
        echo json_encode(['success' => false, 'message' => 'กรุณากรอกชื่อหมวดหมู่']);
        exit;
    }
    $keyName = 'cat_' . time();
    $stmt = $conn->prepare("INSERT INTO categories (key_name, label_name) VALUES (?, ?)");
    $result = $stmt->execute([$keyName, $labelName]);
    echo json_encode(['success' => $result, 'key_name' => $keyName, 'label_name' => $labelName]);
    exit;
}

// 3. แก้ไขชื่อหมวดหมู่
if ($action === 'update_category' && $_SERVER['REQUEST_METHOD'] === 'POST') {
    $stmt = $conn->prepare("UPDATE categories SET label_name = ? WHERE key_name = ?");
    $result = $stmt->execute([trim($_POST['label_name'] ?? ''), trim($_POST['key_name'] ?? '')]);
    echo json_encode(['success' => $result]);
    exit;
}

// 4. ลบหมวดหมู่
if ($action === 'delete_category' && $_SERVER['REQUEST_METHOD'] === 'POST') {
    $stmt = $conn->prepare("DELETE FROM categories WHERE key_name = ?");
    $result = $stmt->execute([trim($_POST['key_name'] ?? '')]);
    echo json_encode(['success' => $result]);
    exit;
}

// 5. ดึงสินค้าทั้งหมด
if ($action === 'get_all') {
    $stmt = $conn->prepare("SELECT * FROM products ORDER BY created_at DESC");
    $stmt->execute();
    echo json_encode($stmt->fetchAll(PDO::FETCH_ASSOC));
    exit;
}

// 6. เพิ่มสินค้าใหม่
if ($action === 'add' && $_SERVER['REQUEST_METHOD'] === 'POST') {
    try {
        $id = trim($_POST['id'] ?? '');
        $name = trim($_POST['name'] ?? '');
        $costPrice = floatval($_POST['cost_price'] ?? 0);
        $price = floatval($_POST['price'] ?? 0);
        $stockQty = intval($_POST['stock_qty'] ?? 0);
        $category = trim($_POST['category'] ?? '');
        $unit = trim($_POST['unit'] ?? 'ชิ้น');
        $isNoBarcode = intval($_POST['is_no_barcode'] ?? 0);
        $parentId = !empty($_POST['parent_id']) ? trim($_POST['parent_id']) : null;
        $multiplier = intval($_POST['multiplier'] ?? 1);
        $minStock = intval($_POST['min_stock'] ?? 5);   // ⭐️ เพิ่ม
        $maxStock = intval($_POST['max_stock'] ?? 20);  // ⭐️ เพิ่ม
        if ($multiplier <= 0) $multiplier = 1;
        if (empty($unit)) $unit = 'ชิ้น';
        
        $img = trim($_POST['existing_img'] ?? 'images/placeholder.jpg');
        if (empty($img)) $img = 'images/placeholder.jpg';

        $check = $conn->prepare("SELECT id FROM products WHERE id = ?");
        $check->execute([$id]);
        if ($check->fetch()) {
            echo json_encode(['success' => false, 'message' => 'รหัสบาร์โค้ดนี้มีอยู่ในระบบแล้ว']);
            exit;
        }

        if (isset($_FILES['file']) && $_FILES['file']['error'] === UPLOAD_ERR_OK) {
            $targetDir = "images/";
            if (!file_exists($targetDir)) mkdir($targetDir, 0777, true);
            $fileName = time() . '_' . preg_replace("/[^a-zA-Z0-9\._-]/", "", basename($_FILES["file"]["name"]));
            $targetFilePath = $targetDir . $fileName;
            if (move_uploaded_file($_FILES["file"]["tmp_name"], $targetFilePath)) {
                $img = $targetFilePath;
            }
        }

        // ⭐️ เพิ่ม min_stock, max_stock ในคำสั่ง INSERT
        $stmt = $conn->prepare("INSERT INTO products (id, name, cost_price, price, stock_qty, category, unit, is_no_barcode, img, parent_id, multiplier, min_stock, max_stock) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
        $result = $stmt->execute([$id, $name, $costPrice, $price, $stockQty, $category, $unit, $isNoBarcode, $img, $parentId, $multiplier, $minStock, $maxStock]);
        echo json_encode(['success' => $result]);
    } catch (Exception $e) {
        echo json_encode(['success' => false, 'message' => 'เกิดข้อผิดพลาด: ' . $e->getMessage()]);
    }
    exit;
}

// 7. แก้ไขสินค้า
if ($action === 'update' && $_SERVER['REQUEST_METHOD'] === 'POST') {
    try {
        $originalId = trim($_POST['original_id'] ?? '');
        $id = trim($_POST['id'] ?? '');
        $name = trim($_POST['name'] ?? '');
        $costPrice = floatval($_POST['cost_price'] ?? 0);
        $price = floatval($_POST['price'] ?? 0);
        $stockQty = intval($_POST['stock_qty'] ?? 0);
        $category = trim($_POST['category'] ?? '');
        $unit = trim($_POST['unit'] ?? 'ชิ้น');
        $isNoBarcode = intval($_POST['is_no_barcode'] ?? 0);
        $parentId = !empty($_POST['parent_id']) ? trim($_POST['parent_id']) : null;
        $multiplier = intval($_POST['multiplier'] ?? 1);
        $minStock = intval($_POST['min_stock'] ?? 5);   // ⭐️ รับค่า min_stock
        $maxStock = intval($_POST['max_stock'] ?? 20);  // ⭐️ รับค่า max_stock
        
        if ($multiplier <= 0) $multiplier = 1;
        if (empty($unit)) $unit = 'ชิ้น';
        $isImageRemoved = ($_POST['is_image_removed'] ?? '') === 'true';
    
        $stmtImg = $conn->prepare("SELECT img FROM products WHERE id = ?");
        $stmtImg->execute([$originalId]);
        $oldProduct = $stmtImg->fetch();
        $img = $oldProduct['img'] ?? 'images/placeholder.jpg';

        if ($isImageRemoved) $img = 'images/placeholder.jpg';

        if (isset($_FILES['file']) && $_FILES['file']['error'] === UPLOAD_ERR_OK) {
            $targetDir = "images/";
            if (!file_exists($targetDir)) mkdir($targetDir, 0777, true);
            $fileName = time() . '_' . preg_replace("/[^a-zA-Z0-9\._-]/", "", basename($_FILES["file"]["name"]));
            $targetFilePath = $targetDir . $fileName;
            if (move_uploaded_file($_FILES["file"]["tmp_name"], $targetFilePath)) {
                $img = $targetFilePath;
            }
        }

        // ⭐️ เพิ่ม min_stock = ?, max_stock = ? ลงใน SQL UPDATE ⭐️
        $stmt = $conn->prepare("UPDATE products SET id = ?, name = ?, cost_price = ?, price = ?, stock_qty = ?, category = ?, unit = ?, is_no_barcode = ?, img = ?, parent_id = ?, multiplier = ?, min_stock = ?, max_stock = ? WHERE id = ?");
        $result = $stmt->execute([$id, $name, $costPrice, $price, $stockQty, $category, $unit, $isNoBarcode, $img, $parentId, $multiplier, $minStock, $maxStock, $originalId]);
        echo json_encode(['success' => $result]);
    } catch (Exception $e) {
        echo json_encode(['success' => false, 'message' => 'เกิดข้อผิดพลาด: ' . $e->getMessage()]);
    }
    exit;
}

// 8. ลบสินค้า
if ($action === 'delete' && $_SERVER['REQUEST_METHOD'] === 'POST') {
    $stmt = $conn->prepare("DELETE FROM products WHERE id = ?");
    $result = $stmt->execute([trim($_POST['id'] ?? '')]);
    echo json_encode(['success' => $result]);
    exit;
}

// 9. บันทึกลำดับหมวดหมู่
if ($action === 'save_categories_order' && $_SERVER['REQUEST_METHOD'] === 'POST') {
    $categoriesList = json_decode($_POST['categories'] ?? '[]', true);
    if (is_array($categoriesList)) {
        foreach ($categoriesList as $index => $cat) {
            $stmt = $conn->prepare("UPDATE categories SET sort_order = ? WHERE key_name = ?");
            $stmt->execute([$index, $cat['key_name'] ?? '']);
        }
        echo json_encode(['success' => true]);
    } else {
        echo json_encode(['success' => false]);
    }
    exit;
}

// 10. รับสินค้าเข้าสต็อก (+สต็อกด่วน คำนวณแพ็ค/ลังให้อัตโนมัติ)
if ($action === 'stock_in' && $_SERVER['REQUEST_METHOD'] === 'POST') {
    try {
        $id = trim($_POST['id'] ?? '');
        $qty = intval($_POST['qty'] ?? 0);

        if (empty($id) || $qty <= 0) {
            echo json_encode(['success' => false, 'message' => 'กรุณาระบุสินค้าและจำนวนที่ถูกต้อง']);
            exit;
        }

        // ตรวจสอบสินค้าว่าเป็นตัวเดี่ยวหรือตัวแพ็ค
        $stmt = $conn->prepare("SELECT id, name, stock_qty, unit, parent_id, multiplier FROM products WHERE id = ?");
        $stmt->execute([$id]);
        $prod = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$prod) {
            echo json_encode(['success' => false, 'message' => 'ไม่พบข้อมูลสินค้า']);
            exit;
        }

        $targetId = $prod['id'];
        $targetName = $prod['name'];
        $targetUnit = $prod['unit'] ?? 'ชิ้น';
        $multiplier = intval($prod['multiplier'] ?? 1);
        if ($multiplier <= 0) $multiplier = 1;

        $actualAddQty = $qty;

        // ถ้าเป็นสินค้าแพ็ค/ลัง ให้คำนวณจำนวนชิ้นแล้ววิ่งไปบวกให้ตัวแม่
        if (!empty($prod['parent_id'])) {
            $targetId = $prod['parent_id'];
            $actualAddQty = $qty * $multiplier;

            $stmtParent = $conn->prepare("SELECT name, stock_qty, unit FROM products WHERE id = ?");
            $stmtParent->execute([$targetId]);
            $parent = $stmtParent->fetch(PDO::FETCH_ASSOC);

            if ($parent) {
                $targetName = $parent['name'];
                $targetUnit = $parent['unit'] ?? 'ชิ้น';
            }
        }

        $updateStmt = $conn->prepare("UPDATE products SET stock_qty = stock_qty + ? WHERE id = ?");
        $result = $updateStmt->execute([$actualAddQty, $targetId]);

        echo json_encode([
            'success' => $result,
            'target_name' => $targetName,
            'added_qty' => $actualAddQty,
            'unit' => $targetUnit
        ]);
    } catch (Exception $e) {
        echo json_encode(['success' => false, 'message' => 'เกิดข้อผิดพลาด: ' . $e->getMessage()]);
    }
    exit;
}
?>
