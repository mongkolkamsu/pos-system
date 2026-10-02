// public/js/sidebar.js - แถบเมนูซ้าย + ลิ้นชักสไลด์การ์ดลอย + ขยายจอ (iOS Smooth Animation)
let isDrawerExpanded = false;

function initPosSidebar() {
    if (window.self !== window.top) return;
    if (document.getElementById('ios-sidebar')) return;

    const sidebarHTML = `
        <!-- 1. แถบเมนูไอคอนแนวตั้งซ้ายสุด -->
        <aside id="ios-sidebar" class="w-18 sm:w-20 bg-white border-r border-slate-200/80 flex flex-col items-center py-4 flex-shrink-0 z-40 select-none shadow-[2px_0_12px_rgba(0,0,0,0.02)]">
            <div class="relative w-11 h-11 mb-6 flex-shrink-0">
                <button type="button" 
                        onclick="refreshPosScreen(this)" 
                        title="รีเฟรชหน้าจอ" 
                        class="w-full h-full rounded-2xl bg-white border border-slate-200/90 shadow-2xs hover:shadow-xs flex items-center justify-center text-slate-800 hover:text-slate-950 hover:border-slate-300 transition-all active:scale-90 cursor-pointer">
                    <svg class="w-[18px] h-[18px] transition-transform duration-300 pointer-events-none" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.3">
                        <rect x="3.5" y="3.5" width="6.8" height="6.8" rx="2.2" />
                        <rect x="13.7" y="3.5" width="6.8" height="6.8" rx="2.2" />
                        <rect x="3.5" y="13.7" width="6.8" height="6.8" rx="2.2" />
                        <rect x="13.7" y="13.7" width="6.8" height="6.8" rx="2.2" />
                    </svg>
                </button>
                <span class="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-500 border-2 border-white rounded-full pointer-events-none shadow-2xs"></span>
            </div>

            <div class="flex-1 w-full flex flex-col items-center gap-2.5">
                <!-- หน้าร้าน -->
                <button type="button" onclick="closePosDrawer()" title="หน้าร้านขายสินค้า"
                        class="w-14 h-14 rounded-2xl flex flex-col items-center justify-center gap-1 transition-all active:scale-95 bg-blue-600 text-white shadow-md shadow-blue-500/30 cursor-pointer">
                    <svg class="w-5 h-5 text-white" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"/>
                    </svg>
                    <span class="text-[10px] font-bold">หน้าร้าน</span>
                </button>

                <!-- ลูกหนี้ -->
                <button type="button" onclick="openPosDrawer('debts.html', 'สมุดบัญชีลูกหนี้')" title="ลูกหนี้"
                        class="w-14 h-14 rounded-2xl flex flex-col items-center justify-center gap-1 text-slate-500 hover:bg-amber-50 hover:text-amber-600 transition-all active:scale-95 cursor-pointer">
                    <svg class="w-5 h-5 text-amber-500" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"/>
                    </svg>
                    <span class="text-[10px] font-bold">ลูกหนี้</span>
                </button>

                <!-- ประวัติ -->
                <button type="button" onclick="openPosDrawer('history.html', 'ประวัติการขาย')" title="ประวัติบิล"
                        class="w-14 h-14 rounded-2xl flex flex-col items-center justify-center gap-1 text-slate-500 hover:bg-blue-50 hover:text-blue-600 transition-all active:scale-95 cursor-pointer">
                    <svg class="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
                    </svg>
                    <span class="text-[10px] font-bold">ประวัติ</span>
                </button>

                <!-- ของต้องซื้อ -->
                <button type="button" onclick="openPosDrawer('low_stock.html', 'ตรวจเช็คของต้องซื้อ')" title="ของต้องซื้อ"
                        class="w-14 h-14 rounded-2xl flex flex-col items-center justify-center gap-1 text-slate-500 hover:bg-rose-50 hover:text-rose-600 transition-all active:scale-95 cursor-pointer">
                    <svg class="w-5 h-5 text-rose-500" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"/>
                    </svg>
                    <span class="text-[10px] font-bold">ต้องซื้อ</span>
                </button>
                <!-- พิมพ์ป้ายบาร์โค้ด/ราคา -->
                <button type="button" onclick="openPosDrawer('print_tags.html', 'พิมพ์ป้ายสินค้า & บาร์โค้ด')" title="พิมพ์ป้ายสินค้า"
                        class="w-14 h-14 rounded-2xl flex flex-col items-center justify-center gap-1 text-slate-500 hover:bg-purple-50 hover:text-purple-600 transition-all active:scale-95 cursor-pointer">
                    <svg class="w-5 h-5 text-purple-500" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"/>
                    </svg>
                    <span class="text-[10px] font-bold">พิมพ์ป้าย</span>
                </button>
                <div class="w-8 h-px bg-slate-200/80 my-1"></div>

                <!-- หมวดหมู่ -->
                <button type="button" onclick="if(typeof openAddCategoryModal === 'function') openAddCategoryModal()" title="จัดการหมวดหมู่"
                        class="w-14 h-14 rounded-2xl flex flex-col items-center justify-center gap-1 text-slate-500 hover:bg-indigo-50 hover:text-indigo-600 transition-all active:scale-95 cursor-pointer">
                    <svg class="w-5 h-5 text-indigo-500" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"/>
                    </svg>
                    <span class="text-[10px] font-bold">หมวดหมู่</span>
                </button>

                <!-- รับสต็อก -->
                <button type="button" onclick="if(typeof openStockInModal === 'function') openStockInModal()" title="รับสต็อกสินค้า"
                        class="w-14 h-14 rounded-2xl flex flex-col items-center justify-center gap-1 text-slate-500 hover:bg-sky-50 hover:text-sky-600 transition-all active:scale-95 cursor-pointer">
                    <svg class="w-5 h-5 text-sky-500" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
                    </svg>
                    <span class="text-[10px] font-bold">รับสต็อก</span>
                </button>
            </div>
            <!-- 🌟 ปุ่มสวิตช์คีย์บอร์ดเสมือน (ย้ายมาไว้ล่างสุดของ Sidebar) 🌟 -->
            <div class="mt-auto pt-3 flex flex-col items-center gap-1 flex-shrink-0">
                <div class="flex items-center justify-between w-14 sm:w-15 px-1.5 py-1 bg-white border border-slate-200/90 rounded-full shadow-2xs hover:border-slate-300 transition-colors" title="เปิด/ปิด คีย์บอร์ดสัมผัส">
                    <!-- ไอคอนแป้นพิมพ์ -->
                    <svg class="w-4 h-4 text-slate-500 flex-shrink-0 pointer-events-none" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
                        <rect x="2" y="5" width="20" height="14" rx="3" />
                        <path d="M6 9h.01M10 9h.01M14 9h.01M18 9h.01M6 13h.01M18 13h.01M9 14h6" stroke-width="2" stroke-linecap="round"/>
                    </svg>

                    <!-- สวิตช์ iOS Toggle -->
                    <label class="relative inline-flex items-center cursor-pointer select-none">
                        <input type="checkbox" id="sidebar-keyboard-toggle" onchange="togglePosKeyboard(this.checked)" class="sr-only peer">
                        <div class="w-6 h-3.5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:bg-[#34C759] transition-colors after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-2.5 after:w-2.5 after:transition-all peer-checked:after:translate-x-2.5 shadow-inner"></div>                    
                    </label>
                </div>
                <button type="button" onclick="showChangelogModal()" title="คลิกเพื่อดูรายการอัปเดต" 
                        class="flex flex-col items-center gap-0.5 mt-1 group cursor-pointer outline-none">
                    <div class="flex items-center gap-1">
                        <!-- ไฟเขียวกระพริบ (จะโชว์เมื่อมีอัปเดตใหม่) -->
                        <span id="update-badge-dot" class="hidden w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                        <span id="app-version-label" class="text-[10px] text-slate-400 group-hover:text-blue-600 font-bold tracking-tight transition-colors">v...</span>
                    </div>
                    <span id="update-badge-text" class="hidden text-[9px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded-full border border-emerald-200">มีอัปเดต!</span>
                </button>
            </div>
        </aside>

        <!-- 2. ฉากหลังโปร่งแสง -->
        <div id="pos-drawer-backdrop" onclick="closePosDrawer()" 
             class="fixed inset-0 bg-slate-900/30 backdrop-blur-xs z-50 transition-opacity duration-300 ease-out opacity-0 pointer-events-none"></div>

        <!-- 3. แผ่นการ์ดสไลด์ลอยสไตล์ iOS (สไลด์สมูทด้วย Apple Bezier Curve) -->
        <div id="pos-drawer-panel" 
             style="transition: transform 0.35s cubic-bezier(0.32, 0.72, 0, 1), width 0.3s cubic-bezier(0.32, 0.72, 0, 1), opacity 0.25s ease;"
             class="fixed top-3 bottom-3 left-22 w-[540px] max-w-[calc(100vw-100px)] bg-white/95 backdrop-blur-2xl rounded-[32px] shadow-[0_20px_60px_rgba(0,0,0,0.18)] border border-slate-200/80 z-50 flex flex-col overflow-hidden -translate-x-[120vw] opacity-0 pointer-events-none">
            
            <!-- ส่วนหัวการ์ด -->
            <div class="px-5 py-3.5 bg-white/80 border-b border-slate-100 flex items-center justify-between flex-shrink-0 select-none">
                <h3 id="pos-drawer-title" class="text-sm font-bold text-slate-800 tracking-tight">รายละเอียด</h3>
                
                <div class="flex items-center gap-2">
                    <!-- ปุ่มขยาย / ย่อการ์ด -->
                    <button type="button" id="pos-drawer-expand-btn" onclick="togglePosDrawerExpand()" title="ขยาย/ย่อ ขนาดหน้าต่าง"
                            class="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center transition active:scale-90 cursor-pointer">
                        <svg id="pos-drawer-expand-icon" class="w-3.5 h-3.5" fill="none" stroke="currentColor" stroke-width="2.2" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4"/>
                        </svg>
                    </button>

                    <!-- ปุ่มปิด -->
                    <button type="button" onclick="closePosDrawer()" title="ปิดหน้าต่าง"
                            class="w-8 h-8 rounded-full bg-slate-100 hover:bg-rose-50 hover:text-rose-600 text-slate-500 flex items-center justify-center transition active:scale-90 cursor-pointer">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/>
                        </svg>
                    </button>
                </div>
            </div>
            
            <!-- เฟรมแสดงหน้าเว็บ -->
            <div class="flex-1 w-full h-full bg-slate-50/50 relative">
                <iframe id="pos-drawer-frame" src="" class="w-full h-full border-none"></iframe>
            </div>
        </div>
        <!-- 4. หน้าต่าง Modal รายการอัปเดต -->
        <div id="pos-changelog-modal" class="fixed inset-0 z-[999999] hidden flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs select-none" onclick="closeChangelogModal()">
            <div class="w-full max-w-sm bg-white rounded-3xl p-6 shadow-2xl border border-slate-100 animate-in fade-in zoom-in-95 duration-200" onclick="event.stopPropagation()">
                <div class="flex items-center justify-between pb-3 border-b border-slate-100">
                    <div class="flex items-center gap-2.5">
                        <!-- 🟢 เปลี่ยนกลับเป็นไอคอนลูกศรหมุนวนสีฟ้าตามเดิม -->
                        <div class="w-9 h-9 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center flex-shrink-0 border border-blue-100/70 shadow-2xs">
                            <svg class="w-4.2 h-4.2" fill="none" stroke="currentColor" stroke-width="2.2" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99" />
                            </svg>
                        </div>
                        <div>
                            <h3 class="font-extrabold text-sm text-slate-800">รายการอัปเดตระบบ</h3>
                            <p id="modal-version-tag" class="text-[11px] text-slate-400 font-semibold">เวอร์ชันปัจจุบัน</p>
                        </div>
                    </div>
                    <button type="button" onclick="closeChangelogModal()" class="w-7 h-7 rounded-full flex items-center justify-center text-slate-400 hover:bg-slate-100 active:scale-95 text-xs font-bold cursor-pointer">✕</button>
                </div>

                <div class="py-4 space-y-2 max-h-60 overflow-y-auto text-xs text-slate-600" id="modal-changelog-content">
                    <!-- รายการข้อความอัปเดตจะแทรกตรงนี้ -->
                </div>

                <!-- 🟢 เติมแท็กปิด </div> ครบถ้วน ไม่หลุดบล็อก -->
                <div id="modal-changelog-actions" class="pt-1 flex gap-2"></div>
            </div>
        </div>
    `;

    const container = document.getElementById('main-container');
    if (container) {
        container.insertAdjacentHTML('afterbegin', sidebarHTML);
    }
}

