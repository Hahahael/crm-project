import express from "express";
import db from "../db.js";
import { toSnake } from "../helper/utils.js";

const router = express.Router();

// Get all technical recommendations
router.get("/", async (req, res) => {
  try {
    const result = await db.query(`
      SELECT 
        r.*, 
        u.username AS assignee_username,
        u.department AS assignee_department,
        sl.sl_number AS sl_number
      FROM rfqs r
      LEFT JOIN users u ON r.assignee = u.id
      LEFT JOIN sales_leads sl ON r.sl_id = sl.id
      ORDER BY r.id ASC
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
        r.*, 
        u.username AS assignee_username,
        u.department AS assignee_department,
        sl.sl_number AS sl_number
      FROM rfqs r
      LEFT JOIN users u ON r.assignee = u.id
      LEFT JOIN sales_leads sl ON r.sl_id = sl.id
      WHERE r.id = $1
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
      rfq_number,
      rfq_date,
      due_date,
      description,
      sl_id,
      account_id,
      payment_terms,
      notes,
      subtotal,
      vat,
      grand_total,
      created_at,
      created_by,
      updated_at
    } = body;

    // Generate TR number
    const currentYear = new Date().getFullYear();
    const result = await db.query(
      `SELECT rfq_number
       FROM rfqs
       WHERE rfq_number LIKE $1
       ORDER BY rfq_number DESC
       LIMIT 1`,
      [`RFQ-${currentYear}-%`]
    );

    console.log("Latest RFQ number query result:", result.rows);

    let newCounter = 1;
    if (result.rows.length > 0) {
      const lastRfqNumber = result.rows[0].rfq_number;
      const lastCounter = parseInt(lastRfqNumber.split("-")[2], 10);
      newCounter = lastCounter + 1;
    }

    const rfqNumber = `RFQ-${currentYear}-${String(newCounter).padStart(4, "0")}`;

    // Insert into DB
    const insertResult = await db.query(
      `INSERT INTO rfqs 
        (wo_id, assignee, rfq_number, rfq_date, due_date, description, sl_id, account_id, payment_terms, notes, subtotal, vat, grand_total, created_at, created_by, updated_at)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,NOW(),$14,NOW())
        RETURNING id`,
      [
        wo_id,
        assignee,
        rfq_number,
        rfq_date,
        due_date,
        description,
        sl_id,
        account_id,
        payment_terms,
        notes,
        subtotal,
        vat,
        grand_total,
        created_by,
      ]
    );
    const newId = insertResult.rows[0].id;
    
    const final = await db.query(
      `SELECT r.*, u.username AS assignee_username, u.department AS assignee_department
       FROM rfqs r
       LEFT JOIN users u ON r.assignee = u.id
       WHERE r.id = $1`,
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
      `UPDATE rfqs 
       SET 
        wo_id=$1, assignee=$2, rfq_number=$3, rfq_date=$4, due_date=$5, description=$6, sl_id=$7, account_id=$8, payment_terms=$9, notes=$10, subtotal=$11, vat=$12, grand_total=$13, created_at=$14, created_by=$15, updated_at=NOW()
       WHERE id=$16
       RETURNING id`,
      [
        body.wo_id,
        body.assignee,
        body.rfq_number,
        body.rfq_date,
        body.due_date,
        body.description,
        body.sl_id,
        body.account_id,
        body.payment_terms,
        body.notes,
        body.subtotal,
        body.vat,
        body.grand_total,
        body.created_at,
        body.created_by,
        body.updated_at,
        id
      ]
    );
    const updatedId = updateResult.rows[0].id;
    const result = await db.query(
      `SELECT r.*, u.username AS assignee_username, u.department AS assignee_department
       FROM rfqs r
       LEFT JOIN users u ON r.assignee = u.id
       WHERE r.id = $1`,
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