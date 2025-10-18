// routes/workordersRoutes.js
import express from "express";
import db from "../db.js";
import { toSnake } from "../helper/utils.js";

const router = express.Router();

// Get all workorders
router.get("/", async (req, res) => {
    try {
        const workordersResult = await db.query(`
            SELECT 
                w.*, 
                u.username AS assignee_username,
                a.account_name,
                ad.department_name AS account_department,
                ai.industry_name AS account_industry,
                apb.product_brand_name AS account_product_brand
            FROM workorders w
            LEFT JOIN users u ON w.assignee = u.id
            LEFT JOIN accounts a ON w.account_id = a.id
            LEFT JOIN account_departments ad ON a.department_id = ad.id
            LEFT JOIN account_industries ai ON a.industry_id = ai.id
            LEFT JOIN account_product_brands apb ON a.product_id = apb.id
            ORDER BY w.id ASC
        `);
        
        const workorders = workordersResult.rows;
        
        // For each workorder, get the latest stage
        for (const w of workorders) {
            const wsRes = await db.query(
                `
                SELECT stage_name
                FROM workflow_stages
                WHERE wo_id = $1
                ORDER BY created_at DESC
                LIMIT 1
                `,
                [w.id]
            );
            
            // Append stage_name (null if no workflow_stages)
            w.stageName = wsRes.rows[0]?.stageName || null;
        }
        
        return res.json(workorders);
    } catch (err) {
        console.error(err);
        return res.status(500).json({ error: "Failed to fetch workorders" });
    }
});

router.get("/assigned", async (req, res) => {
    try {
        const username = req.user.username;
        const result = await db.query(
            `
            SELECT 
                w.*, 
                u.username AS assignee_username,
                a.account_name,
                ad.department_name AS department,
                ai.industry_name AS industry,
                apb.product_brand_name AS product_brand
            FROM workorders w
            LEFT JOIN users u ON w.assignee = u.id
            LEFT JOIN accounts a ON w.account_id = a.id
            LEFT JOIN account_departments ad ON a.department_id = ad.id
            LEFT JOIN account_industries ai ON a.industry_id = ai.id
            LEFT JOIN account_product_brands apb ON a.product_id = apb.id
            WHERE user.username = $1
            ORDER BY w.id ASC`,
            [username]
        );
        return res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Failed to fetch assigned workorders" });
    }
});

router.get("/assigned/new", async (req, res) => {
    try {
        const username = req.user.username;
        const result = await db.query(
            `SELECT 
                w.*, 
                u.username AS assignee_username,
                u.department_id AS assignee_department_id,
                d.department_name AS assignee_department_name
            FROM workorders w
            LEFT JOIN users u ON w.assignee = u.id
            LEFT JOIN departments d ON u.department_id = d.id
            WHERE u.username = $1
                AND NOT EXISTS (
                SELECT 1 FROM workflow_stages ws
                WHERE ws.wo_id = w.id AND ws.stage_name = 'Sales Lead'
                )
            ORDER BY w.id ASC`,
            [username]
        );
        return res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Failed to fetch assigned workorders" });
    }
});

// Get single workorder
router.get("/:id", async (req, res) => {
    try {
        const { id } = req.params;
        const result = await db.query(
            `
            SELECT 
                w.*, 
                u.username AS assignee_username,
                a.account_name AS account_name,
                ad.department_name AS department,
                ai.industry_name AS industry,
                apb.product_brand_name AS product_brand
            FROM workorders w
            LEFT JOIN users u ON w.assignee = u.id
            LEFT JOIN accounts a ON w.account_id = a.id
            LEFT JOIN account_departments ad ON a.department_id = ad.id
            LEFT JOIN account_industries ai ON a.industry_id = ai.id
            LEFT JOIN account_product_brands apb ON a.product_id = apb.id
            WHERE w.id = $1`,
            [id]
        );
        if (result.rows.length === 0) return res.status(404).json({ error: "Not found" });
        return res.json(result.rows[0]);
    } catch (err) {
        console.error(err);
        return res.status(500).json({ error: "Failed to fetch user" });
    }
});

