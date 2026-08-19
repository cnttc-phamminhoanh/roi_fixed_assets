const database = require('./database');

class ROIService {
    // ========================================
    // 1. LẤY DỮ LIỆU ROI
    // ========================================
    async getROIData() {
        try {
            if (!database.isConnected) {
                await database.testConnection();
            }

            if (!database.isConnected) {
                return this.getSampleData();
            }
            
            const query = `
            select d.dept_name, concat(concat(a.sheet_no, concat('/', a.sheet_id)), concat(' - ', a.fa_desc)) as fa_desc, 
        c.base_name as pur_reason, 0 fa_depr, a1.create_date as req_date, max(i1.sheet_date) as in_date, 
        (a.sheet_qty * a.sheet_pri)/case when a.def07 = 0 then null else a.def07 end as yr_payback, 
        DATEADD(DAY,CAST(((a.sheet_qty * a.sheet_pri) / case when a.def07 = 0 then null else a.def07 end) * 365 AS INT),MAX(i1.sheet_date)) AS payback_date,
        a.sheet_qty as plan_qty, a.sheet_qty * (a.sheet_pri/cu.cur_rate) as plan_amt, a.def07/ cu.cur_rate as plan_benifit, 
        (case when a.def07 = 0 then null else a.def07 end/ (a.sheet_qty * a.sheet_pri)) * 100 as roi_plan, sum(i.sheet_qty) as in_qty, 
        ((avg(o.sheet_pri) * v.cur_rate)/u.cur_rate) * sum(i.sheet_qty) as act_amt, a.def06/ cu.cur_rate as act_benifit, 
        (a.def06/ cu.cur_rate) /(((avg(o.sheet_pri) * v.cur_rate)/u.cur_rate) * sum(i.sheet_qty)) * 100 as roi_act, a.sheet_no as plan_no, a.sheet_id as plan_id 
from oa_fa_pur_req2 a with(nolock)
inner join oa_fa_pur_req1 a1 with(nolock) on a.sheet_no = a1.sheet_no 
left join bas_dept d with(nolock) on a1.dept_no = d.dept_no 
left join bas_base_code c with(nolock) on c.code_type = '173' and c.base_code = a.def11
left join oa_fa_pur_order2 o with(nolock) on o.plan_no = a.sheet_no and o.plan_id = a.id
left join oa_fa_pur_order1 o1 with(nolock) on o.sheet_no = o1.sheet_no 
left join bas_cur_acc cu with(nolock) on cu.cur_code = 'USD' and FORMAT(CAST(a1.sheet_date AS DATE), 'yyyyMM') = cu.acc_period
left join bas_cur_acc v with(nolock) on v.cur_code = o1.cur_no and FORMAT(CAST(o1.sheet_date AS DATE), 'yyyyMM') = v.acc_period
left join bas_cur_acc u with(nolock) on u.cur_code = 'USD' and FORMAT(CAST(o1.sheet_date AS DATE), 'yyyyMM') = u.acc_period
left join oa_fa_pur_in2 i with(nolock) on i.pur_no = o.sheet_no and i.pur_id = o.id 
left join oa_fa_pur_in1 i1 with(nolock) on i.sheet_no = i1.sheet_no 
group by d.dept_name, a.sheet_no, a.sheet_id, a.fa_desc, c.base_name, a1.create_date, a.sheet_qty, 
a.sheet_pri, a.def07, a.def06, v.cur_rate, cu.cur_rate, a1.sheet_date, u.cur_rate
order by req_date desc;
            `;

            try {
                const results = await database.executeQuery(query);

                if (results && results.length > 0) {
                    console.log('📝 DỮ LIỆU THÔ TỪ SQL (mẫu 1 record):');
                    console.log(JSON.stringify(results[0], null, 2));
                }

                if (!results || results.length === 0) {
                    console.log('⚠️ No data found, using sample data');
                    return this.getSampleData();
                }
                const transformed = this.transformData(results);
                
                if (transformed && transformed.length > 0) {
                    console.log('📝 DỮ LIỆU SAU TRANSFORM (mẫu 1 record):');
                    console.log(JSON.stringify(transformed[0], null, 2));
                }
                
                return transformed;
            } catch (error) {
                console.error('❌ Query error:', error.message);
                console.log('⚠️ Fallback to sample data');
                return this.getSampleData();
            }
        } catch (error) {
            console.error('❌ Error in getROIData:', error.message);
            console.log('⚠️ Fallback to sample data');
            return this.getSampleData();
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
            const budgetROI = parseFloat(item.budget_roi) || parseFloat(item.roi_plan) || 0;
            const actualROI = parseFloat(item.actual_roi) || parseFloat(item.roi_act) || 0;
            
            console.log(`🔍 Record ${index + 1}:`);
            console.log(`   department: ${item.department}`);
            console.log(`   asset_description: ${item.asset_description}`);
            console.log(`   budget_amount: ${item.budget_amount}`);
            console.log(`   actual_amount: ${item.actual_amount}`);
            console.log(`   budgetROI: ${budgetROI}, actualROI: ${actualROI}`);

            // XÁC ĐỊNH PLANNED RESULTS (PASS/NOT PASS)
            let plannedResults = 'N/A';
            
            if (actualROI > 0 && budgetROI > 0) {
                if (actualROI >= budgetROI) {
                    plannedResults = 'PASS ✅';
                } else {
                    plannedResults = 'NOT PASS ❌';
                }
            } else if (actualROI === 0 && budgetROI > 0) {
                plannedResults = '-';
            } else if (actualROI === 0 && budgetROI === 0) {
                plannedResults = 'N/A';
            }
            
            console.log(`   👉 plannedResults: ${plannedResults}`);
            
            return {
                department: item.department || item.dept_name || 'N/A',
                assetClass: 'N/A',
                assetDescription: item.asset_description || item.fa_desc || 'N/A',
                purchaseReason: item.purchase_reason || item.pur_reason || 'N/A',
                depreciation: item.depreciation || item.fa_depr || 'N/A',
                requestDate: item.request_date || item.req_date,
                finalReceiptDate: item.final_receipt_date || item.in_date,
                estimatedPaybackTime: parseFloat(item.estimated_payback_time) || item.yr_payback || 0,
                estimatedPaybackDate: item.estimated_payback_date || item.payback_date,
                budgetQuantity: parseInt(item.budget_quantity) || parseInt(item.plan_qty) || 0,
                budgetAmount: parseFloat(item.budget_amount) || parseFloat(item.plan_amt) || 0,
                budgetBenefit: parseFloat(item.budget_benefit) || parseFloat(item.plan_benifit) || 0,
                budgetROI: budgetROI,
                actualQuantity: parseInt(item.actual_quantity) || parseInt(item.in_qty) || 0,
                actualAmount: parseFloat(item.actual_amount) || parseFloat(item.act_amt) || 0,
                actualBenefit: parseFloat(item.actual_benefit) || parseFloat(item.act_benifit) || 0,
                actualROI: actualROI,
                plannedResults: plannedResults,
                planNo: item.plan_no || item.sheet_no,
                planId: item.plan_id || item.sheet_id
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
                data: this.getSampleData()
            };
        }

        // 👉 Dùng tên parameter rõ ràng
        const updateQuery = `
            UPDATE oa_fa_pur_req2 
            SET def06 = @benefitValue 
            WHERE sheet_no = @planNo AND sheet_id = @planId
        `;

        console.log('📝 Executing query:', updateQuery);
        console.log(`📝 Params: benefitValue=${benefitValue}, planNo=${planNo}, planId=${planId}`);

        // 👉 Truyền params dạng object (đã được database.js hỗ trợ)
        const result = await database.executeQuery(updateQuery, {
            benefitValue: benefitValue,
            planNo: planNo,
            planId: planId
        });

        console.log('📝 Query result:', result);

        // Kiểm tra số dòng bị ảnh hưởng
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
                const sampleData = this.getSampleData();
                const updatedData = sampleData.map(item => {
                    const update = updates.find(u => u.planNo === item.planNo && u.planId === item.planId);
                    if (update) {
                        return {
                            ...item,
                            actualBenefit: update.benefitValue,
                            actualROI: item.actualAmount > 0 ? (update.benefitValue / item.actualAmount) * 100 : 0
                        };
                    }
                    return item;
                });
                
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
        return [
        
        ];
    }
}

module.exports = new ROIService();