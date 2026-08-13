require('dotenv').config();

module.exports = {
    port: process.env.PORT || 3000,
    env: process.env.NODE_ENV || 'development',
    
    db: {
        host: process.env.DB_HOST || 'localhost',
        user: process.env.DB_USER || 'sa',
        password: process.env.DB_PASSWORD || '',
        database: process.env.DB_NAME || 'your_database',
        port: parseInt(process.env.DB_PORT) || 1433,  // 👈 Port mặc định của SQL Server
        connectionLimit: parseInt(process.env.DB_CONNECTION_LIMIT) || 10,
        queueLimit: parseInt(process.env.DB_QUEUE_LIMIT) || 0,
        waitForConnections: true,
        multipleStatements: true,
        connectTimeout: 30000
    },
    
    api: {
        prefix: '/api',
        version: 'v1'
    },
    
    cors: {
        origin: '*',
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Authorization']
    }
};