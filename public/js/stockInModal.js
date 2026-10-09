// public/js/stockInModal.js - ระบบรับสินค้าเข้าสต็อกหลายรายการพร้อมกัน (Clean iOS Edition)
let stockInBatchList = [];

function loadStockInModalHTML(container) {
    if (!container) return;
    container.innerHTML += `
    <!-- Modal รับเข้าสต็อกสินค้าหลายรายการพร้อมกัน (สไตล์ iOS Modern Card) -->
    <div id="stock-in-modal" class="fixed inset-0 bg-slate-900/50 backdrop-blur-md z-50 flex items-center justify-center p-3 sm:p-6 hidden transition-all duration-200">
        <div class="bg-white/95 backdrop-blur-2xl w-full max-w-3xl rounded-[36px] p-5 sm:p-7 shadow-[0_25px_70px_rgba(0,0,0,0.18)] relative flex flex-col max-h-[92vh] border border-white/60 animate-in fade-in zoom-in-95 duration-200 overflow-hidden">
            
            <!-- ส่วนหัว Modal สไตล์ iOS -->
            <div class="flex items-center justify-between pb-3.5 border-b border-slate-100 flex-shrink-0">
                <div class="flex items-center gap-3">
                    <div class="w-11 h-11 rounded-2xl bg-sky-50 text-sky-600 flex items-center justify-center flex-shrink-0 border border-sky-100 shadow-2xs">
                        <svg class="w-5 h-5 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"/>
                        </svg>
                    </div>
                    <div>
                        <h3 class="text-base sm:text-lg font-black text-slate-900 tracking-tight leading-tight flex items-center gap-2">
                            รับสินค้าเข้าสต็อก <span class="text-xs px-2 py-0.5 rounded-full bg-sky-50 text-sky-600 font-bold border border-sky-100">Batch In</span>
                        </h3>
                        <p class="text-[11px] text-slate-400 font-medium mt-0.5">สแกนบาร์โค้ดต่อเนื่อง หรือค้นหาเพื่อรวมรายการรับเข้าพร้อมกัน</p>
                    </div>
                </div>
                <button type="button" onclick="closeStockInModal()" title="ปิดหน้าต่าง (Esc)" 
                        class="w-8 h-8 flex items-center justify-center rounded-full bg-slate-100/80 hover:bg-slate-200 text-slate-400 hover:text-slate-700 transition active:scale-90 cursor-pointer text-sm font-bold">
                    ✕
                </button>
            </div>

            <!-- ช่องค้นหา / สแกนบาร์โค้ดด่วน (iOS Capsule Search พร้อมไอคอน SVG คลีนๆ) -->
            <div class="pt-3.5 pb-2.5 flex-shrink-0 relative z-30">
                <div class="relative">
                    <svg class="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
                    </svg>
                    <input type="text" id="stock-in-search-input" autocomplete="off"
                           placeholder="สแกนบาร์โค้ด หรือพิมพ์ชื่อสินค้า... (เช่น 10*บาร์โค้ด)" 
                           oninput="handleStockInSearch(this.value)"
                           onkeydown="if(event.key==='Enter') handleStockInBarcodeEnter(event)"
                           class="w-full py-3 pl-11 pr-4 bg-slate-100/80 border border-slate-200/80 focus:border-sky-500 focus:bg-white rounded-2xl text-xs sm:text-sm font-semibold text-slate-800 focus:outline-none transition shadow-inner">

                    <!-- ดรอปดาวน์แนะนำชื่อสินค้า -->
                    <div id="stock-in-dropdown-menu" class="hidden absolute left-0 right-0 mt-2 bg-white/95 backdrop-blur-xl border border-slate-200/80 rounded-3xl shadow-2xl z-50 overflow-hidden p-1.5 text-xs">
                        <div id="stock-in-options-list" class="max-h-52 overflow-y-auto space-y-1 pr-0.5"></div>
                    </div>
                </div>
            </div>

            <!-- ตารางแสดงรายการรับเข้า (ไร้อิโมจิส่วนเกิน คลีนตา) -->
            <div class="flex-1 min-h-0 bg-slate-50/70 border border-slate-200/70 rounded-3xl overflow-hidden my-1 flex flex-col shadow-inner">
                <div class="overflow-y-auto flex-1 min-h-0 w-full p-2">
                    <table class="w-full text-left border-collapse">
                        <thead class="text-slate-400 text-[11px] font-bold uppercase tracking-wider sticky top-0 bg-slate-50/90 backdrop-blur-xs z-10 select-none">
                            <tr>
                                <th class="py-2.5 px-3 text-center w-10">#</th>
                                <th class="py-2.5 px-3">รายการสินค้า</th>
                                <th class="py-2.5 px-3 text-center w-28">สต็อกเดิม</th>
                                <th class="py-2.5 px-3 text-center w-36">จำนวนรับเข้า</th>
                                <th class="py-2.5 px-3 text-center w-28">สต็อกใหม่</th>
                                <th class="py-2.5 px-3 text-center w-10"></th>
                            </tr>
                        </thead>
                        <tbody id="stock-in-batch-tbody" class="space-y-1.5 text-xs text-slate-700">
                            <!-- แถวสินค้าจะวาดตรงนี้ -->
                        </tbody>
                    </table>
                </div>
            </div>

            <!-- สรุปผลด้านล่าง + ปุ่มยืนยัน -->
            <div class="pt-3 border-t border-slate-100 flex-shrink-0 space-y-2.5">
                <div class="flex items-center justify-between text-xs px-2">
                    <div class="flex items-center gap-2 font-semibold text-slate-600">
                        <span>รวม <b id="stock-in-total-kinds" class="text-slate-900 font-bold">0</b> รายการ</span>
                        <span class="text-slate-300">|</span>
                        <span>ยอดรับเข้ารวม <b id="stock-in-total-qty" class="text-sky-600 font-black text-sm">0</b> ชิ้น</span>
                    </div>
                    <button type="button" onclick="clearStockInBatch()" class="text-rose-500 hover:text-rose-600 active:scale-95 text-xs font-bold transition cursor-pointer">
                        ล้างรายการทั้งหมด
                    </button>
                </div>

                <div>
                    <button type="button" id="btn-submit-batch-stock-in" onclick="submitStockInBatch()" 
                            class="w-full py-4 bg-sky-600 hover:bg-sky-700 active:scale-[0.99] text-white font-bold rounded-2xl text-sm shadow-md shadow-sky-600/25 transition-all flex items-center justify-center gap-2 cursor-pointer">
                        <svg class="w-4 h-4 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7"/></svg>
                        <span>ยืนยันบันทึกรับเข้าสต็อกทั้งหมด</span>
                    </button>
                </div>
            </div>

        </div>
    </div>
    `;
}

