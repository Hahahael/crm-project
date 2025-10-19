import express from "express";
import db from "../db.js";
import { toSnake } from "../helper/utils.js";

const router = express.Router();

// Get all sales leads
router.get("/", async (req, res) => {
  try {
    const result = await db.query(`
      SELECT 
        sl.*, 
        u.username AS se_username,
        u.department_id AS se_department_id,
        d.department_name AS se_department_name,
        a.account_name AS account_name,
        ai.industry_name AS industry_name,
        apb.product_brand_name AS product_brand_name,
        ad.department_name AS account_department_name
      FROM sales_leads sl
      LEFT JOIN users u ON sl.se_id = u.id
      LEFT JOIN departments d ON u.department_id = d.id
      LEFT JOIN accounts a ON sl.account_id = a.id
      LEFT JOIN account_industries ai ON a.industry_id = ai.id
      LEFT JOIN account_product_brands apb ON a.product_id = apb.id
      LEFT JOIN account_departments ad ON a.department_id = ad.id
      ORDER BY sl.id ASC
    `);
    return res.json(result.rows);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Failed to fetch sales leads" });
  }
});

// Get single sales lead
router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const result = await db.query(
      `
      SELECT 
        sl.*, 
        u.username AS se_username,
        u.department_id AS se_department_id,
        d.department_name AS se_department_name,
        a.account_name AS account_name,
        ai.industry_name AS industry_name,
        apb.product_brand_name AS product_brand_name,
        ad.department_name AS account_department_name
      FROM sales_leads sl
      LEFT JOIN users u ON sl.se_id = u.id
      LEFT JOIN departments d ON u.department_id = d.id
      LEFT JOIN accounts a ON sl.account_id = a.id
      LEFT JOIN account_industries ai ON a.industry_id = ai.id
      LEFT JOIN account_product_brands apb ON a.product_id = apb.id
      LEFT JOIN account_departments ad ON a.department_id = ad.id
      WHERE sl.id = $1
    `,
      [id],
    );
    if (result.rows.length === 0)
      return res.status(404).json({ error: "Not found" });
    return res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Failed to fetch sales lead" });
  }
});

// Check if a sales lead exists for a given workorder
router.get("/exists/workorder/:woId", async (req, res) => {
  try {
    const { woId } = req.params;
    const result = await db.query(
      `SELECT id FROM sales_leads WHERE wo_id = $1 LIMIT 1`,
      [woId],
    );
    return res.json({ exists: result.rows.length > 0 });
  } catch (err) {
    console.error(err);
    return res
      .status(500)
      .json({ error: "Failed to check sales lead existence" });
  }
});

// Create new sales lead
router.post("/", async (req, res) => {
  try {
    const body = toSnake(req.body);
    console.log("Creating skeletal sales lead with data:", body);
    // Only require wo_id and assignee, set sales_stage to 'Draft' by default
    const wo_id = body.wo_id;
    const assignee = body.assignee;
    const account_id = body.account_id;
    const sales_stage = body.sales_stage || "Draft";
    const contact_person = body.contact_person || null;
    const contact_number = body.contact_number || null;

    // Generate SL number
    const currentYear = new Date().getFullYear();
    const result = await db.query(
      `SELECT sl_number 
                FROM sales_leads 
                WHERE sl_number LIKE $1
                ORDER BY sl_number DESC
                LIMIT 1`,
      [`FSL-${currentYear}-%`],
    );

    let newCounter = 1;
    if (result.rows.length > 0) {
      const lastSlNumber = result.rows[0].slNumber;
      const lastCounter = parseInt(lastSlNumber.split("-")[2], 10);
      newCounter = lastCounter + 1;
    }

    const sl_number = `FSL-${currentYear}-${String(newCounter).padStart(4, "0")}`;

    // Insert skeletal sales lead, all other fields default to null
    const insertResult = await db.query(
      `INSERT INTO sales_leads 
                (sl_number, sales_stage, wo_id, assignee, created_at, updated_at, account_id, immediate_support, contact_number)
                VALUES ($1, $2, $3, $4, NOW(), NOW(), $5, $6, $7)
                RETURNING id`,
      [
        sl_number,
        sales_stage,
        wo_id,
        assignee,
        account_id,
        contact_person,
        contact_number,
      ],
    );
    const newId = insertResult.rows[0].id;

    // Return the new skeletal sales lead
    const final = await db.query(
      `SELECT sl.*, u.username AS se_username
                FROM sales_leads sl
                LEFT JOIN users u ON sl.se_id = u.id
                WHERE sl.id = $1`,
      [newId],
    );

    return res.status(201).json(final.rows[0]);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Failed to create sales lead" });
  }
});

