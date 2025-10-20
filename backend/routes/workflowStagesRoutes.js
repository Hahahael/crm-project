// routes/workflowStagesRoutes.js
import express from "express";
import db from "../db.js";
import { toSnake } from "../helper/utils.js";
import { poolPromise, poolCrmPromise } from "../mssql.js";

const router = express.Router();

// Get all workflows whose latest stage is 'Submitted', joined with module details
router.get("/latest-submitted", async (req, res) => {
  try {
    // Get latest stage for each workflow (by wo_id), where stageName is 'Submitted'
    // Join with workorders, sales_leads, rfqs, etc. as needed
    // Get the latest workflow stage for each workorder
    const unionQuery = `
      WITH latest_stages AS (
        -- SALES LEAD
        SELECT 
          ws.id AS workflow_stage_id,
          ws.created_at AS submitted_date,
          ws.stage_name,
          ws.status,
          ws.wo_id,
          ws.assigned_to,
          ws.remarks,
          u.username AS submitted_by,
          'sales_lead' AS module,
          sl.sl_number AS transaction_number,
          sl.id AS module_id,
          sl.account_id,
          sl.urgency AS urgency,
          NULL AS priority
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

        -- RFQ
        SELECT 
          ws.id AS workflow_stage_id,
          ws.created_at AS submitted_date,
          ws.stage_name,
          ws.status,
          ws.wo_id,
          ws.assigned_to,
          ws.remarks,
          u.username AS submitted_by,
          'rfq' AS module,
          r.rfq_number AS transaction_number,
          r.id AS module_id,
          r.account_id,
          NULL AS urgency,
          NULL AS priority
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

        -- TECHNICAL RECOMMENDATION
        SELECT 
          ws.id AS workflow_stage_id,
          ws.created_at AS submitted_date,
          ws.stage_name,
          ws.status,
          ws.wo_id,
          ws.assigned_to,
          ws.remarks,
          u.username AS submitted_by,
          'technical_recommendation' AS module,
          tr.tr_number AS transaction_number,
          tr.id AS module_id,
          tr.account_id,
          NULL AS urgency,
          tr.priority AS priority
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

        -- WORK ORDER
        SELECT 
          ws.id AS workflow_stage_id,
          ws.created_at AS submitted_date,
          ws.stage_name,
          ws.status,
          ws.wo_id,
          ws.assigned_to,
          ws.remarks,
          u.username AS submitted_by,
          'workorder' AS module,
          wo.wo_number AS transaction_number,
          wo.id AS module_id,
          wo.account_id,
          NULL AS urgency,
          NULL AS priority
        FROM workflow_stages ws
        INNER JOIN (
          SELECT wo_id, MAX(created_at) AS max_created
          FROM workflow_stages
          GROUP BY wo_id
        ) latest ON ws.wo_id = latest.wo_id AND ws.created_at = latest.max_created
        LEFT JOIN workorders wo ON ws.wo_id = wo.id
        LEFT JOIN users u ON ws.assigned_to = u.id
        WHERE ws.status = 'Submitted' AND ws.stage_name = 'Work Order'
      )

      SELECT *
      FROM latest_stages
      ORDER BY submitted_date DESC;
    `;
    const { rows } = await db.query(unionQuery);

    // Fetch Account/NAEF latest-submitted separately and populate via CRM
    const accountLatestQuery = `
      WITH latest_acc AS (
        SELECT ws.*
        FROM workflow_stages ws
        INNER JOIN (
          SELECT wo_id, MAX(created_at) AS max_created
          FROM workflow_stages
          GROUP BY wo_id
        ) latest ON ws.wo_id = latest.wo_id AND ws.created_at = latest.max_created
        WHERE ws.status = 'Submitted' AND (ws.stage_name = 'Account' OR ws.stage_name = 'NAEF')
      )
      SELECT 
        la.id AS workflow_stage_id,
        la.created_at AS submitted_date,
        la.stage_name,
        la.status,
        la.wo_id,
        la.assigned_to,
        la.remarks,
        u.username AS submitted_by,
        'account' AS module,
        NULL::text AS transaction_number,
        NULL::int AS module_id,
        wo.account_id AS account_id,
        NULL::text AS urgency,
        NULL::text AS priority
      FROM latest_acc la
      LEFT JOIN users u ON la.assigned_to = u.id
      LEFT JOIN workorders wo ON la.wo_id = wo.id
    `;
    const accStageRes = await db.query(accountLatestQuery);
    const accStageRows = accStageRes.rows || [];

    // Enrich each row with CRM + SPI account details
    try {
      const accountIds = Array.from(
        new Set(
          [...(rows || []), ...accStageRows]
            .map((r) => r.accountId ?? r.account_id)
            .filter((v) => v !== null && v !== undefined),
        ),
      );

      if (accountIds.length > 0) {
        const [crmPool, spiPool] = await Promise.all([
          poolCrmPromise,
          poolPromise,
        ]);

        // Load CRM accounts in batch
        const numericIds = accountIds
          .map((x) => Number(x))
          .filter((n) => Number.isFinite(n));
        let accountMap = new Map();
        if (numericIds.length > 0) {
          const accSql = `SELECT * FROM crmdb.accounts WHERE id IN (${numericIds.join(",")})`;
          const accRes = await crmPool.request().query(accSql);
          const crmAccounts = accRes.recordset || [];
          accountMap = new Map(crmAccounts.map((a) => [Number(a.id), a]));

          // Collect SPI lookup ids
          const kIds = Array.from(
            new Set(
              crmAccounts
                .map((a) => a.kristem_customer_id)
                .filter((v) => v !== null && v !== undefined),
            ),
          );
          const bIds = Array.from(
            new Set(
              crmAccounts
                .map((a) => a.product_id)
                .filter((v) => v !== null && v !== undefined),
            ),
          );
          const iIds = Array.from(
            new Set(
              crmAccounts
                .map((a) => a.industry_id)
                .filter((v) => v !== null && v !== undefined),
            ),
          );
          const dIds = Array.from(
            new Set(
              crmAccounts
                .map((a) => a.department_id)
                .filter((v) => v !== null && v !== undefined),
            ),
          );

          // Fetch SPI lookups in batch
          const [custRes, brandRes, indRes, deptRes] = await Promise.all([
            kIds.length
              ? spiPool
                  .request()
                  .query(`SELECT * FROM spidb.customer WHERE Id IN (${kIds
                    .map((x) => Number(x))
                    .filter((n) => Number.isFinite(n))
                    .join(",")})`)
              : Promise.resolve({ recordset: [] }),
            bIds.length
              ? spiPool
                  .request()
                  .query(`SELECT * FROM spidb.brand WHERE ID IN (${bIds
                    .map((x) => Number(x))
                    .filter((n) => Number.isFinite(n))
                    .join(",")})`)
              : Promise.resolve({ recordset: [] }),
            iIds.length
              ? spiPool
                  .request()
                  .query(
                    `SELECT * FROM spidb.Customer_Industry_Group WHERE Id IN (${iIds
                      .map((x) => Number(x))
                      .filter((n) => Number.isFinite(n))
                      .join(",")})`,
                  )
              : Promise.resolve({ recordset: [] }),
            dIds.length
              ? spiPool
                  .request()
                  .query(`SELECT * FROM spidb.Department WHERE Id IN (${dIds
                    .map((x) => Number(x))
                    .filter((n) => Number.isFinite(n))
                    .join(",")})`)
              : Promise.resolve({ recordset: [] }),
          ]);

          const custMap = new Map(
            (custRes.recordset || []).map((c) => [String(c.Id), c]),
          );
          const brandMap = new Map(
            (brandRes.recordset || []).map((b) => [String(b.ID), b]),
          );
          const indMap = new Map(
            (indRes.recordset || []).map((i) => [String(i.Id), i]),
          );
          const deptMap = new Map(
            (deptRes.recordset || []).map((d) => [String(d.Id), d]),
          );

          // Attach account object to each row uniformly
          for (const row of rows) {
            const aid = row.accountId ?? row.account_id;
            if (aid != null && accountMap.has(Number(aid))) {
              const acc = accountMap.get(Number(aid));
              row.account = {
                ...acc,
                kristem: acc.kristem_customer_id
                  ? custMap.get(String(acc.kristem_customer_id)) || null
                  : null,
                mssqlBrand: acc.product_id
                  ? brandMap.get(String(acc.product_id)) || null
                  : null,
                mssqlIndustry: acc.industry_id
                  ? indMap.get(String(acc.industry_id)) || null
                  : null,
                mssqlDepartment: acc.department_id
                  ? deptMap.get(String(acc.department_id)) || null
                  : null,
              };
            } else {
              row.account = null;
            }
          }

          // Build Account/NAEF rows from CRM and attach same account object
          const accRowsBuilt = accStageRows.map((r) => {
            const aid = r.accountId ?? r.account_id;
            let account = null;
            if (aid != null && accountMap.has(Number(aid))) {
              const acc = accountMap.get(Number(aid));
              account = {
                ...acc,
                kristem: acc.kristem_customer_id
                  ? custMap.get(String(acc.kristem_customer_id)) || null
                  : null,
                mssqlBrand: acc.product_id
                  ? brandMap.get(String(acc.product_id)) || null
                  : null,
                mssqlIndustry: acc.industry_id
                  ? indMap.get(String(acc.industry_id)) || null
                  : null,
                mssqlDepartment: acc.department_id
                  ? deptMap.get(String(acc.department_id)) || null
                  : null,
              };
            }
            return {
              ...r,
              module: "account",
              module_id: account ? Number(account.id) : null,
              transaction_number: account?.account_name ?? null,
              account,
            };
          });

          // Merge base rows with account/naef rows
          rows.push(...accRowsBuilt);
          // Re-sort by submitted_date DESC after merging
          rows.sort((a, b) => {
            const da = new Date(a.submitted_date || a.submittedDate || 0).getTime();
            const db = new Date(b.submitted_date || b.submittedDate || 0).getTime();
            return db - da;
          });
        }
      }
    } catch (enrichErr) {
      console.warn(
        "Failed to enrich latest-submitted workflow rows with account data:",
        enrichErr.message,
      );
    }

    console.log("Latest submitted workflow stages:", rows);
    return res.json(rows);
  } catch (err) {
    console.error(err);
    return res
      .status(500)
      .json({ error: "Failed to fetch latest submitted workflow stages" });
  }
});