// Create new workorder
router.post("/", async (req, res) => {
    try {
        const body = toSnake(req.body); // ✅ convert camelCase → snake_case
        let {
            work_description,
            assignee,
            account_id,
            is_new_account,
            mode,
            contact_person,
            contact_number,
            wo_date,
            due_date,
            from_time,
            to_time,
            actual_date,
            actual_from_time,
            actual_to_time,
            objective,
            instruction,
            target_output,
            is_fsl,
            is_esl,
            created_by,
            account_name,
            department_id,
            industry_id,
            product_brand_id,
        } = body;

        // Coalesce null/undefined text fields to empty string to avoid inserting nulls
        work_description = work_description ?? "";
        contact_person = contact_person ?? "";
        contact_number = contact_number ?? "";
        objective = objective ?? "";
        instruction = instruction ?? "";
        target_output = target_output ?? "";
        mode = mode ?? "";
        account_name = account_name ?? "";
        created_by = created_by ?? null;

        let finalAccountId = account_id;
        if (is_new_account) {
            // Use default id = 1 for missing department/industry/product
            const resolvedDepartmentId = department_id ?? 1;
            const resolvedIndustryId = industry_id ?? 1;
            const resolvedProductId = product_brand_id ?? 1;

            const draftAccount = await db.query(
                `INSERT INTO accounts 
                    (account_name, department_id, industry_id, product_id, stage_status, created_at, updated_at, is_naef, requested_by, contact_number)
                VALUES ($1, $2, $3, $4, 'Draft', NOW(), NOW(), TRUE, $5, $6)
                RETURNING id`,
                [account_name, resolvedDepartmentId, resolvedIndustryId, resolvedProductId, contact_person, contact_number]
            );
            finalAccountId = draftAccount.rows[0].id;
        }

        // 1️⃣ Figure out the current year
        const currentYear = new Date().getFullYear();

        // 2️⃣ Find the latest counter for this year
        const result = await db.query(
            `SELECT wo_number 
            FROM workorders 
            WHERE wo_number LIKE $1
            ORDER BY wo_number DESC
            LIMIT 1`,
            [`WO-${currentYear}-%`]
        );

        let newCounter = 1;
        if (result.rows.length > 0) {
            const lastWoNumber = result.rows[0].woNumber; // e.g. "WO-2025-0042"
            const lastCounter = parseInt(lastWoNumber.split("-")[2], 10);
            newCounter = lastCounter + 1;
        }

        // 3️⃣ Generate new WO number
        const woNumber = `WO-${currentYear}-${String(newCounter).padStart(4, "0")}`;

        // 4️⃣ Insert into DB
        const insertResult = await db.query(
            `INSERT INTO workorders 
                (wo_number, work_description, assignee, account_id, is_new_account, mode, contact_person, contact_number, wo_date, due_date, from_time, to_time, actual_date, actual_from_time, actual_to_time, objective, instruction, target_output, is_fsl, is_esl, created_at, created_by, updated_at)
            VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,NOW(),$21,NOW())
            RETURNING id`,
            [
                woNumber,
                work_description,
                assignee,
                finalAccountId, // 👈 draft or existing account
                is_new_account,
                mode,
                contact_person,
                contact_number,
                wo_date,
                due_date,
                from_time,
                to_time,
                actual_date,
                actual_from_time,
                actual_to_time,
                objective,
                instruction,
                target_output,
                is_fsl,
                is_esl,
                created_by,
            ]
        );

        const newId = insertResult.rows[0].id;

        const updateAccountQuery = `UPDATE accounts SET wo_source_id=$1 WHERE id = $2`;
        await db.query(updateAccountQuery, [insertResult.rows[0].id, finalAccountId]);

        // 5️⃣ Return new row with assignee details
        const final = await db.query(
            `SELECT w.*, u.username AS assignee_username, u.department_id AS assignee_department_id, d.department_name AS assignee_department_name
            FROM workorders w
            LEFT JOIN users u ON w.assignee = u.id
            LEFT JOIN departments d ON u.department_id = d.id
            WHERE w.id = $1`,
            [newId]
        );

        return res.status(201).json(final.rows[0]);
    } catch (err) {
        console.error(err);
        return res.status(500).json({ error: "Failed to create workorder" });
    }
});

