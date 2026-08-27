// ========================================
// DỮ LIỆU MẪU (để trống, chỉ dùng khi lỗi)
// ========================================
const sampleData = [];

// ========================================
// BIẾN TOÀN CỤC
// ========================================
let roiData = [];
let selectedItem = null;
let searchKeyword = '';
// ========================================
// PAGINATION - BIẾN TOÀN CỤC
// ========================================
let currentPage = 1;
let rowsPerPage = 50;
let totalPages = 0;
let fullData = [];

// ========================================
// HÀM LẤY DỮ LIỆU TỪ SERVER
// ========================================
async function loadData(page = 1, keyword = '') {
    try {
        let url = `/api/roi-data?page=${page}&limit=${rowsPerPage}`;
        if (keyword) {
            url += `&search=${encodeURIComponent(keyword)}`;
        }
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        let result;
        try {
            result = await response.json();
        } catch (parseError) {
            throw new Error('Dữ liệu từ server không hợp lệ');
        }
        const data = result?.data || result || [];
        const total = result?.total || data.length || 0;
        
        // ✅ Nếu data là mảng, gán vào roiData
        if (Array.isArray(data)) {
            roiData = data;
        } else {
            roiData = [];
        }
        
        totalPages = Math.ceil(total / rowsPerPage);
        currentPage = page;
        searchKeyword = keyword;
        
        // Chuẩn bị dữ liệu tìm kiếm
        searchableData = prepareSearchData(roiData);
        
        // Render bảng
        renderTable(roiData);
        updatePaginationControls(total);
        
        // if (roiData.length > 0) {
        //     showNotification(`Đã tải ${roiData.length} bản ghi`, 'success');
        // } else {
        //     showNotification('Không có dữ liệu!', 'warning');
        // }
        
    } catch (error) {
        roiData = [];
        renderTable(roiData);
    }
}

