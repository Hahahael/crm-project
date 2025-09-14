// routes/hierarchicalRoutes.js
import express from "express";
import db from "../db.js";
import authMiddleware from "../middleware/authMiddleware.js";

const router = express.Router();

router.get("/roles", authMiddleware, async (req, res) => {
  try {
    const result = await db.query("SELECT * FROM roles ORDER BY id ASC");
    return res.json(result.rows); // ✅ already camelCase
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Failed to fetch roles" });
  }
});

router.get("/departments", authMiddleware, async (req, res) => {
  try {
    const result = await db.query("SELECT * FROM departments ORDER BY id ASC");
    return res.json(result.rows);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Failed to fetch departments" });
  }
});

router.get("/statuses", authMiddleware, async (req, res) => {
  try {
    const result = await db.query("SELECT * FROM statuses ORDER BY id ASC");
    return res.json(result.rows);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Failed to fetch statuses" });
  }
});

export default router;
