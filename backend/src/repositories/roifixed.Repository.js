// backend/src/repositories/roifixed.Repository.js
const database = require('../config/database');

class ROIRepository {
  


async getROIData(
    page = 1,
    limit = 50,
    search = '',
    budgetROIFilter = false,
    finalReceiptFilter = '',
    exportAll = false
) {
    try {
        // ========================================
        // 1. KIỂM TRA DATABASE
        // ========================================
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

        // ========================================
        // 2. PAGINATION
        // ========================================
        page = Math.max(parseInt(page) || 1, 1);
        limit = Math.max(parseInt(limit) || 50, 1);

        const offset = (page - 1) * limit;

       const paginationClause = exportAll
    ? ''
    : `
        OFFSET ${offset} ROWS
        FETCH NEXT ${limit} ROWS ONLY
    `;

        // ========================================
        // 3. WHERE CLAUSE
        //    Search + Budget ROI
        // ========================================
        let whereConditions = [];

        // ----------------------------------------
        // SEARCH
        // ----------------------------------------
        if (search && search.trim()) {
            const keyword = search.trim();

            whereConditions.push(`
                (
                    a.fa_desc LIKE '%${keyword}%'
                    OR a.sheet_no LIKE '%${keyword}%'
                )
            `);
        }

        // ----------------------------------------
        // BUDGET ROI > 0
        // ----------------------------------------
        if (budgetROIFilter) {
            whereConditions.push(`
                a.def07 IS NOT NULL
                AND a.def07 > 0
                AND a.sheet_qty IS NOT NULL
                AND a.sheet_pri IS NOT NULL
                AND (a.sheet_qty * a.sheet_pri) > 0
            `);
        }

        // ========================================
        // Ghép WHERE
        // ========================================
        let whereClause = '';

        if (whereConditions.length > 0) {
            whereClause = `
                WHERE
                    ${whereConditions.join('\nAND ')}
            `;
        }

        // ========================================
        // 4. HAVING CLAUSE
        //    Final Receipt Date
        // ========================================
        let havingClause = '';

        if (finalReceiptFilter === 'not-null') {

            havingClause = `
                HAVING MAX(i1.sheet_date) IS NOT NULL
            `;

        } else if (finalReceiptFilter === 'null') {

            havingClause = `
                HAVING MAX(i1.sheet_date) IS NULL
            `;
        }

        // ========================================
        // 5. GROUP BY
        // ========================================
        const groupByClause = `
            GROUP BY
                d.dept_name,
                a.sheet_no,
                a.sheet_id,
                a.fa_desc,
                c.base_name,
                a1.create_date,
                a.sheet_qty,
                a.sheet_pri,
                a.def07,
                a.def06,
                v.cur_rate,
                cu.cur_rate,
                a1.sheet_date,
                u.cur_rate
        `;

        // ========================================
        // 6. MAIN QUERY
        // ========================================
        const query = `
            SELECT 
                d.dept_name,

                CONCAT(
                    CONCAT(
                        a.sheet_no,
                        CONCAT('/', a.sheet_id)
                    ),
                    CONCAT(' - ', a.fa_desc)
                ) AS fa_desc,

                c.base_name AS pur_reason,

                0 AS fa_depr,

                a1.create_date AS req_date,

                MAX(i1.sheet_date) AS in_date,

                (
                    a.sheet_qty * a.sheet_pri
                )
                /
                CASE
                    WHEN a.def07 = 0 THEN NULL
                    ELSE a.def07
                END AS yr_payback,

                DATEADD(
                    DAY,
                    CAST(
                        (
                            (
                                a.sheet_qty * a.sheet_pri
                            )
                            /
                            CASE
                                WHEN a.def07 = 0 THEN NULL
                                ELSE a.def07
                            END
                        ) * 365
                        AS INT
                    ),
                    MAX(i1.sheet_date)
                ) AS payback_date,

                a.sheet_qty AS plan_qty,

                a.sheet_qty *
                    (
                        a.sheet_pri / cu.cur_rate
                    ) AS plan_amt,

                a.def07 / cu.cur_rate AS plan_benifit,

                (
                    CASE
                        WHEN a.def07 = 0 THEN NULL
                        ELSE a.def07
                    END
                    /
                    (
                        a.sheet_qty * a.sheet_pri
                    )
                ) * 100 AS roi_plan,

                SUM(i.sheet_qty) AS in_qty,

                (
                    (
                        AVG(o.sheet_pri) * v.cur_rate
                    )
                    /
                    u.cur_rate
                )
                *
                SUM(i.sheet_qty) AS act_amt,

                a.def06 / cu.cur_rate AS act_benifit,

                (
                    a.def06 / cu.cur_rate
                )
                /
                (
                    (
                        (
                            AVG(o.sheet_pri) * v.cur_rate
                        )
                        /
                        u.cur_rate
                    )
                    *
                    SUM(i.sheet_qty)
                )
                * 100 AS roi_act,

                a.sheet_no AS plan_no,

                a.sheet_id AS plan_id

            FROM oa_fa_pur_req2 a WITH(NOLOCK)

            INNER JOIN oa_fa_pur_req1 a1 WITH(NOLOCK)
                ON a.sheet_no = a1.sheet_no

            LEFT JOIN bas_dept d WITH(NOLOCK)
                ON a1.dept_no = d.dept_no

            LEFT JOIN bas_base_code c WITH(NOLOCK)
                ON c.code_type = '173'
                AND c.base_code = a.def11

            LEFT JOIN oa_fa_pur_order2 o WITH(NOLOCK)
                ON o.plan_no = a.sheet_no
                AND o.plan_id = a.id

            LEFT JOIN oa_fa_pur_order1 o1 WITH(NOLOCK)
                ON o.sheet_no = o1.sheet_no

            LEFT JOIN bas_cur_acc cu WITH(NOLOCK)
                ON cu.cur_code = 'USD'
                AND FORMAT(
                    CAST(a1.sheet_date AS DATE),
                    'yyyyMM'
                ) = cu.acc_period

            LEFT JOIN bas_cur_acc v WITH(NOLOCK)
                ON v.cur_code = o1.cur_no
                AND FORMAT(
                    CAST(o1.sheet_date AS DATE),
                    'yyyyMM'
                ) = v.acc_period

            LEFT JOIN bas_cur_acc u WITH(NOLOCK)
                ON u.cur_code = 'USD'
                AND FORMAT(
                    CAST(o1.sheet_date AS DATE),
                    'yyyyMM'
                ) = u.acc_period

            LEFT JOIN oa_fa_pur_in2 i WITH(NOLOCK)
                ON i.pur_no = o.sheet_no
                AND i.pur_id = o.id

            LEFT JOIN oa_fa_pur_in1 i1 WITH(NOLOCK)
                ON i.sheet_no = i1.sheet_no

            ${whereClause}

            ${groupByClause}

            ${havingClause}

            ORDER BY req_date DESC

          ${paginationClause}
        `;


        const countQuery = `
            SELECT COUNT(*) AS total

            FROM (
                SELECT
                    d.dept_name,
                    a.sheet_no,
                    a.sheet_id,
                    a.fa_desc,
                    c.base_name,
                    a1.create_date,
                    a.sheet_qty,
                    a.sheet_pri,
                    a.def07,
                    a.def06,
                    a1.sheet_date

                FROM oa_fa_pur_req2 a WITH(NOLOCK)

                INNER JOIN oa_fa_pur_req1 a1 WITH(NOLOCK)
                    ON a.sheet_no = a1.sheet_no

                LEFT JOIN bas_dept d WITH(NOLOCK)
                    ON a1.dept_no = d.dept_no

                LEFT JOIN bas_base_code c WITH(NOLOCK)
                    ON c.code_type = '173'
                    AND c.base_code = a.def11

                LEFT JOIN oa_fa_pur_order2 o WITH(NOLOCK)
                    ON o.plan_no = a.sheet_no
                    AND o.plan_id = a.id

                LEFT JOIN oa_fa_pur_order1 o1 WITH(NOLOCK)
                    ON o.sheet_no = o1.sheet_no

                LEFT JOIN bas_cur_acc cu WITH(NOLOCK)
                    ON cu.cur_code = 'USD'
                    AND FORMAT(
                        CAST(a1.sheet_date AS DATE),
                        'yyyyMM'
                    ) = cu.acc_period

                LEFT JOIN bas_cur_acc v WITH(NOLOCK)
                    ON v.cur_code = o1.cur_no
                    AND FORMAT(
                        CAST(o1.sheet_date AS DATE),
                        'yyyyMM'
                    ) = v.acc_period

                LEFT JOIN bas_cur_acc u WITH(NOLOCK)
                    ON u.cur_code = 'USD'
                    AND FORMAT(
                        CAST(o1.sheet_date AS DATE),
                        'yyyyMM'
                    ) = u.acc_period

                LEFT JOIN oa_fa_pur_in2 i WITH(NOLOCK)
                    ON i.pur_no = o.sheet_no
                    AND i.pur_id = o.id

                LEFT JOIN oa_fa_pur_in1 i1 WITH(NOLOCK)
                    ON i.sheet_no = i1.sheet_no

                ${whereClause}

                ${groupByClause}

                ${havingClause}

            ) AS filtered_data
        `;


        // ========================================
        // 9. EXECUTE
        // ========================================
      const results = await database.executeQuery(query);

let total = results ? results.length : 0;

if (!exportAll) {
    const countResult =
        await database.executeQuery(countQuery);

    total =
        Number(countResult?.[0]?.total) || 0;
}

        // ========================================
        // 10. RETURN
        // ========================================
        return {
            data: results || [],
            total: total,
            page: page,
            limit: limit
        };

    } catch (error) {

        console.error(
            '❌ Error in getROIData:',
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
     * Cập nhật Actual Benefit
     */
    async updateActualBenefit(planNo, planId, benefitValue) {
        try {
          
            
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