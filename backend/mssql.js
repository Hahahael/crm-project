import sql from "mssql";

// Central connection settings (env override supported)
const MSSQL_SERVER = process.env.MSSQL_SERVER || "139.135.131.164";
const MSSQL_USER = process.env.MSSQL_USER || "CRMUser";
const MSSQL_PASSWORD = process.env.MSSQL_PASSWORD || "MyP@ssw0rd123";

console.log("MSSQL Connection Settings:", {
  server: MSSQL_SERVER,
  user: MSSQL_USER,
  password: MSSQL_PASSWORD,
});

const baseOptions = {
  encrypt: false, // Set to true if using Azure
  trustServerCertificate: true, // Change to false for production
};

// Database-specific configs
const configSPI = {
  user: MSSQL_USER,
  password: MSSQL_PASSWORD,
  server: MSSQL_SERVER,
  database: process.env.MSSQL_DB_SPI || "SPIDB_V49_UAT",
  options: baseOptions,
};

const configCRM = {
  user: MSSQL_USER,
  password: MSSQL_PASSWORD,
  server: MSSQL_SERVER,
  database: process.env.MSSQL_DB_CRM || "CRMDB_DEV",
  options: baseOptions,
};

// Create two pools: SPI (default) and CRM
const poolSpiPromise = new sql.ConnectionPool(configSPI)
  .connect()
  .then((pool) => {
    console.log(`Connected to MSSQL (DB=${configSPI.database})`);
    return pool;
  })
  .catch((err) => {
    console.error("MSSQL SPI Connection Error:", err);
    throw err;
  });

const poolCrmPromise = new sql.ConnectionPool(configCRM)
  .connect()
  .then((pool) => {
    console.log(`Connected to MSSQL (DB=${configCRM.database})`);
    return pool;
  })
  .catch((err) => {
    console.error("MSSQL CRM Connection Error:", err);
    throw err;
  });

// Backward-compat: poolPromise refers to SPI database
const poolPromise = poolSpiPromise;
// const poolCrmPromise = null; // Placeholder if CRM pool is not used

export { sql, poolPromise, poolSpiPromise, poolCrmPromise };
