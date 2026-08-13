// ========================================
// DỮ LIỆU MẪU (để trống, chỉ dùng khi lỗi)
// ========================================
const sampleData = [];

// ========================================
// BIẾN TOÀN CỤC
// ========================================
let roiData = [];
let selectedItem = null;

// ========================================
// HÀM LẤY DỮ LIỆU TỪ SERVER
// ========================================
async function loadData() {
    try {
        console.log('📊 Đang tải dữ liệu từ server...');
        // 👉 SỬA: Dùng relative path cho đồng bộ
        const response = await fetch('/api/roi-data');
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        console.log('✅ Đã nhận dữ liệu từ server:', data.length, 'bản ghi');
        
        if (data && data.length > 0) {
            console.log('📝 Dữ liệu mẫu (record 1):', JSON.stringify(data[0], null, 2));
            // 👉 KIỂM TRA actualBenefit
            console.log('📝 actualBenefit của record 1:', data[0].actualBenefit);
        } else {
            console.log('⚠️ Dữ liệu từ server rỗng!');
        }
        
        roiData = data;
        renderTable(roiData);
        showNotification(`Đã tải ${data.length} bản ghi từ database!`, 'success');
        
    } catch (error) {
        console.error('❌ Lỗi khi tải dữ liệu:', error);
        console.log('⚠️ Sử dụng dữ liệu mẫu (rỗng)');
        roiData = sampleData;
        renderTable(roiData);
        showNotification('Không thể kết nối server!', 'error');
    }
}

// ========================================
// HÀM HIỂN THỊ DỮ LIỆU
// ========================================
function renderTable(data) {
    console.log('📝 renderTable - Bắt đầu render...');
    console.log('📝 renderTable - Dữ liệu nhận được:', data);
    console.log('📝 renderTable - Số dòng:', data ? data.length : 0);
    
    const tbody = document.getElementById('tableBody');
    
    if (!tbody) {
        console.error('❌ Không tìm thấy element tableBody!');
        return;
    }
    
    if (!data || data.length === 0) {
        console.log('⚠️ renderTable - Không có dữ liệu để hiển thị');
        tbody.innerHTML = `
            <tr>
                <td colspan="18" style="text-align:center;padding:40px;color:#999;">
                    <i class="fas fa-inbox" style="font-size:48px;display:block;margin-bottom:10px;"></i>
                    Không có dữ liệu
                </td>
            </tr>
        `;
        return;
    }

    console.log('📝 renderTable - Đang render', data.length, 'dòng');
    
    let html = '';
    data.forEach((item, index) => {
        const budgetROIClass = getROIClass(item.budgetROI);
        const actualROIClass = getROIClass(item.actualROI);
        const roiDiff = (item.actualROI || 0) - (item.budgetROI || 0);
        const diffClass = roiDiff > 0 ? 'roi-positive' : (roiDiff < 0 ? 'roi-negative' : 'roi-neutral');
        const diffIcon = roiDiff > 0 ? '↑' : (roiDiff < 0 ? '↓' : '→');

        // XÉT PASS/NOT PASS
        let plannedResultText = 'N/A';
        let plannedBgColor = '#f8f9fa';
        let plannedTextColor = '#6c757d';
        
        const budgetROI = parseFloat(item.budgetROI) || 0;
        const actualROI = parseFloat(item.actualROI) || 0;
        
        if (actualROI > 0 && budgetROI > 0) {
            if (actualROI >= budgetROI) {
                plannedResultText = '✅ PASS';
                plannedBgColor = '#d4edda';
                plannedTextColor = '#28a745';
            } else {
                plannedResultText = '❌ NOT PASS';
                plannedBgColor = '#f8d7da';
                plannedTextColor = '#dc3545';
            }
        } else if (actualROI === 0 && budgetROI > 0) {
            plannedResultText = '-';
            plannedTextColor = '#050401';
        }

        html += `
            <tr>
                <td style="font-weight:600;padding:8px 12px;">${item.department || 'N/A'}</td>
                <td style="padding:8px 12px;">${item.assetClass || 'N/A'}</td>
                <td style="padding:8px 12px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;"
                title="${item.assetDescription || 'N/A'}">${item.assetDescription || 'N/A'}</td>
                <td style="padding:8px 12px;">${item.purchaseReason || 'N/A'}</td>
                <td style="padding:8px 12px;">${item.depreciation || 'N/A'}</td>
                <td style="padding:8px 12px;">${formatDate(item.requestDate)}</td>
                <td style="padding:8px 12px;">${formatDate(item.finalReceiptDate)}</td>

            <td style="font-weight:600;text-align:center;padding:8px 12px;">${formatPaybackTime(item.estimatedPaybackTime)}</td>

                <td style="font-weight:600;padding:8px 12px;">${formatDate(item.estimatedPaybackDate)}</td>


                <td style="text-align:center;padding:8px 12px;">${item.budgetQuantity || 0}</td>
                <td style="text-align:right;padding:8px 12px;">${formatNumber(item.budgetAmount)}</td>
                <td style="text-align:right;padding:8px 12px;">${formatNumber(item.budgetBenefit)}</td>
                <td style="text-align:center;padding:8px 12px;" class="${budgetROIClass}">${item.budgetROI ? item.budgetROI.toFixed(1) : 0}%</td>
                <td style="text-align:center;padding:8px 12px;">${item.actualQuantity || 0}</td>
                <td style="text-align:right;padding:8px 12px;">${formatNumber(item.actualAmount)}</td>
                <td style="text-align:right;padding:8px 12px;" class="clickable-cell" onclick="openBenefitModal(${index})" title="Click to edit benefit">${formatNumber(item.actualBenefit)}</td>
            <td style="text-align:center;padding:8px 12px;" class="${actualROIClass}">
    ${item.actualROI ? item.actualROI.toFixed(1) : 0}%
</td>
                <td style="text-align:center;padding:8px 12px;font-weight:700;background-color:${plannedBgColor};color:${plannedTextColor};border-radius:4px;">
                    ${plannedResultText}
                </td>
            </tr>
        `;
    });

    tbody.innerHTML = html;
    console.log('✅ renderTable - Đã render xong', data.length, 'dòng');
}

