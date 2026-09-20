let selectedStockInProduct = null;

function loadStockInModalHTML(container) {
    if (!container) return;
    container.innerHTML += `
    <!-- Modal รับเข้าสต็อกสินค้าด่วน (สไตล์ iOS Compact - ธีมสีฟ้า Sky Box) -->
    <div id="stock-in-modal" class="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 hidden transition-opacity duration-200">
        <div class="bg-white w-full max-w-md p-5 sm:p-6 rounded-[28px] shadow-2xl relative space-y-4 border border-slate-100 animate-in fade-in zoom-in-95 max-h-[90vh] overflow-y-auto">
            
            <!-- ส่วนหัว Modal สไตล์ iOS Header -->
            <div class="flex items-center justify-between pb-0.5">
                <div class="flex items-center gap-2.5">
                    <div class="w-8 h-8 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center flex-shrink-0 border border-sky-100">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"/>
                        </svg>
                    </div>
                    <div>
                        <h3 class="text-sm sm:text-base font-bold text-slate-900 tracking-tight leading-none">รับสินค้าเข้าสต็อก</h3>
                        <p class="text-[10px] sm:text-[11px] text-slate-400 font-medium mt-0.5">สแกนบาร์โค้ดหรือค้นหาเพื่อเพิ่มจำนวน</p>
                    </div>
                </div>
                <button type="button" onclick="closeStockInModal()" title="ปิดหน้าต่าง" class="text-slate-400 hover:text-slate-800 hover:bg-slate-100 w-7 h-7 flex items-center justify-center rounded-full transition active:scale-90 cursor-pointer">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                </button>
            </div>

            <div class="space-y-3">
                <!-- 1. ช่องค้นหาสินค้า / บาร์โค้ด -->
                <div class="space-y-1">
                    <label class="block text-[11px] font-bold text-slate-600">ค้นหาหรือสแกนบาร์โค้ด</label>
                    <div class="relative">
                        <input type="text" id="stock-in-search-input" autocomplete="off"
                               placeholder="สแกนหรือพิมพ์ชื่อสินค้า..." 
                               oninput="handleStockInSearch(this.value)"
                               onkeydown="if(event.key==='Enter') handleStockInBarcodeEnter(event)"
                               class="w-full h-10 pl-8 pr-3 bg-slate-50 border border-slate-200 focus:border-sky-500 rounded-xl text-xs font-semibold text-slate-800 focus:bg-white focus:outline-none transition shadow-2xs">
                        <svg class="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
                        </svg>
                        
                        <div id="stock-in-dropdown-menu" class="hidden absolute left-0 right-0 mt-1 bg-white border border-slate-100 rounded-2xl shadow-xl z-30 overflow-hidden p-1 text-xs">
                            <div id="stock-in-options-list" class="max-h-40 overflow-y-auto space-y-0.5 pr-0.5"></div>
                        </div>
                    </div>
                </div>

                <!-- 2. การ์ดแสดงสินค้าที่เลือก -->
                <div id="stock-in-selected-card" class="hidden p-2.5 bg-slate-50/90 rounded-xl border border-slate-200/70">
                    <div class="flex items-center gap-2.5">
                        <img id="stock-in-img" src="" class="w-10 h-10 object-contain rounded-lg bg-white border border-slate-200/60 p-0.5 flex-shrink-0 shadow-2xs">
                        <div class="min-w-0 flex-1">
                            <h4 id="stock-in-name" class="text-xs font-bold text-slate-900 truncate"></h4>
                            <p id="stock-in-info" class="text-[10px] text-slate-500 font-medium mt-0.5"></p>
                        </div>
                    </div>
                </div>

                <!-- 3. แผงควบคุมจำนวน -->
                <div class="bg-slate-50/80 p-3 rounded-2xl border border-slate-200/70 space-y-2.5">
                    <div class="flex items-center justify-between">
                        <span class="text-[11px] font-bold text-slate-600">จำนวนที่รับเข้า</span>
                        <span id="stock-in-unit-label" class="text-[10px] font-bold text-sky-700 bg-sky-50 px-2 py-0.5 rounded-md border border-sky-200/70">(หน่วย)</span>
                    </div>

                    <div class="flex items-center gap-2">
                        <!-- ปุ่มลด [-] -->
                        <button type="button" onclick="addStockInQty(-1)" 
                                title="ลดจำนวน" 
                                class="w-9 h-9 bg-white hover:bg-slate-100 active:scale-90 text-slate-700 font-bold rounded-xl text-base flex items-center justify-center shadow-2xs transition cursor-pointer border border-slate-200/80">
                            -
                        </button>
                        
                        <!-- ช่องตัวเลข -->
                        <input type="number" id="stock-in-qty" min="1" step="1" value="1" oninput="updateStockInLivePreview()" 
                               class="flex-1 h-9 text-center text-base font-black bg-white border border-slate-200/90 focus:border-sky-500 rounded-xl text-slate-900 focus:outline-none transition shadow-2xs">

                        <!-- ปุ่มเพิ่ม [+] -->
                        <button type="button" onclick="addStockInQty(1)" 
                                title="เพิ่มจำนวน" 
                                class="w-9 h-9 bg-white hover:bg-slate-100 active:scale-90 text-slate-700 font-bold rounded-xl text-base flex items-center justify-center shadow-2xs transition cursor-pointer border border-slate-200/80">
                            +
                        </button>
                    </div>

                    <!-- ปุ่มลัดเพิ่มจำนวน -->
                    <div class="flex items-center gap-1.5 pt-0.5">
                        <button type="button" onclick="addStockInQty(1)" class="flex-1 py-1.5 bg-white hover:bg-sky-50 hover:text-sky-700 border border-slate-200/80 text-slate-600 font-bold rounded-lg text-[11px] transition cursor-pointer active:scale-95 shadow-2xs">+1</button>
                        <button type="button" onclick="addStockInQty(5)" class="flex-1 py-1.5 bg-white hover:bg-sky-50 hover:text-sky-700 border border-slate-200/80 text-slate-600 font-bold rounded-lg text-[11px] transition cursor-pointer active:scale-95 shadow-2xs">+5</button>
                        <button type="button" onclick="addStockInQty(10)" class="flex-1 py-1.5 bg-white hover:bg-sky-50 hover:text-sky-700 border border-slate-200/80 text-slate-600 font-bold rounded-lg text-[11px] transition cursor-pointer active:scale-95 shadow-2xs">+10</button>
                        <button type="button" onclick="addStockInQty(20)" class="flex-1 py-1.5 bg-white hover:bg-sky-50 hover:text-sky-700 border border-slate-200/80 text-slate-600 font-bold rounded-lg text-[11px] transition cursor-pointer active:scale-95 shadow-2xs">+20</button>
                    </div>
                </div>

                <!-- 4. การ์ดพรีวิวสต็อกคำนวณสด -->
                <div id="stock-in-preview-box" class="hidden p-2.5 bg-sky-50/70 border border-sky-100 rounded-xl text-xs font-medium text-sky-950 leading-relaxed"></div>

                <!-- 5. ปุ่มยืนยัน -->
                <div class="pt-1">
                    <button type="button" id="btn-submit-stock-in" onclick="submitStockIn()" 
                            class="w-full py-3 bg-sky-600 hover:bg-sky-700 active:scale-98 text-white rounded-xl text-xs sm:text-sm font-bold shadow-md shadow-sky-600/25 transition-all duration-150 cursor-pointer flex items-center justify-center gap-1.5">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7"></path></svg>
                        <span>ยืนยันรับเข้าสต็อก</span>
                    </button>
                </div>
            </div>
        </div>
    </div>
    `;
}

