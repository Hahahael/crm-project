import express from "express";
import pool from "../mocks/dbMock.js";
import { camelToSnake, snakeToCamel } from "../helper/utils.js";

const router = express.Router();


// GET all accounts
router.get("/", async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM accounts");
    // Convert snake_case to camelCase for frontend
    const accounts = result.rows.map(snakeToCamel);
    res.json(accounts);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET single account by id
router.get("/:id", async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM accounts WHERE id = $1", [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: "Account not found" });
    res.json(snakeToCamel(result.rows[0]));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ADD new account
router.post("/", async (req, res) => {
  try {
    // Convert camelCase to snake_case for DB
    const data = camelToSnake(req.body);
    const keys = Object.keys(data);
    const values = Object.values(data);
    const columns = keys.map(k => `"${k}"`).join(", ");
    const params = keys.map((_, i) => `$${i + 1}`).join(", ");
    const query = `INSERT INTO accounts (${columns}) VALUES (${params}) RETURNING *`;
    const result = await pool.query(query, values);
    res.status(201).json(snakeToCamel(result.rows[0]));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// UPDATE account
router.put("/:id", async (req, res) => {
  try {
    const data = camelToSnake(req.body);
    const keys = Object.keys(data);
    const values = Object.values(data);
    const setClause = keys.map((k, i) => `"${k}" = $${i + 1}`).join(", ");
    const query = `UPDATE accounts SET ${setClause} WHERE id = $${keys.length + 1} RETURNING *`;
    const result = await pool.query(query, [...values, req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: "Account not found" });
    res.json(snakeToCamel(result.rows[0]));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
