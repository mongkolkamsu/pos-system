// ⭐️ 1. วางไว้บนสุดตรงนี้
const PROMPTPAY_ID = '0863632641'; // เปลี่ยนเป็นเบอร์พร้อมเพย์ของร้าน
let qrCountdownTimer = null;
const QR_EXPIRE_SECONDS = 120; // กำหนดเวลานับถอยหลัง 2 นาที (120 วินาที)

function generatePromptPayPayload(target, amount) {
    target = String(target || '').replace(/[^0-9]/g, '');
    const targetType = target.length === 13 ? '02' : '01';
    let formattedTarget = target;
    if (targetType === '01') {
        formattedTarget = '0066' + target.slice(1);
    }
    
    const tag29 = `0016A000000677010111${targetType}${String(formattedTarget.length).padStart(2, '0')}${formattedTarget}`;
    const amountStr = Number(amount).toFixed(2);
    const tag54 = `54${String(amountStr.length).padStart(2, '0')}${amountStr}`;
    const raw = `00020101021229${String(tag29.length).padStart(2, '0')}${tag29}5303764${tag54}5802TH6304`;
    
    let crc = 0xFFFF;
    for (let i = 0; i < raw.length; i++) {
        let x = ((crc >> 8) ^ raw.charCodeAt(i)) & 0xFF;
        x ^= x >> 4;
        crc = ((crc << 8) ^ (x << 12) ^ (x << 5) ^ x) & 0xFFFF;
    }
    return raw + crc.toString(16).toUpperCase().padStart(4, '0');
}

