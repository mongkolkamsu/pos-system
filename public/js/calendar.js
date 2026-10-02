/**
 * 📅 Modern Calendar Picker Component (Thai Buddhist Era)
 * - แตะ/คลิกปกติ = เลือกวันเดียวทันที
 * - กดค้างแล้วลาก = เลือกช่วงหลายวัน
 */
class LantoCalendar {
    constructor() {
        this.currentDate = new Date();
        this.mode = 'day'; // 'day' | 'month'
        this.startDate = null;
        this.endDate = null;
        this.hoverDate = null;
        this.targetInput = null;

        // ตัวแปรสำหรับตรวจจับการลาก
        this.isDragging = false;
        this.dragMoved = false;
        this.downCellDate = null;

        this.startMonthIdx = null;
        this.endMonthIdx = null;

        this.viewMonth = this.currentDate.getMonth();
        this.viewYear = this.currentDate.getFullYear();
        this.thaiMonths = [
            "มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", "พฤษภาคม", "มิถุนายน",
            "กรกฎาคม", "สิงหาคม", "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม"
        ];
        this.thaiDays = ["อา", "จ", "อ", "พ", "พฤ", "ศ", "ส"];
        this.init();
    }

    init() {
        if (document.getElementById("lanto-calendar-modal")) return;
        this.createModal();
        this.bindEvents();
    }

    createModal() {
        const modalHTML = `
        <div id="lanto-calendar-modal" style="z-index: 999999 !important;" class="fixed inset-0 hidden flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/40 backdrop-blur-xs transition-opacity duration-200 select-none">
            <div class="relative w-full sm:max-w-md bg-white/95 backdrop-blur-2xl rounded-t-[2.5rem] sm:rounded-[2.5rem] border border-white/80 shadow-[0_20px_50px_rgba(0,0,0,0.2)] p-6 space-y-3.5 animate-in slide-in-from-bottom-5 duration-200" onclick="event.stopPropagation()">
                
                <!-- 🍏 1. Segmented Control -->
                <div class="flex p-1 bg-slate-100 rounded-2xl">
                    <button type="button" id="cal-mode-day-btn" class="flex-1 py-1.5 rounded-xl text-xs font-bold transition-all bg-white text-slate-800 shadow-xs cursor-pointer">
                        เลือกช่วงวัน
                    </button>
                    <button type="button" id="cal-mode-month-btn" class="flex-1 py-1.5 rounded-xl text-xs font-bold transition-all text-slate-500 hover:text-slate-800 cursor-pointer">
                        เลือกหลายเดือน
                    </button>
                </div>

                <!-- 2. Header -->
                <div class="flex items-center justify-between pb-2 border-b border-slate-100 relative">
                    <div class="flex items-center gap-1.5 relative">
                        <div id="cal-month-dropdown-wrapper" class="relative">
                            <button type="button" id="cal-month-btn" class="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200/80 rounded-2xl text-xs font-bold text-slate-800 transition-all active:scale-95 outline-none cursor-pointer">
                                <span id="cal-month-label">เดือน</span>
                                <svg class="w-3 h-3 text-slate-400" fill="none" stroke="currentColor" stroke-width="2.2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5"/></svg>
                            </button>
                            <div id="cal-month-menu" class="hidden absolute left-0 top-full mt-1.5 w-36 max-h-52 overflow-y-auto bg-white border border-slate-200/80 rounded-2xl shadow-xl p-1.5 space-y-0.5 z-[1000000] text-xs"></div>
                        </div>

                        <div class="relative">
                            <button type="button" id="cal-year-btn" class="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200/80 rounded-2xl text-xs font-bold text-slate-800 transition-all active:scale-95 outline-none cursor-pointer">
                                <span id="cal-year-label">ปี พ.ศ.</span>
                                <svg class="w-3 h-3 text-slate-400" fill="none" stroke="currentColor" stroke-width="2.2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5"/></svg>
                            </button>
                            <div id="cal-year-menu" class="hidden absolute left-0 top-full mt-1.5 w-28 max-h-52 overflow-y-auto bg-white border border-slate-200/80 rounded-2xl shadow-xl p-1.5 space-y-0.5 z-[1000000] text-xs"></div>
                        </div>
                    </div>

                    <div class="flex items-center gap-0.5">
                        <button type="button" id="cal-prev-btn" class="w-8 h-8 rounded-full flex items-center justify-center hover:bg-slate-100 text-slate-600 active:scale-95 transition-all">
                            <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2.2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5"/></svg>
                        </button>
                        <button type="button" id="cal-next-btn" class="w-8 h-8 rounded-full flex items-center justify-center hover:bg-slate-100 text-slate-600 active:scale-95 transition-all">
                            <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2.2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5"/></svg>
                        </button>
                    </div>
                </div>

                <!-- 📅 3. มุมมองรายวัน -->
                <div id="cal-days-view-container" class="space-y-2">
                    <div class="grid grid-cols-7 text-center gap-0 select-none">
                        ${this.thaiDays.map((d, i) => `
                            <span class="text-[11px] font-bold ${i === 0 ? 'text-rose-500' : 'text-slate-400'} py-1">${d}</span>
                        `).join("")}
                    </div>
                    <div id="cal-days-grid" class="grid grid-cols-7 gap-y-1 text-center select-none touch-none"></div>
                    <p class="text-[11px] text-center text-slate-400 pt-1">
                        แตะเพื่อเลือกวันเดียว หรือกดค้างแล้วลากเพื่อเลือกหลายวัน
                    </p>
                </div>

                <!-- 🗓️ 4. มุมมองรายเดือน -->
                <div id="cal-months-view-container" class="hidden space-y-2">
                    <div id="cal-months-grid" class="grid grid-cols-3 gap-2 text-center py-2"></div>
                    <p class="text-[11px] text-center text-slate-400 pt-1">
                        แตะเดือนเริ่มต้น และแตะเดือนสิ้นสุดเพื่อเลือกหลายเดือน
                    </p>
                </div>

                <!-- 5. Footer -->
                <div class="flex items-center justify-between pt-2.5 border-t border-slate-100 text-xs px-1">
                    <button type="button" id="cal-clear-btn" class="px-3 py-1.5 rounded-xl font-bold text-rose-500 hover:bg-rose-50 transition-all active:scale-95 cursor-pointer">
                        ล้างค่า
                    </button>
                    <div class="flex items-center gap-1.5">
                        <button type="button" id="cal-full-month-btn" class="px-3 py-1.5 rounded-xl font-bold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 transition-all active:scale-95 cursor-pointer">
                            ทั้งเดือนนี้
                        </button>
                        <button type="button" id="cal-today-btn" class="px-3.5 py-1.5 rounded-xl font-bold text-blue-600 bg-blue-50 hover:bg-blue-100 transition-all active:scale-95 cursor-pointer">
                            วันนี้
                        </button>
                    </div>
                </div>

            </div>
        </div>
        `;
        document.body.insertAdjacentHTML("beforeend", modalHTML);
    }