// 🟢 ฟังก์ชันเปิด-ปิด Modal
function openStockInModal() {
    const modal = document.getElementById('stock-in-modal');
    if (!modal) return;

    stockInBatchList = [];
    renderStockInBatchTable();

    const searchInput = document.getElementById('stock-in-search-input');
    if (searchInput) searchInput.value = '';

    modal.classList.remove('hidden');
    setTimeout(() => {
        if (searchInput) searchInput.focus();
    }, 60);
}

function closeStockInModal() {
    const modal = document.getElementById('stock-in-modal');
    if (!modal) return;
    modal.classList.add('hidden');
    const menu = document.getElementById('stock-in-dropdown-menu');
    if (menu) menu.classList.add('hidden');
    stockInBatchList = [];
    if (typeof refocusBarcode === 'function') refocusBarcode();
}

// 🌟 ระบบดักปุ่มลัดระดับ Global สำหรับ Modal รับสต็อก
document.addEventListener('keydown', (e) => {
    const modal = document.getElementById('stock-in-modal');
    if (!modal || modal.classList.contains('hidden')) return;

    if (e.key === 'Escape') {
        e.preventDefault();
        closeStockInModal();
        return;
    }

    if (e.key === 'Enter') {
        const searchInput = document.getElementById('stock-in-search-input');
        if (document.activeElement !== searchInput && stockInBatchList.length > 0) {
            e.preventDefault();
            submitStockInBatch();
        }
    }
});

