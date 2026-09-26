// backend/src/controllers/roifixed.Controller.js
const roiService = require('../services/roifixed.Service');

class ROIController {
    /**
     * Lấy dữ liệu ROI với phân trang và tìm kiếm
     */
    async getROIData(req, res, next) {
        try {
            const page = parseInt(req.query.page) || 1;
            const limit = parseInt(req.query.limit) || 50;
            const search = req.query.search || '';
            const budgetROIFilter = req.query.budgetROIFilter === 'true';
            const finalReceiptFilter =
            req.query.finalReceiptFilter || '';

            
            const result = await roiService.getROIData(page, limit, search,budgetROIFilter, finalReceiptFilter);
            
            res.json(result);
        } catch (error) {
            next(error);
        }
    }
/**
 * Lấy toàn bộ dữ liệu ROI để export Excel
 */
async exportROIData(req, res, next) {
    try {
        const search =
            req.query.search || '';

        const budgetROIFilter =
            req.query.budgetROIFilter === 'true';

        const finalReceiptFilter =
            req.query.finalReceiptFilter || '';

        const result =
            await roiService.getROIDataForExport(
                search,
                budgetROIFilter,
                finalReceiptFilter
            );

        res.json(result);

    } catch (error) {
        next(error);
    }
}
    /**
     * Cập nhật Actual Benefit
     */
    // async updateBenefit(req, res, next) {
    //     try {
    //         const { planNo, planId, benefitValue } = req.body;
    //         const result = await roiService.updateActualBenefit(planNo, planId, benefitValue);
    //         const updatedData = await roiService.getROIData(1, 50, '');
            
    //         res.json({
    //             ...result,
    //             data: updatedData
    //         });
    //     } catch (error) {
    //         next(error);
    //     }
    // }
    async updateBenefit(req, res, next) {
    try {

        // ==============================
        // 1. Kiểm tra login
        // ==============================

        if (!req.session.emp_no) {
            return res.status(401).json({
                success: false,
                message: 'Please login first.'
            });
        }

        const empNo = req.session.emp_no;

        // ==============================
        // 2. Lấy dữ liệu update
        // ==============================

        const {
            planNo,
            planId,
            benefitValue
        } = req.body;

        if (!planNo || planId === undefined || benefitValue === undefined) {
            return res.status(400).json({
                success: false,
                message: 'Missing required information.'
            });
        }

        // ==============================
        // 3. Kiểm tra người tạo đơn
        // ==============================

        const isOwner = await roiService.checkOrderOwner(
            planNo,
            planId,
            empNo
        );

        if (!isOwner) {
            return res.status(403).json({
                success: false,
                message: 'Bạn không phải người làm đơn.'
            });
        }

        // ==============================
        // 4. Cho phép update
        // ==============================

        const result = await roiService.updateActualBenefit(
            planNo,
            planId,
            benefitValue
        );

        const updatedData = await roiService.getROIData(
            1,
            50,
            ''
        );

        res.json({
            ...result,
            data: updatedData
        });

    } catch (error) {
        next(error);
    }
}

    /**
     * Health check
     */
    async healthCheck(req, res, next) {
        try {
            const database = require('../config/database');
            await database.testConnection();
            
            res.json({
                status: 'OK',
                dbConnected: database.isConnected,
                timestamp: new Date().toISOString(),
                uptime: process.uptime()
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * Database stats
     */
    async dbStats(req, res, next) {
        try {
            const database = require('../config/database');
            
            res.json({
                isConnected: database.isConnected,
                poolActive: database.pool ? 'Active' : 'Inactive'
            });
        } catch (error) {
            next(error);
        }
    }

    async login(req, res, next) {
    try {
        const { empNo, password } = req.body;

        if (!empNo || !password) {
            return res.status(400).json({
                success: false,
                message: 'Employee ID and password are required.'
            });
        }

        const user = await roiService.login(empNo, password);

        if (!user) {
            return res.status(401).json({
                success: false,
                message: 'Employee ID or password is incorrect.'
            });
        }

        // Lưu Employee ID vào session
        req.session.emp_no = user.emp_no;

        return res.json({
            success: true,
            employee: {
                empNo: user.emp_no
            }
        });

    } catch (error) {
        next(error);
    }
}


async me(req, res, next) {
    try {
        if (!req.session.emp_no) {
            return res.json({
                loggedIn: false
            });
        }

        return res.json({
            loggedIn: true,
            employee: {
                empNo: req.session.emp_no
            }
        });

    } catch (error) {
        next(error);
    }
}


async logout(req, res, next) {
    try {
        req.session.destroy((error) => {

            if (error) {
                return next(error);
            }

            res.clearCookie('connect.sid');

            return res.json({
                success: true
            });
        });

    } catch (error) {
        next(error);
    }
}
}



module.exports = new ROIController();