import express from "express";
import { crmPoolPromise, sql } from "../mssql.js";
import { toSnake } from "../helper/utils.js";

const router = express.Router();

// Get all sales leads
router.get("/", async (req, res) => {
    try {
        const pool = await crmPoolPromise;
        const result = await pool.request().query(`SELECT sl.*, u.username AS se_username, u.department_id AS se_department_id, d.department_name AS se_department_name, a.account_name AS account_name, ai.industry_name AS industry_name, apb.product_brand_name AS product_brand_name, ad.department_name AS account_department_name FROM crmdb.sales_leads sl LEFT JOIN crmdb.users u ON sl.se_id = u.id LEFT JOIN crmdb.departments d ON u.department_id = d.id LEFT JOIN crmdb.accounts a ON sl.account_id = a.id LEFT JOIN crmdb.account_industries ai ON a.industry_id = ai.id LEFT JOIN crmdb.account_product_brands apb ON a.product_id = apb.id LEFT JOIN crmdb.account_departments ad ON a.department_id = ad.id ORDER BY sl.id ASC`);
        return res.json(result.recordset || []);
    } catch (err) {
        console.error(err);
        return res.status(500).json({ error: "Failed to fetch sales leads" });
    }
});

// Get single sales lead
router.get("/:id", async (req, res) => {
    try {
        const { id } = req.params;
        const pool = await crmPoolPromise;
        const result = await pool.request().input('id', sql.Int, parseInt(id, 10)).query(`SELECT sl.*, u.username AS se_username, u.department_id AS se_department_id, d.department_name AS se_department_name, a.account_name AS account_name, ai.industry_name AS industry_name, apb.product_brand_name AS product_brand_name, ad.department_name AS account_department_name FROM crmdb.sales_leads sl LEFT JOIN crmdb.users u ON sl.se_id = u.id LEFT JOIN crmdb.departments d ON u.department_id = d.id LEFT JOIN crmdb.accounts a ON sl.account_id = a.id LEFT JOIN crmdb.account_industries ai ON a.industry_id = ai.id LEFT JOIN crmdb.account_product_brands apb ON a.product_id = apb.id LEFT JOIN crmdb.account_departments ad ON a.department_id = ad.id WHERE sl.id = @id`);
        if (((result.recordset || []).length) === 0) return res.status(404).json({ error: 'Not found' });
        return res.json(result.recordset[0]);
    } catch (err) {
        console.error(err);
        return res.status(500).json({ error: "Failed to fetch sales lead" });
    }
});

// Check if a sales lead exists for a given workorder
router.get("/exists/workorder/:woId", async (req, res) => {
    try {
        const { woId } = req.params;
        const pool = await crmPoolPromise;
        const result = await pool.request().input('wo', sql.Int, parseInt(woId, 10)).query('SELECT TOP (1) id FROM crmdb.sales_leads WHERE wo_id = @wo');
        return res.json({ exists: ((result.recordset || []).length) > 0 });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ error: "Failed to check sales lead existence" });
    }
});

// Create new sales lead
router.post("/", async (req, res) => {
    try {
        const body = toSnake(req.body);
        console.log("Creating skeletal sales lead with data:", body);
        const wo_id = body.wo_id;
        const assignee = body.assignee;
        const account_id = body.account_id;
        const sales_stage = body.sales_stage || "Draft";
        const contact_person = body.contact_person || null;
        const contact_number = body.contact_number || null;

        const currentYear = new Date().getFullYear();
        const pool = await crmPoolPromise;
        const result = await pool.request().input('like', sql.NVarChar, `FSL-${currentYear}-%`).query("SELECT TOP (1) sl_number FROM crmdb.sales_leads WHERE sl_number LIKE @like ORDER BY sl_number DESC");

        let newCounter = 1;
        const lastRow = (result.recordset || [])[0];
        if (lastRow) {
            const lastSlNumber = lastRow.sl_number || lastRow.slNumber || '';
            const lastCounter = parseInt((lastSlNumber.split("-")[2] || '0'), 10) || 0;
            newCounter = lastCounter + 1;
        }

        const sl_number = `FSL-${currentYear}-${String(newCounter).padStart(4, "0")}`;

        const insert = await pool.request().input('sl_number', sql.NVarChar, sl_number).input('sales_stage', sql.NVarChar, sales_stage).input('wo_id', sql.Int, wo_id == null ? null : parseInt(wo_id, 10)).input('assignee', sql.Int, assignee == null ? null : parseInt(assignee, 10)).input('account_id', sql.Int, account_id == null ? null : parseInt(account_id, 10)).input('immediate_support', sql.NVarChar, contact_person).input('contact_number', sql.NVarChar, contact_number).query('INSERT INTO crmdb.sales_leads (sl_number, sales_stage, wo_id, assignee, created_at, updated_at, account_id, immediate_support, contact_number) OUTPUT INSERTED.id VALUES (@sl_number, @sales_stage, @wo_id, @assignee, SYSUTCDATETIME(), SYSUTCDATETIME(), @account_id, @immediate_support, @contact_number)');
        const newId = (insert.recordset || [])[0].id;

        const final = await pool.request().input('id', sql.Int, newId).query('SELECT sl.*, u.username AS se_username FROM crmdb.sales_leads sl LEFT JOIN crmdb.users u ON sl.se_id = u.id WHERE sl.id = @id');
        return res.status(201).json(final.recordset[0]);
    } catch (err) {
        console.error(err);
        return res.status(500).json({ error: "Failed to create sales lead" });
    }
});

// Update existing sales lead
router.put("/:id", async (req, res) => {
    try {
        const { id } = req.params;
        const body = toSnake(req.body);
        const pool = await crmPoolPromise;
        // Build a parameterized update; for brevity set a few fields and leave the rest as an exercise
        const reqq = pool.request();
        reqq.input('sales_stage', sql.NVarChar, body.sales_stage || null);
        reqq.input('id', sql.Int, parseInt(id, 10));
        const updateResult = await reqq.query('UPDATE crmdb.sales_leads SET sales_stage = COALESCE(@sales_stage, sales_stage), updated_at = SYSUTCDATETIME() OUTPUT INSERTED.id WHERE id = @id');
        const updatedId = (updateResult.recordset || [])[0].id;
        const result = await pool.request().input('id', sql.Int, updatedId).query('SELECT sl.*, u.username AS se_username FROM crmdb.sales_leads sl LEFT JOIN crmdb.users u ON sl.se_id = u.id WHERE sl.id = @id');
        if (((result.recordset || []).length) === 0) return res.status(404).json({ error: 'Not found' });
        return res.json(result.recordset[0]);
    } catch (err) {
        console.error(err);
        return res.status(500).json({ error: "Failed to update sales lead" });
    }
});

export default router;
