let currentFilter = 'day';
let currentPaymentFilter = 'all';
let currentViewMode = 'bills'; // bills | items
let customStartDate = null;
let customEndDate = null;
let customLabelText = '';
let searchKeyword = '';
let currentHistoryPage = 1; // ⭐️ ตัวแปรเก็บหน้าปัจจุบัน
const HISTORY_ITEMS_PER_PAGE = 20; // ⭐️ กำหนดแสดงหน้าละ 20 รายการ

document.addEventListener("DOMContentLoaded", () => {
    loadAndRenderHistory();

    const dateInput = document.getElementById('custom-date-picker');
    if (dateInput) {
        dateInput.addEventListener('change', () => {
            parseAndFilterCustomCalendar(dateInput.value);
        });
    }

    const searchInput = document.getElementById('search-history');
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            searchKeyword = e.target.value.toLowerCase().trim();
            currentHistoryPage = 1; // รีเซ็ตกลับหน้า 1 เมื่อค้นหา
            loadAndRenderHistory();
        });
    }
});

async function getSalesHistory() {
    try {
        const response = await fetch('/api/sales/history');
        return await response.json();
    } catch (error) {
        console.error('Fetch History Error:', error);
        return [];
    }
}

function switchHistoryView(mode) {
    currentViewMode = mode;
    currentHistoryPage = 1; // รีเซ็ตหน้าเมื่อเปลี่ยนมุมมอง
    const tabBills = document.getElementById('view-tab-bills');
    const tabItems = document.getElementById('view-tab-items');
    const payFilters = document.getElementById('payment-filters-container');

    if (mode === 'bills') {
        tabBills.className = "px-4 py-2 rounded-xl text-xs font-bold bg-white text-slate-900 shadow-2xs transition flex items-center gap-1.5 cursor-pointer";
        tabItems.className = "px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:text-slate-900 transition flex items-center gap-1.5 cursor-pointer";
        if (payFilters) payFilters.classList.remove('hidden');
    } else {
        tabBills.className = "px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:text-slate-900 transition flex items-center gap-1.5 cursor-pointer";
        tabItems.className = "px-4 py-2 rounded-xl text-xs font-bold bg-white text-emerald-700 shadow-2xs transition flex items-center gap-1.5 cursor-pointer";
        if (payFilters) payFilters.classList.add('hidden');
    }

    loadAndRenderHistory();
}

function setFilter(filterType, btnElement) {
    currentFilter = filterType;
    currentHistoryPage = 1;
    customStartDate = null;
    customEndDate = null;

    const datePicker = document.getElementById('custom-date-picker');
    if (datePicker) datePicker.value = '';

    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.className = "filter-btn px-3.5 py-1.5 rounded-xl text-xs font-bold text-slate-500 hover:text-slate-800 transition cursor-pointer";
    });
    if (btnElement) {
        btnElement.className = "filter-btn px-3.5 py-1.5 rounded-xl text-xs font-bold bg-white text-blue-600 shadow-2xs transition cursor-pointer";
    }

    loadAndRenderHistory();
}

function setPaymentFilter(method, btnElement) {
    currentPaymentFilter = method;
    currentHistoryPage = 1;

    document.querySelectorAll('.pay-filter-btn').forEach(btn => {
        btn.className = "pay-filter-btn px-3 py-1.5 rounded-xl text-xs font-bold text-slate-600 bg-white border border-slate-200 hover:bg-slate-50 transition flex items-center gap-1.5 cursor-pointer";
    });

    if (btnElement) {
        const activeStyles = {
            all: 'bg-slate-900 text-white border-slate-900 shadow-2xs',
            cash: 'bg-teal-600 text-white border-teal-600 shadow-2xs',
            transfer: 'bg-indigo-600 text-white border-indigo-600 shadow-2xs',
            gov: 'bg-sky-500 text-white border-sky-500 shadow-2xs',
            debt: 'bg-amber-500 text-white border-amber-500 shadow-2xs'
        };
        btnElement.className = `pay-filter-btn px-3 py-1.5 rounded-xl text-xs font-bold ${activeStyles[method]} transition flex items-center gap-1.5 cursor-pointer`;
    }

    loadAndRenderHistory();
}

const thaiMonthNamesList = ["มกราคม","กุมภาพันธ์","มีนาคม","เมษายน","พฤษภาคม","มิถุนายน","กรกฎาคม","สิงหาคม","กันยายน","ตุลาคม","พฤศจิกายน","ธันวาคม"];

function parseAndFilterCustomCalendar(val) {
    if (!val || val.trim() === '') return;

    currentFilter = 'custom';
    currentHistoryPage = 1;
    customLabelText = val;
    customStartDate = null;
    customEndDate = null;

    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.className = "filter-btn px-3.5 py-1.5 rounded-xl text-xs font-bold text-slate-500 hover:text-slate-800 transition cursor-pointer";
    });

    if (val.includes('/')) {
        const parts = val.split('-').map(s => s.trim());
        if (parts.length === 1) {
            const [d, m, y] = parts[0].split('/').map(Number);
            customStartDate = new Date(y - 543, m - 1, d, 0, 0, 0);
            customEndDate = new Date(y - 543, m - 1, d, 23, 59, 59, 999);
        } else if (parts.length === 2) {
            const [d1, m1, y1] = parts[0].split('/').map(Number);
            const [d2, m2, y2] = parts[1].split('/').map(Number);
            customStartDate = new Date(y1 - 543, m1 - 1, d1, 0, 0, 0);
            customEndDate = new Date(y2 - 543, m2 - 1, d2, 23, 59, 59, 999);
        }
    } else {
        const parts = val.split('-').map(s => s.trim());
        const parseMonthYear = (str) => {
            for (let mIdx = 0; mIdx < thaiMonthNamesList.length; mIdx++) {
                const mName = thaiMonthNamesList[mIdx];
                if (str.includes(mName)) {
                    const yearMatch = str.match(/\d{4}/);
                    const yearThai = yearMatch ? parseInt(yearMatch[0]) : (new Date().getFullYear() + 543);
                    return { month: mIdx, year: yearThai - 543 };
                }
            }
            return null;
        };

        if (parts.length === 1) {
            const my = parseMonthYear(parts[0]);
            if (my) {
                customStartDate = new Date(my.year, my.month, 1, 0, 0, 0);
                customEndDate = new Date(my.year, my.month + 1, 0, 23, 59, 59, 999);
            }
        } else if (parts.length === 2) {
            const my1 = parseMonthYear(parts[0]);
            const my2 = parseMonthYear(parts[1]);
            if (my1 && my2) {
                customStartDate = new Date(my1.year, my1.month, 1, 0, 0, 0);
                customEndDate = new Date(my2.year, my2.month + 1, 0, 23, 59, 59, 999);
            }
        }
    }

    loadAndRenderHistory();
}

