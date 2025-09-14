// routes/workordersRoutes.js
import express from "express";
import db from "../db.js";
import { toSnake } from "../helper/utils.js";

const router = express.Router();

// Get all workorders
router.get("/", async (req, res) => {
  try {
    const result = await db.query("SELECT * FROM workorders ORDER BY id ASC");
    return res.json(result.rows); // ✅ camelCase
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Failed to fetch workorders" });
  }
});

// Get single user
router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const result = await db.query("SELECT * FROM workorders WHERE id = $1", [id]);
    if (result.rows.length === 0)
      return res.status(404).json({ error: "Not found" });
    return res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Failed to fetch user" });
  }
});

// Create new user
router.post("/", async (req, res) => {
  try {
    const body = toSnake(req.body); // ✅ convert camelCase → snake_case
    const {
      wo_number,
      work_description,
      assignee,
      account_name,
      is_new_account,
      industry,
      mode,
      product_brand,
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

    const result = await db.query(
      `INSERT INTO workorders 
        (wo_number, work_description, assignee, account_name, is_new_account, industry, mode, product_brand, contact_person, contact_number, wo_date, due_date, from_time, to_time, actual_date, actual_from_time, actual_to_time, objective, instruction, target_output, is_fsl, is_esl, created_at, updated_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,NOW(),NOW())
       RETURNING *`,
      [
        wo_number,
        work_description,
        assignee,
        account_name,
        is_new_account,
        industry,
        mode,
        product_brand,
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
      ]
    );

    return res.status(201).json(result.rows[0]); // ✅ camelCase
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Failed to create workorder" });
  }
});

// Update existing workorder
router.put("/:id", async (req, res) => {
  try {
    console.log(req);
    console.log(JSON.stringify(req.params));
    const { id } = req.params;
    const body = toSnake(req.body);
    const {
      wo_number,
      work_description,
      assignee,
      account_name,
      is_new_account,
      industry,
      mode,
      product_brand,
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

    const result = await db.query(
      `UPDATE workorders 
       SET 
          wo_number=$1, work_description=$2, assignee=$3, account_name=$4, is_new_account=$5, industry=$6,
          mode=$7, product_brand=$8, contact_person=$9, contact_number=$10, wo_date=$11, due_date=$12,
          from_time=$13, to_time=$14, actual_date=$15, actual_from_time=$16, actual_to_time=$17, objective=$18,
          instruction=$19, target_output=$20, is_fsl=$21, is_esl=$22, updated_at=NOW()
       WHERE id=$23
       RETURNING *`,
      [
        wo_number,
        work_description,
        assignee,
        account_name,
        is_new_account,
        industry,
        mode,
        product_brand,
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

    if (result.rows.length === 0)
      return res.status(404).json({ error: "Not found" });
    return res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Failed to update workorder" });
  }
});

export default router;
