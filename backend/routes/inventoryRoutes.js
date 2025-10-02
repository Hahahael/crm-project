// routes/usersRoutes.js
import express from "express";
import db from "../db.js";
import { toSnake, toJsonbArray } from "../helper/utils.js";

const router = express.Router();

// Get all vendors
router.get("/vendors", async (req, res) => {
  try {
    const result = await db.query(`SELECT * FROM vendors`);
    return res.json(result.rows); // ✅ camelCase
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Failed to fetch users" });
  }
});

// Get single vendor
router.get("/vendor/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const result = await db.query(`SELECT * FROM vendors WHERE id = $1`, [id]);
    if (result.rows.length === 0)
      return res.status(404).json({ error: "Not found" });
    return res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Failed to fetch user" });
  }
});

// Get all items
router.get("/items", async (req, res) => {
  try {
    const result = await db.query(`SELECT * FROM items`);
    return res.json(result.rows); // ✅ camelCase
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Failed to fetch users" });
  }
});

// Get single item
router.get("/items/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const result = await db.query(`SELECT * FROM items WHERE id = $1`, [id]);
    if (result.rows.length === 0)
      return res.status(404).json({ error: "Not found" });
    return res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Failed to fetch user" });
  }
});

export default router;