// Get all workflow stages
router.get("/", async (req, res) => {
  try {
    const result = await db.query(
      `SELECT ws.*, u.username AS assigned_to_username
             FROM workflow_stages ws
             LEFT JOIN users u ON ws.assigned_to = u.id
             ORDER BY ws.created_at ASC`,
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
      [woId],
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
      [id],
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
    console.log("Creating workflow stage with data:", body);
    const {
      wo_id,
      stage_name,
      status,
      assigned_to,
      notified = false,
      remarks, // <-- add remarks from body
    } = body;
    // Start transaction
    await db.query("BEGIN");
    let insertedStage;
    try {
      const result = await db.query(
        `INSERT INTO workflow_stages
                                        (wo_id, stage_name, status, assigned_to, notified, remarks, created_at, updated_at)
                                VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
                                RETURNING *`,
        [wo_id, stage_name, status, assigned_to, notified, remarks],
      );
      insertedStage = result.rows[0];

      const queryText =
        status === "Approved"
          ? "SET stage_status = $1, done_date = NOW() WHERE wo_id = $2"
          : "SET stage_status = $1 WHERE wo_id = $2";

      // Update stage_status in the relevant module only
      switch (stage_name) {
        case "Sales Lead":
          await db.query(`UPDATE sales_leads ${queryText}`, [status, wo_id]);
          break;
        case "RFQ":
          await db.query(`UPDATE rfqs ${queryText}`, [status, wo_id]);
          break;
        case "Technical Recommendation":
          await db.query(`UPDATE technical_recommendations ${queryText}`, [
            status,
            wo_id,
          ]);
          break;
        case "Account":
        case "NAEF":
          if (body.account_id) {
            await db.query(
              "UPDATE accounts SET stage_status = $1 WHERE id = $2",
              [status, body.account_id],
            );
          }
          break;
        case "Work Order":
          await db.query(
            "UPDATE workorders SET stage_status = $1 WHERE id = $2",
            [status, wo_id],
          );
          break;
        default:
          // No action for unknown stage_name
          break;
      }

      // Log all workflow stages after insert
      const allStages = await db.query(
        "SELECT * FROM workflow_stages ORDER BY created_at ASC",
      );
      console.log("All workflow stages:", allStages.rows);

      await db.query("COMMIT");
    } catch (err) {
      await db.query("ROLLBACK");
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
    const { status, assigned_to, notified } = body;
    const result = await db.query(
      `UPDATE workflow_stages
                        SET status = COALESCE($1, status),
                                assigned_to = COALESCE($2, assigned_to),
                                notified = COALESCE($3, notified),
                                updated_at = NOW()
                        WHERE id = $4
                        RETURNING *`,
      [status, assigned_to, notified, id],
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
      [id],
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
  console.log(
    "Fetching latest assigned workflow stages for user:",
    req.params.id,
    "and stage:",
    req.params.stageName,
  );
  try {
    const { id, stageName } = req.params;

    // Refactored: join users and sales_leads as needed
    let query;
    const stage = stageName.toLowerCase();
    if (stage.includes("sales lead") || stage.includes("sl")) {
      // For sales_leads: join users for username/department, include slNumber
      query = `
                                SELECT
                                        ws.*,
                                        sl.*,
                                        sl.sl_number AS slNumber,
                                        u.username AS se_username,
                                        a.account_name AS account_name
                                FROM workflow_stages ws
                                INNER JOIN (
                                        SELECT wo_id, MAX(created_at) AS max_created
                                        FROM workflow_stages
                                        WHERE assigned_to = $1
                                        GROUP BY wo_id
                                ) latest ON ws.wo_id = latest.wo_id AND ws.created_at = latest.max_created
                                INNER JOIN sales_leads sl ON ws.wo_id = sl.id
                                LEFT JOIN users u ON sl.se_id = u.id
                                LEFT JOIN accounts a ON sl.account_id = a.id
                                WHERE ws.status = 'Pending' AND ws.stage_name = $2
                        `;
    } else if (stage.includes("workorder") || stage.includes("wo")) {
      // For workorders: join users for username/department, include woNumber
      query = `
                                SELECT ws.*, wo.*, wo.wo_number AS woNumber, u.username AS assigned_to_username, a.account_name AS account_name
                                FROM workflow_stages ws
                                INNER JOIN (
                                        SELECT wo_id, MAX(created_at) AS max_created
                                        FROM workflow_stages
                                        WHERE assigned_to = $1
                                        GROUP BY wo_id
                                ) latest ON ws.wo_id = latest.wo_id AND ws.created_at = latest.max_created
                                INNER JOIN workorders wo ON ws.wo_id = wo.id
                                LEFT JOIN accounts a ON wo.account_id = a.id
                                LEFT JOIN users u ON wo.assignee = u.id
                                WHERE ws.status = 'Pending' AND ws.stage_name = $2 AND wo.assignee = $1
                        `;
    } else {
      // For other tables: join sales_leads for sl_number, join users for username/department
      // Table name and alias
      console.log(
        "Stage does not match sales lead or work order, using generic query for stage:",
        stageName,
      );
      if (stage.includes("technical reco") || stage.includes("tr")) {
        console.log("Using technical_recommendations join");
        query = `
                                        SELECT tr.*, sl.sl_number, a.account_name AS account_name
                                        FROM workflow_stages ws
                                        INNER JOIN (
                                                SELECT wo_id, MAX(created_at) AS max_created
                                                FROM workflow_stages
                                                WHERE assigned_to = $1
                                                GROUP BY wo_id
                                        ) latest ON ws.wo_id = latest.wo_id AND ws.created_at = latest.max_created
                                        INNER JOIN technical_recommendations tr ON ws.wo_id = tr.wo_id
                                        LEFT JOIN sales_leads sl ON tr.sl_id = sl.id
                                        LEFT JOIN accounts a ON tr.account_id = a.id
                                        WHERE ws.status = 'Draft' AND ws.stage_name = $2
                                `;
      } else if (stage.includes("rfq")) {
        query = `
                                        SELECT rfq.*, sl.sl_number, a.account_name AS account_name
                                        FROM workflow_stages ws
                                        INNER JOIN (
                                                SELECT wo_id, MAX(created_at) AS max_created
                                                FROM workflow_stages
                                                WHERE assigned_to = $1
                                                GROUP BY wo_id
                                        ) latest ON ws.wo_id = latest.wo_id AND ws.created_at = latest.max_created
                                        INNER JOIN rfqs rfq ON ws.wo_id = rfq.wo_id
                                        LEFT JOIN sales_leads sl ON rfq.sl_id = sl.id
                                        LEFT JOIN accounts a ON rfq.account_id = a.id
                                        WHERE ws.status = 'Draft' AND ws.stage_name = $2
                                `;
      } else if (stage.includes("quotation") || stage.includes("quote")) {
        query = `
                                        SELECT ws.*, qt.*, a.account_name AS account_name
                                        FROM workflow_stages ws
                                        INNER JOIN (
                                                SELECT wo_id, MAX(created_at) AS max_created
                                                FROM workflow_stages
                                                WHERE assigned_to = $1
                                                GROUP BY wo_id
                                        ) latest ON ws.wo_id = latest.wo_id AND ws.created_at = latest.max_created
                                        INNER JOIN quotations qt ON ws.wo_id = qt.wo_id
                                        LEFT JOIN accounts a ON qt.account_id = a.id
                                        WHERE ws.status = 'Draft' AND ws.stage_name = $2
                                `;
      } else {
        query = `
                                        SELECT ws.*, wo.*, a.account_name AS account_name
                                        FROM workflow_stages ws
                                        INNER JOIN (
                                                SELECT wo_id, MAX(created_at) AS max_created
                                                FROM workflow_stages
                                                WHERE assigned_to = $1
                                                GROUP BY wo_id
                                        ) latest ON ws.wo_id = latest.wo_id AND ws.created_at = latest.max_created
                                        INNER JOIN workorders wo ON ws.wo_id = wo.id
                                        LEFT JOIN accounts a ON wo.account_id = a.id
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
