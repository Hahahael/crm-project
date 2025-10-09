import db from '../mocks/dbMock.js';
import { toCamel, toSnake } from '../helper/utils.js';

export async function findAll(dbClient = db) {
  const result = await dbClient.query(`
      SELECT accounts.*, ai.industry_name AS industry_name, apb.product_brand_name AS product_brand_name, ad.department_name AS department_name
      FROM accounts
      LEFT JOIN account_industries ai ON accounts.industry_id = ai.id
      LEFT JOIN account_product_brands apb ON accounts.product_id = apb.id
      LEFT JOIN account_departments ad ON accounts.department_id = ad.id
  `);
  return toCamel(result.rows);
}

export async function findNAEF(dbClient = db) {
  const result = await dbClient.query(`
      SELECT accounts.*, ai.industry_name AS industry_name, apb.product_brand_name AS product_brand_name, ad.department_name AS department_name
      FROM accounts
      LEFT JOIN account_industries ai ON accounts.industry_id = ai.id
      LEFT JOIN account_product_brands apb ON accounts.product_id = apb.id
      LEFT JOIN account_departments ad ON accounts.department_id = ad.id
      WHERE is_naef = TRUE
  `);
  return toCamel(result.rows);
}

export async function findById(id, dbClient = db) {
  const result = await dbClient.query('SELECT * FROM accounts WHERE id = $1', [id]);
  return toCamel(result.rows[0] || null);
}

export async function findIndustries(dbClient = db) {
  const result = await dbClient.query('SELECT * FROM account_industries');
  return toCamel(result.rows);
}

export async function findProductBrands(dbClient = db) {
  const result = await dbClient.query('SELECT * FROM account_product_brands');
  return toCamel(result.rows);
}

export async function findDepartments(dbClient = db) {
  const result = await dbClient.query('SELECT * FROM account_departments');
  return toCamel(result.rows);
}

export async function create(payload, dbClient = db) {
  // accept camelCase, convert to snake
  const body = toSnake(payload) || {};
  const keys = Object.keys(body);
  const values = Object.values(body);
  if (keys.length === 0) throw new Error('Empty payload');
  const cols = keys.join(', ');
  const params = keys.map((_, i) => `$${i + 1}`).join(', ');
  const result = await dbClient.query(`INSERT INTO accounts (${cols}) VALUES (${params}) RETURNING *`, values);
  return toCamel(result.rows[0]);
}

export async function updateById(id, snakeData, dbClient = db) {
  // snakeData should be already snake_case (route can call toSnake before)
  const keys = Object.keys(snakeData);
  const values = Object.values(snakeData);
  if (keys.length === 0) return null;
  const setClause = keys.map((k, i) => `${k} = $${i + 1}`).join(', ');
  const result = await dbClient.query(`UPDATE accounts SET ${setClause} WHERE id = $${keys.length + 1} RETURNING *`, [...values, id]);
  return toCamel(result.rows[0] || null);
}

export default {
  findAll,
  findNAEF,
  findById,
  findIndustries,
  findProductBrands,
  findDepartments,
  create,
  updateById,
};
