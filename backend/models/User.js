import db from '../db.js';
import { toJsonbArray, toCamel, toSnake } from '../helper/utils.js';

export async function findAll(dbClient = db) {
  const result = await dbClient.query(`
    SELECT u.*, r.role_name, d.department_name, s.status_name
    FROM users u
    LEFT JOIN roles r ON u.role_id = r.id
    LEFT JOIN departments d ON u.department_id = d.id
    LEFT JOIN statuses s ON u.status_id = s.id
    ORDER BY u.id ASC
  `);
  return toCamel(result.rows);
}

export async function findById(id, dbClient = db) {
  const result = await dbClient.query(`
    SELECT u.*, r.role_name, d.department_name, s.status_name
    FROM users u
    LEFT JOIN roles r ON u.role_id = r.id
    LEFT JOIN departments d ON u.department_id = d.id
    LEFT JOIN statuses s ON u.status_id = s.id
    WHERE u.id = $1
  `, [id]);
  return toCamel(result.rows[0] || null);
}

export async function create(payload, dbClient = db) {
  // accept camelCase payloads; convert to snake_case for DB
  const body = toSnake(payload) || {};

  const {
    first_name,
    last_name,
    username,
    email,
    phone_number,
    role_id,
    department_id,
    status_id,
    permissions,
    joined_date,
    avatar_url,
    password_hash,
    created_by,
  } = body;

  const result = await dbClient.query(
    `INSERT INTO users 
      (first_name, last_name, username, email, phone_number, role_id, department_id, status_id, permissions, 
       joined_date, avatar_url, password_hash, created_by, updated_at, last_login)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,NOW(),NOW())
     RETURNING *`,
    [
      first_name,
      last_name,
      username,
      email,
      phone_number,
      role_id,
      department_id,
      status_id,
      toJsonbArray(permissions),
      joined_date,
      avatar_url,
      password_hash,
      created_by,
    ]
  );

  return toCamel(result.rows[0]);
}

export async function updateById(id, payload, dbClient = db) {
  // accept camelCase payloads; convert to snake_case for DB
  const body = toSnake(payload) || {};

  const {
    first_name,
    last_name,
    username,
    email,
    phone_number,
    role_id,
    department_id,
    status_id,
    permissions,
    joined_date,
    avatar_url,
    password_hash,
    last_login,
  } = body;

  const result = await dbClient.query(
    `UPDATE users 
     SET first_name=$1, last_name=$2, username=$3, email=$4, phone_number=$5,
         role_id=$6, department_id=$7, status_id=$8, permissions=$9, joined_date=$10, avatar_url=$11,
         password_hash=COALESCE($12, password_hash),
         last_login=COALESCE($13, last_login),
         updated_at=NOW()
     WHERE id=$14
     RETURNING *`,
    [
      first_name,
      last_name,
      username,
      email,
      phone_number,
      role_id,
      department_id,
      status_id,
      toJsonbArray(permissions),
      joined_date,
      avatar_url,
      password_hash,
      last_login,
      id,
    ]
  );

  return toCamel(result.rows[0] || null);
}

export async function deleteById(id, dbClient = db) {
  const result = await dbClient.query('DELETE FROM users WHERE id = $1 RETURNING *', [id]);
  return toCamel(result.rows[0] || null);
}

export default {
  findAll,
  findById,
  create,
  updateById,
  deleteById,
};
