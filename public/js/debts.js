let allDebtors = [];
let currentDebtorFilter = 'unpaid'; // unpaid | all
let searchDebtorKeyword = '';
let currentDebtorPage = 1;
const DEBTOR_ITEMS_PER_PAGE = 20; // ⭐️ หน้าละ 20 รายการ
let customStartDate = null;
let customEndDate = null;
let customLabelText = '';

const thaiMonthNamesList = ["มกราคม","กุมภาพันธ์","มีนาคม","เมษายน","พฤษภาคม","มิถุนายน","กรกฎาคม","สิงหาคม","กันยายน","ตุลาคม","พฤศจิกายน","ธันวาคม"];

document.addEventListener("DOMContentLoaded", () => {
    loadDebtors();

    const searchInput = document.getElementById('search-debtor');
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            searchDebtorKeyword = e.target.value.toLowerCase().trim();
            currentDebtorPage = 1;
            renderDebtorTable();
        });
    }

    const dateInput = document.getElementById('custom-date-picker');
    if (dateInput) {
        dateInput.addEventListener('change', () => {
            parseAndFilterCustomCalendar(dateInput.value);
        });
    }
});

async function loadDebtors() {
    try {
        const response = await fetch('/api/debts/debtors');
        allDebtors = await response.json();
        renderDebtorStats();
        renderDebtorTable();
    } catch (error) {
        console.error('Fetch Debtors Error:', error);
    }
}

function parseAndFilterCustomCalendar(val) {
    if (!val || val.trim() === '') {
        customStartDate = null;
        customEndDate = null;
        customLabelText = '';
        currentDebtorPage = 1;
        renderDebtorTable();
        return;
    }

    customLabelText = val;
    customStartDate = null;
    customEndDate = null;
    currentDebtorPage = 1;

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

    renderDebtorTable();
}

function setDebtorFilter(type, btn) {
    currentDebtorFilter = type;
    currentDebtorPage = 1;
    document.querySelectorAll('.debt-tab-btn').forEach(b => {
        b.className = "debt-tab-btn px-3.5 py-1.5 rounded-lg text-xs font-bold text-slate-600 hover:text-slate-900 transition cursor-pointer";
    });
    if (btn) {
        btn.className = "debt-tab-btn px-3.5 py-1.5 rounded-lg text-xs font-bold bg-amber-500 text-white shadow-2xs transition cursor-pointer";
    }
    renderDebtorTable();
}

