// ----------------- ระบบปฏิทินเลือกวันที่สไตล์ iOS (js/calendar.js) -----------------

let calViewDate = new Date(); // เดือน-ปีที่กำลังเปิดดู
let calStartDate = null;
let calEndDate = null;
let calSelectionMode = 'single'; // 'single' (วันเดียว) | 'range' (ช่วงวันที่) | 'month' (ทั้งเดือน)
let activeTargetInput = null;

const thaiMonthNames = [
    "มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", "พฤษภาคม", "มิถุนายน",
    "กรกฎาคม", "สิงหาคม", "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม"
];

const thaiDayNames = ["อา", "จ", "อ", "พ", "พฤ", "ศ", "ส"];

document.addEventListener("DOMContentLoaded", () => {
    initCalendarTriggers();
});

// ตรวจจับการกด Input หรือปุ่มเปิดปฏิทิน
function initCalendarTriggers() {
    document.querySelectorAll('#custom-date-picker, .calendar-trigger').forEach(input => {
        input.addEventListener('click', (e) => {
            e.preventDefault();
            openCalendarModal(input);
        });
    });
}

function openCalendarModal(targetInput) {
    activeTargetInput = targetInput;
    calViewDate = new Date();
    calStartDate = null;
    calEndDate = null;
    
    // ดึงค่าเดิมมาแสดงผลถ้ามี
    if (targetInput && targetInput.value) {
        parseExistingInputValue(targetInput.value);
    }

    renderCalendarModalHTML();
}

function parseExistingInputValue(val) {
    if (val.includes('/')) {
        const parts = val.split('-').map(s => s.trim());
        if (parts.length === 1) {
            const [d, m, y] = parts[0].split('/').map(Number);
            calStartDate = new Date(y - 543, m - 1, d);
            calViewDate = new Date(calStartDate);
            calSelectionMode = 'single';
        } else if (parts.length === 2) {
            const [d1, m1, y1] = parts[0].split('/').map(Number);
            const [d2, m2, y2] = parts[1].split('/').map(Number);
            calStartDate = new Date(y1 - 543, m1 - 1, d1);
            calEndDate = new Date(y2 - 543, m2 - 1, d2);
            calViewDate = new Date(calStartDate);
            calSelectionMode = 'range';
        }
    }
}

