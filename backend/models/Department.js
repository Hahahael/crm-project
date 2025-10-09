import db from '../db.js';
import { toCamel } from '../helper/utils.js';

export async function findAll(dbClient = db) {
  const result = await dbClient.query('SELECT * FROM departments ORDER BY id ASC');
  return toCamel(result.rows);
}

export default { findAll };