function loadPaymentModalHTML() {
    const container = document.getElementById('payment-modal-container');
    if (!container) return;

    container.innerHTML = `
    <div id="payment-modal" class="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 hidden transition-opacity duration-200">
        <div class="bg-white w-full max-w-lg p-6 sm:p-8 rounded-[32px] shadow-2xl relative space-y-5 border border-slate-100 animate-in fade-in zoom-in-95 max-h-[92vh] overflow-y-auto">
            
            <!-- ส่วนหัว Modal สไตล์ iOS Header -->
            <div class="flex items-center justify-between pb-1">
                <div class="flex items-center gap-3">
                    <div id="modal-header-icon-box" class="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center shadow-2xs transition-colors">
                        <svg id="modal-header-icon" class="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z"></path>
                        </svg>
                    </div>
                    <div>
                        <h3 class="text-lg font-bold text-slate-900 tracking-tight leading-none">ชำระเงิน</h3>
                        <p class="text-[11px] text-slate-400 font-medium mt-1">เลือกช่องทางและตรวจสอบยอดชำระ</p>
                    </div>
                </div>
                <button type="button" onclick="closePaymentModal()" title="ปิดหน้าต่าง" class="text-slate-400 hover:text-slate-800 hover:bg-slate-100 w-8 h-8 flex items-center justify-center rounded-full transition cursor-pointer">
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                </button>
            </div>

            <!-- กล่องแสดงยอดรวมสุทธิสไตล์ iOS Widget -->
            <div class="bg-slate-50/80 border border-slate-200/60 rounded-3xl p-5 text-center shadow-inner">
                <p class="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">ยอดรวมสุทธิทั้งสิ้น</p>
                <p id="pay-modal-total" class="text-4xl sm:text-5xl font-black text-slate-900 tracking-tight">฿0</p>
            </div>

            <!-- 1. ปุ่มแคปซูลเลือกช่องทางชำระเงิน (Segmented iOS Style) -->
            <div class="grid grid-cols-4 gap-1.5 bg-slate-100/80 p-1.5 rounded-2xl border border-slate-200/60">
                <button type="button" id="tab-cash" onclick="setPaymentMethod('cash')" 
                        class="py-2.5 px-1 rounded-xl transition-all flex flex-col sm:flex-row items-center justify-center gap-1.5 text-xs font-bold cursor-pointer active:scale-95 text-slate-600 whitespace-nowrap">
                    <svg class="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z"/>
                    </svg>
                    <span>เงินสด</span>
                </button>

                <button type="button" id="tab-transfer" onclick="setPaymentMethod('transfer')" 
                        class="py-2.5 px-1 rounded-xl transition-all flex flex-col sm:flex-row items-center justify-center gap-1.5 text-xs font-bold cursor-pointer active:scale-95 text-slate-600 whitespace-nowrap">
                    <svg class="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z"/>
                    </svg>
                    <span>สแกน/โอน</span>
                </button>

                <button type="button" id="tab-gov" onclick="setPaymentMethod('gov')" 
                        class="py-2.5 px-1 rounded-xl transition-all flex flex-col sm:flex-row items-center justify-center gap-1.5 text-xs font-bold cursor-pointer active:scale-95 text-slate-600 whitespace-nowrap">
                    <svg class="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"/>
                    </svg>
                    <span>โครงการรัฐ</span>
                </button>

                <button type="button" id="tab-debt" onclick="setPaymentMethod('debt')" 
                        class="py-2.5 px-1 rounded-xl transition-all flex flex-col sm:flex-row items-center justify-center gap-1.5 text-xs font-bold cursor-pointer active:scale-95 text-slate-600 whitespace-nowrap">
                    <svg class="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"/>
                    </svg>
                    <span>ติดเงิน</span>
                </button>
            </div>

            <!-- 2. ส่วนคำนวณเงินสด -->
            <div id="cash-payment-section" class="space-y-4">
                <div>
                    <label class="block text-xs font-bold text-slate-600 mb-1.5">จำนวนเงินที่รับมา (บาท)</label>
                    <input type="number" id="pay-received-input" step="any" placeholder="0.00" oninput="calculateChange()" 
                            onkeydown="if(event.key==='Enter') { event.preventDefault(); confirmPayment(); }" 
                            class="w-full text-center text-3xl font-black p-4 bg-slate-50 border-2 border-slate-200 focus:border-emerald-500 rounded-2xl text-slate-900 focus:outline-none transition shadow-inner">
                </div>

                <div class="grid grid-cols-3 sm:grid-cols-6 gap-2">
                    <button type="button" onclick="setExactAmount()" class="py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition cursor-pointer active:scale-95 shadow-2xs">พอดี</button>
                    <button type="button" onclick="addReceivedCash(20)" class="py-2.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-bold rounded-xl text-xs transition cursor-pointer active:scale-95 shadow-2xs">+20</button>
                    <button type="button" onclick="addReceivedCash(50)" class="py-2.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-bold rounded-xl text-xs transition cursor-pointer active:scale-95 shadow-2xs">+50</button>
                    <button type="button" onclick="addReceivedCash(100)" class="py-2.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-bold rounded-xl text-xs transition cursor-pointer active:scale-95 shadow-2xs">+100</button>
                    <button type="button" onclick="addReceivedCash(500)" class="py-2.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-bold rounded-xl text-xs transition cursor-pointer active:scale-95 shadow-2xs">+500</button>
                    <button type="button" onclick="addReceivedCash(1000)" class="py-2.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-bold rounded-xl text-xs transition cursor-pointer active:scale-95 shadow-2xs">+1,000</button>
                </div>

                <div class="flex items-center justify-between px-4 py-3.5 bg-slate-50 border border-slate-200/60 rounded-2xl">
                    <span class="text-xs font-bold text-slate-500">เงินทอนสุทธิ</span>
                    <span id="pay-change-amount" class="text-xl font-black text-emerald-600">฿0.00</span>
                </div>
            </div>

            <!-- 3. ส่วนข้อมูลสแกนโอน / โครงการรัฐ -->
            <div id="digital-payment-section" class="hidden p-5 bg-slate-50 rounded-2xl border border-slate-200/80 text-center space-y-3">
                <div class="flex flex-col items-center justify-center">
                    <div class="relative bg-white p-3 rounded-2xl border border-slate-200 shadow-sm inline-block overflow-hidden">
                        <!-- รูป QR Code -->
                        <img id="pay-qr-image" src="" alt="PromptPay QR" class="w-44 h-44 mx-auto rounded-xl object-contain hidden transition-all duration-300" />
                        
                        <!-- หน้ากากแจ้งเตือนหมดอายุเมื่อครบ 2 นาที -->
                        <div id="qr-expired-overlay" class="hidden absolute inset-0 bg-slate-900/80 backdrop-blur-xs flex flex-col items-center justify-center p-3 text-white transition-opacity">
                            <svg class="w-8 h-8 text-rose-400 mb-1 animate-bounce" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                            </svg>
                            <p class="text-xs font-bold mb-2">QR Code หมดอายุ</p>
                            <button type="button" onclick="refreshQRCode()" class="px-3 py-1.5 bg-emerald-500 hover:bg-emerald-600 active:scale-95 text-white text-xs font-bold rounded-xl shadow cursor-pointer transition">
                                สร้าง QR ใหม่
                            </button>
                        </div>

                        <!-- ไอคอนสำรองกรณีโครงการรัฐ -->
                        <div id="digital-icon-badge" class="w-14 h-14 mx-auto rounded-2xl flex items-center justify-center"></div>
                    </div>
                </div>
                <div>
                    <p id="digital-method-title" class="text-sm font-bold text-slate-900"></p>
                    <p class="text-xs text-slate-500 mt-0.5">ยอดชำระ <span id="digital-exact-amount" class="text-sm font-bold">฿0.00</p>
                    <!-- ข้อความแสดงเวลานับถอยหลัง -->
                    <p id="qr-timer-text" class="text-[11px] font-semibold text-amber-600 mt-1"></p>
                </div>
            </div>

            <!-- 4. ส่วนข้อมูลติดเงิน / ค้างชำระ -->
            <div id="debt-payment-section" class="hidden space-y-3.5">
                <div class="p-3.5 bg-amber-50 rounded-2xl border border-amber-200/80 text-center space-y-0.5">
                    <p class="text-xs font-bold text-amber-800">บันทึกรายการติดเงินไว้ก่อน</p>
                    <p class="text-[11px] text-amber-600">ยอดหนี้รวม <span id="debt-exact-amount" class="font-bold">฿0.00</span> จะถูกบันทึกเข้าบัญชีลูกหนี้</p>
                </div>

                <div>
                    <label class="block text-xs font-bold text-slate-700 mb-1">ชื่อลูกค้า / เบอร์โทร <span class="text-rose-500">*</span></label>
                    <div class="relative">
                        <input type="text" id="pay-customer-name" placeholder="ค้นหาชื่อ หรือพิมพ์ชื่อใหม่..." autocomplete="off"
                               oninput="handleDebtorNameInput(this.value)"
                               class="w-full p-3.5 bg-slate-50 border-2 border-slate-200 focus:border-amber-400 rounded-2xl text-sm font-bold text-slate-900 focus:bg-white focus:outline-none transition shadow-inner">
                        
                        <div id="debtor-suggestions-menu" class="hidden absolute left-0 right-0 mt-1.5 bg-white border border-slate-200 rounded-2xl shadow-xl z-30 overflow-hidden py-1 text-xs max-h-40 overflow-y-auto">
                            <div id="debtor-suggestions-list"></div>
                        </div>
                    </div>
                </div>

                <div>
                    <label class="block text-xs font-bold text-slate-700 mb-1">หมายเหตุ / เหตุผลที่ติดเงิน <span class="text-slate-400 font-normal">(ถ้ามี)</span></label>
                    <input type="text" id="pay-debt-note" placeholder="เช่น ลืมกระเป๋าเงิน, จ่ายสิ้นเดือน" autocomplete="off"
                           class="w-full p-3 bg-slate-50 border border-slate-200 focus:border-amber-400 rounded-2xl text-xs font-medium text-slate-900 focus:bg-white focus:outline-none transition shadow-inner">
                </div>
            </div>

            <!-- ปุ่มยืนยันการชำระเงิน -->
            <button type="button" id="btn-confirm-payment" onclick="confirmPayment()" 
                    class="w-full py-4 bg-emerald-600 hover:bg-emerald-700 active:scale-98 text-white rounded-2xl text-base font-bold shadow-lg shadow-emerald-600/25 transition-all duration-150 cursor-pointer">
                ยืนยันการชำระเงิน
            </button>
        </div>
    </div>
    `;
}