// 🟢 ค้นหาชื่อสินค้าแบบ Auto-suggest (พิมพ์ไทยปกติได้ ไม่แปลงเพี้ยน)
function handleStockInSearch(val) {
    const menu = document.getElementById('stock-in-dropdown-menu');
    const listContainer = document.getElementById('stock-in-options-list');
    if (!menu || !listContainer) return;

    const normalizeThai = (str) => String(str || '').toLowerCase().replace(/เเ/g, 'แ');
    const cleanKey = normalizeThai(val).trim();

    if (!cleanKey || cleanKey.includes('*')) {
        menu.classList.add('hidden');
        return;
    }

    const products = (typeof localProductsCache !== 'undefined') ? localProductsCache : [];
    const filtered = products.filter(p => {
        const matchName = normalizeThai(p.name).includes(cleanKey);
        const matchBarcode = String(p.id || '').toLowerCase().includes(cleanKey);
        return matchName || matchBarcode;
    });

    if (filtered.length === 0) {
        listContainer.innerHTML = '<p class="text-center py-4 text-slate-400 text-xs font-semibold">ไม่พบสินค้าที่ค้นหา</p>';
    } else {
        listContainer.innerHTML = filtered.slice(0, 8).map(p => {
            const isPack = Boolean(p.parent_id && p.parent_id !== '' && p.parent_id !== 'null');
            return `
                <div onclick="selectStockInProductItem('${p.id}')" 
                     class="flex items-center justify-between p-2.5 rounded-2xl hover:bg-sky-50 active:scale-[0.99] cursor-pointer transition select-none border border-transparent hover:border-sky-100">
                    <div class="flex-1 min-w-0 pr-2">
                        <p class="truncate text-xs font-bold text-slate-800">${p.name}</p>
                        <p class="text-[10px] text-slate-400 mt-0.5 font-mono">บาร์โค้ด: ${p.id} ${isPack ? '<span class="text-sky-600 font-bold bg-sky-50 px-1.5 py-0.5 rounded-md">(แพ็ค/ลัง)</span>' : ''}</p>
                    </div>
                    <span class="text-[11px] px-2.5 py-1 rounded-xl bg-slate-100 text-slate-600 font-bold whitespace-nowrap">
                        ${p.stock_qty} ${p.unit || 'ชิ้น'}
                    </span>
                </div>
            `;
        }).join('');
    }

    menu.classList.remove('hidden');
}

// 🟢 จัดการสแกนบาร์โค้ดผ่าน Enter (แปลงตัวหนังสือแป้นไทยเป็นตัวเลขอัตโนมัติในช่อง เหมือน app.js)
function handleStockInBarcodeEnter(e) {
    e.preventDefault();
    e.stopPropagation();

    const input = document.getElementById('stock-in-search-input');
    const menu = document.getElementById('stock-in-dropdown-menu');

    if (menu && !menu.classList.contains('hidden')) {
        const firstOption = menu.querySelector('#stock-in-options-list > div');
        if (firstOption) {
            firstOption.click();
            return;
        }
    }

    let rawVal = input ? input.value.trim() : '';

    if (!rawVal) {
        if (stockInBatchList.length > 0) {
            submitStockInBatch();
        }
        return;
    }

    // ⚡ แปลงแป้นภาษาไทยเป็นตัวเลขทันที และสะท้อนลงใน input เหมือนหน้า app.js
    if (typeof checkAndFixThaiBarcode === 'function') {
        const converted = checkAndFixThaiBarcode(rawVal);
        if (converted !== rawVal) {
            rawVal = converted;
            if (input) input.value = converted;
        }
    } else if (typeof cleanBarcodeString === 'function') {
        rawVal = cleanBarcodeString(rawVal);
    }

    let qty = 1;
    let barcode = rawVal;

    // รองรับสูตรคูณ เช่น 10*บาร์โค้ด
    if (rawVal.includes('*')) {
        const parts = rawVal.split('*');
        const parsed = parseInt(parts[0], 10);
        if (!isNaN(parsed) && parsed > 0 && parts[1]) {
            qty = parsed;
            barcode = parts[1].trim();
        }
    }

    const cleanCode = (typeof cleanBarcodeString === 'function') ? cleanBarcodeString(barcode) : barcode;
    const products = (typeof localProductsCache !== 'undefined') ? localProductsCache : [];
    const prod = products.find(p => String(p.id).trim() === barcode || String(p.id).trim() === cleanCode);

    if (prod) {
        addProductToBatch(prod, qty);
        input.value = '';
        if (menu) menu.classList.add('hidden');
        input.focus();
    } else {
        if (typeof showCustomModal === 'function') {
            showCustomModal('warning', 'ไม่พบสินค้า', `ไม่พบสินค้ารหัส "${barcode}" ในระบบ`);
        }
    }
}

