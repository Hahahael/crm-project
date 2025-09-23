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
        u.department AS assignee_department
      FROM technical_recommendations tr
      LEFT JOIN users u ON tr.assignee = u.id
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
        u.department AS assignee_department
      FROM technical_recommendations tr
      LEFT JOIN users u ON tr.assignee = u.id
      WHERE tr.id = $1
    `, [id]);
    if (result.rows.length === 0)
      return res.status(404).json({ error: "Not found" });
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
    const {
      wo_id,
      assignee,
      tr_number,
      status,
      priority,
      title,
      sl_id,
      account_id,
      contact_person,
      contact_number,
      contact_email,
      current_system,
      current_system_issues,
      proposed_solution,
      technical_justification,
      installation_requirements,
      training_requirements,
      maintenance_requirements,
      attachments,
      additional_notes,
      created_by
    } = body;

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
      const lastTrNumber = result.rows[0].tr_number;
      const lastCounter = parseInt(lastTrNumber.split("-")[2], 10);
      newCounter = lastCounter + 1;
    }

    const trNumber = `TR-${currentYear}-${String(newCounter).padStart(4, "0")}`;

    // Insert into DB
    const insertResult = await db.query(
      `INSERT INTO technical_recommendations 
        (wo_id, assignee, tr_number, status, priority, title, sl_id, account_id, contact_person, contact_number, contact_email, current_system, current_system_issues, proposed_solution, technical_justification, installation_requirements, training_requirements, maintenance_requirements, attachments, additional_notes, created_at, created_by, updated_at)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,NOW(),$21,NOW())
        RETURNING id`,
      [
        wo_id,
        assignee,
        trNumber,
        status,
        priority,
        title,
        sl_id,
        account_id,
        contact_person,
        contact_number,
        contact_email,
        current_system,
        current_system_issues,
        proposed_solution,
        technical_justification,
        installation_requirements,
        training_requirements,
        maintenance_requirements,
        attachments,
        additional_notes,
        created_by
      ]
    );
    const newId = insertResult.rows[0].id;
    
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
        wo_id=$1, assignee=$2, status=$3, priority=$4, title=$5, sl_id=$6, account_id=$7, contact_person=$8, contact_number=$9, contact_email=$10, current_system=$11, current_system_issues=$12, proposed_solution=$13, technical_justification=$14, installation_requirements=$15, training_requirements=$16, maintenance_requirements=$17, attachments=$18, additional_notes=$19, updated_at=NOW()
       WHERE id=$20
       RETURNING id`,
      [
        body.wo_id,
        body.assignee,
        body.status,
        body.priority,
        body.title,
        body.sl_id,
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