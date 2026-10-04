let currentCategory = 'all';
let isCurrentImageRemoved = false;
let currentCopiedImgPath = '';
let currentSort = 'latest';
let searchDebounceTimer = null;
let isInternalRendering = false;

let visibleProductLimit = 40;
let currentFilteredProducts = [];

window.placeholderSVG = "data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 fill=%22none%22 viewBox=%220 0 24 24%22 stroke=%22%239CA3AF%22%3E%3Cpath stroke-linecap=%22round%22 stroke-linejoin=%22round%22 stroke-width=%221.5%22 d=%22M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z%22/%3E%3C/svg%3E";
const placeholderSVG = window.placeholderSVG;

const thaiBarcodeKeyMap = {
    'ๅ': '1', '+': '1', 'ุ': '6', 'ู': '6',
    '/': '2', '๑': '2', 'ึ': '7', '฿': '7',
    '-': '3', '๒': '3', 'ค': '8', '๕': '8',
    'ภ': '4', '๓': '4', 'ต': '9', '๖': '9',
    'ถ': '5', '๔': '5', 'จ': '0', '๗': '0',
    'ข': '-', '๘': '-', 'ช': '=', '๙': '='
};
// 🌟 ตรวจจับและแปลงเฉพาะบาร์โค้ดภาษาไทย (ป้องกันการแปลงผิดพลาดในรหัสภาษาอังกฤษ)
function checkAndFixThaiBarcode(str) {
    if (!str || typeof str !== 'string') return str;
    const trimmed = str.trim();
    if (trimmed.length < 3) return str;

    let hasThai = false;
    let allBarcodeKeys = true;
    let converted = '';

    for (let char of trimmed) {
        if (thaiBarcodeKeyMap[char] !== undefined) {
            converted += thaiBarcodeKeyMap[char];
            // ⚡ เช็คเฉพาะตัวอักษรภาษาไทยแท้ๆ (ตัด + และ / ออก ไม่ให้แปลงรหัสอังกฤษผิดพลาด)
            if (/[ๅภถุูึคตจขช๑๒๓๔๕๖๗๘๙฿]/.test(char)) {
                hasThai = true;
            }
        } else if (/[0-9a-zA-Z_.*-]/.test(char)) {
            converted += char;
        } else {
            allBarcodeKeys = false;
            break;
        }
    }

    if (allBarcodeKeys && hasThai) {
        return converted;
    }
    return str;
}

document.addEventListener("DOMContentLoaded", async () => {
    if (typeof refreshSearchUnitDropdown === 'function') refreshSearchUnitDropdown();
    if (typeof refreshUnitDropdown === 'function') refreshUnitDropdown();

    document.querySelectorAll('input, form').forEach(el => {
        el.setAttribute('autocomplete', 'off');
    });

    loadModalHTML();
    if (typeof loadPaymentModalHTML === 'function') loadPaymentModalHTML();
    await loadAndRenderCategories();
    
    if (typeof getStoredProducts === 'function') {
        const products = await getStoredProducts();
        if (typeof localProductsCache !== 'undefined') {
            localProductsCache = products;
        }
    }
    
    applyProductFilters();

    if (typeof renderCart === 'function') renderCart();
    setupBarcodeScanner();
    setupSearchProductEnter();

    // 🌟 โหลดสินค้าเพิ่มทีละ 40 รายการเมื่อเลื่อนลงล่างสุด 🌟
    const grid = document.getElementById('product-grid');
    if (grid) {
        grid.addEventListener('scroll', () => {
            if (grid.scrollTop + grid.clientHeight >= grid.scrollHeight - 200) {
                if (visibleProductLimit < currentFilteredProducts.length) {
                    visibleProductLimit += 40;
                    applyProductFilters(false);
                }
            }
        });
    }
});

// 🌟 1. คำนวณจำนวนปุ่มลัด โดยเผื่อที่ให้ปุ่มดรอปดาวน์ 150px เสมอ (ไม่ดันจนล้นขอบ) 🌟
function calculateFitCategoryCount(catBar, customCategories) {
    const totalWidth = catBar.clientWidth;
    if (!totalWidth || totalWidth < 300) return 2;

    const tester = document.createElement('div');
    tester.style.cssText = 'position:fixed;top:-9999px;left:-9999px;visibility:hidden;display:inline-flex;gap:6px;font-family:Sarabun,sans-serif;';
    document.body.appendChild(tester);

    tester.innerHTML = `
        <button class="px-4 py-1.5 text-xs sm:text-sm font-bold">ทั้งหมด</button>
        <button class="px-3.5 py-1.5 text-xs sm:text-sm font-medium">รายการที่ไม่มีบาร์โค้ด</button>
    `;
    const baseWidth = tester.offsetWidth + 8;

    // ⚡ เผื่อพื้นที่ 150px สำหรับปุ่มดรอปดาวน์ แม้จะเลือกหมวดที่มีชื่อยาวก็จะไม่ล้น
    const moreBtnReservedWidth = 150;

    let usedWidth = baseWidth;
    let count = 0;

    for (let i = 0; i < customCategories.length; i++) {
        const c = customCategories[i];
        const btn = document.createElement('button');
        btn.className = "px-3.5 py-1.5 text-xs sm:text-sm font-medium";
        btn.textContent = c.label_name;
        tester.appendChild(btn);

        const btnWidth = btn.offsetWidth + 6;
        const isLast = (i === customCategories.length - 1);
        const requiredWidth = isLast ? (usedWidth + btnWidth) : (usedWidth + btnWidth + moreBtnReservedWidth);

        if (requiredWidth <= totalWidth) {
            usedWidth += btnWidth;
            count++;
        } else {
            break;
        }
    }

    document.body.removeChild(tester);
    return Math.max(1, count);
}

