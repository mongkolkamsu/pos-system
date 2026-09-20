const mysql = require('mysql2/promise');

/*const pool = mysql.createPool({
    host: 'localhost',
    user: 'root',
    password: '250946613',          // ใส่รหัสผ่าน MySQL เดิมของคุณ
    database: 'pos_db',     // ใส่ชื่อฐานข้อมูล MySQL เดิมของคุณ
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});*/

const pool = mysql.createPool({
    host: '127.0.0.1',
    port: 3306,          // เปลี่ยนมาใช้พอร์ต 3307
    user: 'root',
    password: '250946613',        // ตัวพกพาค่าเริ่มต้นจะไม่มีรหัสผ่าน (เว้นว่างไว้)
    database: 'pos_db',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

module.exports = pool;