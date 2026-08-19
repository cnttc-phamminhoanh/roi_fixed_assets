const express = require('express');
const cors = require('cors');
const path = require('path');
const config = require('./service/config');
const database = require('./service/database');
const roiService = require('./service/roiService');

const app = express();

// Middleware
app.use(cors(config.cors));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Phục vụ file tĩnh
app.use(express.static(path.join(__dirname, '..', 'public')));

// Routes
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'public', 'html', 'main.html'));
});

// API: Lấy dữ liệu ROI
app.get('/api/roi-data', async (req, res) => {
    try {
        console.log('📊 Fetching ROI data...');
        const data = await roiService.getROIData();
        res.json(data);
    } catch (error) {
        console.error('❌ Error fetching ROI data:', error);
        res.status(500).json({ 
            error: 'Failed to fetch data',
            message: error.message 
        });
    }
});

// API: Cập nhật Actual Benefit
app.post('/api/update-benefit', async (req, res) => {
    try {
        const { planNo, planId, benefitValue } = req.body;
        
        if (!planNo || !planId) {
            return res.status(400).json({
                error: 'Thiếu thông tin planNo hoặc planId'
            });
        }

        if (benefitValue === undefined || benefitValue === null) {
            return res.status(400).json({
                error: 'Vui lòng nhập giá trị benefit'
            });
        }

        if (isNaN(benefitValue) || benefitValue < 0) {
            return res.status(400).json({
                error: 'Giá trị benefit phải là số và lớn hơn hoặc bằng 0'
            });
        }
        const result = await roiService.updateActualBenefit(planNo, planId, benefitValue);
        res.json(result);
    } catch (error) {
        res.status(500).json({
            error: 'Failed to update benefit',
            message: error.message
        });
    }
});

// API: Health check
app.get('/health', async (req, res) => {
    try {
        await database.testConnection();
        res.json({
            status: 'OK',
            dbConnected: database.isConnected,
            timestamp: new Date().toISOString(),
            uptime: process.uptime()
        });
    } catch (error) {
        res.status(503).json({
            status: 'Degraded',
            dbConnected: false,
            error: error.message,
            timestamp: new Date().toISOString()
        });
    }
});

// API: Database stats
app.get('/api/db-stats', (req, res) => {
    res.json({
        isConnected: database.isConnected,
        poolActive: database.pool ? 'Active' : 'Inactive'
    });
});

// Error handling
app.use((err, req, res, next) => {
    console.error('❌ Error:', err);
    res.status(500).json({ 
        error: 'Internal server error',
        message: err.message 
    });
});

// Start server
app.listen(config.port, () => {
    console.log('\n' + '='.repeat(50));
    console.log('🚀 ROI DASHBOARD SERVER');
    console.log('='.repeat(50));
    console.log(`📍 Server: http://localhost:${config.port}`);
    console.log(`📊 Dashboard: http://localhost:${config.port}`);
    console.log(`💚 Health: http://localhost:${config.port}/health`);
    console.log(`📝 Environment: ${config.env}`);
    console.log(`📊 Database: ${database.isConnected ? '✅ Connected' : '⚠️ Not connected (Demo mode)'}`);
    console.log('='.repeat(50) + '\n');
});

// Graceful shutdown
process.on('SIGTERM', async () => {
    await database.closePool();
    process.exit(0);
});

process.on('SIGINT', async () => {
    await database.closePool();
    process.exit(0);
});