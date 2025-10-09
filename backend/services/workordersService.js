import db from '../db.js';
import { toCamel, toSnake } from '../helper/utils.js';

export async function listAll() {
  const result = await db.query(`
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
  return toCamel(result.rows);
}

export async function listAssigned(username) {
  const result = await db.query(`
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
      WHERE u.username = $1
      ORDER BY w.id ASC
    `, [username]);
  return toCamel(result.rows);
}

export async function listAssignedNew(username) {
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
  return toCamel(result.rows);
}

export async function getById(id) {
  const result = await db.query(`
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
      WHERE w.id = $1`, [id]);
  return toCamel(result.rows[0] || null);
}

export async function createWorkorder(payload) {
  const body = toSnake(payload);
  const {
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

  let finalAccountId = account_id;
  if (is_new_account) {
    const draftAccount = await db.query(
      `INSERT INTO accounts 
          (account_name, department_id, industry_id, product_id, stage_status, created_at, updated_at, is_naef)
         VALUES ($1, $2, $3, $4, 'Draft', NOW(), NOW(), TRUE)
         RETURNING id`,
      [account_name, department_id, industry_id, product_brand_id]
    );
    finalAccountId = draftAccount.rows[0].id;
  }

  const currentYear = new Date().getFullYear();
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
    const lastWoNumber = result.rows[0].woNumber;
    const lastCounter = parseInt(lastWoNumber.split("-")[2], 10);
    newCounter = lastCounter + 1;
  }

  const woNumber = `WO-${currentYear}-${String(newCounter).padStart(4, "0")}`;

  const insertResult = await db.query(
    `INSERT INTO workorders 
      (wo_number, work_description, assignee, account_id, is_new_account, mode, contact_person, contact_number, wo_date, due_date, from_time, to_time, actual_date, actual_from_time, actual_to_time, objective, instruction, target_output, is_fsl, is_esl, created_at, created_by, updated_at)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,NOW(),$21,NOW())
     RETURNING id`,
    [
      woNumber,
      work_description,
      assignee,
      finalAccountId,
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

  const final = await db.query(
    `SELECT w.*, u.username AS assignee_username, u.department_id AS assignee_department_id, d.department_name AS assignee_department_name
       FROM workorders w
       LEFT JOIN users u ON w.assignee = u.id
       LEFT JOIN departments d ON u.department_id = d.id
       WHERE w.id = $1`,
    [newId]
  );

  return toCamel(final.rows[0]);
}

export async function updateWorkorder(id, payload) {
  const body = toSnake(payload);
  const {
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

  return toCamel(result.rows[0] || null);
}

export async function getStatusSummary() {
  const result = await db.query(`
      SELECT
        COUNT(*) AS total,
        SUM(CASE WHEN status = 'Pending' THEN 1 ELSE 0 END) AS pending,
        SUM(CASE WHEN status = 'In Progress' THEN 1 ELSE 0 END) AS in_progress,
        SUM(CASE WHEN status = 'Completed' THEN 1 ELSE 0 END) AS completed
      FROM workorders;
    `);
  return toCamel(result.rows[0]);
}

export default {
  listAll,
  listAssigned,
  listAssignedNew,
  getById,
  createWorkorder,
  updateWorkorder,
  getStatusSummary,
};