// 🟢 เลือกสินค้าจาก Dropdown
function selectStockInProductItem(productId) {
    const products = (typeof localProductsCache !== 'undefined') ? localProductsCache : [];
    const prod = products.find(p => String(p.id).trim() === String(productId).trim());
    if (!prod) return;

    addProductToBatch(prod, 1);

    const input = document.getElementById('stock-in-search-input');
    if (input) {
        input.value = '';
        input.focus();
    }
    const menu = document.getElementById('stock-in-dropdown-menu');
    if (menu) menu.classList.add('hidden');
}

// 🟢 เพิ่มสินค้าลงตาราง Batch
function addProductToBatch(prod, addQty = 1) {
    const existing = stockInBatchList.find(item => String(item.product.id).trim() === String(prod.id).trim());
    if (existing) {
        existing.qty += addQty;
    } else {
        stockInBatchList.unshift({
            product: prod,
            qty: addQty
        });
    }
    renderStockInBatchTable();
}

// 🟢 อัปเดตจำนวนในตาราง
function updateBatchItemQty(productId, delta) {
    const item = stockInBatchList.find(i => String(i.product.id).trim() === String(productId).trim());
    if (!item) return;

    item.qty = Math.max(1, item.qty + delta);
    renderStockInBatchTable();
}

function setBatchItemQty(productId, value) {
    const item = stockInBatchList.find(i => String(i.product.id).trim() === String(productId).trim());
    if (!item) return;

    const parsed = parseInt(value, 10);
    item.qty = isNaN(parsed) || parsed < 1 ? 1 : parsed;
    renderStockInBatchTable();
}

function removeBatchItem(productId) {
    stockInBatchList = stockInBatchList.filter(i => String(i.product.id).trim() !== String(productId).trim());
    renderStockInBatchTable();
}

function clearStockInBatch() {
    if (stockInBatchList.length === 0) return;
    stockInBatchList = [];
    renderStockInBatchTable();
}

