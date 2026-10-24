const { Pool } = require("pg");
require("dotenv").config();

const pool = new Pool(
    process.env.DATABASE_URL
        ? {
              connectionString: process.env.DATABASE_URL,
              ssl: { rejectUnauthorized: false },
              max: 3
          }
        : {
              user: process.env.DB_USER,
              password: process.env.DB_PASSWORD,
              host: process.env.DB_HOST,
              port: process.env.DB_PORT,
              database: process.env.DB_NAME,
          }
);

// Neon sleeps when idle and drops connections.
// This stops the app from crashing when that happens.
pool.on("error", (err) => {
    console.error("Idle database client error:", err.message);
});

module.exports = pool;