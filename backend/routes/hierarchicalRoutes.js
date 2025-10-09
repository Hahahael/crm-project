// routes/hierarchicalRoutes.js
import express from "express";
import authMiddleware from "../middleware/authMiddleware.js";
import * as RoleModel from "../models/Role.js";
import * as DepartmentModel from "../models/Department.js";
import * as StatusModel from "../models/Status.js";

const router = express.Router();

router.get("/roles", authMiddleware, async (req, res) => {
  try {
    const rows = await RoleModel.findAll();
    return res.json(rows);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Failed to fetch roles" });
  }
});

router.get("/departments", authMiddleware, async (req, res) => {
  try {
    const rows = await DepartmentModel.findAll();
    return res.json(rows);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Failed to fetch departments" });
  }
});

router.get("/statuses", authMiddleware, async (req, res) => {
  try {
    const rows = await StatusModel.findAll();
    return res.json(rows);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Failed to fetch statuses" });
  }
});

export default router;