function filterTransactions(transactions) {
    const now = new Date();

    return transactions.filter(tx => {
        const txDate = new Date(tx.timestamp);

        let matchDate = true;
        if (currentFilter === 'day') {
            matchDate = txDate.toDateString() === now.toDateString();
        } else if (currentFilter === 'week') {
            const dayOfWeek = now.getDay() === 0 ? 6 : now.getDay() - 1;
            const startOfWeek = new Date(now);
            startOfWeek.setDate(now.getDate() - dayOfWeek);
            startOfWeek.setHours(0, 0, 0, 0);

            const endOfWeek = new Date(startOfWeek);
            endOfWeek.setDate(startOfWeek.getDate() + 6);
            endOfWeek.setHours(23, 59, 59, 999);

            matchDate = txDate >= startOfWeek && txDate <= endOfWeek;
        } else if (currentFilter === 'month') {
            matchDate = txDate.getMonth() === now.getMonth() && txDate.getFullYear() === now.getFullYear();
        } else if (currentFilter === 'year') {
            matchDate = txDate.getFullYear() === now.getFullYear();
        } else if (currentFilter === 'custom') {
            if (customStartDate && customEndDate) {
                matchDate = txDate >= customStartDate && txDate <= customEndDate;
            } else {
                matchDate = false;
            }
        }

        const paymentMethod = tx.payment_method || 'cash';
        let matchPayment = (currentViewMode === 'items') || (currentPaymentFilter === 'all') || (paymentMethod === currentPaymentFilter);

        let matchSearch = true;
        if (searchKeyword) {
            const matchId = String(tx.id).toLowerCase().includes(searchKeyword);
            const matchItem = tx.items && tx.items.some(item => item.name.toLowerCase().includes(searchKeyword));
            const matchCustomer = tx.customer_name && String(tx.customer_name).toLowerCase().includes(searchKeyword);
            matchSearch = matchId || matchItem || matchCustomer;
        }

        return matchDate && matchPayment && matchSearch;
    });
}

function updateDateRangeDisplay() {
    const labelEl = document.getElementById('date-range-label');
    if (!labelEl) return;

    const now = new Date();
    const thaiOptionsShort = { day: 'numeric', month: 'short', year: 'numeric' };
    const thaiOptionsLong = { day: 'numeric', month: 'long', year: 'numeric' };

    let textStr = '';
    if (currentFilter === 'day') {
        textStr = now.toLocaleDateString('th-TH', thaiOptionsLong);
    } else if (currentFilter === 'week') {
        const dayOfWeek = now.getDay() === 0 ? 6 : now.getDay() - 1;
        const startOfWeek = new Date(now);
        startOfWeek.setDate(now.getDate() - dayOfWeek);
        const endOfWeek = new Date(startOfWeek);
        endOfWeek.setDate(startOfWeek.getDate() + 6);
        textStr = `${startOfWeek.toLocaleDateString('th-TH', thaiOptionsShort)} - ${endOfWeek.toLocaleDateString('th-TH', thaiOptionsShort)}`;
    } else if (currentFilter === 'month') {
        textStr = `เดือน${now.toLocaleDateString('th-TH', { month: 'long', year: 'numeric' })}`;
    } else if (currentFilter === 'year') {
        textStr = `ปี ${now.toLocaleDateString('th-TH', { year: 'numeric' })}`;
    } else if (currentFilter === 'custom' && customLabelText) {
        textStr = customLabelText;
    } else {
        textStr = `ข้อมูลทั้งหมด`;
    }

    labelEl.innerHTML = `<span>${textStr}</span>`;
}

async function loadAndRenderHistory() {
    const allHistory = await getSalesHistory();
    const filteredHistory = filterTransactions(allHistory);

    updateDateRangeDisplay();
    renderStats(filteredHistory);
    
    if (currentViewMode === 'bills') {
        renderBillsTable(filteredHistory);
    } else {
        renderItemsProfitTable(filteredHistory);
    }
}

