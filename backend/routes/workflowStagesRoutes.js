// routes/workflowStagesRoutes.js
import express from "express";
import db from "../db.js";

const router = express.Router();

// Get all workflow stages
router.get("/", async (req, res) => {
  try {
    const result = await db.query(
      `SELECT ws.*, u.username AS assigned_to_username
       FROM workflow_stages ws
       LEFT JOIN users u ON ws.assigned_to = u.id
       ORDER BY ws.created_at ASC`
    );
    return res.json(result.rows);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Failed to fetch workflow stages" });
  }
});

// Get all workflow stages for a work order
router.get("/workorder/:woId", async (req, res) => {
  try {
    const { woId } = req.params;
    const result = await db.query(
      `SELECT ws.*, u.username AS assigned_to_username
       FROM workflow_stages ws
       LEFT JOIN users u ON ws.assigned_to = u.id
       WHERE ws.wo_id = $1
       ORDER BY ws.created_at ASC`,
      [woId]
    );
    return res.json(result.rows);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Failed to fetch workflow stages" });
  }
});

// Get a single workflow stage by stage_id
router.get("/:stageId", async (req, res) => {
  try {
    const { stageId } = req.params;
    const result = await db.query(
      `SELECT ws.*, u.username AS assigned_to_username
       FROM workflow_stages ws
       LEFT JOIN users u ON ws.assigned_to = u.id
       WHERE ws.stage_id = $1`,
      [stageId]
    );
    if (result.rows.length === 0)
      return res.status(404).json({ error: "Not found" });
    return res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Failed to fetch workflow stage" });
  }
});

// Create a new workflow stage
router.post("/", async (req, res) => {
  try {
    const {
      wo_id,
      stage_name,
      status = "Pending",
      assigned_to,
      notified = false
    } = req.body;
    const result = await db.query(
      `INSERT INTO workflow_stages
        (wo_id, stage_name, status, assigned_to, notified, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
       RETURNING *`,
      [wo_id, stage_name, status, assigned_to, notified]
    );
    return res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Failed to create workflow stage" });
  }
});

// Update a workflow stage
router.put("/:stageId", async (req, res) => {
  try {
    const { stageId } = req.params;
    const {
      status,
      assigned_to,
      notified
    } = req.body;
    const result = await db.query(
      `UPDATE workflow_stages
         SET status = COALESCE($1, status),
             assigned_to = COALESCE($2, assigned_to),
             notified = COALESCE($3, notified),
             updated_at = NOW()
       WHERE stage_id = $4
       RETURNING *`,
      [status, assigned_to, notified, stageId]
    );
    if (result.rows.length === 0)
      return res.status(404).json({ error: "Not found" });
    return res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Failed to update workflow stage" });
  }
});

// Delete a workflow stage
router.delete("/:stageId", async (req, res) => {
  try {
    const { stageId } = req.params;
    const result = await db.query(
      `DELETE FROM workflow_stages WHERE stage_id = $1 RETURNING *`,
      [stageId]
    );
    if (result.rows.length === 0)
      return res.status(404).json({ error: "Not found" });
    return res.json({ message: "Workflow stage deleted" });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Failed to delete workflow stage" });
  }
});

export default router;
