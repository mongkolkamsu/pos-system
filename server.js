const express = require('express');
const cors = require('cors');
const path = require('path');
const multer = require('multer');
const fs = require('fs');
const db = require('./config/db');
const https = require('https');

const app = express();
const PORT = 3000;

let recentPayments = []; // บันทึกประวัติเงินเข้า 2 นาที ป้องกันเน็ตดีเลย์
let activePaymentSession = null;

// Middleware
app.use(cors());

// ========================================================
// 🔔 1. Webhook ดักรับแจ้งเตือนเงินเข้า (วางก่อน express.json)
// ========================================================
app.post('/api/webhook/payment', express.text({ type: '*/*' }), (req, res) => {
    let rawText = '';
    
    if (typeof req.body === 'string') {
        try {
            const parsed = JSON.parse(req.body);
            rawText = parsed.notification || req.body;
        } catch (e) {
            rawText = req.body;
        }
    } else if (req.body && req.body.notification) {
        rawText = req.body.notification;
    }

    console.log('🔔 ข้อความแจ้งเตือนที่ได้รับ:\n', rawText);

    // ดักจับตัวเลขยอดเงิน (รองรับ 1.00, 3.00, 100.50)
    const match = rawText.match(/(?:ได้รับเงิน|ยอดเงิน|รับเงิน|จำนวน)?\s*([0-9,]+(?:\.[0-9]{1,2})?)\s*(?:บาท|THB|บ\.)/i) ||
                  rawText.match(/([0-9,]+\.[0-9]{2})/i);

    if (match) {
        const receivedAmount = parseFloat(match[1].replace(/,/g, ''));
        const now = Date.now();
        
        // บันทึกยอดเงินเข้าบัฟเฟอร์
        recentPayments.push({ amount: receivedAmount, timestamp: now });
        recentPayments = recentPayments.filter(p => (now - p.timestamp) < 120000); // เก็บไว้ 2 นาที

        if (activePaymentSession && activePaymentSession.status === 'WAITING') {
            if (Math.abs(receivedAmount - activePaymentSession.total) < 0.01) {
                console.log(`✅ ยอดเงินตรงกัน: ฿${receivedAmount} (สั่งปิดบิลทันที)`);
                activePaymentSession.status = 'PAID';
            }
        }
    }
    res.json({ success: true });
});

// ========================================================
// ⚙️ 2. Middleware ทั่วไป, Static Files และระบบ Upload
// ========================================================
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ⚡ 1. สร้างตัวแปรบอกตำแหน่งโฟลเดอร์เก็บรูปถาวรภายนอก
const UPLOAD_DIR = 'C:\\POS_System\\images';

// ถ้ายังไม่มีโฟลเดอร์นี้ในเครื่อง ให้ Windows สร้างขึ้นมาอัตโนมัติ
if (!fs.existsSync(UPLOAD_DIR)) {
    fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

app.use(express.static(path.join(__dirname, 'public')));

// 🟢 เพิ่มบรรทัดนี้: ให้ดึงรูปสินค้าจริงจาก ProgramData ก่อน
app.use('/images', express.static(UPLOAD_DIR));

// 🟢 บรรทัดเดิม: ถ้าไม่เจอ ค่อยมาดึงรูปตั้งต้น (placeholder) ในโฟลเดอร์โปรแกรม
app.use('/images', express.static(path.join(__dirname, 'public', 'images')));

// ⚡ 3. เวลากดเพิ่มสินค้า ให้เซฟไฟล์รูปภาพลงที่ C:\ProgramData
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, UPLOAD_DIR);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, 'prod_' + uniqueSuffix + path.extname(file.originalname));
    }
});
const upload = multer({ storage: storage });

// ========================================================
// 🔔 3. ระบบควบคุม Session การชำระเงิน
// ========================================================

