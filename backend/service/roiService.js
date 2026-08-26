const database = require('./database');

class ROIService {
    // ========================================
    // 1. LẤY DỮ LIỆU ROI VỚI PHÂN TRANG VÀ TÌM KIẾM
    // ========================================
    async getROIData(page = 1, limit = 50, search = '') {
        try {
            if (!database.isConnected) {
                await database.testConnection();
            }

            if (!database.isConnected) {
                return {
                    data: this.getSampleData(),
                    total: 0,
                    page: page,
                    limit: limit
                };
            }
            
            const offset = (page - 1) * limit;
            
            // ✅ Query lấy dữ liệu với phân trang và tìm kiếm
            let query = `
                SELECT 
                    d.dept_name,
                    CONCAT(CONCAT(a.sheet_no, CONCAT('/', a.sheet_id)), CONCAT(' - ', a.fa_desc)) AS fa_desc,
                    c.base_name AS pur_reason,
                    0 AS fa_depr,
                    a1.create_date AS req_date,
                    MAX(i1.sheet_date) AS in_date,
                    (a.sheet_qty * a.sheet_pri) / CASE WHEN a.def07 = 0 THEN NULL ELSE a.def07 END AS yr_payback,
                    DATEADD(DAY, CAST(((a.sheet_qty * a.sheet_pri) / CASE WHEN a.def07 = 0 THEN NULL ELSE a.def07 END) * 365 AS INT), MAX(i1.sheet_date)) AS payback_date,
                    a.sheet_qty AS plan_qty,
                    a.sheet_qty * (a.sheet_pri / cu.cur_rate) AS plan_amt,
                    a.def07 / cu.cur_rate AS plan_benifit,
                    (CASE WHEN a.def07 = 0 THEN NULL ELSE a.def07 END / (a.sheet_qty * a.sheet_pri)) * 100 AS roi_plan,
                    SUM(i.sheet_qty) AS in_qty,
                    ((AVG(o.sheet_pri) * v.cur_rate) / u.cur_rate) * SUM(i.sheet_qty) AS act_amt,
                    a.def06 / cu.cur_rate AS act_benifit,
                    (a.def06 / cu.cur_rate) / (((AVG(o.sheet_pri) * v.cur_rate) / u.cur_rate) * SUM(i.sheet_qty)) * 100 AS roi_act,
                    a.sheet_no AS plan_no,
                    a.sheet_id AS plan_id
                FROM oa_fa_pur_req2 a WITH(NOLOCK)
                INNER JOIN oa_fa_pur_req1 a1 WITH(NOLOCK) ON a.sheet_no = a1.sheet_no 
                LEFT JOIN bas_dept d WITH(NOLOCK) ON a1.dept_no = d.dept_no 
                LEFT JOIN bas_base_code c WITH(NOLOCK) ON c.code_type = '173' AND c.base_code = a.def11
                LEFT JOIN oa_fa_pur_order2 o WITH(NOLOCK) ON o.plan_no = a.sheet_no AND o.plan_id = a.id
                LEFT JOIN oa_fa_pur_order1 o1 WITH(NOLOCK) ON o.sheet_no = o1.sheet_no 
                LEFT JOIN bas_cur_acc cu WITH(NOLOCK) ON cu.cur_code = 'USD' AND FORMAT(CAST(a1.sheet_date AS DATE), 'yyyyMM') = cu.acc_period
                LEFT JOIN bas_cur_acc v WITH(NOLOCK) ON v.cur_code = o1.cur_no AND FORMAT(CAST(o1.sheet_date AS DATE), 'yyyyMM') = v.acc_period
                LEFT JOIN bas_cur_acc u WITH(NOLOCK) ON u.cur_code = 'USD' AND FORMAT(CAST(o1.sheet_date AS DATE), 'yyyyMM') = u.acc_period
                LEFT JOIN oa_fa_pur_in2 i WITH(NOLOCK) ON i.pur_no = o.sheet_no AND i.pur_id = o.id 
                LEFT JOIN oa_fa_pur_in1 i1 WITH(NOLOCK) ON i.sheet_no = i1.sheet_no 
            `;
            
            // ✅ Thêm điều kiện tìm kiếm nếu có
            if (search) {
                query += ` WHERE a.fa_desc LIKE '%${search}%' OR a.sheet_no LIKE '%${search}%'`;
            }
            
            query += `
                GROUP BY d.dept_name, a.sheet_no, a.sheet_id, a.fa_desc, c.base_name, a1.create_date, a.sheet_qty, 
                a.sheet_pri, a.def07, a.def06, v.cur_rate, cu.cur_rate, a1.sheet_date, u.cur_rate
                ORDER BY req_date DESC
                OFFSET ${offset} ROWS
                FETCH NEXT ${limit} ROWS ONLY
            `;

            // ✅ Query đếm tổng số bản ghi
            let countQuery = `
                SELECT COUNT(*) AS total
                FROM oa_fa_pur_req2 a
                INNER JOIN oa_fa_pur_req1 a1 ON a.sheet_no = a1.sheet_no 
                LEFT JOIN bas_dept d ON a1.dept_no = d.dept_no 
                LEFT JOIN bas_base_code c ON c.code_type = '173' AND c.base_code = a.def11
                LEFT JOIN oa_fa_pur_order2 o ON o.plan_no = a.sheet_no AND o.plan_id = a.id
                LEFT JOIN oa_fa_pur_order1 o1 ON o.sheet_no = o1.sheet_no 
                LEFT JOIN bas_cur_acc cu ON cu.cur_code = 'USD' AND FORMAT(CAST(a1.sheet_date AS DATE), 'yyyyMM') = cu.acc_period
                LEFT JOIN bas_cur_acc v ON v.cur_code = o1.cur_no AND FORMAT(CAST(o1.sheet_date AS DATE), 'yyyyMM') = v.acc_period
                LEFT JOIN bas_cur_acc u ON u.cur_code = 'USD' AND FORMAT(CAST(o1.sheet_date AS DATE), 'yyyyMM') = u.acc_period
                LEFT JOIN oa_fa_pur_in2 i ON i.pur_no = o.sheet_no AND i.pur_id = o.id 
                LEFT JOIN oa_fa_pur_in1 i1 ON i.sheet_no = i1.sheet_no 
            `;
            
            if (search) {
                countQuery += ` WHERE a.fa_desc LIKE '%${search}%' OR a.sheet_no LIKE '%${search}%'`;
            }

            // ✅ Thực thi query
            const results = await database.executeQuery(query);
            const countResult = await database.executeQuery(countQuery);
            
            const total = countResult[0]?.total || 0;

            if (!results || results.length === 0) {
                return {
                    data: [],
                    total: 0,
                    page: page,
                    limit: limit
                };
            }
            
            const transformed = this.transformData(results);
            
            return {
                data: transformed,
                total: total,
                page: page,
                limit: limit
            };
            
        } catch (error) {
            console.error('❌ Error in getROIData:', error.message);
            return {
                data: [],
                total: 0,
                page: 1,
                limit: limit
            };
        }
    }

