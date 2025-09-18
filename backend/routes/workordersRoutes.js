// routes/workordersRoutes.js
import express from "express";
import db from "../db.js";
import { toSnake } from "../helper/utils.js";
 
const router = express.Router();

// Get all workorders
router.get("/", async (req, res) => {
  try {
    const result = await db.query(`
      SELECT 
        w.*, 
        assignee_user.username AS assignee_username,
        assignee_user.department AS department,
        creator_user.username AS creator_username
      FROM workorders w
      LEFT JOIN users assignee_user ON w.assignee = assignee_user.id
      LEFT JOIN users creator_user ON w.created_by = creator_user.id
      ORDER BY w.id ASC
    `);
    return res.json(result.rows); // ✅ camelCase
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Failed to fetch workorders" });
  }
});

router.get("/assigned", async (req, res) => {
  try {
    const username = req.user.username;
    const result = await db.query(
      `SELECT 
        w.*, 
        u.username AS assignee_username,
        u.department AS department
       FROM workorders w
       LEFT JOIN users u ON w.assignee = u.id
       WHERE u.username = $1
       ORDER BY w.id ASC`,
      [username]
    );
    return res.json(result.rows);
  } catch (err) {
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
        u.department AS department
       FROM workorders w
       LEFT JOIN users u ON w.assignee = u.id
       WHERE u.username = $1
         AND w.actual_date IS NULL
       ORDER BY w.id ASC`,
      [username]
    );
    return res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch assigned workorders" });
  }
});

// Get single workorder
router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const result = await db.query(`
      SELECT 
        w.*, 
        u.username AS assignee_username,
        u.department AS department
      FROM workorders w
      LEFT JOIN users u ON w.assignee = u.id
      WHERE w.id = $1`,
      [id]
    );
    if (result.rows.length === 0)
      return res.status(404).json({ error: "Not found" });
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
    console.log(body);
    const {
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
      created_by,
    } = body;

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
        (wo_number, work_description, assignee, account_name, is_new_account, industry, mode, product_brand, contact_person, contact_number, wo_date, due_date, from_time, to_time, actual_date, actual_from_time, actual_to_time, objective, instruction, target_output, is_fsl, is_esl, created_at, created_by, updated_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,NOW(),$23,NOW())
       RETURNING id`,
      [
        woNumber,
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
        created_by,
      ]
    );

    const newId = insertResult.rows[0].id;

    // 5️⃣ Return new row with assignee details
    const final = await db.query(
      `SELECT w.*, u.username AS assignee_username, u.department
       FROM workorders w
       LEFT JOIN users u ON w.assignee = u.id
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

    const updateResult = await db.query(
      `UPDATE workorders 
       SET 
          wo_number=$1, work_description=$2, assignee=$3, account_name=$4, is_new_account=$5, industry=$6,
          mode=$7, product_brand=$8, contact_person=$9, contact_number=$10, wo_date=$11, due_date=$12,
          from_time=$13, to_time=$14, actual_date=$15, actual_from_time=$16, actual_to_time=$17, objective=$18,
          instruction=$19, target_output=$20, is_fsl=$21, is_esl=$22, updated_at=NOW()
       WHERE id=$23
       RETURNING id`,
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

    const updatedId = updateResult.rows[0].id;

    const result = await db.query(
      `SELECT 
          w.*, 
          u.username AS assignee_username,
          u.department as department
       FROM workorders w
       LEFT JOIN users u ON w.assignee = u.id
       WHERE w.id = $1`,
      [updatedId]
    );

    if (result.rows.length === 0)
      return res.status(404).json({ error: "Not found" });
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
