const { app, BrowserWindow, Menu, MenuItem, clipboard, shell } = require('electron');
const { spawn, exec } = require('child_process');
const path = require('path');
const fs = require('fs');
const { autoUpdater } = require('electron-updater'); // 🟢 เพิ่มตัวตรวจเช็กและดาวน์โหลดอัปเดต

// ⭐️ สั่งข้ามแจ้งเตือนใบรับรอง SSL ไม่ให้จอขาว
app.commandLine.appendSwitch('ignore-certificate-errors');

// ⭐️ ปลดล็อกให้เล่นเสียงแจ้งเตือนอัตโนมัติได้ทันทีเมื่อ Webhook ยิงเข้า
app.commandLine.appendSwitch('autoplay-policy', 'no-user-gesture-required');

let dbProcess = null;
let mainWindow = null;

// 1. สั่งเปิด MariaDB พกพา (คัดลอกข้อมูลไป ProgramData อัตโนมัติเมื่อเปิดครั้งแรก)
function startDatabase(callback) {
  const basePath = app.isPackaged ? process.resourcesPath : __dirname;
  const dbExe = path.join(basePath, 'db-engine', 'bin', 'mariadbd.exe');
  const dbIni = path.join(basePath, 'db-engine', 'my.ini');
  
  // 🌟 โฟลเดอร์เก็บข้อมูลถาวร (ใช้ / ป้องกันปัญหา Escape String บน MariaDB)
  const persistentDataDir = 'C:/ProgramData/POS_System/data';
  const defaultDataDir = path.join(basePath, 'db-engine', 'data');

  // ตรวจสอบว่าถ้ายังไม่มีโฟลเดอร์ ให้คัดลอกฐานข้อมูลเริ่มต้นไปวาง
  if (!fs.existsSync(persistentDataDir)) {
    try {
      fs.mkdirSync('C:/ProgramData/POS_System', { recursive: true });
      if (fs.existsSync(defaultDataDir)) {
        fs.cpSync(defaultDataDir, persistentDataDir, { recursive: true });
      }
    } catch (err) {
      console.error('ไม่สามารถเตรียมโฟลเดอร์ข้อมูลได้:', err);
    }
  }

  // รัน MariaDB โดยบังคับชี้ datadir ไปที่ ProgramData
  dbProcess = spawn(dbExe, [
    `--defaults-file=${dbIni}`,
    `--datadir=${persistentDataDir}`,
    '--console'
  ], {
    windowsHide: true,
    cwd: basePath
  });

  dbProcess.on('error', (err) => {
    console.error('ไม่สามารถเปิดฐานข้อมูลได้:', err);
  });

  // หน่วงเวลา 3 วินาทีเพื่อให้ MariaDB พร้อมรับ Connection ก่อนรันเซิร์ฟเวอร์
  setTimeout(callback, 3000);
}

// 2. สั่งปิด MariaDB ให้สมบูรณ์เมื่อปิดแอป
function stopDatabase() {
  if (dbProcess) {
    exec(`taskkill /pid ${dbProcess.pid} /f /t`, () => {});
    dbProcess = null;
  }
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1366,
    height: 768,
    title: "POS System",
    icon: path.join(__dirname, 'public', 'favicon.ico'),
    autoHideMenuBar: true,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      backgroundThrottling: false
    }
  });
  mainWindow.maximize();
  
  // ดักจับเมื่อมีการกดเปิดหน้าต่างใหม่ ให้โยนออกไปเปิดที่ Google Chrome นอกแอป
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  // คีย์ลัด Refresh / DevTools
  mainWindow.webContents.on('before-input-event', (event, input) => {
    if (input.control && input.shift && input.key.toLowerCase() === 'r') {
      mainWindow.webContents.reloadIgnoringCache();
      event.preventDefault();
    } else if ((input.control && input.key.toLowerCase() === 'r') || input.key === 'F5') {
      mainWindow.webContents.reload();
      event.preventDefault();
    } else if (input.key === 'F12') {
      mainWindow.webContents.toggleDevTools();
      event.preventDefault();
    }
  });

  // เมนูคลิกขวา
  mainWindow.webContents.on('context-menu', (event, params) => {
    const menu = new Menu();
    const hasCopiedImage = !clipboard.readImage().isEmpty();
    const hasCopiedText = clipboard.readText().trim().length > 0;

    if (hasCopiedImage || (params.isEditable && hasCopiedText)) {
      menu.append(new MenuItem({
        label: 'วาง (Ctrl+V)',
        click: () => mainWindow.webContents.paste()
      }));
      menu.append(new MenuItem({ type: 'separator' }));
    }

    menu.append(new MenuItem({ role: 'reload', label: 'รีเฟรชหน้าจอ (Ctrl+R)' }));
    menu.append(new MenuItem({ role: 'forceReload', label: 'ล้างแคชแล้วรีเฟรช (Ctrl+Shift+R)' }));

    if (params.mediaType === 'image') {
      menu.append(new MenuItem({ type: 'separator' }));
      menu.append(new MenuItem({
        label: 'คัดลอกรูปภาพ',
        click: () => mainWindow.webContents.copyImageAt(params.x, params.y)
      }));
      menu.append(new MenuItem({
        label: 'บันทึกรูปภาพเป็น...',
        click: () => mainWindow.webContents.downloadURL(params.srcURL)
      }));
    }

    if (params.selectionText) {
      menu.append(new MenuItem({ type: 'separator' }));
      menu.append(new MenuItem({ role: 'copy', label: 'คัดลอก' }));
    }

    if (params.isEditable) {
      menu.append(new MenuItem({ role: 'selectAll', label: 'เลือกทั้งหมด' }));
    }

    menu.append(new MenuItem({ type: 'separator' }));
    menu.append(new MenuItem({
      label: 'ตรวจสอบ (Inspect Element)',
      click: () => {
        mainWindow.webContents.inspectElement(params.x, params.y);
        if (!mainWindow.webContents.isDevToolsOpened()) {
          mainWindow.webContents.openDevTools();
        }
      }
    }));

    if (menu.items.length > 0) {
      menu.popup();
    }
  });

  // โหลดหน้าเว็บ POS แบบ HTTPS
  mainWindow.loadURL('https://localhost:3000');
}

// 🟢 ตั้งค่าระบบ Auto-Update
autoUpdater.autoDownload = true; // โหลดเวอร์ชันใหม่อัตโนมัติเมื่อพบ

autoUpdater.on('update-downloaded', () => {
  // เมื่อดาวน์โหลดไฟล์ติดตั้งเวอร์ชันใหม่เสร็จแล้ว ให้ปิดแอปแล้วลงทับทันที
  autoUpdater.quitAndInstall();
});

// ลำดับการทำงาน: สตาร์ต MariaDB -> โหลด server.js -> เปิดหน้าต่าง
startDatabase(() => {
  require('./server.js');

  const startApp = () => {
    createWindow();
    // สั่งตรวจเช็กอัปเดตเฉพาะเมื่อติดตั้งเป็นโปรแกรมจริงแล้ว (ไม่รันตอน npm start พัฒนา)
    if (app.isPackaged) {
      autoUpdater.checkForUpdatesAndNotify();
    }
  };

  if (app.isReady()) {
    startApp();
  } else {
    app.whenReady().then(startApp);
  }
});

app.on('window-all-closed', () => {
  stopDatabase();
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('before-quit', () => {
  stopDatabase();
});