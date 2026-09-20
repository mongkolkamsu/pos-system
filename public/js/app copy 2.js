let currentCategory = 'all';
let isCurrentImageRemoved = false;
let currentCopiedImgPath = '';
let currentSort = 'latest';
let searchDebounceTimer = null;
let isInternalRendering = false;
const MAX_VISIBLE_CATEGORIES = 3; // 🌟 แสดงปุ่มหมวดหมู่หลัก 3 ปุ่ม (กำลังพอดี ไม่ล้นขอบจอแน่นอน)

const placeholderSVG = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%239CA3AF'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z'/%3E%3C/svg%3E";

const thaiBarcodeKeyMap = {
    'ๅ': '1', '+': '1', 'ุ': '6', 'ู': '6',
    '/': '2', '๑': '2', 'ึ': '7', '฿': '7',
    '-': '3', '๒': '3', 'ค': '8', '๕': '8',
    'ภ': '4', '๓': '4', 'ต': '9', '๖': '9',
    'ถ': '5', '๔': '5', 'จ': '0', '๗': '0',
    'ข': '-', '๘': '-', 'ช': '=', '๙': '='
};

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
});

// แถบหมวดหมู่ Hybrid ล็อกพื้นที่พอดีกรอบ ไม่ล้น และไม่โดนตัดแหว่ง
async function loadAndRenderCategories() {
    const categories = (typeof getStoredCategories === 'function') ? await getStoredCategories() : [];
    const catBar = document.getElementById('category-bar');
    
    if (catBar) {
        catBar.className = "flex items-center gap-1.5 w-full relative z-30 py-1 mb-1 flex-shrink-0 select-none";

        let buttonsHtml = `
            <button data-cat="all" class="cat-btn px-4 py-1.5 rounded-2xl text-xs sm:text-sm font-bold bg-blue-600 text-white shadow-2xs transition active:scale-95 whitespace-nowrap cursor-pointer flex-shrink-0 snap-start" 
                    onclick="filterCategory('all', this)">ทั้งหมด</button>
            <button data-cat="no_barcode" class="cat-btn px-4 py-1.5 rounded-2xl text-xs sm:text-sm font-medium bg-white text-slate-600 border border-slate-200/80 hover:bg-slate-50 transition active:scale-95 whitespace-nowrap cursor-pointer flex-shrink-0 snap-start" 
                    onclick="filterCategory('no_barcode', this)">รายการที่ไม่มีบาร์โค้ด</button>
        `;

        categories.filter(c => c.label_name !== 'รายการที่ไม่มีบาร์โค้ด').forEach(c => {
            buttonsHtml += `
                <button data-cat="${c.key_name}" class="cat-btn px-4 py-1.5 rounded-2xl text-xs sm:text-sm font-medium bg-white text-slate-600 border border-slate-200/80 hover:bg-slate-50 transition active:scale-95 whitespace-nowrap cursor-pointer flex-shrink-0 snap-start" 
                        onclick="filterCategory('${c.key_name}', this)">${c.label_name}</button>
            `;
        });

        // 🌟 ส่งค่า -1 (ย้อนกลับ 1 หัวข้อ) และ 1 (ไปข้างหน้า 1 หัวข้อ) 🌟
        catBar.innerHTML = `
            <button type="button" onclick="scrollCatBar(-1)" title="เลื่อนซ้าย"
                    class="w-7 h-7 flex-shrink-0 bg-white hover:bg-slate-100 text-slate-600 hover:text-slate-900 rounded-xl border border-slate-200/80 flex items-center justify-center shadow-2xs transition active:scale-90 cursor-pointer">
                <svg class="w-4 h-4 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M15 19l-7-7 7-7"/></svg>
            </button>

            <div id="category-scroll-list" class="flex-1 flex items-center gap-1.5 overflow-x-auto scroll-smooth py-1 px-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden snap-x snap-mandatory">
                ${buttonsHtml}
            </div>

            <button type="button" onclick="scrollCatBar(1)" title="เลื่อนขวา"
                    class="w-7 h-7 flex-shrink-0 bg-white hover:bg-slate-100 text-slate-600 hover:text-slate-900 rounded-xl border border-slate-200/80 flex items-center justify-center shadow-2xs transition active:scale-90 cursor-pointer">
                <svg class="w-4 h-4 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M9 5l7 7-7 7"/></svg>
            </button>
        `;

        updateActiveCategoryHighlight();

        const scrollList = document.getElementById('category-scroll-list');
        if (scrollList && !scrollList.dataset.wheelBound) {
            scrollList.addEventListener('wheel', (e) => {
                if (e.deltaY !== 0) {
                    e.preventDefault();
                    scrollList.scrollLeft += e.deltaY;
                }
            }, { passive: false });
            scrollList.dataset.wheelBound = "true";
        }
    }

    const menu = document.getElementById('category-dropdown-menu');
    if (menu) {
        let htmlOptions = `<div onclick="selectCategoryOption('', '-- เลือกหมวดหมู่ --')" class="px-3.5 py-2 hover:bg-slate-50 text-slate-400 cursor-pointer transition">-- เลือกหมวดหมู่ --</div>`;
        categories.forEach(c => {
            htmlOptions += `<div onclick="selectCategoryOption('${c.key_name}', '${c.label_name}')" class="px-3.5 py-2 hover:bg-slate-50 text-slate-700 font-medium cursor-pointer transition">${c.label_name}</div>`;
        });
        menu.innerHTML = htmlOptions;
    }
}

