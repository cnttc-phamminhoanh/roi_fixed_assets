// backend/src/services/roifixed.Service.js

const roiRepository = require('../repositories/roifixed.Repository');

class ROIService {

    /**
     * ============================================================
     * LẤY DỮ LIỆU ROI VỚI PHÂN TRANG VÀ TÌM KIẾM
     * ============================================================
     */
    async getROIData(
        page = 1,
        limit = 50,
        search = '',
        budgetROIFilter = false,
        finalReceiptFilter = ''
    ) {
        try {

            const result = await roiRepository.getROIData(
                page,
                limit,
                search,
                budgetROIFilter,
                finalReceiptFilter
            );

            // ========================================================
            // TRANSFORM DỮ LIỆU
            // ========================================================

            const transformed =
                this.transformData(result.data);

            return {
                data: transformed,
                total: result.total,
                page: result.page,
                limit: result.limit
            };

        } catch (error) {

            console.error(
                '❌ Error in ROIService.getROIData:',
                error.message
            );

            return {
                data: [],
                total: 0,
                page: page,
                limit: limit
            };
        }
    }


    /**
     * ============================================================
     * TRANSFORM DỮ LIỆU DATABASE → FRONTEND
     * ============================================================
     */
    transformData(results) {

        if (!results || results.length === 0) {
            return [];
        }

        return results.map((item) => {

            // ========================================================
            // ROI
            // ========================================================

            const budgetROI =
                parseFloat(item.roi_plan) || 0;

            const actualROI =
                parseFloat(item.roi_act) || 0;


            // ========================================================
            // FINAL RECEIPT DATE
            // ========================================================

            const inDate =
                item.in_date || null;

            const paybackDate =
                item.payback_date || null;


            // ========================================================
            // FINAL RECEIPT DATE CÓ TỒN TẠI KHÔNG
            // ========================================================

            const hasFinalReceiptDate =
                inDate !== null &&
                inDate !== undefined &&
                inDate !== '' &&
                inDate !== 'N/A' &&
                !(
                    inDate instanceof Date &&
                    isNaN(inDate.getTime())
                );


            // ========================================================
            // ESTIMATED PAYBACK DATE
            // ========================================================

            const hasEstimatedPaybackDate =
                paybackDate !== null &&
                paybackDate !== undefined &&
                paybackDate !== '' &&
                paybackDate !== 'N/A' &&
                !(
                    paybackDate instanceof Date &&
                    isNaN(paybackDate.getTime())
                );


            const receiptSheetSta =
                Number(item.receiptSheetSta) || 0;


            // ========================================================
            // PLANNED RESULTS
            // ========================================================

            let plannedResults = 'N/A';

            if (!hasFinalReceiptDate) {

                plannedResults =
                    '⏳ Chờ nhập hàng';

            } else if (
                actualROI <= 0 ||
                parseFloat(item.act_benifit) <= 0
            ) {

                plannedResults =
                    '⏳ Chờ cập nhật Benefit';

            } else if (
                actualROI > 0 &&
                budgetROI > 0
            ) {

                if (actualROI >= budgetROI) {

                    plannedResults =
                        'PASS ✅';

                } else {

                    plannedResults =
                        'NOT PASS ❌';
                }

            } else if (
                actualROI > 0 &&
                budgetROI <= 0
            ) {

                plannedResults = 'N/A';
            }


            // ========================================================
            // TRẢ DỮ LIỆU CHO FRONTEND
            // ========================================================

            return {

                department:
                    item.dept_name || '-',

                createUser:
                    item.create_user || '-',

                assetClass:
                    '-',

                assetDescription:
                    item.fa_desc || '-',

                purchaseReason:
                    item.pur_reason || '-',

                depreciation:
                    item.fa_depr || '-',

                requestDate:
                    item.req_date,

                finalReceiptDate:
                    item.in_date,

                // ====================================================
                // QUAN TRỌNG:
                // oa_fa_pur_in1.sheet_sta
                // ====================================================
                receiptSheetSta:
                    receiptSheetSta,

                estimatedPaybackTime:
                    parseFloat(item.yr_payback) || 0,

                estimatedPaybackDate:
                    item.payback_date,

                budgetQuantity:
                    parseInt(item.plan_qty) || 0,

                budgetAmount:
                    parseFloat(item.plan_amt) || 0,

                budgetBenefit:
                    parseFloat(item.plan_benifit) || 0,

                budgetROI:
                    budgetROI,

                actualQuantity:
                    parseInt(item.in_qty) || 0,

                actualAmount:
                    parseFloat(item.act_amt) || 0,

                actualBenefit:
                    parseFloat(item.act_benifit) || 0,

                actualROI:
                    actualROI,

                plannedResults:
                    plannedResults,

                planNo:
                    item.plan_no,

                planId:
                    item.plan_id,

                hasFinalReceiptDate:
                    hasFinalReceiptDate,

                hasEstimatedPaybackDate:
                    hasEstimatedPaybackDate
            };
        });
    }


