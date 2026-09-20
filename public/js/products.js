let localProductsCache = [];
let localCategoriesCache = [];

// 1. ดึงข้อมูลสินค้าทั้งหมด
async function getStoredProducts() {
    try {
        const res = await fetch('/api/products');
        localProductsCache = await res.json();
        return Array.isArray(localProductsCache) ? localProductsCache : [];
    } catch (e) {
        console.error('Fetch Products Error:', e);
        return [];
    }
}

// 2. ดึงข้อมูลหมวดหมู่ทั้งหมด
async function getStoredCategories() {
    try {
        const res = await fetch('/api/categories');
        const data = await res.json();
        // ⭐️ ตรวจสอบว่าเป็น Array จริงหรือไม่ ถ้าไม่ใช่ให้ใช้ Array ว่าง
        localCategoriesCache = Array.isArray(data) ? data : [];
        return localCategoriesCache;
    } catch (e) {
        console.error('Fetch Categories Error:', e);
        localCategoriesCache = [];
        return [];
    }
}

// 3. เพิ่มสินค้าใหม่
async function addProductToStore(productData, fileInput) {
    try {
        const formData = new FormData();
        formData.append('id', productData.id);
        formData.append('name', productData.name);
        formData.append('cost_price', productData.cost_price || 0);
        formData.append('price', productData.price || 0);
        formData.append('stock_qty', productData.stock_qty || 0);
        formData.append('category', productData.category);
        formData.append('unit', productData.unit || 'ชิ้น');
        formData.append('is_no_barcode', productData.is_no_barcode ? 1 : 0);
        formData.append('parent_id', productData.parent_id || '');
        formData.append('multiplier', productData.multiplier || 1);
        formData.append('min_stock', productData.min_stock !== undefined ? productData.min_stock : 5);
        formData.append('max_stock', productData.max_stock !== undefined ? productData.max_stock : 20);
        formData.append('existing_img', productData.existing_img || 'images/placeholder.jpg');

        if (fileInput && fileInput.files && fileInput.files[0]) {
            formData.append('file', fileInput.files[0]);
        }

        const res = await fetch('/api/products', {
            method: 'POST',
            body: formData
        });
        return await res.json();
    } catch (e) {
        return { success: false, message: 'เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์' };
    }
}

// 4. แก้ไขสินค้าเดิม
async function updateProductInStore(originalId, productData, fileInput, isImageRemoved) {
    try {
        const formData = new FormData();
        formData.append('original_id', originalId);
        formData.append('id', productData.id);
        formData.append('name', productData.name);
        formData.append('cost_price', productData.cost_price || 0);
        formData.append('price', productData.price || 0);
        formData.append('stock_qty', productData.stock_qty || 0);
        formData.append('category', productData.category);
        formData.append('unit', productData.unit || 'ชิ้น');
        formData.append('is_no_barcode', productData.is_no_barcode ? 1 : 0);
        formData.append('parent_id', productData.parent_id || '');
        formData.append('multiplier', productData.multiplier || 1);
        formData.append('min_stock', productData.min_stock !== undefined ? productData.min_stock : 5);
        formData.append('max_stock', productData.max_stock !== undefined ? productData.max_stock : 20);
        formData.append('is_image_removed', isImageRemoved ? 'true' : 'false');

        if (fileInput && fileInput.files && fileInput.files[0]) {
            formData.append('file', fileInput.files[0]);
        }

        const res = await fetch('/api/products/update', {
            method: 'POST',
            body: formData
        });
        return await res.json();
    } catch (e) {
        return { success: false, message: 'เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์' };
    }
}

// 5. ลบสินค้า
async function deleteProductFromStore(productId) {
    try {
        const res = await fetch('/api/products/delete', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: productId })
        });
        return await res.json();
    } catch (e) {
        return { success: false, message: 'เกิดข้อผิดพลาดในการลบข้อมูล' };
    }
}

// 6. เพิ่มหมวดหมู่
async function addCategoryToStore(labelName) {
    try {
        const res = await fetch('/api/categories', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ label_name: labelName })
        });
        return await res.json();
    } catch (e) {
        return { success: false, message: 'ไม่สามารถเพิ่มหมวดหมู่ได้' };
    }
}

// 7. แก้ไขหมวดหมู่
async function updateCategoryInStore(keyName, labelName) {
    try {
        const res = await fetch('/api/categories/update', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ key_name: keyName, label_name: labelName })
        });
        return await res.json();
    } catch (e) {
        return { success: false, message: 'ไม่สามารถแก้ไขหมวดหมู่ได้' };
    }
}

// 8. ลบหมวดหมู่
async function deleteCategoryFromStore(keyName) {
    try {
        const res = await fetch('/api/categories/delete', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ key_name: keyName })
        });
        return await res.json();
    } catch (e) {
        return { success: false, message: 'ไม่สามารถลบหมวดหมู่ได้' };
    }
}

// 9. บันทึกลำดับหมวดหมู่
async function saveCategoriesOrder(categoriesList) {
    try {
        const res = await fetch('/api/categories/order', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ categories: categoriesList })
        });
        return await res.json();
    } catch (e) {
        return { success: false };
    }
}