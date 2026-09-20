let currentEditingBill = null;
let parentDropdownProductsCache = [];
let selectedStockInProduct = null;

function loadModalHTML() {
    const container = document.getElementById('modal-container');
    if (!container) return;
    if (document.getElementById('history-table-body')) return;

    container.innerHTML = `
    <!-- 1. Modal เพิ่ม/แก้ไข สินค้า -->
    <div id="add-product-modal" class="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 hidden transition-opacity duration-150">
        <div class="bg-white w-full max-w-md p-6 rounded-3xl shadow-2xl relative space-y-4 border border-slate-100 animate-in fade-in zoom-in-95 max-h-[90vh] overflow-y-auto">
            
            <div class="flex items-center justify-between border-b border-slate-100 pb-3">
                <h3 id="modal-title" class="text-lg font-bold text-slate-800 flex items-center gap-2.5">
                    <img src="icon/plus.png" alt="เพิ่มสินค้า" class="w-[26px] h-[26px] object-contain flex-shrink-0">
                    <span class="leading-none">เพิ่มสินค้าใหม่เข้าสู่ระบบ</span>
                </h3>
                <button type="button" onclick="closeAddModal()" title="ปิดหน้าต่าง" class="text-slate-400 hover:text-slate-800 hover:bg-slate-100 w-8 h-8 flex items-center justify-center rounded-full transition cursor-pointer">
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                </button>
            </div>

            <form id="form-add-product" onsubmit="handleSaveProduct(event)" class="space-y-3">
                <input type="hidden" id="editing-id" value="">

                <div>
                    <label class="block text-xs font-semibold text-slate-600 mb-1">รหัสบาร์โค้ด / รหัสสินค้า</label>
                    <input type="text" id="p-id" required placeholder="เช่น 885123456789" class="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-600">
                </div>

                <label class="flex items-center gap-2.5 px-3.5 py-2.5 bg-slate-50 hover:bg-blue-50/50 rounded-xl border border-slate-200 cursor-pointer select-none transition group">
                    <div class="flex items-center justify-center">
                        <input type="checkbox" id="p-no-barcode" class="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-slate-300 cursor-pointer">
                    </div>
                    <div class="flex items-center gap-2">
                        <span class="text-xs font-semibold text-slate-700 group-hover:text-blue-600 transition">สินค้าไม่มีบาร์โค้ด</span>
                        <span class="text-[10px] font-medium text-slate-400 bg-white border border-slate-200 px-2 py-0.5 rounded-lg shadow-2xs">ไม่มีสแกน</span>
                    </div>
                </label>

                <div>
                    <label class="block text-xs font-semibold text-slate-600 mb-1">ชื่อสินค้า</label>
                    <input type="text" id="p-name" required placeholder="เช่น น้ำคริสตัล 600ml" class="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-600">
                </div>

                <div class="grid grid-cols-2 gap-3">
                    <div>
                        <label class="block text-xs font-semibold text-slate-600 mb-1">ราคาต้นทุน (บาท)</label>
                        <input type="number" id="p-cost" min="0" step="any" placeholder="0.00" class="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-600">
                    </div>

                    <div>
                        <label class="block text-xs font-semibold text-slate-600 mb-1">ราคาขาย (บาท)</label>
                        <input type="number" id="p-price" required min="0" step="any" placeholder="0.00" class="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-600">
                    </div>
                </div>

                <div class="grid grid-cols-2 gap-3">
                    <div>
                        <label class="block text-xs font-semibold text-slate-600 mb-1">จำนวนสต็อกคงเหลือ</label>
                        <input type="number" id="p-stock" required min="0" step="1" placeholder="0" value="0" class="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-600">
                    </div>

                    <div class="relative">
                        <label class="block text-xs font-semibold text-slate-600 mb-1">หน่วยนับ</label>
                        <input type="hidden" id="p-unit" value="">
                        <button type="button" id="unit-select-btn" onclick="toggleUnitDropdown()" 
                                class="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-left focus:outline-none focus:ring-2 focus:ring-blue-600 flex items-center justify-between transition">
                            <span id="unit-select-label" class="text-slate-400 truncate">-- เลือกหน่วยนับ --</span>
                            <svg id="unit-arrow" class="w-4 h-4 text-slate-400 transition-transform duration-200 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path>
                            </svg>
                        </button>
                        <div id="unit-dropdown-menu" class="hidden absolute left-0 right-0 mt-1 bg-white border border-slate-100 rounded-2xl shadow-xl z-30 overflow-hidden py-1 text-sm max-h-48 overflow-y-auto">
                            <div onclick="selectUnitOption('', '-- เลือกหน่วยนับ --')" class="px-3.5 py-2 hover:bg-blue-50 text-slate-400 cursor-pointer transition">-- เลือกหน่วยนับ --</div>
                            <div onclick="selectUnitOption('ชิ้น')" class="px-3.5 py-2 hover:bg-blue-50 text-slate-700 cursor-pointer transition">ชิ้น</div>
                            <div onclick="selectUnitOption('แพ็ค')" class="px-3.5 py-2 hover:bg-blue-50 text-slate-700 cursor-pointer transition">แพ็ค</div>
                            <div onclick="selectUnitOption('ลัง')" class="px-3.5 py-2 hover:bg-blue-50 text-slate-700 cursor-pointer transition">ลัง</div>
                            <div onclick="selectUnitOption('ขวด')" class="px-3.5 py-2 hover:bg-blue-50 text-slate-700 cursor-pointer transition">ขวด</div>
                            <div onclick="selectUnitOption('กล่อง')" class="px-3.5 py-2 hover:bg-blue-50 text-slate-700 cursor-pointer transition">กล่อง</div>
                            <div onclick="selectUnitOption('ซอง')" class="px-3.5 py-2 hover:bg-blue-50 text-slate-700 cursor-pointer transition">ซอง</div>
                            <div onclick="selectUnitOption('ถุง')" class="px-3.5 py-2 hover:bg-blue-50 text-slate-700 cursor-pointer transition">ถุง</div>
                            <div onclick="selectUnitOption('กระป๋อง')" class="px-3.5 py-2 hover:bg-blue-50 text-slate-700 cursor-pointer transition">กระป๋อง</div>
                            <div onclick="selectUnitOption('โหล')" class="px-3.5 py-2 hover:bg-blue-50 text-slate-700 cursor-pointer transition">โหล</div>
                        </div>
                    </div>
                </div>

                <!-- ช่องจุดสั่งซื้อขั้นต่ำ (Min) & สต็อกเป้าหมาย (Max) -->
                <div class="grid grid-cols-2 gap-3">
                    <div>
                        <label class="block text-xs font-semibold text-slate-600 mb-1">เตือนเมื่อเหลือ (ชิ้น)</label>
                        <input type="number" id="p-min-stock" min="0" step="1" placeholder="5" value="5" 
                            class="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-amber-700 focus:outline-none focus:ring-2 focus:ring-amber-500">
                    </div>
                    <div>
                        <label class="block text-xs font-semibold text-slate-600 mb-1">เติมให้เต็ม (ชิ้น)</label>
                        <input type="number" id="p-max-stock" min="0" step="1" placeholder="20" value="20" 
                            class="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500">
                    </div>
                </div>

                <!-- กล่องตัวเลือกผูกสต็อกสินค้าแพ็ค/ลัง -->
                <div class="p-3.5 bg-blue-50/70 rounded-2xl border border-blue-200/80 space-y-3">
                    <label class="flex items-center gap-2 cursor-pointer select-none">
                        <input type="checkbox" id="p-is-pack" onchange="togglePackFields(this.checked)" class="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-slate-300 cursor-pointer">
                        <span class="text-xs font-bold text-slate-800">จัดเซ็ตขายยกแพ็ค / ยกลัง</span>
                    </label>

                    <div id="pack-fields-container" class="hidden space-y-2.5 pt-2 border-t border-blue-100">
                        <div>
                            <label class="block text-xs font-semibold text-slate-700 mb-1">ตัดสต็อกจากสินค้ารายการไหน</label>
                            <div class="relative">
                                <input type="hidden" id="p-parent-id" value="">
                                
                                <div class="relative">
                                    <input type="text" id="parent-search-input" autocomplete="off"
                                           placeholder="-- พิมพ์ค้นหาชื่อ หรือ บาร์โค้ด --"
                                           onclick="openParentDropdown()"
                                           oninput="handleParentInputSearch(this.value)"
                                           class="w-full p-2.5 pr-8 bg-white border border-slate-200 rounded-2xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-600 transition shadow-2xs cursor-text">
                                    
                                    <div class="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                                        <svg id="parent-arrow" class="w-4 h-4 transition-transform duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path>
                                        </svg>
                                    </div>
                                </div>

                                <div id="parent-dropdown-menu" class="hidden absolute left-0 right-0 mt-1.5 bg-white border border-slate-200 rounded-2xl shadow-xl z-30 overflow-hidden p-1.5 text-xs">
                                    <div id="parent-options-list" class="max-h-48 overflow-y-auto space-y-1 pr-0.5"></div>
                                </div>
                            </div>
                        </div>

                        <div>
                            <label class="block text-xs font-semibold text-slate-700 mb-1">1 แพ็ค/ลัง บรรจุกี่ชิ้น</label>
                            <input type="number" id="p-multiplier" min="1" step="1" value="1" oninput="updatePackSummaryHint()" placeholder="เช่น 4, 6, 12, 24" 
                                   class="w-full p-2.5 bg-white border border-slate-200 rounded-2xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-600 shadow-2xs">
                        </div>

                        <div id="pack-summary-hint" class="p-3 bg-white rounded-2xl border border-blue-100 text-xs text-slate-700 shadow-2xs">
                            <span class="text-slate-400">เลือกสินค้าเพื่อคำนวณจำนวนแพ็คที่พร้อมขาย</span>
                        </div>
                    </div>
                </div>

                <div>
                    <label class="block text-xs font-semibold text-slate-600 mb-1">หมวดหมู่</label>
                    <div class="relative">
                        <input type="hidden" id="p-category" value="">
                        <button type="button" id="category-select-btn" onclick="toggleCategoryDropdown()" 
                                class="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-left focus:outline-none focus:ring-2 focus:ring-blue-600 flex items-center justify-between transition">
                            <span id="category-select-label" class="text-slate-400 truncate">-- เลือกหมวดหมู่ --</span>
                            <svg id="category-arrow" class="w-4 h-4 text-slate-400 transition-transform duration-200 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path>
                            </svg>
                        </button>
                        <div id="category-dropdown-menu" class="hidden absolute left-0 right-0 mt-1 bg-white border border-slate-100 rounded-2xl shadow-xl z-30 overflow-hidden py-1 text-sm max-h-48 overflow-y-auto"></div>
                    </div>
                </div>

                <div>
                    <label class="block text-xs font-semibold text-slate-600 mb-1">เลือกรูปภาพสินค้า</label>
                    <input type="file" id="p-file" accept="image/*" onchange="previewImage(event)" 
                           class="w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 cursor-pointer border border-slate-200 rounded-xl bg-slate-50 p-1">
                    
                    <div id="image-preview-container" class="mt-3 hidden flex justify-center items-center bg-slate-50 p-3 rounded-xl border border-dashed border-slate-200 relative">
                        <div class="relative inline-block">
                            <img id="image-preview" src="" alt="Preview" class="h-28 object-contain rounded-lg">
                            <button type="button" onclick="removeSelectedImage()" title="ลบรูปภาพ"
                                    class="absolute -top-2 -right-2 bg-rose-500 hover:bg-rose-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold shadow-md transition active:scale-90">
                                ✕
                            </button>
                        </div>
                    </div>
                </div>

                <div class="pt-3 border-t border-slate-100">
                    <button type="submit" id="btn-submit-form" class="w-full py-3.5 bg-[#44a64a] hover:bg-[#3b9340] text-white rounded-2xl text-sm font-semibold transition shadow-md active:scale-98 cursor-pointer">
                        บันทึกสินค้า
                    </button>
                </div>
            </form>
        </div>
    </div>

    <!-- 2. Modal จัดการหมวดหมู่สินค้า -->
    <div id="add-category-modal" class="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 hidden transition-opacity duration-150">
        <div class="bg-white w-full max-w-md p-6 rounded-3xl shadow-2xl relative space-y-4 border border-slate-100 animate-in fade-in zoom-in-95">
            <div class="flex items-center justify-between border-b border-slate-100 pb-3">
                <h3 class="text-lg font-bold text-slate-800 flex items-center gap-2">
                    <svg class="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 7h10M7 12h10m-7 5h7"></path></svg>
                    <span>จัดการหมวดหมู่สินค้า</span>
                </h3>
                <button type="button" onclick="closeAddCategoryModal()" class="text-slate-400 hover:text-slate-800 hover:bg-slate-100 w-8 h-8 flex items-center justify-center rounded-full transition active:scale-90">
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                </button>
            </div>

            <form onsubmit="handleSaveCategory(event)" class="space-y-3">
                <input type="hidden" id="editing-cat-key" value="">
                <div>
                    <label id="cat-form-label" class="block text-xs font-semibold text-slate-600 mb-1">เพิ่มหมวดหมู่ใหม่</label>
                    <div class="flex gap-2">
                        <input type="text" id="cat-label-input" required placeholder="พิมพ์ชื่อหมวดหมู่..." class="flex-grow p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-600">
                        <button type="submit" id="btn-save-cat" class="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl text-sm transition shadow-2xs whitespace-nowrap">
                            เพิ่มหมวดหมู่
                        </button>
                        <button type="button" id="btn-cancel-edit-cat" onclick="cancelCatEdit()" class="hidden px-3 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 font-semibold rounded-xl text-sm transition">
                            ยกเลิก
                        </button>
                    </div>
                </div>
            </form>

            <div class="pt-2 border-t border-slate-100">
                <p class="text-xs font-semibold text-slate-500 mb-2">รายการหมวดหมู่ทั้งหมด</p>
                <div id="manage-category-list" class="space-y-1.5 max-h-56 overflow-y-auto pr-1"></div>
            </div>
        </div>
    </div>

    <!-- 3. Modal รับเข้าสต็อกสินค้าด่วน (+สต็อก) -->
    <div id="stock-in-modal" class="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 hidden transition-opacity duration-150">
        <div class="bg-white w-full max-w-md p-6 rounded-3xl shadow-2xl relative space-y-4 border border-slate-100 animate-in fade-in zoom-in-95">
            
            <div class="flex items-center justify-between border-b border-slate-100 pb-3">
                <h3 class="text-lg font-bold text-slate-800 flex items-center gap-2.5">
                    <div class="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center border border-indigo-100">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M12 4v16m8-8H4"/>
                        </svg>
                    </div>
                    <span>รับสินค้าเข้าสต็อก</span>
                </h3>
                <button type="button" onclick="closeStockInModal()" class="text-slate-400 hover:text-slate-800 hover:bg-slate-100 w-8 h-8 flex items-center justify-center rounded-full transition cursor-pointer">
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                </button>
            </div>

            <div class="space-y-3.5">
                <div>
                    <label class="block text-xs font-semibold text-slate-700 mb-1">สแกนบาร์โค้ด หรือพิมพ์ค้นหาสินค้า</label>
                    <div class="relative">
                        <input type="text" id="stock-in-search-input" autocomplete="off"
                               placeholder="สแกนหรือพิมพ์ชื่อสินค้า..." 
                               oninput="handleStockInSearch(this.value)"
                               onkeydown="if(event.key==='Enter') handleStockInBarcodeEnter(event)"
                               class="w-full p-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-semibold text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-600 shadow-2xs transition">
                        
                        <div id="stock-in-dropdown-menu" class="hidden absolute left-0 right-0 mt-1.5 bg-white border border-slate-200 rounded-2xl shadow-xl z-30 overflow-hidden p-1.5 text-xs">
                            <div id="stock-in-options-list" class="max-h-48 overflow-y-auto space-y-1 pr-0.5"></div>
                        </div>
                    </div>
                </div>

                <div id="stock-in-selected-card" class="hidden p-3.5 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-2">
                    <div class="flex items-center gap-3">
                        <img id="stock-in-img" src="" class="w-12 h-12 object-contain rounded-xl bg-white border border-slate-100 p-1 flex-shrink-0">
                        <div class="min-w-0 flex-1">
                            <h4 id="stock-in-name" class="text-xs sm:text-sm font-bold text-slate-800 truncate"></h4>
                            <p id="stock-in-info" class="text-xs sm:text-xs text-slate-600 font-medium mt-1"></p>
                        </div>
                    </div>
                </div>

                <div>
                    <label class="block text-xs font-semibold text-slate-700 mb-1">
                        จำนวนที่รับเข้า <span id="stock-in-unit-label" class="font-bold text-indigo-600">(หน่วย)</span>
                    </label>
                    <div class="flex items-center gap-2">
                        <input type="number" id="stock-in-qty" min="1" step="1" value="1" oninput="updateStockInLivePreview()" 
                               class="w-full p-3 bg-white border-2 border-indigo-500 rounded-2xl text-center text-xl font-black text-slate-800 focus:outline-none shadow-2xs">
                        <div class="flex gap-1">
                            <button type="button" onclick="addStockInQty(1)" class="px-3 py-3 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold rounded-xl text-xs active:scale-95 transition">+1</button>
                            <button type="button" onclick="addStockInQty(5)" class="px-3 py-3 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold rounded-xl text-xs active:scale-95 transition">+5</button>
                            <button type="button" onclick="addStockInQty(10)" class="px-3 py-3 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold rounded-xl text-xs active:scale-95 transition">+10</button>
                        </div>
                    </div>
                </div>

                <div id="stock-in-preview-box" class="hidden p-3.5 bg-indigo-50/70 border border-indigo-200/80 rounded-2xl text-xs sm:text-sm font-medium text-indigo-900 leading-relaxed"></div>

                <div class="pt-2 border-t border-slate-100">
                    <button type="button" id="btn-submit-stock-in" onclick="submitStockIn()" 
                            class="w-full py-3.5 bg-indigo-600 hover:bg-indigo-700 active:scale-98 text-white font-bold rounded-2xl text-sm transition shadow-lg shadow-indigo-600/25 cursor-pointer">
                        ยืนยันรับเข้าสต็อก
                    </button>
                </div>
            </div>
        </div>
    </div>
    `;
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

    // ⭐️ ดึงค่าจาก Input ID: p-min-stock และ p-max-stock ⭐️
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
        min_stock: minStockVal,   // ⭐️ ส่งค่าชื่อ min_stock
        max_stock: maxStockVal,   // ⭐️ ส่งค่าชื่อ max_stock
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

// ----------------- Custom Parent Searchable Combobox -----------------

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

// ----------------- 📦 ระบบรับสินค้าเข้าสต็อกด่วน (Stock In Modal) -----------------

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
        listContainer.innerHTML = '<p class="text-center py-3 text-slate-400 text-xs">ไม่พบรายการสินค้า</p>';
    } else {
        listContainer.innerHTML = filtered.slice(0, 15).map(p => {
            const isPack = Boolean(p.parent_id && p.parent_id !== '' && p.parent_id !== 'null');
            const safeName = p.name.replace(/'/g, "\\'");
            const safeUnit = (p.unit || 'ชิ้น').replace(/'/g, "\\'");

            return `
                <div onclick="selectStockInProduct('${p.id}')" 
                     class="flex items-center justify-between p-2.5 rounded-xl hover:bg-indigo-50 cursor-pointer transition select-none">
                    <div class="flex-1 min-w-0 pr-2">
                        <p class="truncate text-xs font-semibold text-slate-800">${p.name}</p>
                        <p class="text-[11px] text-slate-400 mt-0.5">บาร์โค้ด: ${p.id} ${isPack ? '<span class="text-indigo-600 font-bold">(สินค้าแพ็ค/ลัง)</span>' : ''}</p>
                    </div>
                    <span class="text-[11px] px-2 py-0.5 rounded-lg bg-slate-100 text-slate-600 font-medium whitespace-nowrap">
                        สต็อก: ${p.stock_qty} ${p.unit || 'ชิ้น'}
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
            infoEl.innerHTML = `📦 สต็อกคงเหลือปัจจุบัน: <b class="text-indigo-600 text-sm sm:text-base font-black">${prod.stock_qty} ${prod.unit || 'ชิ้น'}</b>`;
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
        qtyInput.value = currentVal + amount;
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
            <div class="flex items-center justify-between">
                <span class="text-slate-600 font-semibold">สต็อกของ <b>${parentProd ? parentProd.name : 'ตัวเดี่ยว'}</b></span>
                <span class="text-xs text-indigo-600 font-bold bg-white px-2 py-0.5 rounded-lg border border-indigo-100">+${totalAddPieces} ${pUnit}</span>
            </div>
            <p class="text-base font-black text-slate-800 mt-1">
                เดิม ${oldStock} + ${totalAddPieces} ➔ <span class="text-emerald-600">สต็อกใหม่: ${newStock} ${pUnit}</span>
            </p>
        `;
    } else {
        const oldStock = parseInt(selectedStockInProduct.stock_qty) || 0;
        const newStock = oldStock + inputQty;
        const unit = selectedStockInProduct.unit || 'ชิ้น';

        previewBox.innerHTML = `
            <div class="flex items-center justify-between">
                <span class="text-slate-600 font-semibold">สต็อกของ <b>${selectedStockInProduct.name}</b></span>
                <span class="text-xs text-indigo-600 font-bold bg-white px-2 py-0.5 rounded-lg border border-indigo-100">+${inputQty} ${unit}</span>
            </div>
            <p class="text-base font-black text-slate-800 mt-1">
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
        // ⭐️ ส่ง JSON เข้า Node.js API
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

// ----------------- Image & Delete Helpers -----------------

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
        filterCategory(currentCategory);
    }
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

// ----------------- Helper Dropdowns -----------------

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

async function openAddCategoryModal() {
    const modal = document.getElementById('add-category-modal');
    if (!modal) return;
    cancelCatEdit();
    await renderCategoryManageList();
    modal.classList.remove('hidden');
    document.getElementById('cat-label-input').focus();
}

function closeAddCategoryModal() {
    const modal = document.getElementById('add-category-modal');
    if (modal) modal.classList.add('hidden');
}

let draggedCategoryIndex = null;

async function renderCategoryManageList() {
    const container = document.getElementById('manage-category-list');
    if (!container) return;

    const categories = (typeof localCategoriesCache !== 'undefined' && localCategoriesCache.length > 0) 
        ? localCategoriesCache 
        : (typeof getStoredCategories === 'function' ? await getStoredCategories() : []);

    if (categories.length === 0) {
        container.innerHTML = '<p class="text-xs text-center py-4 text-slate-400">ยังไม่มีหมวดหมู่สินค้า</p>';
        return;
    }

    const htmlRows = categories.map((cat, index) => `
        <div draggable="true" 
             ondragstart="handleCatDragStart(event, ${index})" 
             ondragover="handleCatDragOver(event)" 
             ondragenter="handleCatDragEnter(event)" 
             ondragleave="handleCatDragLeave(event)" 
             ondrop="handleCatDrop(event, ${index})" 
             ondragend="handleCatDragEnd(event)"
             class="cat-drag-item flex items-center justify-between p-2.5 bg-slate-50 rounded-xl border border-slate-200/80 hover:bg-slate-100/80 cursor-grab active:cursor-grabbing select-none transition group">
            
            <div class="flex items-center gap-2.5">
                <div class="text-slate-400 group-hover:text-slate-600">
                    <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M7 4a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0zM7 16a2 2 0 11-4 0 2 2 0 014 0zM17 4a2 2 0 11-4 0 2 2 0 014 0zM17 10a2 2 0 11-4 0 2 2 0 014 0zM17 16a2 2 0 11-4 0 2 2 0 014 0z"></path>
                    </svg>
                </div>
                <span class="text-sm font-semibold text-slate-700 pointer-events-none">${cat.label_name}</span>
            </div>

            <div class="flex items-center gap-1" onmousedown="event.stopPropagation()">
                <button type="button" onclick="editCategoryItem('${cat.key_name}', '${cat.label_name}')" title="แก้ไขชื่อ" class="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-white rounded-lg transition active:scale-90">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21H3v-3.572L16.732 3.732z"></path></svg>
                </button>
                <button type="button" onclick="deleteCategoryItem('${cat.key_name}', '${cat.label_name}')" title="ลบหมวดหมู่" class="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-white rounded-lg transition active:scale-90">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
                </button>
            </div>
        </div>
    `).join('');

    container.innerHTML = htmlRows;
}

function editCategoryItem(keyName, labelName) {
    document.getElementById('editing-cat-key').value = keyName;
    document.getElementById('cat-label-input').value = labelName;
    document.getElementById('cat-form-label').innerText = 'แก้ไขชื่อหมวดหมู่';
    document.getElementById('btn-save-cat').innerText = 'บันทึกแก้ไข';
    document.getElementById('btn-save-cat').className = 'px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl text-sm transition shadow-2xs whitespace-nowrap';
    document.getElementById('btn-cancel-edit-cat').classList.remove('hidden');
    document.getElementById('cat-label-input').focus();
}

function cancelCatEdit() {
    document.getElementById('editing-cat-key').value = '';
    document.getElementById('cat-label-input').value = '';
    document.getElementById('cat-form-label').innerText = 'เพิ่มหมวดหมู่ใหม่';
    document.getElementById('btn-save-cat').innerText = 'เพิ่มหมวดหมู่';
    document.getElementById('btn-save-cat').className = 'px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl text-sm transition shadow-2xs whitespace-nowrap';
    document.getElementById('btn-cancel-edit-cat').classList.add('hidden');
}

async function handleSaveCategory(event) {
    event.preventDefault();
    const keyVal = document.getElementById('editing-cat-key').value.trim();
    const labelVal = document.getElementById('cat-label-input').value.trim();
    if (!labelVal) return;

    let res;
    if (keyVal) {
        res = await updateCategoryInStore(keyVal, labelVal);
    } else {
        res = await addCategoryToStore(labelVal);
    }

    if (res.success) {
        cancelCatEdit();
        await renderCategoryManageList();
        if (typeof loadAndRenderCategories === 'function') await loadAndRenderCategories();
        if (typeof getStoredProducts === 'function' && typeof renderProducts === 'function') {
            const products = await getStoredProducts();
            renderProducts(products);
        }
    } else {
        await showCustomModal('warning', 'เกิดข้อผิดพลาด', res.message);
    }
}

async function deleteCategoryItem(keyName, labelName) {
    const isConfirmed = await showCustomModal(
        'confirm',
        'ยืนยันลบหมวดหมู่?',
        `คุณต้องการลบหมวดหมู่ <span class="font-bold text-slate-800">"${labelName}"</span> ออกใช่หรือไม่?`
    );

    if (isConfirmed) {
        const res = await deleteCategoryFromStore(keyName);
        if (res.success) {
            cancelCatEdit();
            await renderCategoryManageList();
            if (typeof loadAndRenderCategories === 'function') await loadAndRenderCategories();
            if (typeof getStoredProducts === 'function' && typeof renderProducts === 'function') {
                const products = await getStoredProducts();
                renderProducts(products);
            }
        } else {
            await showCustomModal('warning', 'ไม่สามารถลบได้', res.message);
        }
    }
}

function toggleCategoryDropdown() {
    const menu = document.getElementById('category-dropdown-menu');
    const arrow = document.getElementById('category-arrow');
    if (menu) menu.classList.toggle('hidden');
    if (arrow) arrow.classList.toggle('rotate-180');
}

function selectCategoryOption(value, label) {
    const hiddenInput = document.getElementById('p-category');
    const labelSpan = document.getElementById('category-select-label');
    
    if (hiddenInput) hiddenInput.value = value;
    if (labelSpan) {
        labelSpan.innerText = label;
        labelSpan.className = value === '' ? 'text-slate-400 truncate' : 'text-slate-700 font-medium truncate';
    }
    
    const menu = document.getElementById('category-dropdown-menu');
    const arrow = document.getElementById('category-arrow');
    if (menu) menu.classList.add('hidden');
    if (arrow) arrow.classList.remove('rotate-180');
}

// ----------------- Global Click Handler -----------------

document.addEventListener('click', (e) => {
    const virtualKeyboard = document.getElementById('pos-virtual-keyboard');
    if (virtualKeyboard && virtualKeyboard.contains(e.target)) return;

    // 1. หมวดหมู่
    const catBtn = document.getElementById('category-select-btn');
    const catMenu = document.getElementById('category-dropdown-menu');
    if (catBtn && catMenu && !catBtn.contains(e.target) && !catMenu.contains(e.target)) {
        catMenu.classList.add('hidden');
        const arrow = document.getElementById('category-arrow');
        if (arrow) arrow.classList.remove('rotate-180');
    }

    // 2. หน่วยนับ
    const unitBtn = document.getElementById('unit-select-btn');
    const unitMenu = document.getElementById('unit-dropdown-menu');
    if (unitBtn && unitMenu && !unitBtn.contains(e.target) && !unitMenu.contains(e.target)) {
        unitMenu.classList.add('hidden');
        const arrow = document.getElementById('unit-arrow');
        if (arrow) arrow.classList.remove('rotate-180');
    }

    // 3. สินค้าตัวแม่
    const parentInput = document.getElementById('parent-search-input');
    const parentMenu = document.getElementById('parent-dropdown-menu');
    if (parentInput && parentMenu && !parentInput.contains(e.target) && !parentMenu.contains(e.target)) {
        closeParentDropdown();
    }

    // 4. ค้นหาสินค้ารับเข้าสต็อก
    const stockInInput = document.getElementById('stock-in-search-input');
    const stockInMenu = document.getElementById('stock-in-dropdown-menu');
    if (stockInInput && stockInMenu && !stockInInput.contains(e.target) && !stockInMenu.contains(e.target)) {
        stockInMenu.classList.add('hidden');
    }
});

// ----------------- Drag and Drop Helpers -----------------

function handleCatDragStart(e, index) {
    draggedCategoryIndex = index;
    e.dataTransfer.effectAllowed = 'move';
    e.currentTarget.classList.add('opacity-40', 'border-dashed', 'border-blue-400', 'bg-blue-50/50');
}

function handleCatDragOver(e) {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
}

function handleCatDragEnter(e) {
    e.preventDefault();
    const item = e.currentTarget.closest('.cat-drag-item');
    if (item) item.classList.add('border-blue-500', 'bg-blue-50/30', 'scale-[1.01]');
}

function handleCatDragLeave(e) {
    const item = e.currentTarget.closest('.cat-drag-item');
    if (item) item.classList.remove('border-blue-500', 'bg-blue-50/30', 'scale-[1.01]');
}

async function handleCatDrop(e, targetIndex) {
    e.preventDefault();
    e.stopPropagation();

    if (draggedCategoryIndex === null || draggedCategoryIndex === targetIndex) return;

    const categories = [...localCategoriesCache];
    const [movedItem] = categories.splice(draggedCategoryIndex, 1);
    categories.splice(targetIndex, 0, movedItem);

    localCategoriesCache = [...categories];
    await renderCategoryManageList();
    if (typeof saveCategoriesOrder === 'function') await saveCategoriesOrder(localCategoriesCache);
    if (typeof loadAndRenderCategories === 'function') await loadAndRenderCategories();
}

function handleCatDragEnd(e) {
    draggedCategoryIndex = null;
    document.querySelectorAll('.cat-drag-item').forEach(el => {
        el.classList.remove('opacity-40', 'border-dashed', 'border-blue-400', 'bg-blue-50/50', 'border-blue-500', 'bg-blue-50/30', 'scale-[1.01]');
    });
}

// ----------------- Custom Alert Modal -----------------

function showCustomModal(type, title, message) {
    return new Promise((resolve) => {
        let container = document.getElementById('custom-modal-container');
        
        if (!container) {
            container = document.createElement('div');
            container.id = 'custom-modal-container';
            document.body.appendChild(container);
        }

        let iconHtml = '';
        let buttonsHtml = '';

        if (type === 'confirm') {
            iconHtml = `
                <div class="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-1 flex-shrink-0 shadow-2xs">
                    <div class="w-8 h-8 bg-red-500" 
                         style="mask: url('icon/delete.png') no-repeat center / contain; -webkit-mask: url('icon/delete.png') no-repeat center / contain;">
                    </div>
                </div>`;
            buttonsHtml = `
                <div class="grid grid-cols-2 gap-3 pt-2">
                    <button id="btn-modal-cancel" class="w-full py-3 bg-gray-100 hover:bg-gray-200 active:scale-95 text-gray-700 rounded-2xl text-sm font-semibold transition cursor-pointer">ยกเลิก</button>
                    <button id="btn-modal-accept" class="w-full py-3 bg-red-600 hover:bg-red-700 active:scale-95 text-white rounded-2xl text-sm font-semibold shadow-md transition cursor-pointer">ยืนยัน</button>
                </div>`;
        } else if (type === 'warning' || type === 'out_of_stock') {
            iconHtml = `
                <div class="w-16 h-16 bg-amber-100 text-amber-500 rounded-full flex items-center justify-center mx-auto mb-1">
                    <svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path>
                    </svg>
                </div>`;
            buttonsHtml = `
                <div class="pt-2">
                    <button id="btn-modal-accept" class="w-full py-3 bg-amber-500 hover:bg-amber-600 active:scale-95 text-white rounded-2xl text-sm font-semibold shadow-md transition cursor-pointer">ตกลง</button>
                </div>`;
        } else if (type === 'error') {
            iconHtml = `
                <div class="w-16 h-16 bg-red-100 text-red-500 rounded-full flex items-center justify-center mx-auto mb-1">
                    <svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M6 18L18 6M6 6l12 12"></path>
                    </svg>
                </div>`;
            buttonsHtml = `
                <div class="pt-2">
                    <button id="btn-modal-accept" class="w-full py-3 bg-red-600 hover:bg-red-700 active:scale-95 text-white rounded-2xl text-sm font-semibold shadow-md transition cursor-pointer">ปิด</button>
                </div>`;
        } else if (type === 'success') {
            iconHtml = `
                <div class="w-16 h-16 bg-emerald-100 text-emerald-500 rounded-full flex items-center justify-center mx-auto mb-1">
                    <svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path class="animate-svg-check" stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7"></path>
                    </svg>
                </div>`;
            buttonsHtml = `
                <div class="pt-2">
                    <button id="btn-modal-accept" class="w-full py-3 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white rounded-2xl text-sm font-semibold shadow-md transition cursor-pointer">ตกลง</button>
                </div>`;
        }

        container.innerHTML = `
        <div id="custom-alert-backdrop" class="fixed inset-0 bg-black/40 z-[60] flex items-center justify-center p-4 animate-backdrop-in">
            <div id="custom-alert-box" class="bg-white w-full max-w-sm p-6 rounded-3xl shadow-xl text-center space-y-4 border border-gray-100 animate-modal-in">
                ${iconHtml}
                <div class="space-y-1">
                    <h3 class="text-xl font-bold text-gray-800">${title}</h3>
                    <p class="text-sm text-gray-500 font-normal leading-relaxed px-2">${message}</p>
                </div>
                ${buttonsHtml}
            </div>
        </div>
        `;

        const backdrop = document.getElementById('custom-alert-backdrop');
        const box = document.getElementById('custom-alert-box');
        const btnCancel = document.getElementById('btn-modal-cancel');
        const btnAccept = document.getElementById('btn-modal-accept');

        const cleanup = (result) => {
            document.removeEventListener('keydown', handleKeyDown);
            if (backdrop && box) {
                backdrop.classList.remove('animate-backdrop-in');
                backdrop.classList.add('animate-backdrop-out');
                box.classList.remove('animate-modal-in');
                box.classList.add('animate-modal-out');

                setTimeout(() => {
                    container.innerHTML = '';
                    resolve(result);
                }, 120);
            } else {
                resolve(result);
            }
        };

        const handleKeyDown = (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                cleanup(true);
            } else if (e.key === 'Escape') {
                e.preventDefault();
                cleanup(false);
            }
        };

        document.addEventListener('keydown', handleKeyDown);

        if (btnCancel) btnCancel.addEventListener('click', () => cleanup(false));
        if (btnAccept) {
            btnAccept.addEventListener('click', () => cleanup(true));
            btnAccept.focus();
        }
    });
}