function renderStats(historyList) {
    let totalRevenue = 0;
    let totalCost = 0;
    let totalItems = 0;

    let cashRevenue = 0, cashCount = 0;
    let transferRevenue = 0, transferCount = 0;
    let govRevenue = 0, govCount = 0;
    let debtRevenue = 0, debtCount = 0;

    historyList.forEach(tx => {
        const total = Number(tx.total) || 0;
        const received = Number(tx.received) || 0;
        const method = tx.payment_method || 'cash';

        totalRevenue += total;

        if (tx.items) {
            tx.items.forEach(item => {
                const qty = parseInt(item.qty) || 0;
                const cost = parseFloat(item.cost_price) || 0;
                totalItems += qty;
                totalCost += (cost * qty);
            });
        }

        if (method === 'cash') {
            cashRevenue += total;
            cashCount++;
        } else if (method === 'transfer') {
            transferRevenue += total;
            transferCount++;
        } else if (method === 'gov') {
            govRevenue += total;
            govCount++;
        } else if (method === 'debt') {
            const unpaid = Math.max(0, total - received);
            debtRevenue += unpaid;
            debtCount++;
        }
    });

    const totalProfit = Math.max(0, totalRevenue - totalCost);
    const formatMoney = (val) => `฿${Number(val).toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

    const setElText = (id, text) => {
        const el = document.getElementById(id);
        if (el) el.innerText = text;
    };

    setElText('stat-total-revenue', formatMoney(totalRevenue));
    setElText('stat-total-orders', historyList.length.toLocaleString());
    setElText('stat-total-items', totalItems.toLocaleString());
    setElText('stat-total-profit', formatMoney(totalProfit));
    setElText('stat-cash-revenue', formatMoney(cashRevenue));
    setElText('stat-cash-count', cashCount.toLocaleString());
    setElText('stat-transfer-revenue', formatMoney(transferRevenue));
    setElText('stat-transfer-count', transferCount.toLocaleString());
    setElText('stat-gov-revenue', formatMoney(govRevenue));
    setElText('stat-gov-count', govCount.toLocaleString());
    setElText('stat-debt-revenue', formatMoney(debtRevenue));
    setElText('stat-debt-count', debtCount.toLocaleString());
}

function renderBillsTable(historyList) {
    const thead = document.getElementById('history-table-head');
    const tbody = document.getElementById('history-table-body');
    if (!thead || !tbody) return;

    thead.innerHTML = `
        <tr>
            <th class="p-4 w-44">รหัสบิล / วัน-เวลา</th>
            <th class="p-4 text-center w-32">ช่องทางชำระเงิน</th>
            <th class="p-4">รายการสินค้า (ราคา & กำไร)</th>
            <th class="p-4 text-center w-24">จำนวน</th>
            <th class="p-4 text-right w-36">ยอดรวมสุทธิ (กำไร)</th>
            <th class="p-4 text-right w-48">การรับเงิน / สถานะ</th>
            <th class="p-4 text-center w-24">จัดการ</th>
        </tr>
    `;

    if (historyList.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="7" class="text-center py-12 text-slate-400">
                    <p class="text-sm font-medium">ไม่พบรายการคิดเงินตามเงื่อนไขที่ค้นหา</p>
                </td>
            </tr>
        `;
        return;
    }

    // ⭐️ คำนวณระบบแบ่งหน้า (Pagination) ⭐️
    const totalPages = Math.ceil(historyList.length / HISTORY_ITEMS_PER_PAGE);
    if (currentHistoryPage > totalPages) currentHistoryPage = totalPages || 1;
    const startIndex = (currentHistoryPage - 1) * HISTORY_ITEMS_PER_PAGE;
    const paginatedList = historyList.slice(startIndex, startIndex + HISTORY_ITEMS_PER_PAGE);

    let subtotalItems = 0;
    let subtotalAmount = 0;
    let subtotalProfit = 0;

    const htmlRows = paginatedList.map(tx => {
        const dateObj = new Date(tx.timestamp);
        const formattedDate = dateObj.toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric' });
        const formattedTime = dateObj.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' });

        const totalNum = Number(tx.total || 0);
        const receivedNum = Number(tx.received || 0);
        subtotalAmount += totalNum;

        const formattedTotal = totalNum.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
        const formattedReceived = receivedNum.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
        const formattedChange = Number(tx.change || 0).toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

        let billProfit = 0;
        const itemsBadgesHtml = (tx.items || []).map(item => {
            const cost = Number(item.cost_price) || 0;
            const price = Number(item.price) || 0;
            const qty = parseInt(item.qty) || 0;
            const profitPerUnit = price - cost;
            const itemTotalProfit = profitPerUnit * qty;
            billProfit += itemTotalProfit;

            return `
                <span class="inline-flex items-center gap-1.5 px-2.5 py-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200/90 rounded-xl text-xs text-slate-700 transition select-none shadow-2xs flex-wrap">
                    <span class="font-bold text-slate-800 whitespace-normal">${item.name}</span>
                    <span class="px-1.5 py-0.5 bg-blue-50 text-blue-700 border border-blue-100 rounded-md font-bold text-[10px] whitespace-nowrap">x${qty}</span>
                    <span class="font-black text-slate-700 text-[11px] whitespace-nowrap">฿${price.toLocaleString('th-TH', { minimumFractionDigits: 2 })}</span>
                    ${profitPerUnit !== 0 ? `
                        <span class="text-[10px] ${profitPerUnit > 0 ? 'text-emerald-700 bg-emerald-50 border-emerald-200' : 'text-rose-600 bg-rose-50 border-rose-200'} font-bold px-1.5 py-0.5 rounded-md border whitespace-nowrap">
                            กำไร ${profitPerUnit > 0 ? '+' : ''}฿${profitPerUnit.toFixed(1)}/ชิ้น
                        </span>
                    ` : ''}
                </span>
            `;
        }).join('');

        subtotalProfit += billProfit;
        const totalItemsCount = (tx.items || []).reduce((sum, item) => sum + (parseInt(item.qty) || 0), 0);
        subtotalItems += totalItemsCount;

        const method = tx.payment_method || 'cash';
        let badgeHtml = '';
        let paymentDetailHtml = '';

        if (method === 'cash') {
            badgeHtml = `<span class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-xs font-bold bg-teal-50 text-teal-700 border border-teal-200 whitespace-nowrap"><span>เงินสด</span></span>`;
            paymentDetailHtml = `<p class="text-slate-600 font-bold text-sm whitespace-nowrap">รับ: <span class="text-slate-900">฿${formattedReceived}</span></p><p class="text-teal-600 font-bold text-xs whitespace-nowrap mt-0.5">ทอน: ฿${formattedChange}</p>`;
        } else if (method === 'transfer') {
            badgeHtml = `<span class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-200 whitespace-nowrap"><span>สแกน/โอน</span></span>`;
            paymentDetailHtml = `<p class="text-slate-600 font-bold text-sm whitespace-nowrap">รับโอน: <span class="text-indigo-700">฿${formattedTotal}</span></p><span class="inline-block text-xs font-bold text-indigo-600 bg-indigo-50 border border-indigo-100 px-2 py-0.5 rounded-md whitespace-nowrap mt-0.5">โอนเต็มจำนวน</span>`;
        } else if (method === 'gov') {
            badgeHtml = `<span class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-xs font-bold bg-sky-50 text-sky-700 border border-sky-200 whitespace-nowrap"><span>โครงการรัฐ</span></span>`;
            paymentDetailHtml = `<p class="text-slate-600 font-bold text-sm whitespace-nowrap">ตัดยอด: <span class="text-sky-700">฿${formattedTotal}</span></p><span class="inline-block text-xs font-bold text-sky-600 bg-sky-50 border border-sky-100 px-2 py-0.5 rounded-md whitespace-nowrap mt-0.5">ตัดโครงการ</span>`;
        } else if (method === 'debt') {
            badgeHtml = `<span class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-xs font-bold bg-amber-50 text-amber-800 border border-amber-200 whitespace-nowrap"><span>ติดเงิน</span></span>`;
            const unpaid = Math.max(0, totalNum - receivedNum);
            const isPaid = unpaid <= 0;
            if (isPaid) {
                paymentDetailHtml = `<p class="text-slate-700 font-bold text-xs truncate max-w-[150px] whitespace-nowrap mb-0.5">ลูกค้า: <span class="text-slate-900 font-black">${tx.customer_name || 'ไม่ระบุ'}</span></p><span class="inline-block text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-lg whitespace-nowrap">ชำระครบแล้ว ฿${formattedTotal}</span>`;
            } else {
                paymentDetailHtml = `<p class="text-slate-700 font-bold text-xs truncate max-w-[150px] whitespace-nowrap mb-0.5">ลูกค้า: <span class="text-slate-900 font-black">${tx.customer_name || 'ไม่ระบุ'}</span></p><p class="text-rose-600 font-black text-sm whitespace-nowrap">ค้าง: ฿${unpaid.toLocaleString('th-TH', { minimumFractionDigits: 2 })}</p>`;
            }
        }

        return `
            <tr class="hover:bg-slate-50/80 transition">
                <td class="p-4 align-middle whitespace-nowrap">
                    <p class="text-sm font-bold text-slate-800">${tx.id}</p>
                    <p class="text-xs font-semibold text-slate-400 mt-0.5">${formattedDate} • ${formattedTime} น.</p>
                </td>
                <td class="p-4 text-center align-middle whitespace-nowrap">${badgeHtml}</td>
                <td class="p-4 align-middle"><div class="flex flex-wrap gap-1.5 max-w-md lg:max-w-xl">${itemsBadgesHtml}</div></td>
                <td class="p-4 text-center font-bold text-slate-700 text-sm sm:text-base align-middle whitespace-nowrap">${totalItemsCount} ชิ้น</td>
                <td class="p-4 text-right align-middle whitespace-nowrap">
                    <p class="font-black text-slate-900 text-base sm:text-lg leading-tight">฿${formattedTotal}</p>
                    <p class="text-xs font-bold ${billProfit >= 0 ? 'text-emerald-600' : 'text-rose-600'} mt-0.5">กำไร ${billProfit >= 0 ? '+' : ''}฿${Number(billProfit).toLocaleString('th-TH', { minimumFractionDigits: 2 })}</p>
                </td>
                <td class="p-4 text-right align-middle whitespace-nowrap">${paymentDetailHtml}</td>
                <td class="p-3.5 text-center align-middle whitespace-nowrap">
                    <div class="flex items-center justify-center gap-1.5">
                        <button onclick="openEditBillModal('${tx.id}')" class="w-8 h-8 bg-blue-600 hover:bg-blue-700 rounded-xl flex items-center justify-center shadow-2xs transition active:scale-90 cursor-pointer" title="แก้ไข">
                            <div class="w-4 h-4 bg-white" style="mask: url('icon/pencil.png') no-repeat center / contain; -webkit-mask: url('icon/pencil.png') no-repeat center / contain;"></div>
                        </button>
                        <button onclick="confirmCancelBill('${tx.id}')" class="w-8 h-8 bg-rose-50/50 hover:bg-rose-100 rounded-xl border border-rose-200 hover:border-rose-300 flex items-center justify-center shadow-2xs transition active:scale-90 cursor-pointer" title="ลบ">
                            <div class="w-4 h-4 bg-rose-500" style="mask: url('icon/delete.png') no-repeat center / contain; -webkit-mask: url('icon/delete.png') no-repeat center / contain;"></div>
                        </button>
                    </div>
                </td>
            </tr>
        `;
    }).join('');

    // แถวสรุปยอดรวมท้ายตาราง
    const summaryFooterHtml = `
        <tr class="bg-slate-100/90 font-bold border-t-2 border-slate-200/90 text-slate-800">
            <td colspan="3" class="p-4 text-left font-black text-sm text-slate-700">แสดงหน้า ${currentHistoryPage} จาก ${totalPages || 1} (รวมทั้งหมด ${historyList.length} บิล)</td>
            <td class="p-4 text-center text-sm font-black text-slate-900 whitespace-nowrap">${subtotalItems.toLocaleString()} ชิ้น</td>
            <td class="p-4 text-right whitespace-nowrap">
                <p class="text-base font-black text-blue-600 leading-tight">฿${subtotalAmount.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                <p class="text-xs font-bold text-emerald-600 mt-0.5">กำไรรวม +฿${subtotalProfit.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
            </td>
            <td colspan="2" class="p-4"></td>
        </tr>
    `;

    tbody.innerHTML = htmlRows + summaryFooterHtml;

    // ⭐️ เพิ่มแถบปุ่มกดเปลี่ยนหน้า (Pagination Bar) ด้านล่างตาราง ⭐️
    renderPaginationBar(totalPages);
}

