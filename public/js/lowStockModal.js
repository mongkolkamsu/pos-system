// ==========================================
// ระบบตรวจสอบสต็อกและรายการสินค้าที่ต้องสั่งซื้อ (Dynamic Min/Max Stock)
// ==========================================

let currentLowStockSearch = '';
let currentLowStockCategory = 'all';
let currentLowStockStatus = 'need_buy'; // need_buy | out | low | normal | all_store | selected
let selectedLowStockIds = new Set();
let lowStockSearchDebounceTimer = null;

// ดึง key_name ของหมวดหมู่ "ยังไม่มีในร้าน"
function getExcludedCategoryKeys() {
    const cats = (typeof localCategoriesCache !== 'undefined' && localCategoriesCache.length > 0) ? localCategoriesCache : [];
    return new Set(cats.filter(c => c.label_name && c.label_name.trim() === 'ยังไม่มีในร้าน').map(c => c.key_name));
}

function cleanBarcodeThai(input) {
    if (!input) return '';
    const thaiToNumMap = {
        'ๅ': '1', '+': '1', 'ุ': '6', 'ู': '6',
        '/': '2', '๑': '2', 'ก': '2', 'ึ': '7', '฿': '7',
        '-': '3', '๒': '3', 'ค': '8', '๕': '8',
        'ภ': '4', '๓': '4', 'ต': '9', '๖': '9',
        'ถ': '5', '๔': '5', 'ด': '5', 'จ': '0', '๗': '0', 'ว': '0', '๐': '0',
        'ข': '-', '๘': '-', 'ช': '=', '๙': '='
    };
    let converted = '';
    const str = String(input).trim();
    for (let char of str) {
        converted += thaiToNumMap[char] !== undefined ? thaiToNumMap[char] : char;
    }
    return converted.replace(/[^0-9a-zA-Z_.-]/g, '');
}

function getStockMap(allProducts) {
    const stockMap = new Map();
    allProducts.forEach(p => stockMap.set(String(p.id).trim(), parseInt(p.stock_qty) || 0));
    return stockMap;
}

function getEffectiveStockFast(item, stockMap) {
    if (!item) return 0;
    if (item.parent_id && item.parent_id !== '' && item.parent_id !== 'null') {
        const parentStock = stockMap.get(String(item.parent_id).trim()) || 0;
        const multiplier = parseInt(item.multiplier) > 0 ? parseInt(item.multiplier) : 1;
        return Math.floor(parentStock / multiplier);
    }
    return parseInt(item.stock_qty) || 0;
}

function getFilteredLowStockList() {
    const allProducts = (typeof localProductsCache !== 'undefined' && localProductsCache.length > 0) ? localProductsCache : [];
    if (allProducts.length === 0) return [];

    const stockMap = getStockMap(allProducts);
    const excludedCats = getExcludedCategoryKeys(); // ⭐️ ดึงหมวดที่ต้องยกเว้น
    const normalizeThai = (str) => String(str || '').toLowerCase().replace(/เเ/g, 'แ');
    const cleanSearch = normalizeThai(currentLowStockSearch).trim();

    let list = allProducts.filter(p => {
        // ⭐️ ข้ามสินค้าในหมวด "ยังไม่มีในร้าน" ทันที
        if (excludedCats.has(p.category)) return false;

        const stock = getEffectiveStockFast(p, stockMap);
        const minStock = (p.min_stock !== undefined && p.min_stock !== null) ? parseInt(p.min_stock) : 5;

        if (currentLowStockStatus === 'need_buy' && stock > minStock) return false;
        if (currentLowStockStatus === 'out' && stock > 0) return false;
        if (currentLowStockStatus === 'low' && (stock <= 0 || stock > minStock)) return false;
        if (currentLowStockStatus === 'normal' && stock <= minStock) return false;
        if (currentLowStockStatus === 'selected' && !selectedLowStockIds.has(String(p.id).trim())) return false;

        if (currentLowStockCategory !== 'all' && p.category !== currentLowStockCategory) return false;

        if (cleanSearch) {
            const matchName = normalizeThai(p.name).includes(cleanSearch);
            const matchBarcode = String(p.id || '').toLowerCase().includes(cleanSearch);
            if (!matchName && !matchBarcode) return false;
        }

        return true;
    });

    list.sort((a, b) => getEffectiveStockFast(a, stockMap) - getEffectiveStockFast(b, stockMap));
    return list;
}