function renderDebtorStats() {
    let totalDebt = 0;
    let totalPaid = 0;
    let totalRemaining = 0;
    let activeDebtorsCount = 0;

    allDebtors.forEach(d => {
        totalDebt += d.total_debt;
        totalPaid += d.total_paid;
        totalRemaining += d.remaining;
        if (d.remaining > 0) activeDebtorsCount++;
    });

    const formatMoney = (val) => `฿${Number(val).toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

    const setEl = (id, txt) => {
        const el = document.getElementById(id);
        if (el) el.innerText = txt;
    };

    setEl('stat-total-remaining', formatMoney(totalRemaining));
    setEl('stat-debtor-count', activeDebtorsCount.toLocaleString());
    setEl('stat-total-paid', formatMoney(totalPaid));
    setEl('stat-total-debt', formatMoney(totalDebt));
}

function renderDebtorTable() {
    const tbody = document.getElementById('debtor-table-body');
    if (!tbody) return;

    let filtered = allDebtors.filter(d => {
        const matchFilter = (currentDebtorFilter === 'all') || (d.remaining > 0);
        const matchSearch = !searchDebtorKeyword || d.customer_name.toLowerCase().includes(searchDebtorKeyword);
        
        let matchDate = true;
        if (customStartDate && customEndDate) {
            const lastDate = new Date(d.last_date);
            matchDate = lastDate >= customStartDate && lastDate <= customEndDate;
        }

        return matchFilter && matchSearch && matchDate;
    });

    const theadTr = document.querySelector('table thead tr');
    if (theadTr) {
        if (currentDebtorFilter === 'unpaid') {
            theadTr.innerHTML = `
                <th class="p-3.5 w-40">วันที่ติดล่าสุด</th>
                <th class="p-3.5">ชื่อลูกค้า / เบอร์โทร</th>
                <th class="p-3.5 text-center w-28">จำนวนบิล</th>
                <th class="p-3.5 text-right w-36">ยอดคงค้าง</th>
                <th class="p-3.5 text-center w-32">สถานะ</th>
                <th class="p-3.5 text-center w-36">จัดการ</th>
            `;
        } else {
            theadTr.innerHTML = `
                <th class="p-3.5 w-36">วันที่ติดล่าสุด</th>
                <th class="p-3.5">ชื่อลูกค้า / เบอร์โทร</th>
                <th class="p-3.5 text-center w-24">จำนวนบิล</th>
                <th class="p-3.5 text-right w-32">ยอดหนี้สะสม</th>
                <th class="p-3.5 text-right w-32">ชำระแล้ว</th>
                <th class="p-3.5 text-right w-32">ยอดคงเหลือ</th>
                <th class="p-3.5 text-center w-32">สถานะ</th>
                <th class="p-3.5 text-center w-36">จัดการ</th>
            `;
        }
    }

    if (filtered.length === 0) {
        const colSpan = currentDebtorFilter === 'unpaid' ? 6 : 8;
        tbody.innerHTML = `
            <tr>
                <td colspan="${colSpan}" class="text-center py-12 text-slate-400">
                    <svg class="w-10 h-10 mx-auto mb-2 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                    <p class="text-sm font-medium">ไม่พบรายการลูกหนี้ตามเงื่อนไข</p>
                </td>
            </tr>
        `;
        renderDebtorPaginationBar(0);
        return;
    }

    // ⭐️ คำนวณแบ่งหน้า (Pagination) ⭐️
    const totalPages = Math.ceil(filtered.length / DEBTOR_ITEMS_PER_PAGE);
    if (currentDebtorPage > totalPages) currentDebtorPage = totalPages || 1;
    const startIndex = (currentDebtorPage - 1) * DEBTOR_ITEMS_PER_PAGE;
    const paginatedList = filtered.slice(startIndex, startIndex + DEBTOR_ITEMS_PER_PAGE);

    let subtotalBills = 0;
    let subtotalTotalDebt = 0;
    let subtotalPaid = 0;
    let subtotalRemaining = 0;

    const htmlRows = paginatedList.map(d => {
        const dateObj = new Date(d.last_date);
        const formattedDate = dateObj.toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric' });
        const formatMoney = (val) => `฿${Number(val).toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
        const safeName = d.customer_name.replace(/'/g, "\\'");

        subtotalBills += parseInt(d.bill_count) || 0;
        subtotalTotalDebt += parseFloat(d.total_debt) || 0;
        subtotalPaid += parseFloat(d.total_paid) || 0;
        subtotalRemaining += parseFloat(d.remaining) || 0;

        if (currentDebtorFilter === 'unpaid') {
            const statusBadge = `<span class="text-xs font-bold text-rose-600 bg-rose-50 border border-rose-200 px-3 py-1 rounded-xl whitespace-nowrap">ค้างชำระ</span>`;

            return `
                <tr class="hover:bg-slate-50/80 transition">
                    <td class="p-3.5 align-middle text-xs font-semibold text-slate-600 whitespace-nowrap">
                        ${formattedDate}
                    </td>
                    <td class="p-3.5 align-middle font-bold text-slate-800">
                        <span class="truncate max-w-[220px] block">${d.customer_name}</span>
                    </td>
                    <td class="p-3.5 text-center align-middle font-semibold text-slate-600 whitespace-nowrap">
                        ${d.bill_count} บิล
                    </td>
                    <td class="p-3.5 text-right align-middle font-black text-amber-600 whitespace-nowrap">
                        ${formatMoney(d.remaining)}
                    </td>
                    <td class="p-3.5 text-center align-middle whitespace-nowrap">
                        ${statusBadge}
                    </td>
                    <td class="p-3.5 text-center align-middle whitespace-nowrap">
                        <div class="flex items-center justify-center gap-1.5">
                            <button type="button" onclick="openCustomerDetailModal('${safeName}')" 
                                    class="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition flex items-center gap-1 cursor-pointer shadow-2xs">
                                <span>ดูบิล</span>
                            </button>
                            <button type="button" onclick="openPayDebtModal('${safeName}', ${d.remaining})" 
                                    class="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1 cursor-pointer shadow-xs active:scale-95">
                                <span>รับชำระ</span>
                            </button>
                        </div>
                    </td>
                </tr>
            `;
        } else {
            const statusBadge = d.remaining > 0 
                ? `<span class="text-xs font-bold text-rose-600 bg-rose-50 border border-rose-200 px-3 py-1 rounded-xl whitespace-nowrap">ค้างชำระ</span>`
                : `<span class="text-xs font-bold text-emerald-600 bg-emerald-50 border border-emerald-200 px-3 py-1 rounded-xl whitespace-nowrap">ชำระครบแล้ว</span>`;

            return `
                <tr class="hover:bg-slate-50/80 transition">
                    <td class="p-3.5 align-middle text-xs font-semibold text-slate-600 whitespace-nowrap">
                        ${formattedDate}
                    </td>
                    <td class="p-3.5 align-middle font-bold text-slate-800">
                        <span class="truncate max-w-[180px] block">${d.customer_name}</span>
                    </td>
                    <td class="p-3.5 text-center align-middle font-semibold text-slate-600 whitespace-nowrap">
                        ${d.bill_count} บิล
                    </td>
                    <td class="p-3.5 text-right align-middle font-bold text-slate-600 whitespace-nowrap">
                        ${formatMoney(d.total_debt)}
                    </td>
                    <td class="p-3.5 text-right align-middle font-bold text-emerald-600 whitespace-nowrap">
                        ${formatMoney(d.total_paid)}
                    </td>
                    <td class="p-3.5 text-right align-middle font-black text-amber-600 whitespace-nowrap">
                        ${formatMoney(d.remaining)}
                    </td>
                    <td class="p-3.5 text-center align-middle whitespace-nowrap">
                        ${statusBadge}
                    </td>
                    <td class="p-3.5 text-center align-middle whitespace-nowrap">
                        <div class="flex items-center justify-center gap-1.5">
                            <button type="button" onclick="openCustomerDetailModal('${safeName}')" 
                                    class="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition flex items-center gap-1 cursor-pointer shadow-2xs">
                                <span>ดูบิล</span>
                            </button>
                            ${d.remaining > 0 ? `
                            <button type="button" onclick="openPayDebtModal('${safeName}', ${d.remaining})" 
                                    class="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1 cursor-pointer shadow-xs active:scale-95">
                                <span>รับชำระ</span>
                            </button>
                            ` : ''}
                        </div>
                    </td>
                </tr>
            `;
        }
    }).join('');

    let summaryFooterHtml = '';
    const formatMoney = (val) => `฿${Number(val).toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

    if (currentDebtorFilter === 'unpaid') {
        summaryFooterHtml = `
            <tr class="bg-slate-100/90 font-bold border-t-2 border-slate-200/90 text-slate-800">
                <td colspan="2" class="p-3.5 text-left font-black text-sm text-slate-700">
                    แสดงหน้า ${currentDebtorPage} จาก ${totalPages || 1} (รวมทั้งหมด ${filtered.length} คน)
                </td>
                <td class="p-3.5 text-center text-sm font-black text-slate-800 whitespace-nowrap">
                    ${subtotalBills} บิล
                </td>
                <td class="p-3.5 text-right text-base font-black text-amber-600 whitespace-nowrap">
                    ${formatMoney(subtotalRemaining)}
                </td>
                <td colspan="2" class="p-3.5"></td>
            </tr>
        `;
    } else {
        summaryFooterHtml = `
            <tr class="bg-slate-100/90 font-bold border-t-2 border-slate-200/90 text-slate-800">
                <td colspan="2" class="p-3.5 text-left font-black text-sm text-slate-700">
                    แสดงหน้า ${currentDebtorPage} จาก ${totalPages || 1} (รวมทั้งหมด ${filtered.length} คน)
                </td>
                <td class="p-3.5 text-center text-sm font-black text-slate-800 whitespace-nowrap">
                    ${subtotalBills} บิล
                </td>
                <td class="p-3.5 text-right text-sm font-black text-slate-700 whitespace-nowrap">
                    ${formatMoney(subtotalTotalDebt)}
                </td>
                <td class="p-3.5 text-right text-sm font-black text-emerald-600 whitespace-nowrap">
                    ${formatMoney(subtotalPaid)}
                </td>
                <td class="p-3.5 text-right text-base font-black text-amber-600 whitespace-nowrap">
                    ${formatMoney(subtotalRemaining)}
                </td>
                <td colspan="2" class="p-3.5"></td>
            </tr>
        `;
    }

    tbody.innerHTML = htmlRows + summaryFooterHtml;
    renderDebtorPaginationBar(totalPages);
}

// ⭐️ แถบปุ่มกดเปลี่ยนหน้า ⭐️
function renderDebtorPaginationBar(totalPages) {
    let paginationContainer = document.getElementById('debtor-pagination-container');
    if (!paginationContainer) {
        paginationContainer = document.createElement('div');
        paginationContainer.id = 'debtor-pagination-container';
        const tableWrapper = document.getElementById('debtor-table-body').closest('.bg-white');
        if (tableWrapper) tableWrapper.appendChild(paginationContainer);
    }

    if (totalPages <= 1) {
        paginationContainer.innerHTML = '';
        return;
    }

    paginationContainer.className = "p-4 border-t border-slate-100 flex items-center justify-between bg-slate-50/50 rounded-b-2xl";
    paginationContainer.innerHTML = `
        <button onclick="changeDebtorPage(${currentDebtorPage - 1})" 
                class="px-4 py-2 bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 rounded-xl text-xs font-bold transition shadow-2xs cursor-pointer ${currentDebtorPage === 1 ? 'opacity-40 pointer-events-none' : ''}">
            ◀ ก่อนหน้า
        </button>
        <span class="text-xs font-bold text-slate-600">หน้าที่ ${currentDebtorPage} จาก ${totalPages}</span>
        <button onclick="changeDebtorPage(${currentDebtorPage + 1})" 
                class="px-4 py-2 bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 rounded-xl text-xs font-bold transition shadow-2xs cursor-pointer ${currentDebtorPage === totalPages ? 'opacity-40 pointer-events-none' : ''}">
            ถัดไป ▶
        </button>
    `;
}

function changeDebtorPage(page) {
    currentDebtorPage = page;
    renderDebtorTable();
}

// ----------------- 1. Modal ดูรายละเอียดบิล -----------------

async function openCustomerDetailModal(customerName) {
    const container = document.getElementById('debt-modal-container');
    if (!container) return;

    try {
        const res = await fetch(`/api/debts/customer-detail?customer_name=${encodeURIComponent(customerName)}`);
        const data = await res.json();

        if (!data.success) {
            await showCustomModal('warning', 'เกิดข้อผิดพลาด', data.message);
            return;
        }

        const formatMoney = (val) => `฿${Number(val).toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
        const safeCustName = customerName.replace(/'/g, "\\'");

        const totalDebt = data.bills.reduce((sum, b) => sum + parseFloat(b.total || 0), 0);
        const totalPaid = data.payments.reduce((sum, p) => sum + parseFloat(p.amount || 0), 0);
        const totalRemaining = Math.max(0, totalDebt - totalPaid);

        const billsHtml = data.bills.length > 0 ? data.bills.map((b, idx) => {
            const dateStr = new Date(b.created_at).toLocaleDateString('th-TH', { 
                day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' 
            });

            const billTotal = parseFloat(b.total || 0);
            const billReceived = parseFloat(b.received || 0);
            const billRemaining = Math.max(0, Math.round((billTotal - billReceived) * 100) / 100);
            const isBillPaid = billRemaining <= 0;

            const noteHtml = (b.debt_note && b.debt_note.trim() !== '') ? `
                <div class="pt-2 border-t border-slate-100 text-xs flex items-start gap-1.5 select-text">
                    <span class="text-amber-600 font-bold flex-shrink-0">📝 หมายเหตุ:</span>
                    <span class="text-slate-600 leading-relaxed">${b.debt_note}</span>
                </div>
            ` : '';

            const itemsList = b.items.map(it => `
                <div class="flex items-center justify-between py-1 text-xs select-text">
                    <span class="text-slate-700 font-medium truncate pr-2">${it.name}</span>
                    <div class="flex items-center gap-3 flex-shrink-0">
                        <span class="text-slate-400 font-semibold">x${it.qty}</span>
                        <span class="font-bold text-slate-800 w-16 text-right">${formatMoney(it.price * it.qty)}</span>
                    </div>
                </div>
            `).join('');

            return `
                <div class="p-4 bg-white rounded-2xl border border-slate-200 shadow-2xs space-y-2.5 select-text transition hover:border-slate-300">
                    <div class="flex justify-between items-center text-xs pb-2 border-b border-slate-100 select-text">
                        <div class="flex items-center gap-2">
                            <span class="w-5 h-5 rounded-md bg-amber-100 text-amber-800 font-bold text-[10px] flex items-center justify-center">${idx + 1}</span>
                            <span class="font-bold text-slate-800">บิลเลขที่ <span class="font-mono text-slate-600">#${b.id}</span></span>
                        </div>
                        <span class="text-slate-400 text-[11px]">${dateStr} น.</span>
                    </div>
                    <div class="space-y-0.5 px-0.5">${itemsList}</div>
                    ${noteHtml}
                    <div class="flex justify-between items-center pt-2.5 border-t border-dashed border-slate-200 text-xs select-text">
                        <div>
                            <span class="text-slate-400 font-medium">ยอดบิล:</span>
                            <span class="font-black text-slate-800 ml-1">${formatMoney(b.total)}</span>
                        </div>
                        <div>
                            ${isBillPaid ? `
                                <span class="text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-xl shadow-2xs">
                                    ✓ ชำระแล้ว
                                </span>
                            ` : `
                                <button type="button" 
                                        onclick="closeDebtModal(); openPayDebtModal('${safeCustName}', ${billRemaining}, '${b.id}')"
                                        class="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white rounded-xl text-xs font-bold transition flex items-center gap-1 cursor-pointer shadow-2xs">
                                    <span>💵 ชำระบิลนี้ (${formatMoney(billRemaining)})</span>
                                </button>
                            `}
                        </div>
                    </div>
                </div>
            `;
        }).join('') : '<p class="text-xs text-slate-400 text-center py-6">ไม่มีรายการบิลค้างชำระ</p>';

        const paymentsHtml = data.payments.length > 0 ? data.payments.map(p => {
            const dateStr = new Date(p.created_at).toLocaleDateString('th-TH', { 
                day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' 
            });

            let methodLabel = 'เงินสด';
            let iconSymbol = '💵';
            let badgeBg = 'bg-emerald-100 text-emerald-600';
            let labelColor = 'text-emerald-700';

            if (p.payment_method === 'transfer') {
                methodLabel = 'สแกน/โอน';
                iconSymbol = '💳';
                badgeBg = 'bg-indigo-100 text-indigo-600';
                labelColor = 'text-indigo-600';
            } else if (p.payment_method === 'gov') {
                methodLabel = 'โครงการรัฐ';
                iconSymbol = '🏛️';
                badgeBg = 'bg-sky-100 text-sky-600';
                labelColor = 'text-sky-600';
            }

            return `
                <div class="flex items-center justify-between p-3 bg-slate-50 border border-slate-200/80 rounded-2xl shadow-2xs select-text">
                    <div class="flex items-center gap-2.5">
                        <div class="w-8 h-8 rounded-xl ${badgeBg} flex items-center justify-center font-bold text-xs flex-shrink-0">
                            ${iconSymbol}
                        </div>
                        <div>
                            <p class="font-bold text-slate-800 text-xs">
                                ${formatMoney(p.amount)} 
                                <span class="text-[11px] font-semibold ${labelColor}">(${methodLabel})</span>
                            </p>
                            <p class="text-[10px] text-slate-400 mt-0.5">${dateStr} น.</p>
                        </div>
                    </div>
                    <span class="text-[11px] font-bold text-emerald-700 bg-white border border-emerald-200 px-2 py-0.5 rounded-lg shadow-2xs">
                        ชำระแล้ว
                    </span>
                </div>
            `;
        }).join('') : '<p class="text-xs text-slate-400 text-center py-3 bg-slate-50 rounded-2xl border border-dashed border-slate-200">ยังไม่มีประวัติการนำเงินมาจ่ายเคลียร์</p>';

        container.innerHTML = `
        <div id="customer-detail-modal" 
             onclick="if(event.target === this) closeDebtModal()" 
             class="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-3 sm:p-4 backdrop-blur-xs">
            <div class="bg-white w-full max-w-xl p-5 sm:p-6 rounded-3xl shadow-2xl space-y-4 border border-slate-100 max-h-[90vh] flex flex-col animate-in fade-in zoom-in-95"
                 onclick="event.stopPropagation()">
                <div class="flex items-center justify-between border-b border-slate-100 pb-3 flex-shrink-0">
                    <div class="flex items-center gap-2.5">
                        <div class="w-10 h-10 bg-amber-50 text-amber-600 rounded-2xl flex items-center justify-center border border-amber-200 shadow-2xs flex-shrink-0">
                            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"/>
                            </svg>
                        </div>
                        <div>
                            <h3 class="text-base sm:text-lg font-bold text-slate-800 leading-tight">ประวัติการติดเงิน & การรับชำระ</h3>
                            <p class="text-xs font-bold text-amber-600 mt-0.5">ลูกค้า: <span class="text-slate-900">${customerName}</span></p>
                        </div>
                    </div>
                    <button type="button" onclick="closeDebtModal()" title="ปิดหน้าต่าง" class="text-slate-400 hover:text-slate-800 hover:bg-slate-100 w-9 h-9 flex items-center justify-center rounded-2xl transition active:scale-90 cursor-pointer flex-shrink-0">
                        <svg class="w-5 h-5 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
                    </button>
                </div>

                <div class="grid grid-cols-3 gap-2 flex-shrink-0">
                    <div class="p-2.5 bg-slate-50 rounded-2xl border border-slate-200 text-center shadow-2xs">
                        <p class="text-[10px] font-bold text-slate-400 uppercase">ยอดหนี้สะสม</p>
                        <p class="text-xs sm:text-sm font-black text-slate-800 mt-0.5">${formatMoney(totalDebt)}</p>
                    </div>
                    <div class="p-2.5 bg-emerald-50/70 rounded-2xl border border-emerald-200 text-center shadow-2xs">
                        <p class="text-[10px] font-bold text-emerald-700 uppercase">ชำระคืนแล้ว</p>
                        <p class="text-xs sm:text-sm font-black text-emerald-600 mt-0.5">${formatMoney(totalPaid)}</p>
                    </div>
                    <div class="p-2.5 bg-amber-50 rounded-2xl border border-amber-300 text-center shadow-xs">
                        <p class="text-[10px] font-bold text-amber-800 uppercase">ยอดคงค้าง</p>
                        <p class="text-sm sm:text-base font-black text-amber-600 mt-0.5">${formatMoney(totalRemaining)}</p>
                    </div>
                </div>

                <div class="space-y-3.5 overflow-y-auto pr-1 flex-1">
                    <div>
                        <p class="text-xs font-bold text-slate-600 mb-2 flex items-center gap-1"><span>🧾</span> รายการบิลสินค้า (${data.bills.length} บิล)</p>
                        <div class="space-y-2.5">${billsHtml}</div>
                    </div>
                    <div class="pt-2 border-t border-slate-100">
                        <p class="text-xs font-bold text-slate-600 mb-2 flex items-center gap-1"><span>💰</span> ประวัติการจ่ายเงิน (${data.payments.length} ครั้ง)</p>
                        <div class="space-y-2">${paymentsHtml}</div>
                    </div>
                </div>

                ${totalRemaining > 0 ? `
                <div class="pt-2 border-t border-slate-100 flex-shrink-0">
                    <button type="button" onclick="closeDebtModal(); openPayDebtModal('${safeCustName}', ${totalRemaining})" 
                            class="w-full py-3 bg-emerald-600 hover:bg-emerald-700 active:scale-98 text-white font-bold rounded-2xl text-sm transition shadow-md shadow-emerald-600/20 cursor-pointer flex items-center justify-center gap-1.5">
                        <span>💵 รับชำระหนี้ทั้งหมด (${formatMoney(totalRemaining)})</span>
                    </button>
                </div>
                ` : ''}
            </div>
        </div>
        `;
    } catch (e) {
        console.error(e);
    }
}

// ----------------- 2. Modal รับชำระหนี้ -----------------

let currentPayingCustomer = '';
let currentPayingRemaining = 0;
let currentPayingBillId = '';
let currentPayMethod = 'cash';

function openPayDebtModal(customerName, remainingDebt, targetBillId = '') {
    const container = document.getElementById('debt-modal-container');
    if (!container) return;

    currentPayingCustomer = customerName;
    currentPayingRemaining = remainingDebt;
    currentPayingBillId = targetBillId || '';
    currentPayMethod = 'cash';

    renderPayDebtModalHTML();
}

function renderPayDebtModalHTML() {
    const container = document.getElementById('debt-modal-container');
    if (!container) return;

    const formatMoney = (val) => `฿${Number(val).toLocaleString('th-TH', { minimumFractionDigits: 2 })}`;
    const billTargetHint = currentPayingBillId ? `<span class="text-amber-600 font-bold">(เฉพาะบิล #${currentPayingBillId})</span>` : '';

    container.innerHTML = `
    <div id="pay-debt-modal" 
         onclick="if(event.target === this) closeDebtModal()"
         class="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
        
        <div class="bg-white w-full max-w-md p-6 sm:p-7 rounded-3xl shadow-2xl space-y-4 border border-slate-100 animate-in fade-in zoom-in-95"
             onclick="event.stopPropagation()">
            
            <div class="flex items-center justify-between border-b border-slate-100 pb-3.5 flex-shrink-0">
                <div class="flex items-center gap-2.5">
                    <div id="pay-modal-badge" class="w-10 h-10 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center border border-emerald-100 shadow-2xs flex-shrink-0 transition-colors">
                        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z"/>
                        </svg>
                    </div>
                    <div>
                        <h3 class="text-lg font-bold text-slate-800 leading-tight">รับชำระหนี้ / เคลียร์ยอด</h3>
                        <p class="text-xs text-slate-600 mt-0.5">ลูกค้า: <b class="text-slate-900">${currentPayingCustomer}</b> ${billTargetHint}</p>
                    </div>
                </div>
                <button type="button" 
                        onclick="closeDebtModal()" 
                        title="ปิดหน้าต่าง" 
                        class="text-slate-400 hover:text-slate-800 hover:bg-slate-100 w-8 h-8 flex items-center justify-center rounded-full transition cursor-pointer">
                    <svg class="w-5 h-5 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
                </button>
            </div>

            <div class="bg-amber-50/70 border border-amber-200 rounded-2xl p-4 text-center">
                <p class="text-xs font-semibold text-amber-700 mb-0.5">ยอดหนี้ที่ต้องชำระ</p>
                <p class="text-3xl sm:text-4xl font-black text-amber-600">${formatMoney(currentPayingRemaining)}</p>
            </div>

            <div class="grid grid-cols-3 gap-2">
                <button type="button" id="debt-tab-cash" onclick="setPayDebtMethod('cash')" 
                        class="py-2.5 px-1.5 rounded-2xl border-2 transition-all flex items-center justify-center gap-1 text-xs font-bold cursor-pointer active:scale-95 whitespace-nowrap bg-emerald-50 border-emerald-500 text-emerald-700 shadow-xs">
                    <svg class="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z"/></svg>
                    <span>เงินสด</span>
                </button>

                <button type="button" id="debt-tab-transfer" onclick="setPayDebtMethod('transfer')" 
                        class="py-2.5 px-1.5 rounded-2xl border-2 transition-all flex items-center justify-center gap-1 text-xs font-bold cursor-pointer active:scale-95 whitespace-nowrap bg-white border-slate-200 text-slate-600 hover:bg-slate-50">
                    <svg class="w-4 h-4 flex-shrink-0 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z"/></svg>
                    <span>สแกน/โอน</span>
                </button>

                <button type="button" id="debt-tab-gov" onclick="setPayDebtMethod('gov')" 
                        class="py-2.5 px-1.5 rounded-2xl border-2 transition-all flex items-center justify-center gap-1 text-xs font-bold cursor-pointer active:scale-95 whitespace-nowrap bg-white border-slate-200 text-slate-600 hover:bg-slate-50">
                    <svg class="w-4 h-4 flex-shrink-0 text-sky-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"/></svg>
                    <span>โครงการรัฐ</span>
                </button>
            </div>

            <div id="debt-cash-section" class="space-y-3">
                <div>
                    <label class="block text-xs font-semibold text-slate-600 mb-1">จำนวนเงินที่ลูกค้านำมาจ่าย (บาท)</label>
                    <input type="number" id="pay-debt-amount" step="any" value="${currentPayingRemaining}" 
                           class="w-full text-center text-2xl sm:text-3xl font-bold py-3.5 px-4 leading-normal bg-white border-2 border-emerald-500 rounded-2xl text-slate-800 focus:outline-none shadow-2xs">
                </div>

                <div class="grid grid-cols-4 gap-1.5">
                    <button type="button" onclick="document.getElementById('pay-debt-amount').value = ${currentPayingRemaining}" class="py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition cursor-pointer active:scale-95">จ่ายครบ</button>
                    <button type="button" onclick="addPayDebtCash(100)" class="py-2.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-bold rounded-xl text-xs transition cursor-pointer active:scale-95">+100</button>
                    <button type="button" onclick="addPayDebtCash(500)" class="py-2.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-bold rounded-xl text-xs transition cursor-pointer active:scale-95">+500</button>
                    <button type="button" onclick="addPayDebtCash(1000)" class="py-2.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-bold rounded-xl text-xs transition cursor-pointer active:scale-95">+1,000</button>
                </div>
            </div>

            <div id="debt-digital-section" class="hidden p-5 bg-slate-50 rounded-2xl border border-slate-200/80 text-center space-y-2">
                <div id="debt-digital-icon-badge" class="w-12 h-12 mx-auto rounded-2xl flex items-center justify-center shadow-2xs transition"></div>
                <p id="debt-digital-title" class="text-sm font-bold text-slate-800"></p>
                <p class="text-xs text-slate-500">ตรวจสอบยอดชำระ <span id="debt-digital-amount" class="font-bold">${formatMoney(currentPayingRemaining)}</span> ครบถ้วนแล้วกดยืนยัน</p>
            </div>

            <div class="pt-2 border-t border-slate-100">
                <button type="button" id="btn-submit-pay-debt" onclick="submitPayDebt()" 
                        class="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 active:scale-98 text-white font-bold rounded-2xl text-base transition shadow-lg shadow-emerald-600/25 cursor-pointer">
                    ยืนยันการรับชำระหนี้
                </button>
            </div>
        </div>
    </div>
    `;

    setPayDebtMethod(currentPayMethod);
}

function setPayDebtMethod(method) {
    currentPayMethod = method;

    const tabCash = document.getElementById('debt-tab-cash');
    const tabTransfer = document.getElementById('debt-tab-transfer');
    const tabGov = document.getElementById('debt-tab-gov');
    const cashSection = document.getElementById('debt-cash-section');
    const digitalSection = document.getElementById('debt-digital-section');
    const digitalBadge = document.getElementById('debt-digital-icon-badge');
    const digitalTitle = document.getElementById('debt-digital-title');
    const digitalAmount = document.getElementById('debt-digital-amount');
    const btnSubmit = document.getElementById('btn-submit-pay-debt');
    const modalBadge = document.getElementById('pay-modal-badge');

    if (!tabCash || !cashSection || !digitalSection) return;

    const inactiveClass = 'py-2.5 px-1.5 rounded-2xl border-2 transition-all flex items-center justify-center gap-1 text-xs font-bold cursor-pointer active:scale-95 whitespace-nowrap bg-white border-slate-200 text-slate-600 hover:bg-slate-50';
    [tabCash, tabTransfer, tabGov].forEach(tab => { if (tab) tab.className = inactiveClass; });

    if (method === 'cash') {
        tabCash.className = 'py-2.5 px-1.5 rounded-2xl border-2 transition-all flex items-center justify-center gap-1 text-xs font-bold cursor-pointer active:scale-95 whitespace-nowrap bg-emerald-50 border-emerald-500 text-emerald-700 shadow-xs';
        cashSection.classList.remove('hidden');
        digitalSection.classList.add('hidden');

        if (btnSubmit) {
            btnSubmit.innerText = 'ยืนยันการรับชำระหนี้';
            btnSubmit.className = 'w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 active:scale-98 text-white font-bold rounded-2xl text-base transition shadow-lg shadow-emerald-600/25 cursor-pointer';
        }
        if (modalBadge) {
            modalBadge.className = 'w-10 h-10 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center border border-emerald-100 shadow-2xs flex-shrink-0 transition-colors';
        }
    } else {
        cashSection.classList.add('hidden');
        digitalSection.classList.remove('hidden');

        if (method === 'transfer') {
            tabTransfer.className = 'py-2.5 px-1.5 rounded-2xl border-2 transition-all flex items-center justify-center gap-1 text-xs font-bold cursor-pointer active:scale-95 whitespace-nowrap bg-indigo-50 border-indigo-500 text-indigo-700 shadow-xs';
            digitalBadge.className = 'w-12 h-12 mx-auto rounded-2xl flex items-center justify-center bg-indigo-100 text-indigo-600 shadow-2xs';
            digitalBadge.innerHTML = `
                <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z"/>
                </svg>
            `;
            digitalTitle.innerText = 'สแกน QR Code / เงินโอนธนาคาร';
            if (digitalAmount) digitalAmount.className = 'font-bold text-indigo-600';

            if (btnSubmit) {
                btnSubmit.innerText = 'ยืนยันการชำระเงิน';
                btnSubmit.className = 'w-full py-3.5 bg-indigo-600 hover:bg-indigo-700 active:scale-98 text-white font-bold rounded-2xl text-base transition shadow-lg shadow-indigo-600/25 cursor-pointer';
            }
            if (modalBadge) {
                modalBadge.className = 'w-10 h-10 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center border border-indigo-100 shadow-2xs flex-shrink-0 transition-colors';
            }

        } else if (method === 'gov') {
            tabGov.className = 'py-2.5 px-1.5 rounded-2xl border-2 transition-all flex items-center justify-center gap-1 text-xs font-bold cursor-pointer active:scale-95 whitespace-nowrap bg-sky-50 border-sky-500 text-sky-700 shadow-xs';
            digitalBadge.className = 'w-12 h-12 mx-auto rounded-2xl flex items-center justify-center bg-sky-100 text-sky-500 shadow-2xs';
            digitalBadge.innerHTML = `
                <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"/>
                </svg>
            `;
            digitalTitle.innerText = 'โครงการรัฐ (เป๋าตัง / บัตรสวัสดิการแห่งรัฐ)';
            if (digitalAmount) digitalAmount.className = 'font-bold text-sky-500';

            if (btnSubmit) {
                btnSubmit.innerText = 'ยืนยันการชำระเงิน';
                btnSubmit.className = 'w-full py-3.5 bg-sky-500 hover:bg-sky-600 active:scale-98 text-white font-bold rounded-2xl text-base transition shadow-lg shadow-sky-500/25 cursor-pointer';
            }
            if (modalBadge) {
                modalBadge.className = 'w-10 h-10 bg-sky-50 text-sky-600 rounded-2xl flex items-center justify-center border border-sky-100 shadow-2xs flex-shrink-0 transition-colors';
            }
        }
    }
}

function addPayDebtCash(amount) {
    const input = document.getElementById('pay-debt-amount');
    if (input) {
        const val = parseFloat(input.value) || 0;
        input.value = (val + amount);
    }
}

function closeDebtModal() {
    const container = document.getElementById('debt-modal-container');
    if (container) container.innerHTML = '';
    currentPayingBillId = '';
}

async function submitPayDebt() {
    let amount = currentPayingRemaining;

    if (currentPayMethod === 'cash') {
        const input = document.getElementById('pay-debt-amount');
        amount = parseFloat(input?.value) || 0;
    }

    if (amount <= 0) {
        await showCustomModal('warning', 'ยอดเงินไม่ถูกต้อง', 'กรุณาระบุยอดเงินที่ชำระมากกว่า 0 บาท');
        return;
    }

    try {
        const res = await fetch('/api/debts/pay', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                customer_name: currentPayingCustomer,
                amount: amount,
                payment_method: currentPayMethod,
                bill_id: currentPayingBillId
            })
        });
        const result = await res.json();

        if (result.success) {
            closeDebtModal();
            const billText = currentPayingBillId ? ` (บิล #${currentPayingBillId})` : '';
            await showCustomModal(
                'success', 
                'บันทึกรับชำระสำเร็จ!', 
                `รับเงินจาก <b>${currentPayingCustomer}</b>${billText} จำนวน ฿${amount.toLocaleString('th-TH', {minimumFractionDigits: 2})} เรียบร้อยแล้ว`
            );
            loadDebtors();
        } else {
            await showCustomModal('warning', 'เกิดข้อผิดพลาด', result.message);
        }
    } catch (e) {
        console.error(e);
        await showCustomModal('warning', 'เกิดข้อผิดพลาด', 'ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์ได้');
    }
}