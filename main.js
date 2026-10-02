const { app, BrowserWindow, Menu, MenuItem, clipboard, shell, ipcMain, dialog } = require('electron');
const { spawn, exec } = require('child_process');
const path = require('path');
const fs = require('fs');
const { autoUpdater } = require('electron-updater');

// ⭐️ สั่งข้ามแจ้งเตือนใบรับรอง SSL ไม่ให้จอขาว
app.commandLine.appendSwitch('ignore-certificate-errors');

// ⭐️ ปลดล็อกให้เล่นเสียงแจ้งเตือนอัตโนมัติได้ทันทีเมื่อ Webhook ยิงเข้า
app.commandLine.appendSwitch('autoplay-policy', 'no-user-gesture-required');

let dbProcess = null;
let mainWindow = null;
let splashWindow = null; // 🟢 ตัวแปรสำหรับหน้าต่างโหลด (Splash Screen)

// 🟢 ฟังก์ชันสร้างหน้าต่างโหลดให้เด้งขึ้นมากลางจอทันที
// 🟢 ฟังก์ชันสร้างหน้าต่างโหลด (ใช้ไอคอน favicon.ico จริง)
function createSplashScreen() {
  splashWindow = new BrowserWindow({
    width: 380,
    height: 420,
    transparent: true,
    frame: false,
    alwaysOnTop: true,
    resizable: false,
    center: true,
    show: true,
    icon: path.join(__dirname, 'public', 'favicon.ico')
  });

  // แปลงไฟล์ favicon.ico เป็น base64 เพื่อให้โหลดขึ้นหน้าต่างได้ทันที 100%
  const iconPath = path.join(__dirname, 'public', 'favicon.ico');
  let iconBase64 = '';
  try {
    if (fs.existsSync(iconPath)) {
      iconBase64 = `data:image/x-icon;base64,${fs.readFileSync(iconPath).toString('base64')}`;
    }
  } catch (e) {
    console.error('ไม่สามารถอ่าน favicon.ico:', e);
  }

  const splashHTML = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body {
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Prompt", sans-serif;
          background: transparent;
          height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          user-select: none;
        }
        .card {
          width: 340px;
          padding: 36px 24px;
          background: #ffffff;
          border-radius: 28px;
          box-shadow: 0 20px 60px rgba(15, 23, 42, 0.2), 0 0 0 1px rgba(226, 232, 240, 0.8);
          text-align: center;
          display: flex;
          flex-direction: column;
          align-items: center;
        }
        .logo-box {
          width: 72px;
          height: 72px;
          background: #f8fafc;
          border-radius: 22px;
          display: flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 18px;
          box-shadow: inset 0 2px 4px rgba(255, 255, 255, 0.9), 0 4px 12px rgba(0, 0, 0, 0.05);
          border: 1px solid rgba(226, 232, 240, 0.8);
        }
        .app-icon {
          width: 44px;
          height: 44px;
          object-fit: contain;
          filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.08));
        }
        h2 {
          font-size: 20px;
          font-weight: 800;
          color: #0f172a;
          margin-bottom: 6px;
        }
        p {
          font-size: 13px;
          color: #64748b;
          margin-bottom: 24px;
        }
        .spinner {
          width: 32px;
          height: 32px;
          border: 3.5px solid #e2e8f0;
          border-top-color: #2563eb;
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      </style>
    </head>
    <body>
      <div class="card">
        <div class="logo-box">
          <img src="${iconBase64}" class="app-icon" alt="Logo">
        </div>
        <h2>POS System</h2>
        <p>กำลังเตรียมระบบและฐานข้อมูล...</p>
        <div class="spinner"></div>
      </div>
    </body>
    </html>
  `;

  splashWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(splashHTML)}`);
}

