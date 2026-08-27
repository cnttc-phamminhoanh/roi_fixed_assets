// backend/src/services/roifixed.Service.js
const roiRepository = require('../repositories/roifixed.Repository');

class ROIService {
    /**
     * Lấy dữ liệu ROI với phân trang và tìm kiếm
     */
    async getROIData(page = 1, limit = 50, search = '') {
        try {
            const result = await roiRepository.getROIData(page, limit, search);
            
            // Transform dữ liệu
            const transformed = this.transformData(result.data);
            
            return {
                data: transformed,
                total: result.total,
                page: result.page,
                limit: result.limit
            };
        } catch (error) {
            console.error('❌ Error in ROIService.getROIData:', error.message);
            return {
                data: [],
                total: 0,
                page: page,
                limit: limit
            };
        }
    }

    /**
     * Transform dữ liệu từ database sang định dạng frontend
     */
    transformData(results) {
        if (!results || results.length === 0) {
            return [];
        }
        
        return results.map((item) => {
            const budgetROI = parseFloat(item.roi_plan) || 0;
            const actualROI = parseFloat(item.roi_act) || 0;
            
            const inDate = item.in_date || null;
            const paybackDate = item.payback_date || null;

            const hasFinalReceiptDate = inDate !== null && 
                                        inDate !== undefined && 
                                        inDate !== '' && 
                                        inDate !== 'N/A' &&
                                        !(inDate instanceof Date && isNaN(inDate.getTime()));
            
            const hasEstimatedPaybackDate = paybackDate !== null && 
                                            paybackDate !== undefined && 
                                            paybackDate !== '' && 
                                            paybackDate !== 'N/A' &&
                                            !(paybackDate instanceof Date && isNaN(paybackDate.getTime()));

            // Xác định Planned Results
            let plannedResults = 'N/A';
            
            if (!hasFinalReceiptDate) {
                plannedResults = '⏳ Chờ nhập hàng';
            } else if (actualROI <= 0 || parseFloat(item.act_benifit) <= 0) {
                plannedResults = '⏳ Chờ cập nhật Benefit';
            } else if (actualROI > 0 && budgetROI > 0) {
                if (actualROI >= budgetROI) {
                    plannedResults = 'PASS ✅';
                } else {
                    plannedResults = 'NOT PASS ❌';
                }
            } else if (actualROI > 0 && budgetROI <= 0) {
                plannedResults = 'N/A';
            }
            
            return {
                department: item.dept_name || '-',
                assetClass: '-',
                assetDescription: item.fa_desc || '-',
                purchaseReason: item.pur_reason || '-',
                depreciation: item.fa_depr || '-',
                requestDate: item.req_date,
                finalReceiptDate: item.in_date,
                estimatedPaybackTime: parseFloat(item.yr_payback) || 0,
                estimatedPaybackDate: item.payback_date,
                budgetQuantity: parseInt(item.plan_qty) || 0,
                budgetAmount: parseFloat(item.plan_amt) || 0,
                budgetBenefit: parseFloat(item.plan_benifit) || 0,
                budgetROI: budgetROI,
                actualQuantity: parseInt(item.in_qty) || 0,
                actualAmount: parseFloat(item.act_amt) || 0,
                actualBenefit: parseFloat(item.act_benifit) || 0,
                actualROI: actualROI,
                plannedResults: plannedResults,
                planNo: item.plan_no,
                planId: item.plan_id,
                hasFinalReceiptDate: hasFinalReceiptDate,
                hasEstimatedPaybackDate: hasEstimatedPaybackDate
            };
        });
    }

    /**
     * Cập nhật Actual Benefit
     */
    async updateActualBenefit(planNo, planId, benefitValue) {
        try {
            // Validate input
            if (!planNo || !planId) {
                throw new Error('Thiếu thông tin planNo hoặc planId');
            }

            if (benefitValue === undefined || benefitValue === null) {
                throw new Error('Vui lòng nhập giá trị benefit');
            }

            if (isNaN(benefitValue) || benefitValue < 0) {
                throw new Error('Giá trị benefit phải là số và lớn hơn hoặc bằng 0');
            }

            // Kiểm tra giới hạn số (phần nguyên tối đa 10 chữ số)
            const strValue = String(benefitValue);
            const parts = strValue.split('.');
            const integerPart = parts[0] || '0';
            
            if (integerPart.replace('-', '').length > 10) {
                throw new Error('Không được nhập quá 10 chữ số cho phần nguyên');
            }

            // Gọi repository để cập nhật
            const result = await roiRepository.updateActualBenefit(planNo, planId, benefitValue);
            
            return result;
        } catch (error) {
            console.error('❌ Error in ROIService.updateActualBenefit:', error);
            throw error;
        }
    }

    /**
     * Lấy thông tin chi tiết của một record
     */
    async getRecordDetail(planNo, planId) {
        try {
            // Lấy tất cả dữ liệu và filter theo planNo, planId
            const allData = await roiRepository.getROIData(1, 10000, '');
            const records = allData.data || [];
            
            const record = records.find(item => 
                item.plan_no === planNo && item.plan_id === planId
            );
            
            if (!record) {
                throw new Error('Không tìm thấy bản ghi');
            }
            
            return this.transformData([record])[0] || null;
        } catch (error) {
            console.error('❌ Error in ROIService.getRecordDetail:', error);
            throw error;
        }
    }

    /**
     * Thống kê tổng hợp
     */
    async getStatistics() {
        try {
            const result = await roiRepository.getROIData(1, 10000, '');
            const data = this.transformData(result.data || []);
            
            const totalPlanAmount = data.reduce((sum, item) => sum + (item.budgetAmount || 0), 0);
            const totalActualAmount = data.reduce((sum, item) => sum + (item.actualAmount || 0), 0);
            
            const validPlanROI = data.filter(item => item.budgetROI > 0);
            const avgPlanROI = validPlanROI.length > 0 
                ? validPlanROI.reduce((sum, item) => sum + item.budgetROI, 0) / validPlanROI.length 
                : 0;
            
            const validActualROI = data.filter(item => item.actualROI > 0);
            const avgActualROI = validActualROI.length > 0 
                ? validActualROI.reduce((sum, item) => sum + item.actualROI, 0) / validActualROI.length 
                : 0;
            
            const passCount = data.filter(item => item.plannedResults === 'PASS ✅').length;
            const notPassCount = data.filter(item => item.plannedResults === 'NOT PASS ❌').length;
            const pendingCount = data.filter(item => 
                item.plannedResults === '⏳ Chờ nhập hàng' || 
                item.plannedResults === '⏳ Chờ cập nhật Benefit'
            ).length;
            
            return {
                totalRecords: data.length,
                totalPlanAmount: totalPlanAmount,
                totalActualAmount: totalActualAmount,
                avgPlanROI: avgPlanROI,
                avgActualROI: avgActualROI,
                passCount: passCount,
                notPassCount: notPassCount,
                pendingCount: pendingCount
            };
        } catch (error) {
            console.error('❌ Error in ROIService.getStatistics:', error);
            return {
                totalRecords: 0,
                totalPlanAmount: 0,
                totalActualAmount: 0,
                avgPlanROI: 0,
                avgActualROI: 0,
                passCount: 0,
                notPassCount: 0,
                pendingCount: 0
            };
        }
    }
}

module.exports = new ROIService();