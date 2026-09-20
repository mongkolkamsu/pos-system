let draggedCategoryIndex = null;
let draggedUnitIndex = null;
const DEFAULT_UNITS = ['ชิ้น', 'แพ็ค', 'ลัง', 'ขวด', 'กล่อง', 'ซอง', 'ถุง', 'กระป๋อง', 'โหล', 'ขีด', 'ฟอง'];

function getStoredUnits() {
    try {
        const saved = localStorage.getItem('pos_custom_units');
        if (saved) return JSON.parse(saved);
    } catch (e) {}
    return [...DEFAULT_UNITS];
}

function saveUnitsToStore(units) {
    try {
        localStorage.setItem('pos_custom_units', JSON.stringify(units));
        // ⭐️ ส่งสัญญาณบอกทุกหน้าจอและทุกไฟล์ว่าหน่วยนับมีการเปลี่ยนแปลงแล้ว ⭐️
        window.dispatchEvent(new Event('unitsUpdated'));
    } catch (e) {}
}

// อัปเดตดรอปดาวน์หน่วยนับทั้งระบบอัตโนมัติ
window.addEventListener('unitsUpdated', () => {
    if (typeof refreshUnitDropdown === 'function') refreshUnitDropdown();
    if (typeof refreshSearchUnitDropdown === 'function') refreshSearchUnitDropdown();
});

