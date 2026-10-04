// 🌟 โหลดข้อมูลตะกร้าเดิมที่เคยค้างไว้จาก LocalStorage กลับมาอัตโนมัติ 🌟
let cart = [];
try {
    const savedCart = localStorage.getItem('pos_current_cart');
    if (savedCart) {
        cart = JSON.parse(savedCart);
    }
} catch (e) {
    cart = [];
}

// ฟังก์ชันบันทึกสถานะตะกร้าลง LocalStorage
function saveCartToStorage() {
    try {
        localStorage.setItem('pos_current_cart', JSON.stringify(cart));
    } catch (e) {
        console.error('Failed to save cart to storage', e);
    }
}

function cleanBarcodeString(input) {
    if (!input) return '';
    const thaiToNumMap = {
        'ๅ': '1', '+': '1',
        '/': '2', '๑': '2',
        '-': '3', '๒': '3',
        'ภ': '4', '๓': '4',
        'ถ': '5', '๔': '5',
        'ุ': '6', 'ู': '6',
        'ึ': '7', '฿': '7',
        'ค': '8', '๕': '8',
        'ต': '9', '๖': '9',
        'จ': '0', '๗': '0',
        'ข': '-', '๘': '-',
        'ช': '=', '๙': '='
    };

    let converted = '';
    const str = String(input).trim();
    for (let char of str) {
        converted += thaiToNumMap[char] !== undefined ? thaiToNumMap[char] : char;
    }
    return converted.replace(/[^0-9a-zA-Z_-]/g, '');
}

function addToCart(productId, customQty = 1) {
    if (!productId) return;

    let targetQty = customQty;
    let rawInputId = String(productId).trim();

    if (rawInputId.includes('*')) {
        const parts = rawInputId.split('*');
        const parsedQty = parseInt(parts[0]);
        if (!isNaN(parsedQty) && parsedQty > 0) {
            targetQty = parsedQty;
            rawInputId = parts.slice(1).join('*').trim();
        }
    }

    const cleanInputId = cleanBarcodeString(rawInputId);
    const productsList = (typeof localProductsCache !== 'undefined' && localProductsCache.length > 0) ? localProductsCache : [];
    
    const product = productsList.find(p => {
        const pId = String(p.id).trim();
        return pId === cleanInputId || pId === rawInputId;
    });

    if (!product) {
        showCustomModal('warning', 'ไม่พบสินค้า', `ไม่พบสินค้ารหัส "${cleanInputId || rawInputId}" ในระบบ`);
        return;
    }

    let currentStock = parseInt(product.stock_qty) || 0;
    if (product.parent_id) {
        const parentProd = productsList.find(p => String(p.id).trim() === String(product.parent_id).trim());
        if (parentProd) {
            const parentStock = parseInt(parentProd.stock_qty) || 0;
            const multiplier = parseInt(product.multiplier) || 1;
            currentStock = Math.floor(parentStock / multiplier);
        } else {
            currentStock = 0;
        }
    }

    const targetId = String(product.id).trim();
    const cartItem = cart.find(item => String(item.id).trim() === targetId);

    if (currentStock <= 0) {
        showCustomModal('out_of_stock', 'สินค้าหมด', `สินค้า <b>"${product.name}"</b> หมดสต็อก (คงเหลือ 0 ${product.unit || 'ชิ้น'})`);
        return;
    }

    const newQty = (cartItem ? cartItem.qty : 0) + targetQty;
    if (newQty > currentStock) {
        showCustomModal('warning', 'สต็อกไม่เพียงพอ', `สินค้า <b>"${product.name}"</b> มีสต็อกคงเหลือเพียง ${currentStock} ${product.unit || 'ชิ้น'} (ในตะกร้าต้องการ ${newQty})`);
        return;
    }

    if (cartItem) {
        cartItem.qty += targetQty;
    } else {
        cart.push({
            id: product.id,
            name: product.name,
            cost_price: parseFloat(product.cost_price) || 0,
            price: parseFloat(product.price) || 0,
            unit: product.unit || 'ชิ้น',
            parent_id: product.parent_id || null,
            multiplier: product.multiplier || 1,
            qty: targetQty
        });
    }

    saveCartToStorage(); // 💾 บันทึกตะกร้า
    renderCart();

    setTimeout(() => {
        const scrollBox = document.querySelector('#pane-cart .overflow-y-auto') || document.getElementById('cart-items')?.closest('.overflow-y-auto');
        if (scrollBox) {
            scrollBox.scrollTo({ top: scrollBox.scrollHeight, behavior: 'smooth' });
        }
    }, 50);

    if (typeof refocusBarcode === 'function') refocusBarcode();
}

