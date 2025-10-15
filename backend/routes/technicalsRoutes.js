import express from "express";
import db from "../db.js";
import { toSnake } from "../helper/utils.js";
import { poolPromise } from "../mssql.js";

function logAttributes(label, obj) {
    try {
        if (!obj) return console.log(`${label}: <empty>`);
        if (Array.isArray(obj)) {
            const keys = new Set();
            obj.forEach((r) => {
                if (r && typeof r === "object") Object.keys(r).forEach((k) => keys.add(k));
            });
            return console.log(`${label} keys:`, Array.from(keys));
        }
        if (typeof obj === "object") return console.log(`${label} keys:`, Object.keys(obj));
        return console.log(`${label}:`, obj);
    } catch (err) {
        console.error("logAttributes error:", err);
    }
}

// Merge primary (detail) and parent objects. Primary wins; parent fields that collide are stored as <key>_secondary
function mergePrimaryWithParent(detail, parent) {
    if (!detail && !parent) return null;
    if (!parent) {
      // Only detail — suffix everything with _Detail
      return Object.fromEntries(Object.entries(detail).map(([k, v]) => [`${k}_Detail`, v]));
    }
    if (!detail) return parent;
  
    const out = { ...parent }; // start with stock (parent)
    for (const [key, value] of Object.entries(detail)) {
      out[`${key}_Detail`] = value; // always suffix detail fields
    }
    return out;
}

const router = express.Router();

// Get all technical recommendations
router.get("/", async (req, res) => {
    try {
        const result = await db.query(`
        SELECT 
            tr.*, 
            u.username AS assignee_username,
            u.department_id AS assignee_department_id,
            d.department_name AS assignee_department_name,
            sl.sl_number AS sl_number,
            a.account_name AS account_name
        FROM technical_recommendations tr
        LEFT JOIN users u ON tr.assignee = u.id
        LEFT JOIN departments d ON u.department_id = d.id
        LEFT JOIN sales_leads sl ON tr.sl_id = sl.id
        LEFT JOIN accounts a ON tr.account_id = a.id
        ORDER BY tr.id ASC
        `);
        return res.json(result.rows);
    } catch (err) {
        console.error(err);
        return res.status(500).json({ error: "Failed to fetch technical recommendations" });
    }
});

// Get single technical recommendation
router.get("/:id", async (req, res) => {
    try {
        const { id } = req.params;
        const result = await db.query(`
            SELECT 
                tr.*, 
                u.username AS assignee_username,
                u.department_id AS assignee_department_id,
                d.department_name AS assignee_department_name,
                sl.sl_number AS sl_number,
                a.account_name AS account_name
            FROM technical_recommendations tr
            LEFT JOIN users u ON tr.assignee = u.id
            LEFT JOIN departments d ON u.department_id = d.id
            LEFT JOIN sales_leads sl ON tr.sl_id = sl.id
            LEFT JOIN accounts a ON tr.account_id = a.id
            WHERE tr.id = $1
            `,
            [id]
        );
        if (result.rows.length === 0) return res.status(404).json({ error: "Not found" });

        // Fetch items assigned to this tr
        const itemsRes = await db.query(
            `SELECT
                ti.*
            FROM tr_items ti
            WHERE ti.tr_id = $1 ORDER BY ti.id ASC`,
            [id]
        );

        // Resolve MSSQL details for each tr_item and merge
        const pool = await poolPromise;
        const items = [];
        for (const ri of itemsRes.rows) {
            try {
                console.log("Resolving MSSQL item for tr_item:", ri);
                console.log("itemId:", ri.itemId);
                const sdRes = await pool.request().input("id", ri.itemId)
                    .query("SELECT * FROM spidb.stock_details WHERE Stock_Id = @id");
                const sRes = await pool.request().input("id", ri.itemId)
                    .query("SELECT * FROM spidb.stock WHERE Id = @id");
                logAttributes(`tr item stock_details (id=${ri.itemId})`, sdRes.recordset || []);
                logAttributes(`tr item stock (id=${ri.itemId})`, sRes.recordset || []);
                const detailObj = sdRes && sdRes.recordset && sdRes.recordset[0] ? sdRes.recordset[0] : null;
                const parentObj = sRes && sRes.recordset && sRes.recordset[0] ? sRes.recordset[0] : null;
                const merged = mergePrimaryWithParent(detailObj, parentObj);
                const combined = {
                    ...ri,
                    ...merged,
                };
                items.push(combined);
            } catch (err) {
                console.error("Error resolving MSSQL item for tr_item", ri, err);
                items.push({ id: ri.id, itemId: ri.item_id, quantity: ri.quantity });
            }
        }

        console.log("Fetched items for technical recommendation:", items);

        const response = { ...result.rows[0], items };
        console.log("Fetched technical recommendation:", response);
        return res.json(response);
    } catch (err) {
        console.error(err);
        return res.status(500).json({ error: "Failed to fetch technical recommendation" });
    }
});

