const sql = require("mssql");
require("dotenv").config();

console.log("========================================");
console.log("📝 KIỂM TRA KẾT NỐI SQL SERVER");
console.log("========================================");

const config = {
  user: process.env.DB_USER || "sa",
  password: process.env.DB_PASSWORD || "",
  server: process.env.DB_HOST || "localhost",
  database: process.env.DB_NAME || "your_database",
  port: parseInt(process.env.DB_PORT) || 1433,
  options: {
    encrypt: false,
    trustServerCertificate: true,
    connectionTimeout: 30000,
  },
};

console.log("\n📌 Thông tin kết nối:");
console.log(`   Server: ${config.server}`);
console.log(`   Port: ${config.port}`);
console.log(`   Database: ${config.database}`);
console.log(`   User: ${config.user}`);
console.log(`   Password: ${config.password ? "********" : "(EMPTY)"}`);

if (!config.password) {
  console.error("\n❌ LỖI: PASSWORD TRỐNG!");
  process.exit(1);
}

console.log("\n⏳ Đang kết nối...");

async function testConnection() {
  try {
    const pool = await sql.connect(config);
    console.log("\n✅ KẾT NỐI THÀNH CÔNG!");

    const result = await pool
      .request()
      .query(
        "SELECT @@VERSION as version, GETDATE() as current_time, DB_NAME() as db",
      );
    console.log("\n📊 THÔNG TIN SERVER:");
    console.log(`   Version: ${result.recordset[0].version}`);
    console.log(`   Current Time: ${result.recordset[0].current_time}`);
    console.log(`   Database: ${result.recordset[0].db}`);
    console.log("\n🎉 Kết nối thành công! Bạn có thể chạy server.");

    await pool.close();
  } catch (err) {
    console.error("\n❌ KẾT NỐI THẤT BẠI!");
    console.error("   Message:", err.message);

    if (err.code === "ETIMEOUT") {
      console.log("\n🔧 LỖI TIMEOUT:");
      console.log("   1. Kiểm tra IP đã được whitelist trên Alibaba Cloud RDS");
      console.log("   2. Kiểm tra port: 1433");
    }

    if (err.code === "ELOGIN") {
      console.log("\n🔧 LỖI ĐĂNG NHẬP:");
      console.log("   1. Kiểm tra username: ERP");
      console.log("   2. Kiểm tra password");
    }
  }
}

testConnection();