function updateCartQty(productId, change) {
    const cartItem = cart.find(item => String(item.id).trim() === String(productId).trim());
    if (!cartItem) return;

    if (change > 0) {
        const productsList = (typeof localProductsCache !== 'undefined' && localProductsCache.length > 0) ? localProductsCache : [];
        const product = productsList.find(p => String(p.id).trim() === String(productId).trim());
        if (product) {
            let currentStock = parseInt(product.stock_qty) || 0;
            if (product.parent_id) {
                const parentProd = productsList.find(p => String(p.id).trim() === String(product.parent_id).trim());
                if (parentProd) {
                    const parentStock = parseInt(parentProd.stock_qty) || 0;
                    const multiplier = parseInt(product.multiplier) || 1;
                    currentStock = Math.floor(parentStock / multiplier);
                }
            }
            if (cartItem.qty + change > currentStock) {
                showCustomModal('warning', 'สต็อกไม่เพียงพอ', `สินค้า <b>"${product.name}"</b> มีสต็อกคงเหลือเพียง ${currentStock} ${product.unit || 'ชิ้น'}`);
                return;
            }
        }
    }

    cartItem.qty += change;

    if (cartItem.qty <= 0) {
        removeFromCart(productId);
    } else {
        saveCartToStorage(); // 💾 บันทึกตะกร้า
        renderCart();
    }
}

function removeFromCart(productId) {
    cart = cart.filter(item => String(item.id).trim() !== String(productId).trim());
    saveCartToStorage(); // 💾 บันทึกตะกร้า
    renderCart();
}

async function clearCart() {
    if (cart.length === 0) return;
    
    const confirmed = await showCustomModal('confirm', 'ล้างรายการคิดเงิน?', 'คุณต้องการล้างรายการสินค้าทั้งหมดในตะกร้าใช่หรือไม่?');
    if (confirmed) {
        cart = [];
        saveCartToStorage(); // 💾 ล้างข้อมูลออกจาก LocalStorage
        renderCart();
    }
}