// 1. สั่งเปิด MariaDB และจัดการโฟลเดอร์ C:\POS_System ทั้งหมด
function startDatabase(callback) {
  const basePath = app.isPackaged ? process.resourcesPath : __dirname;
  const dbExe = path.join(basePath, 'db-engine', 'bin', 'mariadbd.exe');
  const dbIni = path.join(basePath, 'db-engine', 'my.ini');
  
  const rootDir = 'C:/POS_System';
  const liveDataDir = 'C:/POS_System/data';
  const liveImgDir = 'C:/POS_System/images';

  const defaultDataDir = path.join(basePath, 'db-engine', 'data');
  const defaultImgDir = app.isPackaged 
    ? path.join(basePath, 'default-images') 
    : path.join(__dirname, 'public', 'images');

  try {
    if (!fs.existsSync(rootDir)) {
      fs.mkdirSync(rootDir, { recursive: true });
    }

    if (!fs.existsSync(liveDataDir)) {
      fs.mkdirSync(liveDataDir, { recursive: true });
      if (fs.existsSync(defaultDataDir)) {
        fs.cpSync(defaultDataDir, liveDataDir, { recursive: true });
      }
    }

    if (!fs.existsSync(liveImgDir) || fs.readdirSync(liveImgDir).length === 0) {
      fs.mkdirSync(liveImgDir, { recursive: true });
      if (fs.existsSync(defaultImgDir)) {
        fs.cpSync(defaultImgDir, liveImgDir, { recursive: true });
      }
    }
  } catch (err) {
    console.error('เกิดข้อผิดพลาดในการเตรียมโฟลเดอร์ C:\\POS_System:', err);
  }

  dbProcess = spawn(dbExe, [
    `--defaults-file=${dbIni}`,
    `--datadir=${liveDataDir}`,
    '--console'
  ], {
    windowsHide: true,
    cwd: basePath
  });

  dbProcess.on('error', (err) => {
    console.error('ไม่สามารถเปิดฐานข้อมูลได้:', err);
  });

  setTimeout(callback, 3000);
}

// 2. สั่งปิด MariaDB ให้สมบูรณ์เมื่อปิดแอป
function stopDatabase() {
  if (dbProcess) {
    exec(`taskkill /pid ${dbProcess.pid} /f /t`, () => {});
    dbProcess = null;
  }
}

function ensureClassicPrintDialog() {
  if (process.platform === 'win32') {
    exec('reg add "HKCU\\Software\\Microsoft\\Print\\UnifiedPrintDialog" /v "PreferLaunchClassicPrintDialog" /t REG_DWORD /d 1 /f', () => {});
  }
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1366,
    height: 768,
    show: false, // 🟢 ซ่อนหน้าต่างหลักไว้ก่อนจนกว่าจะโหลดหน้าเว็บเสร็จ
    title: "POS System",
    icon: path.join(__dirname, 'public', 'favicon.ico'),
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      backgroundThrottling: false
    }
  });

  // 🟢 เมื่อหน้าเว็บโหลดพร้อมแสดงผล: สั่งปิด Splash Screen แล้วแสดงหน้าต่างหลักทันที
  mainWindow.once('ready-to-show', () => {
    if (splashWindow && !splashWindow.isDestroyed()) {
      splashWindow.close();
      splashWindow = null;
    }
    mainWindow.show();
    mainWindow.maximize();
  });

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

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

  mainWindow.loadURL('https://localhost:3000');
}

// 🟢 ตั้งค่าระบบ Auto-Update
autoUpdater.autoDownload = true;

autoUpdater.on('update-available', (info) => {
  let notes = '';
  if (info.releaseNotes) {
    if (typeof info.releaseNotes === 'string') {
      notes = info.releaseNotes;
    } else if (Array.isArray(info.releaseNotes)) {
      notes = info.releaseNotes.map(n => n.note).join('\n');
    }
    // ล้างแท็ก HTML ออกเพื่อให้แสดงผลใน Popup ได้สวยงาม
    notes = notes.replace(/<[^>]*>?/gm, '').trim();
  }

  // ส่งข้อมูลเวอร์ชันใหม่และรายการอัปเดตไปให้หน้าเว็บแสดงผลที่ Sidebar
  if (mainWindow && mainWindow.webContents) {
    mainWindow.webContents.send('update-available-to-ui', {
      version: info.version,
      notes: notes || 'ปรับปรุงประสิทธิภาพการทำงานของระบบ'
    });
  }

  dialog.showMessageBox({
    type: 'info',
    title: '🎉 พบอัปเดตใหม่ v' + info.version,
    message: `ระบบพบเวอร์ชันใหม่ (v${info.version})\n\nรายการอัปเดต:\n${notes || '- ปรับปรุงประสิทธิภาพและแก้ไขข้อผิดพลาด'}\n\nระบบกำลังดาวน์โหลดเบื้องหลัง กรุณารอสักครู่...`,
    buttons: ['รับทราบ']
  });
});