// 🌟 2. ปรับเมนูดรอปดาวน์เป็น right-0 (กางกลับเข้ามาด้านใน ไม่ล้นขอบขวา) 🌟
async function loadAndRenderCategories() {
    const categories = (typeof getStoredCategories === 'function') ? await getStoredCategories() : [];
    if (typeof localCategoriesCache !== 'undefined') {
        localCategoriesCache = categories;
    }

    const catBar = document.getElementById('category-bar');
    if (!catBar) return;

    const customCategories = categories.filter(c => c.label_name !== 'รายการที่ไม่มีบาร์โค้ด' && c.key_name !== 'no_barcode');

    const maxShortcuts = calculateFitCategoryCount(catBar, customCategories);
    const topShortcutCategories = customCategories.slice(0, maxShortcuts);
    const otherCategories = customCategories.slice(maxShortcuts);

    let shortcutButtonsHtml = topShortcutCategories.map(c => `
        <button type="button" data-cat="${c.key_name}" 
                onclick="filterCategory('${c.key_name}', this)"
                class="cat-btn px-3.5 py-1.5 rounded-2xl text-xs sm:text-sm font-medium bg-white text-slate-600 border border-slate-200/80 hover:bg-slate-50 transition active:scale-95 whitespace-nowrap cursor-pointer flex-shrink-0">
            ${c.label_name}
        </button>
    `).join('');

    // ⚡ ตัดไอคอน ✓ ออก เหลือเฉพาะข้อความชื่อหมวดหมู่
    let dropdownItemsHtml = '';
    if (otherCategories.length > 0) {
        dropdownItemsHtml = otherCategories.map(c => `
            <div data-dropdown-cat="${c.key_name}" 
                 onclick="selectCategoryDropdown('${c.key_name}', '${(c.label_name || '').replace(/'/g, "\\'")}')" 
                 class="dropdown-cat-item px-3.5 py-2.5 hover:bg-slate-50 text-slate-700 font-medium text-xs sm:text-sm cursor-pointer transition border-b border-slate-100/60 last:border-b-0 whitespace-nowrap">
                <span>${c.label_name}</span>
            </div>
        `).join('');
    }

    catBar.className = "flex items-center gap-1.5 w-full relative z-30 py-1 mb-1 flex-shrink-0 select-none";

    catBar.innerHTML = `
        <button type="button" id="cat-btn-all" data-cat="all"
                onclick="filterCategory('all', this)"
                class="cat-btn px-4 py-1.5 rounded-2xl text-xs sm:text-sm font-bold bg-blue-600 text-white shadow-2xs transition active:scale-95 whitespace-nowrap cursor-pointer flex-shrink-0">
            ทั้งหมด
        </button>

        <button type="button" id="cat-btn-no-barcode" data-cat="no_barcode"
                onclick="filterCategory('no_barcode', this)"
                class="cat-btn px-3.5 py-1.5 rounded-2xl text-xs sm:text-sm font-medium bg-white text-slate-600 border border-slate-200/80 hover:bg-slate-50 transition active:scale-95 whitespace-nowrap cursor-pointer flex-shrink-0">
            รายการที่ไม่มีบาร์โค้ด
        </button>

        ${shortcutButtonsHtml}

        ${otherCategories.length > 0 ? `
        <div id="more-cat-wrapper" class="relative flex-shrink-0 flex items-center">
            <button type="button" id="more-cat-btn" onclick="toggleMoreCatDropdown()" 
                    class="cat-btn pl-3.5 pr-2.5 py-1.5 bg-white hover:bg-slate-50 border border-slate-200/80 rounded-2xl text-xs sm:text-sm font-medium text-slate-700 shadow-2xs transition active:scale-95 flex items-center justify-center gap-1.5 cursor-pointer whitespace-nowrap flex-shrink-0">
                <span id="more-cat-label" class="whitespace-nowrap translate-y-[1px]">หมวดหมู่อื่นๆ</span>
                <svg id="more-cat-arrow" class="w-3.5 h-3.5 text-slate-400 transition-transform duration-200 pointer-events-none flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M19 9l-7 7-7-7"/>
                </svg>
            </button>

            <div id="more-cat-menu" class="hidden absolute right-0 top-full mt-1.5 bg-white border border-slate-100 rounded-2xl shadow-xl z-50 overflow-hidden py-1 min-w-[200px] max-h-60 overflow-y-auto">
                ${dropdownItemsHtml}
            </div>
        </div>
        ` : ''}
    `;

    updateActiveCategoryHighlight();
}

// 🌟 3. ตัดคำว่า "หมวด: " ออก และคุมความกว้างไม่ให้เกินโควตา 150px 🌟
function updateActiveCategoryHighlight(btnElement = null, isDropdown = false, labelName = '') {
    const inactiveClass = "cat-btn px-3.5 py-1.5 rounded-2xl text-xs sm:text-sm font-medium bg-white text-slate-600 border border-slate-200/80 hover:bg-slate-50 transition active:scale-95 whitespace-nowrap cursor-pointer flex-shrink-0";
    const activeClass = "cat-btn px-4 py-1.5 rounded-2xl text-xs sm:text-sm font-bold bg-blue-600 text-white shadow-2xs transition active:scale-95 whitespace-nowrap cursor-pointer flex-shrink-0";

    // รีเซ็ตปุ่มลัดด้านนอก
    document.querySelectorAll('#category-bar button.cat-btn').forEach(btn => {
        btn.className = inactiveClass;
    });

    // รีเซ็ตไฮไลต์ในดรอปดาวน์ทั้งหมด
    document.querySelectorAll('#more-cat-menu .dropdown-cat-item').forEach(item => {
        item.classList.remove('bg-blue-50', 'text-blue-600', 'font-bold');
        item.classList.add('text-slate-700', 'font-medium');
    });

    const moreBtn = document.getElementById('more-cat-btn');
    const moreLabel = document.getElementById('more-cat-label');
    const moreArrow = document.getElementById('more-cat-arrow');

    if (moreLabel) {
        moreLabel.className = "whitespace-nowrap translate-y-[1px]";
        moreLabel.innerText = "หมวดหมู่อื่นๆ";
    }
    if (moreArrow) moreArrow.className = "w-3.5 h-3.5 text-slate-400 transition-transform duration-200 pointer-events-none flex-shrink-0";

    if (currentCategory === 'all') {
        const btnAll = document.getElementById('cat-btn-all');
        if (btnAll) btnAll.className = activeClass;
        if (moreBtn) moreBtn.className = "cat-btn pl-3.5 pr-2.5 py-1.5 bg-white hover:bg-slate-50 border border-slate-200/80 rounded-2xl text-xs sm:text-sm font-medium text-slate-700 shadow-2xs transition active:scale-95 flex items-center justify-center gap-1.5 cursor-pointer whitespace-nowrap flex-shrink-0";
    } else if (currentCategory === 'no_barcode') {
        const btnNoBarcode = document.getElementById('cat-btn-no-barcode');
        if (btnNoBarcode) btnNoBarcode.className = activeClass;
        if (moreBtn) moreBtn.className = "cat-btn pl-3.5 pr-2.5 py-1.5 bg-white hover:bg-slate-50 border border-slate-200/80 rounded-2xl text-xs sm:text-sm font-medium text-slate-700 shadow-2xs transition active:scale-95 flex items-center justify-center gap-1.5 cursor-pointer whitespace-nowrap flex-shrink-0";
    } else {
        const targetBtn = document.querySelector(`#category-bar button.cat-btn[data-cat="${currentCategory}"]`);
        if (targetBtn) {
            targetBtn.className = activeClass;
            if (moreBtn) moreBtn.className = "cat-btn pl-3.5 pr-2.5 py-1.5 bg-white hover:bg-slate-50 border border-slate-200/80 rounded-2xl text-xs sm:text-sm font-medium text-slate-700 shadow-2xs transition active:scale-95 flex items-center justify-center gap-1.5 cursor-pointer whitespace-nowrap flex-shrink-0";
        } else if (moreBtn) {
            moreBtn.className = "cat-btn pl-3.5 pr-2.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl text-xs sm:text-sm font-bold shadow-2xs transition active:scale-95 flex items-center justify-center gap-1.5 cursor-pointer whitespace-nowrap flex-shrink-0";
            if (moreArrow) moreArrow.className = "w-3.5 h-3.5 text-white transition-transform duration-200 pointer-events-none flex-shrink-0";

            let displayLabel = labelName;
            if (!displayLabel && typeof localCategoriesCache !== 'undefined') {
                const found = localCategoriesCache.find(c => c.key_name === currentCategory);
                if (found) displayLabel = found.label_name;
            }

            if (moreLabel) {
                moreLabel.className = "truncate max-w-[115px] sm:max-w-[130px] whitespace-nowrap translate-y-[1px]";
                moreLabel.innerText = displayLabel || "หมวดหมู่อื่นๆ";
                if (moreBtn) moreBtn.title = displayLabel || "หมวดหมู่อื่นๆ";
            }

            // ⚡ สลับแถบสีฟ้าอ่อนและตัวอักษรสีฟ้าเข้มให้รายการที่เลือก
            const activeDropdownItem = document.querySelector(`#more-cat-menu [data-dropdown-cat="${currentCategory}"]`);
            if (activeDropdownItem) {
                activeDropdownItem.classList.remove('text-slate-700', 'font-medium');
                activeDropdownItem.classList.add('bg-blue-50', 'text-blue-600', 'font-bold');
            }
        }
    }
}