// ⭐️ ฟังก์ชันสร้างปุ่มเปลี่ยนหน้า ⭐️
function renderPaginationBar(totalPages) {
    let paginationContainer = document.getElementById('history-pagination-container');
    if (!paginationContainer) {
        paginationContainer = document.createElement('div');
        paginationContainer.id = 'history-pagination-container';
        const tableWrapper = document.getElementById('history-table-body').closest('.bg-white');
        if (tableWrapper) tableWrapper.appendChild(paginationContainer);
    }

    if (totalPages <= 1) {
        paginationContainer.innerHTML = '';
        return;
    }

    paginationContainer.className = "p-4 border-t border-slate-100 flex items-center justify-between bg-slate-50/50 rounded-b-2xl";
    paginationContainer.innerHTML = `
        <button onclick="changeHistoryPage(${currentHistoryPage - 1})" 
                class="px-4 py-2 bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 rounded-xl text-xs font-bold transition shadow-2xs cursor-pointer ${currentHistoryPage === 1 ? 'opacity-40 pointer-events-none' : ''}">
            ◀ ก่อนหน้า
        </button>
        <span class="text-xs font-bold text-slate-600">หน้าที่ ${currentHistoryPage} จาก ${totalPages}</span>
        <button onclick="changeHistoryPage(${currentHistoryPage + 1})" 
                class="px-4 py-2 bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 rounded-xl text-xs font-bold transition shadow-2xs cursor-pointer ${currentHistoryPage === totalPages ? 'opacity-40 pointer-events-none' : ''}">
            ถัดไป ▶
        </button>
    `;
}