function openPaymentModal() {
    if (!cart || cart.length === 0) {
        showCustomModal('warning', 'ไม่มีสินค้าในตะกร้า', 'กรุณาเลือกสินค้าก่อนทำรายการชำระเงิน');
        return;
    }

    currentTotalBill = Math.round(cart.reduce((sum, item) => sum + (item.price * item.qty), 0) * 100) / 100;
    const modal = document.getElementById('payment-modal');
    const totalEl = document.getElementById('pay-modal-total');

    if (totalEl) totalEl.innerText = `฿${currentTotalBill.toLocaleString('th-TH', { minimumFractionDigits: 2 })}`;
    
    setPaymentMethod('cash');
    if (modal) modal.classList.remove('hidden');
    
    setTimeout(() => {
        const input = document.getElementById('pay-received-input');
        if (input) {
            input.value = currentTotalBill;
            calculateChange();
            input.focus();
            input.select();
        }
    }, 50);
}

function closePaymentModal() {
    stopPaymentListener();
    stopQRCountdown(); // ⭐️ หยุดนับเวลาเมื่อปิด Modal
    const modal = document.getElementById('payment-modal');
    if (modal) modal.classList.add('hidden');
    const menu = document.getElementById('debtor-suggestions-menu');
    if (menu) menu.classList.add('hidden');
}