// อัปเดตตัวเลขนับจำนวนหัวข้อตามค่า Min Stock จริง
function updateLowStockHeaderCounts() {
    const allProducts = (typeof localProductsCache !== 'undefined' && localProductsCache.length > 0) ? localProductsCache : [];
    const stockMap = getStockMap(allProducts);
    const excludedCats = getExcludedCategoryKeys();

    let totalLow = 0;
    let outCount = 0;
    let activeProductsCount = 0;

    allProducts.forEach(p => {
        // ⭐️ ข้ามสินค้าในหมวด "ยังไม่มีในร้าน"
        if (excludedCats.has(p.category)) return;

        activeProductsCount++;
        const st = getEffectiveStockFast(p, stockMap);
        const minSt = (p.min_stock !== undefined && p.min_stock !== null) ? parseInt(p.min_stock) : 5;
        if (st <= minSt) {
            totalLow++;
            if (st <= 0) outCount++;
        }
    });

    const lowCount = totalLow - outCount;
    const normalCount = activeProductsCount - totalLow;

    const subtitleEl = document.getElementById('low-stock-subtitle');
    if (subtitleEl) {
        subtitleEl.innerHTML = `ต้องซื้อเพิ่ม <span class="font-bold text-rose-600">${totalLow}</span> รายการ (หมด ${outCount} / ใกล้หมด ${lowCount}) · สต็อกปกติ ${normalCount} · ทั้งร้าน ${activeProductsCount}`;
    }
}
async function openLowStockModal() {
    let container = document.getElementById('low-stock-modal-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'low-stock-modal-container';
        document.body.appendChild(container);
    }

    const categories = (typeof localCategoriesCache !== 'undefined' && localCategoriesCache.length > 0) 
        ? localCategoriesCache 
        : (typeof getStoredCategories === 'function' ? await getStoredCategories() : []);

    const allProducts = (typeof localProductsCache !== 'undefined' && localProductsCache.length > 0) 
        ? localProductsCache 
        : (typeof getStoredProducts === 'function' ? await getStoredProducts() : []);

    const stockMap = getStockMap(allProducts); // ⭐️ เพิ่มบรรทัดนี้
    const excludedCats = getExcludedCategoryKeys();
    let totalLow = 0;
    let outCount = 0;
    let activeProductsCount = 0;

    allProducts.forEach(p => {
        if (excludedCats.has(p.category)) return;

        activeProductsCount++;
        const st = getEffectiveStockFast(p, stockMap);
        const minSt = (p.min_stock !== undefined && p.min_stock !== null) ? parseInt(p.min_stock) : 5;
        if (st <= minSt) {
            totalLow++;
            if (st <= 0) outCount++;
        }
    });

    const lowCount = totalLow - outCount;
    const normalCount = activeProductsCount - totalLow;

    container.innerHTML = `
    <div id="low-stock-modal" class="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
        <div class="bg-white w-full max-w-6xl p-6 sm:p-7 rounded-3xl shadow-2xl space-y-4 border border-slate-100 max-h-[92vh] flex flex-col animate-in fade-in zoom-in-95">
            
            <div class="flex items-center justify-between border-b border-slate-100 pb-3.5 flex-shrink-0">
                <div class="flex items-center gap-3">
                    <div class="w-11 h-11 bg-rose-50 text-rose-600 rounded-2xl flex items-center justify-center border border-rose-100 shadow-2xs">
                        <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"/>
                        </svg>
                    </div>
                    <div>
                        <h3 class="text-lg sm:text-xl font-bold text-slate-800 leading-tight">จัดการสต็อกและรายการสั่งซื้อสินค้า</h3>
                        <p id="low-stock-subtitle" class="text-xs sm:text-sm text-slate-500 mt-0.5">
                            ต้องซื้อเพิ่ม <span class="font-bold text-rose-600">${totalLow}</span> รายการ (หมด ${outCount} / ใกล้หมด ${lowCount}) · สต็อกปกติ ${normalCount} · ทั้งร้าน ${allProducts.length}
                        </p>
                    </div>
                </div>
                <button type="button" onclick="closeLowStockModal()" title="ปิดหน้าต่าง" class="text-slate-400 hover:text-slate-800 hover:bg-slate-100 w-8 h-8 flex items-center justify-center rounded-full transition cursor-pointer">
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
                </button>
            </div>

            <div class="flex flex-col gap-2.5 flex-shrink-0">
                <div class="flex flex-col sm:flex-row items-center gap-2.5">
                    <div class="relative flex-1 w-full">
                        <input type="text" id="low-stock-search-input" value="${currentLowStockSearch}" 
                               oninput="handleLowStockSearch(this.value)" 
                               placeholder="ค้นหาชื่อสินค้า หรือ สแกนรหัสบาร์โค้ด..." 
                               class="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-semibold text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-rose-500 shadow-2xs transition">
                        <svg class="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
                        </svg>
                    </div>

                    <div class="relative w-full sm:w-48 flex-shrink-0">
                        <button type="button" id="low-stock-cat-btn" onclick="toggleLowStockCatDropdown()" 
                                class="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-semibold text-slate-700 focus:bg-white focus:outline-none focus:ring-2 focus:ring-rose-500 shadow-2xs transition flex items-center justify-between cursor-pointer">
                            <span id="low-stock-cat-label" class="truncate">
                                ${currentLowStockCategory === 'all' ? 'ทุกหมวดหมู่สินค้า' : (categories.find(c => c.key_name === currentLowStockCategory)?.label_name || 'ทุกหมวดหมู่สินค้า')}
                            </span>
                            <svg id="low-stock-cat-arrow" class="w-3.5 h-3.5 text-slate-400 transition-transform duration-200 flex-shrink-0 ml-1 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path>
                            </svg>
                        </button>

                        <div id="low-stock-cat-menu" class="hidden absolute left-0 right-0 mt-1 bg-white border border-slate-100 rounded-2xl shadow-xl z-30 overflow-hidden py-1 text-xs sm:text-sm max-h-48 overflow-y-auto">
                            <div onclick="selectLowStockCat('all', 'ทุกหมวดหมู่สินค้า')" class="px-3.5 py-2 hover:bg-rose-50 text-slate-700 font-semibold cursor-pointer transition">
                                ทุกหมวดหมู่สินค้า
                            </div>
                            ${categories.map(c => `
                                <div onclick="selectLowStockCat('${c.key_name}', '${c.label_name}')" class="px-3.5 py-2 hover:bg-rose-50 text-slate-700 cursor-pointer transition">
                                    ${c.label_name}
                                </div>
                            `).join('')}
                        </div>
                    </div>
                </div>

                <div class="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl w-full flex-wrap">
                    <button type="button" onclick="setLowStockStatusFilter('need_buy', this)" class="status-pill px-3 py-1.5 rounded-lg text-xs font-bold ${currentLowStockStatus === 'need_buy' ? 'bg-white text-slate-800 shadow-2xs' : 'text-slate-500 hover:text-slate-800'} transition cursor-pointer">
                        ของต้องซื้อ (${totalLow})
                    </button>
                    <button type="button" onclick="setLowStockStatusFilter('out', this)" class="status-pill px-3 py-1.5 rounded-lg text-xs font-bold ${currentLowStockStatus === 'out' ? 'bg-rose-500 text-white shadow-2xs' : 'text-slate-500 hover:text-slate-800'} transition cursor-pointer">
                        เฉพาะของหมด (${outCount})
                    </button>
                    <button type="button" onclick="setLowStockStatusFilter('low', this)" class="status-pill px-3 py-1.5 rounded-lg text-xs font-bold ${currentLowStockStatus === 'low' ? 'bg-amber-500 text-white shadow-2xs' : 'text-slate-500 hover:text-slate-800'} transition cursor-pointer">
                        เฉพาะใกล้หมด (${lowCount})
                    </button>
                    <button type="button" onclick="setLowStockStatusFilter('normal', this)" class="status-pill px-3 py-1.5 rounded-lg text-xs font-bold ${currentLowStockStatus === 'normal' ? 'bg-emerald-600 text-white shadow-2xs' : 'text-slate-500 hover:text-slate-800'} transition cursor-pointer">
                        สต็อกปกติ (${normalCount})
                    </button>
                    <button type="button" onclick="setLowStockStatusFilter('all_store', this)" class="status-pill px-3 py-1.5 rounded-lg text-xs font-bold ${currentLowStockStatus === 'all_store' ? 'bg-slate-800 text-white shadow-2xs' : 'text-slate-500 hover:text-slate-800'} transition cursor-pointer">
                        สินค้าทั้งร้าน (${allProducts.length})
                    </button>
                    <button type="button" id="btn-status-selected" onclick="setLowStockStatusFilter('selected', this)" class="status-pill px-3 py-1.5 rounded-lg text-xs font-bold ${currentLowStockStatus === 'selected' ? 'bg-blue-600 text-white shadow-2xs' : 'text-slate-500 hover:text-slate-800'} transition cursor-pointer">
                        เฉพาะที่เลือกไว้ (${selectedLowStockIds.size})
                    </button>
                </div>
            </div>

            <div class="overflow-y-auto flex-1 border border-slate-100 rounded-2xl">
                <table class="w-full text-left border-collapse min-w-[750px]">
                    <thead class="bg-slate-50 text-slate-600 text-xs sm:text-sm font-bold sticky top-0 border-b border-slate-200/80 z-10">
                        <tr>
                            <th class="p-3.5 text-center w-12">
                                <input type="checkbox" id="check-all-low-stock" onchange="toggleSelectAllLowStock(this.checked)" 
                                       class="w-4 h-4 rounded text-rose-600 focus:ring-rose-500 border-slate-300 cursor-pointer">
                            </th>
                            <th class="p-3.5">ชื่อสินค้า</th>
                            <th class="p-3.5 text-center w-36">สถานะสต็อก</th>
                            <th class="p-3.5 text-center w-80">เติมสต็อกด่วน / กำหนดเอง</th>
                        </tr>
                    </thead>
                    <tbody id="low-stock-table-body" class="divide-y divide-slate-100"></tbody>
                </table>
            </div>

            <div class="pt-2 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-2.5 flex-shrink-0">
                <div class="text-xs sm:text-sm text-slate-500 font-medium">
                    กำลังแสดง <span id="showing-low-count" class="font-bold text-slate-800">0</span> รายการ 
                    (เลือกไว้ <span id="selected-low-count" class="font-bold text-rose-600">${selectedLowStockIds.size}</span> รายการ)
                </div>

                <div class="w-full sm:w-auto">
                    <button type="button" id="btn-print-low-stock" onclick="printLowStockReport()" 
                            class="w-full sm:w-auto px-6 py-2.5 bg-slate-900 hover:bg-black active:scale-95 text-white rounded-xl text-xs sm:text-sm font-bold transition flex items-center justify-center gap-2 cursor-pointer shadow-sm">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"/></svg>
                        <span id="print-btn-label">พิมพ์ใบสั่งของ</span>
                    </button>
                </div>
            </div>
        </div>
    </div>
    `;

    renderCurrentLowStockTable();
    setTimeout(() => document.getElementById('low-stock-search-input')?.focus(), 50);
}

