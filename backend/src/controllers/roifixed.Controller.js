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
            
            console.log(`📊 API: page=${page}, limit=${limit}, search="${search}"`);
            
            const result = await roiService.getROIData(page, limit, search);
            
            res.json(result);
        } catch (error) {
            next(error);
        }
    }

    /**
     * Cập nhật Actual Benefit
     */
    async updateBenefit(req, res, next) {
        try {
            const { planNo, planId, benefitValue } = req.body;
            
            const result = await roiService.updateActualBenefit(planNo, planId, benefitValue);
            
            // Sau khi cập nhật, lấy lại dữ liệu mới
            const updatedData = await roiService.getROIData(1, 50, '');
            
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
}

module.exports = new ROIController();