// ปรับจำนวนปุ่มอัตโนมัติเวลากด ย่อ/ขยาย หน้าจอ
let resizeCatTimer = null;
window.addEventListener('resize', () => {
    clearTimeout(resizeCatTimer);
    resizeCatTimer = setTimeout(loadAndRenderCategories, 150);
});

function toggleMoreCatDropdown(forceState) {
    const menu = document.getElementById('more-cat-menu');
    const arrow = document.getElementById('more-cat-arrow');
    if (!menu) return;

    if (typeof forceState === 'boolean') {
        if (forceState) {
            menu.classList.remove('hidden');
            if (arrow) arrow.classList.add('rotate-180');
        } else {
            menu.classList.add('hidden');
            if (arrow) arrow.classList.remove('rotate-180');
        }
    } else {
        const isClosed = menu.classList.toggle('hidden');
        if (arrow) {
            if (isClosed) arrow.classList.remove('rotate-180');
            else arrow.classList.add('rotate-180');
        }
    }
}

function refocusBarcode() {
    const input = document.getElementById('barcode-input');
    const openModal = document.querySelector('[id$="-modal"]:not(.hidden)');
    if (input && !openModal) {
        input.focus();
    }
}

// 🌟 ระบบดักจับบาร์โค้ดส่วนกลาง (Global Barcode Sniffer) 🌟
// 🌟 ระบบดักจับบาร์โค้ดความเร็วสูง + ควบคุมเคอร์เซอร์ด้วย Enter 🌟
let globalBarcodeBuffer = '';
let globalBarcodeTimeout = null;

