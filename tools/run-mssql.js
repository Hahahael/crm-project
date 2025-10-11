#!/usr/bin/env node
/**
 * tools/run-mssql.js
 *
 * Simple interactive MSSQL runner for the project.
 * Usage:
 *   node tools/run-mssql.js
 *
 * Paste or type SQL statements and press Enter. End a statement with a semicolon (;) or type a full-line 
 * `.exit` to quit. Multi-line statements are supported; they are executed when a line ends with `;`.
 *
 * Configuration:
 * - By default this script reuses the connection config from `backend/mssql.js` if available.
 * - You can override connection details with environment variables:
 *     MSSQL_USER, MSSQL_PASSWORD, MSSQL_SERVER, MSSQL_DATABASE
 *
 * NOTE: This tool is intended for local development/testing only. Do not run against production databases
 * unless you're certain about the consequences.
 */

import readline from 'readline';
import { sql } from '../backend/mssql.js';

// Try to import config from backend/mssql.js dynamically if available
let configFromFile = null;
try {
  // backend/mssql.js exports poolPromise and sql; its config isn't exported, so we'll fallback to env vars
} catch (err) {
  // ignore
}

// Build config from environment (preferred) or hardcoded fallback from backend/mssql.js
const config = {
    user: 'CRMUser',
    password: 'MyP@ssw0rd123',
    server: '139.135.131.164',
    database: 'SPIDB_V49_UAT',
    options: {
      encrypt: true, // Set to true if using Azure
      trustServerCertificate: true // Change to false for production
    }
  };
  

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
  prompt: 'mssql> '
});

async function main() {
  let pool;
  try {
    pool = await new sql.ConnectionPool(config).connect();
    console.log('Connected to MSSQL');
  } catch (err) {
    console.error('Failed to connect to MSSQL:', err.message || err);
    process.exit(1);
  }

  let buffer = '';

  rl.prompt();

  rl.on('line', async (line) => {
    const trimmed = line.trim();
    if (trimmed === '.exit') {
      rl.close();
      return;
    }

    buffer += line + '\n';

    // If line ends with semicolon, try to execute the buffer
    if (trimmed.endsWith(';')) {
      const sqlText = buffer.trim();
      buffer = '';

      try {
        const request = pool.request();
        const result = await request.query(sqlText);
        console.log('Rows:', result.recordset?.length ?? 0);
        console.dir(result.recordset, { depth: 2, maxArrayLength: 200 });
      } catch (err) {
        console.error('Query error:', err.message || err);
      }
    }

    rl.prompt();
  }).on('close', async () => {
    try {
      await pool.close();
    } catch (e) {
      // ignore
    }
    console.log('\nGoodbye');
    process.exit(0);
  });
}

main();