// หน้าเว็บแจ้งว่ากำลังเปิดหน้ารอรับเงินยอดนี้
app.post('/api/payment/start-wait', (req, res) => {
    const total = parseFloat(req.body.total) || 0;
    const now = Date.now();
    
    // ตรวจสอบว่ามียอดเงินโอนเข้ามาก่อนหน้านี้ไม่เกิน 2 นาทีหรือไม่
    const matchedRecent = recentPayments.find(p => Math.abs(p.amount - total) < 0.01 && (now - p.timestamp) < 120000);

    activePaymentSession = {
        total: total,
        timestamp: now,
        status: matchedRecent ? 'PAID' : 'WAITING'
    };

    if (matchedRecent) {
        console.log(`⚡ เจอยอดเงิน ฿${total} ที่โอนเข้ามาก่อนแล้ว! สั่งปิดบิลทันที`);
    }

    res.json({ success: true });
});

// ยกเลิกรอบิล (ป้องกัน Race Condition ไม่เคลียร์ session ที่เพิ่งเปิดไม่ถึง 1.5 วินาที)
app.post('/api/payment/cancel-wait', (req, res) => {
    if (activePaymentSession && (Date.now() - activePaymentSession.timestamp > 1500)) {
        activePaymentSession = null;
    }
    res.json({ success: true });
});

// หน้าเว็บยิงเช็กสถานะทุก 1 วินาที
app.get('/api/payment/check-status', (req, res) => {
    if (!activePaymentSession) {
        return res.json({ paid: false });
    }

    if (activePaymentSession.status === 'PAID') {
        activePaymentSession = null;
        return res.json({ paid: true });
    }

    const now = Date.now();
    const matchIndex = recentPayments.findIndex(p => 
        Math.abs(p.amount - activePaymentSession.total) < 0.01 && 
        (now - p.timestamp) < 120000
    );

    if (matchIndex !== -1) {
        recentPayments.splice(matchIndex, 1);
        activePaymentSession = null;
        return res.json({ paid: true });
    }

    res.json({ paid: false, waitingFor: activePaymentSession.total });
});

