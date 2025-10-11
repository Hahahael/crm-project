// routes/usersRoutes.js
import express from "express";
import { sql, crmPoolPromise } from "../mssql.js";
import { toSnake } from "../helper/utils.js";

const router = express.Router();

// Get all users
router.get("/", async (req, res) => {
  try {
    const pool = await crmPoolPromise;
    const result = await pool.request().query(`SELECT u.*, r.role_name, d.department_name, s.status_name FROM crmdb.users u LEFT JOIN crmdb.roles r ON u.role_id = r.id LEFT JOIN crmdb.departments d ON u.department_id = d.id LEFT JOIN crmdb.statuses s ON u.status_id = s.id ORDER BY u.id ASC`);
    return res.json((result.recordset || []).map(r => r));
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Failed to fetch users" });
  }
});

// Get single user
router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const pool = await crmPoolPromise;
    const result = await pool.request().input('id', sql.Int, parseInt(id, 10)).query('SELECT u.*, r.role_name, d.department_name, s.status_name FROM crmdb.users u LEFT JOIN crmdb.roles r ON u.role_id = r.id LEFT JOIN crmdb.departments d ON u.department_id = d.id LEFT JOIN crmdb.statuses s ON u.status_id = s.id WHERE u.id = @id');
    if (((result.recordset || []).length) === 0) return res.status(404).json({ error: 'Not found' });
    return res.json(result.recordset[0]);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Failed to fetch user" });
  }
});

// Create new user
router.post("/", async (req, res) => {
  try {
    const body = toSnake(req.body); // ✅ convert camelCase → snake_case
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
      password,
      created_by,
    } = body;
    const pool = await crmPoolPromise;
    const req = pool.request();
    req.input('first_name', sql.NVarChar, first_name || null);
    req.input('last_name', sql.NVarChar, last_name || null);
    req.input('username', sql.NVarChar, username || null);
    req.input('email', sql.NVarChar, email || null);
    req.input('phone_number', sql.NVarChar, phone_number || null);
    req.input('role_id', sql.Int, role_id == null ? null : parseInt(role_id, 10));
    req.input('department_id', sql.Int, department_id == null ? null : parseInt(department_id, 10));
    req.input('status_id', sql.Int, status_id == null ? null : parseInt(status_id, 10));
    req.input('permissions', sql.NVarChar, JSON.stringify(permissions || []));
    req.input('joined_date', sql.Date, joined_date || null);
    req.input('avatar_url', sql.NVarChar, avatar_url || null);
    // Store plaintext password as-is into password_hash (per requirement). Accept `password` or `password_hash` field.
    const storedPassword = password || password_hash || null;
    req.input('password_hash', sql.NVarChar, storedPassword);
    req.input('created_by', sql.NVarChar, created_by || null);
    const insert = await req.query('INSERT INTO crmdb.users (first_name, last_name, username, email, phone_number, role_id, department_id, status_id, permissions, joined_date, avatar_url, password_hash, created_by, updated_at, last_login) OUTPUT INSERTED.* VALUES (@first_name, @last_name, @username, @email, @phone_number, @role_id, @department_id, @status_id, @permissions, @joined_date, @avatar_url, @password_hash, @created_by, SYSUTCDATETIME(), SYSUTCDATETIME())');
    return res.status(201).json((insert.recordset || [])[0]);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Failed to create user" });
  }
});

// Update existing user
router.put("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    console.log("Request body:", req.body);
    const body = toSnake(req.body);
    console.log("Updating user with data:", body);
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
      password,
      last_login,
    } = body;
    const pool = await crmPoolPromise;
    const req = pool.request();
    req.input('first_name', sql.NVarChar, first_name || null);
    req.input('last_name', sql.NVarChar, last_name || null);
    req.input('username', sql.NVarChar, username || null);
    req.input('email', sql.NVarChar, email || null);
    req.input('phone_number', sql.NVarChar, phone_number || null);
    req.input('role_id', sql.Int, role_id == null ? null : parseInt(role_id, 10));
    req.input('department_id', sql.Int, department_id == null ? null : parseInt(department_id, 10));
    req.input('status_id', sql.Int, status_id == null ? null : parseInt(status_id, 10));
    req.input('permissions', sql.NVarChar, JSON.stringify(permissions || []));
    req.input('joined_date', sql.Date, joined_date || null);
    req.input('avatar_url', sql.NVarChar, avatar_url || null);
    const storedPassword = password || password_hash || null;
    req.input('password_hash', sql.NVarChar, storedPassword);
    req.input('last_login', sql.DateTime, last_login || null);
    req.input('id', sql.Int, parseInt(id, 10));
    const result = await req.query('UPDATE crmdb.users SET first_name=@first_name, last_name=@last_name, username=@username, email=@email, phone_number=@phone_number, role_id=@role_id, department_id=@department_id, status_id=@status_id, permissions=@permissions, joined_date=@joined_date, avatar_url=@avatar_url, password_hash=COALESCE(@password_hash, password_hash), last_login=COALESCE(@last_login, last_login), updated_at=SYSUTCDATETIME() OUTPUT INSERTED.* WHERE id=@id');
    if (((result.recordset || []).length) === 0) return res.status(404).json({ error: 'Not found' });
    return res.json(result.recordset[0]);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Failed to update user" });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const pool = await crmPoolPromise;
    const result = await pool.request().input('id', sql.Int, parseInt(id, 10)).query('DELETE FROM crmdb.users WHERE id = @id; SELECT @@ROWCOUNT AS deleted');
    const deleted = (result.recordset || [])[0];
    if (!deleted || deleted.deleted === 0) return res.status(404).json({ error: 'User not found' });
    return res.json({ message: 'User deleted' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Failed to delete user" });
  }
});

export default router;