function renderCurrentLowStockTable() {
    const allProducts = (typeof localProductsCache !== 'undefined' && localProductsCache.length > 0) ? localProductsCache : [];
    const stockMap = getStockMap(allProducts);
    const items = getFilteredLowStockList();
    const tbody = document.getElementById('low-stock-table-body');
    const showingCountEl = document.getElementById('showing-low-count');
    const selectedCountEl = document.getElementById('selected-low-count');
    const printBtnLabel = document.getElementById('print-btn-label');
    const checkAllBox = document.getElementById('check-all-low-stock');
    const btnStatusSelected = document.getElementById('btn-status-selected');

    if (showingCountEl) showingCountEl.innerText = items.length;
    if (selectedCountEl) selectedCountEl.innerText = selectedLowStockIds.size;
    if (btnStatusSelected) btnStatusSelected.innerText = `เฉพาะที่เลือกไว้ (${selectedLowStockIds.size})`;

    if (printBtnLabel) {
        printBtnLabel.innerText = selectedLowStockIds.size > 0 
            ? `พิมพ์ใบสั่งของ (${selectedLowStockIds.size} รายการที่เลือก)` 
            : `พิมพ์ใบสั่งของ (${items.length} รายการที่แสดง)`;
    }

    if (!tbody) return;

    if (items.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="4" class="text-center py-12 text-slate-400">
                    <p class="text-sm font-semibold">ไม่พบรายการสินค้าตามเงื่อนไขที่เลือก</p>
                </td>
            </tr>
        `;
        if (checkAllBox) checkAllBox.checked = false;
        return;
    }

    const allVisibleChecked = items.every(item => selectedLowStockIds.has(String(item.id).trim()));
    if (checkAllBox) checkAllBox.checked = allVisibleChecked && items.length > 0;

    tbody.innerHTML = items.map((item, index) => {
        const itemId = String(item.id).trim();
        const safeId = itemId.replace(/'/g, "\\'");
        const stock = getEffectiveStockFast(item, stockMap);
        const minStock = (item.min_stock !== undefined && item.min_stock !== null) ? parseInt(item.min_stock) : 5;
        const maxStock = (item.max_stock !== undefined && item.max_stock !== null) ? parseInt(item.max_stock) : 20;
        const unit = item.unit || 'ชิ้น';
        const isChecked = selectedLowStockIds.has(itemId);
        const isPack = Boolean(item.parent_id && item.parent_id !== '' && item.parent_id !== 'null');

        let stockStatusBadge = '';
        if (stock <= 0) {
            // 1. ของหมด (0 / เต็ม)
            stockStatusBadge = `<span class="px-3 py-1 bg-rose-50 text-rose-600 border border-rose-200 text-xs sm:text-sm font-bold rounded-xl">สินค้าหมด (0/${maxStock} ${unit})</span>`;
        } else if (stock <= minStock) {
            // 2. ถ้าเหลือต่ำกว่าจุดเตือน ให้ขึ้นสีส้มกะพริบ แต่ตัวเลขหลัง / ให้โชว์เป็น maxStock (เช่น 2/20)
            stockStatusBadge = `<span class="px-3 py-1 bg-amber-50 text-amber-700 border border-amber-300 text-xs sm:text-sm font-bold rounded-xl animate-pulse">เหลือ ${stock}/${maxStock} ${unit}</span>`;
        } else {
            // 3. สต็อกปกติ (โชว์เทียบกับ maxStock เช่น 18/20)
            stockStatusBadge = `<span class="px-3 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs sm:text-sm font-bold rounded-xl">ปกติ (${stock}/${maxStock} ${unit})</span>`;
        }

        return `
            <tr class="hover:bg-slate-50/80 transition border-b border-slate-100 last:border-b-0 ${isChecked ? 'bg-rose-50/30' : ''}">
                <td class="p-3.5 text-center">
                    <input type="checkbox" value="${safeId}" ${isChecked ? 'checked' : ''} onchange="toggleSelectLowStockItem('${safeId}', this.checked)"
                           class="w-4 h-4 rounded text-rose-600 focus:ring-rose-500 border-slate-300 cursor-pointer">
                </td>
                <td class="p-3.5">
                    <div class="flex items-center gap-2">
                        <p class="font-bold text-slate-800 text-sm leading-snug">${item.name}</p>
                        ${isPack ? '<span class="text-[10px] font-bold px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-600 border border-indigo-100">แพ็ค/ลัง</span>' : ''}
                    </div>
                    <p class="text-xs text-slate-400 font-normal mt-0.5">บาร์โค้ด: ${item.id}</p>
                </td>
                <td class="p-3.5 text-center whitespace-nowrap">
                    ${stockStatusBadge}
                </td>
                <td class="p-3.5 text-center whitespace-nowrap">
                    <div class="inline-flex items-center gap-2 justify-center flex-wrap">
                        <button type="button" onclick="quickUpdateStock('${safeId}', 6)" title="เพิ่ม 6 ${unit}" 
                                class="px-3.5 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200/80 rounded-xl text-xs sm:text-sm font-bold transition shadow-2xs cursor-pointer">+6</button>
                        
                        <button type="button" onclick="quickUpdateStock('${safeId}', 12)" title="เพิ่ม 12 ${unit}" 
                                class="px-3.5 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200/80 rounded-xl text-xs sm:text-sm font-bold transition shadow-2xs cursor-pointer">+12</button>
                        
                        <button type="button" onclick="quickUpdateStock('${safeId}', 24)" title="เพิ่ม 24 ${unit}" 
                                class="px-3.5 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200/80 rounded-xl text-xs sm:text-sm font-bold transition shadow-2xs cursor-pointer">+24</button>
                        
                        <div class="inline-flex items-center gap-1.5 ml-1 bg-slate-100/80 border border-slate-200 p-1 rounded-2xl shadow-2xs">
                            <input type="number" id="custom-add-${index}" min="1" placeholder="ระบุจำนวน" 
                                   onkeydown="if(event.key==='Enter') handleCustomAddStock('${safeId}', 'custom-add-${index}')"
                                   class="w-20 sm:w-24 px-2.5 py-1 text-center bg-white border border-slate-200 rounded-xl text-xs sm:text-sm font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 shadow-inner">
                            <button type="button" onclick="handleCustomAddStock('${safeId}', 'custom-add-${index}')" 
                                    class="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white rounded-xl text-xs sm:text-sm font-bold transition shadow-xs cursor-pointer whitespace-nowrap">
                                +เติม
                            </button>
                        </div>
                    </div>
                </td>
            </tr>
        `;
    }).join('');
}

function handleLowStockSearch(val) {
    const isThaiBarcode = /[ๅ\+\/๑๒ภ๓ถ๔ุูึ฿ค๕ต๖จ๗วข๘ช๙]/.test(val) && /^[ๅ\+\/๑\-๒ภ๓ถ๔ุูึ฿ค๕ต๖จ๗วข๘ช๙ดกาด๐0-9\-]+$/.test(val);
    if (isThaiBarcode) {
        val = cleanBarcodeThai(val);
        const input = document.getElementById('low-stock-search-input');
        if (input) input.value = val;
    }

    currentLowStockSearch = val;

    clearTimeout(lowStockSearchDebounceTimer);
    lowStockSearchDebounceTimer = setTimeout(() => {
        renderCurrentLowStockTable();
    }, 120);
}

function toggleLowStockCatDropdown() {
    const menu = document.getElementById('low-stock-cat-menu');
    const arrow = document.getElementById('low-stock-cat-arrow');
    if (!menu) return;
    menu.classList.toggle('hidden');
    if (arrow) arrow.classList.toggle('rotate-180');
}

function selectLowStockCat(catKey, labelName) {
    currentLowStockCategory = catKey;
    const labelSpan = document.getElementById('low-stock-cat-label');
    if (labelSpan) labelSpan.innerText = labelName;

    const menu = document.getElementById('low-stock-cat-menu');
    const arrow = document.getElementById('low-stock-cat-arrow');
    if (menu) menu.classList.add('hidden');
    if (arrow) arrow.classList.remove('rotate-180');

    renderCurrentLowStockTable();
}

document.addEventListener('click', (e) => {
    const btn = document.getElementById('low-stock-cat-btn');
    const menu = document.getElementById('low-stock-cat-menu');
    if (btn && menu && !btn.contains(e.target) && !menu.contains(e.target)) {
        menu.classList.add('hidden');
        const arrow = document.getElementById('low-stock-cat-arrow');
        if (arrow) arrow.classList.remove('rotate-180');
    }
});

function setLowStockStatusFilter(status, btnElement) {
    currentLowStockStatus = status;
    document.querySelectorAll('.status-pill').forEach(btn => {
        btn.className = "status-pill px-3 py-1.5 rounded-lg text-xs font-bold text-slate-500 hover:text-slate-800 transition cursor-pointer";
    });
    
    if (btnElement) {
        if (status === 'out') btnElement.className = "status-pill px-3 py-1.5 rounded-lg text-xs font-bold bg-rose-500 text-white shadow-2xs transition cursor-pointer";
        else if (status === 'low') btnElement.className = "status-pill px-3 py-1.5 rounded-lg text-xs font-bold bg-amber-500 text-white shadow-2xs transition cursor-pointer";
        else if (status === 'normal') btnElement.className = "status-pill px-3 py-1.5 rounded-lg text-xs font-bold bg-emerald-600 text-white shadow-2xs transition cursor-pointer";
        else if (status === 'all_store') btnElement.className = "status-pill px-3 py-1.5 rounded-lg text-xs font-bold bg-slate-800 text-white shadow-2xs transition cursor-pointer";
        else if (status === 'selected') btnElement.className = "status-pill px-3 py-1.5 rounded-lg text-xs font-bold bg-blue-600 text-white shadow-2xs transition cursor-pointer";
        else btnElement.className = "status-pill px-3 py-1.5 rounded-lg text-xs font-bold bg-white text-slate-800 shadow-2xs transition cursor-pointer";
    }

    renderCurrentLowStockTable();
}

function toggleSelectLowStockItem(id, isChecked) {
    if (isChecked) selectedLowStockIds.add(id);
    else selectedLowStockIds.delete(id);
    renderCurrentLowStockTable();
}

function toggleSelectAllLowStock(isChecked) {
    const visibleItems = getFilteredLowStockList();
    visibleItems.forEach(item => {
        const id = String(item.id).trim();
        if (isChecked) selectedLowStockIds.add(id);
        else selectedLowStockIds.delete(id);
    });
    renderCurrentLowStockTable();
}

function closeLowStockModal() {
    const container = document.getElementById('low-stock-modal-container');
    if (container) container.innerHTML = '';
    currentLowStockSearch = '';
    currentLowStockCategory = 'all';
    currentLowStockStatus = 'need_buy';
    selectedLowStockIds.clear();
}

function handleCustomAddStock(productId, inputId) {
    const input = document.getElementById(inputId);
    const addQty = parseInt(input?.value);
    
    if (!addQty || addQty <= 0) {
        if (typeof showCustomModal === 'function') {
            showCustomModal('warning', 'ระบุจำนวนไม่ถูกต้อง', 'กรุณาระบุจำนวนสินค้าที่ต้องการเติมให้มากกว่า 0');
        }
        input?.focus();
        return;
    }
    
    quickUpdateStock(productId, addQty);
    if (input) input.value = '';
}

async function quickUpdateStock(productId, addQty) {
    try {
        // ⭐️ ส่ง JSON ไปที่ Route /api/products/stock-in ของ Node.js
        const res = await fetch('/api/products/stock-in', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                id: productId,
                qty: addQty
            })
        });
        const result = await res.json();

        if (result.success) {
            await getStoredProducts();
            if (typeof filterCategory === 'function') filterCategory(currentCategory);
            updateLowStockHeaderCounts();
            renderCurrentLowStockTable();
        } else {
            if (typeof showCustomModal === 'function') {
                showCustomModal('warning', 'เกิดข้อผิดพลาด', result.message);
            }
        }
    } catch (e) {
        console.error('Stock Update Error:', e);
    }
}

function printLowStockReport() {
    const allProducts = (typeof localProductsCache !== 'undefined' && localProductsCache.length > 0) ? localProductsCache : [];
    const stockMap = getStockMap(allProducts);
    let itemsToPrint = selectedLowStockIds.size > 0 
        ? allProducts.filter(p => selectedLowStockIds.has(String(p.id).trim())) 
        : getFilteredLowStockList();

    if (itemsToPrint.length === 0) {
        if (typeof showCustomModal === 'function') showCustomModal('warning', 'ไม่มีรายการ', 'ไม่มีรายการสินค้าสำหรับพิมพ์ใบสั่งของ');
        return;
    }

    itemsToPrint.sort((a, b) => getEffectiveStockFast(a, stockMap) - getEffectiveStockFast(b, stockMap));

    const now = new Date();
    const thaiDate = now.toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric' });
    const thaiTime = now.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' });

    let rowsHtml = '';
    itemsToPrint.forEach((item, idx) => {
        const stock = getEffectiveStockFast(item, stockMap);
        const minStock = (item.min_stock !== undefined && item.min_stock !== null) ? parseInt(item.min_stock) : 5;
        const maxStock = (item.max_stock !== undefined && item.max_stock !== null) ? parseInt(item.max_stock) : 20;
        const unit = item.unit || 'ชิ้น';
        const needToBuy = Math.max(0, maxStock - stock);

        let stockColor = stock <= 0 ? '#e11d48' : (stock <= minStock ? '#d97706' : '#10b981');
        let stockText = stock <= 0 ? `หมด (0)` : `${stock} ${unit}`;

        rowsHtml += `
            <tr>
                <td style="text-align: center; padding: 6px; border: 1px solid #cbd5e1;">${idx + 1}</td>
                <td style="padding: 6px; border: 1px solid #cbd5e1; font-family: monospace;">${item.id}</td>
                <td style="padding: 6px; border: 1px solid #cbd5e1; font-weight: bold;">${item.name}</td>
                <td style="text-align: center; padding: 6px; border: 1px solid #cbd5e1; color: ${stockColor}; font-weight: bold;">
                    ${stockText} (เตือนที่ ${minStock})
                </td>
                <td style="text-align: center; padding: 6px; border: 1px solid #cbd5e1; width: 110px; font-weight: bold; color: #2563eb;">
                    +${needToBuy} ${unit}
                </td>
            </tr>
        `;
    });

    let printFrame = document.getElementById('print-iframe');
    if (!printFrame) {
        printFrame = document.createElement('iframe');
        printFrame.id = 'print-iframe';
        printFrame.style.position = 'fixed';
        printFrame.style.width = '0';
        printFrame.style.height = '0';
        document.body.appendChild(printFrame);
    }

    const doc = printFrame.contentWindow.document;
    doc.open();
    doc.write(`
        <!DOCTYPE html>
        <html lang="th">
        <head>
            <meta charset="UTF-8">
            <style>
                @page { size: A4 portrait; margin: 0 !important; }
                body { font-family: 'IBM Plex Sans Thai', Tahoma, sans-serif; font-size: 13px; color: #1e293b; padding: 12mm 15mm; }
                .header { text-align: center; margin-bottom: 12px; border-bottom: 2px solid #0f172a; padding-bottom: 8px; }
                .header h2 { margin: 0 0 4px 0; font-size: 18px; }
                .header p { margin: 0; color: #64748b; font-size: 11px; }
                table { width: 100%; border-collapse: collapse; margin-top: 5px; }
                th { background: #f1f5f9; padding: 7px; border: 1px solid #cbd5e1; font-size: 11px; font-weight: bold; }
                td { font-size: 11px; }
                tr:nth-child(even) { background-color: #f8fafc; }
            </style>
        </head>
        <body>
            <div class="header">
                <h2>📋 ใบรายการสั่งซื้อสินค้า / ตรวจนับสต็อก</h2>
                <p>พิมพ์วันที่: ${thaiDate} เวลา ${thaiTime} น. (รวมทั้งหมด ${itemsToPrint.length} รายการ)</p>
            </div>
            <table>
                <thead>
                    <tr>
                        <th style="width: 30px;">#</th>
                        <th style="width: 130px;">รหัสบาร์โค้ด</th>
                        <th>ชื่อรายการสินค้า</th>
                        <th style="width: 120px;">คงเหลือ</th>
                        <th style="width: 110px;">จำนวนที่ต้องซื้อ</th>
                    </tr>
                </thead>
                <tbody>${rowsHtml}</tbody>
            </table>
        </body>
        </html>
    `);
    doc.close();

    setTimeout(() => {
        printFrame.contentWindow.focus();
        printFrame.contentWindow.print();
    }, 150);
}