function setPaymentMethod(method) {
    currentPaymentMethod = method;

    stopPaymentListener();
    stopQRCountdown(); // ⭐️ รีเซ็ตตัวนับเวลาก่อนเสมอ

    const tabCash = document.getElementById('tab-cash');
    const tabTransfer = document.getElementById('tab-transfer');
    const tabGov = document.getElementById('tab-gov');
    const tabDebt = document.getElementById('tab-debt');
    const cashSection = document.getElementById('cash-payment-section');
    const digitalSection = document.getElementById('digital-payment-section');
    const debtSection = document.getElementById('debt-payment-section');

    const input = document.getElementById('pay-received-input');
    const digitalAmount = document.getElementById('digital-exact-amount');
    const debtAmount = document.getElementById('debt-exact-amount');
    const digitalTitle = document.getElementById('digital-method-title');
    const digitalBadge = document.getElementById('digital-icon-badge');
    const btnConfirm = document.getElementById('btn-confirm-payment');
    const headerIcon = document.getElementById('modal-header-icon');
    const headerIconBox = document.getElementById('modal-header-icon-box');

    const inactiveClass = 'py-2.5 px-1 rounded-xl transition-all flex flex-col sm:flex-row items-center justify-center gap-1.5 text-xs font-bold cursor-pointer active:scale-95 text-slate-600 hover:text-slate-900 whitespace-nowrap';
    [tabCash, tabTransfer, tabGov, tabDebt].forEach(tab => {
        if (tab) tab.className = inactiveClass;
    });

    if (method === 'cash') {
        tabCash.className = 'py-2.5 px-1 rounded-xl transition-all flex flex-col sm:flex-row items-center justify-center gap-1.5 text-xs font-bold cursor-pointer active:scale-95 bg-white text-emerald-700 shadow-sm whitespace-nowrap';
        if (btnConfirm) {
            btnConfirm.innerText = 'ยืนยันการชำระเงิน';
            btnConfirm.className = 'w-full py-4 bg-emerald-600 hover:bg-emerald-700 active:scale-98 text-white rounded-2xl text-base font-bold shadow-lg shadow-emerald-600/25 transition-all cursor-pointer';
        }
        if (headerIconBox) headerIconBox.className = 'w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center shadow-2xs transition-colors';
        if (headerIcon) headerIcon.innerHTML = `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z"/>`;

        cashSection.classList.remove('hidden');
        digitalSection.classList.add('hidden');
        debtSection.classList.add('hidden');
        if (input) {
            input.value = currentTotalBill;
            calculateChange();
            input.focus();
            input.select();
        }
    } else if (method === 'debt') {
        tabDebt.className = 'py-2.5 px-1 rounded-xl transition-all flex flex-col sm:flex-row items-center justify-center gap-1.5 text-xs font-bold cursor-pointer active:scale-95 bg-white text-amber-700 shadow-sm whitespace-nowrap';
        if (btnConfirm) {
            btnConfirm.innerText = 'บันทึกยอดติดเงิน';
            btnConfirm.className = 'w-full py-4 bg-amber-500 hover:bg-amber-600 active:scale-98 text-white rounded-2xl text-base font-bold shadow-lg shadow-amber-500/25 transition-all cursor-pointer';
        }
        if (headerIconBox) headerIconBox.className = 'w-10 h-10 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center shadow-2xs transition-colors';
        if (headerIcon) headerIcon.innerHTML = `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"/>`;

        cashSection.classList.add('hidden');
        digitalSection.classList.add('hidden');
        debtSection.classList.remove('hidden');

        if (debtAmount) debtAmount.innerText = `฿${currentTotalBill.toLocaleString('th-TH', { minimumFractionDigits: 2 })}`;
        loadDebtorsCache();

        const custInput = document.getElementById('pay-customer-name');
        const debtNoteInput = document.getElementById('pay-debt-note');
        if (custInput) custInput.value = '';
        if (debtNoteInput) debtNoteInput.value = '';

        const menu = document.getElementById('debtor-suggestions-menu');
        if (menu) menu.classList.add('hidden');

        setTimeout(() => custInput?.focus(), 50);
    } else {
        cashSection.classList.add('hidden');
        digitalSection.classList.remove('hidden');
        debtSection.classList.add('hidden');

        if (digitalAmount) {
            digitalAmount.innerText = `฿${currentTotalBill.toLocaleString('th-TH', { minimumFractionDigits: 2 })}`;
        }

        if (method === 'transfer') {
            startPaymentListener(currentTotalBill);
            startQRCountdown(); // ⭐️ เริ่มนับถอยหลัง 2 นาที

            tabTransfer.className = 'py-2.5 px-1 rounded-xl transition-all flex flex-col sm:flex-row items-center justify-center gap-1.5 text-xs font-bold cursor-pointer active:scale-95 bg-white text-indigo-700 shadow-sm whitespace-nowrap';
            if (btnConfirm) {
                btnConfirm.innerText = 'ยืนยันการชำระเงิน';
                btnConfirm.className = 'w-full py-4 bg-indigo-600 hover:bg-indigo-700 active:scale-98 text-white rounded-2xl text-base font-bold shadow-lg shadow-indigo-600/25 transition-all cursor-pointer';
            }
            if (headerIconBox) headerIconBox.className = 'w-10 h-10 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center shadow-2xs transition-colors';
            if (headerIcon) headerIcon.innerHTML = `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z"/>`;
            
            // สั่งสร้าง PromptPay QR Code พร้อมล็อกยอดเงิน
            const qrImg = document.getElementById('pay-qr-image');
            if (qrImg && PROMPTPAY_ID) {
                const payload = generatePromptPayPayload(PROMPTPAY_ID, currentTotalBill);
                qrImg.src = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(payload)}`;
                qrImg.classList.remove('hidden');
                if (digitalBadge) digitalBadge.classList.add('hidden');
            }

            digitalTitle.innerText = 'สแกน QR Code พร้อมเพย์';
            if (digitalAmount) digitalAmount.className = 'font-bold text-indigo-600';

        } else if (method === 'gov') {
            const qrImg = document.getElementById('pay-qr-image');
            if (qrImg) qrImg.classList.add('hidden');
            if (digitalBadge) digitalBadge.classList.remove('hidden');

            tabGov.className = 'py-2.5 px-1 rounded-xl transition-all flex flex-col sm:flex-row items-center justify-center gap-1.5 text-xs font-bold cursor-pointer active:scale-95 bg-white text-sky-700 shadow-sm whitespace-nowrap';
            if (btnConfirm) {
                btnConfirm.innerText = 'ยืนยันการชำระเงิน';
                btnConfirm.className = 'w-full py-4 bg-sky-500 hover:bg-sky-600 active:scale-98 text-white rounded-2xl text-base font-bold shadow-lg shadow-sky-500/25 transition-all cursor-pointer';
            }
            if (headerIconBox) headerIconBox.className = 'w-10 h-10 rounded-2xl bg-sky-50 text-sky-500 flex items-center justify-center shadow-2xs transition-colors';
            if (headerIcon) headerIcon.innerHTML = `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"/>`;
            
            digitalBadge.className = 'w-14 h-14 mx-auto rounded-2xl flex items-center justify-center bg-sky-100 text-sky-500 shadow-2xs';
            digitalBadge.innerHTML = `
                <svg class="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"/>
                </svg>
            `;
            digitalTitle.innerText = 'โครงการรัฐ (เป๋าตัง / บัตรสวัสดิการแห่งรัฐ)';
            if (digitalAmount) digitalAmount.className = 'font-bold text-sky-500';
        }
    }
}

