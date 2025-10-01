// routes/workflowStagesRoutes.js
import express from "express";
import db from "../db.js";
import { toSnake } from "../helper/utils.js";

const router = express.Router();

// Get all workflows whose latest stage is 'Submitted', joined with module details
router.get("/latest-submitted", async (req, res) => {
  try {
    // Get latest stage for each workflow (by wo_id), where stageName is 'Submitted'
    // Join with workorders, sales_leads, rfqs, etc. as needed
    // Get the latest workflow stage for each workorder
    const unionQuery = `
  SELECT ws.id AS workflow_stage_id, ws.created_at AS submitted_date, ws.stage_name, ws.status, ws.wo_id, ws.assigned_to, ws.remarks, u.username AS submitted_by, 'sales_lead' AS module, sl.sl_number AS transaction_number, sl.id AS module_id
      FROM workflow_stages ws
      INNER JOIN (
        SELECT wo_id, MAX(created_at) AS max_created
        FROM workflow_stages
        GROUP BY wo_id
      ) latest ON ws.wo_id = latest.wo_id AND ws.created_at = latest.max_created
      LEFT JOIN sales_leads sl ON ws.wo_id = sl.wo_id
      LEFT JOIN users u ON ws.assigned_to = u.id
      WHERE ws.status = 'Submitted' AND ws.stage_name = 'Sales Lead'

      UNION ALL

  SELECT ws.id AS workflow_stage_id, ws.created_at AS submitted_date, ws.stage_name, ws.status, ws.wo_id, ws.assigned_to, ws.remarks, u.username AS submitted_by, 'rfq' AS module, r.rfq_number AS transaction_number, r.id AS module_id
      FROM workflow_stages ws
      INNER JOIN (
        SELECT wo_id, MAX(created_at) AS max_created
        FROM workflow_stages
        GROUP BY wo_id
      ) latest ON ws.wo_id = latest.wo_id AND ws.created_at = latest.max_created
      LEFT JOIN rfqs r ON ws.wo_id = r.wo_id
      LEFT JOIN users u ON ws.assigned_to = u.id
      WHERE ws.status = 'Submitted' AND ws.stage_name = 'RFQ'

      UNION ALL

  SELECT ws.id AS workflow_stage_id, ws.created_at AS submitted_date, ws.stage_name, ws.status, ws.wo_id, ws.assigned_to, ws.remarks, u.username AS submitted_by, 'technical_recommendation' AS module, tr.tr_number AS transaction_number, tr.id AS module_id
      FROM workflow_stages ws
      INNER JOIN (
        SELECT wo_id, MAX(created_at) AS max_created
        FROM workflow_stages
        GROUP BY wo_id
      ) latest ON ws.wo_id = latest.wo_id AND ws.created_at = latest.max_created
      LEFT JOIN technical_recommendations tr ON ws.wo_id = tr.wo_id
      LEFT JOIN users u ON ws.assigned_to = u.id
      WHERE ws.status = 'Submitted' AND ws.stage_name = 'Technical Recommendation'

      UNION ALL

  SELECT ws.id AS workflow_stage_id, ws.created_at AS submitted_date, ws.stage_name, ws.status, ws.wo_id, ws.assigned_to, ws.remarks, u.username AS submitted_by, 'account' AS module, a.ref_number AS transaction_number, a.id AS module_id
      FROM workflow_stages ws
      INNER JOIN (
        SELECT wo_id, MAX(created_at) AS max_created
        FROM workflow_stages
        GROUP BY wo_id
      ) latest ON ws.wo_id = latest.wo_id AND ws.created_at = latest.max_created
      LEFT JOIN accounts a ON ws.wo_id = a.id
      LEFT JOIN users u ON ws.assigned_to = u.id
      WHERE ws.status = 'Submitted' AND (ws.stage_name = 'Account' OR ws.stage_name = 'NAEF')

      UNION ALL

  SELECT ws.id AS workflow_stage_id, ws.created_at AS submitted_date, ws.stage_name, ws.status, ws.wo_id, ws.assigned_to, ws.remarks, u.username AS submitted_by, 'workorder' AS module, wo.wo_number AS transaction_number, wo.id AS module_id
      FROM workflow_stages ws
      INNER JOIN (
        SELECT wo_id, MAX(created_at) AS max_created
        FROM workflow_stages
        GROUP BY wo_id
      ) latest ON ws.wo_id = latest.wo_id AND ws.created_at = latest.max_created
      LEFT JOIN workorders wo ON ws.wo_id = wo.id
      LEFT JOIN users u ON ws.assigned_to = u.id
      WHERE ws.status = 'Submitted' AND ws.stage_name = 'Work Order'
    `;
    const { rows } = await db.query(unionQuery);
    console.log("Latest submitted workflow stages:", rows);
    return res.json(rows);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Failed to fetch latest submitted workflow stages" });
  }
});

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
      notified = false,
      remarks // <-- add remarks from body
    } = body;
    // Start transaction
    await db.query('BEGIN');
    let insertedStage;
    try {
      const result = await db.query(
        `INSERT INTO workflow_stages
          (wo_id, stage_name, status, assigned_to, notified, remarks, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
         RETURNING *`,
        [wo_id, stage_name, status, assigned_to, notified, remarks]
      );
      insertedStage = result.rows[0];

      // Update stage_status in the relevant module only
      switch (stage_name) {
        case 'Sales Lead':
          await db.query('UPDATE sales_leads SET stage_status = $1 WHERE wo_id = $2', [status, wo_id]);
          break;
        case 'RFQ':
          await db.query('UPDATE rfqs SET stage_status = $1 WHERE wo_id = $2', [status, wo_id]);
          break;
        case 'Technical Recommendation':
          await db.query('UPDATE technical_recommendations SET stage_status = $1 WHERE wo_id = $2', [status, wo_id]);
          break;
        case 'Account':
        case 'NAEF':
          if (body.account_id) {
            await db.query('UPDATE accounts SET stage_status = $1 WHERE id = $2', [status, body.account_id]);
          }
          break;
        case 'Work Order':
          await db.query('UPDATE workorders SET stage_status = $1 WHERE id = $2', [status, wo_id]);
          break;
        default:
          // No action for unknown stage_name
          break;
      }

      // Log all workflow stages after insert
      const allStages = await db.query('SELECT * FROM workflow_stages ORDER BY created_at ASC');
      console.log('All workflow stages:', allStages.rows);

      await db.query('COMMIT');
    } catch (err) {
      await db.query('ROLLBACK');
      throw err;
    }
    return res.status(201).json(insertedStage);
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
      // For sales_leads: join users for username/department, include slNumber
      query = `
        SELECT ws.*, sl.*, sl.sl_number AS slNumber, u.username AS se_username, u.department AS se_department
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
          SELECT tr.*, sl.sl_number
          FROM workflow_stages ws
          INNER JOIN (
            SELECT wo_id, MAX(created_at) AS max_created
            FROM workflow_stages
            WHERE assigned_to = $1
            GROUP BY wo_id
          ) latest ON ws.wo_id = latest.wo_id AND ws.created_at = latest.max_created
          INNER JOIN technical_recommendations tr ON ws.wo_id = tr.wo_id
          LEFT JOIN sales_leads sl ON tr.sl_id = sl.id
          WHERE ws.status = 'Draft' AND ws.stage_name = $2
        `;
      } else if (stage.includes("rfq")) {
        table = "rfqs";
        alias = "rfq";
        query = `
          SELECT rfq.*, sl.sl_number
          FROM workflow_stages ws
          INNER JOIN (
            SELECT wo_id, MAX(created_at) AS max_created
            FROM workflow_stages
            WHERE assigned_to = $1
            GROUP BY wo_id
          ) latest ON ws.wo_id = latest.wo_id AND ws.created_at = latest.max_created
          INNER JOIN rfqs rfq ON ws.wo_id = rfq.wo_id
          LEFT JOIN sales_leads sl ON rfq.sl_id = sl.id
          WHERE ws.status = 'Draft' AND ws.stage_name = $2
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
          WHERE ws.status = 'Draft' AND ws.stage_name = $2
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
