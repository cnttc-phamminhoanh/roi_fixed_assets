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
let budgetROIFilter = false;
let finalReceiptFilter = '';
let currentEmployee = null;

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
        if (budgetROIFilter) {
            url += `&budgetROIFilter=true`;
        }
        if (finalReceiptFilter) {
            url += `&finalReceiptFilter=${finalReceiptFilter}`;
        }
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        let result;
        try {
            result = await response.json();
        } catch (parseError) {
            throw new Error('Invalid data received from server');
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

    } catch (error) {
        roiData = [];
        renderTable(roiData);
    }
}

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
                <td colspan="20" style="text-align:center;padding:40px;color:#999;">
                    <i class="fas fa-inbox" style="font-size:48px;display:block;margin-bottom:10px;"></i>
                    No data available
                </td>
            </tr>
        `;
        return;
    }

    // ✅ ĐỘ RỘNG CỘT MẶC ĐỊNH (đã thêm Create User)
    const colWidths = {
        '#': 50,
        'Department': 140,
        'Create User': 120,
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
        'Budget ROI': 120,
        'Actual Quantity': 70,
        'Actual Amount': 110,
        'Actual Benefit': 110,
        'Actual ROI': 120,
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
                <td style="font-weight:600;padding:8px 12px;width:${colWidths['Create User']}px;min-width:${colWidths['Create User']}px;">${item.createUser || '-'}</td>
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
            ? `Showing ${start}-${end} of ${totalRecords} records`
            : 'No data available';
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

    // ========================================
    // 1. CHƯA LOGIN → CHUYỂN SANG TRANG LOGIN
    // ========================================
    if (!currentEmployee) {

        const returnUrl = '/roifixedassets.html';

        window.location.href =
            '/login/login.html?returnUrl=' +
            encodeURIComponent(returnUrl);

        return;
    }

    // ========================================
    // 2. LẤY DỮ LIỆU
    // ========================================
    const item = roiData[index];

    if (!item) {
        showNotification(
            'Data not found!',
            'error'
        );
        return;
    }

    // ========================================
    // 3. KIỂM TRA NGƯỜI TẠO ĐƠN
    // ========================================
    const createUser =
        String(item.createUser || '')
            .trim()
            .toUpperCase();

    const currentUser =
        String(currentEmployee || '')
            .trim()
            .toUpperCase();

    if (!createUser || createUser !== currentUser) {

        showNotification(
            'You are not the request creator.',
            'error'
        );

        return;
    }

    // ========================================
    // 4. ĐƯỢC PHÉP EDIT
    // ========================================
    selectedItem = item;

    const hasFinalReceiptDate =
        selectedItem.hasFinalReceiptDate || false;

    const hasEstimatedPaybackDate =
        selectedItem.hasEstimatedPaybackDate || false;

    const actualAmount =
        parseFloat(selectedItem.actualAmount) || 0;
if (!hasFinalReceiptDate) {
        showNotification(
            '⛔ Cannot enter Benefit because Final Receipt Date is not available!',
            'error'
        );
        return;
    }
    if (!hasEstimatedPaybackDate) {
        showNotification(
             '⛔ Cannot enter Benefit because Estimated Payback Date is not available!',
            'error'
        );
        return;
    }
    if (actualAmount <= 0) {
        showNotification(
             '⛔ Cannot enter Benefit because Actual Amount = 0. Please update the actual amount first!',
            'error'
        );
        return;
    }
    // ========================================
    // HIỂN THỊ BENEFIT MODAL
    // ========================================
    document.getElementById('modalAssetDesc').textContent =
        selectedItem.assetDescription || '-';

    document.getElementById('currentBenefitValue').textContent =
        (selectedItem.actualBenefit || 0).toLocaleString();

    const benefitInput =
        document.getElementById('benefitInput');

    benefitInput.value = '';
    benefitInput.focus();
    benefitInput.select();

    updatePreview(benefitInput.value);

    document.getElementById('benefitModal').style.display = 'flex';

    document.body.style.overflow = 'hidden';

    benefitInput.oninput = function () {
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
        showNotification('Please enter a value greater than or equal to 0!',
            'warning');
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
        showNotification('❌ You cannot enter more than 10 digits!',
            'warning');
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
            credentials: 'include',
            body: JSON.stringify({
                planNo: selectedItem.planNo,
                planId: selectedItem.planId,
                benefitValue: benefitValue
            })
        });

        const result = await response.json();

        if (response.status === 401) {

            currentEmployee = null;
            updateEmployeeMenu();

            showNotification(
                result.message || 'Please login first.',
                'warning'
            );

            closeBenefitModal();
            return;
        }

        if (response.status === 403) {

            showNotification(
                result.message || 'You are not the request creator.',
                'error'
            );

            return;
        }

        if (!response.ok || !result.success) {

            throw new Error(
                result.message || 'Update failed.'
            );
        }

        showNotification(
            '✅ Benefit updated successfully!',
            'success'
        );

        closeBenefitModal();

        await loadData(
            currentPage,
            searchKeyword
        );
    } catch (error) {
        console.error('Save benefit error:', error);

        showNotification(
            error.message || 'Update failed.',
            'error'
        );
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
        console.warn('⚠️ Notification container not found');
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
        success: 'Success',
        error: 'Error',
        warning: 'Warning',
        info: 'Information'
    };

    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.innerHTML = `
        <div class="notification-icon"><i class="fas ${icons[type] || icons.info}"></i></div>
        <div class="notification-content">
            <div class="notification-title">${titles[type] || 'Information'}</div>
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

