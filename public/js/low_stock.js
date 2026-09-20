let allProducts = [];
let categories = [];
let currentSearch = '';
let currentCategory = 'all';
let currentStatus = 'need_buy';
let selectedIds = new Set();
let currentStockSort = 'asc';
let currentSort = 'index';
let visibleProductLimit = 40;
let currentFilteredList = [];

const placeholderSVG = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%239CA3AF'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z'/%3E%3C/svg%3E";

const thaiBarcodeKeyMap = {
    'ๅ': '1', '+': '1', 'ุ': '6', 'ู': '6',
    '/': '2', '๑': '2', 'ก': '2', 'ึ': '7', '฿': '7',
    '-': '3', '๒': '3', 'ค': '8', '๕': '8',
    'ภ': '4', '๓': '4', 'ต': '9', '๖': '9',
    'ถ': '5', '๔': '5', 'ด': '5', 'จ': '0', '๗': '0', 'ว': '0', '๐': '0',
    'ข': '-', '๘': '-', 'ช': '=', '๙': '='
};

document.addEventListener('DOMContentLoaded', async () => {
    await loadInitialData();
    if (window.innerWidth >= 640) {
        document.getElementById('search-input')?.focus();
    }

    // 🌟 โหลดเพิ่มทีละ 40 รายการเมื่อเลื่อนลงใกล้ถึงก้นจอ (แบบหน้า index) 🌟
    const grid = document.getElementById('product-card-grid');
    const scrollContainer = grid?.parentElement;
    if (scrollContainer) {
        scrollContainer.addEventListener('scroll', () => {
            if (scrollContainer.scrollTop + scrollContainer.clientHeight >= scrollContainer.scrollHeight - 250) {
                if (visibleProductLimit < currentFilteredList.length) {
                    visibleProductLimit += 40;
                    renderGrid(false);
                }
            }
        });
    }
});
async function loadInitialData() {
    try {
        const [resProd, resCat] = await Promise.all([
            fetch('/api/products'),
            fetch('/api/categories')
        ]);
        allProducts = await resProd.json();
        categories = await resCat.json();
        renderCategoryDropdown();
        updateCountsAndHeader();
        renderGrid();
    } catch (e) {
        console.error('Fetch Data Error:', e);
    }
}

// ฟังก์ชันคำนวณสต็อก ล็อกไม่ให้ติดลบ
function getEffectiveStock(item, products) {
    if (!item) return 0;
    let qty = 0;
    if (item.parent_id && item.parent_id !== '' && item.parent_id !== 'null') {
        const parentProd = products.find(p => String(p.id).trim() === String(item.parent_id).trim());
        if (parentProd) {
            const parentStock = parseInt(parentProd.stock_qty) || 0;
            const multiplier = parseInt(item.multiplier) > 0 ? parseInt(item.multiplier) : 1;
            qty = Math.floor(parentStock / multiplier);
        }
    } else {
        qty = parseInt(item.stock_qty) || 0;
    }
    return Math.max(0, qty);
}

function getCatalogIndex(itemId) {
    try {
        const savedIndexMap = JSON.parse(localStorage.getItem('pos_catalog_indexes') || '{}');
        const cleanId = String(itemId).trim();
        const foundKey = Object.keys(savedIndexMap).find(k => String(k).trim() === cleanId);
        if (foundKey !== undefined) {
            return savedIndexMap[foundKey];
        }
        return '-';
    } catch (e) {
        return '-';
    }
}

function renderCategoryDropdown() {
    const menu = document.getElementById('cat-dropdown-menu');
    if (!menu) return;
    let html = `
        <div onclick="selectCategory('all', 'ทุกหมวดหมู่สินค้า')" class="px-3.5 py-2 hover:bg-slate-50 text-slate-800 font-bold cursor-pointer transition">ทุกหมวดหมู่สินค้า</div>
        <div onclick="selectCategory('no_barcode', 'รายการที่ไม่มีบาร์โค้ด')" class="px-3.5 py-2 hover:bg-slate-50 text-slate-700 cursor-pointer transition">รายการที่ไม่มีบาร์โค้ด</div>
    `;
    categories.forEach(c => {
        if (c.label_name !== 'รายการที่ไม่มีบาร์โค้ด') {
            html += `<div onclick="selectCategory('${c.key_name}', '${c.label_name}')" class="px-3.5 py-2 hover:bg-slate-50 text-slate-700 cursor-pointer transition">${c.label_name}</div>`;
        }
    });
    menu.innerHTML = html;
}