// ฟังก์ชันเริ่มนับเวลาถอยหลัง 2 นาที
function startQRCountdown() {
    stopQRCountdown();
    let timeLeft = QR_EXPIRE_SECONDS;
    const timerText = document.getElementById('qr-timer-text');
    const expiredOverlay = document.getElementById('qr-expired-overlay');
    const qrImg = document.getElementById('pay-qr-image');

    if (expiredOverlay) expiredOverlay.classList.add('hidden');
    if (qrImg) qrImg.classList.remove('blur-xs', 'opacity-40');

    const updateDisplay = () => {
        const minutes = Math.floor(timeLeft / 60);
        const seconds = timeLeft % 60;
        if (timerText) {
            timerText.innerText = `⏳ QR Code จะหมดอายุใน ${minutes}:${String(seconds).padStart(2, '0')} นาที`;
        }
    };

    updateDisplay();

    qrCountdownTimer = setInterval(() => {
        timeLeft--;
        updateDisplay();

        if (timeLeft <= 0) {
            stopQRCountdown();
            stopPaymentListener(); // หยุดดักรอรับเงินจาก Server

            if (expiredOverlay) expiredOverlay.classList.remove('hidden');
            if (qrImg) qrImg.classList.add('blur-xs', 'opacity-40');
            if (timerText) timerText.innerText = '❌ QR Code หมดอายุแล้ว กรุณาสร้างใหม่';
        }
    }, 1000);
}

