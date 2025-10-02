import express from "express";
import pool from "../mocks/dbMock.js";
import { toSnake, toCamel } from "../helper/utils.js";

const router = express.Router();


// GET all accounts
router.get("/", async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM accounts");
    console.log("Fetched accounts:", result.rows);
    return res.json(result.rows); // ✅ camelCase
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET all account industries
router.get("/industries", async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM account_industries");
    console.log("Fetched account industries:", result.rows);
    return res.json(result.rows); // ✅ camelCase
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET all accounts product brands
router.get("/product-brands", async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM account_product_brands");
    console.log("Fetched account product brands:", result.rows);
    return res.json(result.rows); // ✅ camelCase
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET all accounts departments
router.get("/departments", async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM account_departments");
    console.log("Fetched account departments:", result.rows);
    return res.json(result.rows); // ✅ camelCase
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET single account by id
router.get("/:id", async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM accounts WHERE id = $1", [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: "Account not found" });
    return res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ADD new account
router.post("/", async (req, res) => {
  try {
    // Convert camelCase to snake_case for DB
    const data = toSnake(req.body);
    const keys = Object.keys(data);
    const values = Object.values(data);
    const columns = keys.map(k => `"${k}"`).join(", ");
    const params = keys.map((_, i) => `$${i + 1}`).join(", ");
    const query = `INSERT INTO accounts (${columns}) VALUES (${params}) RETURNING *`;
    const result = await pool.query(query, values);
    res.status(201).json(toCamel(result.rows[0]));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// UPDATE account
router.put("/:id", async (req, res) => {
  try {
    const data = toSnake(req.body);
    const keys = Object.keys(data);
    const values = Object.values(data);
    const setClause = keys.map((k, i) => `"${k}" = $${i + 1}`).join(", ");
    const query = `UPDATE accounts SET ${setClause} WHERE id = $${keys.length + 1} RETURNING *`;
    const result = await pool.query(query, [...values, req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: "Account not found" });
    res.json(toCamel(result.rows[0]));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
