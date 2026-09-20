let allProducts = [];
let categories = [];
let currentSearch = '';
let currentCategory = 'all';
let currentStatus = 'all_store';
let selectedIds = new Set();
let currentStockSort = 'asc';

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
    document.getElementById('search-input')?.focus();
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

function renderCategoryDropdown() {
    const menu = document.getElementById('cat-dropdown-menu');
    if (!menu) return;
    let html = `<div onclick="selectCategory('all', 'ทุกหมวดหมู่สินค้า')" class="px-3.5 py-2 hover:bg-slate-50 text-slate-800 font-bold cursor-pointer transition">ทุกหมวดหมู่สินค้า</div>`;
    categories.forEach(c => {
        html += `<div onclick="selectCategory('${c.key_name}', '${c.label_name}')" class="px-3.5 py-2 hover:bg-slate-50 text-slate-700 cursor-pointer transition">${c.label_name}</div>`;
    });
    menu.innerHTML = html;
}

function toggleCatDropdown() {
    const menu = document.getElementById('cat-dropdown-menu');
    const arrow = document.getElementById('cat-dropdown-arrow');
    menu?.classList.toggle('hidden');
    arrow?.classList.toggle('rotate-180');
}

function selectCategory(key, name) {
    currentCategory = key;
    const label = document.getElementById('cat-dropdown-label');
    if (label) label.innerText = name;
    toggleCatDropdown();
    renderGrid();
}

document.addEventListener('click', (e) => {
    const btn = document.getElementById('cat-dropdown-btn');
    const menu = document.getElementById('cat-dropdown-menu');
    if (btn && menu && !btn.contains(e.target) && !menu.contains(e.target)) {
        menu.classList.add('hidden');
        document.getElementById('cat-dropdown-arrow')?.classList.remove('rotate-180');
    }
});