    bindEvents() {
        const modal = document.getElementById("lanto-calendar-modal");
        const monthBtn = document.getElementById("cal-month-btn");
        const yearBtn = document.getElementById("cal-year-btn");
        const monthMenu = document.getElementById("cal-month-menu");
        const yearMenu = document.getElementById("cal-year-menu");

        const modeDayBtn = document.getElementById("cal-mode-day-btn");
        const modeMonthBtn = document.getElementById("cal-mode-month-btn");

        modeDayBtn.onclick = () => this.switchMode('day');
        modeMonthBtn.onclick = () => this.switchMode('month');

        if (monthBtn) {
            monthBtn.onclick = (e) => {
                e.stopPropagation();
                yearMenu.classList.add("hidden");
                monthMenu.classList.toggle("hidden");
            };
        }

        if (yearBtn) {
            yearBtn.onclick = (e) => {
                e.stopPropagation();
                monthMenu.classList.add("hidden");
                yearMenu.classList.toggle("hidden");
            };
        }

        document.getElementById("cal-prev-btn").onclick = () => {
            this.closeAllDropdowns();
            if (this.mode === 'day') {
                this.viewMonth--;
                if (this.viewMonth < 0) {
                    this.viewMonth = 11;
                    this.viewYear--;
                }
            } else {
                this.viewYear--;
            }
            this.render();
        };

        document.getElementById("cal-next-btn").onclick = () => {
            this.closeAllDropdowns();
            if (this.mode === 'day') {
                this.viewMonth++;
                if (this.viewMonth > 11) {
                    this.viewMonth = 0;
                    this.viewYear++;
                }
            } else {
                this.viewYear++;
            }
            this.render();
        };

        document.getElementById("cal-clear-btn").onclick = () => {
            this.startDate = null;
            this.endDate = null;
            this.startMonthIdx = null;
            this.endMonthIdx = null;
            this.hoverDate = null;
            if (this.targetInput) {
                this.targetInput.value = "";
                this.targetInput.dispatchEvent(new Event("change", { bubbles: true }));
                this.targetInput.dispatchEvent(new Event("input", { bubbles: true }));
            }
            this.close();
        };

        document.getElementById("cal-full-month-btn").onclick = () => {
            const firstDate = new Date(this.viewYear, this.viewMonth, 1);
            const lastDate = new Date(this.viewYear, this.viewMonth + 1, 0);
            this.startDate = firstDate;
            this.endDate = lastDate;
            this.applyRange();
        };

        document.getElementById("cal-today-btn").onclick = () => {
            const today = new Date();
            this.startDate = today;
            this.endDate = today;
            this.applyRange();
        };

        if (modal) {
            modal.onclick = () => this.close();
        }

        // ดักจับการลากเมาส์ / จอสัมผัส
        document.addEventListener("pointermove", (e) => this.handlePointerMove(e));
        document.addEventListener("pointerup", (e) => this.handlePointerUp(e));
        document.addEventListener("pointercancel", () => {
            this.isDragging = false;
            this.dragMoved = false;
            this.hoverDate = null;
            this.updateDaysHighlight();
        });

        document.addEventListener("click", (e) => {
            const input = e.target.closest(".lanto-calendar-input, .calendar-trigger, #custom-date-picker");
            if (input) {
                e.preventDefault();
                this.open(input);
            }
        }, true);
    }