function selectCategoryByIndex(index) {
    const c = categories[index];
    if (c) {
        currentCategory = c.key_name;
        const label = document.getElementById('cat-dropdown-label');
        if (label) label.innerText = c.label_name;
    }
    toggleCatDropdown();
    renderGrid();
}

function selectCategory(key, name) {
    currentCategory = key;
    const label = document.getElementById('cat-dropdown-label');
    if (label) label.innerText = name;
    toggleCatDropdown();
    updateCountsAndHeader();
    renderGrid();
}

function toggleCatDropdown() {
    const menu = document.getElementById('cat-dropdown-menu');
    const arrow = document.getElementById('cat-dropdown-arrow');
    menu?.classList.toggle('hidden');
    arrow?.classList.toggle('rotate-180');
}

document.addEventListener('click', (e) => {
    const btn = document.getElementById('cat-dropdown-btn');
    const menu = document.getElementById('cat-dropdown-menu');
    if (btn && menu && !btn.contains(e.target) && !menu.contains(e.target)) {
        menu.classList.add('hidden');
        document.getElementById('cat-dropdown-arrow')?.classList.remove('rotate-180');
    }
});

let searchDebounceTimer = null;
function handleSearch(val) {
    currentSearch = val;
    clearTimeout(searchDebounceTimer);
    searchDebounceTimer = setTimeout(() => {
        renderGrid();
    }, 150); // รอพิมพ์จบ 150ms ค่อยวาด ไม่กระตุกทุกตัวอักษร
}

function setStatusFilter(status, btn) {
    currentStatus = status;

    document.querySelectorAll('.status-pill').forEach(b => {
        b.className = "status-pill px-3 py-1 rounded-xl text-xs font-semibold bg-white text-slate-600 border border-slate-200/80 hover:bg-slate-50 transition active:scale-95 whitespace-nowrap cursor-pointer shadow-2xs";
    });
    
    const targetBtn = btn || document.getElementById(`pill-${status.replace('_', '-')}`);
    if (targetBtn) {
        targetBtn.className = "status-pill px-3 py-1 rounded-xl text-xs font-bold bg-blue-600 text-white shadow-2xs transition active:scale-95 whitespace-nowrap cursor-pointer";
    }

    renderGrid();
}