// ========================================
// CẬP NHẬT THẺ THỐNG KÊ
// ========================================
function updateSummaryCards(data) {
    console.log('📝 updateSummaryCards - Bắt đầu cập nhật thẻ thống kê...');
    
    if (!data || data.length === 0) {
        document.getElementById('totalPlanInvestment').textContent = '$0';
        document.getElementById('totalActualInvestment').textContent = '$0';
        document.getElementById('avgPlanROI').textContent = '0%';
        document.getElementById('avgActualROI').textContent = '0%';
        return;
    }

    const totalPlan = data.reduce((sum, item) => sum + (item.budgetAmount || 0), 0);
    const totalActual = data.reduce((sum, item) => sum + (item.actualAmount || 0), 0);
    
    const validPlan = data.filter(item => item.budgetROI !== null && item.budgetROI !== undefined && !isNaN(item.budgetROI));
    const avgPlan = validPlan.length > 0 ? validPlan.reduce((s, i) => s + i.budgetROI, 0) / validPlan.length : 0;
    
    const validActual = data.filter(item => item.actualROI !== null && item.actualROI !== undefined && !isNaN(item.actualROI));
    const avgActual = validActual.length > 0 ? validActual.reduce((s, i) => s + i.actualROI, 0) / validActual.length : 0;

    document.getElementById('totalPlanInvestment').textContent = formatCurrency(totalPlan);
    document.getElementById('totalActualInvestment').textContent = formatCurrency(totalActual);
    document.getElementById('avgPlanROI').textContent = avgPlan.toFixed(1) + '%';
    document.getElementById('avgActualROI').textContent = avgActual.toFixed(1) + '%';
    
    console.log('✅ updateSummaryCards - Đã cập nhật thẻ thống kê');
}

// ========================================
// HÀM TIỆN ÍCH
// ========================================
function getROIClass(roi) {
    if (roi === null || roi === undefined || isNaN(roi)) return 'roi-neutral';
    if (roi > 25) return 'roi-positive';
    if (roi > 15) return 'roi-neutral';
    return 'roi-negative';
}

function formatCurrency(amount) {
    if (amount === undefined || amount === null || isNaN(amount)) return '$0';
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
    }).format(amount);
}

function formatDate(dateString) {
    if (!dateString) return '';
    try {
        const date = new Date(dateString);
        if (isNaN(date.getTime())) return '';
        
        const month = date.getMonth() + 1;
        const day = date.getDate();
        const year = date.getFullYear();
        const hours = date.getHours().toString().padStart(2, '0');
        const minutes = date.getMinutes().toString().padStart(2, '0');
        
        return `${month}/${day}/${year} ${hours}:${minutes}`;
    } catch (e) { 
        return ''; 
    }
}


