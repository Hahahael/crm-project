import sql from 'mssql';

// Read connection details from environment where possible; fall back to defaults for dev
const baseConfig = {
  user: process.env.MSSQL_USER || 'CRMUser',
  password: process.env.MSSQL_PASSWORD || 'MyP@ssw0rd123',
  server: process.env.MSSQL_SERVER || '139.135.131.164',
  port: parseInt(process.env.MSSQL_PORT || '1433', 10),
  options: {
    encrypt: process.env.MSSQL_ENCRYPT === 'true' || false,
    trustServerCertificate: process.env.MSSQL_TRUST_SERVER_CERTIFICATE === 'true' || true,
  },
  pool: { max: 10, min: 0, idleTimeoutMillis: 30000 }
};

// Pool for SPIDB (inventory / external)
const spidbConfig = { ...baseConfig, database: process.env.SPIDB_DATABASE || 'SPIDB_V49_UAT' };
const spidbPoolPromise = new sql.ConnectionPool(spidbConfig)
  .connect()
  .then(pool => {
    console.log(`Connected to MSSQL database: ${spidbConfig.database}`);
    return pool;
  })
  .catch(err => {
    console.error('MSSQL (SPIDB) Connection Error:', err);
    throw err;
  });

// Pool for CRMDB_DEV (local CRM database)
const crmConfig = { ...baseConfig, database: process.env.CRM_DATABASE || 'CRMDB_DEV' };
const crmPoolPromise = new sql.ConnectionPool(crmConfig)
  .connect()
  .then(pool => {
    console.log(`Connected to MSSQL database: ${crmConfig.database}`);
    return pool;
  })
  .catch(err => {
    console.error('MSSQL (CRM) Connection Error:', err);
    throw err;
  });

export { sql, spidbPoolPromise, crmPoolPromise };