function getFilteredList() {
    let list = allProducts;

    const isNoBarcodeSelected = currentCategory === 'no_barcode' || 
        String(currentCategory).toLowerCase().includes('ไม่มีสแกน') ||
        String(categories.find(c => c.key_name === currentCategory)?.label_name || '').includes('ไม่มีสแกน');

    if (isNoBarcodeSelected) {
        list = allProducts.filter(p => {
            const isNoScanFlag = p.is_no_barcode == 1 || p.is_no_barcode === '1' || p.is_no_barcode === true;
            const catStr = String(p.category || '').toLowerCase();
            const matchName = catStr.includes('ไม่มีสแกน') || catStr.includes('no_barcode');
            return isNoScanFlag || matchName;
        });
    } else if (currentCategory !== 'all') {
        const matchedCat = categories.find(c => String(c.key_name).trim() === String(currentCategory).trim() || String(c.label_name).trim() === String(currentCategory).trim());
        
        list = allProducts.filter(p => {
            const cat = String(p.category || '').trim();
            if (!cat) return false;
            if (cat === String(currentCategory).trim()) return true;
            if (matchedCat) {
                if (cat === String(matchedCat.key_name).trim()) return true;
                if (cat === String(matchedCat.label_name).trim()) return true;
            }
            return false;
        });
    }

    if (currentStatus === 'need_buy') {
        list = list.filter(p => {
            const st = getEffectiveStock(p, allProducts);
            const minSt = (p.min_stock !== undefined && p.min_stock !== null) ? parseInt(p.min_stock) : 5;
            return st <= minSt;
        });
    } else if (currentStatus === 'out') {
        list = list.filter(p => getEffectiveStock(p, allProducts) <= 0);
    } else if (currentStatus === 'low') {
        list = list.filter(p => {
            const st = getEffectiveStock(p, allProducts);
            const minSt = (p.min_stock !== undefined && p.min_stock !== null) ? parseInt(p.min_stock) : 5;
            return st > 0 && st <= minSt;
        });
    } else if (currentStatus === 'normal') {
        list = list.filter(p => {
            const st = getEffectiveStock(p, allProducts);
            const minSt = (p.min_stock !== undefined && p.min_stock !== null) ? parseInt(p.min_stock) : 5;
            return st > minSt;
        });
    } else if (currentStatus === 'selected') {
        list = list.filter(p => selectedIds.has(String(p.id).trim()));
    }

    const normalizeThai = (str) => String(str || '').toLowerCase().replace(/เเ/g, 'แ');
    const cleanSearch = normalizeThai(currentSearch).trim();
    if (cleanSearch) {
        // 🌟 1. กรณีค้นหาด้วยเครื่องหมาย # (ค้นหาเฉพาะลำดับแคตตาล็อก)
        if (cleanSearch.startsWith('#')) {
            const cleanIndexKeyword = cleanSearch.replace(/#/g, '').trim();

            // ถ้าพิมพ์แค่ # ตัวเดียว ให้แสดงสินค้าตามเงื่อนไขหมวดหมู่/สถานะปกติ (ไม่ตัดทิ้ง)
            if (!cleanIndexKeyword) {
                // คงรายการเดิมไว้
            } else {
                list = list.filter(p => {
                    const catalogIdx = String(getCatalogIndex(p.id)).trim();
                    return catalogIdx === cleanIndexKeyword || catalogIdx.startsWith(cleanIndexKeyword);
                });
            }
        } else {
            // 🌟 2. กรณีค้นหาทั่วไป (ชื่อสินค้า, รหัสบาร์โค้ด)
            let convertedBarcode = '';
            for (let char of cleanSearch) {
                convertedBarcode += thaiBarcodeKeyMap[char] !== undefined ? thaiBarcodeKeyMap[char] : char;
            }

            list = list.filter(p => {
                const matchName = normalizeThai(p.name).includes(cleanSearch);
                const matchBarcode = String(p.id || '').toLowerCase().includes(cleanSearch) || 
                                    (convertedBarcode && String(p.id || '').toLowerCase().includes(convertedBarcode));

                return matchName || matchBarcode;
            });
        }
    }

    if (currentSort === 'index') {
        list.sort((a, b) => {
            const savedIndexMap = JSON.parse(localStorage.getItem('pos_catalog_indexes') || '{}');
            const idxA = savedIndexMap[String(a.id).trim()] || 999999;
            const idxB = savedIndexMap[String(b.id).trim()] || 999999;
            return idxA - idxB;
        });
    } else if (currentSort === 'stock_asc') {
        list.sort((a, b) => getEffectiveStock(a, allProducts) - getEffectiveStock(b, allProducts));
    } else if (currentSort === 'stock_desc') {
        list.sort((a, b) => getEffectiveStock(b, allProducts) - getEffectiveStock(a, allProducts));
    }

    return list;
}

function toggleSortDropdown() {
    const menu = document.getElementById('sort-product-menu');
    const arrow = document.getElementById('sort-product-arrow');
    if (menu) menu.classList.toggle('hidden');
    if (arrow) arrow.classList.toggle('rotate-180');
}

function selectSortOption(val, label) {
    currentSort = val;
    const hiddenInput = document.getElementById('sort-product');
    const labelSpan = document.getElementById('sort-product-label');
    if (hiddenInput) hiddenInput.value = val;
    if (labelSpan) labelSpan.innerText = label;
    toggleSortDropdown();
    renderGrid();
}

document.addEventListener('click', (e) => {
    const sortBtn = document.getElementById('sort-product-btn');
    const sortMenu = document.getElementById('sort-product-menu');
    if (sortBtn && sortMenu && !sortBtn.contains(e.target) && !sortMenu.contains(e.target)) {
        sortMenu.classList.add('hidden');
        document.getElementById('sort-product-arrow')?.classList.remove('rotate-180');
    }
});

function updateCountsAndHeader() {
    let baseList = allProducts;
    const isNoBarcodeSelected = currentCategory === 'no_barcode' || 
        String(currentCategory).toLowerCase().includes('ไม่มีสแกน') ||
        String(categories.find(c => c.key_name === currentCategory)?.label_name || '').includes('ไม่มีสแกน');

    if (isNoBarcodeSelected) {
        baseList = allProducts.filter(p => {
            const isNoScanFlag = p.is_no_barcode == 1 || p.is_no_barcode === '1' || p.is_no_barcode === true;
            const catStr = String(p.category || '').toLowerCase();
            const matchName = catStr.includes('ไม่มีสแกน') || catStr.includes('no_barcode');
            return isNoScanFlag || matchName;
        });
    } else if (currentCategory !== 'all') {
        const matchedCat = categories.find(c => String(c.key_name).trim() === String(currentCategory).trim() || String(c.label_name).trim() === String(currentCategory).trim());
        baseList = allProducts.filter(p => {
            const cat = String(p.category || '').trim();
            if (!cat) return false;
            if (cat === String(currentCategory).trim()) return true;
            if (matchedCat) {
                if (cat === String(matchedCat.key_name).trim()) return true;
                if (cat === String(matchedCat.label_name).trim()) return true;
            }
            return false;
        });
    }
    
    let totalLowCount = 0;
    let outCount = 0;
    let activeProductsCount = 0;

    baseList.forEach(p => {
        activeProductsCount++;
        const st = getEffectiveStock(p, allProducts);
        const minSt = (p.min_stock !== undefined && p.min_stock !== null) ? parseInt(p.min_stock) : 5;
        if (st <= minSt) {
            totalLowCount++;
            if (st <= 0) outCount++;
        }
    });

    const lowCount = totalLowCount - outCount;
    const normalCount = activeProductsCount - totalLowCount;

    const pillAllStore = document.getElementById('pill-all-store');
    const pillNeedBuy = document.getElementById('pill-need-buy');
    const pillOut = document.getElementById('pill-out');
    const pillLow = document.getElementById('pill-low');
    const pillNormal = document.getElementById('pill-normal');
    const pillSelected = document.getElementById('pill-selected');

    if (pillAllStore) pillAllStore.innerText = `สินค้าทั้งร้าน (${activeProductsCount})`;
    if (pillNeedBuy) pillNeedBuy.innerText = `ของต้องซื้อ (${totalLowCount})`;
    if (pillOut) pillOut.innerText = `เฉพาะของหมด (${outCount})`;
    if (pillLow) pillLow.innerText = `เฉพาะใกล้หมด (${lowCount})`;
    if (pillNormal) pillNormal.innerText = `สต็อกปกติ (${normalCount})`;
    if (pillSelected) pillSelected.innerText = `ที่เลือกไว้ (${selectedIds.size})`;
}

// 🌟 ฟังก์ชันเรนเดอร์การ์ดแยกชิ้น เพื่อประสิทธิภาพสูงและไม่หน่วง
function renderCardHtml(item, index) {
    const itemId = String(item.id).trim();
    const safeId = itemId.replace(/'/g, "\\'");
    
    const stock = getEffectiveStock(item, allProducts);
    const minStock = (item.min_stock !== undefined && item.min_stock !== null) ? parseInt(item.min_stock) : 5;
    const maxStock = (item.max_stock !== undefined && item.max_stock !== null) ? parseInt(item.max_stock) : 20;
    const unit = item.unit || 'ชิ้น';
    const isChecked = selectedIds.has(itemId);
    const isPack = Boolean(item.parent_id && item.parent_id !== '' && item.parent_id !== 'null');
    const imgSrc = (item.img && String(item.img).trim() !== '' && item.img !== 'images/placeholder.jpg') 
    ? item.img 
    : placeholderSVG;
    
    const needToFill = Math.max(0, maxStock - stock);

    let badge = '';
    let borderClass = 'border-slate-200/80 hover:border-slate-300 bg-white';

    if (isChecked) {
        borderClass = 'border-2 border-blue-600 bg-white shadow-md';
    } else if (stock <= 0) {
        badge = `<span class="px-2 py-0.5 rounded-md bg-rose-50 text-rose-600 border border-rose-200 text-[10px] font-bold">หมด</span>`;
        borderClass = 'border border-rose-200 hover:border-rose-300 bg-white';
    } else if (stock <= minStock) {
        badge = `<span class="px-2 py-0.5 rounded-md bg-amber-50 text-amber-700 border border-amber-300 text-[10px] font-bold">ใกล้หมด</span>`;
        borderClass = 'border border-amber-200 hover:border-amber-300 bg-white';
    } else {
        badge = `<span class="px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-bold">ปกติ</span>`;
    }

    return `
        <div id="card-${itemId}" onclick="toggleCardSelect('${safeId}')" 
            class="p-3 rounded-2xl ${borderClass} shadow-2xs hover:shadow-md transition-all flex flex-col justify-between text-center relative group cursor-pointer active:scale-98">
            
            <div class="flex items-center justify-between w-full min-h-[20px]">
                <div class="flex items-center gap-1.5">
                    ${isChecked ? `
                        <div class="w-4 h-4 bg-blue-600 text-white rounded-full flex items-center justify-center shadow-xs">
                            <svg class="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7"/></svg>
                        </div>
                    ` : ''}
                    <span class="inline-flex items-center justify-center h-5 px-2 rounded-lg bg-slate-100 text-slate-600 border border-slate-200/60 text-[10px] font-bold leading-none">
                        #${getCatalogIndex(item.id)}
                    </span>
                </div>
                <div class="flex items-center gap-1 ml-auto">
                    ${isPack ? '<span class="inline-flex items-center justify-center h-5 px-2 rounded-lg bg-indigo-50 text-indigo-600 border border-indigo-100 text-[10px] font-bold leading-none">แพ็ค</span>' : ''}
                    ${badge}
                </div>
            </div>

            <div class="w-full h-16 my-1 flex items-center justify-center pointer-events-none">
                <img src="${imgSrc}" alt="${item.name}" loading="lazy" class="h-full max-w-full object-contain group-hover:scale-105 transition duration-150" onerror="this.onerror=null; this.src=placeholderSVG;">
            </div>

            <div class="w-full mt-1">
                <h3 class="text-xs font-bold text-slate-800 truncate leading-snug" title="${item.name}">${item.name}</h3>
                <p class="text-[10px] text-slate-400 font-mono truncate">${item.id || ''}</p>
                
                <div class="my-1.5 py-1 px-2 rounded-lg bg-slate-50 border border-slate-100 flex items-center justify-between text-[11px]">
                    <span class="text-slate-500 font-medium">เหลือ ${stock}/${maxStock} ${unit}</span>
                    ${needToFill > 0 
                        ? `<span class="text-rose-600 font-bold">ขาด ${needToFill}</span>` 
                        : `<span class="text-emerald-600 font-bold">เต็ม</span>`}
                </div>
            </div>

            <div onclick="event.stopPropagation()" class="w-full mt-1 pt-1.5 border-t border-slate-100 space-y-1.5 cursor-default">
                ${needToFill > 0 ? `
                    <button type="button" onclick="event.stopPropagation(); quickAddStock('${safeId}', ${needToFill})" 
                            class="w-full py-1.5 bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white text-xs font-bold rounded-xl shadow-xs transition cursor-pointer flex items-center justify-center gap-1">
                        <span>+ เติมเต็ม (${needToFill})</span>
                    </button>
                ` : `
                    <button type="button" disabled 
                            class="w-full py-1.5 bg-slate-100 text-slate-400 text-xs font-bold rounded-xl cursor-not-allowed">
                        เต็มสต็อกแล้ว
                    </button>
                `}

                <div class="flex items-center justify-between gap-1.5 pt-0.5">
                    <div class="flex items-center bg-slate-100 p-0.5 rounded-xl border border-slate-200/60 shadow-2xs">
                        <button type="button" onclick="event.stopPropagation(); quickAddStock('${safeId}', 6)" 
                                class="px-2.5 py-1 text-[11px] font-bold text-slate-600 hover:text-slate-900 hover:bg-white rounded-lg transition active:scale-90 cursor-pointer">+6</button>
                        <button type="button" onclick="event.stopPropagation(); quickAddStock('${safeId}', 12)" 
                                class="px-2.5 py-1 text-[11px] font-bold text-slate-600 hover:text-slate-900 hover:bg-white rounded-lg transition active:scale-90 cursor-pointer">+12</button>
                    </div>

                    <div class="flex items-center bg-slate-100 rounded-xl p-0.5 border border-slate-200/60 shadow-2xs h-7 flex-1 max-w-[84px]">
                        <input type="number" id="custom-${index}" min="1" placeholder="ระบุ" 
                            onclick="event.stopPropagation()"
                            onkeydown="if(event.key==='Enter'){ event.stopPropagation(); handleCustomAdd('${safeId}', 'custom-${index}'); }" 
                            class="w-full h-full text-center text-xs font-bold text-slate-800 placeholder:text-slate-400 placeholder:font-normal focus:outline-none bg-transparent">
                        <button type="button" onclick="event.stopPropagation(); handleCustomAdd('${safeId}', 'custom-${index}')" 
                                title="เติมสต็อก"
                                class="w-6 h-6 bg-emerald-600 hover:bg-emerald-700 active:scale-90 text-white rounded-lg flex items-center justify-center transition cursor-pointer flex-shrink-0 shadow-2xs">
                            <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M12 4v16m8-8H4"/>
                            </svg>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `;
}

// คลิกที่ตัวการ์ดเพื่อเลือก/ยกเลิก (อัปเดตเฉพาะการ์ดใบที่คลิก ไม่โหลดใหม่ทั้งหน้า)
function toggleCardSelect(id) {
    const cleanId = String(id).trim();
    if (selectedIds.has(cleanId)) {
        selectedIds.delete(cleanId);
    } else {
        selectedIds.add(cleanId);
    }
    updateCountsAndHeader();

    const items = getFilteredList();
    const index = items.findIndex(p => String(p.id).trim() === cleanId);
    if (index !== -1) {
        const cardEl = document.getElementById('card-' + cleanId);
        if (cardEl) {
            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = renderCardHtml(items[index], index);
            cardEl.outerHTML = tempDiv.firstElementChild.outerHTML;
        }
    }

    const selectedEl = document.getElementById('selected-count');
    const printBtnLabel = document.getElementById('print-btn-label');
    const checkAllBox = document.getElementById('check-all');
    if (selectedEl) selectedEl.innerText = selectedIds.size;
    if (printBtnLabel) {
        printBtnLabel.innerText = selectedIds.size > 0 
            ? `พิมพ์ใบสั่งของ (${selectedIds.size})` 
            : `พิมพ์ใบสั่งของ (${items.length})`;
    }
    const allChecked = items.length > 0 && items.every(item => selectedIds.has(String(item.id).trim()));
    if (checkAllBox) checkAllBox.checked = allChecked;
}

function renderGrid(resetLimit = true) {
    const container = document.getElementById('product-card-grid');
    const scrollContainer = container?.parentElement;

    if (resetLimit) {
        visibleProductLimit = 40;
        if (scrollContainer) scrollContainer.scrollTop = 0;
    }

    const items = getFilteredList();
    currentFilteredList = items;

    const showingEl = document.getElementById('showing-count');
    const selectedEl = document.getElementById('selected-count');
    const printBtnLabel = document.getElementById('print-btn-label');
    const checkAllBox = document.getElementById('check-all');

    if (showingEl) showingEl.innerText = items.length;
    if (selectedEl) selectedEl.innerText = selectedIds.size;
    if (printBtnLabel) {
        printBtnLabel.innerText = selectedIds.size > 0 
            ? `พิมพ์ใบสั่งของ (${selectedIds.size})` 
            : `พิมพ์ใบสั่งของ (${items.length})`;
    }

    if (!container) return;

    if (items.length === 0) {
        container.innerHTML = `
            <div class="col-span-full py-16 text-center text-slate-400 font-semibold bg-white rounded-3xl border border-slate-200/70 shadow-2xs text-xs sm:text-sm">
                ไม่พบรายการสินค้าตามเงื่อนไขที่เลือก
            </div>
        `;
        if (checkAllBox) checkAllBox.checked = false;
        return;
    }

    const allChecked = items.every(item => selectedIds.has(String(item.id).trim()));
    if (checkAllBox) checkAllBox.checked = allChecked && items.length > 0;

    // 🌟 ตัดเรนเดอร์เฉพาะ 40 รายการแรก เลื่อนลงมาจึงค่อยต่อยอด 🌟
    const paginatedItems = items.slice(0, visibleProductLimit);
    container.innerHTML = paginatedItems.map((item, index) => renderCardHtml(item, index)).join('');
}

function toggleSelectAllBtn() {
    const items = getFilteredList();
    const allChecked = items.every(item => selectedIds.has(String(item.id).trim()));

    items.forEach(item => {
        const id = String(item.id).trim();
        if (!allChecked) selectedIds.add(id);
        else selectedIds.delete(id);
    });

    updateCountsAndHeader();
    renderGrid();
}

function handleCustomAdd(id, inputId) {
    const input = document.getElementById(inputId);
    const val = parseInt(input?.value);
    if (!val || val <= 0) return;
    quickAddStock(id, val);
    if (input) input.value = '';
}

async function quickAddStock(id, qty) {
    try {
        const res = await fetch('/api/products/stock-in', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id, qty })
        });
        const data = await res.json();
        if (data.success) {
            // 🌟 1. อัปเดตข้อมูลในหน่วยความจำแคช
            const cleanId = String(id).trim();
            const prod = allProducts.find(p => String(p.id).trim() === cleanId);
            if (prod) {
                prod.stock_qty = (parseInt(prod.stock_qty) || 0) + parseInt(qty);
            }

            // 🌟 2. วาดใหม่เฉพาะการ์ดใบที่กดทันที (DOM ใบเดียว ไม่กระตุก)
            const items = getFilteredList();
            const index = items.findIndex(p => String(p.id).trim() === cleanId);
            if (index !== -1) {
                const cardEl = document.getElementById('card-' + cleanId);
                if (cardEl) {
                    const tempDiv = document.createElement('div');
                    tempDiv.innerHTML = renderCardHtml(items[index], index);
                    cardEl.outerHTML = tempDiv.firstElementChild.outerHTML;
                }
            }
            updateCountsAndHeader();
        }
    } catch (e) {
        console.error('Stock In Error:', e);
    }
}