function loadCategoryModalHTML(container) {
    if (!container) return;
    container.innerHTML += `
    <!-- Modal จัดการหมวดหมู่และหน่วยนับ (สไตล์ iOS Widget 2 คอลัมน์) -->
    <div id="add-category-modal" class="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 hidden transition-opacity duration-200">
        <div class="bg-white w-full max-w-4xl p-6 sm:p-8 rounded-[32px] shadow-2xl relative space-y-6 border border-slate-100 animate-in fade-in zoom-in-95 max-h-[92vh] overflow-y-auto">
            
            <!-- ส่วนหัว Modal สไตล์ iOS Header -->
            <div class="flex items-center justify-between pb-1">
                <div class="flex items-center gap-3">
                    <div class="w-10 h-10 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center shadow-2xs flex-shrink-0">
                        <svg class="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 7h10M7 12h10m-7 5h7"/>
                        </svg>
                    </div>
                    <div>
                        <h3 class="text-lg font-bold text-slate-900 tracking-tight leading-none">จัดการหมวดหมู่และหน่วยนับ</h3>
                        <p class="text-[11px] text-slate-400 font-medium mt-1">เพิ่ม แก้ไข หรือลากสลับลำดับการแสดงผลของร้านค้า</p>
                    </div>
                </div>
                <button type="button" onclick="closeAddCategoryModal()" title="ปิดหน้าต่าง" class="text-slate-400 hover:text-slate-800 hover:bg-slate-100 w-8 h-8 flex items-center justify-center rounded-full transition active:scale-90 cursor-pointer">
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
                </button>
            </div>

            <!-- โครงสร้าง 2 ช่อง (คอลัมน์ 1: หมวดหมู่ | คอลัมน์ 2: หน่วยนับ) -->
            <div class="grid grid-cols-1 md:grid-cols-2 gap-5">
                
                <!-- ช่องที่ 1: จัดการหมวดหมู่ -->
                <div class="bg-slate-50/80 p-4 sm:p-5 rounded-3xl border border-slate-200/80 space-y-4 flex flex-col shadow-inner">
                    <div class="flex items-center gap-2">
                        <div class="w-7 h-7 rounded-xl bg-indigo-100 text-indigo-600 flex items-center justify-center">
                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16m-7 6h7"/></svg>
                        </div>
                        <h4 class="text-sm font-bold text-slate-800">จัดการหมวดหมู่สินค้า</h4>
                    </div>

                    <form onsubmit="handleSaveCategory(event)" class="space-y-2">
                        <input type="hidden" id="editing-cat-key" value="">
                        <div>
                            <label id="cat-form-label" class="block text-xs font-bold text-slate-600 mb-1.5">เพิ่มหมวดหมู่ใหม่</label>
                            <div class="flex gap-2">
                                <input type="text" id="cat-label-input" required placeholder="พิมพ์ชื่อหมวดหมู่..." 
                                       class="flex-grow p-3 bg-white border-2 border-slate-200 focus:border-indigo-500 rounded-2xl text-xs font-bold text-slate-800 focus:outline-none transition shadow-2xs">
                                <button type="submit" id="btn-save-cat" 
                                        class="px-4 py-3 bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white font-bold rounded-2xl text-xs transition shadow-sm shadow-indigo-600/25 whitespace-nowrap cursor-pointer">
                                    เพิ่ม
                                </button>
                                <button type="button" id="btn-cancel-edit-cat" onclick="cancelCatEdit()" 
                                        class="hidden px-3.5 py-3 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold rounded-2xl text-xs transition active:scale-95">
                                    ยกเลิก
                                </button>
                            </div>
                        </div>
                    </form>

                    <div class="pt-3 border-t border-slate-200/60 flex-1 flex flex-col min-h-[220px]">
                        <p class="text-[11px] font-bold text-slate-400 mb-2.5">รายการหมวดหมู่ทั้งหมด (ลากเพื่อสลับลำดับ)</p>
                        <div id="manage-category-list" class="space-y-2 max-h-64 overflow-y-auto pr-1 flex-1"></div>
                    </div>
                </div>

                <!-- ช่องที่ 2: จัดการหน่วยนับ -->
                <div class="bg-slate-50/80 p-4 sm:p-5 rounded-3xl border border-slate-200/80 space-y-4 flex flex-col shadow-inner">
                    <div class="flex items-center gap-2">
                        <div class="w-7 h-7 rounded-xl bg-indigo-100 text-indigo-600 flex items-center justify-center">
                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"/></svg>
                        </div>
                        <h4 class="text-sm font-bold text-slate-800">จัดการหน่วยนับสินค้า</h4>
                    </div>

                    <form onsubmit="handleSaveUnit(event)" class="space-y-2">
                        <input type="hidden" id="editing-unit-old" value="">
                        <div>
                            <label id="unit-form-label" class="block text-xs font-bold text-slate-600 mb-1.5">เพิ่มหน่วยนับใหม่</label>
                            <div class="flex gap-2">
                                <input type="text" id="unit-label-input" required placeholder="พิมพ์ชื่อหน่วยนับ..." 
                                       class="flex-grow p-3 bg-white border-2 border-slate-200 focus:border-indigo-500 rounded-2xl text-xs font-bold text-slate-800 focus:outline-none transition shadow-2xs">
                                <button type="submit" id="btn-save-unit" 
                                        class="px-4 py-3 bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white font-bold rounded-2xl text-xs transition shadow-sm shadow-indigo-600/25 whitespace-nowrap cursor-pointer">
                                    เพิ่ม
                                </button>
                                <button type="button" id="btn-cancel-edit-unit" onclick="cancelUnitEdit()" 
                                        class="hidden px-3.5 py-3 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold rounded-2xl text-xs transition active:scale-95">
                                    ยกเลิก
                                </button>
                            </div>
                        </div>
                    </form>

                    <div class="pt-3 border-t border-slate-200/60 flex-1 flex flex-col min-h-[220px]">
                        <p class="text-[11px] font-bold text-slate-400 mb-2.5">รายการหน่วยนับทั้งหมด (ลากเพื่อสลับลำดับ)</p>
                        <div id="manage-unit-list" class="space-y-2 max-h-64 overflow-y-auto pr-1 flex-1"></div>
                    </div>
                </div>

            </div>

        </div>
    </div>
    `;
}

// --- ควบคุมหน้าต่าง Modal ---
async function openAddCategoryModal() {
    const modal = document.getElementById('add-category-modal');
    if (!modal) return;
    cancelCatEdit();
    cancelUnitEdit();
    await renderCategoryManageList();
    renderUnitManageList();
    modal.classList.remove('hidden');
    document.getElementById('cat-label-input').focus();
}

function closeAddCategoryModal() {
    const modal = document.getElementById('add-category-modal');
    if (modal) modal.classList.add('hidden');
}