function openStockInModal() {
    const modal = document.getElementById('stock-in-modal');
    if (!modal) return;

    selectedStockInProduct = null;
    document.getElementById('stock-in-search-input').value = '';
    document.getElementById('stock-in-qty').value = '1';
    document.getElementById('stock-in-selected-card').classList.add('hidden');
    
    const previewBox = document.getElementById('stock-in-preview-box');
    if (previewBox) {
        previewBox.innerHTML = '';
        previewBox.classList.add('hidden');
    }

    document.getElementById('stock-in-unit-label').innerText = '(หน่วย)';

    modal.classList.remove('hidden');
    setTimeout(() => {
        const input = document.getElementById('stock-in-search-input');
        if (input) input.focus();
    }, 50);
}

function closeStockInModal() {
    const modal = document.getElementById('stock-in-modal');
    if (modal) modal.classList.add('hidden');
    const menu = document.getElementById('stock-in-dropdown-menu');
    if (menu) menu.classList.add('hidden');
    selectedStockInProduct = null;
    if (typeof refocusBarcode === 'function') refocusBarcode();
}

function handleStockInSearch(val) {
    const menu = document.getElementById('stock-in-dropdown-menu');
    const listContainer = document.getElementById('stock-in-options-list');
    if (!menu || !listContainer) return;

    const normalizeThai = (str) => String(str || '').toLowerCase().replace(/เเ/g, 'แ');
    const cleanKey = normalizeThai(val).trim();

    if (!cleanKey) {
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
        listContainer.innerHTML = '<p class="text-center py-2.5 text-slate-400 text-xs">ไม่พบรายการสินค้า</p>';
    } else {
        listContainer.innerHTML = filtered.slice(0, 15).map(p => {
            const isPack = Boolean(p.parent_id && p.parent_id !== '' && p.parent_id !== 'null');

            return `
                <div onclick="selectStockInProduct('${p.id}')" 
                     class="flex items-center justify-between p-2 rounded-lg hover:bg-sky-50 cursor-pointer transition select-none">
                    <div class="flex-1 min-w-0 pr-2">
                        <p class="truncate text-xs font-semibold text-slate-800">${p.name}</p>
                        <p class="text-[10px] text-slate-400 mt-0.5">บาร์โค้ด: ${p.id} ${isPack ? '<span class="text-sky-600 font-bold">(แพ็ค/ลัง)</span>' : ''}</p>
                    </div>
                    <span class="text-[10px] px-1.5 py-0.5 rounded-md bg-slate-100 text-slate-600 font-medium whitespace-nowrap">
                        ${p.stock_qty} ${p.unit || 'ชิ้น'}
                    </span>
                </div>
            `;
        }).join('');
    }

    menu.classList.remove('hidden');
}