// ฟังก์ชันสลับความกว้าง (ขยายเต็มจอ / หดกลับไซส์ปกติ)
function togglePosDrawerExpand() {
    const panel = document.getElementById('pos-drawer-panel');
    const icon = document.getElementById('pos-drawer-expand-icon');
    if (!panel) return;

    isDrawerExpanded = !isDrawerExpanded;

    if (isDrawerExpanded) {
        panel.classList.remove('w-[540px]');
        panel.classList.add('w-[calc(100vw-110px)]');
        if (icon) {
            icon.innerHTML = `<path stroke-linecap="round" stroke-linejoin="round" d="M9 4v5m0 0H4m5 0L3 3m6 12v5m0-5H4m5 0l-6 6m12-12l6-6m-6 6h5m-5 0V4m0 12l6 6m-6-6h5m-5 0v5"/>`;
        }
    } else {
        panel.classList.remove('w-[calc(100vw-110px)]');
        panel.classList.add('w-[540px]');
        if (icon) {
            icon.innerHTML = `<path stroke-linecap="round" stroke-linejoin="round" d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4"/>`;
        }
    }
}

function openPosDrawer(url, title) {
    const backdrop = document.getElementById('pos-drawer-backdrop');
    const panel = document.getElementById('pos-drawer-panel');
    const frame = document.getElementById('pos-drawer-frame');
    const titleEl = document.getElementById('pos-drawer-title');

    if (!panel || !frame) return;

    if (titleEl) titleEl.innerText = title;
    frame.src = url;

    backdrop.classList.remove('opacity-0', 'pointer-events-none');
    backdrop.classList.add('opacity-100');

    // เลื่อนออกมา พร้อมเปิดให้คลิกและแสดงผลเต็ม 100%
    panel.classList.remove('-translate-x-[120vw]', 'opacity-0', 'pointer-events-none');
    panel.classList.add('translate-x-0', 'opacity-100');
}