    switchMode(newMode) {
        this.mode = newMode;
        this.closeAllDropdowns();

        const dayBtn = document.getElementById("cal-mode-day-btn");
        const monthBtn = document.getElementById("cal-mode-month-btn");
        const daysView = document.getElementById("cal-days-view-container");
        const monthsView = document.getElementById("cal-months-view-container");
        const monthDropdownWrap = document.getElementById("cal-month-dropdown-wrapper");

        if (this.mode === 'day') {
            dayBtn.className = "flex-1 py-1.5 rounded-xl text-xs font-bold transition-all bg-white text-slate-800 shadow-xs cursor-pointer";
            monthBtn.className = "flex-1 py-1.5 rounded-xl text-xs font-bold transition-all text-slate-500 hover:text-slate-800 cursor-pointer";
            daysView.classList.remove("hidden");
            monthsView.classList.add("hidden");
            if (monthDropdownWrap) monthDropdownWrap.classList.remove("hidden");
        } else {
            monthBtn.className = "flex-1 py-1.5 rounded-xl text-xs font-bold transition-all bg-white text-slate-800 shadow-xs cursor-pointer";
            dayBtn.className = "flex-1 py-1.5 rounded-xl text-xs font-bold transition-all text-slate-500 hover:text-slate-800 cursor-pointer";
            monthsView.classList.remove("hidden");
            daysView.classList.add("hidden");
            if (monthDropdownWrap) monthDropdownWrap.classList.add("hidden");
        }

        this.render();
    }

    closeAllDropdowns() {
        document.getElementById("cal-month-menu")?.classList.add("hidden");
        document.getElementById("cal-year-menu")?.classList.add("hidden");
    }

    parseThaiDate(str) {
        if (!str) return null;
        const parts = str.trim().split("/");
        if (parts.length === 3) {
            let y = parseInt(parts[2], 10);
            if (y > 2400) y -= 543;
            return new Date(y, parseInt(parts[1], 10) - 1, parseInt(parts[0], 10));
        }
        return null;
    }