// --- ฟังก์ชันหมวดหมู่ ---
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

    container.innerHTML = categories.map((cat, index) => `
        <div draggable="true" 
             ondragstart="handleCatDragStart(event, ${index})" 
             ondragover="handleCatDragOver(event)" 
             ondragenter="handleCatDragEnter(event)" 
             ondragleave="handleCatDragLeave(event)" 
             ondrop="handleCatDrop(event, ${index})" 
             ondragend="handleCatDragEnd(event)"
             class="cat-drag-item flex items-center justify-between p-3 bg-white rounded-2xl border border-slate-200/80 hover:border-slate-300 hover:shadow-sm cursor-grab active:cursor-grabbing select-none transition group">
            
            <div class="flex items-center gap-2.5 pl-1">
                <svg class="w-3.5 h-3.5 text-slate-300 group-hover:text-slate-500 transition" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 8h16M4 16h16"/>
                </svg>
                <span class="text-xs font-bold text-slate-800 pointer-events-none">${cat.label_name}</span>
            </div>

            <div class="flex items-center gap-1" onmousedown="event.stopPropagation()">
                <button type="button" onclick="editCategoryItem('${cat.key_name}', '${cat.label_name}')" title="แก้ไขชื่อ" class="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition active:scale-90 cursor-pointer">
                    <div class="w-3.5 h-3.5 bg-slate-400 hover:bg-indigo-600 transition" 
                        style="mask: url('icon/pencil.png') no-repeat center / contain; -webkit-mask: url('icon/pencil.png') no-repeat center / contain;">
                    </div>
                </button>
                <button type="button" onclick="deleteCategoryItem('${cat.key_name}', '${cat.label_name}')" title="ลบหมวดหมู่" class="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition active:scale-90 cursor-pointer">
                    <div class="w-3.5 h-3.5 bg-slate-400 hover:bg-rose-600 transition" 
                        style="mask: url('icon/delete.png') no-repeat center / contain; -webkit-mask: url('icon/delete.png') no-repeat center / contain;">
                    </div>
                </button>
            </div>
        </div>
    `).join('');
}

function editCategoryItem(keyName, labelName) {
    document.getElementById('editing-cat-key').value = keyName;
    document.getElementById('cat-label-input').value = labelName;
    document.getElementById('cat-form-label').innerText = 'แก้ไขชื่อหมวดหมู่';
    document.getElementById('btn-save-cat').innerText = 'บันทึก';
    document.getElementById('btn-save-cat').className = 'px-4 py-3 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-bold rounded-2xl text-xs transition shadow-sm shadow-emerald-600/25 whitespace-nowrap cursor-pointer';
    document.getElementById('btn-cancel-edit-cat').classList.remove('hidden');
    document.getElementById('cat-label-input').focus();
}

function cancelCatEdit() {
    document.getElementById('editing-cat-key').value = '';
    document.getElementById('cat-label-input').value = '';
    document.getElementById('cat-form-label').innerText = 'เพิ่มหมวดหมู่ใหม่';
    document.getElementById('btn-save-cat').innerText = 'เพิ่ม';
    document.getElementById('btn-save-cat').className = 'px-4 py-3 bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white font-bold rounded-2xl text-xs transition shadow-sm shadow-indigo-600/25 whitespace-nowrap cursor-pointer';
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
        
        // 🌟 ดึงข้อมูลหมวดหมู่ใหม่จาก Backend ทันทีแบบเรียลไทม์
        if (typeof getStoredCategories === 'function') {
            localCategoriesCache = await getStoredCategories();
        }
        
        await renderCategoryManageList();
        
        // 🌟 อัปเดตแถบหมวดหมู่ที่หน้าจอหลักทันที
        if (typeof loadAndRenderCategories === 'function') await loadAndRenderCategories();
        if (typeof renderCategoryBar === 'function') renderCategoryBar();

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
            
            // 🌟 ดึงข้อมูลหมวดหมู่ใหม่จาก Backend ทันทีแบบเรียลไทม์
            if (typeof getStoredCategories === 'function') {
                localCategoriesCache = await getStoredCategories();
            }

            await renderCategoryManageList();

            // 🌟 อัปเดตแถบหมวดหมู่ที่หน้าจอหลักทันที
            if (typeof loadAndRenderCategories === 'function') await loadAndRenderCategories();
            if (typeof renderCategoryBar === 'function') renderCategoryBar();

            if (typeof getStoredProducts === 'function' && typeof renderProducts === 'function') {
                const products = await getStoredProducts();
                renderProducts(products);
            }
        } else {
            await showCustomModal('warning', 'ไม่สามารถลบได้', res.message);
        }
    }
}

function handleCatDragStart(e, index) {
    draggedCategoryIndex = index;
    e.dataTransfer.effectAllowed = 'move';
    e.currentTarget.classList.add('opacity-40', 'border-dashed', 'border-indigo-400', 'bg-indigo-50/50');
}

function handleCatDragOver(e) {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
}

function handleCatDragEnter(e) {
    e.preventDefault();
    const item = e.currentTarget.closest('.cat-drag-item');
    if (item) item.classList.add('border-indigo-500', 'bg-indigo-50/30', 'scale-[1.01]');
}

