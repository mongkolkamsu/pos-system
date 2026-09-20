let parentDropdownProductsCache = [];

function loadModalHTML() {
    const container = document.getElementById('modal-container');
    if (!container) return;
    if (document.getElementById('history-table-body')) return;

    container.innerHTML = `
    <!-- 1. Modal เพิ่ม/แก้ไข สินค้า (Compact iOS 2 คอลัมน์) -->
    <div id="add-product-modal" class="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 hidden transition-opacity duration-200">
        <div class="bg-white w-full max-w-3xl p-5 sm:p-6 rounded-[28px] shadow-2xl relative space-y-3.5 border border-slate-100 animate-in fade-in zoom-in-95 max-h-[92vh] overflow-y-auto">
            
            <!-- ส่วนหัว Modal -->
            <div class="flex items-center justify-between pb-2 border-b border-slate-100">
                <h3 id="modal-title" class="text-base font-bold text-slate-900 flex items-center gap-2">
                    <img src="icon/plus.png" alt="เพิ่มสินค้า" class="w-5 h-5 object-contain flex-shrink-0">
                    <span class="leading-none">เพิ่มสินค้าใหม่เข้าสู่ระบบ</span>
                </h3>
                <button type="button" onclick="closeAddModal()" title="ปิดหน้าต่าง" class="text-slate-400 hover:text-slate-800 hover:bg-slate-100 w-7 h-7 flex items-center justify-center rounded-full transition active:scale-90 cursor-pointer">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                </button>
            </div>

            <form id="form-add-product" onsubmit="handleSaveProduct(event)" class="space-y-3.5">
                <input type="hidden" id="editing-id" value="">

                <!-- เลย์เอาต์ 2 ฝั่ง (กระชับ ไม่เทอะทะ) -->
                <div class="grid grid-cols-1 md:grid-cols-2 gap-3.5 items-start">
                    
                    <!-- 📦 ฝั่งซ้าย: ข้อมูลสินค้า, หมวดหมู่ และ ราคา -->
                    <div class="space-y-2.5 bg-slate-50/70 p-3.5 sm:p-4 rounded-2xl border border-slate-200/70">
                        <h4 class="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                            <svg class="w-3.5 h-3.5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                            <span>ข้อมูลสินค้า & ราคา</span>
                        </h4>

                        <!-- 1. รหัสบาร์โค้ด / รหัสสินค้า -->
                        <div>
                            <label class="block text-[11px] font-bold text-slate-600 mb-1">รหัสบาร์โค้ด / รหัสสินค้า</label>
                            <div class="relative">
                                <input type="text" id="p-id" required placeholder="เช่น 885123456789" 
                                       class="w-full py-2 pl-3 pr-10 bg-white border border-slate-200 focus:border-indigo-500 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none transition shadow-2xs leading-normal">
                                
                                <!-- 📷 ปุ่มสแกนบาร์โค้ดลงช่องรหัส -->
                                <button type="button" onclick="openCameraScannerModal((code) => { document.getElementById('p-id').value = code; })" 
                                        title="เปิดกล้องสแกน" 
                                        class="absolute right-1.5 top-1/2 -translate-y-1/2 w-7 h-7 rounded-lg bg-white hover:bg-indigo-50 text-slate-600 hover:text-indigo-600 border border-slate-200/80 flex items-center justify-center shadow-2xs transition active:scale-95 cursor-pointer">
                                    <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 7V5a2 2 0 012-2h2m10 0h2a2 2 0 012 2v2m0 10v2a2 2 0 01-2 2h-2m-10 0H5a2 2 0 01-2-2v-2M4 12h16"/>
                                    </svg>
                                </button>
                            </div>
                        </div>

                        <!-- 2. ชื่อสินค้า -->
                        <div>
                            <label class="block text-[11px] font-bold text-slate-600 mb-1">ชื่อสินค้า</label>
                            <input type="text" id="p-name" required placeholder="เช่น น้ำคริสตัล 600ml" 
                                class="w-full h-15 py-2 px-3 bg-white border border-slate-200 focus:border-indigo-500 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none transition shadow-2xs leading-normal">
                        </div>

                        <!-- 3. หมวดหมู่ -->
                        <div class="relative z-30">
                            <label class="block text-[11px] font-bold text-slate-600 mb-1">หมวดหมู่</label>
                            <div class="relative">
                                <input type="hidden" id="p-category" value="">
                                <button type="button" id="category-select-btn" onclick="toggleCategoryDropdown()" 
                                        class="w-full py-2 px-3 bg-white border border-slate-200 rounded-xl text-xs text-left focus:outline-none focus:border-indigo-500 flex items-center justify-between transition cursor-pointer shadow-2xs">
                                    <span id="category-select-label" class="text-slate-400 truncate leading-normal">-- เลือกหมวดหมู่ --</span>
                                    <svg id="category-arrow" class="w-3.5 h-3.5 text-slate-400 transition-transform duration-200 flex-shrink-0 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path>
                                    </svg>
                                </button>
                                <div id="category-dropdown-menu" class="hidden absolute left-0 right-0 mt-1 bg-white border border-slate-200 rounded-2xl shadow-xl z-50 overflow-hidden py-1 text-xs max-h-48 overflow-y-auto"></div>
                            </div>
                        </div>

                        <!-- 4. ราคาต้นทุน & ราคาขาย -->
                        <div class="grid grid-cols-2 gap-2.5">
                            <div>
                                <label class="block text-[11px] font-bold text-slate-600 mb-1">ราคาต้นทุน (บาท)</label>
                                <input type="number" id="p-cost" min="0" step="any" placeholder="0.00" 
                                       class="w-full py-2 px-3 bg-white border border-slate-200 focus:border-indigo-500 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none transition shadow-2xs leading-normal">
                            </div>
                            <div>
                                <label class="block text-[11px] font-bold text-slate-600 mb-1">ราคาขาย (บาท)</label>
                                <input type="number" id="p-price" required min="0" step="any" placeholder="0.00" 
                                       class="w-full py-2 px-3 bg-white border border-slate-200 focus:border-indigo-500 rounded-xl text-xs font-black text-emerald-600 focus:outline-none transition shadow-2xs leading-normal">
                            </div>
                        </div>
                    </div>

                    <!-- 📊 ฝั่งขวา: สต็อก, ตัวเลือกไม่มีบาร์โค้ด และ รูปภาพสินค้า -->
                    <div class="space-y-2.5 bg-slate-50/70 p-3.5 sm:p-4 rounded-2xl border border-slate-200/70">
                        <h4 class="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                            <svg class="w-3.5 h-3.5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"/></svg>
                            <span>สต็อก & รูปภาพ</span>
                        </h4>

                        <!-- 1. สินค้าไม่มีบาร์โค้ด (กะทัดรัด) -->
                        <label class="flex items-center justify-between py-2 px-3 bg-white hover:bg-indigo-50/40 rounded-xl border border-slate-200 cursor-pointer select-none transition group shadow-2xs">
                            <div class="flex items-center gap-2">
                                <input type="checkbox" id="p-no-barcode" class="w-3.5 h-3.5 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300 cursor-pointer">
                                <span class="text-xs font-semibold text-slate-700 group-hover:text-indigo-600 transition">สินค้าไม่มีบาร์โค้ด</span>
                            </div>
                            <span class="text-[10px] font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200/60">ไม่มีสแกน</span>
                        </label>

                        <!-- 2. สต็อกคงเหลือ & หน่วยนับ -->
                        <div class="grid grid-cols-2 gap-2.5">
                            <div>
                                <label class="block text-[11px] font-bold text-slate-600 mb-1">สต็อกคงเหลือ</label>
                                <input type="number" id="p-stock" required min="0" step="1" placeholder="0" value="0" 
                                       class="w-full py-2 px-3 bg-white border border-slate-200 focus:border-indigo-500 rounded-xl text-xs font-bold text-slate-900 focus:outline-none transition shadow-2xs leading-normal">
                            </div>

                            <div class="relative">
                                <label class="block text-[11px] font-bold text-slate-600 mb-1">หน่วยนับ</label>
                                <input type="hidden" id="p-unit" value="">
                                <button type="button" id="unit-select-btn" onclick="toggleUnitDropdown()" 
                                        class="w-full py-2 px-3 bg-white border border-slate-200 rounded-xl text-xs text-left focus:outline-none focus:border-indigo-500 flex items-center justify-between transition cursor-pointer shadow-2xs">
                                    <span id="unit-select-label" class="text-slate-400 truncate leading-normal">-- เลือกหน่วย --</span>
                                    <svg id="unit-arrow" class="w-3.5 h-3.5 text-slate-400 transition-transform duration-200 flex-shrink-0 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path>
                                    </svg>
                                </button>
                                <div id="unit-dropdown-menu" class="hidden absolute left-0 right-0 mt-1 bg-white border border-slate-100 rounded-2xl shadow-xl z-30 overflow-hidden py-1 text-xs max-h-44 overflow-y-auto">
                                    <div onclick="selectUnitOption('', '-- เลือกหน่วยนับ --')" class="px-3.5 py-1.5 hover:bg-indigo-50 text-slate-400 cursor-pointer transition">-- เลือกหน่วยนับ --</div>
                                </div>
                            </div>
                        </div>

                        <!-- 3. เตือนเมื่อเหลือ & เติมให้เต็ม -->
                        <div class="grid grid-cols-2 gap-2.5">
                            <div>
                                <label class="block text-[11px] font-bold text-slate-600 mb-1">เตือนเมื่อเหลือ</label>
                                <input type="number" id="p-min-stock" min="0" step="1" placeholder="5" value="5" 
                                       class="w-full py-2 px-3 bg-white border border-slate-200 rounded-xl text-xs font-bold text-amber-700 focus:outline-none focus:border-amber-500 transition shadow-2xs leading-normal">
                            </div>
                            <div>
                                <label class="block text-[11px] font-bold text-slate-600 mb-1">เติมให้เต็ม</label>
                                <input type="number" id="p-max-stock" min="0" step="1" placeholder="20" value="20" 
                                       class="w-full py-2 px-3 bg-white border border-slate-200 rounded-xl text-xs font-bold text-emerald-700 focus:outline-none focus:border-emerald-500 transition shadow-2xs leading-normal">
                            </div>
                        </div>

                        <!-- 4. จัดเซ็ตขายยกแพ็ค / ยกลัง (กะทัดรัด) -->
                        <div class="p-2.5 bg-indigo-50/70 rounded-xl border border-indigo-100/80 space-y-2">
                            <label class="flex items-center gap-2 cursor-pointer select-none">
                                <input type="checkbox" id="p-is-pack" onchange="togglePackFields(this.checked)" class="w-3.5 h-3.5 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300 cursor-pointer">
                                <span class="text-xs font-bold text-slate-800">จัดเซ็ตขายยกแพ็ค / ยกลัง</span>
                            </label>

                            <div id="pack-fields-container" class="hidden space-y-2 pt-1.5 border-t border-indigo-100/80">
                                <div>
                                    <label class="block text-[10px] font-bold text-slate-600 mb-0.5">ตัดสต็อกจากสินค้ารายการไหน</label>
                                    <div class="relative">
                                        <input type="hidden" id="p-parent-id" value="">
                                        <input type="text" id="parent-search-input" autocomplete="off"
                                               placeholder="-- ค้นหาชื่อ หรือ บาร์โค้ด --"
                                               onclick="openParentDropdown()"
                                               oninput="handleParentInputSearch(this.value)"
                                               class="w-full py-1.5 px-2.5 pr-6 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-800 focus:outline-none focus:border-indigo-500 shadow-2xs leading-normal">
                                        <div class="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                                            <svg id="parent-arrow" class="w-3.5 h-3.5 transition-transform duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path>
                                            </svg>
                                        </div>
                                        <div id="parent-dropdown-menu" class="hidden absolute left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-xl z-30 overflow-hidden p-1 text-xs">
                                            <div id="parent-options-list" class="max-h-36 overflow-y-auto space-y-0.5 pr-0.5"></div>
                                        </div>
                                    </div>
                                </div>

                                <div>
                                    <label class="block text-[10px] font-bold text-slate-600 mb-0.5">1 แพ็ค/ลัง บรรจุกี่ชิ้น</label>
                                    <input type="number" id="p-multiplier" min="1" step="1" value="1" oninput="updatePackSummaryHint()" placeholder="เช่น 6, 12, 24" 
                                           class="w-full py-1.5 px-2.5 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-800 focus:outline-none focus:border-indigo-500 shadow-2xs leading-normal">
                                </div>

                                <div id="pack-summary-hint" class="p-1.5 bg-white rounded-lg border border-indigo-100 text-[10px] text-slate-600 shadow-2xs">
                                    <span>เลือกสินค้าเพื่อคำนวณจำนวนที่พร้อมขาย</span>
                                </div>
                            </div>
                        </div>

                        <!-- 5. รูปภาพสินค้า -->
                        <div>
                            <label class="block text-[11px] font-bold text-slate-600 mb-1">รูปภาพสินค้า</label>
                            <input type="file" id="p-file" accept="image/*" onchange="previewImage(event)" 
                                   class="w-full text-xs text-slate-500 file:mr-2.5 file:py-1 file:px-2.5 file:rounded-lg file:border-0 file:text-[11px] file:font-bold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100 cursor-pointer border border-slate-200 rounded-xl bg-white p-1 shadow-2xs">
                            
                            <div id="image-preview-container" class="mt-1.5 hidden flex justify-center items-center bg-white p-1.5 rounded-xl border border-dashed border-slate-200 relative">
                                <div class="relative inline-block">
                                    <img id="image-preview" src="" alt="Preview" class="h-16 object-contain rounded-lg">
                                    <button type="button" onclick="removeSelectedImage()" title="ลบรูปภาพ"
                                            class="absolute -top-1.5 -right-1.5 bg-rose-500 hover:bg-rose-600 text-white rounded-full w-4 h-4 flex items-center justify-center text-[9px] font-bold shadow transition active:scale-90 cursor-pointer">
                                        ✕
                                    </button>
                                </div>
                            </div>
                        </div>

                    </div>
                </div>

                <!-- ปุ่มบันทึกข้อมูล -->
                <div class="pt-1.5 border-t border-slate-100">
                    <button type="submit" id="btn-submit-form" class="w-full py-3 bg-emerald-600 hover:bg-emerald-700 active:scale-98 text-white rounded-2xl text-xs sm:text-sm font-bold transition shadow-md shadow-emerald-600/20 cursor-pointer flex items-center justify-center gap-1.5">
                        <span>บันทึกสินค้า</span>
                    </button>
                </div>
            </form>
        </div>
    </div>
    `;

    if (typeof loadCategoryModalHTML === 'function') loadCategoryModalHTML(container);
    if (typeof loadStockInModalHTML === 'function') loadStockInModalHTML(container);
}