// ========================================
// HÀM HIỂN THỊ DỮ LIỆU
// ========================================
// ========================================
// HÀM HIỂN THỊ DỮ LIỆU
// ========================================
function renderTable(data) {
    const tbody = document.getElementById('tableBody');
    
    if (!tbody) {
        return;
    }
    
    if (!data || data.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="19" style="text-align:center;padding:40px;color:#999;">
                    <i class="fas fa-inbox" style="font-size:48px;display:block;margin-bottom:10px;"></i>
                    Không có dữ liệu
                </td>
            </tr>
        `;
        return;
    }

    // ✅ ĐỘ RỘNG CỘT MẶC ĐỊNH
    const colWidths = {
        '#': 50,
        'Department': 140,
        'Asset Class': 120,
        'Asset Description': 150,
        'Purchase Reason': 140,
        'Depreciation': 120,
        'Request Date': 130,
        'Final Receipt Date': 130,
        'Estimated Payback Time (Y)': 120,
        'Estimated Payback Date': 140,
        'Budget Quantity': 70,
        'Budget Amount': 110,
        'Budget Benefit': 110,
        'Budget ROI': 80,
        'Actual Quantity': 70,
        'Actual Amount': 110,
        'Actual Benefit': 110,
        'Actual ROI': 80,
        'Planned Results': 130
    };

    let html = '';
    data.forEach((item, index) => {
        const budgetROIClass = getROIClass(item.budgetROI);
        const actualROIClass = getROIClass(item.actualROI);
        const roiDiff = (item.actualROI || 0) - (item.budgetROI || 0);

        // XÉT PASS/NOT PASS
        let plannedResultText = '-';
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
        }

        html += `
            <tr>
                <td style="text-align:center;font-weight:600;padding:8px 12px;color:#1a3c5e;width:${colWidths['#']}px;min-width:${colWidths['#']}px;">${index + 1}</td>
                <td style="font-weight:600;padding:8px 12px;width:${colWidths['Department']}px;min-width:${colWidths['Department']}px;">${item.department || '-'}</td>
                <td style="padding:8px 12px;width:${colWidths['Asset Class']}px;min-width:${colWidths['Asset Class']}px;">${item.assetClass || '-'}</td>
                <td style="padding:8px 12px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;width:${colWidths['Asset Description']}px ;min-width:${colWidths['Asset Description']}px;"
                    title="${item.assetDescription || '-'}">${item.assetDescription || '-'}</td>
                <td style="padding:8px 12px;width:${colWidths['Purchase Reason']}px;min-width:${colWidths['Purchase Reason']}px;">${item.purchaseReason || '-'}</td>
                <td style="padding:8px 12px;width:${colWidths['Depreciation']}px;min-width:${colWidths['Depreciation']}px;">${item.depreciation || '-'}</td>
                <td style="padding:8px 12px;width:${colWidths['Request Date']}px;min-width:${colWidths['Request Date']}px;">${formatDate(item.requestDate)}</td>
                <td style="padding:8px 12px;width:${colWidths['Final Receipt Date']}px;min-width:${colWidths['Final Receipt Date']}px;">${formatDate(item.finalReceiptDate)}</td>
                <td style="font-weight:600;text-align:center;padding:8px 12px;width:${colWidths['Estimated Payback Time (Y)']}px;min-width:${colWidths['Estimated Payback Time (Y)']}px;">${formatPaybackTime(item.estimatedPaybackTime)}</td>
                <td style="font-weight:600;padding:8px 12px;width:${colWidths['Estimated Payback Date']}px;min-width:${colWidths['Estimated Payback Date']}px;">${formatDate(item.estimatedPaybackDate)}</td>
                <td style="text-align:center;padding:8px 12px;width:${colWidths['Budget Quantity']}px;min-width:${colWidths['Budget Quantity']}px;">${item.budgetQuantity || 0}</td>
                <td style="text-align:right;padding:8px 12px;width:${colWidths['Budget Amount']}px;min-width:${colWidths['Budget Amount']}px;">${formatNumber(item.budgetAmount)}</td>
                <td style="text-align:right;padding:8px 12px;width:${colWidths['Budget Benefit']}px;min-width:${colWidths['Budget Benefit']}px;">${item.budgetBenefit && item.budgetBenefit !== 0 ? formatNumber(item.budgetBenefit) : '-'}</td>
                <td style="text-align:center;padding:8px 12px;width:${colWidths['Budget ROI']}px;min-width:${colWidths['Budget ROI']}px;" class="${budgetROIClass}">${item.budgetROI && item.budgetROI !== 0 ? item.budgetROI.toFixed(1) + '%' : '-'}</td>
                <td style="text-align:center;padding:8px 12px;width:${colWidths['Actual Quantity']}px;min-width:${colWidths['Actual Quantity']}px;">${item.actualQuantity || 0}</td>
                <td style="text-align:right;padding:8px 12px;width:${colWidths['Actual Amount']}px;min-width:${colWidths['Actual Amount']}px;">${formatNumber(item.actualAmount)}</td>
                <td style="text-align:right;padding:8px 12px;width:${colWidths['Actual Benefit']}px;min-width:${colWidths['Actual Benefit']}px;" class="clickable-cell" onclick="openBenefitModal(${index})" title="Click to edit benefit">${formatNumber(item.actualBenefit)}</td>
                <td style="text-align:center;padding:8px 12px;width:${colWidths['Actual ROI']}px;min-width:${colWidths['Actual ROI']}px;" class="${actualROIClass}">
                ${item.actualROI && item.actualROI !== 0 ? item.actualROI.toFixed(1) + '%' : '-'}
                </td>
                <td style="text-align:center;padding:8px 12px;font-weight:700;background-color:${plannedBgColor};color:${plannedTextColor};border-radius:4px;width:${colWidths['Planned Results']}px;min-width:${colWidths['Planned Results']}px;">
                    ${plannedResultText}
                </td>
            </tr>
        `;
    });

    tbody.innerHTML = html;
}
// ========================================
// PAGINATION
// ========================================

/**
 * Lấy dữ liệu phân trang
 */
function updatePaginationControls(total) {
    const totalRecords = total || roiData.length;
    const start = (currentPage - 1) * rowsPerPage + 1;
    const end = Math.min(currentPage * rowsPerPage, totalRecords);
    
    const infoEl = document.getElementById('paginationInfo');
    if (infoEl) {
        infoEl.textContent = totalRecords > 0 
            ? `Hiển thị ${start}-${end} trên tổng ${totalRecords} bản ghi`
            : 'Không có dữ liệu';
    }
    
    const prevBtn = document.getElementById('prevPage');
    const nextBtn = document.getElementById('nextPage');
    if (prevBtn) prevBtn.disabled = currentPage <= 1;
    if (nextBtn) nextBtn.disabled = currentPage >= totalPages;
    
    renderPageNumbers();
}

/**
 * Render các nút số trang
 */
function renderPageNumbers() {
    const container = document.getElementById('pageNumbers');
    if (!container) return;
    
    let html = '';
    const maxVisible = 5;
    let startPage = Math.max(1, currentPage - Math.floor(maxVisible / 2));
    let endPage = Math.min(totalPages, startPage + maxVisible - 1);
    
    if (endPage - startPage < maxVisible - 1) {
        startPage = Math.max(1, endPage - maxVisible + 1);
    }
    
    if (startPage > 1) {
        html += `<button class="page-number-btn" onclick="goToPage(1)">1</button>`;
        if (startPage > 2) {
            html += `<span style="padding:0 4px;color:#6c757d;">...</span>`;
        }
    }
    
    for (let i = startPage; i <= endPage; i++) {
        html += `<button class="page-number-btn ${i === currentPage ? 'active-page' : ''}" onclick="goToPage(${i})">${i}</button>`;
    }
    
    if (endPage < totalPages) {
        if (endPage < totalPages - 1) {
            html += `<span style="padding:0 4px;color:#6c757d;">...</span>`;
        }
        html += `<button class="page-number-btn" onclick="goToPage(${totalPages})">${totalPages}</button>`;
    }
    
    container.innerHTML = html;
}

/**
 * Chuyển đến trang cụ thể
 */
function goToPage(page) {
    if (page < 1 || page > totalPages || page === currentPage) return;
    
    // ✅ Gọi API lấy dữ liệu trang mới
    loadData(page, searchKeyword);
    
    const tableWrapper = document.querySelector('.table-wrapper');
    if (tableWrapper) tableWrapper.scrollTop = 0;
}

/**
 * Chuyển trang (trước/sau)
 */
function changePage(delta) {
    const newPage = currentPage + delta;
    if (newPage < 1 || newPage > totalPages) return;
    goToPage(newPage);
}

/**
 * Thay đổi số dòng mỗi trang
 */
function changeRowsPerPage() {
    const select = document.getElementById('rowsPerPage');
    rowsPerPage = parseInt(select.value);
    currentPage = 1;
    // ✅ Gọi API với số dòng mới
    loadData(1, searchKeyword);
}


// ========================================
// CẬP NHẬT THẺ THỐNG KÊ
// ========================================
function updateSummaryCards(data) {
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

function formatPaybackTime(value) {
    if (value === undefined || value === null || isNaN(value)) return '0.0000';
    return parseFloat(value).toFixed(4);
}

function formatNumber(value) {
    if (value === undefined || value === null || isNaN(value)) return '0.00';
    return '$' + parseFloat(value).toFixed(2);
}

// ========================================
// MODAL FUNCTIONS
// ========================================
function openBenefitModal(index) {
    selectedItem = roiData[index];
    if (!selectedItem) { 
        showNotification('Không tìm thấy dữ liệu!', 'error');
        return; 
    }

    const hasFinalReceiptDate = selectedItem.hasFinalReceiptDate || false;
    const hasEstimatedPaybackDate = selectedItem.hasEstimatedPaybackDate || false;
    const actualAmount = parseFloat(selectedItem.actualAmount) || 0;
    
    if (!hasFinalReceiptDate) {
        showNotification(
            '⛔ Không thể nhập Benefit vì chưa có ngày nhập hàng (Final Receipt Date)!', 
            'error'
        );
        return;
    }
    if (!hasEstimatedPaybackDate) {
        showNotification(
            '⛔ Không thể nhập Benefit vì chưa có ngày hoàn vốn dự kiến (Estimated Payback Date)!', 
            'error'
        );
        return;
    }
    if (actualAmount <= 0) {
        showNotification(
            '⛔ Không thể nhập Benefit vì Actual Amount = 0. Vui lòng cập nhật số tiền thực tế trước!', 
            'error'
        );
        return;
    }

    document.getElementById('modalAssetDesc').textContent = selectedItem.assetDescription || '-';
    document.getElementById('currentBenefitValue').textContent = (selectedItem.actualBenefit || 0).toLocaleString();
    
    const benefitInput = document.getElementById('benefitInput');
    benefitInput.value = '';
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
}
async function saveBenefit() {
    if (!selectedItem) {
        return;
    }
    
    const benefitInput = document.getElementById('benefitInput');
    const benefitValue = parseFloat(benefitInput.value);
    
    if (isNaN(benefitValue) || benefitValue < 0) {
        showNotification('Vui lòng nhập giá trị lớn hơn hoặc bằng 0!', 'warning');
        benefitInput.focus();
        benefitInput.select();
        return;
    }

    // ✅ KIỂM TRA GIỚI HẠN DECIMAL(18,8)
    // Phần nguyên tối đa 10 chữ số, phần thập phân tối đa 8 chữ số
    const strValue = benefitInput.value.trim();
    const parts = strValue.split('.');
    const integerPart = parts[0] || '0';

    
    // Kiểm tra phần nguyên (tối đa 10 chữ số)
    if (integerPart.replace('-', '').length > 10) {
        showNotification('❌ Không được nhập quá 10 chữ số !', 'warning');
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

        const result = await response.json();

        if (response.ok && result.success) {
            showNotification('✅ Cập nhật benefit thành công!', 'success');
            closeBenefitModal();
            await loadData(currentPage, searchKeyword);
        } else {
            throw new Error(result.message || 'Cập nhật thất bại');
        }
    } catch (error) {
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
    showNotification('Đang làm mới dữ liệu...', 'info');
    loadData(currentPage, searchKeyword);
}

function exportData() {
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
    const filter = input.value.trim();
    const clearBtn = document.getElementById('searchClear');
    
    if (filter.length > 0) {
        clearBtn.classList.add('show');
    } else {
        clearBtn.classList.remove('show');
    }
    
    // ✅ Lưu từ khóa search và gọi API
    searchKeyword = filter;
    currentPage = 1;
    
    // ✅ Gọi API với từ khóa tìm kiếm
    loadData(1, searchKeyword);
}

// ========================================
// XÓA TÌM KIẾM
// ========================================
function clearSearch() {
    const input = document.getElementById('searchInput');
    if (input) input.value = '';
    const clearBtn = document.getElementById('searchClear');
    if (clearBtn) clearBtn.classList.remove('show');
    
    searchKeyword = '';
    currentPage = 1;
    
    // ✅ Gọi API lấy toàn bộ dữ liệu
    loadData(1, '');
}

// ========================================
// COLUMN RESIZE - KÉO THẢ (colResizable)
// ========================================
function initColumnResize() {
    if (typeof $ === 'undefined') {
        return;
    }
    
    if (!$.fn.colResizable) {
        return;
    }
    
    const table = document.getElementById('roiTable');
    if (!table) {
        return;
    }
    
    const tbody = document.getElementById('tableBody');
    if (!tbody || tbody.children.length === 0) {
        setTimeout(initColumnResize, 500);
        return;
    }
    
    try {
        try {
            $(table).colResizable({ disable: true });
        } catch (e) {}
        
        $(table).colResizable({
            liveDrag: false,
            resizeMode: 'flex',
            minWidth: 50,
            maxWidth: 750,
            disabledColumns: [0],
            postbackSafe: true,
            gripInnerHtml: '<div style="width:4px;height:30px;background:#c0c0c0;border-radius:2px;margin:0 auto;"></div>',
            draggingClass: 'resizing-active',
            onResize: function() {}
        });
        
    } catch (error) {}
}

function resetColumnWidths() {
    const table = document.getElementById('roiTable');
    if (!table) return;
    
    const defaultWidths = [50, 130, 120, 200, 150, 120, 120, 130, 160, 150, 80, 120, 150, 80, 80, 120, 150, 80, 130];
    
    const headers = table.querySelectorAll('thead th');
    headers.forEach((th, index) => {
        const width = defaultWidths[index] || 120;
        th.style.width = width + 'px';
        th.style.minWidth = width + 'px';
        th.style.maxWidth = width + 'px';
    });
    
    const rows = table.querySelectorAll('tbody tr');
    rows.forEach(row => {
        const cells = row.querySelectorAll('td');
        cells.forEach((cell, index) => {
            const width = defaultWidths[index] || 120;
            cell.style.width = width + 'px';
            cell.style.minWidth = width + 'px';
            cell.style.maxWidth = width + 'px';
        });
    });
    
    if (typeof $ !== 'undefined' && $.fn.colResizable) {
        $(table).colResizable('destroy');
        setTimeout(() => initColumnResize(), 200);
    }
    
    showNotification('Đã reset độ rộng cột!', 'success');
}

// ========================================
// KHỞI TẠO TRANG
// ========================================
document.addEventListener('DOMContentLoaded', function() {
    // ✅ Tải dữ liệu trang đầu tiên
    loadData(1, '');
    setTimeout(function() {
        initColumnResize();
    }, 1000);
});

// Đóng modal
document.addEventListener('click', function(event) {
    const modal = document.getElementById('benefitModal');
    if (event.target === modal || event.target.classList.contains('modal-overlay')) {
        closeBenefitModal();
    }
});
document.addEventListener('keydown', function(event) {
    if (event.key === 'Escape') closeBenefitModal();
});

// ========================================
// COL RESIZABLE INLINE - FIX
// ========================================

(function() {
    if (typeof $ !== 'undefined' && !$.fn.colResizable) {
        console.log('🔧 Đang khởi tạo colResizable inline...');
        
        $.fn.colResizable = function(options) {
            const defaults = {
                liveDrag: true,
                resizeMode: 'flex',
                minWidth: 50,
                maxWidth: 500,
                disabledColumns: []
            };
            
            const settings = $.extend({}, defaults, options);
            
            return this.each(function() {
                const table = $(this);
                const headers = table.find('thead th');
                let dragging = false;
                let currentCol = null;
                let currentColIndex = -1;
                let startX = 0;
                let startWidth = 0;
                table.find('.JColResizer').remove();
                headers.each(function(index) {
                    if (settings.disabledColumns.includes(index)) {
                        return;
                    }
                    const th = $(this);
                    th.css('position', 'relative');
                    
                    const handle = $('<div class="JColResizer"></div>');
                    handle.css({
                        position: 'absolute',
                        right: '-5px',
                        top: '0',
                        width: '10px',
                        height: '100%',
                        cursor: 'col-resize',
                        zIndex: '10'
                    });
                    th.append(handle);
                    
                    handle.on('mousedown', function(e) {
                        e.preventDefault();
                        e.stopPropagation();
                        dragging = true;
                        currentCol = th;
                        currentColIndex = index;
                        startX = e.clientX;
                        startWidth = th.outerWidth();
                        $('body').css('cursor', 'col-resize');
                        table.addClass('resizing-active');
                        handle.addClass('active');
                    });
                });
                
                $(document).on('mousemove', function(e) {
                    if (!dragging || !currentCol) return;
                    const diff = e.clientX - startX;
                    const newWidth = Math.max(settings.minWidth, Math.min(settings.maxWidth, startWidth + diff));
                    currentCol.css('width', newWidth + 'px');
                    currentCol.css('min-width', newWidth + 'px');
                    currentCol.css('max-width', newWidth + 'px');
                    table.find('tbody tr').each(function() {
                        const cell = $(this).find('td').eq(currentColIndex);
                        if (cell.length) {
                            cell.css('width', newWidth + 'px');
                            cell.css('min-width', newWidth + 'px');
                            cell.css('max-width', newWidth + 'px');
                        }
                    });
                });
                
                $(document).on('mouseup', function() {
                    if (dragging) {
                        dragging = false;
                        currentCol = null;
                        currentColIndex = -1;
                        $('body').css('cursor', '');
                        table.removeClass('resizing-active');
                        table.find('.JColResizer').removeClass('active');
                    }
                });
            });
        };
    }
})();

// ========================================
// XỬ LÝ PHÍM ENTER KHI TÌM KIẾM
// ========================================
function handleSearchKeyPress(event) {
    if (event.key === 'Enter') {
        event.preventDefault();
        searchTable();
    }
}