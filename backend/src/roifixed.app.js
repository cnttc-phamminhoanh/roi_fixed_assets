// backend/src/roifixed.app.js
const express = require('express');
const cors = require('cors');
const path = require('path');
const config = require('./config/dataconfig');
const roiRoutes = require('./routes/roifixed.Routes');
const errorHandler = require('./middlewares/roierror.Handler');

const app = express();

// Middleware
app.use(cors(config.cors));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Phục vụ file tĩnh
app.use(express.static(path.join(__dirname, '../public')));

// Routes
app.use('/api', roiRoutes);

// Serve HTML
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../public/roifixedassets.html'));
});

// Error handler (để cuối cùng)
app.use(errorHandler);

module.exports = app;