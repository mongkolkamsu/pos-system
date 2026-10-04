// public/js/stockInModal.js - ระบบรับสินค้าเข้าสต็อกหลายรายการพร้อมกัน (Batch Stock-In)
let stockInBatchList = [];

function loadStockInModalHTML(container) {
    if (!container) return;
    container.innerHTML += `
    <!-- Modal รับเข้าสต็อกสินค้าหลายรายการพร้อมกัน (สไตล์ iOS Modern Card) -->
    <div id="stock-in-modal" class="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-3 sm:p-5 hidden transition-opacity duration-200">
        <div class="bg-white w-full max-w-3xl rounded-[32px] p-5 sm:p-7 shadow-2xl relative flex flex-col max-h-[90vh] border border-slate-100 animate-in fade-in zoom-in-95 overflow-hidden">
            
            <!-- ส่วนหัว Modal -->
            <div class="flex items-center justify-between pb-3 border-b border-slate-100 flex-shrink-0">
                <div class="flex items-center gap-3">
                    <div class="w-10 h-10 rounded-2xl bg-sky-50 text-sky-600 flex items-center justify-center flex-shrink-0 border border-sky-100 shadow-2xs">
                        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"/>
                        </svg>
                    </div>
                    <div>
                        <h3 class="text-base sm:text-lg font-bold text-slate-900 tracking-tight leading-normal py-0.5">รับสินค้าเข้าสต็อก (หลายรายการ)</h3>
                        <p class="text-[11px] text-slate-400 font-medium leading-normal">สแกนบาร์โค้ดต่อเนื่อง หรือค้นหาเพื่อรวมรายการรับเข้าพร้อมกัน</p>
                    </div>
                </div>
                <button type="button" onclick="closeStockInModal()" title="ปิดหน้าต่าง (Esc)" 
                        class="text-slate-400 hover:text-slate-800 hover:bg-slate-100 w-8 h-8 flex items-center justify-center rounded-full transition active:scale-90 cursor-pointer">
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                </button>
            </div>

            <!-- ช่องค้นหา / สแกนบาร์โค้ดด่วน -->
            <div class="pt-3.5 pb-2 flex-shrink-0 relative z-30">
                <label class="block text-xs font-bold text-slate-700 mb-1.5 leading-normal">สแกนบาร์โค้ด หรือ ค้นหาชื่อสินค้า</label>
                <div class="relative">
                    <input type="text" id="stock-in-search-input" autocomplete="off"
                           placeholder="สแกนบาร์โค้ด หรือพิมพ์ชื่อ... (รองรับตัวคูณ เช่น 10*บาร์โค้ด)" 
                           oninput="handleStockInSearch(this.value)"
                           onkeydown="if(event.key==='Enter') handleStockInBarcodeEnter(event)"
                           class="w-full py-2.5 pl-10 pr-4 bg-slate-50 border-2 border-slate-200 focus:border-sky-500 rounded-2xl text-xs sm:text-sm font-semibold text-slate-800 focus:bg-white focus:outline-none transition shadow-inner leading-relaxed">
                    <svg class="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
                    </svg>

                    <!-- ดรอปดาวน์แนะนำชื่อสินค้า -->
                    <div id="stock-in-dropdown-menu" class="hidden absolute left-0 right-0 mt-1.5 bg-white border border-slate-100 rounded-2xl shadow-xl z-50 overflow-hidden p-1 text-xs">
                        <div id="stock-in-options-list" class="max-h-52 overflow-y-auto space-y-0.5 pr-0.5"></div>
                    </div>
                </div>
            </div>

            <!-- ตารางแสดงรายการสินค้าที่กำลังรับเข้า -->
            <div class="flex-1 min-h-0 bg-slate-50/60 border border-slate-200/80 rounded-2xl overflow-hidden my-2 flex flex-col">
                <div class="overflow-y-auto flex-1 min-h-0 w-full pr-0.5">
                    <table class="w-full text-left border-collapse">
                        <thead class="bg-slate-100/90 text-slate-500 text-[11px] font-bold uppercase tracking-wider sticky top-0 z-10 border-b border-slate-200/80">
                            <tr>
                                <th class="py-2.5 px-3 text-center w-12">#</th>
                                <th class="py-2.5 px-3">รายการสินค้า</th>
                                <th class="py-2.5 px-3 text-center w-28">สต็อกเดิม</th>
                                <th class="py-2.5 px-3 text-center w-40">จำนวนรับเข้า</th>
                                <th class="py-2.5 px-3 text-center w-28">สต็อกใหม่</th>
                                <th class="py-2.5 px-3 text-center w-12"></th>
                            </tr>
                        </thead>
                        <tbody id="stock-in-batch-tbody" class="divide-y divide-slate-100 text-xs text-slate-700 bg-white">
                            <!-- แถวสินค้าจะวาดตรงนี้ -->
                        </tbody>
                    </table>
                </div>
            </div>

            <!-- สรุปผลด้านล่าง + ปุ่มยืนยัน -->
            <div class="pt-3 border-t border-slate-100 flex-shrink-0 space-y-3">
                <div class="flex items-center justify-between text-xs font-semibold px-1">
                    <div class="flex items-center gap-3">
                        <span class="text-slate-500">รวมสินค้า: <b id="stock-in-total-kinds" class="text-slate-800 font-bold">0</b> รายการ</span>
                        <span class="text-slate-300">|</span>
                        <span class="text-slate-500">จำนวนรับเข้ารวม: <b id="stock-in-total-qty" class="text-sky-600 font-black text-sm">0</b> หน่วย</span>
                    </div>
                    <button type="button" onclick="clearStockInBatch()" class="text-rose-500 hover:text-rose-700 hover:underline cursor-pointer text-xs font-bold leading-normal">
                        ล้างรายการทั้งหมด
                    </button>
                </div>

                <div class="pt-0.5">
                    <button type="button" id="btn-submit-batch-stock-in" onclick="submitStockInBatch()" 
                            class="w-full py-3.5 bg-sky-600 hover:bg-sky-700 active:scale-98 text-white font-bold rounded-2xl text-xs sm:text-sm shadow-md shadow-sky-600/25 transition flex items-center justify-center gap-2 cursor-pointer">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7"></path></svg>
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

    // 1. กด Esc เพื่อปิดหน้าต่าง
    if (e.key === 'Escape') {
        e.preventDefault();
        closeStockInModal();
        return;
    }

    // 2. กด Enter ตอนอยู่นอกช่องค้นหา เพื่อยืนยันบันทึก
    if (e.key === 'Enter') {
        const searchInput = document.getElementById('stock-in-search-input');
        if (document.activeElement !== searchInput && stockInBatchList.length > 0) {
            e.preventDefault();
            submitStockInBatch();
        }
    }
});

// 🟢 ค้นหาชื่อสินค้าแบบ Auto-suggest (รองรับแปลงบาร์โค้ดภาษาไทย)
function handleStockInSearch(val) {
    const menu = document.getElementById('stock-in-dropdown-menu');
    const listContainer = document.getElementById('stock-in-options-list');
    if (!menu || !listContainer) return;

    // ⚡ แปลงภาษาไทยเฉพาะส่วนที่เป็นบาร์โค้ด ถ้าเป็นชื่อสินค้าภาษาไทยจะคงเดิมไว้
    let searchVal = val;
    if (typeof checkAndFixThaiBarcode === 'function') {
        searchVal = checkAndFixThaiBarcode(val);
    }

    const normalizeThai = (str) => String(str || '').toLowerCase().replace(/เเ/g, 'แ');
    const cleanKey = normalizeThai(searchVal).trim();

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
        listContainer.innerHTML = '<p class="text-center py-3 text-slate-400 text-xs leading-normal">ไม่พบรายการสินค้า</p>';
    } else {
        listContainer.innerHTML = filtered.slice(0, 10).map(p => {
            const isPack = Boolean(p.parent_id && p.parent_id !== '' && p.parent_id !== 'null');
            return `
                <div onclick="selectStockInProductItem('${p.id}')" 
                     class="flex items-center justify-between p-2 rounded-xl hover:bg-sky-50 cursor-pointer transition select-none">
                    <div class="flex-1 min-w-0 pr-2">
                        <p class="truncate text-xs font-bold text-slate-800 leading-normal py-0.5">${p.name}</p>
                        <p class="text-[10px] text-slate-400 mt-0.5 leading-normal">บาร์โค้ด: ${p.id} ${isPack ? '<span class="text-sky-600 font-bold">(แพ็ค/ลัง)</span>' : ''}</p>
                    </div>
                    <span class="text-[10px] px-2 py-0.5 rounded-lg bg-slate-100 text-slate-600 font-bold whitespace-nowrap leading-normal">
                        เหลือ: ${p.stock_qty} ${p.unit || 'ชิ้น'}
                    </span>
                </div>
            `;
        }).join('');
    }

    menu.classList.remove('hidden');
}

// 🟢 จัดการสแกนบาร์โค้ดผ่านปุ่ม Enter ในช่องค้นหา (รองรับลืมสลับภาษา 100%)
function handleStockInBarcodeEnter(e) {
    e.preventDefault();
    e.stopPropagation();

    const input = document.getElementById('stock-in-search-input');
    const menu = document.getElementById('stock-in-dropdown-menu');

    // ถ้าดรอปดาวน์แนะนำเปิดอยู่ กด Enter จะเลือกสินค้าตัวแรก
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

    // ⚡ 1. แปลงภาษาไทยเป็นตัวเลขอัตโนมัติทันที (แก้ปัญหาลืมเปลี่ยนภาษา ทั้งตัวคูณและบาร์โค้ด)
    if (typeof checkAndFixThaiBarcode === 'function') {
        rawVal = checkAndFixThaiBarcode(rawVal);
    } else if (typeof cleanBarcodeString === 'function') {
        rawVal = cleanBarcodeString(rawVal);
    }

    let qty = 1;
    let barcode = rawVal;

    // ⚡ 2. รองรับสูตรคูณ เช่น 10*บาร์โค้ด
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

// 🟢 วาดตารางแสดงผล
function renderStockInBatchTable() {
    const tbody = document.getElementById('stock-in-batch-tbody');
    const totalKindsEl = document.getElementById('stock-in-total-kinds');
    const totalQtyEl = document.getElementById('stock-in-total-qty');
    if (!tbody) return;

    if (stockInBatchList.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="6" class="py-12 text-center text-slate-400 select-none">
                    <div class="w-12 h-12 mx-auto mb-2 rounded-2xl bg-slate-50 border border-slate-200/60 flex items-center justify-center text-slate-300">
                        <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"/></svg>
                    </div>
                    <p class="text-xs font-bold text-slate-500 leading-normal">ยังไม่มีรายการรับเข้า</p>
                    <p class="text-[11px] text-slate-400 mt-0.5 leading-normal">สแกนบาร์โค้ด หรือพิมพ์ชื่อสินค้าด้านบนเพื่อเริ่มเพิ่มรายการ</p>
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
        const unit = p.unit || 'ชิ้น';

        let oldStock = parseInt(p.stock_qty) || 0;
        let newStock = oldStock + item.qty;
        let notePack = '';

        if (isPack) {
            const parentProd = products.find(parent => String(parent.id).trim() === String(p.parent_id).trim());
            const multiplier = parseInt(p.multiplier) || 1;
            const parentOld = parentProd ? (parseInt(parentProd.stock_qty) || 0) : 0;
            const parentAdd = item.qty * multiplier;
            const parentNew = parentOld + parentAdd;
            const parentUnit = parentProd ? (parentProd.unit || 'ชิ้น') : 'ชิ้น';

            oldStock = parentOld;
            newStock = parentNew;
            notePack = `<span class="block text-[10px] text-sky-600 font-bold mt-0.5 leading-normal">➔ เข้าตัวแม่: +${parentAdd} ${parentUnit}</span>`;
            totalPieces += parentAdd;
        } else {
            totalPieces += item.qty;
        }

        const rawImg = String(p.img || '').trim();
        const imgSrc = (rawImg && !rawImg.includes('placeholder.jpg')) 
            ? (rawImg.startsWith('images/') || rawImg.startsWith('http') || rawImg.startsWith('data:') ? rawImg : `images/${rawImg}`)
            : (window.placeholderSVG || '');

        return `
            <tr class="hover:bg-slate-50/80 transition">
                <td class="py-2.5 px-3 text-center text-xs font-bold text-slate-400 align-middle">
                    ${index + 1}
                </td>
                <td class="py-2.5 px-3 align-middle">
                    <div class="flex items-center gap-2.5 min-w-0">
                        <img src="${imgSrc}" class="w-8 h-8 rounded-lg object-contain bg-white border border-slate-200/80 p-0.5 flex-shrink-0" onerror="this.src=window.placeholderSVG;">
                        <div class="min-w-0 flex-1">
                            <p class="font-bold text-slate-800 text-xs truncate leading-normal py-0.5" title="${p.name}">${p.name}</p>
                            <p class="text-[10px] text-slate-400 mt-0.5 leading-normal">${p.id} ${isPack ? `<span class="text-sky-600 font-bold">(แพ็ค x${p.multiplier})</span>` : ''}</p>
                            ${notePack}
                        </div>
                    </div>
                </td>
                <td class="py-2.5 px-3 text-center align-middle whitespace-nowrap text-xs font-medium text-slate-500 leading-normal">
                    ${oldStock} ${unit}
                </td>
                <td class="py-2.5 px-3 text-center align-middle whitespace-nowrap">
                    <div class="inline-flex items-center gap-1 bg-slate-100 p-0.5 rounded-xl border border-slate-200/80">
                        <button type="button" onclick="updateBatchItemQty('${p.id}', -1)" 
                                class="w-6 h-6 rounded-lg bg-white hover:bg-rose-50 text-slate-600 hover:text-rose-600 font-bold text-xs flex items-center justify-center shadow-2xs transition active:scale-90 cursor-pointer">-</button>
                        <input type="number" min="1" value="${item.qty}" 
                               onchange="setBatchItemQty('${p.id}', this.value)"
                               class="w-12 h-6 text-center text-xs font-black bg-transparent border-none text-slate-900 focus:outline-none">
                        <button type="button" onclick="updateBatchItemQty('${p.id}', 1)" 
                                class="w-6 h-6 rounded-lg bg-white hover:bg-emerald-50 text-slate-600 hover:text-emerald-600 font-bold text-xs flex items-center justify-center shadow-2xs transition active:scale-90 cursor-pointer">+</button>
                    </div>
                </td>
                <td class="py-2.5 px-3 text-center align-middle whitespace-nowrap">
                    <span class="inline-block px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-black rounded-lg leading-normal">
                        ${newStock} ${unit}
                    </span>
                </td>
                <td class="py-2.5 px-3 text-center align-middle">
                    <button type="button" onclick="removeBatchItem('${p.id}')" title="ลบรายการนี้"
                            class="w-7 h-7 rounded-lg hover:bg-rose-50 text-slate-400 hover:text-rose-600 flex items-center justify-center transition active:scale-90 cursor-pointer mx-auto">
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
            <svg class="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M12 4v2m0 12v2m8-8h-2M6 12H4m15.364-6.364l-1.414 1.414M7.05 16.95l-1.414 1.414m12.728 0l-1.414-1.414M7.05 7.05L5.636 5.636"/></svg>
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
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7"></path></svg>
                <span>ยืนยันบันทึกรับเข้าสต็อกทั้งหมด</span>
            `;
        }
    }
}