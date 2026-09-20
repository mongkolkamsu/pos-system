(function injectModalStyles() {
    if (document.getElementById('custom-modal-styles')) return;
    const style = document.createElement('style');
    style.id = 'custom-modal-styles';
    style.innerHTML = `
        @keyframes backdropFadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes backdropFadeOut { from { opacity: 1; } to { opacity: 0; } }
        @keyframes modalPopIn { 0% { opacity: 0; transform: scale(0.88) translateY(10px); } 100% { opacity: 1; transform: scale(1) translateY(0); } }
        @keyframes modalPopOut { 0% { opacity: 1; transform: scale(1); } 100% { opacity: 0; transform: scale(0.9) translateY(10px); } }
        @keyframes svgCheckDraw { 0% { stroke-dashoffset: 50; } 100% { stroke-dashoffset: 0; } }

        .animate-backdrop-in { animation: backdropFadeIn 0.15s ease-out forwards; }
        .animate-backdrop-out { animation: backdropFadeOut 0.12s ease-in forwards; }
        .animate-modal-in { animation: modalPopIn 0.2s cubic-bezier(0.16, 1, 0.3, 1) forwards; will-change: transform, opacity; }
        .animate-modal-out { animation: modalPopOut 0.12s cubic-bezier(0.7, 0, 0.84, 0) forwards; will-change: transform, opacity; }
        .animate-svg-check { stroke-dasharray: 50; stroke-dashoffset: 50; animation: svgCheckDraw 0.35s cubic-bezier(0.65, 0, 0.45, 1) 0.08s forwards; }
    `;
    document.head.appendChild(style);
})();

function showCustomModal(type, title, message) {
    return new Promise((resolve) => {
        // ⭐️ แปลง Error ภาษาอังกฤษจากระบบ/ฐานข้อมูลให้เป็นภาษาไทย ⭐️
        let displayMessage = message || '';
        if (typeof displayMessage === 'string') {
            if (displayMessage.includes('Duplicate entry')) {
                displayMessage = 'รหัสสินค้านี้มีอยู่ในระบบแล้ว กรุณาตรวจสอบหรือเปลี่ยนรหัสใหม่';
            } else if (displayMessage.includes('foreign key constraint fails') || displayMessage.includes('Cannot delete or update a parent row')) {
                displayMessage = 'ไม่สามารถลบหรือแก้ไขได้ เนื่องจากรายการนี้เชื่อมโยงกับประวัติการขายหรือข้อมูลอื่นอยู่';
            } else if (displayMessage.includes('Connection lost') || displayMessage.includes('ECONNREFUSED')) {
                displayMessage = 'ไม่สามารถเชื่อมต่อฐานข้อมูลได้ กรุณาลองใหม่อีกครั้ง';
            }
        }

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
                    <p class="text-sm text-gray-500 font-normal leading-relaxed px-2">${displayMessage}</p>
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

        setTimeout(() => {
            document.addEventListener('keydown', handleKeyDown);
            if (btnAccept) btnAccept.focus();
        }, 150);

        if (btnCancel) btnCancel.addEventListener('click', () => cleanup(false));
        if (btnAccept) btnAccept.addEventListener('click', () => cleanup(true));
    });
}