// 🌟 ฟังก์ชันคำนวณและเลื่อนทีละ 1 หัวข้อพอดีขอบเป๊ะ 🌟
function scrollCatBar(direction) {
    const scrollList = document.getElementById('category-scroll-list');
    if (!scrollList) return;
    
    const buttons = Array.from(scrollList.querySelectorAll('.cat-btn'));
    if (buttons.length === 0) return;

    const containerRect = scrollList.getBoundingClientRect();

    if (direction > 0) {
        // หาปุ่มแรกที่อยู่ถัดไปทางขวาของขอบซ้าย
        const nextBtn = buttons.find(btn => {
            const rect = btn.getBoundingClientRect();
            return (rect.left - containerRect.left) > 8;
        });
        if (nextBtn) {
            const moveDistance = nextBtn.getBoundingClientRect().left - containerRect.left;
            scrollList.scrollBy({ left: moveDistance, behavior: 'smooth' });
        }
    } else {
        // หาปุ่มก่อนหน้าที่หลุดไปทางซ้าย
        const prevButtons = buttons.filter(btn => {
            const rect = btn.getBoundingClientRect();
            return (rect.left - containerRect.left) < -8;
        });
        const prevBtn = prevButtons[prevButtons.length - 1] || buttons[0];
        if (prevBtn) {
            const moveDistance = prevBtn.getBoundingClientRect().left - containerRect.left;
            scrollList.scrollBy({ left: moveDistance, behavior: 'smooth' });
        }
    }
}

function updateActiveCategoryHighlight(btnElement = null) {
    document.querySelectorAll('#category-bar .cat-btn').forEach(btn => {
        btn.className = "cat-btn px-4 py-1.5 rounded-2xl text-xs sm:text-sm font-medium bg-white text-slate-600 border border-slate-200/80 hover:bg-slate-50 transition active:scale-95 whitespace-nowrap cursor-pointer flex-shrink-0";
    });

    const targetBtn = btnElement || document.querySelector(`#category-bar button.cat-btn[data-cat="${currentCategory}"]`);
    if (targetBtn) {
        targetBtn.className = "cat-btn px-4 py-1.5 rounded-2xl text-xs sm:text-sm font-bold bg-blue-600 text-white shadow-2xs transition active:scale-95 whitespace-nowrap cursor-pointer flex-shrink-0";
        // เลื่อนปุ่มที่เลือกให้อยู่กลางสายตาอัตโนมัติ ไม่โดนขอบบัง
        targetBtn.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
    }
}

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
        menu.classList.toggle('hidden');
        if (arrow) arrow.classList.toggle('rotate-180');
    }
}

