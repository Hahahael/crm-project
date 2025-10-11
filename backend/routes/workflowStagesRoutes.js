// routes/workflowStagesRoutes.js
import express from "express";
import { crmPoolPromise, sql } from "../mssql.js";
import { toSnake } from "../helper/utils.js";

const router = express.Router();

// Get all workflows whose latest stage is 'Submitted', joined with module details
router.get("/latest-submitted", async (req, res) => {
    try {
        // Get latest stage for each workflow (by wo_id), where stageName is 'Submitted'
        // Join with workorders, sales_leads, rfqs, etc. as needed
        // Get the latest workflow stage for each workorder
        const unionQuery = `
        SELECT ws.id AS workflow_stage_id, ws.created_at AS submitted_date, ws.stage_name, ws.status, ws.wo_id, ws.assigned_to, ws.remarks, u.username AS submitted_by, 'sales_lead' AS module, sl.sl_number AS transaction_number, sl.id AS module_id, sl.account_id AS account_id, a.account_name AS account_name
            FROM workflow_stages ws
            INNER JOIN (
                SELECT wo_id, MAX(created_at) AS max_created
                FROM workflow_stages
                GROUP BY wo_id
            ) latest ON ws.wo_id = latest.wo_id AND ws.created_at = latest.max_created
            LEFT JOIN sales_leads sl ON ws.wo_id = sl.wo_id
            LEFT JOIN users u ON ws.assigned_to = u.id
            LEFT JOIN accounts a ON sl.account_id = a.id
            WHERE ws.status = 'Submitted' AND ws.stage_name = 'Sales Lead'

            UNION ALL

        SELECT ws.id AS workflow_stage_id, ws.created_at AS submitted_date, ws.stage_name, ws.status, ws.wo_id, ws.assigned_to, ws.remarks, u.username AS submitted_by, 'rfq' AS module, r.rfq_number AS transaction_number, r.id AS module_id, r.account_id AS account_id, a.account_name AS account_name
            FROM workflow_stages ws
            INNER JOIN (
                SELECT wo_id, MAX(created_at) AS max_created
                FROM workflow_stages
                GROUP BY wo_id
            ) latest ON ws.wo_id = latest.wo_id AND ws.created_at = latest.max_created
            LEFT JOIN rfqs r ON ws.wo_id = r.wo_id
            LEFT JOIN users u ON ws.assigned_to = u.id
            LEFT JOIN accounts a ON r.account_id = a.id
            WHERE ws.status = 'Submitted' AND ws.stage_name = 'RFQ'

            UNION ALL

        SELECT ws.id AS workflow_stage_id, ws.created_at AS submitted_date, ws.stage_name, ws.status, ws.wo_id, ws.assigned_to, ws.remarks, u.username AS submitted_by, 'technical_recommendation' AS module, tr.tr_number AS transaction_number, tr.id AS module_id, tr.account_id AS account_id, a.account_name AS account_name
            FROM workflow_stages ws
            INNER JOIN (
                SELECT wo_id, MAX(created_at) AS max_created
                FROM workflow_stages
                GROUP BY wo_id
            ) latest ON ws.wo_id = latest.wo_id AND ws.created_at = latest.max_created
            LEFT JOIN technical_recommendations tr ON ws.wo_id = tr.wo_id
            LEFT JOIN users u ON ws.assigned_to = u.id
            LEFT JOIN accounts a ON tr.account_id = a.id
            WHERE ws.status = 'Submitted' AND ws.stage_name = 'Technical Recommendation'

            UNION ALL

        SELECT ws.id AS workflow_stage_id, ws.created_at AS submitted_date, ws.stage_name, ws.status, ws.wo_id, ws.assigned_to, ws.remarks, u.username AS submitted_by, 'workorder' AS module, wo.wo_number AS transaction_number, wo.id AS module_id, wo.account_id AS account_id, a.account_name AS account_name
            FROM workflow_stages ws
            INNER JOIN (
                SELECT wo_id, MAX(created_at) AS max_created
                FROM workflow_stages
                GROUP BY wo_id
            ) latest ON ws.wo_id = latest.wo_id AND ws.created_at = latest.max_created
            LEFT JOIN workorders wo ON ws.wo_id = wo.id
            LEFT JOIN users u ON ws.assigned_to = u.id
            LEFT JOIN accounts a ON wo.account_id = a.id
            WHERE ws.status = 'Submitted' AND ws.stage_name = 'Work Order'

            UNION ALL

        SELECT ws.id AS workflow_stage_id, ws.created_at AS submitted_date, ws.stage_name, ws.status, ws.wo_id, ws.assigned_to, ws.remarks, u.username AS submitted_by, 'account' AS module, a.ref_number AS transaction_number, a.id AS module_id, a.id AS account_id, a.account_name AS account_name
            FROM workflow_stages ws
            INNER JOIN (
                SELECT wo_id, MAX(created_at) AS max_created
                FROM workflow_stages
                GROUP BY wo_id
            ) latest ON ws.wo_id = latest.wo_id AND ws.created_at = latest.max_created
            LEFT JOIN workorders wo ON ws.wo_id = wo.id
            LEFT JOIN accounts a ON wo.account_id = a.id
            LEFT JOIN users u ON ws.assigned_to = u.id
            WHERE ws.status = 'Submitted' AND (ws.stage_name = 'Account' OR ws.stage_name = 'NAEF')
        `;
        const pool = await crmPoolPromise;
        const result = await pool.request().query(unionQuery);
        console.log("Latest submitted workflow stages:", result.recordset);
        return res.json(result.recordset || []);
    } catch (err) {
        console.error(err);
        return res.status(500).json({ error: "Failed to fetch latest submitted workflow stages" });
    }
});

