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
          NULL AS priority,
          NULL AS title,
          NULL AS amount
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
          NULL AS priority,
          NULL AS title,
          r.grand_total AS amount
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
          tr.priority AS priority,
          tr.title AS title,
          NULL AS amount
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
          NULL AS priority,
          NULL AS title,
          NULL AS amount
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
    let { rows } = await db.query(unionQuery);
    console.log("Base latest submitted workflow stages:", rows);

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
        a.naef_number AS transaction_number,
        a.kristem_account_id AS module_id,
        wo.account_id AS account_id,
        NULL AS urgency,
        NULL AS priority,
        NULL AS title,
        NULL AS amount
      FROM latest_acc la
      LEFT JOIN users u ON la.assigned_to = u.id
      LEFT JOIN workorders wo ON la.wo_id = wo.id
      LEFT JOIN accounts a ON wo.account_id = a.kristem_account_id
    `;
    const accStageRes = await db.query(accountLatestQuery);
    const accStageRows = accStageRes.rows || [];
    console.log("Account/NAEF latest submitted stages:", accStageRows);

    // Enrich each row with CRM + SPI account details
    try {
      const accountIds = Array.from(
        new Set(
          [...(rows || []), ...accStageRows]
            .map((r) => r.accountId ?? r.account_id)
            .filter((v) => v !== null && v !== undefined),
        ),
      );

      console.log("Unique account IDs to fetch from CRM:", accountIds);

      if (accountIds.length > 0) {
        const spiPool = await poolPromise;
        // Load CRM accounts in batch
        const numericIds = accountIds
          .map((x) => Number(x))
          .filter((n) => Number.isFinite(n));
        let accountMap = new Map();
        if (numericIds.length > 0) {
          const accSql = `SELECT * FROM spidb.customer WHERE id IN (${numericIds.join(",")})`;
          const accRes = await spiPool.request().query(accSql);
          const spidbAccounts = accRes.recordset || [];
          console.log("Fetched CRM accounts for enrichment:", spidbAccounts.length);
          accountMap = new Map(spidbAccounts.map((a) => [Number(a.Id), a]));

          console.log("Fetched CRM accounts for enrichment:", spidbAccounts.length);

          console.log("Account Map keys:", accStageRows);
          console.log ("Account Map size:", accountMap);

          // Build Account/NAEF rows from CRM and attach same account object
          const accRowsBuilt = accStageRows.map((r) => {
            const aid = r.accountId ?? r.account_id;
            let account = null;
            if (aid != null && accountMap.has(Number(aid))) {
              const acc = accountMap.get(Number(aid));
              account = {
                ...acc
              };
            }
            return {
              ...r,
              module: "account",
              account,
            };
          });

          // Build Account/NAEF rows from CRM and attach same account object
          const otherRowsBuilt = rows.map((r) => {
            const aid = r.accountId ?? r.account_id;
            let account = null;
            if (aid != null && accountMap.has(Number(aid))) {
              const acc = accountMap.get(Number(aid));
              account = {
                ...acc
              };
            }
            return {
              ...r,
              account,
            };
          });

          // Merge base rows with account/naef rows
          otherRowsBuilt.push(...accRowsBuilt);
          // Re-sort by submitted_date DESC after merging
          otherRowsBuilt.sort((a, b) => {
            const da = new Date(a.submitted_date || a.submittedDate || 0).getTime();
            const db = new Date(b.submitted_date || b.submittedDate || 0).getTime();
            return db - da;
          });

          rows = otherRowsBuilt
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
  console.log("🔍 WORKFLOW STAGE CREATE REQUEST:", req.body);
  try {
    const body = toSnake(req.body);
    console.log("🔍 WORKFLOW: Creating workflow stage with data:", body);
    const {
      wo_id,
      stage_name,
      status,
      assigned_to,
      notified = false,
      remarks, // <-- add remarks from body
    } = body;

    // Idempotency: if the latest stage for the same wo_id + stage_name already has the same status, return it
    try {
      const existing = await db.query(
        `SELECT * FROM workflow_stages WHERE wo_id = $1 AND stage_name = $2 ORDER BY created_at DESC LIMIT 1`,
        [wo_id, stage_name],
      );
      const latest = existing.rows?.[0];
      if (latest && String(latest.status) === String(status)) {
        console.log("Idempotent workflow stage hit; returning existing stage", latest.id);
        return res.status(200).json(latest);
      }
    } catch (checkErr) {
      console.warn("Idempotency precheck failed; proceeding with insert:", checkErr.message);
    }
  // Start transaction
    await db.query("BEGIN");
    let insertedStage;
    try {
      const result = await db.query(
        `
          INSERT INTO workflow_stages
            (wo_id, stage_name, status, assigned_to, notified, remarks, created_at, updated_at)
          VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
          RETURNING *
        `,
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
          console.log("🔍 WORKFLOW: Updating Account/NAEF stage status for wo_id:", wo_id, "to status:", status, "and account_id:", body.account_id);
          if (body.account_id) {
            const updateQuery = status === "Approved"
              ? "UPDATE accounts SET stage_status = $1, done_date = NOW() WHERE kristem_account_id = $2"
              : "UPDATE accounts SET stage_status = $1 WHERE kristem_account_id = $2";
            
            await db.query(updateQuery, [status, body.account_id]);
            
            // If approved, sync to MSSQL (ONLY for manually approved accounts)
            if (status === "Approved") {
              console.log("🔍 WORKFLOW: Account approval detected for account ID:", body.account_id);
              try {
                const accountResult = await db.query("SELECT * FROM accounts WHERE kristem_account_id = $1", [wo_id]);
                if (accountResult.rows.length > 0) {
                  const account = accountResult.rows[0];
                  console.log("🔍 WORKFLOW: Account details:", { 
                    id: account.id, 
                    stage_status: account.stageStatus,
                    kristem_account_id: account.kristemAccountId,
                    account_name: account.accountName 
                  });
                  
                  if (account.kristemAccountId) {
                    console.log("🚀 WORKFLOW: Updating existing MSSQL customer with final data...");
                    // UPDATE existing MSSQL customer with final approved data
                    const spiPool = await poolPromise;
                    await spiPool.request()
                      .input('id', Number(account.kristemAccountId))
                      .input('code', account.naefNumber || account.kristemAccountId)
                      .input('name', account.accountName || 'Unknown')
                      .input('address', account.address || '')
                      .input('phone', account.contactNumber || '')
                      .input('email', account.emailAddress || '')
                      .input('industryId', account.industryId || null)
                      .input('locationId', account.customerLocationId || '')
                      .input('chargeTo', account.chargeTo || '')
                      .input('tinNo', account.tinNo || '')
                      .input('segmentId', account.customerMarketSegmentGroupId || null)
                      .input('category', account.category || '')
                      .query(`
                        UPDATE spidb.customer SET
                          Code = @code,
                          Name = @name,
                          Address = @address,
                          PhoneNumber = @phone,
                          EmailAddress = @email,
                          Customer_Industry_Group_Id = @industryId,
                          Customer_Location_Id = @locationId,
                          ChargeTo = @chargeTo,
                          TinNo = @tinNo,
                          Customer_Market_Segment_Group_Id = @segmentId,
                          Category = @category
                        WHERE Id = @id
                      `);
                    
                    console.log("✅ Updated MSSQL customer ID:", account.kristemAccountId, "with final approved data");
                  } else {
                    console.warn("⚠️ WORKFLOW: Account has no kristem_account_id - this shouldn't happen in dual creation mode");
                  }
                }
              } catch (syncErr) {
                console.warn("Failed to sync approved account to MSSQL:", syncErr.message);
              }
            }
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
        console.log("Using rfqs join");
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
          SELECT ws.*, wo.*, a.*
          FROM workflow_stages ws
          INNER JOIN (
            SELECT wo_id, MAX(created_at) AS max_created
            FROM workflow_stages
            WHERE assigned_to = $1
            GROUP BY wo_id
          ) latest ON ws.wo_id = latest.wo_id AND ws.created_at = latest.max_created
          INNER JOIN workorders wo ON ws.wo_id = wo.id
          LEFT JOIN accounts a ON wo.account_id = a.id
          WHERE ws.status = 'Draft' AND ws.stage_name = $2
        `;
      }
    }

    console.log("Executing assigned latest workflow stages query:", query);
    console.log("With parameters:", [id, stageName]);
    const result = await db.query(query, [id, stageName]);
    console.log("Latest assigned workflow stages result:", result.rows);
    
    try {
      for (const row of result.rows) {
        const base = row;
        const spiPool = await poolPromise;
        const accId = Number(base.accountId ?? base.account_id ?? base.kristemAccountId);
        console.log("🔍 Single TR - Account ID:", accId, "from base:", base.accountId, base.account_id);
        let customer = null;
        if (Number.isFinite(accId)) {
          console.log("🔍 Fetching single customer for ID:", accId);
          const custRes = await spiPool
            .request()
            .input("id", accId)
            .query("SELECT TOP (1) * FROM spidb.customer WHERE Id = @id");
          customer = custRes.recordset && custRes.recordset[0] ? custRes.recordset[0] : null;
        }

        if (customer) {
          const account = {
            kristem: customer
          };

          row.account = account;
          console.log("Fetched row:", row);
        }
      }
    } catch (enrichErr) {
      console.warn(
        "Failed to enrich account data:",
        enrichErr.message,
      );
    }

    return res.json(result.rows);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Failed to fetch workflow stage" });
  }
});