function refocusBarcode() {
    // บนมือถือจะไม่สั่งดึงโฟกัสอัตโนมัติ เพื่อไม่ให้แป้นพิมพ์เด้งขึ้นมาบังจอ
    const isMobile = window.innerWidth < 1024 || /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
    if (isMobile) return;

    // ถ้ากำลังพิมพ์อยู่ในช่องค้นหา หรือ input อื่นๆ อยู่ จะไม่แย่งโฟกัส
    const activeEl = document.activeElement;
    if (activeEl && (activeEl.tagName.toLowerCase() === 'input' || activeEl.tagName.toLowerCase() === 'textarea')) {
        return;
    }

    const input = document.getElementById('barcode-input');
    if (input) input.focus();
}

function autoFixThaiBarcode(inputElement) {
    if (!inputElement) return;

    const fixText = (e) => {
        let value = e.target.value;
        let converted = '';
        let hasThai = false;

        for (let char of value) {
            if (thaiBarcodeKeyMap[char] !== undefined) {
                converted += thaiBarcodeKeyMap[char];
                hasThai = true;
            } else {
                converted += char;
            }
        }

        if (hasThai) {
            e.target.value = converted.replace(/[^0-9a-zA-Z_.*-]/g, '');
        }
    };

    inputElement.addEventListener('input', fixText);
    inputElement.addEventListener('keyup', fixText);
}

function setupBarcodeScanner() {
    const input = document.getElementById('barcode-input');
    const pIdInput = document.getElementById('p-id');
    const pStockInput = document.getElementById('p-stock');
    const pCostInput = document.getElementById('p-cost');
    const pPriceInput = document.getElementById('p-price');

    if (input) autoFixThaiBarcode(input);
    if (pIdInput) autoFixThaiBarcode(pIdInput);
    if (pStockInput) autoFixThaiBarcode(pStockInput);
    if (pCostInput) autoFixThaiBarcode(pCostInput);
    if (pPriceInput) autoFixThaiBarcode(pPriceInput);

    if (input) {
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                const barcode = input.value.trim();
                if (barcode) {
                    closeImagePreviewModal();
                    input.value = '';
                    if (typeof addToCart === 'function') addToCart(barcode);
                } else {
                    if (typeof cart !== 'undefined' && cart && cart.length > 0) {
                        if (typeof openPaymentModal === 'function') openPaymentModal();
                    } else {
                        if (typeof showCustomModal === 'function') {
                            showCustomModal('warning', 'ไม่มีสินค้าในตะกร้า', 'กรุณาเลือกสินค้าก่อนทำรายการชำระเงิน');
                        }
                    }
                }
            }
        });
    }

    document.addEventListener('keydown', (e) => {
        const activeEl = document.activeElement;
        const activeTag = activeEl ? activeEl.tagName.toLowerCase() : '';
        const activeId = activeEl ? activeEl.id : '';

        // ถ้ากำลังพิมพ์ใน input ใดๆ (รวมถึงช่องค้นหา) หรือ textarea ให้ปล่อยให้พิมพ์ได้ตามปกติ
        if (activeTag === 'textarea' || activeTag === 'input') {
            return;
        }

        if (['Tab', 'Escape', 'F1', 'F2', 'F5', 'Shift', 'Control', 'Alt'].includes(e.key) || e.ctrlKey || e.altKey) {
            return;
        }

        const isMobile = window.innerWidth < 1024 || /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
        if (!isMobile && input && activeEl !== input) {
            input.focus();
        }
    });

    document.addEventListener('click', (e) => {
        const isSearchArea = e.target.closest('#search-product, #search-unit-btn, #search-unit-menu, #sort-product-btn, #sort-product-menu, #pos-vk-global-toggle-btn');
        const isInput = e.target.tagName.toLowerCase() === 'input' || e.target.tagName.toLowerCase() === 'textarea' || e.target.tagName.toLowerCase() === 'button';
        const isModal = e.target.closest('#add-product-modal, #stock-in-modal, #add-category-modal, #edit-bill-modal, #payment-modal, #custom-modal-container');
        
        if (!isSearchArea && !isInput && !isModal) {
            refocusBarcode();
        }
    });
}

