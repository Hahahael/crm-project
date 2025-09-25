// routes/usersRoutes.js
import express from "express";
import db from "../db.js";
import { toSnake, toJsonbArray } from "../helper/utils.js";

const router = express.Router();

// Get all users
router.get("/", async (req, res) => {
  try {
    const result = await db.query("SELECT * FROM users ORDER BY id ASC");
    return res.json(result.rows); // ✅ camelCase
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Failed to fetch users" });
  }
});

// Get single user
router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const result = await db.query("SELECT * FROM users WHERE id = $1", [id]);
    if (result.rows.length === 0)
      return res.status(404).json({ error: "Not found" });
    return res.json(result.rows[0]);
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
      role,
      department,
      status,
      permissions,
      joined_date,
      avatar_url,
      password_hash,
      created_by,
    } = body;

    const result = await db.query(
      `INSERT INTO users 
        (first_name, last_name, username, email, phone_number, role, department, status, permissions, 
         joined_date, avatar_url, password_hash, created_by, updated_at, last_login)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,NOW(),NOW())
       RETURNING *`,
      [
        first_name,
        last_name,
        username,
        email,
        phone_number,
        role,
        department,
        status,
        toJsonbArray(permissions),
        joined_date,
        avatar_url,
        password_hash,
        created_by,
      ]
    );

    return res.status(201).json(result.rows[0]); // ✅ camelCase
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Failed to create user" });
  }
});

// Update existing user
router.put("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const body = toSnake(req.body);
    const {
      first_name,
      last_name,
      username,
      email,
      phone_number,
      role,
      department,
      status,
      permissions,
      joined_date,
      avatar_url,
      password_hash,
      last_login,
    } = body;

    const result = await db.query(
      `UPDATE users 
       SET first_name=$1, last_name=$2, username=$3, email=$4, phone_number=$5,
           role=$6, department=$7, status=$8, permissions=$9, joined_date=$10, avatar_url=$11,
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
        role,
        department,
        status,
        toJsonbArray(permissions),
        joined_date,
        avatar_url,
        password_hash,
        last_login,
        id,
      ]
    );

    if (result.rows.length === 0)
      return res.status(404).json({ error: "Not found" });
    return res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Failed to update user" });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params;

    // Return deleted row if successful
    const result = await db.query(
      "DELETE FROM users WHERE id = $1 RETURNING *",
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "User not found" });
    }

    return res.json(result.rows[0]); // send back deleted user
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Failed to delete user" });
  }
});

export default router;