function closePosDrawer() {
    const backdrop = document.getElementById('pos-drawer-backdrop');
    const panel = document.getElementById('pos-drawer-panel');
    const frame = document.getElementById('pos-drawer-frame');

    if (!panel) return;

    backdrop.classList.add('opacity-0', 'pointer-events-none');
    backdrop.classList.remove('opacity-100');

    // สไลด์ออกไปพ้นจอ 120vw ไม่ว่าจะกว้างไซส์ไหนก็พ้นจอแบบลื่นไหล
    panel.classList.add('-translate-x-[120vw]', 'opacity-0', 'pointer-events-none');
    panel.classList.remove('translate-x-0', 'opacity-100');

    // รอให้สไลด์พ้นสายตาก่อน 350ms จึงค่อยเคลียร์ Iframe และรีเซ็ตความกว้าง
    setTimeout(() => {
        if (frame) frame.src = '';
        if (isDrawerExpanded) {
            togglePosDrawerExpand();
        }
    }, 350);
}
function refreshPosScreen(btn) {
    const icon = btn.querySelector('svg');
    if (icon) {
        icon.classList.add('rotate-180');
    }
    setTimeout(() => {
        window.location.reload();
    }, 150);
}
// 🟢 ควบคุมและจำสถานะการเปิด/ปิดคีย์บอร์ดเสมือนร่วมกับ keyboard.js
function togglePosKeyboard() {
    if (typeof window.toggleVirtualKeyboardGlobalState === 'function') {
        window.toggleVirtualKeyboardGlobalState();
    } else {
        const current = localStorage.getItem('pos_vk_enabled') !== 'false';
        localStorage.setItem('pos_vk_enabled', (!current).toString());
    }
    syncKeyboardToggleState();
}