function handleCatDragLeave(e) {
    const item = e.currentTarget.closest('.cat-drag-item');
    if (item) item.classList.remove('border-indigo-500', 'bg-indigo-50/30', 'scale-[1.01]');
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
        el.classList.remove('opacity-40', 'border-dashed', 'border-indigo-400', 'bg-indigo-50/50', 'border-indigo-500', 'bg-indigo-50/30', 'scale-[1.01]');
    });
}

// --- ฟังก์ชันหน่วยนับ (พร้อมระบบลากสลับลำดับ) ---
function renderUnitManageList() {
    const container = document.getElementById('manage-unit-list');
    if (!container) return;

    const units = getStoredUnits();

    if (units.length === 0) {
        container.innerHTML = '<p class="text-xs text-center py-4 text-slate-400">ยังไม่มีหน่วยนับ</p>';
        return;
    }

    container.innerHTML = units.map((unit, index) => `
        <div draggable="true" 
             ondragstart="handleUnitDragStart(event, ${index})" 
             ondragover="handleUnitDragOver(event)" 
             ondragenter="handleUnitDragEnter(event)" 
             ondragleave="handleUnitDragLeave(event)" 
             ondrop="handleUnitDrop(event, ${index})" 
             ondragend="handleUnitDragEnd(event)"
             class="unit-drag-item flex items-center justify-between p-3 bg-white rounded-2xl border border-slate-200/80 hover:border-slate-300 hover:shadow-sm cursor-grab active:cursor-grabbing select-none transition group">
            
            <div class="flex items-center gap-2.5 pl-1">
                <svg class="w-3.5 h-3.5 text-slate-300 group-hover:text-slate-500 transition" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 8h16M4 16h16"/>
                </svg>
                <span class="text-xs font-bold text-slate-800 pointer-events-none">${unit}</span>
            </div>

            <div class="flex items-center gap-1" onmousedown="event.stopPropagation()">
                <button type="button" onclick="editUnitItem('${unit.replace(/'/g, "\\'")}')" title="แก้ไขชื่อ" class="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition active:scale-90 cursor-pointer">
                    <div class="w-3.5 h-3.5 bg-slate-400 hover:bg-indigo-600 transition" 
                        style="mask: url('icon/pencil.png') no-repeat center / contain; -webkit-mask: url('icon/pencil.png') no-repeat center / contain;">
                    </div>
                </button>
                <button type="button" onclick="deleteUnitItem('${unit.replace(/'/g, "\\'")}')" title="ลบหน่วยนับ" class="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition active:scale-90 cursor-pointer">
                    <div class="w-3.5 h-3.5 bg-slate-400 hover:bg-rose-600 transition" 
                        style="mask: url('icon/delete.png') no-repeat center / contain; -webkit-mask: url('icon/delete.png') no-repeat center / contain;">
                    </div>
                </button>
            </div>
        </div>
    `).join('');
}

function editUnitItem(unitName) {
    document.getElementById('editing-unit-old').value = unitName;
    document.getElementById('unit-label-input').value = unitName;
    document.getElementById('unit-form-label').innerText = 'แก้ไขชื่อหน่วยนับ';
    document.getElementById('btn-save-unit').innerText = 'บันทึก';
    document.getElementById('btn-save-unit').className = 'px-4 py-3 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-bold rounded-2xl text-xs transition shadow-sm shadow-emerald-600/25 whitespace-nowrap cursor-pointer';
    document.getElementById('btn-cancel-edit-unit').classList.remove('hidden');
    document.getElementById('unit-label-input').focus();
}

function cancelUnitEdit() {
    document.getElementById('editing-unit-old').value = '';
    document.getElementById('unit-label-input').value = '';
    document.getElementById('unit-form-label').innerText = 'เพิ่มหน่วยนับใหม่';
    document.getElementById('btn-save-unit').innerText = 'เพิ่ม';
    document.getElementById('btn-save-unit').className = 'px-4 py-3 bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white font-bold rounded-2xl text-xs transition shadow-sm shadow-indigo-600/25 whitespace-nowrap cursor-pointer';
    document.getElementById('btn-cancel-edit-unit').classList.add('hidden');
}