function renderCart() {
    const cartTable = document.getElementById('cart-items');
    const totalPriceEl = document.getElementById('total-price');
    const totalQtyEl = document.getElementById('total-qty');

    if (!cartTable) return;

    const tableEl = cartTable.closest('table');
    const scrollWrapper = cartTable.closest('.overflow-y-auto') || cartTable.parentElement;

    // 🌟 กรณีไม่มีสินค้าในตะกร้า 🌟
    if (cart.length === 0) {
        // 1. บังคับตารางให้สูงเต็มพื้นที่พอดี และปิดแถบเลื่อนไม่ให้โผล่มากวนใจ
        if (tableEl) tableEl.style.setProperty('height', '100%', 'important');
        if (scrollWrapper) scrollWrapper.style.setProperty('overflow-y', 'hidden', 'important');

        cartTable.innerHTML = `
            <tr class="h-full">
                <td colspan="5" class="h-full p-4 border-none text-center align-middle text-slate-400">
                    <div class="flex flex-col items-center justify-center w-full select-none">
                        <div class="w-12 h-12 mb-2.5 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-300">
                            <svg class="w-6 h-6 stroke-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"/>
                            </svg>
                        </div>
                        <p class="text-xs sm:text-sm font-semibold text-slate-400">ยังไม่มีสินค้าในตะกร้า</p>
                        <p class="text-[10px] sm:text-xs text-slate-300 mt-0.5">สแกนหรือเลือกสินค้าฝั่งซ้ายเพื่อเริ่มคิดเงิน</p>
                    </div>
                </td>
            </tr>
        `;

        if (totalPriceEl) totalPriceEl.innerText = '฿0.00';
        if (totalQtyEl) totalQtyEl.innerText = '0 รายการ';
        
        if (typeof updateCartSummary === 'function') updateCartSummary();
        return;
    }

    // 🌟 เมื่อมีสินค้า: คืนค่าเดิมให้ตารางขยายและเลื่อนดูรายการสินค้าได้ตามปกติ 🌟
    if (tableEl) tableEl.style.height = '';
    if (scrollWrapper) scrollWrapper.style.overflowY = 'auto';

    let totalPrice = 0;
    let totalItemsCount = 0;

    const htmlRows = cart.map((item, index) => {
        const itemTotal = item.price * item.qty;
        totalPrice += itemTotal;
        totalItemsCount += item.qty;
        const unitText = item.unit || 'ชิ้น';

        const formattedItemTotal = Number(itemTotal).toLocaleString('th-TH', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        });

        return `
            <tr id="cart-row-${item.id}" class="hover:bg-slate-50/70 transition border-b border-slate-100/80 last:border-b-0">
                <td class="py-3 px-3.5 text-center text-xs font-bold text-slate-500 w-10 align-middle ">
                    ${index + 1}
                </td>
                
                <!-- 🌟 แสดงชื่อเต็มทั้งหมด จะยาวกี่บรรทัดก็แสดงครบ ไม่ตัดคำ และบาร์โค้ดอยู่ด้านล่างไม่ทับกัน 🌟 -->
                <td class="py-2.5 px-3.5 align-middle select-text min-w-0">
                    <p class="font-bold text-slate-800 text-xs sm:text-sm leading-snug break-words whitespace-normal select-text cursor-text mb-1" title="${item.name}">${item.name}</p>
                    <p class="text-[10px] text-slate-400 font-medium leading-none select-text cursor-text">${item.id}</p>
                </td>
                
                <td class="py-3 px-3.5 text-center align-middle whitespace-nowrap ">
                    <div class="inline-flex items-center gap-1.5 bg-slate-100/80 p-1 rounded-xl border border-slate-200/70">
                        <button type="button" 
                                onclick="updateCartQty('${item.id}', -1)" 
                                title="ลด"
                                class="w-6 h-6 rounded-lg bg-white hover:bg-rose-50 text-slate-600 hover:text-rose-600 flex items-center justify-center transition active:scale-90 cursor-pointer shadow-2xs font-bold text-xs">
                            -
                        </button>

                        <span class="text-xs font-bold text-slate-800 px-1 min-w-[2.5rem] text-center select-text cursor-text">${item.qty} / ${unitText}</span>

                        <button type="button" 
                                onclick="updateCartQty('${item.id}', 1)" 
                                title="เพิ่ม"
                                class="w-6 h-6 rounded-lg bg-white hover:bg-emerald-50 text-slate-600 hover:text-emerald-600 flex items-center justify-center transition active:scale-90 cursor-pointer shadow-2xs font-bold text-xs">
                            +
                        </button>
                    </div>
                </td>
                
                <!-- 🌟 ปลดล็อกราคาให้คัดลอกได้ 🌟 -->
                <td class="py-3 px-3.5 text-right align-middle whitespace-nowrap select-text">
                    <span class="font-black text-slate-900 text-xs sm:text-sm select-text cursor-text">฿${formattedItemTotal}</span>
                </td>
                
                <td class="py-3 px-2 text-center align-middle w-8 select-none">
                    <button onclick="removeFromCart('${item.id}')" 
                            title="ลบรายการ" 
                            class="group w-7 h-7 flex items-center justify-center rounded-lg hover:bg-rose-50 transition active:scale-90 cursor-pointer mx-auto">
                        <div class="w-4 h-4 bg-slate-400 group-hover:bg-rose-600 transition" 
                            style="mask: url('icon/delete.png') no-repeat center / contain; -webkit-mask: url('icon/delete.png') no-repeat center / contain;">
                        </div>
                    </button>
                </td>
            </tr>
        `;
    }).join('');

    cartTable.innerHTML = htmlRows;

    const formattedTotalPrice = Number(totalPrice).toLocaleString('th-TH', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    });
    if (totalPriceEl) totalPriceEl.innerText = `฿${formattedTotalPrice}`;
    if (totalQtyEl) totalQtyEl.innerText = `${cart.length} รายการ (${totalItemsCount} ชิ้น/หน่วยรวม)`;

    if (typeof updateCartSummary === 'function') updateCartSummary();
}