// Create new technical recommendation
router.post("/", async (req, res) => {
    try {
        const body = toSnake(req.body);
        console.log("Creating technical recommendation with data:", body);
        // Only require wo_id and assignee for skeletal creation, status defaults to 'Draft'
        const wo_id = body.wo_id;
        const account_id = body.account_id;
        const assignee = body.assignee;
        const status = body.status || "Draft";
        const contact_person = body.contact_person || null;
        const contact_number = body.contact_number || null;
        const contact_email = body.contact_email || null;
        const issues = body.issues || null;
        const current = body.current || null;
        const due_date = body.due_date || null;

        // Generate TR number
        const currentYear = new Date().getFullYear();
        const result = await db.query(
            `SELECT tr_number 
            FROM technical_recommendations 
            WHERE tr_number LIKE $1
            ORDER BY tr_number DESC
            LIMIT 1`,
            [`TR-${currentYear}-%`]
        );
        let newCounter = 1;
        if (result.rows.length > 0) {
            const lastTrNumber = result.rows[0].trNumber;
            const lastCounter = parseInt(lastTrNumber.split("-")[2], 10);
            newCounter = lastCounter + 1;
        }
        const tr_number = `TR-${currentYear}-${String(newCounter).padStart(4, "0")}`;

        // Find sl_id from sales_leads using wo_id
        let sl_id = null;
        const slRes = await db.query(`SELECT id FROM sales_leads WHERE wo_id = $1 LIMIT 1`, [wo_id]);
        if (slRes.rows.length > 0) {
            sl_id = slRes.rows[0].id;
        }

        // Insert skeletal technical recommendation, all other fields default to null
        const insertResult = await db.query(
            `INSERT INTO technical_recommendations 
                (wo_id, account_id, assignee, tr_number, status,
                sl_id, contact_person, contact_number, contact_email, current_system_issues,
                current_system, created_at, created_by, updated_at, due_date)
            VALUES
                ($1, $2, $3, $4, $5,
                $6, $7, $8, $9, $10,
                $11, NOW(), $2, NOW(), $12)
            RETURNING id`,
            [
                wo_id,
                account_id,
                assignee,
                tr_number,
                status,
                sl_id,
                contact_person,
                contact_number,
                contact_email,
                issues,
                current,
                due_date
            ]
        );
        const newId = insertResult.rows[0].id;

        // Create workflow stage for new technical recommendation (Draft)
        await db.query(`
            INSERT INTO workflow_stages (wo_id, stage_name, status, assigned_to, created_at, updated_at)
            VALUES ($1, $2, $3, $4, NOW(), NOW())`,
            [
                newId,
                "Technical Recommendation",
                "Draft",
                assignee
            ]
        );

        const final = await db.query(`
            SELECT tr.*,
                u.username AS assignee_username,
                u.department_id AS assignee_department_id,
                d.department_name AS assignee_department_name
            FROM technical_recommendations tr
            LEFT JOIN users u ON tr.assignee = u.id
            LEFT JOIN departments d ON u.department_id = d.id
            WHERE tr.id = $1`,
            [newId]
        );

        return res.status(201).json(final.rows[0]);
    } catch (err) {
        console.error(err);
        return res.status(500).json({ error: "Failed to create technical recommendation" });
    }
});