// ========================================
// HÀM FORMAT PAYBACK TIME (4 SỐ THẬP PHÂN)
// ========================================
function formatPaybackTime(value) {
    if (value === undefined || value === null || isNaN(value)) return '0.0000';
    return parseFloat(value).toFixed(4);
}

// ========================================
// HÀM FORMAT SỐ (2 SỐ THẬP PHÂN)
// ========================================
function formatNumber(value) {
    if (value === undefined || value === null || isNaN(value)) return '0.00';
    return '$' + parseFloat(value).toFixed(2);
}

// ========================================
// MODAL FUNCTIONS
// ========================================
function openBenefitModal(index) {
    console.log('📝 openBenefitModal - Mở modal cho index:', index);
    
    selectedItem = roiData[index];
    if (!selectedItem) { 
        showNotification('Không tìm thấy dữ liệu!', 'error'); 
        return; 
    }

    document.getElementById('modalAssetDesc').textContent = selectedItem.assetDescription || 'N/A';
    document.getElementById('currentBenefitValue').textContent = (selectedItem.actualBenefit || 0).toLocaleString();
    
    const benefitInput = document.getElementById('benefitInput');
    benefitInput.value = selectedItem.actualBenefit || '';
    benefitInput.focus();
    benefitInput.select();
    
    updatePreview(benefitInput.value);
    
    document.getElementById('benefitModal').style.display = 'flex';
    document.body.style.overflow = 'hidden';
    
    benefitInput.oninput = function() { 
        updatePreview(this.value); 
    };
}

function closeBenefitModal() {
    console.log('📝 closeBenefitModal - Đóng modal');
    document.getElementById('benefitModal').style.display = 'none';
    document.body.style.overflow = '';
    selectedItem = null;
}

function updatePreview(value) {
    const benefit = parseFloat(value) || 0;
    const item = selectedItem;
    if (!item) return;
    
    const actualAmount = item.actualAmount || 0;
    const newROI = actualAmount > 0 ? (benefit / actualAmount) * 100 : 0;
    document.getElementById('newROI').textContent = newROI.toFixed(1) + '%';
}

async function saveBenefit() {
    console.log('📝 saveBenefit - Bắt đầu lưu benefit...');
    
    if (!selectedItem) { 
        showNotification('Không có dữ liệu để lưu!', 'error'); 
        return; 
    }
    
    const benefitInput = document.getElementById('benefitInput');
    const benefitValue = parseFloat(benefitInput.value);
    
    if (isNaN(benefitValue) || benefitValue < 0) {
        showNotification('Vui lòng nhập giá trị hợp lệ (số >= 0)!', 'warning');
        benefitInput.focus();
        benefitInput.select();
        return;
    }

    const submitBtn = document.querySelector('.btn-submit-simple') || document.querySelector('.btn-submit');
    const originalText = submitBtn ? submitBtn.innerHTML : 'Submit';
    if (submitBtn) {
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';
        submitBtn.disabled = true;
    }

    try {
        // 👉 Đồng bộ URL với loadData()
        const response = await fetch('/api/update-benefit', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                planNo: selectedItem.planNo,
                planId: selectedItem.planId,
                benefitValue: benefitValue
            })
        });

        console.log('📡 Response status:', response.status);
        const result = await response.json();
        console.log('📡 Response data:', result);

        if (response.ok && result.success) {
            showNotification('✅ Cập nhật benefit thành công!', 'success');
            closeBenefitModal();
            
            // 👉 Tải lại dữ liệu
            console.log('🔄 Đang tải lại dữ liệu...');
            await loadData();
            console.log('✅ Đã tải lại dữ liệu thành công!');
        } else {
            throw new Error(result.message || 'Cập nhật thất bại');
        }
    } catch (error) {
        console.error('❌ Lỗi khi lưu benefit:', error);
        showNotification(`❌ ${error.message}`, 'error');
        
        // Fallback: cập nhật local
        selectedItem.actualBenefit = benefitValue;
        selectedItem.actualROI = selectedItem.actualAmount > 0 ? (benefitValue / selectedItem.actualAmount) * 100 : 0;
        
        const budgetROI = selectedItem.budgetROI || 0;
        const actualROI = selectedItem.actualROI || 0;
        
        if (actualROI > 0 && budgetROI > 0) {
            selectedItem.plannedResults = actualROI >= budgetROI ? '✅ PASS' : '❌ NOT PASS';
        } else if (actualROI === 0 && budgetROI > 0) {
            selectedItem.plannedResults = '-';
        } else {
            selectedItem.plannedResults = 'N/A';
        }
        
        renderTable(roiData);
        closeBenefitModal();
    } finally {
        if (submitBtn) {
            submitBtn.innerHTML = originalText;
            submitBtn.disabled = false;
        }
    }
}