// Get all workflow stages
router.get("/", async (req, res) => {
    try {
        const pool = await crmPoolPromise;
        const result = await pool.request().query(`SELECT ws.*, u.username AS assigned_to_username FROM crmdb.workflow_stages ws LEFT JOIN crmdb.users u ON ws.assigned_to = u.id ORDER BY ws.created_at ASC`);
        return res.json(result.recordset || []);
    } catch (err) {
        console.error(err);
        return res.status(500).json({ error: "Failed to fetch workflow stages" });
    }
});

// Get all workflow stages for a work order
router.get("/workorder/:woId", async (req, res) => {
    try {
        const { woId } = req.params;
        const pool = await crmPoolPromise;
        const result = await pool.request().input('woId', sql.Int, parseInt(woId, 10)).query(`SELECT ws.*, u.username AS assigned_to_username FROM crmdb.workflow_stages ws LEFT JOIN crmdb.users u ON ws.assigned_to = u.id WHERE ws.wo_id = @woId ORDER BY ws.created_at ASC`);
        return res.json(result.recordset || []);
    } catch (err) {
        console.error(err);
        return res.status(500).json({ error: "Failed to fetch workflow stages" });
    }
});

// Get a single workflow stage by id
router.get("/:id", async (req, res) => {
    try {
        const { id } = req.params;
        const pool = await crmPoolPromise;
        const result = await pool.request().input('id', sql.Int, parseInt(id, 10)).query(`SELECT ws.*, u.username AS assigned_to_username FROM crmdb.workflow_stages ws LEFT JOIN crmdb.users u ON ws.assigned_to = u.id WHERE ws.id = @id`);
        if (((result.recordset || []).length) === 0) return res.status(404).json({ error: "Not found" });
        return res.json(result.recordset[0]);
    } catch (err) {
        console.error(err);
        return res.status(500).json({ error: "Failed to fetch workflow stage" });
    }
});