// Update existing technical recommendation
router.put("/:id", async (req, res) => {
    try {
        const { id } = req.params;
        const body = toSnake(req.body);
        console.log("Updating technical recommendation id", id, "with data:", body);
        const actual_date = body.actual_date || null;
        const actual_from_time = body.actual_from_time || null;
        const actual_to_time = body.actual_to_time || null;
        // Add all fields you want to update here
        const updateResult = await db.query(`
            UPDATE technical_recommendations 
            SET 
                status=$1, priority=$2, title=$3, account_id=$4, contact_person=$5,
                contact_number=$6, contact_email=$7, current_system=$8, current_system_issues=$9, proposed_solution=$10,
                technical_justification=$11, installation_requirements=$12, training_requirements=$13,
                maintenance_requirements=$14, attachments=$15, additional_notes=$16, updated_at=NOW(), actual_date=$17,
                actual_from_time=$18, actual_to_time=$19
            WHERE id=$20
            RETURNING id`,
            [
                body.status,
                body.priority,
                body.title,
                body.account_id,
                body.contact_person,
                body.contact_number,
                body.contact_email,
                body.current_system,
                body.current_system_issues,
                body.proposed_solution,
                body.technical_justification,
                body.installation_requirements,
                body.training_requirements,
                body.maintenance_requirements,
                body.attachments,
                body.additional_notes,
                actual_date,
                actual_from_time,
                actual_to_time,
                id,
            ]
        );

        // --- Update tr_items robustly ---
        // 1. Fetch all existing items for this tr_id
        const existingItemsRes = await db.query(`SELECT id FROM tr_items WHERE tr_id = $1`, [id]);
        const existingItemIds = new Set(existingItemsRes.rows.map((row) => row.id));

        // 2. Get incoming items from request
        const incomingItems = body.items || [];
        const incomingItemIds = new Set(incomingItems.filter((it) => it.id).map((it) => it.id));
        console.log("Existing item IDs:", existingItemsRes.rows);
        console.log("Incoming item IDs:", incomingItems);

        // 3. Delete items that exist in DB but not in incoming
        for (const dbId of existingItemIds) {
            if (!incomingItemIds.has(dbId)) {
                await db.query(`DELETE FROM tr_items WHERE id = $1`, [dbId]);
            }
        }

        // 4. Upsert incoming items
        for (const item of incomingItems) {
            console.log("Upserting item:", item);
            if (item.id && existingItemIds.has(item.id)) {
                // Update existing item
                await db.query(`UPDATE tr_items SET quantity=$1 WHERE id=$2`, [item.quantity, item.id]);
            } else {
                // Insert new item
                await db.query(`
                    INSERT INTO tr_items (tr_id, item_id, quantity) VALUES ($1, $2, $3)`,
                    [id, item.id, item.quantity]
                );
            }
        }

        const updatedId = updateResult.rows[0].id;
        const result = await db.query(`
            SELECT
                tr.*,
                u.username AS assignee_username,
                u.department_id AS assignee_department_id,
                d.department_name AS assignee_department_name,
                sl.sl_number AS sl_number,
                a.account_name = account_name
            FROM technical_recommendations tr
            LEFT JOIN users u ON tr.assignee = u.id
            LEFT JOIN departments d ON u.department_id = d.id
            LEFT JOIN sales_leads sl ON tr.sl_id = sl.id
            LEFT JOIN accounts a ON tr.account_id = a.id
            WHERE tr.id = $1`,
            [updatedId]
        );
        if (result.rows.length === 0) return res.status(404).json({ error: "Not found" });

        // Fetch items assigned to this tr
        const itemsRes = await db.query(`
            SELECT
                ti.*,
                i.*
            FROM tr_items ti
            LEFT JOIN items i ON ti.item_id = i.id
            WHERE ti.tr_id = $1`,
            [updatedId]
        );
        const response = { ...result.rows[0], items: itemsRes.rows };
        return res.json(response);
    } catch (err) {
        console.error(err);
        return res.status(500).json({ error: "Failed to update technical recommendation" });
    }
});

export default router;
