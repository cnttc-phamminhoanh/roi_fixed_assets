// backend/src/config/database.js
const sql = require('mssql');
const config = require('./dataconfig');

class Database {
    constructor() {
        this.pool = null;
        this.isConnected = false;
        this.connectionAttempts = 0;
        this.maxRetries = 3;
    }

    async createPool() {
        if (this.pool && this.isConnected) {
            return this.pool;
        }

        console.log('📝 Đang kết nối đến SQL Server...');
        console.log(`   Host: ${config.db.host}`);
        console.log(`   Port: ${config.db.port || 1433}`);
        console.log(`   Database: ${config.db.database}`);
        console.log(`   User: ${config.db.user}`);

        try {
            const sqlConfig = {
                user: config.db.user,
                password: config.db.password,
                server: config.db.host,
                database: config.db.database,
                port: parseInt(config.db.port) || 1433,
                options: {
                    encrypt: false,
                    trustServerCertificate: true,
                    enableArithAbort: true,
                    connectionTimeout: 30000,
                    requestTimeout: 60000
                },
                pool: {
                    max: config.db.connectionLimit || 10,
                    min: 0,
                    idleTimeoutMillis: 30000
                }
            };

            this.pool = await sql.connect(sqlConfig);
            this.isConnected = true;
            this.connectionAttempts = 0;
            
            console.log('✅ Kết nối SQL Server thành công!');
            return this.pool;
            
        } catch (err) {
            this.isConnected = false;
            this.pool = null;
            this.connectionAttempts++;
            
            console.error('❌ Lỗi kết nối SQL Server:', err.message);
            
            if (this.connectionAttempts < this.maxRetries) {
                console.log(`🔄 Đang thử lại lần ${this.connectionAttempts + 1}/${this.maxRetries} sau 2s...`);
                await new Promise(resolve => setTimeout(resolve, 2000));
                return this.createPool();
            }
            
            throw err;
        }
    }

    async testConnection() {
        try {
            if (!this.pool || !this.isConnected) {
                await this.createPool();
            }
            if (this.isConnected && this.pool) {
                const result = await this.pool.request().query('SELECT 1+1 AS result');
                return result.recordset;
            }
            return null;
        } catch (err) {
            this.isConnected = false;
            throw err;
        }
    }

    async executeQuery(sqlQuery, params = []) {
        try {
            if (!this.pool || !this.isConnected) {
                await this.createPool();
            }
            
            if (!this.isConnected || !this.pool) {
                throw new Error('Database not connected');
            }

            const request = this.pool.request();
            
            if (params && typeof params === 'object' && !Array.isArray(params)) {
                Object.keys(params).forEach(key => {
                    request.input(key, params[key]);
                });
            } else if (Array.isArray(params) && params.length > 0) {
                params.forEach((param, index) => {
                    request.input(`p${index}`, param);
                });
            }

            const result = await request.query(sqlQuery);
            return result.recordset;
            
        } catch (err) {
            console.error('❌ Query error:', err.message);
            console.error('   SQL:', sqlQuery.substring(0, 200) + '...');
            throw err;
        }
    }

    async executeTransaction(queries) {
        try {
            if (!this.pool || !this.isConnected) {
                await this.createPool();
            }

            const transaction = new sql.Transaction(this.pool);
            await transaction.begin();
            
            const results = [];
            
            for (const query of queries) {
                const request = new sql.Request(transaction);
                if (query.params && query.params.length > 0) {
                    query.params.forEach((param, index) => {
                        request.input(`p${index}`, param);
                    });
                }
                const result = await request.query(query.sql);
                results.push(result.recordset);
            }
            
            await transaction.commit();
            return results;
            
        } catch (err) {
            console.error('❌ Transaction error:', err.message);
            try {
                await transaction.rollback();
            } catch (rollbackErr) {
                console.error('❌ Rollback error:', rollbackErr.message);
            }
            throw err;
        }
    }

    getConnectionInfo() {
        return {
            isConnected: this.isConnected,
            host: config.db.host,
            database: config.db.database,
            user: config.db.user,
            connectionAttempts: this.connectionAttempts
        };
    }

    async closePool() {
        try {
            if (this.pool) {
                await this.pool.close();
                this.pool = null;
                this.isConnected = false;
                console.log('✅ Đã đóng kết nối SQL Server');
            }
        } catch (err) {
            console.error('❌ Error closing connection:', err.message);
        }
    }
}

module.exports = new Database();