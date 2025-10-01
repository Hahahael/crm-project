import express from "express";
import db from "../db.js";
import { toSnake } from "../helper/utils.js";

const router = express.Router();

// Get all technical recommendations
router.get("/", async (req, res) => {
  try {
    const result = await db.query(`
      SELECT 
        tr.*, 
        u.username AS assignee_username,
        u.department AS assignee_department,
        sl.sl_number AS sl_number
      FROM technical_recommendations tr
      LEFT JOIN users u ON tr.assignee = u.id
      LEFT JOIN sales_leads sl ON tr.sl_id = sl.id
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
        u.department AS assignee_department,
        sl.sl_number AS sl_number
      FROM technical_recommendations tr
      LEFT JOIN users u ON tr.assignee = u.id
      LEFT JOIN sales_leads sl ON tr.sl_id = sl.id
      WHERE tr.id = $1
    `, [id]);
    if (result.rows.length === 0)
      return res.status(404).json({ error: "Not found" });
    console.log("Fetched technical recommendation:", result.rows[0]);
    return res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Failed to fetch technical recommendation" });
  }
});

// Create new technical recommendation
router.post("/", async (req, res) => {
  try {
    const body = toSnake(req.body);
    // Only require wo_id and assignee for skeletal creation, status defaults to 'Draft'
    const wo_id = body.wo_id;
    const assignee = body.assignee;
    const status = body.status || 'Draft';

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
    let slId = null;
    const slRes = await db.query(
      `SELECT id FROM sales_leads WHERE wo_id = $1 LIMIT 1`,
      [wo_id]
    );
    if (slRes.rows.length > 0) {
      slId = slRes.rows[0].id;
    }

    // Insert skeletal technical recommendation, all other fields default to null
    const insertResult = await db.query(
      `INSERT INTO technical_recommendations 
        (wo_id, assignee, tr_number, status, sl_id, created_at, created_by, updated_at)
        VALUES ($1, $2, $3, $4, $5, NOW(), $2, NOW())
        RETURNING id`,
      [
        wo_id,
        assignee,
        tr_number,
        status,
        slId
      ]
    );
    const newId = insertResult.rows[0].id;

    // Create workflow stage for new technical recommendation (Draft)
    await db.query(
      `INSERT INTO workflow_stages (wo_id, stage_name, status, assigned_to, created_at, updated_at)
       VALUES ($1, $2, $3, $4, NOW(), NOW())`,
      [newId, 'Technical Recommendation', 'Draft', assignee]
    );

    const final = await db.query(
      `SELECT tr.*, u.username AS assignee_username, u.department AS assignee_department
       FROM technical_recommendations tr
       LEFT JOIN users u ON tr.assignee = u.id
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
    // Add all fields you want to update here
    const updateResult = await db.query(
      `UPDATE technical_recommendations 
       SET 
        status=$1, priority=$2, title=$3, account_id=$4, contact_person=$5, contact_number=$6, contact_email=$7, current_system=$8, current_system_issues=$9, proposed_solution=$10, technical_justification=$11, installation_requirements=$12, training_requirements=$13, maintenance_requirements=$14, attachments=$15, additional_notes=$16, updated_at=NOW()
       WHERE id=$17
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
        id
      ]
    );
    const updatedId = updateResult.rows[0].id;
    const result = await db.query(
      `SELECT tr.*, u.username AS assignee_username, u.department AS assignee_department
       FROM technical_recommendations tr
       LEFT JOIN users u ON tr.assignee = u.id
       WHERE tr.id = $1`,
      [updatedId]
    );
    if (result.rows.length === 0)
      return res.status(404).json({ error: "Not found" });
    return res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Failed to update technical recommendation" });
  }
});

export default router;