// backend/src/repositories/roifixed.Repository.js

const database = require('../config/database');

class ROIRepository {

    // ============================================================
    // GET ROI DATA
    // ============================================================
    async getROIData(
        page = 1,
        limit = 50,
        search = '',
        budgetROIFilter = false,
        finalReceiptFilter = '',
        exportAll = false
    ) {
        try {
            if (!database.isConnected) {
                await database.testConnection();
            }

            if (!database.isConnected) {
                return {
                    data: [],
                    total: 0,
                    page,
                    limit
                };
            }

            page = Math.max(parseInt(page) || 1, 1);
            limit = Math.max(parseInt(limit) || 50, 1);

            const offset = (page - 1) * limit;

            // ========================================================
            // WHERE
            // ========================================================

            let whereConditions = [];

            // ========================================================
            // ĐIỀU KIỆN CHÍNH:
            // Chỉ lấy những record có sheet_sta = 1
            // ========================================================

            whereConditions.push(`
                a1.sheet_sta = 1
            `);

            // ========================================================
            // SEARCH
            // ========================================================

            if (search && search.trim()) {
                const keyword = search.trim();

                whereConditions.push(`
                    (
                        a.fa_desc LIKE '%${keyword}%'
                        OR a.sheet_no LIKE '%${keyword}%'
                    )
                `);
            }

            // ========================================================
            // BUDGET ROI FILTER
            //
            // OFF:
            //     Chỉ lọc sheet_sta = 1
            //
            // ON:
            //     sheet_sta = 1
            //     AND def05 = 'yes'
            //
            // ========================================================

            if (budgetROIFilter) {
                whereConditions.push(`
                    a.def05 = 'yes'
                `);
            }

            const whereClause = `
                WHERE
                    ${whereConditions.join('\nAND ')}
            `;

            // ========================================================
            // FINAL RECEIPT DATE FILTER
            //
            // Received:
            //     MAX(i1.sheet_date) IS NOT NULL
            //
            // Not Received:
            //     MAX(i1.sheet_date) IS NULL
            //
            // Không chọn:
            //     Không lọc Receipt
            // ========================================================

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

            // ========================================================
            // GROUP BY
            // ========================================================

            const groupByClause = `
                GROUP BY
                    d.dept_name,
                    a.sheet_no,
                    a.sheet_id,
                    a.fa_desc,
                    c.base_name,
                    a1.create_date,
                    a1.create_user,
                    a.sheet_qty,
                    a.sheet_pri,
                    a.def07,
                    a.def08,
                    a.def06,
                    v.cur_rate,
                    cu.cur_rate,
                    a1.sheet_date,
                    u.cur_rate,
                    a1.sheet_sta
            `;

            // ========================================================
            // PAGINATION
            // ========================================================

            const paginationClause = exportAll
                ? ''
                : `
                    OFFSET ${offset} ROWS
                    FETCH NEXT ${limit} ROWS ONLY
                `;

            // ========================================================
            // MAIN QUERY
            // ========================================================

            const query = `
                SELECT
                    d.dept_name,

                    a1.create_user,

                    CONCAT(
                        CONCAT(a.sheet_no, CONCAT('/', a.sheet_id)),
                        CONCAT(' - ', a.fa_desc)
                    ) AS fa_desc,

                    c.base_name AS pur_reason,

                    0 AS fa_depr,

                    a1.create_date AS req_date,

                    MAX(i1.sheet_date) AS in_date,

                    -- =================================================
                    -- FINAL RECEIPT SHEET STATUS
                    --
                    -- Chỉ khi tất cả receipt record liên quan
                    -- đều có sheet_sta = 1 thì mới trả về 1.
                    --
                    -- Có bất kỳ sheet_sta = 0
                    -- hoặc không có receipt => trả về 0.
                    -- =================================================
                    CASE
                        WHEN COUNT(i1.sheet_no) > 0
                             AND MIN(ISNULL(i1.sheet_sta, 0)) = 1
                        THEN 1
                        ELSE 0
                    END AS receiptSheetSta,

                    (
                        (a.sheet_qty * a.sheet_pri)
                        /
                        CASE
                            WHEN a.def07 = 0 THEN NULL
                            ELSE a.def07
                        END
                    ) AS yr_payback,

                    DATEADD(
                        DAY,
                        CAST(
                            (
                                (a.sheet_qty * a.sheet_pri)
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

                    a.sheet_qty * (a.sheet_pri / cu.cur_rate)
                        AS plan_amt,

                    a.def07 / cu.cur_rate
                        AS plan_benifit,

                    (
                        CASE
                            WHEN a.def07 = 0 THEN NULL
                            ELSE a.def07
                        END
                        /
                        (a.sheet_qty * a.sheet_pri)
                    ) * 100
                        AS roi_plan,

                    SUM(i.sheet_qty)
                        AS in_qty,

                    (
                        (
                            (AVG(o.sheet_pri) * v.cur_rate)
                            / u.cur_rate
                        )
                        * SUM(i.sheet_qty)
                    ) AS act_amt,

                    a.def06 / cu.cur_rate
                        AS act_benifit,

                    a.def08
                        AS roi_act,

                    a.sheet_no
                        AS plan_no,

                    a.sheet_id
                        AS plan_id,

                    a1.sheet_sta
                        AS sheet_sta

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

            console.log('[ROI] Executing getROIData...');
            console.log('[ROI] Condition: a1.sheet_sta = 1');

            if (budgetROIFilter) {
                console.log(
                    '[ROI] Budget ROI filter: a.def05 = yes'
                );
            }

            if (finalReceiptFilter === 'not-null') {
                console.log(
                    '[ROI] Final Receipt filter: Received'
                );
            } else if (finalReceiptFilter === 'null') {
                console.log(
                    '[ROI] Final Receipt filter: Not Received'
                );
            }

            // ========================================================
            // EXECUTE MAIN QUERY
            // ========================================================

            const results = await database.executeQuery(query);

            // ========================================================
            // COUNT QUERY
            //
            // Count phải sử dụng cùng điều kiện:
            // - sheet_sta = 1
            // - search
            // - Budget ROI
            // - Final Receipt
            // ========================================================

            const countQuery = `
                SELECT COUNT(*) AS total
                FROM (
                    SELECT
                        a.sheet_no,
                        a.sheet_id

                    FROM oa_fa_pur_req2 a WITH(NOLOCK)

                    INNER JOIN oa_fa_pur_req1 a1 WITH(NOLOCK)
                        ON a.sheet_no = a1.sheet_no

                    LEFT JOIN oa_fa_pur_order2 o WITH(NOLOCK)
                        ON o.plan_no = a.sheet_no
                        AND o.plan_id = a.id

                    LEFT JOIN oa_fa_pur_in2 i WITH(NOLOCK)
                        ON i.pur_no = o.sheet_no
                        AND i.pur_id = o.id

                    LEFT JOIN oa_fa_pur_in1 i1 WITH(NOLOCK)
                        ON i.sheet_no = i1.sheet_no

                    ${whereClause}

                    GROUP BY
                        a.sheet_no,
                        a.sheet_id

                    ${havingClause}
                ) AS filtered_data
            `;

            let total = results
                ? results.length
                : 0;

            if (!exportAll) {
                const countResult =
                    await database.executeQuery(countQuery);

                total =
                    Number(countResult?.[0]?.total) || 0;
            }

            console.log(
                `[ROI] Current page rows: ${results?.length || 0}`
            );

            console.log(
                `[ROI] Total rows: ${total}`
            );

            return {
                data: results || [],
                total,
                page,
                limit
            };

        } catch (error) {

            console.error(
                '[ROI Repository] getROIData ERROR:'
            );

            console.error(error.message);

            console.error(error);

            return {
                data: [],
                total: 0,
                page,
                limit
            };
        }
    }


    // ============================================================
    // UPDATE ACTUAL BENEFIT
    // ============================================================
    async updateActualBenefit(
        planNo,
        planId,
        benefitValue
    ) {
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

            // ========================================================
            // UPDATE ACTUAL BENEFIT
            // ========================================================

            const updateQuery = `
                UPDATE oa_fa_pur_req2
                SET def06 = @benefitValue
                WHERE sheet_no = @planNo
                  AND sheet_id = @planId
            `;

            const result = await database.executeQuery(
                updateQuery,
                {
                    benefitValue,
                    planNo,
                    planId
                }
            );

            let affectedRows = 0;

            if (
                result &&
                result.length !== undefined
            ) {
                affectedRows = result.length;

            } else if (
                result &&
                result.rowsAffected
            ) {
                affectedRows =
                    result.rowsAffected[0] || 0;

            } else if (
                result &&
                result.affectedRows !== undefined
            ) {
                affectedRows =
                    result.affectedRows;
            }

            // ========================================================
            // CALCULATE ACTUAL ROI
            // ========================================================

            const roiQuery = `
                SELECT
                    (
                        (
                            a.def06 / cu.cur_rate
                        )
                        /
                        (
                            (
                                (
                                    AVG(o.sheet_pri)
                                    * v.cur_rate
                                )
                                / u.cur_rate
                            )
                            * SUM(i.sheet_qty)
                        )
                    ) * 100 AS roi_act

                FROM oa_fa_pur_req2 a WITH(NOLOCK)

                INNER JOIN oa_fa_pur_req1 a1 WITH(NOLOCK)
                    ON a.sheet_no = a1.sheet_no
                    AND a1.sheet_sta = 1

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

                WHERE a.sheet_no = @planNo
                  AND a.sheet_id = @planId

                GROUP BY
                    a.def06,
                    cu.cur_rate,
                    v.cur_rate,
                    u.cur_rate
            `;

            const roiResult = await database.executeQuery(
                roiQuery,
                {
                    planNo,
                    planId
                }
            );

            const roiAct =
                roiResult?.[0]?.roi_act ?? null;

            // ========================================================
            // UPDATE ROI ACTUAL
            // ========================================================

            const updateROIQuery = `
                UPDATE oa_fa_pur_req2
                SET def08 = @roiAct
                WHERE sheet_no = @planNo
                  AND sheet_id = @planId
            `;

            await database.executeQuery(
                updateROIQuery,
                {
                    roiAct,
                    planNo,
                    planId
                }
            );

            return {
                success: true,
                message:
                    'Cập nhật Actual Benefit và ROI thành công',
                affectedRows,
                roiAct
            };

        } catch (error) {

            console.error(
                '[ROI Repository] Error updating actual benefit:',
                error
            );

            throw error;
        }
    }


    // ============================================================
    // GET USER BY EMP NO
    // ============================================================
    async getUserByEmpNo(empNo) {
        try {

            const query = `
                SELECT
                    id,
                    emp_no,
                    password_hash,
                    is_active
                FROM dbo.asset_man_users
                WHERE emp_no = @empNo
            `;

            const result =
                await database.executeQuery(
                    query,
                    {
                        empNo
                    }
                );

            return result?.[0] || null;

        } catch (error) {

            console.error(
                'getUserByEmpNo error:',
                error
            );

            throw error;
        }
    }


    // ============================================================
    // CHECK ORDER OWNER
    // ============================================================
    async checkOrderOwner(
        planNo,
        planId,
        empNo
    ) {
        try {

            const query = `
                SELECT TOP 1
                    1 AS is_owner

                FROM dbo.oa_fa_pur_req2 a

                INNER JOIN dbo.oa_fa_pur_req1 a1
                    ON a.sheet_no = a1.sheet_no
                    AND a1.sheet_sta = 1

                WHERE a.sheet_no = @planNo
                  AND a.sheet_id = @planId
                  AND a1.create_user = @empNo
            `;

            const result =
                await database.executeQuery(
                    query,
                    {
                        planNo,
                        planId,
                        empNo
                    }
                );

            return (
                result &&
                result.length > 0
            );

        } catch (error) {

            console.error(
                'checkOrderOwner error:',
                error
            );

            throw error;
        }
    }
}

module.exports = new ROIRepository();