function changeHistoryPage(page) {
    currentHistoryPage = page;
    loadAndRenderHistory();
}

function renderItemsProfitTable(historyList) {
    // ซ่อนปุ่มเปลี่ยนหน้าเมื่ออยู่หน้าสรุปกำไรรายสินค้า
    const paginationContainer = document.getElementById('history-pagination-container');
    if (paginationContainer) paginationContainer.innerHTML = '';

    const thead = document.getElementById('history-table-head');
    const tbody = document.getElementById('history-table-body');
    if (!thead || !tbody) return;

    thead.innerHTML = `
        <tr>
            <th class="p-4 text-center w-16">อันดับ</th>
            <th class="p-4 text-left">ชื่อสินค้า / รหัสบาร์โค้ด</th>
            <th class="p-4 text-center w-28">จำนวนขาย</th>
            <th class="p-4 text-right w-36">ราคาขาย (ต้นทุน)</th>
            <th class="p-4 text-center w-36">กำไรต่อชิ้น</th>
            <th class="p-4 text-right w-36">ยอดขายรวม</th>
            <th class="p-4 text-right w-40">กำไรรวมสุทธิ</th>
        </tr>
    `;

    const productMap = {};
    historyList.forEach(tx => {
        (tx.items || []).forEach(item => {
            const pId = String(item.id).trim();
            const qty = parseInt(item.qty) || 0;
            const price = parseFloat(item.price) || 0;
            const cost = parseFloat(item.cost_price || item.cost || 0);

            if (!productMap[pId]) {
                productMap[pId] = { id: pId, name: item.name, qty: 0, cost_price: cost, price: price, total_revenue: 0, total_cost: 0, total_profit: 0 };
            }
            productMap[pId].qty += qty;
            productMap[pId].total_revenue += (price * qty);
            productMap[pId].total_cost += (cost * qty);
            productMap[pId].total_profit += ((price - cost) * qty);
        });
    });

    let itemsArray = Object.values(productMap);
    if (searchKeyword) {
        itemsArray = itemsArray.filter(it => it.name.toLowerCase().includes(searchKeyword) || it.id.toLowerCase().includes(searchKeyword));
    }
    itemsArray.sort((a, b) => b.total_profit - a.total_profit);

    if (itemsArray.length === 0) {
        tbody.innerHTML = `<tr><td colspan="7" class="text-center py-12 text-slate-400"><p class="text-sm font-medium">ไม่พบข้อมูลสินค้าตามเงื่อนไขที่เลือก</p></td></tr>`;
        return;
    }

    let totalSoldQty = 0;
    let totalAllRevenue = 0;
    let totalAllProfit = 0;

    const htmlRows = itemsArray.map((it, idx) => {
        totalSoldQty += it.qty;
        totalAllRevenue += it.total_revenue;
        totalAllProfit += it.total_profit;
        const profitPerUnit = it.price - it.cost_price;

        let rankBadge = `<span class="w-8 h-8 rounded-full bg-slate-100 text-slate-600 font-bold text-xs flex items-center justify-center border border-slate-200 mx-auto">${idx + 1}</span>`;
        if (idx === 0) rankBadge = `<span class="w-8 h-8 rounded-full bg-gradient-to-br from-amber-400 to-amber-600 text-white font-black text-sm flex items-center justify-center shadow-sm border border-amber-300 mx-auto">1</span>`;
        else if (idx === 1) rankBadge = `<span class="w-8 h-8 rounded-full bg-gradient-to-br from-slate-300 to-slate-500 text-white font-black text-sm flex items-center justify-center shadow-sm border border-slate-300 mx-auto">2</span>`;
        else if (idx === 2) rankBadge = `<span class="w-8 h-8 rounded-full bg-gradient-to-br from-orange-400 to-amber-700 text-white font-black text-sm flex items-center justify-center shadow-sm border border-orange-300 mx-auto">3</span>`;

        return `
            <tr class="hover:bg-slate-50/80 transition border-b border-slate-100 last:border-b-0">
                <td class="p-4 text-center align-middle whitespace-nowrap">${rankBadge}</td>
                <td class="p-4 align-middle text-left"><p class="font-bold text-slate-800 text-sm leading-snug">${it.name}</p><p class="text-xs text-slate-400 mt-0.5">บาร์โค้ด: ${it.id}</p></td>
                <td class="p-4 text-center align-middle whitespace-nowrap"><span class="px-3 py-1 bg-slate-100 text-slate-800 rounded-xl text-xs font-bold">${it.qty.toLocaleString()} ชิ้น</span></td>
                <td class="p-4 text-right align-middle whitespace-nowrap"><p class="font-bold text-slate-700 text-sm">฿${it.price.toLocaleString('th-TH', { minimumFractionDigits: 2 })}</p><p class="text-[11px] text-slate-400 font-medium">(ทุน ฿${it.cost_price.toLocaleString('th-TH', { minimumFractionDigits: 2 })})</p></td>
                <td class="p-4 text-center align-middle whitespace-nowrap"><span class="inline-flex items-center justify-center px-3 py-1 rounded-xl text-xs font-bold ${profitPerUnit >= 0 ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-rose-50 text-rose-600 border border-rose-200'}">${profitPerUnit >= 0 ? '+' : ''}฿${profitPerUnit.toLocaleString('th-TH', { minimumFractionDigits: 2 })} / ชิ้น</span></td>
                <td class="p-4 text-right align-middle whitespace-nowrap"><span class="font-bold text-blue-600 text-base">฿${it.total_revenue.toLocaleString('th-TH', { minimumFractionDigits: 2 })}</span></td>
                <td class="p-4 text-right align-middle whitespace-nowrap"><span class="font-black ${it.total_profit >= 0 ? 'text-emerald-600' : 'text-rose-600'} text-base sm:text-lg">${it.total_profit >= 0 ? '+' : ''}฿${it.total_profit.toLocaleString('th-TH', { minimumFractionDigits: 2 })}</span></td>
            </tr>
        `;
    }).join('');

    const summaryFooterHtml = `
        <tr class="bg-slate-100/90 font-bold border-t-2 border-slate-200/90 text-slate-800">
            <td colspan="2" class="p-4 text-left font-black text-sm text-slate-700">รวมทั้งหมด (${itemsArray.length} รายการ)</td>
            <td class="p-4 text-center text-sm font-black text-slate-900 whitespace-nowrap">${totalSoldQty.toLocaleString()} ชิ้น</td>
            <td colspan="2" class="p-4"></td>
            <td class="p-4 text-right text-base font-black text-blue-600 whitespace-nowrap">฿${totalAllRevenue.toLocaleString('th-TH', { minimumFractionDigits: 2 })}</td>
            <td class="p-4 text-right text-base sm:text-lg font-black text-emerald-600 whitespace-nowrap">+฿${totalAllProfit.toLocaleString('th-TH', { minimumFractionDigits: 2 })}</td>
        </tr>
    `;

    tbody.innerHTML = htmlRows + summaryFooterHtml;
}