// ========================================
// NOTIFICATION
// ========================================
function showNotification(message, type = 'info') {
    const container = document.getElementById('notificationContainer');
    if (!container) {
        console.warn('⚠️ Không tìm thấy notificationContainer');
        return;
    }
    
    const colors = { 
        success: '#28a745', 
        error: '#dc3545', 
        warning: '#ffc107', 
        info: '#17a2b8' 
    };
    const icons = { 
        success: 'fa-check-circle', 
        error: 'fa-exclamation-circle', 
        warning: 'fa-exclamation-triangle', 
        info: 'fa-info-circle' 
    };
    const titles = { 
        success: 'Thành công', 
        error: 'Lỗi', 
        warning: 'Cảnh báo', 
        info: 'Thông báo' 
    };

    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.innerHTML = `
        <div class="notification-icon"><i class="fas ${icons[type] || icons.info}"></i></div>
        <div class="notification-content">
            <div class="notification-title">${titles[type] || 'Thông báo'}</div>
            <div class="notification-message">${message}</div>
        </div>
        <span class="notification-close" onclick="this.parentElement.remove()">&times;</span>
    `;
    container.appendChild(notification);

    setTimeout(() => {
        if (notification.parentElement) {
            notification.style.opacity = '0';
            notification.style.transform = 'translateX(100%)';
            notification.style.transition = 'all 0.3s ease';
            setTimeout(() => notification.remove(), 300);
        }
    }, 5000);
}

// ========================================
// HÀM REFRESH & EXPORT
// ========================================
function refreshData() {
    console.log('📝 refreshData - Làm mới dữ liệu...');
    showNotification('Đang làm mới dữ liệu...', 'info');
    loadData();
}

