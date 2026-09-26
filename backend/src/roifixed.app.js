const express = require('express');
const cors = require('cors');
const session = require('express-session');
const path = require('path');

const config = require('./config/dataconfig');
const roiRoutes = require('./routes/roifixed.Routes');
const errorHandler = require('./middlewares/roierror.Handler');

const app = express();

// CORS
app.use(cors({
    ...config.cors,
    credentials: true
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Session
app.use(session({
    secret: process.env.SESSION_SECRET || 'roi-dashboard-secret-2026',
    resave: false,
    saveUninitialized: false,
    cookie: {
        httpOnly: true,
        secure: false,
        maxAge: 8 * 60 * 60 * 1000
    }
}));

app.use(express.static(path.join(__dirname, '../public')));

app.use('/api', roiRoutes);

app.get('/', (req, res) => {
    res.sendFile(
        path.join(__dirname, '../public/roifixedassets.html')
    );
});

app.use(errorHandler);

module.exports = app;