// ----------------- หน้าต่างแก้ไขข้อมูลบิล & ยกเลิกบิล -----------------

async function openEditBillModal(billId) {
    const allHistory = await getSalesHistory();
    const bill = allHistory.find(b => b.id === billId);

    if (!bill) {
        await showCustomModal('warning', 'ไม่พบข้อมูล', 'ไม่พบรายการบิลที่ต้องการแก้ไข');
        return;
    }

    currentEditingBill = JSON.parse(JSON.stringify(bill));
    renderEditModalHTML();
}

function renderEditModalHTML() {
    const container = document.getElementById('modal-container');
    if (!container || !currentEditingBill) return;

    const totalAmount = currentEditingBill.items.reduce((sum, item) => sum + (item.price * item.qty), 0);
    currentEditingBill.total = totalAmount;

    const method = currentEditingBill.payment_method || 'cash';

    if (method === 'debt') {
        currentEditingBill.received = 0;
        currentEditingBill.change = 0;
    } else if (method !== 'cash') {
        currentEditingBill.received = totalAmount;
        currentEditingBill.change = 0;
    } else {
        currentEditingBill.change = (currentEditingBill.received || 0) - totalAmount;
    }

    const itemsHtml = currentEditingBill.items.map((item, idx) => `
        <div class="flex items-center justify-between p-3 bg-slate-50/80 hover:bg-slate-100/70 rounded-2xl border border-slate-200/60 gap-3 transition">
            <div class="flex-1 min-w-0 pr-2">
                <p class="text-sm font-bold text-slate-800 truncate" title="${item.name}">${item.name}</p>
                <p class="text-xs text-slate-400 font-semibold mt-0.5">฿${Number(item.price).toLocaleString('th-TH', {minimumFractionDigits: 2})} / ชิ้น</p>
            </div>
            
            <div class="flex items-center gap-1 bg-white border border-slate-200 rounded-xl p-1 shadow-2xs flex-shrink-0">
                <button type="button" onclick="updateEditItemQty(${idx}, -1)" 
                        class="w-6 h-6 flex items-center justify-center text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg font-black text-xs cursor-pointer active:scale-90 transition">-</button>
                <span class="w-6 text-center text-xs font-bold text-slate-800">${item.qty}</span>
                <button type="button" onclick="updateEditItemQty(${idx}, 1)" 
                        class="w-6 h-6 flex items-center justify-center text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg font-black text-xs cursor-pointer active:scale-90 transition">+</button>
            </div>

            <div class="text-right min-w-[70px] flex-shrink-0">
                <span class="text-sm font-black text-slate-800">฿${(item.price * item.qty).toLocaleString('th-TH', {minimumFractionDigits: 2})}</span>
            </div>

            <button type="button" onclick="removeEditItem(${idx})" 
                    class="p-1.5 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-xl transition cursor-pointer flex-shrink-0" title="ลบสินค้านี้">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
            </button>
        </div>
    `).join('');

    container.innerHTML = `
    <div id="edit-bill-modal" class="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
        <div class="bg-white w-full max-w-lg p-6 sm:p-8 rounded-[32px] shadow-2xl relative space-y-5 border border-slate-100 animate-in fade-in zoom-in-95 max-h-[92vh] overflow-y-auto">
            
            <div class="flex items-center justify-between pb-1">
                <div class="flex items-center gap-3">
                    <div class="w-10 h-10 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center shadow-2xs">
                        <svg class="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
                        </svg>
                    </div>
                    <div>
                        <h3 class="text-lg font-bold text-slate-900 tracking-tight leading-none">แก้ไขข้อมูลบิล</h3>
                        <p class="text-[11px] text-slate-400 font-medium mt-1">รหัสบิล: <span class="font-bold text-slate-700">#${currentEditingBill.id}</span></p>
                    </div>
                </div>
                <button type="button" onclick="closeEditBillModal()" title="ปิดหน้าต่าง" class="text-slate-400 hover:text-slate-800 hover:bg-slate-100 w-8 h-8 flex items-center justify-center rounded-full transition cursor-pointer">
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                </button>
            </div>

            <div class="bg-slate-50/80 border border-slate-200/60 rounded-3xl p-5 text-center shadow-inner">
                <p class="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">ยอดรวมสุทธิทั้งสิ้น</p>
                <p class="text-4xl sm:text-5xl font-black text-slate-900 tracking-tight">฿${Number(totalAmount).toLocaleString('th-TH', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}</p>
            </div>

            <div class="grid grid-cols-4 gap-1.5 bg-slate-100/80 p-1.5 rounded-2xl border border-slate-200/60">
                <button type="button" onclick="setEditPaymentMethod('cash')" class="py-2.5 px-1 rounded-xl transition-all flex flex-col sm:flex-row items-center justify-center gap-1.5 text-xs font-bold cursor-pointer active:scale-95 ${method === 'cash' ? 'bg-white text-emerald-700 shadow-sm' : 'text-slate-600 hover:text-slate-900'} whitespace-nowrap"><span>เงินสด</span></button>
                <button type="button" onclick="setEditPaymentMethod('transfer')" class="py-2.5 px-1 rounded-xl transition-all flex flex-col sm:flex-row items-center justify-center gap-1.5 text-xs font-bold cursor-pointer active:scale-95 ${method === 'transfer' ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-600 hover:text-slate-900'} whitespace-nowrap"><span>สแกน/โอน</span></button>
                <button type="button" onclick="setEditPaymentMethod('gov')" class="py-2.5 px-1 rounded-xl transition-all flex flex-col sm:flex-row items-center justify-center gap-1.5 text-xs font-bold cursor-pointer active:scale-95 ${method === 'gov' ? 'bg-white text-sky-700 shadow-sm' : 'text-slate-600 hover:text-slate-900'} whitespace-nowrap"><span>โครงการรัฐ</span></button>
                <button type="button" onclick="setEditPaymentMethod('debt')" class="py-2.5 px-1 rounded-xl transition-all flex flex-col sm:flex-row items-center justify-center gap-1.5 text-xs font-bold cursor-pointer active:scale-95 ${method === 'debt' ? 'bg-white text-amber-700 shadow-sm' : 'text-slate-600 hover:text-slate-900'} whitespace-nowrap"><span>ติดเงิน</span></button>
            </div>

            <div class="space-y-1.5">
                <label class="block text-xs font-bold text-slate-600">รายการสินค้าในบิล</label>
                <div class="space-y-2 max-h-44 overflow-y-auto pr-1">${itemsHtml.length > 0 ? itemsHtml : '<p class="text-xs text-rose-500 text-center py-3 font-semibold">ไม่มีสินค้าในบิล</p>'}</div>
            </div>

            ${method === 'cash' ? `
                <div class="space-y-4 pt-1">
                    <div>
                        <label class="block text-xs font-bold text-slate-600 mb-1.5">จำนวนเงินที่รับมา (บาท)</label>
                        <input type="number" step="any" placeholder="0.00" value="${currentEditingBill.received || ''}" oninput="updateEditReceived(this.value)" class="w-full text-center text-3xl font-black p-4 bg-slate-50 border-2 border-slate-200 focus:border-emerald-500 rounded-2xl text-slate-900 focus:outline-none transition shadow-inner">
                    </div>
                    <div class="flex items-center justify-between px-4 py-3.5 bg-slate-50 border border-slate-200/60 rounded-2xl">
                        <span class="text-xs font-bold text-slate-500">เงินทอนสุทธิ</span>
                        ${currentEditingBill.change < 0 ? `<span class="text-sm font-bold text-rose-500">ยอดเงินไม่พอ</span>` : `<span class="text-xl font-black text-emerald-600">฿${Number(currentEditingBill.change).toLocaleString('th-TH', { minimumFractionDigits: 2 })}</span>`}
                    </div>
                </div>
            ` : (method === 'debt' ? `
                <div class="space-y-3.5 pt-1">
                    <div class="p-3.5 bg-amber-50 rounded-2xl border border-amber-200/80 text-center">
                        <p class="text-xs font-bold text-amber-800">บันทึกรายการติดเงิน</p>
                    </div>
                    <div>
                        <label class="block text-xs font-bold text-slate-700 mb-1">ชื่อลูกค้า / เบอร์โทร <span class="text-rose-500">*</span></label>
                        <input type="text" id="edit-customer-name" value="${currentEditingBill.customer_name || ''}" placeholder="ระบุชื่อลูกค้า..." class="w-full p-3.5 bg-slate-50 border-2 border-slate-200 focus:border-amber-400 rounded-2xl text-sm font-bold text-slate-900 focus:bg-white focus:outline-none transition shadow-inner">
                    </div>
                </div>
            ` : `
                <div class="p-5 bg-slate-50 rounded-2xl border border-slate-200/80 text-center">
                    <p class="text-sm font-bold text-slate-800">${method === 'transfer' ? 'สแกน QR Code / เงินโอนธนาคาร' : 'โครงการรัฐ (เป๋าตัง)'}</p>
                </div>
            `)}

            <button type="button" onclick="saveEditedBill()" class="w-full py-4 bg-blue-600 hover:bg-blue-700 active:scale-98 text-white rounded-2xl text-base font-bold shadow-lg shadow-blue-600/25 transition-all duration-150 cursor-pointer">
                บันทึกการแก้ไข
            </button>
        </div>
    </div>
    `;
}