function openAddModal() {
    const modal = document.getElementById('add-product-modal');
    if (!modal) return;

    const costInput = document.getElementById('p-cost');
    const pIdInput = document.getElementById('p-id');
    const pStockInput = document.getElementById('p-stock');
    const pPriceInput = document.getElementById('p-price');
    const minInput = document.getElementById('p-min-stock');
    const maxInput = document.getElementById('p-max-stock');

    if (costInput) { costInput.value = ''; if (typeof autoFixThaiBarcode === 'function') autoFixThaiBarcode(costInput); }
    if (pIdInput && typeof autoFixThaiBarcode === 'function') autoFixThaiBarcode(pIdInput);
    if (pStockInput && typeof autoFixThaiBarcode === 'function') autoFixThaiBarcode(pStockInput);
    if (pPriceInput && typeof autoFixThaiBarcode === 'function') autoFixThaiBarcode(pPriceInput);
    if (minInput && typeof autoFixThaiBarcode === 'function') autoFixThaiBarcode(minInput);
    if (maxInput && typeof autoFixThaiBarcode === 'function') autoFixThaiBarcode(maxInput);
    // ⭐️ เพิ่มบรรทัดนี้เพื่อให้ดึงหน่วยนับล่าสุดมาแสดงในดรอปดาวน์เสมอ ⭐️
    if (typeof refreshUnitDropdown === 'function') refreshUnitDropdown();

    const modalTitle = document.getElementById('modal-title');
    if (modalTitle) {
        modalTitle.innerHTML = `
            <img src="icon/plus.png" alt="เพิ่มสินค้า" class="w-[26px] h-[26px] object-contain flex-shrink-0">
            <span class="leading-none">เพิ่มสินค้าใหม่เข้าสู่ระบบ</span>
        `;
    }
    
    document.getElementById('form-add-product').reset();
    document.getElementById('editing-id').value = '';
    if (pStockInput) pStockInput.value = '0';
    if (minInput) minInput.value = '5';
    if (maxInput) maxInput.value = '20';

    const noBarcodeCheckbox = document.getElementById('p-no-barcode');
    if (noBarcodeCheckbox) noBarcodeCheckbox.checked = false;

    const packCheckbox = document.getElementById('p-is-pack');
    if (packCheckbox) {
        packCheckbox.checked = false;
        togglePackFields(false);
    }

    selectUnitOption('', '-- เลือกหน่วยนับ --');
    selectCategoryOption('', '-- เลือกหมวดหมู่ --');
    removeSelectedImage();

    const btnSubmit = document.getElementById('btn-submit-form');
    if (btnSubmit) {
        btnSubmit.innerText = 'บันทึกสินค้า';
        btnSubmit.className = 'w-full py-3 bg-[#44a64a] hover:bg-[#3b9340] text-white rounded-xl text-sm font-semibold transition shadow-md active:scale-98 cursor-pointer';
    }

    modal.classList.remove('hidden');
}