function exportData() {
    console.log('📝 exportData - Xuất dữ liệu...');
    
    if (!roiData || roiData.length === 0) {
        showNotification('Không có dữ liệu để xuất!', 'warning');
        return;
    }
    
    const headers = ['Department', 'Asset Class', 'Asset Description', 'Purchase Reason', 
                    'Depreciation', 'Request Date', 'Final Receipt Date', 
                    'Est. Payback Time', 'Est. Payback Date',
                    'Budget Qty', 'Budget Amount', 'Budget Benefit', 'Budget ROI %',
                    'Actual Qty', 'Actual Amount', 'Actual Benefit', 'Actual ROI %',
                    'Planned Results'];
    
    const rows = roiData.map((item) => [
        item.department || '',
        item.assetClass || '',
        item.assetDescription || '',
        item.purchaseReason || '',
        item.depreciation || '',
        formatDate(item.requestDate),
        formatDate(item.finalReceiptDate),
        item.estimatedPaybackTime || 0,
        formatDate(item.estimatedPaybackDate),
        item.budgetQuantity || 0,
        item.budgetAmount || 0,
        item.budgetBenefit || 0,
        item.budgetROI ? item.budgetROI.toFixed(1) : 0,
        item.actualQuantity || 0,
        item.actualAmount || 0,
        item.actualBenefit || 0,
        item.actualROI ? item.actualROI.toFixed(1) : 0,
        item.plannedResults || 'N/A'
    ]);
    
    const csvContent = [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
    
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.href = url;
    link.setAttribute('download', `roi_data_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
    showNotification('Đã xuất dữ liệu thành công!', 'success');
}

// ========================================
// KHỞI TẠO TRANG
// ========================================
document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 Dashboard đang khởi tạo...');
    loadData();
});

// Đóng modal khi click bên ngoài
document.addEventListener('click', function(event) {
    const modal = document.getElementById('benefitModal');
    if (event.target === modal || event.target.classList.contains('modal-overlay')) {
        closeBenefitModal();
    }
});

// Đóng modal khi nhấn ESC
document.addEventListener('keydown', function(event) {
    if (event.key === 'Escape') closeBenefitModal();
});

console.log('✅ main.js đã được load thành công!');

// ========================================
// HÀM CHUẨN HÓA TIẾNG VIỆT (BỎ DẤU)
// ========================================
function removeVietnameseTones(str) {
    if (!str) return '';
    
    const accents = [
        /[àáạảãâầấậẩẫăằắặẳẵ]/g, /[èéẹẻẽêềếệểễ]/g,
        /[ìíịỉĩ]/g, /[òóọỏõôồốộổỗơờớợởỡ]/g,
        /[ùúụủũưừứựửữ]/g, /[ỳýỵỷỹ]/g,
        /[đ]/g,
        /[ÀÁẠẢÃÂẦẤẬẨẪĂẰẮẶẲẴ]/g, /[ÈÉẸẺẼÊỀẾỆỂỄ]/g,
        /[ÌÍỊỈĨ]/g, /[ÒÓỌỎÕÔỒỐỘỔỖƠỜỚỢỞỠ]/g,
        /[ÙÚỤỦŨƯỪỨỰỬỮ]/g, /[ỲÝỴỶỸ]/g,
        /[Đ]/g
    ];
    
    const replacements = [
        'a', 'e', 'i', 'o', 'u', 'y', 'd',
        'A', 'E', 'I', 'O', 'U', 'Y', 'D'
    ];
    
    let result = str;
    accents.forEach((pattern, index) => {
        result = result.replace(pattern, replacements[index]);
    });
    
    return result;
}

// ========================================
// LƯU TRỮ DỮ LIỆU ĐÃ CHUẨN HÓA ĐỂ TÌM KIẾM
// ========================================
let searchableData = [];

function prepareSearchData(data) {
    if (!data || data.length === 0) return [];
    
    return data.map(item => ({
        ...item,
        _searchText: removeVietnameseTones((item.assetDescription || '').toLowerCase())
    }));
}

// ========================================
// HÀM TÌM KIẾM - CHỈ TÌM THEO ASSET DESCRIPTION
// ========================================
function searchTable() {
    const input = document.getElementById('searchInput');
    const filter = removeVietnameseTones(input.value.toLowerCase().trim());
    const clearBtn = document.getElementById('searchClear');
    
    // Hiển thị/ẩn nút clear
    if (filter.length > 0) {
        clearBtn.classList.add('show');
    } else {
        clearBtn.classList.remove('show');
    }

    // Nếu không có dữ liệu, thoát
    if (!roiData || roiData.length === 0) {
        const tbody = document.getElementById('tableBody');
        tbody.innerHTML = `
            <tr>
                <td colspan="18" style="text-align:center;padding:40px;color:#999;">
                    <i class="fas fa-inbox" style="font-size:48px;display:block;margin-bottom:10px;"></i>
                    Không có dữ liệu để tìm kiếm
                </td>
            </tr>
        `;
        return;
    }

    // Nếu không có từ khóa, hiển thị tất cả
    if (filter === '') {
        renderTable(roiData);
        hideSearchResultCount();
        return;
    }

    // Lọc dữ liệu theo Asset Description
    const filteredData = roiData.filter((item, index) => {
        // Kiểm tra searchableData
        if (searchableData && searchableData.length > 0) {
            return searchableData[index]?._searchText?.includes(filter) || false;
        }
        // Fallback: chuẩn hóa trực tiếp
        const searchText = removeVietnameseTones((item.assetDescription || '').toLowerCase());
        return searchText.includes(filter);
    });

    renderTable(filteredData);
    
    if (filteredData.length > 0) {
        showSearchResultCount(filteredData.length, roiData.length);
    } else {
        const tbody = document.getElementById('tableBody');
        tbody.innerHTML = `
            <tr>
                <td colspan="18" style="text-align:center;padding:40px;color:#999;">
                    <i class="fas fa-search" style="font-size:48px;display:block;margin-bottom:10px;"></i>
                    Không tìm thấy Asset nào cho "<strong>${input.value}</strong>"
                </td>
            </tr>
        `;
        hideSearchResultCount();
    }
}

// ========================================
// CẬP NHẬT loadData()
// ========================================
async function loadData() {
    try {
        console.log('📊 Đang tải dữ liệu từ server...');
        const response = await fetch('/api/roi-data');
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        console.log('✅ Đã nhận dữ liệu từ server:', data.length, 'bản ghi');
        
        if (data && data.length > 0) {
            roiData = data;
            searchableData = prepareSearchData(data);
            renderTable(roiData);
            showNotification(`Đã tải ${data.length} bản ghi từ database!`, 'success');
        } else {
            roiData = [];
            searchableData = [];
            renderTable(roiData);
            showNotification('Không có dữ liệu!', 'warning');
        }
        
    } catch (error) {
        console.error('❌ Lỗi khi tải dữ liệu:', error);
        roiData = [];
        searchableData = [];
        renderTable(roiData);
        showNotification('Không thể kết nối server!', 'error');
    }
}