// db.js
import pg from "pg";
import { newDb } from "pg-mem";
import { toCamel } from "./helper/utils.js";

import mockPool from "./mocks/dbMock.js";

let pool;

console.log("Loading database...");

if (process.env.USE_MOCK === "true") {
  pool = mockPool;
  pool.connect().then(() => {
    console.log("Connected to mock database!");
  });
} else {
  const { Pool } = pg;
  pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASS,
    port: process.env.DB_PORT || 5432,
  });

  pool
    .connect()
    .then(() => console.log(`✅ Connected to database: ${process.env.DB_NAME}`))
    .catch((err) => console.error("❌ Database connection error:", err));
}

// ✅ wrap query to always camelCase rows
const originalQuery = pool.query.bind(pool);
pool.query = async (...args) => {
  const result = await originalQuery(...args);
  return {
    ...result,
    rows: toCamel(result.rows),
  };
};

export default pool;