// ฟังก์ชันหยุดนับเวลา
function stopQRCountdown() {
    if (qrCountdownTimer) {
        clearInterval(qrCountdownTimer);
        qrCountdownTimer = null;
    }
}

// ฟังก์ชันกดสร้าง QR Code ใหม่
function refreshQRCode() {
    if (currentPaymentMethod === 'transfer') {
        const qrImg = document.getElementById('pay-qr-image');
        if (qrImg && PROMPTPAY_ID) {
            const payload = generatePromptPayPayload(PROMPTPAY_ID, currentTotalBill);
            qrImg.src = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(payload)}&t=${Date.now()}`;
        }
        startPaymentListener(currentTotalBill);
        startQRCountdown();
    }
}

function setExactAmount() {
    const input = document.getElementById('pay-received-input');
    if (input) {
        input.value = currentTotalBill;
        calculateChange();
        input.focus();
    }
}

function addReceivedCash(amount) {
    const input = document.getElementById('pay-received-input');
    if (input) {
        const currentVal = parseFloat(input.value) || 0;
        input.value = (currentVal + amount);
        calculateChange();
        input.focus();
    }
}

function calculateChange() {
    const input = document.getElementById('pay-received-input');
    const changeEl = document.getElementById('pay-change-amount');
    if (!input || !changeEl) return;

    const received = parseFloat(input.value) || 0;
    const change = Math.round((received - currentTotalBill) * 100) / 100;

    if (change < 0) {
        changeEl.innerText = 'ยอดเงินไม่พอ';
        changeEl.className = 'text-base font-bold text-rose-500';
    } else {
        changeEl.innerText = `฿${change.toLocaleString('th-TH', { minimumFractionDigits: 2 })}`;
        changeEl.className = 'text-xl font-black text-emerald-600';
    }
}

async function confirmPayment() {
    const input = document.getElementById('pay-received-input');
    const received = parseFloat(input?.value) || 0;
    const customerNameInput = document.getElementById('pay-customer-name');
    const customerName = customerNameInput ? customerNameInput.value.trim() : '';
    const debtNoteInput = document.getElementById('pay-debt-note');
    const debtNote = debtNoteInput ? debtNoteInput.value.trim() : '';

    if (currentPaymentMethod === 'cash' && (Math.round((received - currentTotalBill) * 100) / 100) < 0) {
        await showCustomModal('warning', 'เงินไม่ครบ', 'จำนวนเงินที่รับมาน้อยกว่ายอดรวมสุทธิ');
        return;
    }

    if (currentPaymentMethod === 'debt' && !customerName) {
        await showCustomModal('warning', 'กรุณาระบุชื่อลูกค้า', 'โปรดระบุชื่อลูกค้าหรือเบอร์โทรสำหรับบันทึกรายการติดเงิน');
        customerNameInput?.focus();
        return;
    }

    const paymentLabels = {
        cash: 'เงินสด',
        transfer: 'สแกน/โอนเงิน',
        gov: 'โครงการรัฐ',
        debt: 'ติดเงิน / ค้างชำระ'
    };

    const saleData = {
        items: cart,
        total: currentTotalBill,
        received: currentPaymentMethod === 'cash' ? received : (currentPaymentMethod === 'debt' ? 0 : currentTotalBill),
        change: currentPaymentMethod === 'cash' ? Math.max(0, Math.round((received - currentTotalBill) * 100) / 100) : 0,
        payment_method: currentPaymentMethod,
        payment_name: paymentLabels[currentPaymentMethod],
        customer_name: customerName,
        debt_note: debtNote
    };

    try {
        const response = await fetch('/api/sales', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(saleData)
        });
        const res = await response.json();

        if (!res.success) {
            await showCustomModal('warning', 'เกิดข้อผิดพลาด', res.message || 'ไม่สามารถบันทึกข้อมูลได้');
            return;
        }

        if (typeof getStoredProducts === 'function') {
            await getStoredProducts();
            if (typeof filterCategory === 'function') {
                filterCategory(currentCategory);
            }
        }
    } catch (err) {
        console.error('Save Sale Error:', err);
    }

    closePaymentModal();

    if (currentPaymentMethod !== 'debt') {
        playKaChingSound(); // เสียงกระดิ่ง กริ๊งงง
        
        // ถ้าอยากให้มีเสียงพูดผู้หญิงแจ้งยอดด้วย (เช่น "เงินเข้าแล้ว 100 บาท") ให้เปิดบรรทัดนี้:
        //playPaymentSuccessVoice(currentTotalBill);
    }

    if (currentPaymentMethod === 'debt') {
        const noteHtml = debtNote ? `<br><span class="text-xs text-slate-500">หมายเหตุ: ${debtNote}</span>` : '';
        await showCustomModal(
            'success', 
            'บันทึกยอดติดเงินสำเร็จ!', 
            `ลูกค้า: <b>${customerName}</b><br>ยอดค้างชำระ: ฿${currentTotalBill.toLocaleString('th-TH', { minimumFractionDigits: 2 })}${noteHtml}`
        );
    } else {
        await showCustomModal(
            'success', 
            'ชำระเงินสำเร็จ!', 
            `ชำระผ่าน: <b>${paymentLabels[currentPaymentMethod]}</b><br>ยอดรวม: ฿${currentTotalBill.toLocaleString('th-TH', { minimumFractionDigits: 2 })}`
        );
    }
    
    cart = [];
    if (typeof saveCartToStorage === 'function') saveCartToStorage(); // 🌟 ล้างข้อมูลออกจาก LocalStorage ทันที
    if (typeof renderCart === 'function') renderCart();
    if (typeof refocusBarcode === 'function') refocusBarcode();
}

async function loadDebtorsCache() {
    try {
        const res = await fetch('/api/debts/debtors');
        existingDebtorsCache = await res.json();
    } catch (e) {
        existingDebtorsCache = [];
    }
}

function handleDebtorNameInput(val) {
    const menu = document.getElementById('debtor-suggestions-menu');
    const listContainer = document.getElementById('debtor-suggestions-list');
    if (!menu || !listContainer) return;

    const normalizeThai = (str) => String(str || '').toLowerCase().replace(/เเ/g, 'แ');
    const cleanKey = normalizeThai(val).trim();

    if (!cleanKey) {
        menu.classList.add('hidden');
        return;
    }

    const filtered = (existingDebtorsCache || []).filter(d => 
        normalizeThai(d.customer_name).includes(cleanKey)
    );

    if (filtered.length === 0) {
        menu.classList.add('hidden');
        return;
    }

    listContainer.innerHTML = filtered.map(d => `
        <div onmousedown="selectDebtorName('${d.customer_name.replace(/'/g, "\\'")}')" 
             class="px-3.5 py-2 hover:bg-amber-50 text-slate-700 font-semibold cursor-pointer transition flex items-center justify-between border-b border-slate-50 last:border-0 select-none">
            <span class="truncate pr-2">${d.customer_name}</span>
            <span class="text-[11px] font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-md whitespace-nowrap">
                ค้าง: ฿${Number(d.remaining).toLocaleString('th-TH', {minimumFractionDigits: 2})}
            </span>
        </div>
    `).join('');

    menu.classList.remove('hidden');
}

function selectDebtorName(name) {
    const input = document.getElementById('pay-customer-name');
    const menu = document.getElementById('debtor-suggestions-menu');
    if (input) input.value = name;
    if (menu) menu.classList.add('hidden');
}

document.addEventListener('mousedown', (e) => {
    const virtualKeyboard = document.getElementById('pos-virtual-keyboard');
    if (virtualKeyboard && virtualKeyboard.contains(e.target)) return;

    const custInput = document.getElementById('pay-customer-name');
    const custMenu = document.getElementById('debtor-suggestions-menu');
    if (custInput && custMenu && !custInput.contains(e.target) && !custMenu.contains(e.target)) {
        custMenu.classList.add('hidden');
    }
});

let paymentPollingTimer = null;

// ฟังก์ชันเล่นเสียงผู้หญิงแจ้งเตือนเงินเข้า
function playPaymentSuccessVoice(amount) {
    const numAmount = Number(amount) || 0;
    const formattedAmount = (numAmount % 1 === 0) ? numAmount : numAmount.toFixed(2);
    const text = `เงินเข้าแล้ว ${formattedAmount} บาท`;

    const audio = new Audio(`/api/tts?text=${encodeURIComponent(text)}`);
    audio.playbackRate = 1.12; 
    audio.preservesPitch = false;

    audio.play().catch(err => {
        console.error('Audio playback error:', err);
    });
}
function playKaChingSound() {
    try {
        const audio = new Audio('sounds/kaching.mp3'); // ⚡ ใส่ path และชื่อไฟล์เสียงของคุณตรงนี้
        audio.volume = 0.3; // ปรับความดังได้ตั้งแต่ 0.0 ถึง 1.0 (0.8 คือ 80%)
        audio.play().catch(err => console.warn('Audio play error:', err));
    } catch(e) {
        console.error('Audio error:', e);
    }
}
// ฟังก์ชันเริ่มดักเช็กสถานะเงินเข้า
function startPaymentListener(totalAmount) {
    stopPaymentListener();

    fetch('/api/payment/start-wait', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ total: totalAmount })
    });

    paymentPollingTimer = setInterval(async () => {
        try {
            const res = await fetch('/api/payment/check-status');
            const data = await res.json();

            if (data.paid) {
                stopPaymentListener();
                stopQRCountdown(); // หยุดเวลาทันทีเมื่อจ่ายสำเร็จ
                
                playPaymentSuccessVoice(totalAmount);

                const confirmBtn = document.querySelector('#btn-confirm-payment') || document.querySelector('button[onclick*="confirmPayment"]');
                if (confirmBtn) {
                    confirmBtn.click();
                } else if (typeof confirmPayment === 'function') {
                    confirmPayment();
                }
            }
        } catch (err) {
            console.error(err);
        }
    }, 1000);
}

// ฟังก์ชันหยุดการเช็กเมื่อปิด Modal
function stopPaymentListener() {
    if (paymentPollingTimer) {
        clearInterval(paymentPollingTimer);
        paymentPollingTimer = null;
    }
    fetch('/api/payment/cancel-wait', { method: 'POST' }).catch(() => {});
}