function openEditModal(productId) {
    const product = localProductsCache.find(p => String(p.id).trim() === String(productId).trim());
    if (!product) return;

    openAddModal();

    isCurrentImageRemoved = false;
    currentCopiedImgPath = '';

    const modalTitle = document.getElementById('modal-title');
    if (modalTitle) {
        modalTitle.innerHTML = `
            <div class="w-5 h-5 bg-blue-600 flex-shrink-0" 
                 style="mask: url('icon/pencil.png') no-repeat center / contain; -webkit-mask: url('icon/pencil.png') no-repeat center / contain;">
            </div>
            <span>แก้ไขข้อมูลสินค้า</span>
        `;
    }

    document.getElementById('editing-id').value = product.id;
    document.getElementById('p-id').value = product.id;
    document.getElementById('p-name').value = product.name;
    document.getElementById('p-cost').value = product.cost_price !== undefined ? product.cost_price : '';
    document.getElementById('p-price').value = product.price;
    document.getElementById('p-stock').value = (product.stock_qty !== undefined && product.stock_qty !== null) ? product.stock_qty : 0;
    
    const minInput = document.getElementById('p-min-stock');
    const maxInput = document.getElementById('p-max-stock');
    if (minInput) minInput.value = product.min_stock !== undefined ? product.min_stock : 5;
    if (maxInput) maxInput.value = product.max_stock !== undefined ? product.max_stock : 20;

    const noBarcodeCheckbox = document.getElementById('p-no-barcode');
    if (noBarcodeCheckbox) {
        noBarcodeCheckbox.checked = (product.is_no_barcode == 1 || product.is_no_barcode === '1' || product.is_no_barcode === true);
    }

    const isPack = Boolean(product.parent_id && product.parent_id !== '' && product.parent_id !== 'null');
    const packCheckbox = document.getElementById('p-is-pack');
    if (packCheckbox) {
        packCheckbox.checked = isPack;
        togglePackFields(isPack);
        if (isPack) {
            const multInput = document.getElementById('p-multiplier');
            if (multInput) multInput.value = product.multiplier || 1;
            populateParentProductDropdown(product.parent_id);
            updatePackSummaryHint();
        }
    }

    selectUnitOption(product.unit || '', product.unit || '-- เลือกหน่วยนับ --');
    
    const catObj = localCategoriesCache.find(c => c.key_name === product.category);
    selectCategoryOption(product.category || '', catObj ? catObj.label_name : '-- เลือกหมวดหมู่ --');

    const previewContainer = document.getElementById('image-preview-container');
    const previewImg = document.getElementById('image-preview');
    if (product.img && product.img.trim() !== '' && product.img !== placeholderSVG) {
        previewImg.src = product.img;
        previewContainer.classList.remove('hidden');
    } else {
        removeSelectedImage();
    }

    const btnSubmit = document.getElementById('btn-submit-form');
    if (btnSubmit) {
        btnSubmit.innerText = 'บันทึกการแก้ไข';
        btnSubmit.className = 'w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold transition shadow-md active:scale-98 cursor-pointer';
    }
}

