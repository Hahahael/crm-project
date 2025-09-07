import { query } from "../db.js";

async function createUser(username, passwordHash, role = "user", avatarUrl, firstName, lastName, email, phoneNum, department, status, permissions) {
  const result = await query(
    "INSERT INTO users (username, password_hash, role, avatar_url, first_name, last_name, email, phone_number, department, status, permissions) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11::jsonb) RETURNING id, username, role",
    [username, passwordHash, role, avatarUrl, firstName, lastName, email, phoneNum, department, status, permissions]
  );
  return result.rows[0];
}

async function findByUsername(username) {
  const result = await query(
    "SELECT * FROM users WHERE username = $1",
    [username]
  );
  return result.rows[0];
}

export default { createUser, findByUsername };