autoUpdater.on('update-not-available', () => {
  console.log('แอปเป็นเวอร์ชันล่าสุดแล้ว');
});

autoUpdater.on('error', (err) => {
  console.error('Update Error:', err);
  dialog.showErrorBox('การอัปเดตล้มเหลว', err == null ? 'ไม่ทราบสาเหตุ' : (err.message || String(err)));
});

autoUpdater.on('update-downloaded', () => {
  // 🟢 ส่งสัญญาณบอกหน้าต่าง Sidebar ว่าดาวน์โหลดตัวติดตั้งเสร็จแล้ว
  if (mainWindow && mainWindow.webContents) {
    mainWindow.webContents.send('update-downloaded-to-ui');
  }

  dialog.showMessageBox({
    type: 'info',
    title: 'ดาวน์โหลดเสร็จสมบูรณ์',
    message: 'ดาวน์โหลดเวอร์ชันใหม่เสร็จสิ้นแล้ว แอปจะปิดและเปิดเวอร์ชันใหม่ทันที',
    buttons: ['อัปเดตเลย']
  }).then(() => {
    autoUpdater.quitAndInstall(false, true);
  });
});

// 🟢 ลำดับการทำงานใหม่: เปิดหน้าต่างโหลดทันที -> สตาร์ต MariaDB -> โหลด server.js -> สลับไปหน้าจอหลัก
app.whenReady().then(() => {
  createSplashScreen(); // เด้งขึ้นมากลางจอทันทีใน 0.2 วินาที!

  startDatabase(() => {
    require('./server.js');
    ensureClassicPrintDialog();
    createWindow();

    if (app.isPackaged) {
      autoUpdater.checkForUpdatesAndNotify();
    }
  });
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

ipcMain.handle('print-tags-direct', async (event, data) => {
  let htmlContent = '';
  let isColorMode = true;

  if (typeof data === 'object' && data !== null) {
    htmlContent = data.htmlContent || '';
    isColorMode = data.isColor !== undefined ? data.isColor : true;
  } else if (typeof data === 'string') {
    htmlContent = data;
  }

  if (typeof htmlContent !== 'string') {
    htmlContent = String(htmlContent || '');
  }

  return new Promise((resolve) => {
    const printWin = new BrowserWindow({
      show: false,
      width: 1024,
      height: 1400,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true
      }
    });

    const tempFilePath = path.join(app.getPath('temp'), `pos_print_${Date.now()}.html`);
    try {
      fs.writeFileSync(tempFilePath, htmlContent, 'utf8');
    } catch (err) {
      console.error('Failed to create temp print file:', err);
    }

    printWin.loadFile(tempFilePath);

    printWin.webContents.on('did-finish-load', () => {
      setTimeout(() => {
        printWin.webContents.print({
          silent: true,
          printBackground: true,
          color: isColorMode,
          pageSize: 'A4',
          landscape: false,
          margins: {
            marginType: 'none'
          }
        }, (success, errorType) => {
          try {
            if (fs.existsSync(tempFilePath)) {
              fs.unlinkSync(tempFilePath);
            }
          } catch (e) {}

          setTimeout(() => {
            if (!printWin.isDestroyed()) printWin.close();
          }, 3000);

          resolve({ success, errorType });
        });
      }, 300);
    });
  });
});

ipcMain.handle('get-app-version', () => {
  return app.getVersion();
});
// 🟢 รับคำสั่งกดปุ่มรีสตาร์ทเพื่อติดตั้งอัปเดตทันทีจากหน้าต่าง
ipcMain.handle('restart-and-install-update', () => {
  autoUpdater.quitAndInstall(false, true);
});

// 🟢 รับคำสั่งกดปุ่มตรวจเช็กอัปเดตด้วยมือ
ipcMain.handle('check-for-updates-manual', async () => {
  if (app.isPackaged) {
    try {
      const res = await autoUpdater.checkForUpdates();
      return { success: true, version: res?.updateInfo?.version };
    } catch (err) {
      return { success: false, message: err.message };
    }
  }
  return { success: false, message: 'อยู่ในโหมดพัฒนา (npm start)' };
});