// Summary: latest stage per workorder
// GET /api/workflow-stages/summary/latest
// Optional query parameters:
//  - wo_ids: comma-separated list of workorder ids to restrict (e.g. wo_ids=1,2,3)
//  - status: filter by stage status (e.g. status=Submitted)
router.get("/summary/latest", async (req, res) => {
  try {
    // Extract filter parameters
    const { status, assignee, startDate, endDate } = req.query;
    
    // Build WHERE conditions for filtering
    let whereConditions = [];
    let queryParams = [];
    let paramIndex = 1;
    
    // Only add status filter if it's a non-empty string and NOT a work order status
    if (status && status.trim() !== '' && status !== 'Pending' && status !== 'Completed') {
      whereConditions.push(`ws.status = $${paramIndex}`);
      queryParams.push(status.trim());
      paramIndex++;
    }
    
    // Only add assignee filter if it's a non-empty string
    if (assignee && assignee.trim() !== '') {
      whereConditions.push(`u.username = $${paramIndex}`);
      queryParams.push(assignee.trim());
      paramIndex++;
    }
    
    if (startDate && startDate.trim() !== '') {
      whereConditions.push(`ws.created_at >= $${paramIndex}::timestamp`);
      queryParams.push(startDate.trim());
      paramIndex++;
    }
    
    if (endDate && endDate.trim() !== '') {
      whereConditions.push(`ws.created_at <= $${paramIndex}::timestamp`);
      queryParams.push(endDate.trim());
      paramIndex++;
    }
    
    // Build separate WHERE clauses for outer and inner queries
    const outerWhereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';
    
    // Build inner query WHERE clause using the same parameter indices as outer query
    let innerWhereConditions = [];
    let innerParamStart = 1;
    
    // Skip status parameter if it exists
    if (status && status.trim() !== '' && status !== 'Pending' && status !== 'Completed') {
      innerParamStart++;
    }
    
    if (assignee && assignee.trim() !== '') {
      innerWhereConditions.push(`u2.username = $${innerParamStart}`);
      innerParamStart++;
    }
    
    if (startDate && startDate.trim() !== '') {
      innerWhereConditions.push(`ws2.created_at >= $${innerParamStart}::timestamp`);
      innerParamStart++;
    }
    
    if (endDate && endDate.trim() !== '') {
      innerWhereConditions.push(`ws2.created_at <= $${innerParamStart}::timestamp`);
      innerParamStart++;
    }
    
    const innerWhereClause = innerWhereConditions.length > 0 ? `WHERE ${innerWhereConditions.join(' AND ')}` : '';

    // Build filtered query using CTE
    const sql = `
      SELECT
        ws.id,
        ws.wo_id,
        ws.stage_name,
        ws.status,
        ws.assigned_to,
        ws.remarks,
        ws.created_at,
        ws.updated_at,
        u.username AS assigned_to_username
      FROM workflow_stages ws
      LEFT JOIN users u ON ws.assigned_to = u.id
      INNER JOIN (
        SELECT wo_id, MAX(created_at) AS max_created
        FROM workflow_stages ws2
        ${assignee && assignee.trim() !== '' ? 'LEFT JOIN users u2 ON ws2.assigned_to = u2.id' : ''}
        ${innerWhereClause}
        GROUP BY wo_id
      ) latest
        ON ws.wo_id = latest.wo_id
        AND ws.created_at = latest.max_created
      ${outerWhereClause}
      ORDER BY ws.created_at DESC;
    `;

    console.log('Workflow stages summary/latest query:', sql, 'params:', queryParams);
    const result = await db.query(sql, queryParams);
    console.log("Fetched latest workflow stages summary:", result.rows?.length || 0, "records");
    return res.json(result.rows || []);
  } catch (err) {
    console.error("Failed to fetch summary latest workflow stages:", err);
    return res.status(500).json({ error: "Failed to fetch summary" });
  }
});

export default router;