// =========================================================================
// ระบบพักบิล / สลับออเดอร์ (Hold & Recall Bill) - ไร้อิโมจิ
// =========================================================================

function getHeldBills() {
    try {
        const stored = localStorage.getItem('pos_held_bills');
        return stored ? JSON.parse(stored) : [];
    } catch (e) {
        return [];
    }
}

function saveHeldBills(bills) {
    try {
        localStorage.setItem('pos_held_bills', JSON.stringify(bills));
    } catch (e) {
        console.error('Failed to save held bills', e);
    }
    updateHeldBillsBadge();
}

function updateHeldBillsBadge() {
    const badge = document.getElementById('held-bills-count');
    if (!badge) return;
    const bills = getHeldBills();
    if (bills.length > 0) {
        badge.textContent = bills.length;
        badge.classList.remove('hidden');
        badge.classList.add('inline-flex');
    } else {
        badge.classList.add('hidden');
        badge.classList.remove('inline-flex');
    }
}

function holdCurrentBill() {
    if (!cart || cart.length === 0) {
        if (typeof showCustomModal === 'function') {
            showCustomModal('warning', 'ไม่มีรายการสินค้า', 'กรุณาเพิ่มสินค้าลงตะกร้าก่อนทำรายการพักบิล');
        }
        return;
    }

    const bills = getHeldBills();
    const now = new Date();
    const timeStr = now.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' });
    const dateStr = now.toLocaleDateString('th-TH', { day: '2-digit', month: 'short' });

    let totalPrice = cart.reduce((sum, item) => sum + (item.price * item.qty), 0);
    let totalItems = cart.reduce((sum, item) => sum + item.qty, 0);

    const newBill = {
        id: 'HOLD_' + Date.now(),
        heldAt: `${dateStr} ${timeStr}`,
        items: [...cart],
        totalPrice: totalPrice,
        totalItems: totalItems
    };

    bills.unshift(newBill);
    saveHeldBills(bills);

    cart = [];
    saveCartToStorage();
    renderCart();

    if (typeof showCustomModal === 'function') {
        showCustomModal('success', 'พักบิลเรียบร้อย', `พักรายการสินค้า ${totalItems} ชิ้น (฿${totalPrice.toLocaleString()}) เรียบร้อยแล้ว`);
    }
}