function renderCalendarModalHTML() {
    let container = document.getElementById('calendar-modal-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'calendar-modal-container';
        document.body.appendChild(container);
    }

    const yearThai = calViewDate.getFullYear() + 543;
    const monthNameThai = thaiMonthNames[calViewDate.getMonth()];

    container.innerHTML = `
    <div id="ios-calendar-modal" 
         onclick="if(event.target === this) closeCalendarModal()"
         class="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-3 sm:p-4">
        
        <div class="bg-white w-full max-w-sm sm:max-w-md p-5 sm:p-6 rounded-[28px] shadow-2xl border border-slate-100 space-y-4 animate-in fade-in zoom-in-95"
             onclick="event.stopPropagation()">
            
            <!-- ส่วนหัว Modal -->
            <div class="flex items-center justify-between pb-1">
                <div class="flex items-center gap-2.5">
                    <div class="w-9 h-9 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-100/80 shadow-2xs">
                        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/>
                        </svg>
                    </div>
                    <div>
                        <h3 class="text-base font-bold text-slate-900 leading-tight">เลือกวันที่ / ช่วงเวลา</h3>
                        <p class="text-[11px] text-slate-400 font-medium">ระบุวันที่ต้องการค้นหาข้อมูล</p>
                    </div>
                </div>
                <button type="button" onclick="closeCalendarModal()" 
                        class="text-slate-400 hover:text-slate-800 hover:bg-slate-100 w-8 h-8 flex items-center justify-center rounded-full transition cursor-pointer">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
                </button>
            </div>

            <!-- แท็บโหมดการเลือก (iOS Segmented Control) -->
            <div class="grid grid-cols-3 gap-1 bg-slate-100 p-1 rounded-2xl border border-slate-200/60 shadow-inner">
                <button type="button" onclick="setCalendarMode('single')" 
                        class="py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${calSelectionMode === 'single' ? 'bg-white text-blue-600 shadow-2xs' : 'text-slate-600 hover:text-slate-900'}">
                    วันเดียว
                </button>
                <button type="button" onclick="setCalendarMode('range')" 
                        class="py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${calSelectionMode === 'range' ? 'bg-white text-blue-600 shadow-2xs' : 'text-slate-600 hover:text-slate-900'}">
                    ช่วงวันที่
                </button>
                <button type="button" onclick="setCalendarMode('month')" 
                        class="py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${calSelectionMode === 'month' ? 'bg-white text-blue-600 shadow-2xs' : 'text-slate-600 hover:text-slate-900'}">
                    ทั้งเดือน
                </button>
            </div>

            <!-- แถบนำทาง เดือน / ปี -->
            <div class="flex items-center justify-between px-2 pt-1">
                <button type="button" onclick="navigateCalendarMonth(-1)" 
                        class="w-8 h-8 flex items-center justify-center rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-600 transition active:scale-90 cursor-pointer">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M15 19l-7-7 7-7"/></svg>
                </button>
                <span class="text-sm font-bold text-slate-800">${monthNameThai} ${yearThai}</span>
                <button type="button" onclick="navigateCalendarMonth(1)" 
                        class="w-8 h-8 flex items-center justify-center rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-600 transition active:scale-90 cursor-pointer">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M9 5l7 7-7 7"/></svg>
                </button>
            </div>

            <!-- ส่วนตารางปฏิทิน -->
            ${calSelectionMode === 'month' ? renderMonthPickerGridHTML() : renderDaysCalendarGridHTML()}

            <!-- ปุ่มลัดเลือกด่วน -->
            <div class="flex items-center justify-between gap-1.5 pt-2 border-t border-slate-100">
                <button type="button" onclick="selectCalendarShortcut('today')" class="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-[11px] transition cursor-pointer">วันนี้</button>
                <button type="button" onclick="selectCalendarShortcut('yesterday')" class="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-[11px] transition cursor-pointer">เมื่อวาน</button>
                <button type="button" onclick="selectCalendarShortcut('thisMonth')" class="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-[11px] transition cursor-pointer">เดือนนี้</button>
                <button type="button" onclick="clearCalendarValue()" class="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 font-bold rounded-xl text-[11px] transition cursor-pointer">ล้างค่า</button>
            </div>

            <!-- ปุ่มกดยืนยัน -->
            <button type="button" onclick="applyCalendarSelection()" 
                    class="w-full py-3 bg-blue-600 hover:bg-blue-700 active:scale-98 text-white rounded-2xl text-sm font-bold shadow-md shadow-blue-600/20 transition cursor-pointer">
                ตกลง / เลือกวันที่
            </button>
        </div>
    </div>
    `;
}

// สร้างตารางตารางวัน (อาทิตย์ - เสาร์)
function renderDaysCalendarGridHTML() {
    const year = calViewDate.getFullYear();
    const month = calViewDate.getMonth();
    
    const firstDayIndex = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const today = new Date();

    let gridHtml = `
        <div class="grid grid-cols-7 gap-1 text-center">
            ${thaiDayNames.map(d => `<span class="text-[11px] font-bold text-slate-400 py-1">${d}</span>`).join('')}
    `;

    // ช่องว่างก่อนวันแรกของเดือน
    for (let i = 0; i < firstDayIndex; i++) {
        gridHtml += `<div class="p-1"></div>`;
    }

    // สร้างปุ่มแต่ละวัน
    for (let day = 1; day <= daysInMonth; day++) {
        const thisDate = new Date(year, month, day);
        const isToday = thisDate.toDateString() === today.toDateString();

        let isSelected = false;
        let isInRange = false;

        if (calStartDate && thisDate.toDateString() === calStartDate.toDateString()) {
            isSelected = true;
        }
        if (calEndDate && thisDate.toDateString() === calEndDate.toDateString()) {
            isSelected = true;
        }
        if (calStartDate && calEndDate && thisDate > calStartDate && thisDate < calEndDate) {
            isInRange = true;
        }

        let btnClass = "w-8 h-8 sm:w-9 sm:h-9 mx-auto rounded-xl flex items-center justify-center text-xs font-bold transition cursor-pointer select-none ";

        if (isSelected) {
            btnClass += "bg-blue-600 text-white shadow-2xs scale-105";
        } else if (isInRange) {
            btnClass += "bg-blue-50 text-blue-700 rounded-none w-full";
        } else if (isToday) {
            btnClass += "bg-slate-100 text-blue-600 border border-blue-200 hover:bg-slate-200";
        } else {
            btnClass += "text-slate-700 hover:bg-slate-100";
        }

        gridHtml += `
            <div class="py-0.5">
                <button type="button" onclick="onCalendarDayClick(${year}, ${month}, ${day})" class="${btnClass}">
                    ${day}
                </button>
            </div>
        `;
    }

    gridHtml += `</div>`;
    return gridHtml;
}