function duplicateProduct(productId) {
    const product = localProductsCache.find(p => String(p.id).trim() === String(productId).trim());
    if (!product) return;

    openAddModal();

    const modalTitle = document.getElementById('modal-title');
    if (modalTitle) {
        modalTitle.innerHTML = `
            <div class="w-5 h-5 bg-indigo-600 flex-shrink-0" 
                 style="mask: url('icon/copy.png') no-repeat center / contain; -webkit-mask: url('icon/copy.png') no-repeat center / contain;">
            </div>
            <span>คัดลอกรายการสินค้า</span>
        `;
    }

    document.getElementById('editing-id').value = '';
    document.getElementById('p-id').value = '';
    document.getElementById('p-name').value = product.name || '';
    document.getElementById('p-cost').value = product.cost_price !== undefined ? product.cost_price : '';
    document.getElementById('p-price').value = product.price || '';
    
    const minInput = document.getElementById('p-min-stock');
    const maxInput = document.getElementById('p-max-stock');
    if (minInput) minInput.value = product.min_stock !== undefined ? product.min_stock : 5;
    if (maxInput) maxInput.value = product.max_stock !== undefined ? product.max_stock : 20;

    const noBarcodeCheckbox = document.getElementById('p-no-barcode');
    if (noBarcodeCheckbox) {
        noBarcodeCheckbox.checked = (product.is_no_barcode == 1 || product.is_no_barcode === '1');
    }

    selectUnitOption(product.unit || '', product.unit || '-- เลือกหน่วยนับ --');
    
    const catObj = localCategoriesCache.find(c => c.key_name === product.category);
    selectCategoryOption(product.category || '', catObj ? catObj.label_name : '-- เลือกหมวดหมู่ --');

    const previewContainer = document.getElementById('image-preview-container');
    const previewImg = document.getElementById('image-preview');
    if (product.img && product.img.trim() !== '') {
        previewImg.src = product.img;
        previewContainer.classList.remove('hidden');
    }

    const btnSubmit = document.getElementById('btn-submit-form');
    if (btnSubmit) {
        btnSubmit.innerText = 'บันทึกสินค้าใหม่';
        btnSubmit.className = 'w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-semibold transition shadow-md active:scale-98 cursor-pointer';
    }
}

