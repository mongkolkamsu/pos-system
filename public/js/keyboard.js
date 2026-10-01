// =========================================================================
// 🌟 แป้นพิมพ์เสมือน POS ดีไซน์ iOS Compact (Numpad ครบปุ่ม Enter, ลบ, และเครื่องหมาย) 🌟
// =========================================================================

(function() {
    'use strict';

    let isKeyboardGlobalEnabled = true;
    try {
        const saved = localStorage.getItem('pos_vk_enabled');
        isKeyboardGlobalEnabled = (saved !== 'false');
    } catch (e) {
        isKeyboardGlobalEnabled = true;
    }

    let activeTargetInput = null;
    let activeKeyboardMode = 'full'; // 'numpad' | 'full'
    let isThai = true;
    let isShift = false;
    let isCapsLock = false;
    let isInputSelected = false;

    let backspaceTimer = null;
    let backspaceInterval = null;

    // ผังแป้นพิมพ์ภาษาไทย
    const thaiLayoutNormal = [
        ['ๅ', '/', '-', 'ภ', 'ถ', 'ุ', 'ึ', 'ค', 'ต', 'จ', 'ข', 'ช', 'Backspace'],
        ['Tab', 'ๆ', 'ไ', 'ำ', 'พ', 'ะ', 'ั', 'ี', 'ร', 'น', 'ย', 'บ', 'ล', 'ฃ'],
        ['Caps', 'ฟ', 'ห', 'ก', 'ด', 'เ', '้', '่', 'า', 'ส', 'ว', 'ง', 'Enter'],
        ['Shift', 'ผ', 'ป', 'แ', 'อ', 'ิ', 'ื', 'ท', 'ม', 'ใ', 'ฝ', 'Shift'],
        ['Lang', 'Space', 'Clear']
    ];

    const thaiLayoutShift = [
        ['+', '๑', '๒', '๓', '๔', 'ู', '฿', '๕', '๖', '๗', '๘', '๙', 'Backspace'],
        ['Tab', '๐', '"', 'ฎ', 'ฑ', 'ธ', 'ํ', '๊', 'ณ', 'ฯ', 'ญ', 'ฐ', ',', 'ฅ'],
        ['Caps', 'ฤ', 'ฆ', 'ฏ', 'โ', 'ฌ', '็', '๋', 'ษ', 'ศ', 'ซ', '.', 'Enter'],
        ['Shift', '(', ')', 'ฉ', 'ฮ', 'ฺ', '์', '?', 'ฒ', 'ฬ', 'ฦ', 'Shift'],
        ['Lang', 'Space', 'Clear']
    ];

    // ผังแป้นพิมพ์ภาษาอังกฤษ
    const engLayoutNormal = [
        ['q', 'w', 'e', 'r', 't', 'y', 'u', 'i', 'o', 'p', '[', ']', 'Backspace'],
        ['Tab', 'a', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l', ';', "'", '\\'],
        ['Caps', 'z', 'x', 'c', 'v', 'b', 'n', 'm', ',', '.', '/', 'Enter'],
        ['Shift', '@', '#', '$', '%', '^', '&', '*', '(', ')', '_', 'Shift'],
        ['Lang', 'Space', 'Clear']
    ];

    const engLayoutShift = [
        ['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P', '{', '}', 'Backspace'],
        ['Tab', 'A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L', ':', '"', '|'],
        ['Caps', 'Z', 'X', 'C', 'V', 'B', 'N', 'M', '<', '>', '?', 'Enter'],
        ['Shift', '~', '`', '!', '#', '$', '%', '^', '&', '*', '(', 'Shift'],
        ['Lang', 'Space', 'Clear']
    ];

    function isNumericInput(el) {
        if (!el) return false;
        if (el.type === 'number' || el.dataset.originalType === 'number') return true;
        if (el.inputMode === 'numeric' || el.inputMode === 'decimal') return true;
        const numIds = ['barcode-input', 'cash-received', 'pay-debt-amount', 'stock-in-qty', 'p-price', 'p-cost', 'p-stock', 'p-multiplier', 'debt-pay-amount'];
        return numIds.includes(el.id);
    }

    function isIgnoredInput(el) {
        if (!el) return true;
        const type = (el.type || '').toLowerCase();
        const ignoredTypes = ['checkbox', 'radio', 'file', 'hidden', 'button', 'submit', 'image', 'reset', 'date', 'datetime-local', 'time', 'month', 'week'];
        if (ignoredTypes.includes(type)) return true;
        if (el.readOnly || el.disabled) return true;

        const id = (el.id || '').toLowerCase();
        const className = (el.className || '').toString().toLowerCase();
        const placeholder = (el.placeholder || '').toLowerCase();

        if (id.includes('date') || id.includes('calendar') || id.includes('picker')) return true;
        if (className.includes('date') || className.includes('calendar') || className.includes('picker') || className.includes('flatpickr')) return true;
        if (placeholder.includes('วว/ดด/ปปปป') || placeholder.includes('dd/mm/yyyy')) return true;

        return false;
    }

    function initVirtualKeyboard() {
        if (!document.getElementById('pos-keyboard-custom-style')) {
            const style = document.createElement('style');
            style.id = 'pos-keyboard-custom-style';
            style.innerHTML = `
                #pos-virtual-keyboard button { touch-action: manipulation; -webkit-tap-highlight-color: transparent; }
                body.pos-keyboard-numpad-open [id$="-modal"] > div, body.pos-keyboard-numpad-open .modal-container > div { padding-bottom: 210px !important; }
                body.pos-keyboard-full-open [id$="-modal"] > div, body.pos-keyboard-full-open .modal-container > div { padding-bottom: 260px !important; }
            `;
            document.head.appendChild(style);
        }

        let kbContainer = document.getElementById('pos-virtual-keyboard');
        if (!kbContainer) {
            kbContainer = document.createElement('div');
            kbContainer.id = 'pos-virtual-keyboard';
            kbContainer.style.display = 'none';
            document.body.appendChild(kbContainer);
        }

        mountToggleSwitch();
        setupKeyboardListeners();
    }

    function mountToggleSwitch() {
        return;
        let toggleBtn = document.getElementById('pos-vk-global-toggle-btn');
        
        const searchInput = 
            document.getElementById('search-debtor') || 
            document.getElementById('search-history') || 
            document.getElementById('search-product') || 
            document.getElementById('search-input') ||
            document.querySelector('input[type="text"][placeholder*="ค้นหา"]');

        if (!toggleBtn && searchInput && searchInput.parentElement) {
            toggleBtn = document.createElement('div');
            toggleBtn.id = 'pos-vk-global-toggle-btn';
            searchInput.parentElement.style.position = 'relative';
            searchInput.parentElement.appendChild(toggleBtn);
        }

        if (searchInput) {
            searchInput.style.paddingRight = '5rem';
        }

        if (!toggleBtn) return;

        toggleBtn.onclick = (e) => {
            e.preventDefault();
            e.stopPropagation();
            toggleVirtualKeyboardGlobalState();
        };

        toggleBtn.style.position = 'absolute';
        toggleBtn.style.right = '6px';
        toggleBtn.style.top = '50%';
        toggleBtn.style.transform = 'translateY(-50%)';
        toggleBtn.style.zIndex = '30';
        toggleBtn.style.display = 'flex';
        toggleBtn.style.alignItems = 'center';
        toggleBtn.style.gap = '5px';
        toggleBtn.style.cursor = 'pointer';
        toggleBtn.style.userSelect = 'none';
        toggleBtn.style.padding = '2px 7px';
        toggleBtn.style.borderRadius = '10px';
        toggleBtn.style.border = '1px solid #e2e8f0';
        toggleBtn.style.backgroundColor = '#f8fafc';
        toggleBtn.style.boxShadow = '0 1px 2px 0 rgba(0, 0, 0, 0.05)';

        updateKeyboardToggleButtonUI();
    }

    function updateKeyboardToggleButtonUI() {
        const toggleBtn = document.getElementById('pos-vk-global-toggle-btn');
        if (!toggleBtn) return;

        toggleBtn.innerHTML = `
            <span style="font-size: 11px; font-weight: ${isKeyboardGlobalEnabled ? '700' : '500'}; color: ${isKeyboardGlobalEnabled ? '#1e293b' : '#94a3b8'};">⌨️</span>
            <div style="width: 26px; height: 15px; border-radius: 9999px; padding: 1.5px; transition: background-color 0.2s; display: flex; align-items: center; background-color: ${isKeyboardGlobalEnabled ? '#34C759' : '#cbd5e1'};">
                <div style="width: 12px; height: 12px; background-color: #ffffff; border-radius: 9999px; box-shadow: 0 1px 2px rgba(0,0,0,0.15); transition: transform 0.2s; transform: translateX(${isKeyboardGlobalEnabled ? '11px' : '0px'});"></div>
            </div>
        `;
        toggleBtn.title = isKeyboardGlobalEnabled ? "ปิดแป้นพิมพ์" : "เปิดแป้นพิมพ์";
    }

    function toggleVirtualKeyboardGlobalState() {
        isKeyboardGlobalEnabled = !isKeyboardGlobalEnabled;
        localStorage.setItem('pos_vk_enabled', isKeyboardGlobalEnabled ? 'true' : 'false');
        updateKeyboardToggleButtonUI();

        // 🟢 อัปเดตสวิตช์ใน Sidebar ให้เปิด/ปิดตาม
        if (typeof window.syncKeyboardToggleState === 'function') {
            window.syncKeyboardToggleState();
        }

        if (!isKeyboardGlobalEnabled) {
            closeVirtualKeyboard();
        } else if (activeTargetInput) {
            openVirtualKeyboard(activeTargetInput);
        }
    }

    function setupKeyboardListeners() {
        const handleInputActivation = (e) => {
            if (!isKeyboardGlobalEnabled) return;
            if (e && e.isTrusted === false) return;

            const target = e.target;
            if (!target || isIgnoredInput(target)) return;
            if (target.closest('#pos-vk-global-toggle-btn') || target.closest('#pos-virtual-keyboard')) return;

            if ((target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') && !target.readOnly && !target.disabled) {
                openVirtualKeyboard(target);
            }
        };

        document.addEventListener('click', handleInputActivation, true);

        document.addEventListener('mousedown', (e) => {
            const kbContainer = document.getElementById('pos-virtual-keyboard');
            const toggleBtn = document.getElementById('pos-vk-global-toggle-btn');
            if (!kbContainer || kbContainer.style.display === 'none') return;
            
            if (kbContainer.contains(e.target) || (toggleBtn && toggleBtn.contains(e.target))) return;
            if (e.target === activeTargetInput || (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA'))) return;

            closeVirtualKeyboard();
        });

        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') closeVirtualKeyboard();
        });
    }

    function openVirtualKeyboard(inputEl) {
        if (!isKeyboardGlobalEnabled || !inputEl) return;
        activeTargetInput = inputEl;

        const isNum = isNumericInput(inputEl);
        activeKeyboardMode = isNum ? 'numpad' : 'full';

        if (inputEl.type === 'number') {
            inputEl.dataset.originalType = 'number';
            inputEl.type = 'text';
        }

        document.body.classList.remove('pos-keyboard-full-open', 'pos-keyboard-numpad-open');
        document.body.classList.add(isNum ? 'pos-keyboard-numpad-open' : 'pos-keyboard-full-open');

        setTimeout(() => {
            if (inputEl) {
                inputEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
                if (isNum) {
                    isInputSelected = true;
                    try { inputEl.select(); } catch (err) {}
                } else {
                    isInputSelected = false;
                }
            }
        }, 60);

        const kbContainer = document.getElementById('pos-virtual-keyboard');
        if (kbContainer) {
            kbContainer.style.display = 'block';
            renderKeyboardLayout();
        }
    }

    function closeVirtualKeyboard() {
        document.body.classList.remove('pos-keyboard-full-open', 'pos-keyboard-numpad-open');
        isInputSelected = false;

        if (activeTargetInput && activeTargetInput.dataset.originalType === 'number') {
            activeTargetInput.type = 'number';
        }

        const kbContainer = document.getElementById('pos-virtual-keyboard');
        if (kbContainer) {
            kbContainer.style.display = 'none';
            isShift = false;
        }
    }

    function renderKeyboardLayout() {
        const kbContainer = document.getElementById('pos-virtual-keyboard');
        if (!kbContainer) return;

        const currentText = activeTargetInput && activeTargetInput.value ? activeTargetInput.value : '';

        kbContainer.style.position = 'fixed';
        kbContainer.style.bottom = '10px';
        kbContainer.style.left = '50%';
        kbContainer.style.transform = 'translateX(-50%)';
        kbContainer.style.zIndex = '9999999';

        // 🌟 Numpad 4 คอลัมน์มาตรฐาน: ครบปุ่ม Enter, Backspace, และ Operators 🌟
        if (activeKeyboardMode === 'numpad') {
            kbContainer.className = "w-[92%] max-w-[280px] bg-slate-100/95 backdrop-blur-xl p-3 rounded-[26px] shadow-[0_15px_40px_rgba(0,0,0,0.25)] border border-slate-300 select-none transition-all";

            kbContainer.innerHTML = `
                <div class="flex items-center justify-between pb-1.5 mb-2 border-b border-slate-300/80 text-xs font-semibold text-slate-700">
                    <div class="flex items-center gap-1.5 truncate flex-1 min-w-0 pr-1">
                        <span class="w-1.5 h-1.5 rounded-full bg-[#34C759] animate-pulse flex-shrink-0"></span>
                        <span id="kb-preview-text" class="font-bold text-slate-900 bg-white px-2 py-0.5 rounded-lg border border-slate-200 shadow-2xs truncate max-w-[170px]">${currentText || '0'}</span>
                    </div>
                    <button type="button" onclick="closeVirtualKeyboard()" class="w-6 h-6 bg-slate-200 hover:bg-slate-300 active:scale-90 text-slate-700 rounded-full flex items-center justify-center transition shadow-2xs cursor-pointer select-none">
                        <svg class="w-3.5 h-3.5 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M6 18L18 6M6 6l12 12"/></svg>
                    </button>
                </div>
                
                <div class="grid grid-cols-4 gap-1.5">
                    <!-- แถวที่ 1: ล้าง, /, *, ลบ -->
                    <button type="button" data-k="Clear" class="h-10 bg-slate-200 hover:bg-rose-100 active:bg-rose-200 text-slate-700 hover:text-rose-600 font-bold text-xs rounded-xl shadow-2xs transition active:scale-95 cursor-pointer">C</button>
                    <button type="button" data-k="/" class="h-10 bg-slate-200 hover:bg-slate-300 active:bg-slate-400 text-slate-800 font-bold text-base rounded-xl shadow-2xs transition active:scale-95 cursor-pointer">/</button>
                    <button type="button" data-k="*" class="h-10 bg-slate-200 hover:bg-slate-300 active:bg-slate-400 text-slate-800 font-bold text-base rounded-xl shadow-2xs transition active:scale-95 cursor-pointer">*</button>
                    <button type="button" data-k="Backspace" onmousedown="startBackspaceHold(event)" onmouseup="stopBackspaceHold()" onmouseleave="stopBackspaceHold()" ontouchstart="startBackspaceHold(event)" ontouchend="stopBackspaceHold()" ontouchcancel="stopBackspaceHold()" class="h-10 bg-slate-200 hover:bg-rose-100 active:bg-rose-200 text-rose-600 font-bold text-sm rounded-xl shadow-2xs transition active:scale-95 cursor-pointer flex items-center justify-center">⌫</button>

                    <!-- แถวที่ 2: 7, 8, 9, - -->
                    <button type="button" data-k="7" class="h-11 bg-white hover:bg-slate-50 active:bg-slate-200 text-slate-900 font-bold text-lg rounded-xl shadow-2xs border border-slate-200/80 transition active:scale-95 cursor-pointer">7</button>
                    <button type="button" data-k="8" class="h-11 bg-white hover:bg-slate-50 active:bg-slate-200 text-slate-900 font-bold text-lg rounded-xl shadow-2xs border border-slate-200/80 transition active:scale-95 cursor-pointer">8</button>
                    <button type="button" data-k="9" class="h-11 bg-white hover:bg-slate-50 active:bg-slate-200 text-slate-900 font-bold text-lg rounded-xl shadow-2xs border border-slate-200/80 transition active:scale-95 cursor-pointer">9</button>
                    <button type="button" data-k="-" class="h-11 bg-slate-200 hover:bg-slate-300 active:bg-slate-400 text-slate-800 font-bold text-base rounded-xl shadow-2xs transition active:scale-95 cursor-pointer">-</button>

                    <!-- แถวที่ 3: 4, 5, 6, + -->
                    <button type="button" data-k="4" class="h-11 bg-white hover:bg-slate-50 active:bg-slate-200 text-slate-900 font-bold text-lg rounded-xl shadow-2xs border border-slate-200/80 transition active:scale-95 cursor-pointer">4</button>
                    <button type="button" data-k="5" class="h-11 bg-white hover:bg-slate-50 active:bg-slate-200 text-slate-900 font-bold text-lg rounded-xl shadow-2xs border border-slate-200/80 transition active:scale-95 cursor-pointer">5</button>
                    <button type="button" data-k="6" class="h-11 bg-white hover:bg-slate-50 active:bg-slate-200 text-slate-900 font-bold text-lg rounded-xl shadow-2xs border border-slate-200/80 transition active:scale-95 cursor-pointer">6</button>
                    <button type="button" data-k="+" class="h-11 bg-slate-200 hover:bg-slate-300 active:bg-slate-400 text-slate-800 font-bold text-base rounded-xl shadow-2xs transition active:scale-95 cursor-pointer">+</button>

                    <!-- แถวที่ 4 & 5: 1-2-3, 0-00-., และปุ่ม Enter ตกลง -->
                    <button type="button" data-k="1" class="h-11 bg-white hover:bg-slate-50 active:bg-slate-200 text-slate-900 font-bold text-lg rounded-xl shadow-2xs border border-slate-200/80 transition active:scale-95 cursor-pointer">1</button>
                    <button type="button" data-k="2" class="h-11 bg-white hover:bg-slate-50 active:bg-slate-200 text-slate-900 font-bold text-lg rounded-xl shadow-2xs border border-slate-200/80 transition active:scale-95 cursor-pointer">2</button>
                    <button type="button" data-k="3" class="h-11 bg-white hover:bg-slate-50 active:bg-slate-200 text-slate-900 font-bold text-lg rounded-xl shadow-2xs border border-slate-200/80 transition active:scale-95 cursor-pointer">3</button>
                    <button type="button" data-k="Enter" class="row-span-2 bg-[#34C759] hover:bg-[#2fb34f] active:scale-95 text-white font-bold text-base rounded-xl shadow-md flex items-center justify-center cursor-pointer select-none">↵</button>

                    <button type="button" data-k="0" class="h-11 bg-white hover:bg-slate-50 active:bg-slate-200 text-slate-900 font-bold text-lg rounded-xl shadow-2xs border border-slate-200/80 transition active:scale-95 cursor-pointer">0</button>
                    <button type="button" data-k="00" class="h-11 bg-white hover:bg-slate-50 active:bg-slate-200 text-slate-900 font-bold text-xs rounded-xl shadow-2xs border border-slate-200/80 transition active:scale-95 cursor-pointer">00</button>
                    <button type="button" data-k="." class="h-11 bg-white hover:bg-slate-50 active:bg-slate-200 text-slate-900 font-black text-xl rounded-xl shadow-2xs border border-slate-200/80 transition active:scale-95 cursor-pointer">.</button>
                </div>
            `;
        } else {
            kbContainer.className = "w-[96%] max-w-[820px] bg-slate-100/95 backdrop-blur-xl p-2.5 rounded-[26px] shadow-[0_20px_50px_rgba(0,0,0,0.3)] border border-slate-300 select-none transition-all";

            let isEffectiveShift = isCapsLock ? !isShift : isShift;
            let layout = isThai ? (isEffectiveShift ? thaiLayoutShift : thaiLayoutNormal) : (isEffectiveShift ? engLayoutShift : engLayoutNormal);

            let leftRowsHtml = layout.map(row => {
                let keysHtml = row.map(key => {
                    let label = key;
                    let inlineStyle = "flex: 1;";
                    let btnClass = "h-9 sm:h-9.5 rounded-xl font-bold text-xs sm:text-sm flex items-center justify-center transition active:scale-95 cursor-pointer select-none ";
                    let extraClass = "bg-white hover:bg-slate-50 active:bg-slate-200 text-slate-900 shadow-2xs border border-slate-200/80";

                    if (key === 'Backspace') {
                        extraClass = "bg-slate-200 hover:bg-rose-100 text-rose-600 shadow-2xs min-w-[52px] sm:min-w-[58px] text-xs";
                        label = '⌫ ลบ';
                        return `<button type="button" onmousedown="startBackspaceHold(event)" onmouseup="stopBackspaceHold()" onmouseleave="stopBackspaceHold()" ontouchstart="startBackspaceHold(event)" ontouchend="stopBackspaceHold()" ontouchcancel="stopBackspaceHold()" class="${btnClass} ${extraClass}" style="${inlineStyle}">${label}</button>`;
                    } else if (key === 'Shift') {
                        extraClass = (isShift ? "bg-[#007AFF] text-white shadow-md" : "bg-slate-200 hover:bg-slate-300 text-slate-800 shadow-2xs") + " min-w-[52px] sm:min-w-[58px] text-xs";
                        label = '⇧ Shift';
                    } else if (key === 'Caps') {
                        extraClass = (isCapsLock ? "bg-[#007AFF] text-white shadow-md ring-2 ring-blue-300" : "bg-slate-200 hover:bg-slate-300 text-slate-700 shadow-2xs") + " min-w-[38px] text-[11px]";
                        label = 'Caps';
                    } else if (key === 'Enter') {
                        extraClass = "bg-[#34C759] hover:bg-[#2fb34f] active:scale-95 text-white font-bold min-w-[62px] sm:min-w-[68px] shadow-md text-xs";
                        label = '↵ ตกลง';
                    } else if (key === 'Lang') {
                        extraClass = "bg-[#007AFF] hover:bg-[#006ee6] active:scale-95 text-white font-bold text-xs shadow-md";
                        label = isThai ? '🌐 ไทย' : '🌐 ENG';
                        inlineStyle = "flex: 1.2;";
                    } else if (key === 'Space') {
                        extraClass = "bg-white hover:bg-slate-50 text-slate-700 font-semibold shadow-2xs border border-slate-200/80 text-xs";
                        label = 'Space Bar';
                        inlineStyle = "flex: 4.5;";
                    } else if (key === 'Clear') {
                        extraClass = "bg-slate-200 hover:bg-rose-100 text-slate-700 hover:text-rose-600 font-semibold shadow-2xs text-xs";
                        label = '✕ ล้างคำ';
                        inlineStyle = "flex: 1.3;";
                    } else if (key === 'Tab') {
                        extraClass = "bg-slate-200 hover:bg-slate-300 text-slate-700 min-w-[36px] text-[11px] shadow-2xs";
                    }

                    return `<button type="button" data-k="${encodeURIComponent(key)}" class="${btnClass} ${extraClass}" style="${inlineStyle}">${label}</button>`;
                }).join('');
                return `<div class="flex items-center gap-1 justify-center mb-1 w-full">${keysHtml}</div>`;
            }).join('');

            let numpadRowsHtml = [
                ['/', '*', '-', '+'],
                ['7', '8', '9'],
                ['4', '5', '6'],
                ['1', '2', '3'],
                ['0', '00', '.']
            ].map((row, idx) => {
                let isOperatorRow = (idx === 0);
                let keysHtml = row.map(val => {
                    let btnStyle = isOperatorRow 
                        ? "h-9 sm:h-9.5 bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold text-sm rounded-xl shadow-2xs flex-1"
                        : "h-9 sm:h-9.5 bg-white hover:bg-slate-50 text-slate-900 font-bold text-base rounded-xl shadow-2xs border border-slate-200/80 flex-1";
                    return `<button type="button" data-k="${encodeURIComponent(val)}" class="${btnStyle} transition active:scale-95 cursor-pointer flex items-center justify-center select-none">${val}</button>`;
                }).join('');
                return `<div class="flex items-center gap-1 justify-center mb-1 w-full">${keysHtml}</div>`;
            }).join('');

            kbContainer.innerHTML = `
                <div class="flex items-center justify-between pb-1.5 mb-1.5 border-b border-slate-300/80 text-xs font-medium text-slate-700">
                    <div class="flex items-center gap-2 truncate flex-1 min-w-0 pr-2">
                        <span class="w-2 h-2 rounded-full bg-[#34C759] animate-pulse flex-shrink-0"></span>
                        <span class="text-slate-500 text-[11px] flex-shrink-0">กำลังพิมพ์:</span>
                        <span id="kb-preview-text" class="font-bold text-slate-900 bg-white px-2 py-0.5 rounded-lg border border-slate-200 shadow-2xs truncate max-w-[200px] sm:max-w-xs">${currentText || '(ว่าง)'}</span>
                    </div>
                    <button type="button" onclick="closeVirtualKeyboard()" class="w-6 h-6 bg-slate-200 hover:bg-slate-300 active:scale-90 text-slate-700 rounded-full flex items-center justify-center transition shadow-2xs cursor-pointer select-none"><svg class="w-3.5 h-3.5 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M6 18L18 6M6 6l12 12"/></svg></button>
                </div>
                <div class="flex flex-col lg:flex-row gap-2 items-stretch">
                    <div class="flex-1">${leftRowsHtml}</div>
                    <div class="hidden lg:block w-px bg-slate-300/80 self-stretch my-0.5"></div>
                    <div class="w-full lg:w-44 flex-shrink-0">${numpadRowsHtml}</div>
                </div>
            `;
        }

        kbContainer.querySelectorAll('button[data-k]').forEach(btn => {
            btn.onclick = (e) => {
                e.preventDefault();
                e.stopPropagation();
                const rawVal = decodeURIComponent(btn.getAttribute('data-k'));
                handleKeyPress(rawVal);
            };
        });
    }

    function updateKeyboardPreview() {
        const previewEl = document.getElementById('kb-preview-text');
        if (previewEl && activeTargetInput) {
            previewEl.textContent = activeTargetInput.value || (activeKeyboardMode === 'numpad' ? '0' : '(ว่าง)');
        }
    }

    function startBackspaceHold(e) {
        if (e) { e.preventDefault(); e.stopPropagation(); }
        performBackspace();
        clearTimeout(backspaceTimer);
        clearInterval(backspaceInterval);
        backspaceTimer = setTimeout(() => {
            backspaceInterval = setInterval(() => { performBackspace(); }, 50);
        }, 350);
    }

    function stopBackspaceHold() {
        clearTimeout(backspaceTimer);
        clearInterval(backspaceInterval);
    }

    function performBackspace() {
        if (!activeTargetInput) return;
        if (isInputSelected) {
            activeTargetInput.value = '';
            isInputSelected = false;
            updateKeyboardPreview();
            activeTargetInput.dispatchEvent(new Event('input', { bubbles: true }));
            activeTargetInput.dispatchEvent(new Event('change', { bubbles: true }));
            return;
        }
        if (activeTargetInput.value && activeTargetInput.value.length > 0) {
            activeTargetInput.value = String(activeTargetInput.value).slice(0, -1);
            updateKeyboardPreview();
            activeTargetInput.dispatchEvent(new Event('input', { bubbles: true }));
            activeTargetInput.dispatchEvent(new Event('change', { bubbles: true }));
        }
    }

    function handleKeyPress(val) {
        if (!activeTargetInput) return;

        if (val === 'Space') {
            val = ' ';
        }

        if (val === 'Backspace') { 
            performBackspace(); 
            return; 
        } else if (val === 'Caps') { 
            isCapsLock = !isCapsLock; 
            renderKeyboardLayout(); 
            return; 
        } else if (val === 'Shift') { 
            isShift = !isShift; 
            renderKeyboardLayout(); 
            return; 
        } else if (val === 'Lang') { 
            isThai = !isThai; 
            isShift = false; 
            renderKeyboardLayout(); 
            return; 
        } else if (val === 'Clear') { 
            activeTargetInput.value = ''; 
            isInputSelected = false; 
            updateKeyboardPreview(); 
            activeTargetInput.dispatchEvent(new Event('input', { bubbles: true })); 
            activeTargetInput.dispatchEvent(new Event('change', { bubbles: true })); 
            return; 
        } else if (val === 'Close') { 
            closeVirtualKeyboard(); 
            return; 
        } else if (val === 'Enter') {
            if (activeKeyboardMode === 'numpad' && activeTargetInput.value && activeTargetInput.id !== 'barcode-input') {
                try {
                    const sanitized = String(activeTargetInput.value).replace(/[^0-9+\-*/.]/g, '');
                    if (/[+\-*/]/.test(sanitized)) {
                        const evaluated = Function('"use strict";return (' + sanitized + ')')();
                        if (!isNaN(evaluated) && isFinite(evaluated)) activeTargetInput.value = Number(evaluated.toFixed(2)).toString();
                    }
                } catch (err) {}
            }
            activeTargetInput.dispatchEvent(new Event('change', { bubbles: true }));
            activeTargetInput.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', code: 'Enter', keyCode: 13, which: 13, bubbles: true, cancelable: true }));
            closeVirtualKeyboard();
            return;
        } else if (val === 'Tab') {
            activeTargetInput.value += ' ';
        } else if (['+', '-', '*', '/'].includes(val)) {
            // 🌟 รองรับการกดเครื่องหมายคำนวณโดยตรง ไม่ถูกบล็อก 🌟
            if (isInputSelected) {
                activeTargetInput.value = '';
                isInputSelected = false;
            }
            activeTargetInput.value = (activeTargetInput.value || '') + val;
        } else if (val === '.') {
            if (isInputSelected) { 
                activeTargetInput.value = '0.'; 
                isInputSelected = false; 
            } else {
                activeTargetInput.value = (activeTargetInput.value || '') + '.';
            }
        } else {
            if (isInputSelected) { 
                activeTargetInput.value = (val === '00' ? '0' : val); 
                isInputSelected = false; 
            } else {
                activeTargetInput.value = (activeTargetInput.value || '') + val;
            }

            if (isShift) { 
                isShift = false; 
                renderKeyboardLayout(); 
                return; 
            }
        }

        updateKeyboardPreview();
        activeTargetInput.dispatchEvent(new Event('input', { bubbles: true }));
        activeTargetInput.dispatchEvent(new Event('change', { bubbles: true }));
        activeTargetInput.focus();
    }

    window.toggleVirtualKeyboardGlobalState = toggleVirtualKeyboardGlobalState;
    window.openVirtualKeyboard = openVirtualKeyboard;
    window.closeVirtualKeyboard = closeVirtualKeyboard;
    window.startBackspaceHold = startBackspaceHold;
    window.stopBackspaceHold = stopBackspaceHold;

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initVirtualKeyboard);
    } else {
        initVirtualKeyboard();
    }
})();