function updateEditItemQty(index, delta) {
    if (!currentEditingBill || !currentEditingBill.items[index]) return;
    currentEditingBill.items[index].qty += delta;
    if (currentEditingBill.items[index].qty <= 0) {
        currentEditingBill.items.splice(index, 1);
    }
    renderEditModalHTML();
}

function removeEditItem(index) {
    if (!currentEditingBill || !currentEditingBill.items[index]) return;
    currentEditingBill.items.splice(index, 1);
    renderEditModalHTML();
}

function setEditPaymentMethod(method) {
    if (!currentEditingBill) return;
    currentEditingBill.payment_method = method;
    renderEditModalHTML();
}

function updateEditReceived(val) {
    if (!currentEditingBill) return;
    currentEditingBill.received = parseFloat(val) || 0;
    renderEditModalHTML();
}

function closeEditBillModal() {
    const container = document.getElementById('modal-container');
    if (container) container.innerHTML = '';
    currentEditingBill = null;
}

async function saveEditedBill() {
    if (!currentEditingBill || currentEditingBill.items.length === 0) {
        await showCustomModal('warning', 'ไม่มีรายการสินค้า', 'บิลต้องมีสินค้าอย่างน้อย 1 รายการ');
        return;
    }

    const editCustomerNameInput = document.getElementById('edit-customer-name');
    const customerName = editCustomerNameInput ? editCustomerNameInput.value.trim() : (currentEditingBill.customer_name || '');

    if (currentEditingBill.payment_method === 'cash' && (currentEditingBill.received || 0) < currentEditingBill.total) {
        await showCustomModal('warning', 'เงินไม่พอ', 'จำนวนเงินที่รับมาน้อยกว่ายอดรวมสุทธิ');
        return;
    }

    try {
        const payload = {
            id: currentEditingBill.id,
            total: currentEditingBill.total,
            received: currentEditingBill.payment_method === 'cash' ? currentEditingBill.received : (currentEditingBill.payment_method === 'debt' ? 0 : currentEditingBill.total),
            change: currentEditingBill.payment_method === 'cash' ? Math.max(0, currentEditingBill.change) : 0,
            payment_method: currentEditingBill.payment_method,
            customer_name: customerName,
            items: currentEditingBill.items
        };

        const response = await fetch('/api/sales/update-bill', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        const res = await response.json();

        if (res.success) {
            closeEditBillModal();
            await showCustomModal('success', 'แก้ไขสำเร็จ!', `บันทึกการแก้ไขบิลเรียบร้อยแล้ว`);
            loadAndRenderHistory();
        } else {
            await showCustomModal('warning', 'เกิดข้อผิดพลาด', res.message || 'ไม่สามารถบันทึกการแก้ไขได้');
        }
    } catch (err) {
        console.error('Update Bill Error:', err);
    }
}

async function confirmCancelBill(billId) {
    const isConfirmed = await showCustomModal(
        'confirm',
        'ยืนยันยกเลิกบิล?',
        `คุณต้องการยกเลิกบิล <span class="font-bold text-slate-800">${billId}</span> ออกจากระบบใช่หรือไม่?`
    );

    if (!isConfirmed) return;

    try {
        const response = await fetch('/api/sales/cancel-bill', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: billId })
        });
        const result = await response.json();

        if (result.success) {
            await showCustomModal('success', 'ยกเลิกบิลเรียบร้อย!', `ลบบิล ${billId} เรียบร้อยแล้ว`);
            loadAndRenderHistory();
        } else {
            await showCustomModal('warning', 'เกิดข้อผิดพลาด', result.message || 'ไม่สามารถยกเลิกบิลได้');
        }
    } catch (error) {
        console.error('Cancel Bill Error:', error);
    }
}