async function deleteProduct(productId) {
    const productsList = await getStoredProducts();
    const product = productsList.find(p => String(p.id).trim() === String(productId).trim());
    const name = product ? product.name : productId;

    const isConfirmed = await showCustomModal(
        'confirm',
        'ยืนยันการลบสินค้า?',
        `คุณต้องการลบรายการ <span class="font-semibold text-slate-800">"${name}"</span> ออกจากระบบใช่หรือไม่?`
    );

    if (isConfirmed) {
        await deleteProductFromStore(productId);
        
        // ⭐️ เพิ่ม 2 บรรทัดนี้เพื่อให้ข้อมูลอัปเดตและแสดงผลทันทีโดยไม่ต้องรีเฟรช
        await getStoredProducts();
        filterCategory(currentCategory);
    }
}

function closeAddModal() {
    const modal = document.getElementById('add-product-modal');
    if (!modal) return;
    modal.classList.add('hidden');
    document.getElementById('form-add-product').reset();
    selectCategoryOption('', '-- เลือกหมวดหมู่ --');
    removeSelectedImage();
    if (typeof refocusBarcode === 'function') refocusBarcode();
}

async function handleSaveProduct(event) {
    event.preventDefault();

    const categoryVal = document.getElementById('p-category').value;
    if (!categoryVal) {
        await showCustomModal('warning', 'กรุณาเลือกหมวดหมู่', 'โปรดเลือกหมวดหมู่ของสินค้าก่อนทำการบันทึก');
        return;
    }

    const editingId = document.getElementById('editing-id').value;
    const isPack = document.getElementById('p-is-pack')?.checked;
    const parentIdVal = isPack ? (document.getElementById('p-parent-id')?.value || null) : null;
    const multiplierVal = isPack ? (parseInt(document.getElementById('p-multiplier')?.value) || 1) : 1;

    const minStockVal = parseInt(document.getElementById('p-min-stock')?.value) || 5;
    const maxStockVal = parseInt(document.getElementById('p-max-stock')?.value) || 20;

    const productData = {
        id: document.getElementById('p-id').value.trim(),
        name: document.getElementById('p-name').value.trim(),
        cost_price: parseFloat(document.getElementById('p-cost')?.value) || 0,
        price: document.getElementById('p-price').value,
        stock_qty: parseInt(document.getElementById('p-stock')?.value) || 0,
        unit: document.getElementById('p-unit').value.trim() || 'ชิ้น',
        category: categoryVal,
        is_no_barcode: document.getElementById('p-no-barcode')?.checked ? 1 : 0,
        parent_id: parentIdVal,
        multiplier: multiplierVal,
        min_stock: minStockVal,
        max_stock: maxStockVal,
        existing_img: isCurrentImageRemoved ? 'images/placeholder.jpg' : currentCopiedImgPath
    };

    const fileInput = document.getElementById('p-file');
    let result;

    if (editingId) {
        result = await updateProductInStore(editingId, productData, fileInput, isCurrentImageRemoved);
    } else {
        result = await addProductToStore(productData, fileInput);
    }

    if (result.success) {
        currentCopiedImgPath = '';
        closeAddModal();
        await getStoredProducts();
        filterCategory(currentCategory);
        await showCustomModal('success', 'สำเร็จ!', 'บันทึกข้อมูลสินค้าเรียบร้อยแล้ว');
    } else {
        await showCustomModal('warning', 'ไม่สามารถบันทึกได้', result.message);
    }
}