    /**
     * ============================================================
     * LẤY TOÀN BỘ DỮ LIỆU ROI ĐỂ EXPORT EXCEL
     * ============================================================
     */
    async getROIDataForExport(
        search = '',
        budgetROIFilter = false,
        finalReceiptFilter = ''
    ) {
        try {

            const result =
                await roiRepository.getROIData(
                    1,
                    50,
                    search,
                    budgetROIFilter,
                    finalReceiptFilter,
                    true
                );

            const transformed =
                this.transformData(result.data);

            return {
                data: transformed,
                total: transformed.length
            };

        } catch (error) {

            console.error(
                '❌ Error in ROIService.getROIDataForExport:',
                error.message
            );

            throw error;
        }
    }


    /**
     * ============================================================
     * CẬP NHẬT ACTUAL BENEFIT
     * ============================================================
     */
    async updateActualBenefit(
        planNo,
        planId,
        benefitValue
    ) {
        try {

            // ========================================================
            // VALIDATE PLAN
            // ========================================================

            if (!planNo || !planId) {
                throw new Error(
                    'Thiếu thông tin planNo hoặc planId'
                );
            }


            // ========================================================
            // VALIDATE BENEFIT
            // ========================================================

            if (
                benefitValue === undefined ||
                benefitValue === null
            ) {
                throw new Error(
                    'Vui lòng nhập giá trị benefit'
                );
            }


            if (
                isNaN(benefitValue) ||
                benefitValue < 0
            ) {
                throw new Error(
                    'Giá trị benefit phải là số và lớn hơn hoặc bằng 0'
                );
            }


            // ========================================================
            // KIỂM TRA GIỚI HẠN SỐ
            // PHẦN NGUYÊN TỐI ĐA 10 CHỮ SỐ
            // ========================================================

            const strValue =
                String(benefitValue);

            const parts =
                strValue.split('.');

            const integerPart =
                parts[0] || '0';


            if (
                integerPart
                    .replace('-', '')
                    .length > 10
            ) {
                throw new Error(
                    'Không được nhập quá 10 chữ số cho phần nguyên'
                );
            }


            // ========================================================
            // GỌI REPOSITORY UPDATE
            // ========================================================

            const result =
                await roiRepository.updateActualBenefit(
                    planNo,
                    planId,
                    benefitValue
                );

            return result;

        } catch (error) {

            console.error(
                '❌ Error in ROIService.updateActualBenefit:',
                error
            );

            throw error;
        }
    }


    /**
     * ============================================================
     * LẤY THÔNG TIN CHI TIẾT MỘT RECORD
     * ============================================================
     */
    async getRecordDetail(
        planNo,
        planId
    ) {
        try {

            const allData =
                await roiRepository.getROIData(
                    1,
                    10000,
                    ''
                );

            const records =
                allData.data || [];

            const record =
                records.find(item =>
                    item.plan_no === planNo &&
                    item.plan_id === planId
                );

            if (!record) {
                throw new Error(
                    'Không tìm thấy bản ghi'
                );
            }

            return (
                this.transformData([record])[0] ||
                null
            );

        } catch (error) {

            console.error(
                '❌ Error in ROIService.getRecordDetail:',
                error
            );

            throw error;
        }
    }