// 🟢 วาดตารางแสดงผลสไตล์ iOS Cards (คลีน สวยงาม)
function renderStockInBatchTable() {
    const tbody = document.getElementById('stock-in-batch-tbody');
    const totalKindsEl = document.getElementById('stock-in-total-kinds');
    const totalQtyEl = document.getElementById('stock-in-total-qty');
    if (!tbody) return;

    if (stockInBatchList.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="6" class="py-14 text-center select-none">
                    <div class="w-14 h-14 mx-auto mb-2.5 rounded-2xl bg-white shadow-xs border border-slate-200/60 flex items-center justify-center text-slate-300">
                        <svg class="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"/></svg>
                    </div>
                    <p class="text-sm font-bold text-slate-700">ยังไม่มีรายการรับเข้า</p>
                    <p class="text-xs text-slate-400 mt-0.5 font-medium">สแกนบาร์โค้ด หรือพิมพ์ชื่อสินค้าด้านบนเพื่อเริ่มรวมรายการ</p>
                </td>
            </tr>
        `;
        if (totalKindsEl) totalKindsEl.innerText = '0';
        if (totalQtyEl) totalQtyEl.innerText = '0';
        return;
    }

    const products = (typeof localProductsCache !== 'undefined') ? localProductsCache : [];
    let totalPieces = 0;

    tbody.innerHTML = stockInBatchList.map((item, index) => {
        const p = item.product;
        const isPack = Boolean(p.parent_id && p.parent_id !== '' && p.parent_id !== 'null');
        
        let oldStockText = '';
        let newStockText = '';
        let notePack = '';

        if (isPack) {
            const parentProd = products.find(parent => String(parent.id).trim() === String(p.parent_id).trim());
            const multiplier = parseInt(p.multiplier) || 1;
            const parentUnit = parentProd ? (parentProd.unit || 'ชิ้น') : 'ชิ้น';
            const packUnit = p.unit || 'แพ็ค';
            const parentName = parentProd ? parentProd.name : 'สินค้ารายการหลัก';

            const parentOld = parentProd ? (parseInt(parentProd.stock_qty) || 0) : 0;
            const parentAdd = item.qty * multiplier;
            const parentNew = parentOld + parentAdd;

            const oldPacks = Math.floor(parentOld / multiplier);
            const newPacks = Math.floor(parentNew / multiplier);

            oldStockText = `<div><b class="text-slate-800">${parentOld}</b> ${parentUnit}</div><div class="text-[10px] text-slate-400 font-bold">(${oldPacks} ${packUnit})</div>`;
            newStockText = `<div><b class="text-emerald-700 font-black">${parentNew}</b> ${parentUnit}</div><div class="text-[10px] text-emerald-600 font-bold">(${newPacks} ${packUnit})</div>`;
            
            notePack = `<span class="inline-flex items-center gap-1 text-[10px] text-sky-600 font-bold mt-1 bg-sky-50 px-2 py-0.5 rounded-lg border border-sky-100">➔ เข้าสต็อก ${parentName}: +${parentAdd} ${parentUnit}</span>`;
            totalPieces += parentAdd;
        } else {
            const unit = p.unit || 'ชิ้น';
            const oldStock = parseInt(p.stock_qty) || 0;
            const newStock = oldStock + item.qty;

            oldStockText = `<span class="text-slate-700 font-bold">${oldStock} ${unit}</span>`;
            newStockText = `<span class="text-emerald-700 font-black">${newStock} ${unit}</span>`;
            totalPieces += item.qty;
        }

        const rawImg = String(p.img || '').trim();
        const imgSrc = (rawImg && !rawImg.includes('placeholder.jpg')) 
            ? (rawImg.startsWith('images/') || rawImg.startsWith('http') || rawImg.startsWith('data:') ? rawImg : `images/${rawImg}`)
            : (window.placeholderSVG || '');

        return `
            <tr class="bg-white rounded-2xl border border-slate-200/70 shadow-2xs hover:shadow-xs transition">
                <td class="py-3 px-3 text-center text-xs font-black text-slate-400 align-middle">
                    ${index + 1}
                </td>
                <td class="py-3 px-3 align-middle">
                    <div class="flex items-center gap-3 min-w-0">
                        <img src="${imgSrc}" class="w-9 h-9 rounded-xl object-contain bg-slate-50 border border-slate-100 p-0.5 flex-shrink-0 shadow-2xs" onerror="this.src=window.placeholderSVG;">
                        <div class="min-w-0 flex-1">
                            <p class="font-extrabold text-slate-800 text-xs truncate" title="${p.name}">${p.name}</p>
                            <p class="text-[10px] text-slate-400 font-mono mt-0.5">${p.id}${isPack ? `<span class="text-sky-600 font-bold">(${p.unit || 'แพ็ค'} x${p.multiplier})</span>` : ''}</p>                            
                            ${notePack}
                        </div>
                    </div>
                </td>
                <td class="py-3 px-3 text-center align-middle whitespace-nowrap text-xs font-semibold leading-tight">
                    ${oldStockText}
                </td>
                <td class="py-3 px-3 text-center align-middle whitespace-nowrap">
                    <div class="inline-flex items-center gap-1 bg-slate-100/90 p-1 rounded-2xl border border-slate-200/60">
                        <button type="button" onclick="updateBatchItemQty('${p.id}', -1)" 
                                class="w-6 h-6 rounded-xl bg-white hover:bg-rose-50 text-slate-600 hover:text-rose-600 font-bold text-xs flex items-center justify-center shadow-2xs transition active:scale-90 cursor-pointer">-</button>
                        <input type="number" min="1" value="${item.qty}" 
                               onchange="setBatchItemQty('${p.id}', this.value)"
                               class="w-12 h-6 text-center text-xs font-black bg-transparent border-none text-slate-900 focus:outline-none">
                        <button type="button" onclick="updateBatchItemQty('${p.id}', 1)" 
                                class="w-6 h-6 rounded-xl bg-white hover:bg-emerald-50 text-slate-600 hover:text-emerald-600 font-bold text-xs flex items-center justify-center shadow-2xs transition active:scale-90 cursor-pointer">+</button>
                    </div>
                    <span class="text-[11px] font-bold text-slate-500 ml-1.5">${p.unit || 'แพ็ค'}</span>
                </td>
                <td class="py-3 px-3 text-center align-middle whitespace-nowrap">
                    <div class="inline-block px-3 py-1 bg-emerald-50 border border-emerald-200/80 text-xs rounded-xl shadow-2xs">
                        ${newStockText}
                    </div>
                </td>
                <td class="py-3 px-3 text-center align-middle">
                    <button type="button" onclick="removeBatchItem('${p.id}')" title="ลบรายการนี้"
                            class="w-7 h-7 rounded-xl hover:bg-rose-50 text-slate-300 hover:text-rose-600 flex items-center justify-center transition active:scale-90 cursor-pointer mx-auto text-xs font-bold">
                        ✕
                    </button>
                </td>
            </tr>
        `;
    }).join('');

    if (totalKindsEl) totalKindsEl.innerText = stockInBatchList.length;
    if (totalQtyEl) totalQtyEl.innerText = totalPieces.toLocaleString();
}

// 🟢 ส่งข้อมูลบันทึกทั้งหมดเข้าฐานข้อมูล
async function submitStockInBatch() {
    if (stockInBatchList.length === 0) {
        if (typeof showCustomModal === 'function') {
            showCustomModal('warning', 'ไม่มีรายการสินค้า', 'กรุณาสแกนหรือเลือกสินค้าที่ต้องการรับเข้าสต็อกก่อนกดยืนยัน');
        }
        return;
    }

    const btnSubmit = document.getElementById('btn-submit-batch-stock-in');
    if (btnSubmit) {
        btnSubmit.disabled = true;
        btnSubmit.innerHTML = `
            <svg class="w-4 h-4 animate-spin inline-block mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M12 4v2m0 12v2m8-8h-2M6 12H4m15.364-6.364l-1.414 1.414M7.05 16.95l-1.414 1.414m12.728 0l-1.414-1.414M7.05 7.05L5.636 5.636"/></svg>
            <span>กำลังบันทึกข้อมูล...</span>
        `;
    }

    try {
        const requests = stockInBatchList.map(item => {
            return fetch('/api/products/stock-in', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    id: item.product.id,
                    qty: item.qty
                })
            }).then(r => r.json());
        });

        const results = await Promise.all(requests);
        const hasFailed = results.some(r => !r.success);

        if (!hasFailed) {
            const savedCount = stockInBatchList.length;
            closeStockInModal();

            if (typeof getStoredProducts === 'function') await getStoredProducts();
            if (typeof filterCategory === 'function') filterCategory(currentCategory);

            if (typeof showCustomModal === 'function') {
                await showCustomModal(
                    'success',
                    'รับสินค้าเข้าสำเร็จ!',
                    `บันทึกรับสต็อกครบทั้ง <b>${savedCount} รายการ</b> เข้าสู่ระบบเรียบร้อยแล้ว`
                );
            }
        } else {
            if (typeof showCustomModal === 'function') {
                showCustomModal('warning', 'เกิดข้อผิดพลาดบางรายการ', 'มีสินค้าบางรายการไม่สามารถบันทึกได้ โปรดตรวจสอบอีกครั้ง');
            }
        }
    } catch (e) {
        console.error('Batch Stock-In Error:', e);
        if (typeof showCustomModal === 'function') {
            showCustomModal('warning', 'เกิดข้อผิดพลาด', 'ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์ได้');
        }
    } finally {
        if (btnSubmit) {
            btnSubmit.disabled = false;
            btnSubmit.innerHTML = `
                <svg class="w-4 h-4 pointer-events-none inline-block mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7"/></svg>
                <span>ยืนยันบันทึกรับเข้าสต็อกทั้งหมด</span>
            `;
        }
    }
}