function setupBarcodeScanner() {
    const input = document.getElementById('barcode-input');
    const pIdInput = document.getElementById('p-id');

    if (pIdInput) {
        pIdInput.addEventListener('change', (e) => {
            e.target.value = checkAndFixThaiBarcode(e.target.value);
        });
    }

    // ⚡ 1. การทำงานเมื่อเคอร์เซอร์อยู่ในช่องสแกน
    if (input) {
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                const val = input.value.trim();

                if (!val) {
                    // 🛑 ตัดสัญญาณ Enter ไม่ให้ทะลุ (Bubble) ไปถึง Modal ชำระเงิน
                    e.stopPropagation();
                    e.stopImmediatePropagation();

                    // ถ้าช่องว่างแล้วกด Enter -> เปิดหน้าต่างชำระเงิน
                    if (typeof cart !== 'undefined' && cart && cart.length > 0) {
                        if (typeof openPaymentModal === 'function') openPaymentModal();
                    } else {
                        if (typeof showCustomModal === 'function') {
                            showCustomModal('warning', 'ไม่มีสินค้าในตะกร้า', 'กรุณาเลือกสินค้าก่อนทำรายการชำระเงิน');
                        }
                    }
                    return;
                }

                // แปลงภาษาไทยและยิงเข้าตะกร้าตอนกด Enter ทีเดียว ข้อมูลจะมาครบ 100%
                processBarcodeScan(val);
                input.value = '';
                input.focus();
            }
        });
    }

    // ⚡ 2. การทำงานระดับ Global (เมื่อเคอร์เซอร์อยู่นอกช่อง หรือไม่ได้คลิกอะไร)
    document.addEventListener('keydown', (e) => {
        if (e.ctrlKey || e.altKey || e.metaKey) return;

        const activeEl = document.activeElement;
        const activeTag = activeEl ? activeEl.tagName.toLowerCase() : '';
        const activeId = activeEl ? activeEl.id : '';

        // ถ้ากำลังพิมพ์ในช่องค้นหาสินค้า, กล่องข้อความ หรือ Modal อื่น ให้ข้ามไป
        const isTypingField = activeTag === 'textarea' || (activeTag === 'input' && activeId !== 'barcode-input');
        if (isTypingField) return;

        // ถ้าเคอร์เซอร์อยู่ในช่อง barcode-input อยู่แล้ว ให้บล็อกด้านบนจัดการ
        if (activeEl && activeId === 'barcode-input') return;

        // 🟢 เมื่อกด Enter จากหน้าจอว่างๆ
        if (e.key === 'Enter') {
            if (globalBarcodeBuffer.trim().length >= 3) {
                // กรณียิงบาร์โค้ดเข้ามาแบบ Global
                e.preventDefault();
                processBarcodeScan(globalBarcodeBuffer.trim());
                globalBarcodeBuffer = '';
            } else {
                // 🎯 เช็กก่อนว่ามี Modal ใดๆ เปิดอยู่หรือไม่ ถ้าไม่มีเลยถึงจะดึงเคอร์เซอร์ไปช่องสแกน
                const openModal = document.querySelector('[id$="-modal"]:not(.hidden)');
                if (!openModal) {
                    e.preventDefault();
                    if (input) {
                        input.focus();
                        input.select();
                    }
                }
            }
            return;
        }

        // ดักเก็บตัวอักษรเข้า Buffer (ขยายเวลาเป็น 400ms เพื่อความเสถียร ไม่หลุดเฟรม)
        if (e.key.length === 1) {
            globalBarcodeBuffer += e.key;

            clearTimeout(globalBarcodeTimeout);
            globalBarcodeTimeout = setTimeout(() => {
                globalBarcodeBuffer = '';
            }, 400);
        }
    });
}
// 🟢 ฟังก์ชันแกนกลางประมวลผลบาร์โค้ดลงตะกร้า (รองรับตัวคูณที่พิมพ์ค้างไว้ในช่องสแกน)
function processBarcodeScan(rawText) {
    if (!rawText) return;

    const inputEl = document.getElementById('barcode-input');
    const inputPrefix = inputEl ? inputEl.value.trim() : '';

    // ⚡ ดึงตัวคูณที่พิมพ์ค้างไว้ เช่น "5*" ในช่องมารวมกับบาร์โค้ดที่เพิ่งยิง
    let combinedText = rawText;
    if (!combinedText.includes('*') && inputPrefix.endsWith('*')) {
        combinedText = inputPrefix + combinedText;
    }

    let rawInput = checkAndFixThaiBarcode(combinedText);
    let multiplyQty = 1;
    let actualBarcode = rawInput;

    // รองรับสูตรคูณ เช่น 5*บาร์โค้ด
    if (rawInput.includes('*')) {
        const parts = rawInput.split('*');
        const parsedQty = parseInt(parts[0], 10);
        if (!isNaN(parsedQty) && parsedQty > 0 && parts[1]) {
            multiplyQty = parsedQty;
            actualBarcode = parts[1].trim();
        }
    }

    if (typeof cleanBarcodeString === 'function') {
        actualBarcode = cleanBarcodeString(actualBarcode) || actualBarcode;
    }

    if (actualBarcode) {
        // ปิดหน้าต่างพรีวิวรูปภาพทันทีถ้าเปิดค้างอยู่
        if (typeof closeImagePreviewModal === 'function') {
            closeImagePreviewModal();
        }

        // ⚡ ล้างค่าในช่องสแกนทิ้งทันที เพื่อไม่ให้ "5*" ค้างอยู่รอบถัดไป
        if (inputEl) {
            inputEl.value = '';
        }

        if (typeof addToCart === 'function') {
            const finalQty = Math.min(multiplyQty, 99);
            for (let i = 0; i < finalQty; i++) {
                addToCart(actualBarcode);
            }
        }
    }
}
function setupSearchProductEnter() {
    const searchInput = document.getElementById('search-product');
    if (!searchInput) return;

    searchInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            clearTimeout(searchDebounceTimer); // ⚡ ยกเลิกตัวจับเวลาค้นหา ไม่ให้ยิงคำสั่งซ้ำซ้อน
            const fixed = checkAndFixThaiBarcode(searchInput.value);
            if (fixed !== searchInput.value) {
                searchInput.value = fixed;
            }
            applyProductFilters();
        }
    });
}
function applyProductFilters(resetLimit = true) {
    if (resetLimit) visibleProductLimit = 40; // รีเซ็ตกลับเป็น 40 เมื่อเริ่มค้นหาใหม่
    const normalizeThai = (str) => String(str || '').toLowerCase().replace(/เเ/g, 'แ');
    const searchInput = document.getElementById('search-product');
    const rawKeyword = (searchInput?.value || '').trim();
    const keyword = normalizeThai(rawKeyword);
    const convertedBarcode = typeof cleanBarcodeString === 'function' ? cleanBarcodeString(rawKeyword) : '';
    const unitKeyword = document.getElementById('search-unit')?.value.toLowerCase().trim() || '';
    
    const sourceProducts = (typeof localProductsCache !== 'undefined' && Array.isArray(localProductsCache)) 
        ? localProductsCache 
        : [];

    if (sourceProducts.length === 0) {
        isInternalRendering = true;
        renderProductsHTML([]);
        isInternalRendering = false;
        return;
    }

    const currentIds = sourceProducts.map(p => String(p.id).trim());
    let savedIndexMap = JSON.parse(localStorage.getItem('pos_catalog_indexes') || '{}');

    Object.keys(savedIndexMap).forEach(id => {
        if (!currentIds.includes(id)) {
            delete savedIndexMap[id];
        }
    });

    if (Object.keys(savedIndexMap).length === 0 && sourceProducts.length > 0) {
        sourceProducts.forEach((p, idx) => {
            if (p && p.id) savedIndexMap[String(p.id).trim()] = idx + 1;
        });
    }

    const existingItems = sourceProducts.filter(p => savedIndexMap[String(p.id).trim()]);
    existingItems.sort((a, b) => savedIndexMap[String(a.id).trim()] - savedIndexMap[String(b.id).trim()]);

    const newItems = sourceProducts.filter(p => !savedIndexMap[String(p.id).trim()]);
    const finalOrder = [...existingItems, ...newItems];

    savedIndexMap = {};
    finalOrder.forEach((p, idx) => {
        savedIndexMap[String(p.id).trim()] = idx + 1;
    });
    localStorage.setItem('pos_catalog_indexes', JSON.stringify(savedIndexMap));

    const indexedProducts = sourceProducts.map(p => ({
        ...p,
        _catalogIndex: savedIndexMap[String(p.id).trim()] || 1
    }));

    let filtered = indexedProducts.filter(p => {
        if (!p) return false;

        if (currentCategory === 'no_barcode') {
            if (!(p.is_no_barcode == 1 || p.is_no_barcode === '1' || p.is_no_barcode === true)) return false;
        } else if (currentCategory !== 'all') {
            if (p.category !== currentCategory) return false;
        }

        if (unitKeyword) {
            const unitText = String(p.unit || 'ชิ้น').toLowerCase();
            if (!unitText.includes(unitKeyword)) return false;
        }

        if (keyword) {
            if (rawKeyword.startsWith('#')) {
                const targetIndexStr = rawKeyword.replace(/#/g, '').trim();
                if (!targetIndexStr) return true; 
                const currentIndexStr = String(p._catalogIndex || '');
                return currentIndexStr === targetIndexStr || currentIndexStr.startsWith(targetIndexStr);
            }

            const name = normalizeThai(p.name || '');
            const idStr = String(p.id || '').trim().toLowerCase();
            const matchName = name.includes(keyword);
            const matchBarcode = idStr.includes(keyword) || (convertedBarcode && idStr.includes(convertedBarcode));

            if (!matchName && !matchBarcode) return false;
        }

        return true;
    });

    if (currentSort === 'latest') {
        filtered.sort((a, b) => (b._catalogIndex || 0) - (a._catalogIndex || 0));
    } else if (currentSort === 'index') {
        filtered.sort((a, b) => (a._catalogIndex || 0) - (b._catalogIndex || 0));
    } else if (currentSort === 'name_asc') {
        filtered.sort((a, b) => String(a.name || '').localeCompare(String(b.name || ''), 'th'));
    } else if (currentSort === 'price_asc') {
        filtered.sort((a, b) => (parseFloat(a.price) || 0) - (parseFloat(b.price) || 0));
    } else if (currentSort === 'price_desc') {
        filtered.sort((a, b) => (parseFloat(b.price) || 0) - (parseFloat(a.price) || 0));
    } else if (currentSort === 'low_stock') {
        filtered.sort((a, b) => (parseInt(a.stock_qty) || 0) - (parseInt(b.stock_qty) || 0));
    } else if (currentSort === 'high_stock') {
        filtered.sort((a, b) => (parseInt(b.stock_qty) || 0) - (parseInt(a.stock_qty) || 0));
    }

    currentFilteredProducts = filtered;

    // 🌟 ตัดยอดเอาเฉพาะ 40 ชิ้นแรกไปวาดบนหน้าจอ 🌟
    const paginatedProducts = filtered.slice(0, visibleProductLimit);

    isInternalRendering = true;
    renderProductsHTML(paginatedProducts);
    
    // อัปเดตตัวเลขหัวข้อให้แสดงจำนวนสินค้าทั้งหมดที่ค้นเจอ (เช่น 692)
    const countEl = document.getElementById('product-count');
    if (countEl) countEl.innerText = `${filtered.length}`;
    
    isInternalRendering = false;
}

function renderProducts(productList) {
    if (!isInternalRendering && Array.isArray(productList)) {
        if (typeof localProductsCache !== 'undefined') {
            localProductsCache = [...productList];
        }
        applyProductFilters();
        return;
    }
    renderProductsHTML(productList);
}

function renderProductsHTML(productList) {
    const countEl = document.getElementById('product-count');
    if (countEl) countEl.innerText = `${productList ? productList.length : 0}`;

    const grid = document.getElementById('product-grid');
    if (!grid) return;

    if (!productList || productList.length === 0) {
        grid.innerHTML = '<p class="col-span-full text-center py-8 text-slate-400">ไม่พบรายการสินค้า</p>';
        return;
    }

    const allProducts = (typeof localProductsCache !== 'undefined' && localProductsCache.length > 0) ? localProductsCache : productList;
    
    const productStockMap = new Map();
    allProducts.forEach(p => {
        if (p && p.id !== undefined) {
            productStockMap.set(String(p.id).trim(), parseInt(p.stock_qty) || 0);
        }
    });

    const htmlCards = productList.map(item => {
        if (!item) return '';

        // ดักรูป placeholder.jpg ที่ไม่มีอยู่จริงออกทันที เพื่อไม่ให้ยิง Request จนเกิด 404
        const rawImg = String(item.img || '').trim();
        const isInvalidImg = !rawImg || rawImg.includes('placeholder.jpg');
        let imgSrc = isInvalidImg ? window.placeholderSVG : rawImg;

        // ดักจับกรณีที่ในฐานข้อมูลไม่มี images/ นำหน้า ให้เติมให้อัตโนมัติ
        if (!isInvalidImg && !imgSrc.startsWith('images/') && !imgSrc.startsWith('/images/') && !imgSrc.startsWith('http') && !imgSrc.startsWith('data:')) {
            imgSrc = `images/${imgSrc}`;
        }

        const unitText = item.unit || 'ชิ้น';
        const rawName = String(item.name || '');
        const escapedName = rawName.replace(/'/g, "\\'");
        const catKey = item.category || '';
        const safeId = String(item.id || '').replace(/'/g, "\\'");
        const catalogIndex = item._catalogIndex !== undefined ? item._catalogIndex : '-';
        
        let stock = parseInt(item.stock_qty) || 0;
        if (item.parent_id) {
            const parentStock = productStockMap.get(String(item.parent_id).trim()) || 0;
            const multiplier = parseInt(item.multiplier) > 0 ? parseInt(item.multiplier) : 1;
            stock = Math.floor(parentStock / multiplier);
        }
        
        const priceNum = parseFloat(item.price) || 0;
        const formattedPrice = priceNum.toLocaleString('th-TH', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        });

        let stockBadgeHtml = '';
        let disableAddToCart = false;

        const minStock = (item.min_stock !== undefined && item.min_stock !== null) ? parseInt(item.min_stock) : 5;
        const maxStock = (item.max_stock !== undefined && item.max_stock !== null) ? parseInt(item.max_stock) : 20;

        if (stock <= 0) {
            stockBadgeHtml = `<span class="inline-block px-1.5 py-0.5 bg-rose-50 text-rose-600 border border-rose-200 text-[10px] font-bold rounded-md">สินค้าหมด</span>`;
            disableAddToCart = true;
        } else if (stock <= minStock) {
            stockBadgeHtml = `<span class="inline-block px-1.5 py-0.5 bg-amber-50 text-amber-700 border border-amber-300 text-[10px] font-bold rounded-md animate-pulse">เหลือ ${stock}/${maxStock} ${unitText}</span>`;
        } else {
            stockBadgeHtml = `<span class="text-[11px] text-slate-400 font-medium">เหลือ ${stock}/${maxStock} ${unitText}</span>`;
        }
        
        return `
            <div class="bg-white p-2.5 sm:p-3 rounded-2xl border ${stock <= 0 ? 'border-rose-200' : (stock <= minStock ? 'border-amber-300' : 'border-slate-200/80')} hover:shadow-lg hover:border-slate-400 transition-all duration-200 cursor-pointer flex flex-col items-center text-center group relative" 
                onclick="openImagePreviewModal('${imgSrc}', '${escapedName}', '${safeId}', '${catKey}')">
                
                <div class="absolute top-2 left-2 bg-slate-100/90 backdrop-blur-xs text-slate-600 text-[9px] font-bold px-1.5 py-0.5 rounded-md border border-slate-200/60 z-10 shadow-2xs">
                    #${catalogIndex}
                </div>

                <div class="absolute top-2 right-2 flex gap-0.5 opacity-0 group-hover:opacity-100 transition duration-150 z-10 bg-white/95 backdrop-blur-xs p-0.5 rounded-lg shadow-md border border-slate-100">
                    <button type="button" onclick="event.stopPropagation(); duplicateProduct('${safeId}')" title="คัดลอก" class="p-1 hover:bg-indigo-50 rounded transition active:scale-90 cursor-pointer">
                        <div class="w-3 h-3 bg-slate-600 hover:bg-indigo-600 transition" style="mask: url('icon/copy.png') no-repeat center / contain; -webkit-mask: url('icon/copy.png') no-repeat center / contain;"></div>
                    </button>
                    <button type="button" onclick="event.stopPropagation(); openEditModal('${safeId}')" title="แก้ไข" class="p-1 hover:bg-blue-50 rounded transition active:scale-90 cursor-pointer">
                        <div class="w-3 h-3 bg-slate-600 hover:bg-blue-600 transition" style="mask: url('icon/pencil.png') no-repeat center / contain; -webkit-mask: url('icon/pencil.png') no-repeat center / contain;"></div>
                    </button>
                    <button type="button" onclick="event.stopPropagation(); deleteProduct('${safeId}')" title="ลบ" class="p-1 hover:bg-rose-50 rounded transition active:scale-90 cursor-pointer">
                        <div class="w-3 h-3 bg-slate-600 hover:bg-rose-600 transition" style="mask: url('icon/delete.png') no-repeat center / contain; -webkit-mask: url('icon/delete.png') no-repeat center / contain;"></div>
                    </button>
                </div>

                <div class="w-full h-16 sm:h-20 my-0.5 rounded-xl bg-white flex items-center justify-center p-1">
                    <!-- เรียก window.placeholderSVG โดยตรง ไม่ใส่เครื่องหมายคำพูดครอบตัวแปร -->
                    <img src="${imgSrc}" alt="${rawName}" loading="lazy" class="w-full h-full object-contain group-hover:scale-105 transition duration-200" onerror="this.onerror=null; this.src=window.placeholderSVG;">
                </div>
                
                <!-- 🌟 ปรับเป็น line-clamp-2 และใส่ min-h เพื่อให้การ์ด 1 บรรทัดและ 2 บรรทัดสูงเท่ากันเสมอกัน 🌟 -->
                <h3 class="text-xs font-bold text-slate-800 line-clamp-2 w-full mt-1 min-h-[2rem] sm:min-h-[2.25rem] flex items-center justify-center leading-snug" title="${rawName}">
                    ${rawName}
                </h3>
                <p class="text-[10px] text-slate-400 font-mono leading-none mt-0.5">${item.id || ''}</p>
                
                <div class="my-1">
                    ${stockBadgeHtml}
                </div>

                <div class="w-full flex items-center justify-between mt-auto pt-1.5 border-t border-slate-100">
                    <div class="text-left">
                        <p class="text-[9px] text-slate-400 font-medium leading-none">ราคา</p>
                        <p class="text-sm sm:text-base font-black text-slate-900 tracking-tight mt-0.5 leading-none">฿${formattedPrice}</p>
                    </div>

                    <button type="button" 
                            onclick="event.stopPropagation(); ${disableAddToCart ? "showCustomModal('out_of_stock', 'สินค้าหมด', 'สินค้ารายการนี้ไม่มีสต็อกคงเหลือ');" : `addToCart('${safeId}')`}" 
                            title="${disableAddToCart ? 'สินค้าหมด' : 'เพิ่มลงตะกร้า'}" 
                            class="w-10 h-10 sm:w-8 sm:h-8 ${disableAddToCart ? 'bg-slate-200 text-slate-400 cursor-not-allowed' : 'bg-emerald-600 hover:bg-emerald-700 active:scale-90 shadow-sm shadow-emerald-600/25 cursor-pointer'} rounded-xl flex items-center justify-center transition flex-shrink-0">
                        <div class="w-5 h-5 sm:w-4 sm:h-4 ${disableAddToCart ? 'bg-slate-400' : 'bg-white'}" 
                            style="mask: url('icon/add-to-basket.png') no-repeat center / contain; -webkit-mask: url('icon/add-to-basket.png') no-repeat center / contain;">
                        </div>
                    </button>
                </div>
            </div>
        `;
    }).join('');

    grid.innerHTML = htmlCards;
}

function selectCategoryDropdown(catKey, catLabel) {
    toggleMoreCatDropdown(false);
    filterCategory(catKey, null, true, catLabel);
}

async function filterCategory(category, btnElement, isDropdown = false, labelName = '') {
    currentCategory = category || 'all';
    updateActiveCategoryHighlight(btnElement, isDropdown, labelName);
    applyProductFilters();
}

document.addEventListener('click', (e) => {
    const wrapper = document.getElementById('more-cat-wrapper');
    if (wrapper && !wrapper.contains(e.target)) {
        toggleMoreCatDropdown(false);
    }
});

function handleProductSearchInput(e) {
    clearTimeout(searchDebounceTimer);
    searchDebounceTimer = setTimeout(() => {
        const searchInput = document.getElementById('search-product');
        if (searchInput && searchInput.value) {
            const fixed = checkAndFixThaiBarcode(searchInput.value);
            if (fixed !== searchInput.value) {
                searchInput.value = fixed; // ⚡ แปลงตัวอักษรภาษาไทยในช่องค้นหาเป็นตัวเลขอัตโนมัติ
            }
        }
        applyProductFilters();
    }, 100);
}

document.getElementById('search-product')?.addEventListener('input', handleProductSearchInput);
document.getElementById('search-unit')?.addEventListener('change', applyProductFilters);

document.addEventListener('paste', (e) => {
    const modal = document.getElementById('add-product-modal');
    if (modal && !modal.classList.contains('hidden')) {
        const items = (e.clipboardData || e.originalEvent.clipboardData).items;
        for (let item of items) {
            if (item.type.indexOf('image') !== -1) {
                const file = item.getAsFile();
                const dataTransfer = new DataTransfer();
                dataTransfer.items.add(file);
                const fileInput = document.getElementById('p-file');
                if (fileInput) {
                    fileInput.files = dataTransfer.files;
                    const changeEvent = new Event('change', { bubbles: true });
                    fileInput.dispatchEvent(changeEvent);
                }
                break;
            }
        }
    }
});

function toggleSearchUnitDropdown() {
    const menu = document.getElementById('search-unit-menu');
    const arrow = document.getElementById('search-unit-arrow');
    
    const sortMenu = document.getElementById('sort-product-menu');
    const sortArrow = document.getElementById('sort-product-arrow');
    if (sortMenu) sortMenu.classList.add('hidden');
    if (sortArrow) sortArrow.classList.remove('rotate-180');

    if (menu) menu.classList.toggle('hidden');
    if (arrow) arrow.classList.toggle('rotate-180');
}

function selectSearchUnit(val) {
    const hiddenInput = document.getElementById('search-unit');
    const labelSpan = document.getElementById('search-unit-label');
    if (hiddenInput) hiddenInput.value = val;
    if (labelSpan) labelSpan.innerText = val || 'ทุกหน่วยนับ';
    const menu = document.getElementById('search-unit-menu');
    const arrow = document.getElementById('search-unit-arrow');
    if (menu) menu.classList.add('hidden');
    if (arrow) arrow.classList.remove('rotate-180');
    applyProductFilters();
}

document.addEventListener('click', (e) => {
    const searchUnitBtn = document.getElementById('search-unit-btn');
    const searchUnitMenu = document.getElementById('search-unit-menu');
    if (searchUnitBtn && searchUnitMenu && !searchUnitBtn.contains(e.target) && !searchUnitMenu.contains(e.target)) {
        searchUnitMenu.classList.add('hidden');
        const arrow = document.getElementById('search-unit-arrow');
        if (arrow) arrow.classList.remove('rotate-180');
    }
});

function toggleSortDropdown() {
    const menu = document.getElementById('sort-product-menu');
    const arrow = document.getElementById('sort-product-arrow');
    
    const unitMenu = document.getElementById('search-unit-menu');
    const unitArrow = document.getElementById('search-unit-arrow');
    if (unitMenu) unitMenu.classList.add('hidden');
    if (unitArrow) unitArrow.classList.remove('rotate-180');

    if (menu) menu.classList.toggle('hidden');
    if (arrow) arrow.classList.toggle('rotate-180');
}

function selectSortOption(val, label) {
    currentSort = val;
    const hiddenInput = document.getElementById('sort-product');
    const labelSpan = document.getElementById('sort-product-label');
    if (hiddenInput) hiddenInput.value = val;
    if (labelSpan) labelSpan.innerText = label;
    const menu = document.getElementById('sort-product-menu');
    const arrow = document.getElementById('sort-product-arrow');
    if (menu) menu.classList.add('hidden');
    if (arrow) arrow.classList.remove('rotate-180');
    applyProductFilters();
}

function openImagePreviewModal(imgSrc, titleName, barcodeId, categoryKey) {
    const modal = document.getElementById('image-view-modal');
    const img = document.getElementById('image-view-target');
    const title = document.getElementById('image-view-title');
    const catEl = document.getElementById('image-view-category');
    const barcodeSvg = document.getElementById('image-view-barcode');
    
    if (modal && img) {
        img.src = imgSrc;
        if (title) title.innerText = titleName;

        if (catEl) {
            const catObj = (typeof localCategoriesCache !== 'undefined' && localCategoriesCache.length > 0)
                ? localCategoriesCache.find(c => c.key_name === categoryKey)
                : null;
            catEl.innerText = catObj ? catObj.label_name : (categoryKey || 'ทั่วไป');
        }

        if (barcodeId && barcodeSvg && typeof JsBarcode === 'function') {
            const cleanId = String(barcodeId).trim();
            const isEAN13 = /^\d{13}$/.test(cleanId);
            const primaryFormat = isEAN13 ? "EAN13" : "CODE128";

            try {
                JsBarcode("#image-view-barcode", cleanId, {
                    format: primaryFormat,
                    width: 2,
                    height: 55,
                    fontSize: 14,
                    margin: 12,
                    background: "#ffffff",
                    lineColor: "#000000",
                    displayValue: true
                });
                barcodeSvg.style.display = 'block';
            } catch (e) {
                try {
                    JsBarcode("#image-view-barcode", cleanId, {
                        format: "CODE128",
                        width: 1.8,
                        height: 55,
                        fontSize: 14,
                        margin: 12,
                        displayValue: true
                    });
                    barcodeSvg.style.display = 'block';
                } catch (err) {
                    barcodeSvg.style.display = 'none';
                }
            }
        } else if (barcodeSvg) {
            barcodeSvg.style.display = 'none';
        }

        modal.classList.remove('hidden');
    }
}

function closeImagePreviewModal() {
    const modal = document.getElementById('image-view-modal');
    if (modal) modal.classList.add('hidden');
}

function quickAddHotkey(productId) {
    if (!productId) return;
    if (typeof addToCart === 'function') {
        addToCart(productId);
    }
}

let cameraScannerInstance = null;
let scannerCallback = null;

function openCameraScannerModal(callbackAction = null) {
    scannerCallback = callbackAction;

    const modal = document.getElementById('camera-scanner-modal');
    if (!modal) return;
    modal.classList.remove('hidden');

    if (cameraScannerInstance) {
        try { cameraScannerInstance.clear(); } catch(e) {}
        cameraScannerInstance = null;
    }

    cameraScannerInstance = new Html5Qrcode("camera-reader-viewport");

    // ⚡ 1. บีบขอบเขตสแกนให้อยู่เฉพาะแนวแถบเส้นสีแดงตรงกลางจอ (Laser Slot)
    const laserQrBox = (viewfinderWidth, viewfinderHeight) => {
        const width = Math.floor(viewfinderWidth * 0.90);
        const height = Math.min(Math.floor(viewfinderHeight * 0.28), 130);
        return {
            width: Math.max(width, 240),
            height: Math.max(height, 95)
        };
    };

    const config = {
        fps: 15, // ⚡ ปรับเป็น 15 FPS เพื่อให้ซีพียูมือถือประมวลผลทัน ไม่หลุดเฟรม
        qrbox: laserQrBox,
        experimentalFeatures: {
            useBarCodeDetectorIfSupported: false // ป้องกันปัญหากล้องค้างบน Safari iOS
        },
        formatsToSupport: [
            Html5QrcodeSupportedFormats.EAN_13,
            Html5QrcodeSupportedFormats.EAN_8,
            Html5QrcodeSupportedFormats.UPC_A,
            Html5QrcodeSupportedFormats.UPC_E,
            Html5QrcodeSupportedFormats.CODE_128,
            Html5QrcodeSupportedFormats.CODE_39
        ]
    };

    const onScanSuccess = (decodedText) => {
        // ⚡ 2. ลบเครื่องหมาย * ที่หัวและท้ายบาร์โค้ดออกอัตโนมัติ (แก้ปัญหา Code 39 ส่ง * นำหน้า/ตามหลัง)
        let cleanCode = decodedText.trim().replace(/^\*+|\*+$/g, '').trim();
        if (cleanCode.length < 3) return;

        try {
            const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
            const osc = audioCtx.createOscillator();
            osc.type = 'sine';
            osc.frequency.value = 1000;
            osc.connect(audioCtx.destination);
            osc.start();
            osc.stop(audioCtx.currentTime + 0.1);
        } catch(e) {}

        if (typeof scannerCallback === 'function') {
            scannerCallback(cleanCode);
        } else if (typeof addToCart === 'function') {
            addToCart(cleanCode);
        }
        closeCameraScannerModal();
    };

    cameraScannerInstance.start(
        { facingMode: "environment" },
        config,
        onScanSuccess,
        () => {}
    ).then(() => {
        setupTapToFocus();
        injectHardwareZoom();
    }).catch(err => {
        console.error("Camera start failed:", err);
    });
}

// 🌟 ระบบควบคุมฮาร์ดแวร์เลนส์ซูม 🌟
function injectHardwareZoom() {
    const viewport = document.getElementById('camera-reader-viewport');
    if (!viewport) return;

    const oldBtn = document.getElementById('camera-zoom-btn');
    if (oldBtn) oldBtn.remove();

    const video = viewport.querySelector('video');
    if (!video || !video.srcObject) return;

    const track = video.srcObject.getVideoTracks()[0];
    if (!track || !track.getCapabilities) return;

    const caps = track.getCapabilities();
    if (!caps.zoom) return;

    let isZoomed = false;
    const zoomBtn = document.createElement('button');
    zoomBtn.id = 'camera-zoom-btn';
    zoomBtn.type = 'button';
    zoomBtn.innerHTML = '🔍 1x';
    zoomBtn.style.cssText = `
        position: absolute;
        bottom: 14px;
        right: 14px;
        background: rgba(15, 23, 42, 0.75);
        backdrop-filter: blur(4px);
        color: #fff;
        border: 1px solid rgba(255, 255, 255, 0.3);
        border-radius: 9999px;
        padding: 6px 14px;
        font-size: 13px;
        font-weight: bold;
        z-index: 60;
        cursor: pointer;
    `;

    zoomBtn.onclick = async (e) => {
        e.stopPropagation();
        isZoomed = !isZoomed;
        const targetZoom = isZoomed ? Math.min(2.5, caps.zoom.max || 2) : 1;
        try {
            await track.applyConstraints({ advanced: [{ zoom: targetZoom }] });
            zoomBtn.innerHTML = isZoomed ? '🔍 2x' : '🔍 1x';
        } catch (err) {}
    };

    viewport.appendChild(zoomBtn);
}

// 🌟 ระบบแตะหน้าจอเพื่อกระตุ้นโฟกัส 🌟
function setupTapToFocus() {
    const viewport = document.getElementById('camera-reader-viewport');
    if (!viewport || viewport._hasTapListener) return;
    viewport._hasTapListener = true;

    viewport.style.position = 'relative';

    const handleFocusTap = async (e) => {
        const video = viewport.querySelector('video');
        if (!video || !video.srcObject) return;

        const rect = viewport.getBoundingClientRect();
        const clientX = e.touches ? e.touches[0].clientX : e.clientX;
        const clientY = e.touches ? e.touches[0].clientY : e.clientY;

        const x = clientX - rect.left;
        const y = clientY - rect.top;

        showFocusRing(viewport, x, y);

        const track = video.srcObject.getVideoTracks()[0];
        if (!track || !track.getCapabilities) return;

        const capabilities = track.getCapabilities();
        if (capabilities.focusMode) {
            try {
                if (capabilities.focusMode.includes('continuous')) {
                    await track.applyConstraints({ advanced: [{ focusMode: 'manual' }] });
                    await track.applyConstraints({ advanced: [{ focusMode: 'continuous' }] });
                } else if (capabilities.focusMode.includes('single-shot')) {
                    await track.applyConstraints({ advanced: [{ focusMode: 'single-shot' }] });
                }
            } catch (err) {
                try {
                    await track.applyConstraints({ advanced: [{ focusMode: 'continuous' }] });
                } catch (e) {}
            }
        }
    };

    viewport.addEventListener('click', handleFocusTap);
    viewport.addEventListener('touchstart', handleFocusTap, { passive: true });
}

function showFocusRing(parent, x, y) {
    const existing = parent.querySelector('.focus-ring');
    if (existing) existing.remove();

    const ring = document.createElement('div');
    ring.className = 'focus-ring';
    ring.style.cssText = `
        position: absolute;
        width: 60px;
        height: 60px;
        border: 2px solid #22c55e;
        border-radius: 8px;
        left: ${x - 30}px;
        top: ${y - 30}px;
        pointer-events: none;
        z-index: 50;
        transform: scale(1.3);
        opacity: 1;
        transition: transform 0.2s ease-out, opacity 0.4s ease-in;
        box-shadow: 0 0 10px rgba(34, 197, 94, 0.5);
    `;

    parent.appendChild(ring);

    requestAnimationFrame(() => {
        ring.style.transform = 'scale(1)';
    });

    setTimeout(() => {
        ring.style.opacity = '0';
        setTimeout(() => ring.remove(), 400);
    }, 600);
}

function closeCameraScannerModal() {
    const modal = document.getElementById('camera-scanner-modal');
    scannerCallback = null;
    
    if (cameraScannerInstance && cameraScannerInstance.isScanning) {
        cameraScannerInstance.stop().then(() => {
            if (modal) modal.classList.add('hidden');
            refocusBarcode();
        }).catch(err => {
            if (modal) modal.classList.add('hidden');
        });
    } else {
        if (modal) modal.classList.add('hidden');
    }
}