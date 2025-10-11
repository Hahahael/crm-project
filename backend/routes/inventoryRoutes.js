// routes/usersRoutes.js
import express from "express";
import { spidbPoolPromise, sql } from "../mssql.js";

const router = express.Router();

// Get all vendors (from SPIDB inventory DB)
router.get("/vendors", async (req, res) => {
  try {
    const pool = await spidbPoolPromise;
    const result = await pool.request().query('SELECT * FROM vendors');
    return res.json(result.recordset || []);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Failed to fetch vendors" });
  }
});

// Get single vendor (from SPIDB inventory DB)
router.get("/vendors/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const pool = await spidbPoolPromise;
    const result = await pool.request().input('id', sql.Int, parseInt(id, 10)).query('SELECT * FROM vendors WHERE id = @id');
    if (((result.recordset || []).length) === 0) return res.status(404).json({ error: 'Not found' });
    return res.json(result.recordset[0]);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Failed to fetch vendor" });
  }
});

// Get all items (from SPIDB inventory DB)
router.get("/items", async (req, res) => {
  try {
    const pool = await spidbPoolPromise;
    const result = await pool.request().query('SELECT * FROM items');
    return res.json(result.recordset || []);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Failed to fetch items" });
  }
});

// Get single item (from SPIDB inventory DB)
router.get("/items/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const pool = await spidbPoolPromise;
    const result = await pool.request().input('id', sql.Int, parseInt(id, 10)).query('SELECT * FROM items WHERE id = @id');
    if (((result.recordset || []).length) === 0) return res.status(404).json({ error: 'Not found' });
    return res.json(result.recordset[0]);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Failed to fetch item" });
  }
});

export default router;