function handleSearch(val) {
    currentSearch = val;
    renderGrid();
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
    const excludedCats = new Set(categories.filter(c => c.label_name && c.label_name.trim() === 'ยังไม่มีในร้าน').map(c => c.key_name));
    let list = allProducts.filter(p => !excludedCats.has(p.category));

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

    if (currentCategory !== 'all') list = list.filter(p => p.category === currentCategory);

    const normalizeThai = (str) => String(str || '').toLowerCase().replace(/เเ/g, 'แ');
    const cleanSearch = normalizeThai(currentSearch).trim();
    if (cleanSearch) {
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

    if (currentStockSort === 'asc') {
        list.sort((a, b) => getEffectiveStock(a, allProducts) - getEffectiveStock(b, allProducts));
    } else {
        list.sort((a, b) => getEffectiveStock(b, allProducts) - getEffectiveStock(a, allProducts));
    }
    return list;
}

function updateCountsAndHeader() {
    const excludedCats = new Set(categories.filter(c => c.label_name && c.label_name.trim() === 'ยังไม่มีในร้าน').map(c => c.key_name));
    
    let totalLowCount = 0;
    let outCount = 0;
    let activeProductsCount = 0;

    allProducts.forEach(p => {
        if (excludedCats.has(p.category)) return;

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

// คลิกที่ตัวการ์ดเพื่อเลือก/ยกเลิก
function toggleCardSelect(id) {
    const cleanId = String(id).trim();
    if (selectedIds.has(cleanId)) {
        selectedIds.delete(cleanId);
    } else {
        selectedIds.add(cleanId);
    }
    updateCountsAndHeader();
    renderGrid();
}

// เรนเดอร์การ์ดแนวตั้ง พื้นหลังขาว กรอบน้ำเงินเมื่อเลือก
function renderGrid() {
    const items = getFilteredList();
    const container = document.getElementById('product-card-grid');
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

    container.innerHTML = items.map((item, index) => {
        const itemId = String(item.id).trim();
        const safeId = itemId.replace(/'/g, "\\'");
        
        const stock = getEffectiveStock(item, allProducts);
        const minStock = (item.min_stock !== undefined && item.min_stock !== null) ? parseInt(item.min_stock) : 5;
        const maxStock = (item.max_stock !== undefined && item.max_stock !== null) ? parseInt(item.max_stock) : 20;
        const unit = item.unit || 'ชิ้น';
        const isChecked = selectedIds.has(itemId);
        const isPack = Boolean(item.parent_id && item.parent_id !== '' && item.parent_id !== 'null');
        const imgSrc = (item.img && String(item.img).trim() !== '') ? item.img : placeholderSVG;
        
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
            <div onclick="toggleCardSelect('${safeId}')" 
                 class="p-3 rounded-2xl ${borderClass} shadow-2xs hover:shadow-md transition-all flex flex-col justify-between text-center select-none relative group cursor-pointer active:scale-98">
                
                <!-- แถวบน: ลำดับที่ (สไตล์แคปซูลเทาอ่อนเหมือนหน้าแรก) + ป้ายสถานะ -->
                <div class="flex items-center justify-between w-full min-h-[20px]">
                    <div class="flex items-center gap-1.5">
                        ${isChecked ? `
                            <div class="w-4 h-4 bg-blue-600 text-white rounded-full flex items-center justify-center shadow-xs">
                                <svg class="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7"/></svg>
                            </div>
                        ` : ''}
                        <span class="inline-flex items-center justify-center h-5 px-2 rounded-lg bg-slate-100 text-slate-600 border border-slate-200/60 text-[10px] font-bold leading-none">
                            #${allProducts.findIndex(p => String(p.id).trim() === String(item.id).trim()) + 1}
                        </span>
                    </div>
                    <div class="flex items-center gap-1 ml-auto">
                        ${isPack ? '<span class="inline-flex items-center justify-center h-5 px-2 rounded-lg bg-indigo-50 text-indigo-600 border border-indigo-100 text-[10px] font-bold leading-none">แพ็ค</span>' : ''}
                        ${badge}
                    </div>
                </div>

                <!-- รูปภาพสินค้า ตรงกลางกล่อง -->
                <div class="w-full h-16 my-1 flex items-center justify-center pointer-events-none">
                    <img src="${imgSrc}" alt="${item.name}" class="h-full max-w-full object-contain group-hover:scale-105 transition duration-150" onerror="this.src='${placeholderSVG}'">
                </div>

                <!-- ชื่อสินค้า และสถานะคงเหลือ -->
                <div class="w-full mt-1 pointer-events-none">
                    <h3 class="text-xs font-bold text-slate-800 truncate leading-snug" title="${item.name}">${item.name}</h3>
                    <p class="text-[10px] text-slate-400 font-mono truncate">${item.id || ''}</p>
                    
                    <div class="my-1.5 py-1 px-2 rounded-lg bg-slate-50 border border-slate-100 flex items-center justify-between text-[11px]">
                        <span class="text-slate-500 font-medium">เหลือ ${stock}/${maxStock} ${unit}</span>
                        ${needToFill > 0 
                            ? `<span class="text-rose-600 font-bold">ขาด ${needToFill}</span>` 
                            : `<span class="text-emerald-600 font-bold">เต็ม</span>`}
                    </div>
                </div>

                <!-- แถวล่าง: ปุ่มเติมสต็อก -->
                <div onclick="event.stopPropagation()" class="w-full mt-1 pt-1.5 border-t border-slate-100 space-y-1.5 cursor-default">
                    <!-- ปุ่มเติมเต็ม -->
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

                    <!-- แถวปุ่มลัดตัวเลข + กล่องกรอกจำนวนสไตล์ iOS (ทรงแคปซูลมน โมเดิร์น คลีน) -->
                    <div class="flex items-center justify-between gap-1.5 pt-0.5">
                        
                        <!-- 1. ปุ่มลัด +6 / +12 แบบ iOS Segmented Pill -->
                        <div class="flex items-center bg-slate-100 p-0.5 rounded-xl border border-slate-200/60 shadow-2xs">
                            <button type="button" onclick="event.stopPropagation(); quickAddStock('${safeId}', 6)" 
                                    class="px-2.5 py-1 text-[11px] font-bold text-slate-600 hover:text-slate-900 hover:bg-white rounded-lg transition active:scale-90 cursor-pointer">+6</button>
                            <button type="button" onclick="event.stopPropagation(); quickAddStock('${safeId}', 12)" 
                                    class="px-2.5 py-1 text-[11px] font-bold text-slate-600 hover:text-slate-900 hover:bg-white rounded-lg transition active:scale-90 cursor-pointer">+12</button>
                        </div>

                        <!-- 2. กล่องกรอกจำนวน + ปุ่มบวกแบบ iOS Stepper Capsule -->
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
    }).join('');
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
            await loadInitialData();
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
                <td style="text-align: center; padding: 6px; border: 1px solid #cbd5e1; color: ${color}; font-weight: bold;">${stock <= 0 ? 'หมด (0)' : stock} ${unit} (เตือนที่ ${minStock})</td>
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
                @page { size: A4 portrait; margin: 12mm 15mm; }
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