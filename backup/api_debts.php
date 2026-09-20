<?php
header('Content-Type: application/json; charset=utf-8');
date_default_timezone_set('Asia/Bangkok');

$conn = new mysqli('127.0.0.1', 'root', '', 'pos_db');
$conn->set_charset("utf8mb4");

if ($conn->connect_error) {
    echo json_encode(['success' => false, 'message' => 'เชื่อมต่อฐานข้อมูลไม่สำเร็จ: ' . $conn->connect_error]);
    exit;
}

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

// 1. ดึงรายชื่อลูกหนี้และสรุปยอดหนี้สะสม
if ($action === 'get_debtors') {
    $sqlOrders = "
        SELECT customer_name, SUM(total) as total_debt, COUNT(id) as bill_count, MAX(created_at) as last_date
        FROM orders 
        WHERE payment_method = 'debt' AND customer_name != ''
        GROUP BY customer_name
    ";
    $resOrders = $conn->query($sqlOrders);
    
    $sqlPayments = "
        SELECT customer_name, SUM(amount) as total_paid
        FROM debt_payments
        GROUP BY customer_name
    ";
    $resPayments = $conn->query($sqlPayments);
    $paidMap = [];
    if ($resPayments) {
        while ($row = $resPayments->fetch_assoc()) {
            $paidMap[$row['customer_name']] = floatval($row['total_paid']);
        }
    }

    $debtors = [];
    if ($resOrders) {
        while ($row = $resOrders->fetch_assoc()) {
            $name = $row['customer_name'];
            $totalDebt = floatval($row['total_debt']);
            $totalPaid = $paidMap[$name] ?? 0.0;
            $remaining = max(0, $totalDebt - $totalPaid);

            $debtors[] = [
                'customer_name' => $name,
                'total_debt' => $totalDebt,
                'total_paid' => $totalPaid,
                'remaining' => $remaining,
                'bill_count' => intval($row['bill_count']),
                'last_date' => $row['last_date']
            ];
        }
    }

    echo json_encode($debtors);
    exit;
}

// 2. ดึงประวัติบิลที่ติดเงินและประวัติการจ่ายเงิน
if ($action === 'get_customer_detail') {
    $name = trim($_GET['customer_name'] ?? '');
    if (empty($name)) {
        echo json_encode(['success' => false, 'message' => 'ไม่พบชื่อลูกค้า']);
        exit;
    }

    $stmt = $conn->prepare("SELECT id, total, received, payment_method, debt_note, created_at FROM orders WHERE payment_method = 'debt' AND customer_name = ? ORDER BY created_at DESC");
    $stmt->bind_param("s", $name);
    $stmt->execute();
    $billsRes = $stmt->get_result();

    $stmtItems = $conn->prepare("SELECT product_name as name, price, qty FROM order_items WHERE order_id = ?");

    $bills = [];
    while ($b = $billsRes->fetch_assoc()) {
        $orderId = $b['id'];
        
        $stmtItems->bind_param("s", $orderId);
        $stmtItems->execute();
        $itemsRes = $stmtItems->get_result();
        
        $items = [];
        while ($item = $itemsRes->fetch_assoc()) {
            $items[] = [
                'name' => $item['name'],
                'price' => floatval($item['price']),
                'qty' => intval($item['qty'])
            ];
        }
        $bills[] = [
            'id' => $b['id'],
            'total' => floatval($b['total']),
            'received' => floatval($b['received']),
            'debt_note' => $b['debt_note'] ?? '',
            'created_at' => $b['created_at'],
            'items' => $items
        ];
    }

    $stmtPay = $conn->prepare("SELECT id, amount, payment_method, created_at FROM debt_payments WHERE customer_name = ? ORDER BY created_at DESC");
    $stmtPay->bind_param("s", $name);
    $stmtPay->execute();
    $payRes = $stmtPay->get_result();

    $payments = [];
    while ($p = $payRes->fetch_assoc()) {
        $payments[] = [
            'id' => $p['id'],
            'amount' => floatval($p['amount']),
            'payment_method' => $p['payment_method'],
            'created_at' => $p['created_at']
        ];
    }

    echo json_encode([
        'success' => true,
        'customer_name' => $name,
        'bills' => $bills,
        'payments' => $payments
    ]);
    exit;
}

// 3. รับชำระหนี้ และนำยอดไปตัดบิลเดิมอัตโนมัติ (FIFO)
if ($action === 'pay_debt' && $_SERVER['REQUEST_METHOD'] === 'POST') {
    $customerName = trim($_POST['customer_name'] ?? '');
    $amount = floatval($_POST['amount'] ?? 0);
    $method = trim($_POST['payment_method'] ?? 'cash');
    $billId = trim($_POST['bill_id'] ?? ''); // ⭐️ รับรหัสบิลเจาะจง (ถ้ามี)

    if (empty($customerName) || $amount <= 0) {
        echo json_encode(['success' => false, 'message' => 'ข้อมูลการชำระเงินไม่ถูกต้อง']);
        exit;
    }

    $conn->begin_transaction();
    try {
        // 3.1 บันทึกประวัติลง debt_payments
        $stmt = $conn->prepare("INSERT INTO debt_payments (customer_name, amount, payment_method, created_at) VALUES (?, ?, ?, NOW())");
        $stmt->bind_param("sds", $customerName, $amount, $method);
        $stmt->execute();

        // 3.2 ตัดยอดหนี้
        if (!empty($billId)) {
            // กรณีจ่ายระบุบิล: ตัดเข้าบิลนี้โดยตรง (ไม่เกินยอดบิล)
            $stmtBill = $conn->prepare("UPDATE orders SET received = LEAST(total, received + ?) WHERE id = ?");
            $stmtBill->bind_param("ds", $amount, $billId);
            $stmtBill->execute();
        } else {
            // กรณีจ่ายรวม: ไล่ตัดบิลเก่าตามลำดับ (FIFO)
            $stmtBills = $conn->prepare("SELECT id, total, received FROM orders WHERE payment_method = 'debt' AND customer_name = ? ORDER BY created_at ASC");
            $stmtBills->bind_param("s", $customerName);
            $stmtBills->execute();
            $resBills = $stmtBills->get_result();

            $remainingMoney = $amount;
            $stmtUpdateBill = $conn->prepare("UPDATE orders SET received = ? WHERE id = ?");

            while ($bill = $resBills->fetch_assoc()) {
                if ($remainingMoney <= 0) break;

                $bId = $bill['id'];
                $bTotal = floatval($bill['total']);
                $bReceived = floatval($bill['received']);
                $bNeed = $bTotal - $bReceived;

                if ($bNeed > 0) {
                    if ($remainingMoney >= $bNeed) {
                        $newReceived = $bTotal;
                        $remainingMoney -= $bNeed;
                    } else {
                        $newReceived = $bReceived + $remainingMoney;
                        $remainingMoney = 0;
                    }
                    $stmtUpdateBill->bind_param("ds", $newReceived, $bId);
                    $stmtUpdateBill->execute();
                }
            }
        }

        $conn->commit();
        echo json_encode(['success' => true]);
    } catch (Exception $e) {
        $conn->rollback();
        echo json_encode(['success' => false, 'message' => 'เกิดข้อผิดพลาด: ' . $e->getMessage()]);
    }
    exit;
}
?>