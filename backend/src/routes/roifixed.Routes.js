// backend/src/routes/roifixed.Routes.js
const express = require('express');
const router = express.Router();
const roiController = require('../controllers/roifixed.Controller');
// Đăng nhập
router.post('/login', roiController.login);

// Lấy employee đang đăng nhập
router.get('/me', roiController.me);

// Đăng xuất
router.post('/logout', roiController.logout);
// GET: Lấy dữ liệu ROI
router.get('/roi-data', roiController.getROIData);
// GET: Lấy toàn bộ dữ liệu ROI để export Excel
router.get('/roi-data/export', roiController.exportROIData);
// POST: Cập nhật benefit
router.post('/update-benefit', roiController.updateBenefit);

// Health check
router.get('/health', roiController.healthCheck);

// Database stats
router.get('/db-stats', roiController.dbStats);

module.exports = router;