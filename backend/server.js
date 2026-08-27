// backend/server.js
const app = require('./src/roifixed.app');
const config = require('./src/config/dataconfig');
const database = require('./src/config/database');

const PORT = config.port || 3000;

// Kết nối database và start server
async function startServer() {
    try {
        // Kết nối database
        await database.createPool();
        
        // Start server
        const server = app.listen(PORT, () => {
            console.log(`📍 Server: http://localhost:${PORT}`);
        });

        // Graceful shutdown
        process.on('SIGTERM', async () => {
            console.log('🛑 Shutting down...');
            await database.closePool();
            server.close(() => process.exit(0));
        });

        process.on('SIGINT', async () => {
            console.log('🛑 Shutting down...');
            await database.closePool();
            server.close(() => process.exit(0));
        });

    } catch (error) {
        console.error('❌ Failed to start server:', error);
        process.exit(1);
    }
}

startServer();