function printLowStockReport() {
    let itemsToPrint = selectedIds.size > 0 
        ? allProducts.filter(p => selectedIds.has(String(p.id).trim()))
        : getFilteredList();

    if (itemsToPrint.length === 0) {
        alert('ไม่มีรายการสินค้าสำหรับพิมพ์');
        return;
    }

    const now = new Date();
    const thaiDate = now.toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric' });
    const thaiTime = now.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' });

    let rowsHtml = itemsToPrint.map((item, idx) => {
        const stock = getEffectiveStock(item, allProducts);
        const minStock = (item.min_stock !== undefined && item.min_stock !== null) ? parseInt(item.min_stock) : 5;
        const maxStock = (item.max_stock !== undefined && item.max_stock !== null) ? parseInt(item.max_stock) : 20;
        const unit = item.unit || 'ชิ้น';
        const needToBuy = Math.max(0, maxStock - stock);

        let color = stock <= 0 ? '#e11d48' : (stock <= minStock ? '#d97706' : '#10b981');
        return `
            <tr>
                <td style="text-align: center; padding: 6px; border: 1px solid #cbd5e1;">${idx + 1}</td>
                <td style="padding: 6px; border: 1px solid #cbd5e1; font-family: monospace;">${item.id}</td>
                <td style="padding: 6px; border: 1px solid #cbd5e1; font-weight: bold;">${item.name}</td>
                <td style="text-align: center; padding: 6px; border: 1px solid #cbd5e1; color: ${color}; font-weight: bold;">
                    ${stock <= 0 ? 'หมด (0)' : stock} ${unit}
                </td>
                <td style="text-align: center; padding: 6px; border: 1px solid #cbd5e1; width: 110px; font-weight: bold; color: #2563eb;">+${needToBuy} ${unit}</td>
            </tr>
        `;
    }).join('');

    const frame = document.getElementById('print-iframe');
    if (!frame) return;

    const doc = frame.contentWindow.document;
    doc.open();
    doc.write(`
        <!DOCTYPE html>
        <html lang="th">
        <head>
            <meta charset="UTF-8">
            <title>ใบรายการสั่งซื้อสินค้า</title>
            <style>
                @page { size: A4 portrait; margin: 6mm 10mm; }
                body { font-family: 'IBM Plex Sans Thai', Tahoma, sans-serif; font-size: 13px; color: #1e293b; margin: 0; }
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
        frame.contentWindow.focus();
        frame.contentWindow.print();
    }, 150);
}