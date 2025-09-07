import { Pool } from 'pg';
import { config } from 'dotenv';

// Pick environment file based on NODE_ENV
const envFile = `.env.${process.env.NODE_ENV || 'dev'}`;
config({ path: envFile });

const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASS,
  port: process.env.DB_PORT || 5432,
});

pool.connect()
  .then(() => console.log(`✅ Connected to database: ${process.env.DB_NAME}`))
  .catch(err => console.error('❌ Database connection error:', err));

export default pool;