    formatDate(d) {
        const thaiYear = d.getFullYear() + 543;
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${day}/${month}/${thaiYear}`;
    }

    open(inputElement) {
        this.targetInput = inputElement;
        this.closeAllDropdowns();
        this.isDragging = false;
        this.dragMoved = false;
        this.hoverDate = null;
        this.startMonthIdx = null;
        this.endMonthIdx = null;

        const val = inputElement.value ? inputElement.value.trim() : "";
        if (val.includes(" - ")) {
            const [sStr, eStr] = val.split(" - ");
            this.startDate = this.parseThaiDate(sStr);
            this.endDate = this.parseThaiDate(eStr);
        } else if (val) {
            this.startDate = this.parseThaiDate(val);
            this.endDate = this.startDate ? new Date(this.startDate) : null;
        } else {
            this.startDate = null;
            this.endDate = null;
        }

        const baseDate = this.startDate || new Date();
        this.viewYear = baseDate.getFullYear();
        this.viewMonth = baseDate.getMonth();

        const targetMode = inputElement.getAttribute('data-mode') || 'day';
        this.switchMode(targetMode);

        const modal = document.getElementById("lanto-calendar-modal");
        if (modal) modal.classList.remove("hidden");
    }

    close() {
        this.closeAllDropdowns();
        this.isDragging = false;
        this.dragMoved = false;
        this.hoverDate = null;
        const modal = document.getElementById("lanto-calendar-modal");
        if (modal) modal.classList.add("hidden");
    }

    applyRange() {
        if (!this.startDate) return;
        if (!this.endDate) this.endDate = new Date(this.startDate);

        let resultText = '';
        if (this.targetInput && this.targetInput.getAttribute('data-mode') === 'month') {
            const thaiM = this.thaiMonths[this.startDate.getMonth()];
            const thaiY = this.startDate.getFullYear() + 543;
            resultText = `${thaiM} ${thaiY}`;
        } else {
            const startStr = this.formatDate(this.startDate);
            const endStr = this.formatDate(this.endDate);
            resultText = (startStr === endStr) ? startStr : `${startStr} - ${endStr}`;
        }

        if (this.targetInput) {
            this.targetInput.value = resultText;
            this.targetInput.dispatchEvent(new Event("change", { bubbles: true }));
            this.targetInput.dispatchEvent(new Event("input", { bubbles: true }));
        }
        this.close();
    }

    handleMonthClick(monthIndex) {
        if (this.targetInput && this.targetInput.getAttribute('data-single-month') === 'true') {
            this.startDate = new Date(this.viewYear, monthIndex, 1);
            this.endDate = new Date(this.viewYear, monthIndex + 1, 0);
            this.applyRange();
            return;
        }

        if (this.startMonthIdx === null || (this.startMonthIdx !== null && this.endMonthIdx !== null)) {
            this.startMonthIdx = monthIndex;
            this.endMonthIdx = null;
            this.renderMonthGrid();
        } else {
            let sIdx = this.startMonthIdx;
            let eIdx = monthIndex;
            if (eIdx < sIdx) {
                const temp = sIdx;
                sIdx = eIdx;
                eIdx = temp;
            }
            this.startDate = new Date(this.viewYear, sIdx, 1);
            this.endDate = new Date(this.viewYear, eIdx + 1, 0);
            this.applyRange();
        }
    }

    render() {
        document.getElementById("cal-month-label").innerText = this.thaiMonths[this.viewMonth];
        document.getElementById("cal-year-label").innerText = `พ.ศ. ${this.viewYear + 543}`;

        const monthMenu = document.getElementById("cal-month-menu");
        monthMenu.innerHTML = this.thaiMonths.map((m, idx) => `
            <div onclick="window.lantoCalendar.setMonth(${idx})" class="px-3 py-1.5 rounded-xl font-semibold cursor-pointer transition-colors ${
                idx === this.viewMonth ? 'bg-blue-600 text-white font-bold' : 'text-slate-700 hover:bg-slate-100'
            }">${m}</div>
        `).join("");

        const yearMenu = document.getElementById("cal-year-menu");
        const curY = new Date().getFullYear();
        let yearHTML = "";
        for (let y = curY + 5; y >= curY - 80; y--) {
            yearHTML += `
                <div onclick="window.lantoCalendar.setYear(${y})" class="px-3 py-1.5 rounded-xl font-semibold cursor-pointer transition-colors ${
                    y === this.viewYear ? 'bg-blue-600 text-white font-bold' : 'text-slate-700 hover:bg-slate-100'
                }">พ.ศ. ${y + 543}</div>
            `;
        }
        yearMenu.innerHTML = yearHTML;

        if (this.mode === 'day') {
            this.renderDaysGrid();
        } else {
            this.renderMonthGrid();
        }
    }

    renderDaysGrid() {
        const grid = document.getElementById("cal-days-grid");
        if (!grid) return;
        grid.innerHTML = "";

        const firstDayIndex = new Date(this.viewYear, this.viewMonth, 1).getDay();
        const lastDate = new Date(this.viewYear, this.viewMonth + 1, 0).getDate();
        const prevLastDate = new Date(this.viewYear, this.viewMonth, 0).getDate();

        for (let i = firstDayIndex; i > 0; i--) {
            const dayNum = prevLastDate - i + 1;
            grid.innerHTML += `<div class="h-10 flex items-center justify-center text-xs text-slate-300 font-medium cursor-default select-none">${dayNum}</div>`;
        }

        for (let day = 1; day <= lastDate; day++) {
            const cellDate = new Date(this.viewYear, this.viewMonth, day);
            const cell = document.createElement("div");
            cell.dataset.time = cellDate.getTime();
            cell.className = "cal-day-cell h-10 flex items-center justify-center relative cursor-pointer select-none touch-none";
            cell.innerHTML = `<span class="cal-day-pill h-9 w-9 flex items-center justify-center text-xs font-semibold transition-all relative z-10">${day}</span>`;

            // เมื่อกดเมาส์หรือแตะนิ้วลงไป
            cell.onpointerdown = (e) => {
                e.preventDefault();
                this.isDragging = true;
                this.dragMoved = false;
                this.downCellDate = cellDate;
                this.hoverDate = cellDate;
            };

            grid.appendChild(cell);
        }

        this.updateDaysHighlight();
    }

    handlePointerMove(e) {
        // ⭐️ ถ้าไม่ได้กดค้างอยู่ ห้ามพรีวิวช่วงวันเด็ดขาด!
        if (this.mode !== 'day' || !this.isDragging) return;

        const targetEl = document.elementFromPoint(e.clientX, e.clientY);
        const cell = targetEl ? targetEl.closest(".cal-day-cell") : null;
        if (!cell) return;

        const cellTime = parseInt(cell.dataset.time, 10);
        const currentDateUnderPointer = new Date(cellTime);

        if (this.downCellDate && this.downCellDate.getTime() !== cellTime) {
            this.dragMoved = true;
        }

        if (!this.hoverDate || this.hoverDate.getTime() !== cellTime) {
            this.hoverDate = currentDateUnderPointer;
            this.updateDaysHighlight();
        }
    }

    handlePointerUp(e) {
        if (!this.isDragging) return;
        this.isDragging = false;

        if (this.dragMoved && this.downCellDate && this.hoverDate) {
            // 🟢 กรณี 1: กดค้างแล้วลากข้ามวัน -> เลือกช่วงวัน (เช่น 2 - 14 ต.ค.)
            const startT = Math.min(this.downCellDate.getTime(), this.hoverDate.getTime());
            const endT = Math.max(this.downCellDate.getTime(), this.hoverDate.getTime());
            this.startDate = new Date(startT);
            this.endDate = new Date(endT);
            this.hoverDate = null;
            this.applyRange();
        } else if (this.downCellDate) {
            // 🟢 กรณี 2: คลิก/แตะธรรมดา (ไม่ได้ลาก) -> เลือกวันเดียวนั้นทันทีจบเลย!
            this.startDate = new Date(this.downCellDate);
            this.endDate = new Date(this.downCellDate);
            this.hoverDate = null;
            this.applyRange();
        }
    }

    updateDaysHighlight() {
        const grid = document.getElementById("cal-days-grid");
        if (!grid) return;

        let sTime = null;
        let eTime = null;

        if (this.isDragging && this.downCellDate && this.hoverDate) {
            // ไฮไลต์ตามนิ้ว/เมาส์เฉพาะ "ตอนที่กดค้างแล้วลากอยู่เท่านั้น"
            sTime = Math.min(this.downCellDate.getTime(), this.hoverDate.getTime());
            eTime = Math.max(this.downCellDate.getTime(), this.hoverDate.getTime());
        } else if (this.startDate && this.endDate) {
            sTime = Math.min(this.startDate.getTime(), this.endDate.getTime());
            eTime = Math.max(this.startDate.getTime(), this.endDate.getTime());
        } else if (this.startDate) {
            sTime = this.startDate.getTime();
            eTime = this.startDate.getTime();
        }

        const todayTime = new Date(new Date().getFullYear(), new Date().getMonth(), new Date().getDate()).getTime();
        const cells = grid.querySelectorAll(".cal-day-cell");

        cells.forEach(cell => {
            const cellTime = parseInt(cell.dataset.time, 10);
            const pill = cell.querySelector(".cal-day-pill");
            if (!pill) return;

            const isStart = sTime && cellTime === sTime;
            const isEnd = eTime && cellTime === eTime;
            const isInRange = sTime && eTime && cellTime > sTime && cellTime < eTime;
            const isToday = cellTime === todayTime;

            let containerClasses = "cal-day-cell h-10 flex items-center justify-center relative cursor-pointer select-none touch-none ";
            let pillClasses = "cal-day-pill h-9 w-9 flex items-center justify-center text-xs font-semibold transition-all relative z-10 ";

            if (isStart && isEnd) {
                pillClasses += "bg-blue-600 text-white rounded-2xl shadow-md shadow-blue-500/30 scale-105";
            } else if (isStart) {
                containerClasses += "bg-gradient-to-r from-transparent to-blue-50 rounded-l-2xl";
                pillClasses += "bg-blue-600 text-white rounded-2xl shadow-md shadow-blue-500/30";
            } else if (isEnd) {
                containerClasses += "bg-gradient-to-l from-transparent to-blue-50 rounded-r-2xl";
                pillClasses += "bg-blue-600 text-white rounded-2xl shadow-md shadow-blue-500/30";
            } else if (isInRange) {
                containerClasses += "bg-blue-50";
                pillClasses += "text-blue-700 font-bold";
            } else if (isToday) {
                pillClasses += "bg-slate-100 text-blue-600 font-bold border border-blue-300 rounded-2xl";
            } else {
                pillClasses += "text-slate-700 hover:bg-slate-100 rounded-2xl";
            }

            cell.className = containerClasses;
            pill.className = pillClasses;
        });
    }

    renderMonthGrid() {
        const grid = document.getElementById("cal-months-grid");
        if (!grid) return;
        grid.innerHTML = "";

        this.thaiMonths.forEach((mName, idx) => {
            const isStart = this.startMonthIdx === idx;
            const isEnd = this.endMonthIdx === idx;
            const isInRange = this.startMonthIdx !== null && this.endMonthIdx !== null && idx > this.startMonthIdx && idx < this.endMonthIdx;

            let btnClasses = "h-14 rounded-2xl font-bold text-xs transition-all flex flex-col items-center justify-center cursor-pointer ";

            if (isStart && !this.endMonthIdx) {
                btnClasses += "bg-blue-600 text-white shadow-md shadow-blue-500/30 scale-102";
            } else if (isStart || isEnd) {
                btnClasses += "bg-blue-600 text-white shadow-md shadow-blue-500/30";
            } else if (isInRange) {
                btnClasses += "bg-blue-50 text-blue-700 font-black";
            } else {
                btnClasses += "bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200/60 active:scale-95";
            }

            const monthDiv = document.createElement("div");
            monthDiv.className = btnClasses;
            monthDiv.innerHTML = `
                <span>${mName}</span>
                <span class="text-[10px] opacity-60 font-normal">เดือนที่ ${idx + 1}</span>
            `;
            monthDiv.onclick = () => this.handleMonthClick(idx);
            grid.appendChild(monthDiv);
        });
    }

    setMonth(monthIdx) {
        this.viewMonth = monthIdx;
        this.closeAllDropdowns();
        this.render();
    }

    setYear(year) {
        this.viewYear = year;
        this.closeAllDropdowns();
        this.render();
    }
}

// สร้าง Instance หลัก
window.lantoCalendar = new LantoCalendar();

function openCalendarModal(targetInput) {
    if (window.lantoCalendar) window.lantoCalendar.open(targetInput);
}

function closeCalendarModal() {
    if (window.lantoCalendar) window.lantoCalendar.close();
}