function refreshParentDropdownCache() {
    const currentEditingId = document.getElementById('editing-id')?.value || '';
    const products = (typeof localProductsCache !== 'undefined' && localProductsCache.length > 0) ? localProductsCache : [];
    parentDropdownProductsCache = products.filter(p => (!p.parent_id || p.parent_id === '' || p.parent_id === 'null') && String(p.id).trim() !== String(currentEditingId).trim());
}

function togglePackFields(isPack) {
    const container = document.getElementById('pack-fields-container');
    const stockInput = document.getElementById('p-stock');
    if (!container) return;

    if (isPack) {
        container.classList.remove('hidden');
        refreshParentDropdownCache();
        populateParentProductDropdown();
        if (stockInput) {
            stockInput.disabled = true;
            stockInput.value = '0';
            stockInput.classList.add('bg-slate-200/60', 'cursor-not-allowed');
        }
    } else {
        container.classList.add('hidden');
        if (stockInput) {
            stockInput.disabled = false;
            stockInput.classList.remove('bg-slate-200/60', 'cursor-not-allowed');
        }
        selectParentOption('', '', 0, '');
        document.getElementById('p-multiplier').value = '1';
    }
}

function openParentDropdown() {
    const menu = document.getElementById('parent-dropdown-menu');
    const arrow = document.getElementById('parent-arrow');
    if (!menu) return;

    refreshParentDropdownCache();
    menu.classList.remove('hidden');
    if (arrow) arrow.classList.add('rotate-180');
    
    const searchInput = document.getElementById('parent-search-input');
    handleParentInputSearch(searchInput?.value || '');
}

function closeParentDropdown() {
    const menu = document.getElementById('parent-dropdown-menu');
    const arrow = document.getElementById('parent-arrow');
    if (menu) menu.classList.add('hidden');
    if (arrow) arrow.classList.remove('rotate-180');
}

function handleParentInputSearch(val) {
    const menu = document.getElementById('parent-dropdown-menu');
    const arrow = document.getElementById('parent-arrow');
    if (menu && menu.classList.contains('hidden')) {
        menu.classList.remove('hidden');
        if (arrow) arrow.classList.add('rotate-180');
    }

    refreshParentDropdownCache();

    let searchVal = val.split('(สต็อก:')[0];
    const normalizeThai = (str) => String(str || '').toLowerCase().replace(/เเ/g, 'แ');
    const cleanKey = normalizeThai(searchVal).trim();

    if (!cleanKey) {
        document.getElementById('p-parent-id').value = '';
        renderParentOptionsList(parentDropdownProductsCache);
        updatePackSummaryHint();
        return;
    }

    const filtered = parentDropdownProductsCache.filter(p => {
        const matchName = normalizeThai(p.name).includes(cleanKey);
        const matchBarcode = String(p.id || '').toLowerCase().includes(cleanKey);
        return matchName || matchBarcode;
    });

    renderParentOptionsList(filtered);
}