// 🟢 ซิงค์สถานะสวิตช์ตาม pos_vk_enabled
function syncKeyboardToggleState() {
    const toggle = document.getElementById('sidebar-keyboard-toggle');
    if (!toggle) return;
    const isSavedOn = localStorage.getItem('pos_vk_enabled') !== 'false';
    toggle.checked = isSavedOn;
}

window.syncKeyboardToggleState = syncKeyboardToggleState;

// เรียกซิงค์สถานะหลังจากแทรก Sidebar เสร็จ
const originalInitPosSidebar = initPosSidebar;
initPosSidebar = function() {
    originalInitPosSidebar();
    syncKeyboardToggleState();
};
// 🟢 ดึงเวอร์ชันจาก Electron มาแปะที่ Sidebar อัตโนมัติ
function updateAppVersionBadge() {
    if (window.electronAPI && window.electronAPI.getAppVersion) {
        window.electronAPI.getAppVersion().then(version => {
            const label = document.getElementById('app-version-label');
            if (label) {
                label.innerText = `v${version}`;
            }
        }).catch(() => {});
    }
}

// ผูกเข้ากับรอบโหลด Sidebar
const prevInitPosSidebar = initPosSidebar;
initPosSidebar = function() {
    prevInitPosSidebar();
    updateAppVersionBadge();
};