function setupSearchProductEnter() {
    const searchInput = document.getElementById('search-product');
    if (!searchInput) return;

    searchInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            applyProductFilters();
        }
    });
}

function applyProductFilters() {
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
            // 🌟 กรณีค้นหาด้วยเครื่องหมาย # นำหน้า (ค้นหาเฉพาะลำดับการ์ดเท่านั้น)
            if (rawKeyword.startsWith('#')) {
                const targetIndexStr = rawKeyword.replace(/#/g, '').trim();
                
                // ถ้าพิมพ์แค่ # ตัวเดียว ให้แสดงสินค้าทั้งหมดตามปกติ
                if (!targetIndexStr) return true; 

                // ตรงกับลำดับการ์ดเป๊ะๆ หรือขึ้นต้นด้วยตัวเลขที่พิมพ์ (เช่น #6 จะเจอ #6, #60-#69)
                const currentIndexStr = String(p._catalogIndex || '');
                return currentIndexStr === targetIndexStr || currentIndexStr.startsWith(targetIndexStr);
            }

            // 🌟 กรณีค้นหาทั่วไป (ชื่อสินค้า, บาร์โค้ด)
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

    isInternalRendering = true;
    renderProductsHTML(filtered);
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
    if (countEl) countEl.innerText = `${productList ? productList.length : 0} รายการ`;

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

        const imgSrc = (item.img && String(item.img).trim() !== '') ? item.img : placeholderSVG;
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
                    <img src="${imgSrc}" alt="${rawName}" loading="lazy" class="w-full h-full object-contain group-hover:scale-105 transition duration-200" onerror="this.onerror=null; this.src='${placeholderSVG}';">
                </div>
                
                <h3 class="text-xs font-bold text-slate-800 line-clamp-1 w-full mt-1" title="${rawName}">${rawName}</h3>
                <p class="text-[10px] text-slate-400 font-mono leading-none mt-0.5">${item.id || ''}</p>
                
                <div class="my-1">
                    ${stockBadgeHtml}
                </div>

                <div class="w-full flex items-center justify-between mt-auto pt-1.5 border-t border-slate-100">
                    <div class="text-left">
                        <p class="text-[9px] text-slate-400 font-medium leading-none">ราคา</p>
                        <p class="text-sm sm:text-base font-black text-slate-900 tracking-tight mt-0.5 leading-none">฿${formattedPrice}</p>
                    </div>

                    <!-- ปรับขนาดเป็น w-10 h-10 (40px) บนมือถือ และ w-8 h-8 (32px) บนจอคอม -->
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
        applyProductFilters();
    }, 120);
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
    
    // 🌟 สั่งปิดเมนูเรียงลำดับทันที 🌟
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
    
    // 🌟 สั่งปิดเมนูหน่วยนับทันที 🌟
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
        refocusBarcode();
    }
}

function closeImagePreviewModal() {
    const modal = document.getElementById('image-view-modal');
    if (modal) modal.classList.add('hidden');
    refocusBarcode();
}
function quickAddHotkey(productId) {
    const barcodeInput = document.getElementById('barcode-input');
    if (!barcodeInput) return;
    barcodeInput.value = productId;
    const enterEvent = new KeyboardEvent('keydown', {
        key: 'Enter', code: 'Enter', keyCode: 13, which: 13, bubbles: true, cancelable: true
    });
    barcodeInput.dispatchEvent(enterEvent);
    barcodeInput.focus();
}