// Update existing sales lead
router.put("/approved/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const body = toSnake(req.body);
    // Add all fields you want to update here
    const updateResult = await db.query(
      `UPDATE sales_leads 
            SET 
                done_date=NOW()
            WHERE id=$1
            RETURNING id`,
      [id],
    );
    const updatedId = updateResult.rows[0].id;
    const result = await db.query(
      `SELECT sl.*, u.username AS se_username
                FROM sales_leads sl
                LEFT JOIN users u ON sl.se_id = u.id
                WHERE sl.id = $1`,
      [updatedId],
    );
    if (result.rows.length === 0)
      return res.status(404).json({ error: "Not found" });
    return res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Failed to update sales lead" });
  }
});

// Update existing sales lead
router.put("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const body = toSnake(req.body);
    // Add all fields you want to update here
    const updateResult = await db.query(
      `UPDATE sales_leads 
       SET 
        sales_stage=$1, end_user=$2, designation=$3, department=$4, immediate_support=$5, contact_number=$6, email_address=$7, category=$8, application=$9, machine=$10, machine_process=$11, needed_product=$12, existing_specifications=$13, issues_with_existing=$14, consideration=$15, support_needed=$16, urgency=$17, model_to_quote=$18, quantity=$19, quantity_attention=$20, qr_cc=$21, qr_email_to=$22, next_followup_date=$23, due_date=$24, done_date=$25, account=$26, industry=$27, se_id=$28, sales_plan_rep=$29, fsl_ref=$30, fsl_date=$31, fsl_time=$32, fsl_location=$33, ww=$34, requirement=$35, requirement_category=$36, deadline=$37, product_application=$38, customer_issues=$39, existing_setup_items=$40, customer_suggested_setup=$41, remarks=$42, actual_picture=$43, draft_design_layout=$44, updated_at=NOW()
       WHERE id=$45
       RETURNING id`,
      [
        body.sales_stage,
        body.end_user,
        body.designation,
        body.department,
        body.immediate_support,
        body.contact_number,
        body.email_address,
        body.category,
        body.application,
        body.machine,
        body.machine_process,
        body.needed_product,
        body.existing_specifications,
        body.issues_with_existing,
        body.consideration,
        body.support_needed,
        body.urgency,
        body.model_to_quote,
        body.quantity,
        body.quantity_attention,
        body.qr_cc,
        body.qr_email_to,
        body.next_followup_date,
        body.due_date,
        body.done_date,
        body.account,
        body.industry,
        body.se_id,
        body.sales_plan_rep,
        body.fsl_ref,
        body.fsl_date,
        body.fsl_time,
        body.fsl_location,
        body.ww,
        body.requirement,
        body.requirement_category,
        body.deadline,
        body.product_application,
        body.customer_issues,
        body.existing_setup_items,
        body.customer_suggested_setup,
        body.remarks,
        body.actual_picture,
        body.draft_design_layout,
        id,
      ],
    );
    const updatedId = updateResult.rows[0].id;
    const result = await db.query(
      `SELECT sl.*, u.username AS se_username
                FROM sales_leads sl
                LEFT JOIN users u ON sl.se_id = u.id
                WHERE sl.id = $1`,
      [updatedId],
    );
    if (result.rows.length === 0)
      return res.status(404).json({ error: "Not found" });
    return res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Failed to update sales lead" });
  }
});

export default router;