// ==========================================
// 🚀 ระบบจัดการการแสดงรายการอัปเดต (Changelog & Live Progress)
// ==========================================
let updateState = 'IDLE'; // 'IDLE' | 'AVAILABLE' | 'DOWNLOADING' | 'READY'
let pendingUpdateInfo = null;

// 1. รับค่าเปอร์เซ็นต์แบบเรียลไทม์
if (window.electronAPI && window.electronAPI.onUpdateProgress) {
    window.electronAPI.onUpdateProgress((data) => {
        updateState = 'DOWNLOADING';
        const bar = document.getElementById('modal-progress-bar');
        const percentText = document.getElementById('modal-progress-percent');
        const bytesText = document.getElementById('modal-progress-bytes');

        if (bar) bar.style.width = `${data.percent}%`;
        if (percentText) percentText.innerText = `${data.percent}%`;
        if (bytesText) bytesText.innerText = `${data.transferredMB} MB / ${data.totalMB} MB`;
    });
}

// 2. เมื่อดาวน์โหลดเสร็จ 100%
if (window.electronAPI && window.electronAPI.onUpdateDownloaded) {
    window.electronAPI.onUpdateDownloaded(() => {
        updateState = 'READY';
        renderModalState();

        // นับถอยหลัง 2 วินาทีแล้วสั่งรีสตาร์ทเปิดแอปใหม่เองอัตโนมัติ
        setTimeout(() => {
            if (window.electronAPI.restartAndInstallUpdate) {
                window.electronAPI.restartAndInstallUpdate();
            }
        }, 2000);
    });
}