function toggleBudgetROI() {
    budgetROIFilter = !budgetROIFilter;

    const toggle = document.getElementById('budgetRoiToggle');

    if (budgetROIFilter) {
        toggle.classList.add('active');
        currentPage = 1;
        showNotification('Budget ROI > 0: ON', 'info');
    } else {
        toggle.classList.remove('active');
        currentPage = 1;
        showNotification('Budget ROI filter: OFF', 'info');
    }

    loadData(1, searchKeyword);
}

// ========================================
// HÀM REFRESH & EXPORT
// ========================================
function refreshData() {
    showNotification('Refreshing data...',
        'info');
    loadData(currentPage, searchKeyword);
}


// ========================================
// EXPORT EXCEL
// ========================================
async function exportData() {

    // Kiểm tra thư viện Excel
    if (typeof XLSX === 'undefined') {
        showNotification('Excel library is not loaded!', 'error');
        return;
    }

    try {

        // ========================================
        // LẤY TOÀN BỘ DỮ LIỆU TỪ BACKEND
        // ========================================

        let url = '/api/roi-data/export';

        const params = new URLSearchParams();

        if (searchKeyword) {
            params.append('search', searchKeyword);
        }

        if (budgetROIFilter) {
            params.append('budgetROIFilter', 'true');
        }

        if (finalReceiptFilter) {
            params.append('finalReceiptFilter', finalReceiptFilter);
        }

        const queryString = params.toString();

        if (queryString) {
            url += `?${queryString}`;
        }

        const response = await fetch(url);

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const result = await response.json();

        const exportRows = result?.data || [];

        if (!Array.isArray(exportRows) || exportRows.length === 0) {
            showNotification('No data available to export!', 'warning');
            return;
        }


        // ========================================
        // HEADER GIỐNG TRÊN WEB - ĐÚNG 20 CỘT
        // ========================================

        const excelData = [

            // Header dòng 1 - ĐÚNG 20 CỘT
            [
                '#',                            // 0
                'Department',                   // 1
                'Create User',                  // 2  ⭐ MỚI
                'Asset Class',                  // 3
                'Asset Description',            // 4
                'Purchase Reason',              // 5
                'Depreciation',                 // 6
                'Request Date',                 // 7
                'Final Receipt Date',           // 8
                'Estimated Payback Time (Y)',   // 9
                'Estimated Payback Date',       // 10
                'Budget',                       // 11
                '',                             // 12
                '',                             // 13
                '',                             // 14
                'Actual',                       // 15
                '',                             // 16
                '',                             // 17
                '',                             // 18
                'Planned Investment Results'    // 19
            ],

            // Header dòng 2 - ĐÚNG 20 CỘT (11 ô trống + 8 cột con + 1 ô trống)
            [
                '', '', '', '', '', '', '', '', '', '', '', // 0-10 (11 ô trống)
                'Quantity',                 // 11 - Budget Quantity
                'Amount $',                 // 12 - Budget Amount
                'Annual Total Benefit $',   // 13 - Budget Benefit
                '% ROI',                    // 14 - Budget ROI
                'Quantity',                 // 15 - Actual Quantity
                'Amount $',                 // 16 - Actual Amount
                'Annual Total Benefit $',   // 17 - Actual Benefit
                '% ROI',                    // 18 - Actual ROI
                ''                          // 19 - Planned (rowspan)
            ]
        ];


        // ========================================
        // DỮ LIỆU ĐANG HIỂN THỊ TRÊN WEB
        // ========================================

        exportRows.forEach((item, index) => {

            const budgetROI = parseFloat(item.budgetROI) || 0;
            const actualROI = parseFloat(item.actualROI) || 0;

            const budgetROIText =
                item.budgetROI && item.budgetROI !== 0
                    ? item.budgetROI.toFixed(1) + '%'
                    : '-';

            const actualROIText =
                item.actualROI && item.actualROI !== 0
                    ? item.actualROI.toFixed(1) + '%'
                    : '-';

            const budgetBenefitText =
                item.budgetBenefit && item.budgetBenefit !== 0
                    ? formatNumber(item.budgetBenefit)
                    : '-';

            const actualBenefitText =
                item.actualBenefit !== undefined &&
                item.actualBenefit !== null
                    ? formatNumber(item.actualBenefit)
                    : '$0.00';

            // PASS / NOT PASS
            let plannedResultText = '-';

            if (actualROI > 0 && budgetROI > 0) {
                if (actualROI >= budgetROI) {
                    plannedResultText = '✅ PASS';
                } else {
                    plannedResultText = '❌ NOT PASS';
                }
            }

            // ========================================
            // THÊM 1 DÒNG EXCEL - ĐÚNG 20 CỘT
            // ========================================

            excelData.push([

                // 0 - #
                index + 1,

                // 1 - Department
                item.department || '-',

                // 2 - Create User  ⭐ MỚI
                item.createUser || '-',

                // 3 - Asset Class
                item.assetClass || '-',

                // 4 - Asset Description
                item.assetDescription || '-',

                // 5 - Purchase Reason
                item.purchaseReason || '-',

                // 6 - Depreciation
                item.depreciation || '-',

                // 7 - Request Date
                formatDate(item.requestDate),

                // 8 - Final Receipt Date
                formatDate(item.finalReceiptDate),

                // 9 - Estimated Payback Time
                formatPaybackTime(item.estimatedPaybackTime),

                // 10 - Estimated Payback Date
                formatDate(item.estimatedPaybackDate),

                // 11 - Budget Quantity
                item.budgetQuantity || 0,

                // 12 - Budget Amount
                formatNumber(item.budgetAmount),

                // 13 - Budget Annual Total Benefit
                budgetBenefitText,

                // 14 - Budget ROI
                budgetROIText,

                // 15 - Actual Quantity
                item.actualQuantity || 0,

                // 16 - Actual Amount
                formatNumber(item.actualAmount),

                // 17 - Actual Annual Total Benefit
                actualBenefitText,

                // 18 - Actual ROI
                actualROIText,

                // 19 - Planned Investment Results
                plannedResultText
            ]);
        });


        // ========================================
        // TẠO WORKSHEET
        // ========================================

        const worksheet = XLSX.utils.aoa_to_sheet(excelData);


        // ========================================
        // STYLE HEADER GIỐNG GIAO DIỆN WEB
        // ========================================

        const headerDarkBlue = {
            fill: { patternType: 'solid', fgColor: { rgb: '1F4E78' } },
            font: { bold: true, color: { rgb: 'FFFFFF' } },
            alignment: { horizontal: 'center', vertical: 'center', wrapText: true },
            border: {
                top: { style: 'thin', color: { rgb: 'FFFFFF' } },
                bottom: { style: 'thin', color: { rgb: 'FFFFFF' } },
                left: { style: 'thin', color: { rgb: 'FFFFFF' } },
                right: { style: 'thin', color: { rgb: 'FFFFFF' } }
            }
        };

        const headerOrange = {
            fill: { patternType: 'solid', fgColor: { rgb: 'ED7D31' } },
            font: { bold: true, color: { rgb: 'FFFFFF' } },
            alignment: { horizontal: 'center', vertical: 'center', wrapText: true },
            border: {
                top: { style: 'thin', color: { rgb: 'FFFFFF' } },
                bottom: { style: 'thin', color: { rgb: 'FFFFFF' } },
                left: { style: 'thin', color: { rgb: 'FFFFFF' } },
                right: { style: 'thin', color: { rgb: 'FFFFFF' } }
            }
        };

        const headerBudget = {
            fill: { patternType: 'solid', fgColor: { rgb: '70AD47' } },
            font: { bold: true, color: { rgb: 'FFFFFF' } },
            alignment: { horizontal: 'center', vertical: 'center', wrapText: true }
        };

        const headerBudgetLight = {
            fill: { patternType: 'solid', fgColor: { rgb: 'C6E0B4' } },
            font: { bold: true, color: { rgb: '000000' } },
            alignment: { horizontal: 'center', vertical: 'center', wrapText: true }
        };

        const headerActual = {
            fill: { patternType: 'solid', fgColor: { rgb: 'FFCC33' } },
            font: { bold: true, color: { rgb: '000000' } },
            alignment: { horizontal: 'center', vertical: 'center', wrapText: true }
        };

        const headerActualLight = {
            fill: { patternType: 'solid', fgColor: { rgb: 'FFF5A5' } },
            font: { bold: true, color: { rgb: '000000' } },
            alignment: { horizontal: 'center', vertical: 'center', wrapText: true }
        };

        const headerRed = {
            fill: { patternType: 'solid', fgColor: { rgb: 'C00000' } },
            font: { bold: true, color: { rgb: 'FFFFFF' } },
            alignment: { horizontal: 'center', vertical: 'center', wrapText: true }
        };


        // ========================================
        // ÁP DỤNG MÀU CHO HEADER
        // ========================================

        // Dòng header chính: cột 0-10, orange cho cột 9-10
        for (let col = 0; col <= 10; col++) {
            const cell = worksheet[XLSX.utils.encode_cell({ r: 0, c: col })];
            if (cell) {
                cell.s = (col === 9 || col === 10) ? headerOrange : headerDarkBlue;
            }
        }

        // Budget header: cột 11-14 (L1, M1, N1, O1)
        worksheet['L1'].s = headerBudget;
        worksheet['M1'].s = headerBudget;
        worksheet['N1'].s = headerBudget;
        worksheet['O1'].s = headerBudget;

        // Budget light (dòng 2, cột 11-14)
        for (let col = 11; col <= 14; col++) {
            const cell = worksheet[XLSX.utils.encode_cell({ r: 1, c: col })];
            if (cell) cell.s = headerBudgetLight;
        }

        // Actual header: cột 15-18 (P1, Q1, R1, S1)
        worksheet['P1'].s = headerActual;
        worksheet['Q1'].s = headerActual;
        worksheet['R1'].s = headerActual;
        worksheet['S1'].s = headerActual;

        // Actual light (dòng 2, cột 15-18)
        for (let col = 15; col <= 18; col++) {
            const cell = worksheet[XLSX.utils.encode_cell({ r: 1, c: col })];
            if (cell) cell.s = headerActualLight;
        }

        // Planned header (cột 19): T1
        worksheet['T1'].s = headerRed;


        // ========================================
        // MERGE HEADER GIỐNG TABLE WEB
        // ========================================

        worksheet['!merges'] = [
            { s: { r: 0, c: 0 },  e: { r: 1, c: 0 } },   // # 
            { s: { r: 0, c: 1 },  e: { r: 1, c: 1 } },   // Department
            { s: { r: 0, c: 2 },  e: { r: 1, c: 2 } },   // Create User  ⭐ MỚI
            { s: { r: 0, c: 3 },  e: { r: 1, c: 3 } },   // Asset Class
            { s: { r: 0, c: 4 },  e: { r: 1, c: 4 } },   // Asset Description
            { s: { r: 0, c: 5 },  e: { r: 1, c: 5 } },   // Purchase Reason
            { s: { r: 0, c: 6 },  e: { r: 1, c: 6 } },   // Depreciation
            { s: { r: 0, c: 7 },  e: { r: 1, c: 7 } },   // Request Date
            { s: { r: 0, c: 8 },  e: { r: 1, c: 8 } },   // Final Receipt Date
            { s: { r: 0, c: 9 },  e: { r: 1, c: 9 } },   // Estimated Payback Time
            { s: { r: 0, c: 10 }, e: { r: 1, c: 10 } },  // Estimated Payback Date
            { s: { r: 0, c: 11 }, e: { r: 0, c: 14 } },  // Budget (4 cột)
            { s: { r: 0, c: 15 }, e: { r: 0, c: 18 } },  // Actual (4 cột)
            { s: { r: 0, c: 19 }, e: { r: 1, c: 19 } }   // Planned Investment Results
        ];


        // ========================================
        // ĐỘ RỘNG CỘT - ĐÚNG 20 CỘT
        // ========================================

        worksheet['!cols'] = [
            { wch: 6 },   // 0  - #
            { wch: 18 },  // 1  - Department
            { wch: 15 },  // 2  - Create User  ⭐ MỚI
            { wch: 18 },  // 3  - Asset Class
            { wch: 35 },  // 4  - Asset Description
            { wch: 28 },  // 5  - Purchase Reason
            { wch: 16 },  // 6  - Depreciation
            { wch: 22 },  // 7  - Request Date
            { wch: 22 },  // 8  - Final Receipt Date
            { wch: 28 },  // 9  - Estimated Payback Time
            { wch: 24 },  // 10 - Estimated Payback Date

            { wch: 14 },  // 11 - Budget Quantity
            { wch: 18 },  // 12 - Budget Amount
            { wch: 25 },  // 13 - Budget Benefit
            { wch: 14 },  // 14 - Budget ROI

            { wch: 14 },  // 15 - Actual Quantity
            { wch: 18 },  // 16 - Actual Amount
            { wch: 25 },  // 17 - Actual Benefit
            { wch: 14 },  // 18 - Actual ROI

            { wch: 28 }   // 19 - Planned Results
        ];


        // ========================================
        // TẠO WORKBOOK
        // ========================================

        const workbook = XLSX.utils.book_new();

        XLSX.utils.book_append_sheet(
            workbook,
            worksheet,
            'ROI Asset Data'
        );


        // ========================================
        // TÊN FILE
        // ========================================

        const today = new Date().toISOString().split('T')[0];

        const fileName = `roi_data_${today}.xlsx`;


        // ========================================
        // DOWNLOAD EXCEL
        // ========================================

        XLSX.writeFile(workbook, fileName, { cellStyles: true });

        showNotification(
            'Excel file exported successfully!',
            'success'
        );

    } catch (error) {

        console.error('Export Excel error:', error);

        showNotification(
            'Failed to export Excel file!',
            'error'
        );
    }
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

    const defaultWidths = [50, 130, 120, 120, 200, 150, 120, 120, 130, 160, 150, 80, 120, 150, 80, 80, 120, 150, 80, 130];

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

    showNotification('Column widths have been reset!',
        'success');
}

