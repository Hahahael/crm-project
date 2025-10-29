// db.js
import pg from "pg";
import { newDb } from "pg-mem";
import { toCamel } from "./helper/utils.js";

import mockPool from "./mocks/dbMock.js";

import dotenv from "dotenv";
dotenv.config();


let pool;

console.log(`Loading`, (process.env.USE_MOCK?' mock':'') ,` database...`,process.env.USE_MOCK);


if (process.env.USE_MOCK === "true") {
  console.log("Using mock database as per USE_MOCK=true");
  pool = mockPool;
  pool.connect().then(() => {
    console.log("Connected to mock database!");
  });
} else {
  console.log("Using real database connection as per USE_MOCK!=true");
  const { Pool } = pg;

  // Prefer a single DATABASE_URL when provided (works well with Supabase)
  const databaseUrl = process.env.DATABASE_URL;
  const mustUseSsl = (() => {
    // Enable SSL by default for hosted providers (Supabase, etc.) unless explicitly disabled
    const env = String(process.env.DB_SSL || "true").toLowerCase();
    return env !== "false" && env !== "0";
  })();

  const baseConfig = databaseUrl
    ? {
        connectionString: databaseUrl,
      }
    : {
        user: process.env.DB_USER,
        host: process.env.DB_HOST,
        database: process.env.DB_NAME,
        password: process.env.DB_PASS,
        port: Number(process.env.DB_PORT || 5432),
      };

  // Attach SSL if required (Supabase requires SSL). In local docker/postgres you can set DB_SSL=false
  const config = {
    ...(mustUseSsl ? { ...baseConfig, ssl: { rejectUnauthorized: false } } : baseConfig),
    // Connection robustness
    max: Number(process.env.DB_POOL_MAX || 10),
    idleTimeoutMillis: Number(process.env.DB_IDLE_TIMEOUT_MS || 30000),
    connectionTimeoutMillis: Number(process.env.DB_CONNECT_TIMEOUT_MS || 10000),
    keepAlive: true,
    keepAliveInitialDelayMillis: Number(process.env.DB_KEEPALIVE_DELAY_MS || 10000),
    application_name: process.env.DB_APP_NAME || "crm-project-backend",
  };

  pool = new Pool(config);

  pool
    .connect()
    .then(() =>
      console.log(
        `✅ Connected to database: ${process.env.DB_NAME || (process.env.DATABASE_URL ? "(DATABASE_URL)" : "unknown")}`,
      ),
    )
    .catch((err) => console.error("❌ Database connection error:", err));

  // Prevent crashes on transient pool-level errors (e.g., server restarts)
  pool.on("error", (err) => {
    console.error("⚠️ Unexpected PG pool error (handled):", err?.code || err?.message || err);
  });
}

// ✅ wrap query to always camelCase rows + add a light retry for transient errors
const originalQuery = pool.query.bind(pool);

function isTransientPgError(err) {
  // Postgres error codes that indicate transient conditions
  // 57P01: admin_shutdown, 57P02: crash_shutdown, 57P03: cannot_connect_now
  // 53300: too_many_connections, 08006/08003: connection failures
  const transientCodes = new Set([
    "57P01",
    "57P02",
    "57P03",
    "53300",
    "08006",
    "08003",
  ]);
  const nodeTransient = new Set(["ECONNRESET", "ETIMEDOUT", "EPIPE"]);
  return (
    (err && (transientCodes.has(err.code) || nodeTransient.has(err.code))) ||
    // Some providers send shapes like { message: 'shutdown' }
    /shutdown|db_termination|terminat/i.test(String(err?.message || ""))
  );
}

async function queryWithRetry(args, attempt = 0) {
  try {
    const result = await originalQuery(...args);
    return { ...result, rows: toCamel(result.rows) };
  } catch (err) {
    if (attempt < 1 && isTransientPgError(err)) {
      // small backoff then retry once
      await new Promise((r) => setTimeout(r, 200));
      const retryResult = await originalQuery(...args);
      return { ...retryResult, rows: toCamel(retryResult.rows) };
    }
    throw err;
  }
}

pool.query = async (...args) => {
  return queryWithRetry(args, 0);
};

export default pool;