// 3. จัดการเปิด Modal
function showChangelogModal() {
    const modal = document.getElementById('pos-changelog-modal');
    if (!modal) return;
    modal.classList.remove('hidden');
    renderModalState();
}
// ฟังก์ชันแปลง Markdown จาก GitHub ให้กลายเป็น HTML สวยงามสไตล์ iOS
function formatMarkdownToHtml(md) {
    if (!md) return '';
    return md
        .replace(/^### (.*$)/gim, '<div class="font-bold text-slate-800 text-xs mt-2 mb-1">$1</div>')
        .replace(/^## (.*$)/gim, '<div class="font-bold text-slate-800 text-sm mt-2 mb-1">$1</div>')
        .replace(/^# (.*$)/gim, '<div class="font-extrabold text-slate-900 text-sm mt-2 mb-1">$1</div>')
        .replace(/\*\*(.*?)\*\*/gim, '<strong class="text-slate-800 font-semibold">$1</strong>')
        .replace(/^\s*[\*\-]\s+(.*$)/gim, '<div class="flex items-start gap-1.5 pl-1 text-slate-600"><span>•</span><span>$1</span></div>')
        .replace(/\n$/gim, '')
        .replace(/\n/gim, '<div class="h-1"></div>');
}
// 4. วาดหน้าต่างตามสถานะปัจจุบัน
function renderModalState() {
    const content = document.getElementById('modal-changelog-content');
    const tag = document.getElementById('modal-version-tag');
    const actions = document.getElementById('modal-changelog-actions');
    const curVer = document.getElementById('app-version-label')?.innerText || '';

    if (!content || !actions || !tag) return;

    if (updateState === 'READY') {
        // สถานะ: โหลดเสร็จ กำลังรีสตาร์ท
        tag.innerText = `ดาวน์โหลดเสร็จแล้ว`;
        content.innerHTML = `
            <div class="p-3 bg-emerald-50 rounded-2xl border border-emerald-100 text-emerald-800 text-xs font-semibold flex items-center gap-2">
                <svg class="w-4 h-4 text-emerald-600 flex-shrink-0" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="m4.5 12.75 6 6 9-13.5"/></svg>
                <span>ดาวน์โหลดครบ 100% กำลังรีสตาร์ทเข้าแอปใหม่...</span>
            </div>
        `;
        actions.innerHTML = `
            <button type="button" onclick="window.electronAPI.restartAndInstallUpdate()" class="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-2xl shadow-md shadow-blue-500/25 active:scale-95 transition-all cursor-pointer">
                รีสตาร์ททันที
            </button>
        `;
    } else if (updateState === 'DOWNLOADING') {
        // สถานะ: หลอดโหลดกำลังวิ่ง
        tag.innerText = `กำลังดาวน์โหลด v${pendingUpdateInfo?.version || ''}`;
        content.innerHTML = `
            <div class="p-3.5 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-2">
                <div class="flex items-center justify-between text-[11px] font-bold text-slate-700">
                    <span class="flex items-center gap-1.5">
                        <span class="w-2 h-2 rounded-full bg-blue-600 animate-ping"></span>
                        กำลังดาวน์โหลดไฟล์...
                    </span>
                    <span id="modal-progress-percent" class="text-blue-600">0%</span>
                </div>
                <div class="w-full h-2.5 bg-slate-200 rounded-full overflow-hidden">
                    <div id="modal-progress-bar" style="width: 0%;" class="h-full bg-blue-600 rounded-full transition-all duration-150"></div>
                </div>
                <div class="flex justify-end text-[10px] text-slate-400 font-semibold" id="modal-progress-bytes">
                    0 MB / -- MB
                </div>
            </div>
        `;
        actions.innerHTML = `
            <button type="button" onclick="closeChangelogModal()" class="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-2xl active:scale-95 transition-all cursor-pointer">
                ซ่อนหน้าต่าง (ดาวน์โหลดเบื้องหลัง)
            </button>
        `;
    } else if (updateState === 'AVAILABLE') {
        tag.innerText = `พบเวอร์ชันใหม่ v${pendingUpdateInfo.version}`;
        content.innerHTML = `
            <div class="p-3 bg-blue-50 rounded-2xl border border-blue-100 text-blue-700 font-semibold mb-2 text-xs">
                🎉 มีเวอร์ชันใหม่พร้อมใช้งาน
            </div>
            <div class="whitespace-pre-line text-xs font-medium text-slate-600 leading-relaxed">
                ${pendingUpdateInfo.notes}
            </div>
        `;
        actions.innerHTML = `
            <button type="button" onclick="closeChangelogModal()" class="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-2xl active:scale-95 transition-all cursor-pointer">
                ไว้ทีหลัง
            </button>
            <button type="button" onclick="handleStartDownload()" class="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-2xl shadow-md shadow-blue-500/25 active:scale-95 transition-all cursor-pointer">
                อัปเดตตอนนี้
            </button>
        `;
    } else {
        // สถานะ: ปกติ (เวอร์ชันปัจจุบัน) - ดึงข้อความจาก GitHub Release
        tag.innerText = `เวอร์ชันปัจจุบัน (${curVer})`;
        content.innerHTML = `
            <div id="github-release-content" class="text-xs text-slate-500 py-4 text-center">
                กำลังโหลดรายละเอียดจาก...
            </div>
        `;
        actions.innerHTML = `
            <button type="button" onclick="handleManualCheckUpdate(this)" class="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-2xl active:scale-95 transition-all flex items-center justify-center gap-1.5 cursor-pointer">
                <svg class="w-3.5 h-3.5 text-slate-500" fill="none" stroke="currentColor" stroke-width="2.2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z"/></svg>
                <span>ตรวจหาอัปเดต</span>
            </button>
            <button type="button" onclick="closeChangelogModal()" class="flex-1 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-2xl active:scale-95 transition-all cursor-pointer">
                เข้าใจแล้ว
            </button>
        `;

        // 🟢 สั่งดึง Release Notes จาก GitHub ทันทีที่เปิดหน้าต่าง
        if (window.electronAPI && window.electronAPI.getCurrentReleaseNotes) {
            window.electronAPI.getCurrentReleaseNotes().then(res => {
                const box = document.getElementById('github-release-content');
                if (!box) return;
                
                if (res.success && res.notes) {
                    box.className = "text-xs text-slate-600 leading-relaxed text-left space-y-1 pr-2";
                    box.innerHTML = formatMarkdownToHtml(res.notes);
                } else {
                    box.className = "text-xs text-slate-400 py-3 text-center";
                    box.innerText = "ไม่สามารถเชื่อมต่อเพื่อดึงรายการอัปเดตจาก GitHub ได้";
                }
            }).catch(() => {
                const box = document.getElementById('github-release-content');
                if (box) box.innerText = "เกิดข้อผิดพลาดในการโหลดข้อมูล";
            });
        }
    }
}

// 5. กดปุ่ม "ตรวจหาอัปเดต"
async function handleManualCheckUpdate(btn) {
    if (!window.electronAPI || !window.electronAPI.checkForUpdatesManual) return;
    const oldHTML = btn.innerHTML;
    btn.innerHTML = `
        <svg class="w-3.5 h-3.5 text-slate-500 animate-spin" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99"/></svg>
        <span>กำลังตรวจเช็ก...</span>
    `;
    btn.disabled = true;

    try {
        const res = await window.electronAPI.checkForUpdatesManual();
        if (!res.success) {
            alert(res.message || 'ไม่สามารถตรวจสอบได้ในขณะนี้');
        } else if (res.hasUpdate) {
            updateState = 'AVAILABLE';
            pendingUpdateInfo = res;
            renderModalState();
        } else {
            const curVer = document.getElementById('app-version-label')?.innerText || '';
            alert(`ระบบของคุณเป็นเวอร์ชันล่าสุดแล้ว (${curVer})`);
        }
    } catch (e) {
        alert('เกิดข้อผิดพลาดในการตรวจสอบ: ' + (e.message || e));
    } finally {
        btn.disabled = false;
        btn.innerHTML = oldHTML;
    }
}

// 6. กดปุ่ม "อัปเดตตอนนี้"
function handleStartDownload() {
    updateState = 'DOWNLOADING';
    renderModalState();
    if (window.electronAPI && window.electronAPI.startDownloadUpdate) {
        window.electronAPI.startDownloadUpdate();
    }
}

function closeChangelogModal() {
    const modal = document.getElementById('pos-changelog-modal');
    if (modal) modal.classList.add('hidden');
}
document.addEventListener('DOMContentLoaded', initPosSidebar);