function handleStockInBarcodeEnter(e) {
    e.preventDefault();
    const input = document.getElementById('stock-in-search-input');
    const barcode = input ? input.value.trim() : '';
    if (!barcode) return;

    const products = (typeof localProductsCache !== 'undefined') ? localProductsCache : [];
    const prod = products.find(p => String(p.id).trim() === barcode || String(p.id).trim() === cleanBarcodeString(barcode));

    if (prod) {
        selectStockInProduct(prod.id);
    } else {
        showCustomModal('warning', 'ไม่พบสินค้า', `ไม่พบสินค้ารหัส "${barcode}" ในระบบ`);
    }
}

function selectStockInProduct(productId) {
    const products = (typeof localProductsCache !== 'undefined') ? localProductsCache : [];
    const prod = products.find(p => String(p.id).trim() === String(productId).trim());
    if (!prod) return;

    selectedStockInProduct = prod;

    const menu = document.getElementById('stock-in-dropdown-menu');
    if (menu) menu.classList.add('hidden');

    const searchInput = document.getElementById('stock-in-search-input');
    if (searchInput) searchInput.value = prod.name;

    const card = document.getElementById('stock-in-selected-card');
    const imgEl = document.getElementById('stock-in-img');
    const nameEl = document.getElementById('stock-in-name');
    const infoEl = document.getElementById('stock-in-info');
    const unitLabel = document.getElementById('stock-in-unit-label');

    if (card) card.classList.remove('hidden');
    if (imgEl) imgEl.src = (prod.img && prod.img.trim() !== '') ? prod.img : placeholderSVG;
    if (nameEl) nameEl.innerText = prod.name;
    if (unitLabel) unitLabel.innerText = `(${prod.unit || 'ชิ้น'})`;

    const isPack = Boolean(prod.parent_id && prod.parent_id !== '' && prod.parent_id !== 'null');
    if (infoEl) {
        if (isPack) {
            const parentProd = products.find(p => String(p.id).trim() === String(prod.parent_id).trim());
            const parentName = parentProd ? parentProd.name : 'สินค้าตัวหลัก';
            const parentStock = parentProd ? parentProd.stock_qty : 0;
            const parentUnit = parentProd ? (parentProd.unit || 'ชิ้น') : 'ชิ้น';
            infoEl.innerHTML = `📦 ผูกกับ: <b>${parentName}</b> (สต็อกตัวแม่: ${parentStock} ${parentUnit})`;
        } else {
            infoEl.innerHTML = `📦 สต็อกคงเหลือปัจจุบัน: <b class="text-sky-600 text-xs sm:text-sm font-black">${prod.stock_qty} ${prod.unit || 'ชิ้น'}</b>`;
        }
    }

    updateStockInLivePreview();

    const qtyInput = document.getElementById('stock-in-qty');
    if (qtyInput) {
        qtyInput.focus();
        qtyInput.select();
    }
}