function populateParentProductDropdown(selectedParentId = '') {
    refreshParentDropdownCache();

    if (selectedParentId) {
        const selectedProd = parentDropdownProductsCache.find(p => String(p.id).trim() === String(selectedParentId).trim());
        if (selectedProd) {
            selectParentOption(selectedProd.id, selectedProd.name, selectedProd.stock_qty, selectedProd.unit || 'ชิ้น');
        }
    } else {
        selectParentOption('', '', 0, '');
    }
}

function renderParentOptionsList(list) {
    const listContainer = document.getElementById('parent-options-list');
    if (!listContainer) return;

    if (list.length === 0) {
        listContainer.innerHTML = '<p class="text-center py-3 text-slate-400 text-xs font-medium">ไม่พบรายการสินค้า</p>';
        return;
    }

    const currentSelectedId = document.getElementById('p-parent-id')?.value || '';

    listContainer.innerHTML = list.map(p => {
        const isSelected = String(p.id).trim() === String(currentSelectedId).trim();
        const safeName = p.name.replace(/'/g, "\\'");
        const safeUnit = (p.unit || 'ชิ้น').replace(/'/g, "\\'");
        
        return `
            <div onclick="selectParentOption('${p.id}', '${safeName}', ${p.stock_qty || 0}, '${safeUnit}')" 
                 class="flex items-center justify-between p-2.5 rounded-xl cursor-pointer transition select-none ${isSelected ? 'bg-blue-50 text-blue-700 font-bold border border-blue-200' : 'hover:bg-slate-50 text-slate-700'}">
                <div class="flex-1 min-w-0 pr-2">
                    <p class="truncate text-xs font-semibold">${p.name}</p>
                    <p class="text-[11px] text-slate-400 mt-0.5">บาร์โค้ด: ${p.id}</p>
                </div>
                <span class="text-[11px] px-2 py-0.5 rounded-lg bg-slate-100 text-slate-600 font-medium whitespace-nowrap">
                    สต็อก: ${p.stock_qty} ${p.unit || 'ชิ้น'}
                </span>
            </div>
        `;
    }).join('');
}

function selectParentOption(id, name, stock, unit) {
    const hiddenInput = document.getElementById('p-parent-id');
    const searchInput = document.getElementById('parent-search-input');

    if (hiddenInput) hiddenInput.value = id;

    if (searchInput) {
        if (id) {
            searchInput.value = `${name} (สต็อก: ${stock} ${unit})`;
        } else {
            searchInput.value = '';
        }
    }

    closeParentDropdown();
    updatePackSummaryHint();
}

function updatePackSummaryHint() {
    const parentId = document.getElementById('p-parent-id')?.value;
    const multiplierInput = document.getElementById('p-multiplier');
    const hintEl = document.getElementById('pack-summary-hint');
    if (!hintEl || !multiplierInput) return;

    const multiplier = parseInt(multiplierInput.value) || 1;

    if (parentId) {
        const prod = parentDropdownProductsCache.find(p => String(p.id).trim() === String(parentId).trim());
        if (prod) {
            const prodStock = parseInt(prod.stock_qty) || 0;
            const prodUnit = prod.unit || 'ชิ้น';
            const maxPacks = Math.floor(prodStock / multiplier);

            hintEl.innerHTML = `
                <div class="grid grid-cols-2 gap-2 text-center select-none">
                    <div class="p-2.5 bg-slate-50 border border-slate-200/80 rounded-xl">
                        <p class="text-[10px] font-semibold text-slate-400">สต็อกตัวแม่</p>
                        <p class="text-xs sm:text-sm font-bold text-slate-700 mt-0.5">${prodStock} ${prodUnit}</p>
                    </div>
                    <div class="p-2.5 bg-emerald-50 border border-emerald-200 rounded-xl">
                        <p class="text-[10px] font-bold text-emerald-600">พร้อมขายได้</p>
                        <p class="text-xs sm:text-sm font-black text-emerald-700 mt-0.5">${maxPacks} แพ็ค</p>
                    </div>
                </div>
            `;
            return;
        }
    }
    hintEl.innerHTML = `<span class="text-slate-400 text-xs">เลือกสินค้าเพื่อดูจำนวนที่พร้อมขาย</span>`;
}

function previewImage(event) {
    const file = event.target.files[0];
    const previewContainer = document.getElementById('image-preview-container');
    const previewImage = document.getElementById('image-preview');

    if (file) {
        isCurrentImageRemoved = false;
        currentCopiedImgPath = '';
        const reader = new FileReader();
        reader.onload = function(e) {
            previewImage.src = e.target.result;
            previewContainer.classList.remove('hidden');
        }
        reader.readAsDataURL(file);
    }
}

function removeSelectedImage() {
    isCurrentImageRemoved = true;
    currentCopiedImgPath = '';
    const fileInput = document.getElementById('p-file');
    const previewContainer = document.getElementById('image-preview-container');
    const previewImage = document.getElementById('image-preview');

    if (fileInput) fileInput.value = '';
    if (previewImage) previewImage.src = '';
    if (previewContainer) previewContainer.classList.add('hidden');
}

function toggleUnitDropdown() {
    const menu = document.getElementById('unit-dropdown-menu');
    const arrow = document.getElementById('unit-arrow');
    if (menu) menu.classList.toggle('hidden');
    if (arrow) arrow.classList.toggle('rotate-180');
}

function selectUnitOption(value, label) {
    const hiddenInput = document.getElementById('p-unit');
    const labelSpan = document.getElementById('unit-select-label');
    const displayText = label || value || '-- เลือกหน่วย --';
    
    if (hiddenInput) hiddenInput.value = value;
    if (labelSpan) {
        labelSpan.innerText = displayText;
        labelSpan.className = (value === '' || !value) ? 'text-slate-400 truncate' : 'text-slate-700 font-medium truncate';
    }
    
    const menu = document.getElementById('unit-dropdown-menu');
    const arrow = document.getElementById('unit-arrow');
    if (menu) menu.classList.add('hidden');
    if (arrow) arrow.classList.remove('rotate-180');
}

// ⭐️ ฟังก์ชันเรนเดอร์รายการหมวดหมู่ลงในดรอปดาวน์ ⭐️
function renderCategoryDropdownOptions() {
    const menu = document.getElementById('category-dropdown-menu');
    if (!menu) return;

    // ดึงหมวดหมู่จากแคชที่โหลดมาจากฐานข้อมูล
    const categories = (typeof localCategoriesCache !== 'undefined' && Array.isArray(localCategoriesCache) && localCategoriesCache.length > 0)
        ? localCategoriesCache 
        : [];

    let html = `
        <div onclick="selectCategoryOption('', '-- เลือกหมวดหมู่ --')" 
             class="px-3.5 py-2 hover:bg-slate-50 text-slate-400 cursor-pointer transition font-medium border-b border-slate-100">
            -- เลือกหมวดหมู่ --
        </div>
    `;

    if (categories.length === 0) {
        html += `<div class="px-3.5 py-2.5 text-slate-400 text-xs italic text-center">ไม่มีข้อมูลหมวดหมู่</div>`;
    } else {
        categories.forEach(cat => {
            const key = cat.key_name || cat.id || '';
            const label = cat.label_name || cat.name || key;
            const safeLabel = String(label).replace(/'/g, "\\'");
            const safeKey = String(key).replace(/'/g, "\\'");

            html += `
                <div onclick="selectCategoryOption('${safeKey}', '${safeLabel}')" 
                     class="px-3.5 py-2 hover:bg-indigo-50 text-slate-700 hover:text-indigo-600 font-medium cursor-pointer transition flex items-center justify-between">
                    <span>${label}</span>
                </div>
            `;
        });
    }

    menu.innerHTML = html;
}

// ⭐️ ฟังก์ชันสลับเปิด/ปิดดรอปดาวน์ ⭐️
function toggleCategoryDropdown() {
    const menu = document.getElementById('category-dropdown-menu');
    const arrow = document.getElementById('category-arrow');
    if (!menu) return;

    // สร้างเนื้อหารายการหมวดหมู่ใส่กล่องทุกครั้งที่กดเปิด
    renderCategoryDropdownOptions();

    menu.classList.toggle('hidden');
    if (arrow) arrow.classList.toggle('rotate-180');
}

// ⭐️ ฟังก์ชันเมื่อคลิกเลือกหมวดหมู่ ⭐️
function selectCategoryOption(value, label) {
    const hiddenInput = document.getElementById('p-category');
    const labelSpan = document.getElementById('category-select-label');
    
    if (hiddenInput) hiddenInput.value = value;
    if (labelSpan) {
        labelSpan.innerText = label || '-- เลือกหมวดหมู่ --';
        labelSpan.className = (value === '' || !value) 
            ? 'text-slate-400 whitespace-nowrap leading-relaxed py-0.5' 
            : 'text-slate-700 font-semibold whitespace-nowrap leading-relaxed py-0.5';
    }
    
    const menu = document.getElementById('category-dropdown-menu');
    const arrow = document.getElementById('category-arrow');
    if (menu) menu.classList.add('hidden');
    if (arrow) arrow.classList.remove('rotate-180');
}

// ⭐️ ปิดดรอปดาวน์อัตโนมัติเมื่อคลิกที่ว่างข้างนอก ⭐️
document.addEventListener('click', (e) => {
    const catWrapper = document.getElementById('category-select-btn')?.closest('.relative');
    if (catWrapper && !catWrapper.contains(e.target)) {
        const menu = document.getElementById('category-dropdown-menu');
        const arrow = document.getElementById('category-arrow');
        if (menu && !menu.classList.contains('hidden')) {
            menu.classList.add('hidden');
            if (arrow) arrow.classList.remove('rotate-180');
        }
    }
});