    /**
     * ============================================================
     * THỐNG KÊ TỔNG HỢP
     * ============================================================
     */
    async getStatistics() {
        try {

            const result =
                await roiRepository.getROIData(
                    1,
                    10000,
                    ''
                );

            const data =
                this.transformData(
                    result.data || []
                );


            // ========================================================
            // TOTAL PLAN AMOUNT
            // ========================================================

            const totalPlanAmount =
                data.reduce(
                    (sum, item) =>
                        sum +
                        (item.budgetAmount || 0),
                    0
                );


            // ========================================================
            // TOTAL ACTUAL AMOUNT
            // ========================================================

            const totalActualAmount =
                data.reduce(
                    (sum, item) =>
                        sum +
                        (item.actualAmount || 0),
                    0
                );


            // ========================================================
            // AVG PLAN ROI
            // ========================================================

            const validPlanROI =
                data.filter(
                    item =>
                        item.budgetROI > 0
                );

            const avgPlanROI =
                validPlanROI.length > 0
                    ? validPlanROI.reduce(
                        (sum, item) =>
                            sum +
                            item.budgetROI,
                        0
                    ) / validPlanROI.length
                    : 0;


            // ========================================================
            // AVG ACTUAL ROI
            // ========================================================

            const validActualROI =
                data.filter(
                    item =>
                        item.actualROI > 0
                );

            const avgActualROI =
                validActualROI.length > 0
                    ? validActualROI.reduce(
                        (sum, item) =>
                            sum +
                            item.actualROI,
                        0
                    ) / validActualROI.length
                    : 0;


            // ========================================================
            // PASS / NOT PASS / PENDING
            // ========================================================

            const passCount =
                data.filter(
                    item =>
                        item.plannedResults ===
                        'PASS ✅'
                ).length;


            const notPassCount =
                data.filter(
                    item =>
                        item.plannedResults ===
                        'NOT PASS ❌'
                ).length;


            const pendingCount =
                data.filter(
                    item =>
                        item.plannedResults ===
                            '⏳ Chờ nhập hàng' ||
                        item.plannedResults ===
                            '⏳ Chờ cập nhật Benefit'
                ).length;


            return {
                totalRecords:
                    data.length,

                totalPlanAmount:
                    totalPlanAmount,

                totalActualAmount:
                    totalActualAmount,

                avgPlanROI:
                    avgPlanROI,

                avgActualROI:
                    avgActualROI,

                passCount:
                    passCount,

                notPassCount:
                    notPassCount,

                pendingCount:
                    pendingCount
            };

        } catch (error) {

            console.error(
                '❌ Error in ROIService.getStatistics:',
                error
            );

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


    /**
     * ============================================================
     * LOGIN
     * ============================================================
     */
    async login(
        empNo,
        password
    ) {

        if (!empNo || !password) {
            return null;
        }


        const user =
            await roiRepository.getUserByEmpNo(
                empNo
            );


        if (!user) {
            return null;
        }


        if (!user.is_active) {
            return null;
        }


        // Hiện tại password đang lưu plain text
        if (
            user.password_hash !== password
        ) {
            return null;
        }


        return {
            emp_no: user.emp_no
        };
    }


    /**
     * ============================================================
     * CHECK ORDER OWNER
     * ============================================================
     */
    async checkOrderOwner(
        planNo,
        planId,
        empNo
    ) {

        if (
            !planNo ||
            planId === undefined ||
            !empNo
        ) {
            return false;
        }


        return await roiRepository.checkOrderOwner(
            planNo,
            planId,
            empNo
        );
    }
}

module.exports = new ROIService();