    // ========================================
    // 2. TRANSFORM DỮ LIỆU
    // ========================================
    transformData(results) {
        console.log('📝 transformData - Bắt đầu transform...');
        
        if (!results || results.length === 0) {
            console.log('⚠️ results rỗng, trả về mảng rỗng');
            return [];
        }
        
        console.log('📝 Cấu trúc dữ liệu từ SQL:', Object.keys(results[0]));
        console.log('📝 Mẫu dữ liệu từ SQL:', results[0]);
        
        const transformed = results.map((item, index) => {
            // Khai báo budgetROI và actualROI
            const budgetROI = parseFloat(item.roi_plan) || 0;
            const actualROI = parseFloat(item.roi_act) || 0;
            
            // ✅ KIỂM TRA NGÀY THÁNG - FINAL RECEIPT DATE
            const inDate = item.in_date || null;
            
            // ✅ KIỂM TRA NGÀY THÁNG - ESTIMATED PAYBACK DATE
            const paybackDate = item.payback_date || null;

            // ✅ Xác định có ngày không
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
            
            console.log(`🔍 Record ${index + 1}:`);
            console.log(`   department: ${item.dept_name}`);
            console.log(`   asset_description: ${item.fa_desc}`);
            console.log(`   budget_amount: ${item.plan_amt}`);
            console.log(`   actual_amount: ${item.act_amt}`);
            console.log(`   budgetROI: ${budgetROI}, actualROI: ${actualROI}`);

            // XÁC ĐỊNH PLANNED RESULTS (PASS/NOT PASS)
            let plannedResults = 'N/A';
            
            // Nếu chưa có Final Receipt Date
            if (!hasFinalReceiptDate) {
                plannedResults = '⏳ Chờ nhập hàng';
            }
            // Nếu có Final Receipt Date nhưng chưa có Actual Benefit
            else if (actualROI <= 0 || parseFloat(item.act_benifit) <= 0) {
                plannedResults = '⏳ Chờ cập nhật Benefit';
            }
            // Nếu có đầy đủ dữ liệu
            else if (actualROI > 0 && budgetROI > 0) {
                if (actualROI >= budgetROI) {
                    plannedResults = 'PASS ✅';
                } else {
                    plannedResults = 'NOT PASS ❌';
                }
            } else if (actualROI > 0 && budgetROI <= 0) {
                plannedResults = 'N/A';
            }
            
            console.log(`   👉 plannedResults: ${plannedResults}`);
            
            return {
                department: item.dept_name || '-',
                assetClass: '-',
                assetDescription: item.fa_desc || '-',
                purchaseReason: item.pur_reason || '-',
                depreciation:  item.fa_depr ||'-',
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
        
        console.log(`✅ Đã transform ${transformed.length} dòng`);
        console.log('📝 Dữ liệu sau transform (mẫu):', transformed[0]);
        
        return transformed;
    }

    // ========================================
    // 3. CẬP NHẬT ACTUAL BENEFIT (def06)
    // ========================================
    async updateActualBenefit(planNo, planId, benefitValue) {
        try {
            console.log(`📝 updateActualBenefit - planNo: ${planNo}, planId: ${planId}, benefit: ${benefitValue}`);
            
            if (!database.isConnected) {
                await database.testConnection();
            }

            if (!database.isConnected) {
                console.log('⚠️ Demo mode: Updating sample data');
                return {
                    success: true,
                    message: 'Cập nhật thành công (Demo mode)',
                    affectedRows: 1,
                    data: await this.getROIData()
                };
            }

            const updateQuery = `
                UPDATE oa_fa_pur_req2 
                SET def06 = @benefitValue 
                WHERE sheet_no = @planNo AND sheet_id = @planId
            `;

            console.log('📝 Executing query:', updateQuery);
            console.log(`📝 Params: benefitValue=${benefitValue}, planNo=${planNo}, planId=${planId}`);

            const result = await database.executeQuery(updateQuery, {
                benefitValue: benefitValue,
                planNo: planNo,
                planId: planId
            });

            console.log('📝 Query result:', result);

            let affectedRows = 0;
            if (result && result.length !== undefined) {
                affectedRows = result.length;
            } else if (result && result.rowsAffected) {
                affectedRows = result.rowsAffected[0] || 0;
            } else if (result && result.affectedRows !== undefined) {
                affectedRows = result.affectedRows;
            }

            console.log(`✅ updateActualBenefit - ${affectedRows} dòng bị ảnh hưởng`);
            
            if (affectedRows === 0) {
                console.warn(`⚠️ Không tìm thấy bản ghi với plan_no=${planNo} và plan_id=${planId}`);
                return {
                    success: true,
                    message: `Không tìm thấy bản ghi (planNo=${planNo}, planId=${planId})`,
                    affectedRows: 0,
                    data: await this.getROIData()
                };
            }

            const updatedData = await this.getROIData();
            
            return {
                success: true,
                message: 'Cập nhật thành công',
                affectedRows: affectedRows,
                data: updatedData
            };
        } catch (error) {
            console.error('❌ Error updating actual benefit:', error);
            console.error('❌ Error stack:', error.stack);
            
            return {
                success: false,
                message: `Lỗi: ${error.message}`,
                error: error.message,
                stack: error.stack
            };
        }
    }

    // ========================================
    // 4. CẬP NHẬT NHIỀU ACTUAL BENEFITS
    // ========================================
    async updateMultipleBenefits(updates) {
        try {
            console.log(`📝 updateMultipleBenefits - Số lượng cập nhật: ${updates.length}`);
            
            if (!database.isConnected) {
                await database.testConnection();
            }

            if (!database.isConnected) {
                const updatedData = await this.getROIData();
                return {
                    success: true,
                    message: `Cập nhật ${updates.length} bản ghi thành công (Demo mode)`,
                    data: updatedData
                };
            }

            const queries = updates.map(({ planNo, planId, benefitValue }) => ({
                sql: `UPDATE oa_fa_pur_req2 SET def06 = @p0 WHERE sheet_no = @p1 AND sheet_id = @p2`,
                params: [benefitValue, planNo, planId]
            }));

            const results = await database.executeTransaction(queries);
            const updatedData = await this.getROIData();
            
            return {
                success: true,
                message: `Cập nhật ${updates.length} bản ghi thành công`,
                data: updatedData
            };
        } catch (error) {
            console.error('❌ Error updating multiple benefits:', error);
            throw error;
        }
    }

    // ========================================
    // 5. DỮ LIỆU MẪU (FALLBACK)
    // ========================================
    getSampleData() {
        return [];
    }
}

module.exports = new ROIService();