// โหมดเลือกเดือน
function renderMonthPickerGridHTML() {
    const year = calViewDate.getFullYear();
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();

    return `
        <div class="grid grid-cols-3 gap-2 py-2">
            ${thaiMonthNames.map((name, mIdx) => {
                const isSelected = (calStartDate && calStartDate.getMonth() === mIdx && calStartDate.getFullYear() === year);
                const isCurrent = (mIdx === currentMonth && year === currentYear);

                let btnClass = "py-2.5 px-2 rounded-xl text-xs font-bold transition cursor-pointer select-none border ";
                if (isSelected) {
                    btnClass += "bg-blue-600 text-white border-blue-600 shadow-2xs";
                } else if (isCurrent) {
                    btnClass += "bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100";
                } else {
                    btnClass += "bg-slate-50 border-slate-200/80 text-slate-700 hover:bg-slate-100";
                }

                return `
                    <button type="button" onclick="onCalendarMonthSelect(${mIdx})" class="${btnClass}">
                        ${name}
                    </button>
                `;
            }).join('')}
        </div>
    `;
}

function setCalendarMode(mode) {
    calSelectionMode = mode;
    calStartDate = null;
    calEndDate = null;
    renderCalendarModalHTML();
}

function navigateCalendarMonth(delta) {
    calViewDate.setMonth(calViewDate.getMonth() + delta);
    renderCalendarModalHTML();
}

function onCalendarDayClick(year, month, day) {
    const pickedDate = new Date(year, month, day);

    if (calSelectionMode === 'single') {
        calStartDate = pickedDate;
        calEndDate = null;
        applyCalendarSelection(); // ถ้าเลือกวันเดียวให้บันทึกเลยทันที
    } else if (calSelectionMode === 'range') {
        if (!calStartDate || (calStartDate && calEndDate)) {
            calStartDate = pickedDate;
            calEndDate = null;
        } else {
            if (pickedDate < calStartDate) {
                calEndDate = calStartDate;
                calStartDate = pickedDate;
            } else {
                calEndDate = pickedDate;
            }
        }
        renderCalendarModalHTML();
    }
}

function onCalendarMonthSelect(monthIndex) {
    const year = calViewDate.getFullYear();
    calStartDate = new Date(year, monthIndex, 1);
    calEndDate = new Date(year, monthIndex + 1, 0);
    applyCalendarSelection();
}

function selectCalendarShortcut(type) {
    const now = new Date();
    if (type === 'today') {
        calStartDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        calEndDate = null;
        calSelectionMode = 'single';
    } else if (type === 'yesterday') {
        const yest = new Date(now);
        yest.setDate(yest.getDate() - 1);
        calStartDate = new Date(yest.getFullYear(), yest.getMonth(), yest.getDate());
        calEndDate = null;
        calSelectionMode = 'single';
    } else if (type === 'thisMonth') {
        calStartDate = new Date(now.getFullYear(), now.getMonth(), 1);
        calEndDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        calSelectionMode = 'month';
    }
    applyCalendarSelection();
}

function formatToThaiDMY(date) {
    const d = String(date.getDate()).padStart(2, '0');
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const y = date.getFullYear() + 543;
    return `${d}/${m}/${y}`;
}

function applyCalendarSelection() {
    if (!activeTargetInput) {
        closeCalendarModal();
        return;
    }

    let finalStr = '';

    if (calSelectionMode === 'month' && calStartDate) {
        finalStr = `${thaiMonthNames[calStartDate.getMonth()]} ${calStartDate.getFullYear() + 543}`;
    } else if (calStartDate && calEndDate) {
        finalStr = `${formatToThaiDMY(calStartDate)} - ${formatToThaiDMY(calEndDate)}`;
    } else if (calStartDate) {
        finalStr = formatToThaiDMY(calStartDate);
    }

    if (finalStr) {
        activeTargetInput.value = finalStr;
        // ส่ง Event change เพื่อให้ history.js กรองข้อมูลให้อัตโนมัติ
        activeTargetInput.dispatchEvent(new Event('change'));
    }

    closeCalendarModal();
}

function clearCalendarValue() {
    if (activeTargetInput) {
        activeTargetInput.value = '';
        activeTargetInput.dispatchEvent(new Event('change'));
    }
    closeCalendarModal();
}

function closeCalendarModal() {
    const modal = document.getElementById('ios-calendar-modal');
    if (modal) modal.remove();
}