// ========================================
// KHỞI TẠO TRANG
// ========================================
document.addEventListener('DOMContentLoaded', async function() {

    // Kiểm tra session đăng nhập
    await checkLoginStatus();

    // Tải dữ liệu trang đầu tiên
    await loadData(1, '');

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


// ================================
// DROPDOWN MENU
// ================================

function toggleDropdown() {

    const menu = document.getElementById("dropdownMenu");
    const button = document.getElementById("dropdownBtn");

    menu.classList.toggle("show");
    button.classList.toggle("active");
}


// Click ra bên ngoài thì đóng menu
document.addEventListener("click", function (event) {

    const wrapper = document.querySelector(".dropdown-wrapper");

    if (!wrapper.contains(event.target)) {

        document.getElementById("dropdownMenu").classList.remove("show");
        document.getElementById("dropdownBtn").classList.remove("active");

    }

});

function toggleFinalReceiptMenu(event) {
    event.stopPropagation();

    const menu = document.getElementById('finalReceiptMenu');

    if (menu) {
        menu.classList.toggle('show');
    }
}

// Click ra ngoài menu → tự đóng
document.addEventListener('click', function () {
    const menu = document.getElementById('finalReceiptMenu');

    if (menu) {
        menu.classList.remove('show');
    }
});

// Click bên trong menu → không làm event lan ra document
document.getElementById('finalReceiptMenu')?.addEventListener('click', function (event) {
    event.stopPropagation();
});

function filterFinalReceipt(type) {
    const menu = document.getElementById('finalReceiptMenu');

    if (menu) {
        menu.classList.remove('show');
    }
    finalReceiptFilter = type;
    currentPage = 1;
    if (type === 'not-null') {
        showNotification(
            'Filtering Final Receipt Date: Not Null...',
            'info'
        );
    } else if (type === 'null') {
        showNotification(
            'Filtering Final Receipt Date: Null...',
            'info'
        );
    }

    loadData(1, searchKeyword);
}

function updateEmployeeMenu() {

    const employeeElement =
        document.getElementById('currentEmployee');

    const loginButton =
        document.getElementById('loginMenuBtn');

    const logoutButton =
        document.getElementById('logoutMenuBtn');

    if (!employeeElement) {
        return;
    }

    // ========================================
    // ĐÃ LOGIN
    // ========================================
    if (currentEmployee) {

        employeeElement.textContent =
            currentEmployee;

        if (loginButton) {
            loginButton.style.display = 'none';
        }

        if (logoutButton) {
            logoutButton.style.display = 'flex';
        }

    }

    // ========================================
    // CHƯA LOGIN
    // ========================================
    else {

        employeeElement.textContent =
            'Not logged in';

        if (loginButton) {
            loginButton.style.display = 'flex';
        }

        if (logoutButton) {
            logoutButton.style.display = 'none';
        }
    }
}

async function checkLoginStatus() {

    try {

        const response = await fetch('/api/me', {
            method: 'GET',
            credentials: 'include'
        });

        const result = await response.json();

        if (result.loggedIn) {

            currentEmployee =
                result.employee.empNo;

        } else {

            currentEmployee = null;
        }

        updateEmployeeMenu();

    } catch (error) {

        console.error(
            'checkLoginStatus error:',
            error
        );

        currentEmployee = null;

        updateEmployeeMenu();
    }
}




async function logout() {
    try {
        const response = await fetch('/api/logout', {
            method: 'POST',
            credentials: 'include'
        });

        const result = await response.json();

        if (!response.ok) {
            throw new Error(
                result.message || 'Logout failed.'
            );
        }

        currentEmployee = null;
        pendingBenefitIndex = null;

        updateEmployeeMenu();

        showNotification(
            'Logout successful.',
            'success'
        );

    } catch (error) {
        console.error('Logout error:', error);

        showNotification(
            error.message || 'Logout failed.',
            'error'
        );
    }
}

