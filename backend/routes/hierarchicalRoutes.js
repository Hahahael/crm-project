// routes/hierarchicalRoutes.js
import express from "express";
import { crmPoolPromise } from "../mssql.js";
import authMiddleware from "../middleware/authMiddleware.js";

const router = express.Router();

router.get("/roles", authMiddleware, async (req, res) => {
  try {
    const pool = await crmPoolPromise;
    const result = await pool.request().query('SELECT * FROM crmdb.roles ORDER BY id ASC');
    return res.json(result.recordset || []);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Failed to fetch roles" });
  }
});

router.get("/departments", authMiddleware, async (req, res) => {
  try {
    const pool = await crmPoolPromise;
    const result = await pool.request().query('SELECT * FROM crmdb.departments ORDER BY id ASC');
    return res.json(result.recordset || []);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Failed to fetch departments" });
  }
});

router.get("/statuses", authMiddleware, async (req, res) => {
  try {
    const pool = await crmPoolPromise;
    const result = await pool.request().query('SELECT * FROM crmdb.statuses ORDER BY id ASC');
    return res.json(result.recordset || []);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Failed to fetch statuses" });
  }
});

export default router;