function addStockInQty(amount) {
    const qtyInput = document.getElementById('stock-in-qty');
    if (qtyInput) {
        const currentVal = parseInt(qtyInput.value) || 0;
        const nextVal = Math.max(1, currentVal + amount);
        qtyInput.value = nextVal;
        updateStockInLivePreview();
    }
}

function updateStockInLivePreview() {
    const previewBox = document.getElementById('stock-in-preview-box');
    const qtyInput = document.getElementById('stock-in-qty');
    if (!previewBox || !qtyInput) return;

    if (!selectedStockInProduct) {
        previewBox.innerHTML = '';
        previewBox.classList.add('hidden');
        return;
    }

    previewBox.classList.remove('hidden');

    const inputQty = parseInt(qtyInput.value) || 0;
    const isPack = Boolean(selectedStockInProduct.parent_id && selectedStockInProduct.parent_id !== '' && selectedStockInProduct.parent_id !== 'null');
    const products = (typeof localProductsCache !== 'undefined') ? localProductsCache : [];

    if (isPack) {
        const parentProd = products.find(p => String(p.id).trim() === String(selectedStockInProduct.parent_id).trim());
        const multiplier = parseInt(selectedStockInProduct.multiplier) || 1;
        const totalAddPieces = inputQty * multiplier;
        const oldStock = parentProd ? (parseInt(parentProd.stock_qty) || 0) : 0;
        const newStock = oldStock + totalAddPieces;
        const pUnit = parentProd ? (parentProd.unit || 'ชิ้น') : 'ชิ้น';

        previewBox.innerHTML = `
            <div class="flex items-center justify-between text-[11px]">
                <span class="text-slate-600 font-medium">สต็อกของ <b>${parentProd ? parentProd.name : 'ตัวเดี่ยว'}</b></span>
                <span class="text-[10px] text-sky-700 font-bold bg-white px-1.5 py-0.5 rounded border border-sky-200">+${totalAddPieces} ${pUnit}</span>
            </div>
            <p class="text-xs font-black text-slate-800 mt-0.5">
                เดิม ${oldStock} + ${totalAddPieces} ➔ <span class="text-emerald-600">สต็อกใหม่: ${newStock} ${pUnit}</span>
            </p>
        `;
    } else {
        const oldStock = parseInt(selectedStockInProduct.stock_qty) || 0;
        const newStock = oldStock + inputQty;
        const unit = selectedStockInProduct.unit || 'ชิ้น';

        previewBox.innerHTML = `
            <div class="flex items-center justify-between text-[11px]">
                <span class="text-slate-600 font-medium">สต็อกของ <b>${selectedStockInProduct.name}</b></span>
                <span class="text-[10px] text-sky-700 font-bold bg-white px-1.5 py-0.5 rounded border border-sky-200">+${inputQty} ${unit}</span>
            </div>
            <p class="text-xs font-black text-slate-800 mt-0.5">
                เดิม ${oldStock} + ${inputQty} ➔ <span class="text-emerald-600">สต็อกใหม่: ${newStock} ${unit}</span>
            </p>
        `;
    }
}

async function submitStockIn() {
    if (!selectedStockInProduct) {
        await showCustomModal('warning', 'ยังไม่ได้เลือกสินค้า', 'กรุณาสแกนหรือเลือกสินค้าที่ต้องการรับเข้าสต็อก');
        return;
    }

    const qtyInput = document.getElementById('stock-in-qty');
    const inputQty = parseInt(qtyInput?.value) || 0;

    if (inputQty <= 0) {
        await showCustomModal('warning', 'จำนวนไม่ถูกต้อง', 'กรุณาระบุจำนวนที่รับเข้ามากกว่า 0');
        qtyInput?.focus();
        return;
    }

    try {
        const res = await fetch('/api/products/stock-in', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                id: selectedStockInProduct.id,
                qty: inputQty
            })
        });
        const result = await res.json();

        if (result.success) {
            closeStockInModal();
            await getStoredProducts();
            if (typeof filterCategory === 'function') filterCategory(currentCategory);
            
            await showCustomModal(
                'success',
                'รับสินค้าเข้าสำเร็จ!',
                `เพิ่มสต็อกให้ <b>${result.target_name}</b> จำนวน <b>+${result.added_qty} ${result.unit}</b> เรียบร้อยแล้ว`
            );
        } else {
            await showCustomModal('warning', 'เกิดข้อผิดพลาด', result.message);
        }
    } catch (e) {
        console.error('Stock In Error:', e);
        await showCustomModal('warning', 'เกิดข้อผิดพลาด', 'ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์ได้');
    }
}