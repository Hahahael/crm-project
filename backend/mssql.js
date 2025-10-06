import sql from 'mssql';

const config = {
  user: 'CRMUser',
  password: 'MyP@ssw0rd123',
  server: '139.135.131.164',
  database: 'SPIDB_V49_UAT',
  options: {
    encrypt: false, // Set to true if using Azure
    trustServerCertificate: true // Change to false for production
  }
};

const poolPromise = new sql.ConnectionPool(config)
  .connect()
  .then(pool => {
    console.log('Connected to MSSQL');
    return pool;
  })
  .catch(err => {
    console.error('MSSQL Connection Error:', err);
    throw err;
  });

export { sql, poolPromise };