async function handleSaveUnit(event) {
    event.preventDefault();
    const oldName = document.getElementById('editing-unit-old').value.trim();
    const input = document.getElementById('unit-label-input');
    const val = input.value.trim();
    if (!val) return;

    let units = getStoredUnits();

    if (oldName) {
        if (units.includes(val) && val !== oldName) {
            await showCustomModal('warning', 'มีหน่วยนับนี้แล้ว', `หน่วยนับ "${val}" มีอยู่ในระบบแล้ว`);
            return;
        }
        units = units.map(u => u === oldName ? val : u);
    } else {
        if (units.includes(val)) {
            await showCustomModal('warning', 'มีหน่วยนับนี้แล้ว', `หน่วยนับ "${val}" มีอยู่ในระบบแล้ว`);
            return;
        }
        units.push(val);
    }

    saveUnitsToStore(units);
    cancelUnitEdit();
    renderUnitManageList();
}

async function deleteUnitItem(unitName) {
    const isConfirmed = await showCustomModal(
        'confirm',
        'ยืนยันลบหน่วยนับ?',
        `คุณต้องการลบหน่วยนับ <span class="font-bold text-slate-800">"${unitName}"</span> ออกใช่หรือไม่?`
    );

    if (isConfirmed) {
        let units = getStoredUnits();
        units = units.filter(u => u !== unitName);
        saveUnitsToStore(units);
        cancelUnitEdit();
        renderUnitManageList();
    }
}

// Drag and Drop สำหรับหน่วยนับ
function handleUnitDragStart(e, index) {
    draggedUnitIndex = index;
    e.dataTransfer.effectAllowed = 'move';
    e.currentTarget.classList.add('opacity-40', 'border-dashed', 'border-indigo-400', 'bg-indigo-50/50');
}

function handleUnitDragOver(e) {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
}

function handleUnitDragEnter(e) {
    e.preventDefault();
    const item = e.currentTarget.closest('.unit-drag-item');
    if (item) item.classList.add('border-indigo-500', 'bg-indigo-50/30', 'scale-[1.01]');
}

function handleUnitDragLeave(e) {
    const item = e.currentTarget.closest('.unit-drag-item');
    if (item) item.classList.remove('border-indigo-500', 'bg-indigo-50/30', 'scale-[1.01]');
}

function handleUnitDrop(e, targetIndex) {
    e.preventDefault();
    e.stopPropagation();

    if (draggedUnitIndex === null || draggedUnitIndex === targetIndex) return;

    let units = getStoredUnits();
    const [movedItem] = units.splice(draggedUnitIndex, 1);
    units.splice(targetIndex, 0, movedItem);

    saveUnitsToStore(units);
    renderUnitManageList();
}

function handleUnitDragEnd(e) {
    draggedUnitIndex = null;
    document.querySelectorAll('.unit-drag-item').forEach(el => {
        el.classList.remove('opacity-40', 'border-dashed', 'border-indigo-400', 'bg-indigo-50/50', 'border-indigo-500', 'bg-indigo-50/30', 'scale-[1.01]');
    });
}

// ฟังก์ชันสำหรับอัปเดตรายการหน่วยนับในดรอปดาวน์ฟอร์มสินค้าทั่วระบบ
function refreshUnitDropdown() {
    const menu = document.getElementById('unit-dropdown-menu');
    if (!menu) return;
    const units = getStoredUnits();
    
    menu.innerHTML = `
        <div onclick="selectUnitOption('', '-- เลือกหน่วยนับ --')" class="px-3.5 py-2 hover:bg-indigo-50 text-slate-400 cursor-pointer transition">-- เลือกหน่วยนับ --</div>
        ${units.map(u => `<div onclick="selectUnitOption('${u}')" class="px-3.5 py-2 hover:bg-indigo-50 text-slate-700 font-medium cursor-pointer transition">${u}</div>`).join('')}
    `;
}

// สั่งให้อัปเดตอัตโนมัติเมื่อมีการเปลี่ยนแปลงหน่วยนับ
window.addEventListener('unitsUpdated', () => {
    refreshUnitDropdown();
});

function refreshSearchUnitDropdown() {
    const menu = document.getElementById('search-unit-menu');
    if (!menu) return;
    const units = getStoredUnits();
    
    menu.innerHTML = `
        <div onclick="selectSearchUnit('')" class="px-3.5 py-2 hover:bg-indigo-50 text-slate-800 font-bold cursor-pointer transition">ทุกหน่วยนับ</div>
        ${units.map(u => `<div onclick="selectSearchUnit('${u}')" class="px-3.5 py-2 hover:bg-indigo-50 text-slate-700 font-medium cursor-pointer transition">${u}</div>`).join('')}
    `;
}

// อัปเดตดรอปดาวน์แถบค้นหาอัตโนมัติเมื่อมีการเปลี่ยนแปลงหน่วยนับ
window.addEventListener('unitsUpdated', () => {
    refreshSearchUnitDropdown();
});