// Update existing workorder
router.put("/:id", async (req, res) => {
    try {
        const { id } = req.params;
        const body = toSnake(req.body);
        let {
            wo_number,
            work_description,
            assignee,
            account_id,
            is_new_account,
            mode,
            contact_person,
            contact_number,
            wo_date,
            due_date,
            from_time,
            to_time,
            actual_date,
            actual_from_time,
            actual_to_time,
            objective,
            instruction,
            target_output,
            is_fsl,
            is_esl,
        } = body;

        // Coalesce null/undefined text fields to empty string on update as well
        work_description = work_description ?? "";
        contact_person = contact_person ?? "";
        contact_number = contact_number ?? "";
        objective = objective ?? "";
        instruction = instruction ?? "";
        target_output = target_output ?? "";
        mode = mode ?? "";

        console.log("Updating workorder", { id, ...body });

        const updateResult = await db.query(
            `UPDATE workorders 
            SET 
                wo_number=$1, work_description=$2, assignee=$3, account_id=$4, is_new_account=$5,
                mode=$6, contact_person=$7, contact_number=$8, wo_date=$9, due_date=$10,
                from_time=$11, to_time=$12, actual_date=$13, actual_from_time=$14, actual_to_time=$15, objective=$16,
                instruction=$17, target_output=$18, is_fsl=$19, is_esl=$20, updated_at=NOW()
            WHERE id=$21
            RETURNING id`,
            [
                wo_number,
                work_description,
                assignee,
                account_id,
                is_new_account,
                mode,
                contact_person,
                contact_number,
                wo_date,
                due_date,
                from_time,
                to_time,
                actual_date,
                actual_from_time,
                actual_to_time,
                objective,
                instruction,
                target_output,
                is_fsl,
                is_esl,
                id,
            ]
        );

        if (!updateResult || !updateResult.rows || updateResult.rows.length === 0) {
            return res.status(404).json({ error: "Not found" });
        }

        const updatedId = updateResult.rows[0].id;

        const result = await db.query(
            `SELECT 
                w.*, 
                u.username AS assignee_username,
                a.account_name AS account_name,
                ad.department_name AS department,
                ai.industry_name AS industry,
                apb.product_brand_name AS product_brand
            FROM workorders w
            LEFT JOIN users u ON w.assignee = u.id
            LEFT JOIN accounts a ON w.account_id = a.id
            LEFT JOIN account_departments ad ON a.department_id = ad.id
            LEFT JOIN account_industries ai ON a.industry_id = ai.id
            LEFT JOIN account_product_brands apb ON a.product_id = apb.id
            WHERE w.id = $1`,
            [updatedId]
        );

        if (result.rows.length === 0) return res.status(404).json({ error: "Not found" });
        return res.json(result.rows[0]);
    } catch (err) {
        console.error(err);
        return res.status(500).json({ error: "Failed to update workorder" });
    }
});

// Get workorder status summary
router.get("/summary/status", async (req, res) => {
    try {
        const result = await db.query(`
        SELECT
            COUNT(*) AS total,
            SUM(CASE WHEN status = 'Pending' THEN 1 ELSE 0 END) AS pending,
            SUM(CASE WHEN status = 'In Progress' THEN 1 ELSE 0 END) AS in_progress,
            SUM(CASE WHEN status = 'Completed' THEN 1 ELSE 0 END) AS completed
        FROM workorders;
    `);

        return res.json(result.rows[0]);
    } catch (err) {
        console.error(err);
        return res.status(500).json({ error: "Failed to fetch status summary" });
    }
});

export default router;
