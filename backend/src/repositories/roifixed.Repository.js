// backend/src/repositories/roifixed.Repository.js
const database = require('../config/database');

class ROIRepository {
    /**
     * Lấy dữ liệu ROI với phân trang và tìm kiếm
     */
    async getROIData(page = 1, limit = 50, search = '') {
        try {
            if (!database.isConnected) {
                await database.testConnection();
            }

            if (!database.isConnected) {
                return {
                    data: [],
                    total: 0,
                    page: page,
                    limit: limit
                };
            }
            
            const offset = (page - 1) * limit;
            
            // Query lấy dữ liệu với phân trang và tìm kiếm
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
            
            // Thêm điều kiện tìm kiếm nếu có
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

            // Query đếm tổng số bản ghi
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

            const results = await database.executeQuery(query);
            const countResult = await database.executeQuery(countQuery);
            
            const total = countResult[0]?.total || 0;

            return {
                data: results || [],
                total: total,
                page: page,
                limit: limit
            };
            
        } catch (error) {
            console.error('❌ Error in getROIData:', error.message);
            return {
                data: [],
                total: 0,
                page: page,
                limit: limit
            };
        }
    }

    /**
     * Cập nhật Actual Benefit
     */
    async updateActualBenefit(planNo, planId, benefitValue) {
        try {
            console.log(`📝 updateActualBenefit - planNo: ${planNo}, planId: ${planId}, benefit: ${benefitValue}`);
            
            if (!database.isConnected) {
                await database.testConnection();
            }

            if (!database.isConnected) {
                return {
                    success: true,
                    message: 'Cập nhật thành công (Demo mode)',
                    affectedRows: 1
                };
            }

            const updateQuery = `
                UPDATE oa_fa_pur_req2 
                SET def06 = @benefitValue 
                WHERE sheet_no = @planNo AND sheet_id = @planId
            `;

            const result = await database.executeQuery(updateQuery, {
                benefitValue: benefitValue,
                planNo: planNo,
                planId: planId
            });

            let affectedRows = 0;
            if (result && result.length !== undefined) {
                affectedRows = result.length;
            } else if (result && result.rowsAffected) {
                affectedRows = result.rowsAffected[0] || 0;
            } else if (result && result.affectedRows !== undefined) {
                affectedRows = result.affectedRows;
            }

            console.log(`✅ updateActualBenefit - ${affectedRows} dòng bị ảnh hưởng`);
            
            return {
                success: true,
                message: 'Cập nhật thành công',
                affectedRows: affectedRows
            };
        } catch (error) {
            console.error('❌ Error updating actual benefit:', error);
            throw error;
        }
    }
}

module.exports = new ROIRepository();