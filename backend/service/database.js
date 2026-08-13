const sql = require("mssql");
const config = require("./config");

class Database {
  constructor() {
    this.pool = null;
    this.isConnected = false;
  }

  // Tạo connection pool cho SQL Server
  async createPool() {
    if (!this.pool) {
      // console.log('📝 Đang kết nối đến SQL Server...');
      // console.log(`   Host: ${config.db.host}`);
      // console.log(`   Port: ${config.db.port || 1433}`);
      // console.log(`   Database: ${config.db.database}`);
      // console.log(`   User: ${config.db.user}`);

      try {
        // Cấu hình kết nối SQL Server
        const sqlConfig = {
          user: config.db.user,
          password: config.db.password,
          server: config.db.host,
          database: config.db.database,
          port: parseInt(config.db.port) || 1433,
          options: {
            encrypt: false, // Đặt true nếu dùng SSL
            trustServerCertificate: true,
            enableArithAbort: true,
            connectionTimeout: 30000,
            requestTimeout: 30000,
          },
          pool: {
            max: config.db.connectionLimit || 10,
            min: 0,
            idleTimeoutMillis: 30000,
          },
        };

        this.pool = await sql.connect(sqlConfig);
        this.isConnected = true;
        // console.log("✅ SQL Server connected successfully");

        // Test query
        // const result = await this.pool.request().query('SELECT 1+1 AS result');
        // console.log('✅ Test query successful:', result.recordset);
      } catch (err) {
        // console.error("❌ SQL Server connection failed:", err.message);
        // console.log("⚠️ Server sẽ chạy ở chế độ demo (dữ liệu mẫu)");
        this.isConnected = false;
        this.pool = null;
      }
    }
    return this.pool;
  }

  // Kiểm tra kết nối
  async testConnection() {
    try {
      if (!this.pool) {
        await this.createPool();
      }
      if (this.isConnected && this.pool) {
        const result = await this.pool.request().query("SELECT 1+1 AS result");
        return result.recordset;
      }
      return null;
    } catch (err) {
      this.isConnected = false;
      throw err;
    }
  }

  // Execute query
  // database.js - Sửa hàm executeQuery để hỗ trợ object params
  async executeQuery(sqlQuery, params = []) {
    try {
      if (!this.pool || !this.isConnected) {
        await this.createPool();
      }

      if (!this.isConnected || !this.pool) {
        throw new Error("Database not connected");
      }

      const request = this.pool.request();

      // 👉 HỖ TRỢ CẢ ARRAY VÀ OBJECT
      if (params && typeof params === "object" && !Array.isArray(params)) {
        // Nếu params là object { key: value }
        Object.keys(params).forEach((key) => {
          request.input(key, params[key]);
        });
      } else if (Array.isArray(params) && params.length > 0) {
        // Nếu params là array [value1, value2, ...]
        params.forEach((param, index) => {
          request.input(`p${index}`, param);
        });
      }

      const result = await request.query(sqlQuery);
      return result.recordset;
    } catch (err) {
      console.error("❌ Query error:", err.message);
      throw err;
    }
  }
  // Execute transaction
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
      console.error("❌ Transaction error:", err.message);
      throw err;
    }
  }

  // Đóng kết nối
  async closePool() {
    try {
      if (this.pool) {
        await this.pool.close();
        this.pool = null;
        this.isConnected = false;
        console.log("✅ Database connection closed");
      }
    } catch (err) {
      console.error("❌ Error closing connection:", err.message);
    }
  }
}

module.exports = new Database();