// Create a new workflow stage
router.post("/", async (req, res) => {
    console.log(req.body);
    const pool = await crmPoolPromise;
    const transaction = pool.transaction();
    try {
        const body = toSnake(req.body);
        const { wo_id, stage_name, status, assigned_to, notified = false, remarks } = body;
        await transaction.begin();
        const tr = transaction.request();
        tr.input('wo_id', sql.Int, wo_id == null ? null : parseInt(wo_id, 10));
        tr.input('stage_name', sql.NVarChar, stage_name);
        tr.input('status', sql.NVarChar, status);
        tr.input('assigned_to', sql.Int, assigned_to == null ? null : parseInt(assigned_to, 10));
        tr.input('notified', sql.Bit, notified ? 1 : 0);
        tr.input('remarks', sql.NVarChar, remarks || null);
        const result = await tr.query('INSERT INTO crmdb.workflow_stages (wo_id, stage_name, status, assigned_to, notified, remarks, created_at, updated_at) OUTPUT INSERTED.* VALUES (@wo_id, @stage_name, @status, @assigned_to, @notified, @remarks, SYSUTCDATETIME(), SYSUTCDATETIME())');
        const insertedStage = (result.recordset || [])[0];

        // Update stage_status in the relevant module only
        const updateReq = transaction.request();
        updateReq.input('status', sql.NVarChar, status);
        switch (stage_name) {
            case 'Sales Lead':
                updateReq.input('wo', sql.Int, wo_id == null ? null : parseInt(wo_id, 10));
                await updateReq.query('UPDATE crmdb.sales_leads SET stage_status = @status WHERE wo_id = @wo');
                break;
            case 'RFQ':
                updateReq.input('wo', sql.Int, wo_id == null ? null : parseInt(wo_id, 10));
                await updateReq.query('UPDATE crmdb.rfqs SET stage_status = @status WHERE wo_id = @wo');
                break;
            case 'Technical Recommendation':
                updateReq.input('wo', sql.Int, wo_id == null ? null : parseInt(wo_id, 10));
                await updateReq.query('UPDATE crmdb.technical_recommendations SET stage_status = @status WHERE wo_id = @wo');
                break;
            case 'Account':
            case 'NAEF':
                if (body.account_id) {
                    updateReq.input('accountId', sql.Int, parseInt(body.account_id, 10));
                    await updateReq.query('UPDATE crmdb.accounts SET stage_status = @status WHERE id = @accountId');
                }
                break;
            case 'Work Order':
                updateReq.input('wo', sql.Int, wo_id == null ? null : parseInt(wo_id, 10));
                await updateReq.query('UPDATE crmdb.workorders SET stage_status = @status WHERE id = @wo');
                break;
            default:
                break;
        }

        // Log all workflow stages after insert
        const allStages = await transaction.request().query('SELECT * FROM crmdb.workflow_stages ORDER BY created_at ASC');
        console.log('All workflow stages:', allStages.recordset);

        await transaction.commit();
        return res.status(201).json(insertedStage);
    } catch (err) {
        try {
            await transaction.rollback();
        } catch (e) {
            console.error('Rollback failed', e);
        }
        console.error(err);
        return res.status(500).json({ error: 'Failed to create workflow stage' });
    }
});

// Update a workflow stage
router.put("/:id", async (req, res) => {
    try {
        const { id } = req.params;
        const body = toSnake(req.body);
        const { status, assigned_to, notified } = body;
        const pool = await crmPoolPromise;
        const result = await pool.request().input('status', sql.NVarChar, status).input('assigned_to', sql.Int, assigned_to == null ? null : parseInt(assigned_to, 10)).input('notified', sql.Bit, typeof notified === 'boolean' ? (notified ? 1 : 0) : null).input('id', sql.Int, parseInt(id, 10)).query('UPDATE crmdb.workflow_stages SET status = COALESCE(@status, status), assigned_to = COALESCE(@assigned_to, assigned_to), notified = COALESCE(@notified, notified), updated_at = SYSUTCDATETIME() OUTPUT INSERTED.* WHERE id = @id');
        if (((result.recordset || []).length) === 0) return res.status(404).json({ error: "Not found" });
        return res.json(result.recordset[0]);
    } catch (err) {
        console.error(err);
        return res.status(500).json({ error: "Failed to update workflow stage" });
    }
});

// Delete a workflow stage
router.delete("/:id", async (req, res) => {
    try {
        const { id } = req.params;
        const pool = await crmPoolPromise;
        const result = await pool.request().input('id', sql.Int, parseInt(id, 10)).query('DELETE FROM crmdb.workflow_stages WHERE id = @id');
        // mssql returns rowsAffected; we'll assume success if rowsAffected > 0
        if (!result.rowsAffected || result.rowsAffected[0] === 0) return res.status(404).json({ error: "Not found" });
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
                SELECT ws.*, sl.*, sl.sl_number AS slNumber, u.username AS se_username, u.department AS se_department, a.account_name AS account_name
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
            if (stage.includes("technical reco") || stage.includes("tr")) {
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

        const pool = await crmPoolPromise;
        const result = await pool.request().input('userId', sql.Int, parseInt(id, 10)).input('stageName', sql.NVarChar, stageName).query(query);
        console.log("Latest assigned workflow stages result:", result.recordset);
        return res.json(result.recordset || []);
    } catch (err) {
        console.error(err);
        return res.status(500).json({ error: "Failed to fetch workflow stage" });
    }
});

export default router;
