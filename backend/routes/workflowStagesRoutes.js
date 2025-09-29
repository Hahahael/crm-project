// routes/workflowStagesRoutes.js
import express from "express";
import db from "../db.js";
import { toSnake } from "../helper/utils.js";

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

// Get a single workflow stage by id
router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const result = await db.query(
      `SELECT ws.*, u.username AS assigned_to_username
       FROM workflow_stages ws
       LEFT JOIN users u ON ws.assigned_to = u.id
       WHERE ws.id = $1`,
      [id]
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
  console.log(req.body);
  try {
    const body = toSnake(req.body);
    const {
      wo_id,
      stage_name,
      status,
      assigned_to,
      notified = false
    } = body;
    const result = await db.query(
      `INSERT INTO workflow_stages
        (wo_id, stage_name, status, assigned_to, notified, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
       RETURNING *`,
      [wo_id, stage_name, status, assigned_to, notified]
    );
    
    // const workflows = await db.query(
    //   `SELECT ws.*, u.username AS assigned_to_username
    //    FROM workflow_stages ws
    //    LEFT JOIN users u ON ws.assigned_to = u.id
    //    ORDER BY ws.created_at ASC`
    // );

    // console.log("All Workflows after insert:", workflows.rows);

    return res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Failed to create workflow stage" });
  }
});

// Update a workflow stage
router.put("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const body = toSnake(req.body);
    const {
      status,
      assigned_to,
      notified
    } = body;
    const result = await db.query(
      `UPDATE workflow_stages
         SET status = COALESCE($1, status),
             assigned_to = COALESCE($2, assigned_to),
             notified = COALESCE($3, notified),
             updated_at = NOW()
       WHERE id = $4
       RETURNING *`,
      [status, assigned_to, notified, id]
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
router.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const result = await db.query(
      `DELETE FROM workflow_stages WHERE id = $1 RETURNING *`,
      [id]
    );
    if (result.rows.length === 0)
      return res.status(404).json({ error: "Not found" });
    return res.json({ message: "Workflow stage deleted" });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Failed to delete workflow stage" });
  }
});

// Get latest workflow stages assigned to a user with 'Pending' status for a specific stage name
router.get("/assigned/latest/:id/:stageName", async (req, res) => {
  console.log("Fetching latest assigned workflow stages for user:", req.params.id, "and stage:", req.params.stageName);
  try {
    const { id, stageName } = req.params;

    // Refactored: join users and sales_leads as needed
    let query;
    const stage = stageName.toLowerCase();
    if (stage.includes("sales lead") || stage.includes("sl")) {
      // For sales_leads: join users for username/department, include woNumber
      query = `
        SELECT ws.*, sl.*, sl.wo_number AS woNumber, u.username AS se_username, u.department AS se_department
        FROM workflow_stages ws
        INNER JOIN (
          SELECT wo_id, MAX(created_at) AS max_created
          FROM workflow_stages
          WHERE assigned_to = $1
          GROUP BY wo_id
        ) latest ON ws.wo_id = latest.wo_id AND ws.created_at = latest.max_created
        INNER JOIN sales_leads sl ON ws.wo_id = sl.id
        LEFT JOIN users u ON sl.se_id = u.id
        WHERE ws.status = 'Pending' AND ws.stage_name = $2
      `;
    } else if (stage.includes("workorder") || stage.includes("wo")) {
      // For workorders: join users for username/department, include woNumber
      query = `
        SELECT ws.*, wo.*, wo.wo_number AS woNumber, u.username AS assigned_to_username, u.department AS assigned_to_department
        FROM workflow_stages ws
        INNER JOIN (
          SELECT wo_id, MAX(created_at) AS max_created
          FROM workflow_stages
          WHERE assigned_to = $1
          GROUP BY wo_id
        ) latest ON ws.wo_id = latest.wo_id AND ws.created_at = latest.max_created
        INNER JOIN workorders wo ON ws.wo_id = wo.id
        LEFT JOIN users u ON ws.assigned_to = u.id
        WHERE ws.status = 'Pending' AND ws.stage_name = $2
      `;
    } else {
      // For other tables: join sales_leads for sl_number, join users for username/department
      // Table name and alias
      let table, alias;
      if (stage.includes("technical reco") || stage.includes("tr")) {
        table = "technical_recommendations";
        alias = "tr";
        query = `
          SELECT ws.*, tr.*
          FROM workflow_stages ws
          INNER JOIN (
            SELECT wo_id, MAX(created_at) AS max_created
            FROM workflow_stages
            WHERE assigned_to = $1
            GROUP BY wo_id
          ) latest ON ws.wo_id = latest.wo_id AND ws.created_at = latest.max_created
          INNER JOIN technical_recommendations tr ON ws.wo_id = tr.wo_id
          WHERE ws.status = 'Pending' AND ws.stage_name = $2
        `;
      } else if (stage.includes("rfq")) {
        table = "rfqs";
        alias = "rfq";
        query = `
          SELECT ws.*, rfq.*
          FROM workflow_stages ws
          INNER JOIN (
            SELECT wo_id, MAX(created_at) AS max_created
            FROM workflow_stages
            WHERE assigned_to = $1
            GROUP BY wo_id
          ) latest ON ws.wo_id = latest.wo_id AND ws.created_at = latest.max_created
          INNER JOIN rfqs rfq ON ws.wo_id = rfq.wo_id
          WHERE ws.status = 'Pending' AND ws.stage_name = $2
        `;
      // } else if (stage.includes("naef")) {
      //   // For accounts, join on ws.account_id = account.id (no wo_id/sl_id references)
      //   query = `
      //     SELECT ws.*, account.*
      //     FROM workflow_stages ws
      //     INNER JOIN (
      //       SELECT account_id, MAX(created_at) AS max_created
      //       FROM workflow_stages
      //       WHERE assigned_to = $1
      //       GROUP BY account_id
      //     ) latest ON ws.account_id = latest.account_id AND ws.created_at = latest.max_created
      //     INNER JOIN accounts account ON ws.account_id = account.id
      //     WHERE ws.status = 'Pending' AND ws.stage_name = $2
      //   `;
      } else if (stage.includes("quotation") || stage.includes("quote")) {
        table = "quotations";
        alias = "qt";
        query = `
          SELECT ws.*, qt.*
          FROM workflow_stages ws
          INNER JOIN (
            SELECT wo_id, MAX(created_at) AS max_created
            FROM workflow_stages
            WHERE assigned_to = $1
            GROUP BY wo_id
          ) latest ON ws.wo_id = latest.wo_id AND ws.created_at = latest.max_created
          INNER JOIN quotations qt ON ws.wo_id = qt.wo_id
          WHERE ws.status = 'Pending' AND ws.stage_name = $2
        `;
      } else {
        table = "workorders";
        alias = "wo";
        query = `
          SELECT ws.*, wo.*
          FROM workflow_stages ws
          INNER JOIN (
            SELECT wo_id, MAX(created_at) AS max_created
            FROM workflow_stages
            WHERE assigned_to = $1
            GROUP BY wo_id
          ) latest ON ws.wo_id = latest.wo_id AND ws.created_at = latest.max_created
          INNER JOIN workorders wo ON ws.wo_id = wo.id
          WHERE ws.status = 'Pending' AND ws.stage_name = $2
        `;
      }
    }

    const result = await db.query(query, [id, stageName]);
    console.log("Latest assigned workflow stages result:", result.rows);
    return res.json(result.rows);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Failed to fetch workflow stage" });
  }
});

export default router;