function openHeldBillsModal() {
    const modal = document.getElementById('held-bills-modal');
    const container = document.getElementById('held-bills-list');
    if (!modal || !container) return;

    const bills = getHeldBills();

    if (bills.length === 0) {
        container.innerHTML = `
            <div class="py-12 text-center text-slate-400 select-none">
                <div class="w-12 h-12 mx-auto mb-2 rounded-2xl bg-white shadow-2xs border border-slate-200/60 flex items-center justify-center text-slate-300">
                    <svg class="w-6 h-6 stroke-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/>
                    </svg>
                </div>
                <p class="text-xs font-bold text-slate-600">ไม่มีบิลที่พักไว้</p>
                <p class="text-[10px] text-slate-400 mt-0.5">กดปุ่ม "พักบิล" ในตะกร้าเพื่อเก็บออเดอร์ชั่วคราว</p>
            </div>
        `;
    } else {
        container.innerHTML = bills.map((bill, index) => {
            const previewText = bill.items.map(i => `${i.name} (x${i.qty})`).join(', ');
            return `
                <div class="bg-white rounded-2xl p-3 border border-slate-200/70 shadow-2xs hover:shadow-sm transition flex items-center justify-between gap-2.5">
                    <!-- รายละเอียดบิล -->
                    <div class="flex-1 min-w-0 select-text">
                        <div class="flex items-center gap-1.5">
                            <span class="px-1.5 py-0.5 rounded-md bg-slate-100 text-slate-700 text-[10px] font-bold select-text cursor-text">
                                #${bills.length - index}
                            </span>
                            <span class="text-[11px] text-slate-400 font-medium select-text cursor-text">${bill.heldAt}</span>
                            <span class="text-xs font-black text-slate-900 ml-auto mr-1 select-text cursor-text">฿${bill.totalPrice.toLocaleString('th-TH', { minimumFractionDigits: 2 })}</span>
                        </div>
                        <p class="text-[11px] text-slate-600 truncate mt-1 select-text cursor-text font-medium" title="${previewText}">
                            ${previewText}
                        </p>
                        <p class="text-[10px] text-slate-400 font-medium mt-0.5 select-text cursor-text">รวม ${bill.items.length} รายการ (${bill.totalItems} ชิ้น)</p>
                    </div>

                    <!-- ปุ่มควบคุม (ดึงบิล + ไอคอนถังขยะเดิมของระบบ) -->
                    <div class="flex items-center gap-1.5 flex-shrink-0 select-none">
                        <button type="button" onclick="recallBill('${bill.id}')" 
                                class="h-8 px-3.5 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white text-xs font-bold rounded-xl shadow-2xs transition cursor-pointer flex items-center gap-1.5">
                            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"/>
                            </svg>
                            <span>ดึงบิล</span>
                        </button>
                        <button type="button" onclick="deleteHeldBill('${bill.id}')" 
                                class="group w-8 h-8 rounded-xl bg-slate-100 hover:bg-rose-50 transition active:scale-90 cursor-pointer flex items-center justify-center shadow-2xs" title="ลบบิลนี้">
                            <div class="w-4 h-4 bg-slate-400 group-hover:bg-rose-600 transition" 
                                 style="mask: url('icon/delete.png') no-repeat center / contain; -webkit-mask: url('icon/delete.png') no-repeat center / contain;">
                            </div>
                        </button>
                    </div>
                </div>
            `;
        }).join('');
    }

    modal.classList.remove('hidden');
}

function closeHeldBillsModal() {
    const modal = document.getElementById('held-bills-modal');
    if (modal) modal.classList.add('hidden');
}

function recallBill(billId) {
    let bills = getHeldBills();
    const targetIndex = bills.findIndex(b => b.id === billId);
    if (targetIndex === -1) return;

    const targetBill = bills[targetIndex];

    if (cart && cart.length > 0) {
        const now = new Date();
        const currentBillToHold = {
            id: 'HOLD_' + Date.now(),
            heldAt: now.toLocaleDateString('th-TH', { day: '2-digit', month: 'short' }) + ' ' + now.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' }),
            items: [...cart],
            totalPrice: cart.reduce((sum, item) => sum + (item.price * item.qty), 0),
            totalItems: cart.reduce((sum, item) => sum + item.qty, 0)
        };
        bills.splice(targetIndex, 1, currentBillToHold);
    } else {
        bills.splice(targetIndex, 1);
    }

    saveHeldBills(bills);

    cart = [...targetBill.items];
    saveCartToStorage();
    renderCart();

    closeHeldBillsModal();
}

function deleteHeldBill(billId) {
    let bills = getHeldBills();
    bills = bills.filter(b => b.id !== billId);
    saveHeldBills(bills);
    openHeldBillsModal();
}

document.addEventListener('DOMContentLoaded', () => {
    updateHeldBillsBadge();
});