// ========================================================
// 📦 4. API จัดการสินค้า (Products)
// ========================================================
app.get('/api/products', async (req, res) => {
    try {
        const [rows] = await db.query('SELECT * FROM products ORDER BY id DESC');
        res.json(rows);
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

app.post('/api/products', upload.single('file'), async (req, res) => {
    try {
        const {
            id, name, cost_price, price, stock_qty, category,
            unit, is_no_barcode, parent_id, multiplier, min_stock, max_stock, existing_img
        } = req.body;

        const imgPath = req.file ? `images/${req.file.filename}` : (existing_img || 'images/placeholder.jpg');

        const sql = `
            INSERT INTO products 
            (id, name, cost_price, price, stock_qty, category, img, unit, is_no_barcode, parent_id, multiplier, min_stock, max_stock) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;
        await db.query(sql, [
            id, name, parseFloat(cost_price) || 0, parseFloat(price) || 0, parseInt(stock_qty) || 0,
            category, imgPath, unit || 'ชิ้น', is_no_barcode == '1' ? 1 : 0,
            parent_id || null, parseInt(multiplier) || 1, parseInt(min_stock) || 5, parseInt(max_stock) || 20
        ]);

        res.json({ success: true, message: 'เพิ่มสินค้าสำเร็จ' });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

app.post('/api/products/update', upload.single('file'), async (req, res) => {
    try {
        const {
            original_id, id, name, cost_price, price, stock_qty, category,
            unit, is_no_barcode, parent_id, multiplier, min_stock, max_stock, is_image_removed
        } = req.body;

        let sql = `
            UPDATE products SET 
            id = ?, name = ?, cost_price = ?, price = ?, stock_qty = ?, category = ?, 
            unit = ?, is_no_barcode = ?, parent_id = ?, multiplier = ?, min_stock = ?, max_stock = ?
        `;
        const params = [
            id, name, parseFloat(cost_price) || 0, parseFloat(price) || 0, parseInt(stock_qty) || 0,
            category, unit || 'ชิ้น', is_no_barcode == '1' ? 1 : 0,
            parent_id || null, parseInt(multiplier) || 1, parseInt(min_stock) || 5, parseInt(max_stock) || 20
        ];

        if (req.file) {
            sql += `, img = ?`;
            params.push(`images/${req.file.filename}`);
        } else if (is_image_removed === 'true') {
            sql += `, img = 'images/placeholder.jpg'`;
        }

        sql += ` WHERE id = ?`;
        params.push(original_id);

        await db.query(sql, params);
        res.json({ success: true, message: 'แก้ไขสินค้าสำเร็จ' });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

app.post('/api/products/delete', async (req, res) => {
    try {
        const { id } = req.body;
        await db.query('DELETE FROM products WHERE id = ?', [id]);
        res.json({ success: true, message: 'ลบสินค้าสำเร็จ' });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

app.post('/api/products/stock-in', async (req, res) => {
    try {
        const { id, qty } = req.body;
        const addQty = parseInt(qty) || 0;

        const [products] = await db.query('SELECT * FROM products WHERE id = ?', [id]);
        if (products.length === 0) {
            return res.status(404).json({ success: false, message: 'ไม่พบสินค้า' });
        }

        const product = products[0];
        let targetId = product.id;
        let targetName = product.name;
        let targetUnit = product.unit || 'ชิ้น';
        let totalAdd = addQty;

        if (product.parent_id && product.parent_id.trim() !== '' && product.parent_id !== 'null') {
            const [parents] = await db.query('SELECT * FROM products WHERE id = ?', [product.parent_id]);
            if (parents.length > 0) {
                targetId = parents[0].id;
                targetName = parents[0].name;
                targetUnit = parents[0].unit || 'ชิ้น';
                totalAdd = addQty * (parseInt(product.multiplier) || 1);
            }
        }

        await db.query('UPDATE products SET stock_qty = stock_qty + ? WHERE id = ?', [totalAdd, targetId]);
        res.json({ success: true, target_name: targetName, added_qty: totalAdd, unit: targetUnit });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// 📦 API ปรับสต็อกสำหรับระบบพักบิล (qty เป็นลบ = ตัดสต็อก / qty เป็นบวก = คืนสต็อก)
app.post('/api/products/stock-adjust', async (req, res) => {
    try {
        const { id, qty } = req.body;
        const changeQty = parseInt(qty, 10);
        if (!id || isNaN(changeQty)) {
            return res.status(400).json({ success: false, message: 'ข้อมูลไม่ถูกต้อง' });
        }

        const [products] = await db.query('SELECT * FROM products WHERE id = ?', [id]);
        if (products.length === 0) {
            return res.status(404).json({ success: false, message: 'ไม่พบสินค้า' });
        }

        const product = products[0];
        let targetId = product.id;
        let totalChange = changeQty;

        // ถ้าเป็นสินค้าแพ็ค/ลัง ให้ไปตัดหรือคืนที่ตัวแม่
        if (product.parent_id && product.parent_id.trim() !== '' && product.parent_id !== 'null') {
            const [parents] = await db.query('SELECT * FROM products WHERE id = ?', [product.parent_id]);
            if (parents.length > 0) {
                targetId = parents[0].id;
                totalChange = changeQty * (parseInt(product.multiplier, 10) || 1);
            }
        }

        // อัปเดตสต็อก (+ changeQty: ถ้าส่งค่าลบมาจะกลายเป็นการหักลบอัตโนมัติ)
        await db.query('UPDATE products SET stock_qty = stock_qty + ? WHERE id = ?', [totalChange, targetId]);
        res.json({ success: true });
    } catch (err) {
        console.error('Stock Adjust Error:', err);
        res.status(500).json({ success: false, message: err.message });
    }
});
// ========================================================
// 🏷️ 5. API จัดการหมวดหมู่ (Categories)
// ========================================================
app.get('/api/categories', async (req, res) => {
    try {
        const [rows] = await db.query('SELECT * FROM categories ORDER BY sort_order ASC, id ASC');
        res.json(rows);
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

app.post('/api/categories', async (req, res) => {
    try {
        const { label_name } = req.body;
        const key_name = 'cat_' + Date.now();
        await db.query('INSERT INTO categories (key_name, label_name) VALUES (?, ?)', [key_name, label_name]);
        res.json({ success: true, key_name, label_name });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

app.post('/api/categories/update', async (req, res) => {
    try {
        const { key_name, label_name } = req.body;
        await db.query('UPDATE categories SET label_name = ? WHERE key_name = ?', [label_name, key_name]);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

app.post('/api/categories/delete', async (req, res) => {
    try {
        const { key_name } = req.body;
        await db.query('DELETE FROM categories WHERE key_name = ?', [key_name]);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

app.post('/api/categories/order', async (req, res) => {
    try {
        const { categories } = req.body;
        if (Array.isArray(categories)) {
            for (let i = 0; i < categories.length; i++) {
                await db.query('UPDATE categories SET sort_order = ? WHERE key_name = ?', [i, categories[i].key_name]);
            }
        }
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// ========================================================
// 🧾 6. API บันทึกการขาย & ประวัติบิล
// ========================================================
app.post('/api/sales', async (req, res) => {
    const conn = await db.getConnection();
    try {
        await conn.beginTransaction();
        const { items, total, received, change, payment_method, customer_name, debt_note } = req.body;

        const today = new Date().toISOString().slice(0, 10).replace(/-/g, '');
        const prefix = `TX${today}-`;
        const [lastOrder] = await conn.query('SELECT id FROM orders WHERE id LIKE ? ORDER BY id DESC LIMIT 1', [`${prefix}%`]);

        let newNum = 1;
        if (lastOrder.length > 0) {
            const lastIdStr = lastOrder[0].id;
            const parts = lastIdStr.split('-');
            newNum = parseInt(parts[parts.length - 1]) + 1;
        }
        const orderId = prefix + String(newNum).padStart(4, '0');

        await conn.query(
            `INSERT INTO orders (id, total, received, change_amount, payment_method, customer_name, debt_note, created_at) 
             VALUES (?, ?, ?, ?, ?, ?, ?, NOW())`,
            [orderId, total, received, change, payment_method, customer_name || '', debt_note || '']
        );

        for (const item of items) {
            const qty = parseInt(item.qty) || 1;
            const cost = parseFloat(item.cost_price) || 0;
            const price = parseFloat(item.price) || 0;

            await conn.query(
                `INSERT INTO order_items (order_id, product_id, product_name, cost_price, price, qty) 
                 VALUES (?, ?, ?, ?, ?, ?)`,
                [orderId, item.id, item.name, cost, price, qty]
            );

            // ⚡ ถ้าชิ้นนี้ถูกตัดสต็อกไปแล้วตั้งแต่ตอนพักบิล (is_held_deducted) ไม่ต้องตัดสต็อกซ้ำ!
            if (!item.is_held_deducted) {
                const [prodCheck] = await conn.query('SELECT parent_id, multiplier FROM products WHERE id = ?', [item.id]);
                let targetStockId = item.id;
                let deductQty = qty;

                if (prodCheck.length > 0 && prodCheck[0].parent_id) {
                    targetStockId = prodCheck[0].parent_id;
                    deductQty = qty * (parseInt(prodCheck[0].multiplier) || 1);
                }

                await conn.query('UPDATE products SET stock_qty = stock_qty - ? WHERE id = ?', [deductQty, targetStockId]);
            }
        }

        await conn.commit();
        res.json({ success: true, order_id: orderId });
    } catch (err) {
        await conn.rollback();
        res.status(500).json({ success: false, message: err.message });
    } finally {
        conn.release();
    }
});

app.get('/api/sales/history', async (req, res) => {
    try {
        const [orders] = await db.query('SELECT * FROM orders ORDER BY created_at DESC');

        for (let order of orders) {
            const [items] = await db.query(
                `SELECT oi.product_id as id, oi.product_name as name, 
                        COALESCE(NULLIF(oi.cost_price, 0), p.cost_price, 0) as cost_price, 
                        oi.price, oi.qty 
                 FROM order_items oi 
                 LEFT JOIN products p ON oi.product_id = p.id 
                 WHERE oi.order_id = ?`,
                [order.id]
            );
            order.items = items;
            order.timestamp = order.created_at;
            order.change = order.change_amount;
        }

        res.json(orders);
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

app.post('/api/sales/cancel-bill', async (req, res) => {
    const conn = await db.getConnection();
    try {
        await conn.beginTransaction();
        const { id } = req.body;

        const [items] = await conn.query('SELECT product_id, qty FROM order_items WHERE order_id = ?', [id]);
        for (const item of items) {
            const [prodCheck] = await conn.query('SELECT parent_id, multiplier FROM products WHERE id = ?', [item.product_id]);
            let targetStockId = item.product_id;
            let restoreQty = parseInt(item.qty);

            if (prodCheck.length > 0 && prodCheck[0].parent_id) {
                targetStockId = prodCheck[0].parent_id;
                restoreQty = restoreQty * (parseInt(prodCheck[0].multiplier) || 1);
            }

            await conn.query('UPDATE products SET stock_qty = stock_qty + ? WHERE id = ?', [restoreQty, targetStockId]);
        }

        await conn.query('DELETE FROM order_items WHERE order_id = ?', [id]);
        await conn.query('DELETE FROM orders WHERE id = ?', [id]);

        await conn.commit();
        res.json({ success: true });
    } catch (err) {
        await conn.rollback();
        res.status(500).json({ success: false, message: err.message });
    } finally {
        conn.release();
    }
});

app.post('/api/sales/update-bill', async (req, res) => {
    const conn = await db.getConnection();
    try {
        await conn.beginTransaction();
        const { id, total, received, change, payment_method, customer_name, items } = req.body;

        const [oldItems] = await conn.query('SELECT product_id, qty FROM order_items WHERE order_id = ?', [id]);
        for (const item of oldItems) {
            const [prodCheck] = await conn.query('SELECT parent_id, multiplier FROM products WHERE id = ?', [item.product_id]);
            let targetStockId = item.product_id;
            let restoreQty = parseInt(item.qty);
            if (prodCheck.length > 0 && prodCheck[0].parent_id) {
                targetStockId = prodCheck[0].parent_id;
                restoreQty = restoreQty * (parseInt(prodCheck[0].multiplier) || 1);
            }
            await conn.query('UPDATE products SET stock_qty = stock_qty + ? WHERE id = ?', [restoreQty, targetStockId]);
        }

        await conn.query('DELETE FROM order_items WHERE order_id = ?', [id]);
        await conn.query(
            `UPDATE orders SET total = ?, received = ?, change_amount = ?, payment_method = ?, customer_name = ? WHERE id = ?`,
            [total, received, change, payment_method, customer_name || '', id]
        );

        for (const item of items) {
            const qty = parseInt(item.qty) || 1;
            const cost = parseFloat(item.cost_price) || 0;
            const price = parseFloat(item.price) || 0;

            await conn.query(
                `INSERT INTO order_items (order_id, product_id, product_name, cost_price, price, qty) VALUES (?, ?, ?, ?, ?, ?)`,
                [id, item.id, item.name, cost, price, qty]
            );

            const [prodCheck] = await conn.query('SELECT parent_id, multiplier FROM products WHERE id = ?', [item.id]);
            let targetStockId = item.id;
            let deductQty = qty;
            if (prodCheck.length > 0 && prodCheck[0].parent_id) {
                targetStockId = prodCheck[0].parent_id;
                deductQty = qty * (parseInt(prodCheck[0].multiplier) || 1);
            }
            await conn.query('UPDATE products SET stock_qty = stock_qty - ? WHERE id = ?', [deductQty, targetStockId]);
        }

        await conn.commit();
        res.json({ success: true });
    } catch (err) {
        await conn.rollback();
        res.status(500).json({ success: false, message: err.message });
    } finally {
        conn.release();
    }
});

// ========================================================
// 📒 7. API สมุดลูกหนี้ (Debts)
// ========================================================
app.get('/api/debts/debtors', async (req, res) => {
    try {
        const [orders] = await db.query(`
            SELECT customer_name, SUM(total) as total_debt, COUNT(id) as bill_count, MAX(created_at) as last_date
            FROM orders 
            WHERE payment_method = 'debt' AND customer_name != ''
            GROUP BY customer_name
        `);

        const [payments] = await db.query(`
            SELECT customer_name, SUM(amount) as total_paid
            FROM debt_payments
            GROUP BY customer_name
        `);

        const paidMap = {};
        payments.forEach(p => { paidMap[p.customer_name] = parseFloat(p.total_paid) || 0; });

        const result = orders.map(row => {
            const name = row.customer_name;
            const totalDebt = parseFloat(row.total_debt) || 0;
            const totalPaid = paidMap[name] || 0;
            return {
                customer_name: name,
                total_debt: totalDebt,
                total_paid: totalPaid,
                remaining: Math.max(0, totalDebt - totalPaid),
                bill_count: parseInt(row.bill_count) || 0,
                last_date: row.last_date
            };
        });

        res.json(result);
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

app.get('/api/debts/customer-detail', async (req, res) => {
    try {
        const { customer_name } = req.query;

        const [bills] = await db.query(
            `SELECT id, total, received, payment_method, debt_note, created_at 
             FROM orders 
             WHERE customer_name = ? AND payment_method = 'debt' 
             ORDER BY created_at DESC`,
            [customer_name]
        );

        for (let b of bills) {
            const [items] = await db.query(
                `SELECT product_name as name, price, qty FROM order_items WHERE order_id = ?`,
                [b.id]
            );
            b.items = items;
        }

        const [payments] = await db.query(
            `SELECT id, amount, payment_method, created_at FROM debt_payments WHERE customer_name = ? ORDER BY created_at DESC`,
            [customer_name]
        );

        res.json({ success: true, customer_name, bills, payments });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

app.post('/api/debts/pay', async (req, res) => {
    const conn = await db.getConnection();
    try {
        await conn.beginTransaction();
        const { customer_name, amount, payment_method, bill_id } = req.body;
        const payAmount = parseFloat(amount) || 0;

        await conn.query(
            `INSERT INTO debt_payments (customer_name, amount, payment_method, created_at) VALUES (?, ?, ?, NOW())`,
            [customer_name, payAmount, payment_method]
        );

        if (bill_id) {
            await conn.query(`UPDATE orders SET received = LEAST(total, received + ?) WHERE id = ?`, [payAmount, bill_id]);
        } else {
            const [bills] = await conn.query(
                `SELECT id, total, received FROM orders WHERE payment_method = 'debt' AND customer_name = ? ORDER BY created_at ASC`,
                [customer_name]
            );

            let remainingMoney = payAmount;
            for (const bill of bills) {
                if (remainingMoney <= 0) break;
                const bTotal = parseFloat(bill.total);
                const bReceived = parseFloat(bill.received);
                const bNeed = bTotal - bReceived;

                if (bNeed > 0) {
                    if (remainingMoney >= bNeed) {
                        await conn.query('UPDATE orders SET received = ? WHERE id = ?', [bTotal, bill.id]);
                        remainingMoney -= bNeed;
                    } else {
                        await conn.query('UPDATE orders SET received = received + ? WHERE id = ?', [remainingMoney, bill.id]);
                        remainingMoney = 0;
                    }
                }
            }
        }

        await conn.commit();
        res.json({ success: true });
    } catch (err) {
        await conn.rollback();
        res.status(500).json({ success: false, message: err.message });
    } finally {
        conn.release();
    }
});

// ========================================================
// 🔊 8. API สังเคราะห์เสียงพูด (TTS)
// ========================================================
app.get('/api/tts', async (req, res) => {
    try {
        const text = req.query.text || 'เงินเข้าแล้ว';
        const googleUrl = `https://translate.google.com/translate_tts?ie=UTF-8&client=tw-ob&tl=th&q=${encodeURIComponent(text)}`;
        
        const response = await fetch(googleUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'
            }
        });

        const arrayBuffer = await response.arrayBuffer();
        res.set({
            'Content-Type': 'audio/mpeg',
            'Cache-Control': 'public, max-age=86400'
        });
        res.send(Buffer.from(arrayBuffer));
    } catch (err) {
        res.status(500).json({ error: 'TTS Failed' });
    }
});

// ========================================================
// 🚀 9. เริ่มต้นรัน HTTPS Server และ Auto-Init ฐานข้อมูล
// ========================================================
const keyPath = (process.resourcesPath && fs.existsSync(path.join(process.resourcesPath, 'key.pem')))
    ? path.join(process.resourcesPath, 'key.pem')
    : path.join(__dirname, 'key.pem');

const certPath = (process.resourcesPath && fs.existsSync(path.join(process.resourcesPath, 'cert.pem')))
    ? path.join(process.resourcesPath, 'cert.pem')
    : path.join(__dirname, 'cert.pem');

const sslOptions = {
    key: fs.readFileSync(keyPath),
    cert: fs.readFileSync(certPath)
};

// ฟังก์ชันตรวจสอบและนำเข้าฐานข้อมูลเริ่มต้นอัตโนมัติ
async function autoInitDatabase() {
    const mysql = require('mysql2/promise');
    try {
        const conn = await mysql.createConnection({
            host: '127.0.0.1',
            port: 3307,
            user: 'root',
            password: '',
            multipleStatements: true
        });

        // 1. สร้างฐานข้อมูล pos_db ถ้ายังไม่มี
        await conn.query('CREATE DATABASE IF NOT EXISTS pos_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci');
        await conn.query('USE pos_db');

        // 2. ตรวจสอบว่ามีตาราง products หรือยัง ถ้ายังไม่มี ให้นำเข้า pos_db.sql ทันที
        const [tables] = await conn.query("SHOW TABLES LIKE 'products'");
        if (tables.length === 0) {
            console.log('⚡ ตรวจพบฐานข้อมูลว่าง กำลังนำเข้า pos_db.sql อัตโนมัติ...');
            const sqlPath = (process.resourcesPath && fs.existsSync(path.join(process.resourcesPath, 'pos_db.sql')))
                ? path.join(process.resourcesPath, 'pos_db.sql')
                : path.join(__dirname, 'pos_db.sql');

            if (fs.existsSync(sqlPath)) {
                let sqlContent = fs.readFileSync(sqlPath, 'utf8');
                // ตัดอักขระพิเศษส่วนหัวไฟล์ (BOM) ป้องกัน Syntax Error บน Windows
                sqlContent = sqlContent.replace(/^\uFEFF/, '');
                await conn.query(sqlContent);
                console.log('✅ นำเข้าข้อมูลสินค้าเริ่มต้นเรียบร้อยแล้ว!');
            } else {
                console.error('❌ ไม่พบไฟล์ pos_db.sql ที่:', sqlPath);
            }
        } else {
            console.log('✅ ฐานข้อมูลมีตาราง products อยู่แล้ว');
        }
        await conn.end();
    } catch (err) {
        console.error('⚠️ ระบบ Auto-Init DB แจ้งเตือน:', err.message);
    }
}

// ========================================================
// 💾 ระบบสำรองข้อมูลอัตโนมัติ (Auto-Backup ย้อนหลัง 30 วัน)
// ========================================================
const BACKUP_DIR = 'C:\\POS_System\\backups';
const RETENTION_DAYS = 30; // เก็บย้อนหลังสูงสุด 30 วัน

// 1. ตรวจสอบและสร้างโฟลเดอร์ backups ถ้ายังไม่มี
if (!fs.existsSync(BACKUP_DIR)) {
    fs.mkdirSync(BACKUP_DIR, { recursive: true });
}

// 2. ฟังก์ชันลบไฟล์สำรองที่เก่าเกิน 30 วันทิ้งอัตโนมัติ
function cleanOldBackups() {
    try {
        const files = fs.readdirSync(BACKUP_DIR);
        const now = Date.now();
        const maxAgeMs = RETENTION_DAYS * 24 * 60 * 60 * 1000;

        files.forEach(file => {
            if (file.endsWith('.sql')) {
                const filePath = path.join(BACKUP_DIR, file);
                const stats = fs.statSync(filePath);
                if (now - stats.mtimeMs > maxAgeMs) {
                    fs.unlinkSync(filePath);
                    console.log(`🗑️ ลบไฟล์สำรองเก่าเกิน 30 วัน: ${file}`);
                }
            }
        });
    } catch (err) {
        console.error('⚠️ ข้อผิดพลาดในการลบไฟล์สำรองเก่า:', err.message);
    }
}

// 3. ฟังก์ชันหลักสำหรับดึงข้อมูลตารางและสร้างไฟล์สำรอง
async function performDailyBackup() {
    try {
        cleanOldBackups(); // ลบไฟล์เก่าเกิน 30 วันก่อนเสมอ

        const todayStr = new Date().toISOString().slice(0, 10); // เช่น 2026-10-01
        const backupFileName = `pos_db_${todayStr}.sql`;
        const backupFilePath = path.join(BACKUP_DIR, backupFileName);

        // ถ้าวันนี้สำรองไปแล้ว ไม่ต้องทำซ้ำ
        if (fs.existsSync(backupFilePath)) {
            console.log(`💾 วันนี้ (${todayStr}) มีไฟล์สำรองข้อมูลอยู่แล้ว`);
            return;
        }

        console.log(`⏳ กำลังสำรองข้อมูลประจำวัน (${todayStr})...`);

        // หาตำแหน่งไฟล์ mysqldump.exe จาก db-engine
        const dbEnginePath = (process.resourcesPath && fs.existsSync(path.join(process.resourcesPath, 'db-engine')))
            ? path.join(process.resourcesPath, 'db-engine')
            : path.join(__dirname, 'db-engine');

        const mysqldumpBin = path.join(dbEnginePath, 'bin', 'mysqldump.exe');

        // ตรวจสอบว่ามี mysqldump.exe หรือไม่ ถ้ามีให้รันผ่าน mysqldump
        if (fs.existsSync(mysqldumpBin)) {
            const { exec } = require('child_process');
            const cmd = `"${mysqldumpBin}" --host=127.0.0.1 --port=3307 --user=root pos_db > "${backupFilePath}"`;
            exec(cmd, (error) => {
                if (error) {
                    console.error('❌ ไม่สามารถสำรองข้อมูลผ่าน mysqldump ได้:', error.message);
                } else {
                    console.log(`✅ สำรองข้อมูลอัตโนมัติสำเร็จ: ${backupFileName}`);
                }
            });
        } else {
            // สำรองตารางแบบ Native ผ่านคำสั่ง MySQL Pool โดยตรง (กรณีหาไฟล์ exe ไม่เจอ)
            const tables = ['products', 'categories', 'orders', 'order_items', 'debt_payments'];
            let dumpSql = `-- POS Backup created at: ${new Date().toISOString()}\n\n`;

            for (const table of tables) {
                const [rows] = await db.query(`SELECT * FROM ${table}`);
                if (rows.length > 0) {
                    dumpSql += `DELETE FROM \`${table}\`;\n`;
                    for (const row of rows) {
                        const keys = Object.keys(row).map(k => `\`${k}\``).join(', ');
                        const values = Object.values(row).map(v => {
                            if (v === null) return 'NULL';
                            if (typeof v === 'number') return v;
                            return `'${String(v).replace(/'/g, "\\'")}'`;
                        }).join(', ');
                        dumpSql += `INSERT INTO \`${table}\` (${keys}) VALUES (${values});\n`;
                    }
                    dumpSql += '\n';
                }
            }

            fs.writeFileSync(backupFilePath, dumpSql, 'utf8');
            console.log(`✅ สำรองข้อมูลสำเร็จ (Native Mode): ${backupFileName}`);
        }
    } catch (err) {
        console.error('❌ ล้มเหลวในการสำรองข้อมูลประจำวัน:', err.message);
    }
}
// บังคับให้ฐานข้อมูลเตรียมการเสร็จก่อน แล้วค่อยเปิดให้หน้าเว็บเชื่อมต่อ
async function startServer() {
    await autoInitDatabase();

    https.createServer(sslOptions, app).listen(PORT, '0.0.0.0', async () => {
        console.log(`🚀 HTTPS Server is running at https://localhost:${PORT}`);
        try {
            const conn = await db.getConnection();
            console.log('✅ เชื่อมต่อฐานข้อมูล MySQL pos_db สำเร็จ!');
            conn.release();

            // 🟢 เรียกสำรองข้อมูลทันทีที่เปิดโปรแกรม และตั้งเวลาเช็กทุก 24 ชั่วโมง
            performDailyBackup();
            setInterval(performDailyBackup, 24 * 60 * 60 * 1000);

        } catch (err) {
            console.error('❌ เชื่อมต่อ MySQL ไม่สำเร็จ:', err.message);
        }
    });
}

startServer();