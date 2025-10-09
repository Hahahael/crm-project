import db from '../db.js';
import { toCamel, toSnake } from '../helper/utils.js';

export async function listAll() {
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
  return toCamel(result.rows);
}

export async function getById(id) {
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
  `, [id]);
  if (result.rows.length === 0) return null;

  const itemsRes = await db.query(
    `SELECT
      ti.*, i.name, i.model, i.description, i.brand, i.part_number, i.lead_time, i.unit, i.unit_price
    FROM tr_items ti
    LEFT JOIN items i ON ti.item_id = i.id
    WHERE ti.tr_id = $1`,
    [id]
  );

  const out = { ...toCamel(result.rows[0]), items: toCamel(itemsRes.rows) };
  return out;
}

export async function createTr(payload) {
  const body = toSnake(payload);
  const wo_id = body.wo_id;
  const account_id = body.account_id;
  const assignee = body.assignee;
  const status = body.status || 'Draft';
  const contact_person = body.contact_person || null;
  const contact_number = body.contact_number || null;
  const contact_email = body.contact_email || null;
  const issues = body.issues || null;
  const current = body.current || null;

  const currentYear = new Date().getFullYear();
  const result = await db.query(
    `SELECT tr_number FROM technical_recommendations WHERE tr_number LIKE $1 ORDER BY tr_number DESC LIMIT 1`,
    [`TR-${currentYear}-%`]
  );
  let newCounter = 1;
  if (result.rows.length > 0) {
    const lastTrNumber = result.rows[0].trNumber;
    const lastCounter = parseInt(lastTrNumber.split('-')[2], 10);
    newCounter = lastCounter + 1;
  }
  const tr_number = `TR-${currentYear}-${String(newCounter).padStart(4, '0')}`;

  let sl_id = null;
  const slRes = await db.query(`SELECT id FROM sales_leads WHERE wo_id = $1 LIMIT 1`, [wo_id]);
  if (slRes.rows.length > 0) sl_id = slRes.rows[0].id;

  const insertResult = await db.query(
    `INSERT INTO technical_recommendations 
      (wo_id, account_id, assignee, tr_number, status, stage_status, sl_id, contact_person, contact_number, contact_email, current_system_issues, current_system, created_at, created_by, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW(), $2, NOW()) RETURNING id`,
    [wo_id, account_id, assignee, tr_number, 'Open', status, sl_id, contact_person, contact_number, contact_email, issues, current]
  );
  const newId = insertResult.rows[0].id;

  await db.query(`INSERT INTO workflow_stages (wo_id, stage_name, status, assigned_to, created_at, updated_at) VALUES ($1, $2, $3, $4, NOW(), NOW())`, [newId, 'Technical Recommendation', 'Draft', assignee]);

  const final = await db.query(
    `SELECT tr.*, u.username AS assignee_username, u.department_id AS assignee_department_id, d.department_name AS assignee_department_name
     FROM technical_recommendations tr
     LEFT JOIN users u ON tr.assignee = u.id
     LEFT JOIN departments d ON u.department_id = d.id
     WHERE tr.id = $1`,
    [newId]
  );
  return toCamel(final.rows[0]);
}

export async function updateTr(id, payload) {
  const body = toSnake(payload);
  const updateResult = await db.query(
    `UPDATE technical_recommendations 
     SET status=$1, priority=$2, title=$3, account_id=$4, contact_person=$5, contact_number=$6, contact_email=$7, current_system=$8, current_system_issues=$9, proposed_solution=$10, technical_justification=$11, installation_requirements=$12, training_requirements=$13, maintenance_requirements=$14, attachments=$15, additional_notes=$16, updated_at=NOW()
     WHERE id=$17 RETURNING id`,
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

  // handle tr_items upsert/delete
  const existingItemsRes = await db.query(`SELECT id FROM tr_items WHERE tr_id = $1`, [id]);
  const existingItemIds = new Set(existingItemsRes.rows.map(r => r.id));
  const incomingItems = body.items || [];
  const incomingItemIds = new Set(incomingItems.filter(it => it.id).map(it => it.id));

  for (const dbId of existingItemIds) {
    if (!incomingItemIds.has(dbId)) {
      await db.query(`DELETE FROM tr_items WHERE id = $1`, [dbId]);
    }
  }

  for (const item of incomingItems) {
    if (item.id && existingItemIds.has(item.id)) {
      await db.query(`UPDATE tr_items SET quantity=$1 WHERE id=$2`, [item.quantity, item.id]);
    } else {
      await db.query(`INSERT INTO tr_items (tr_id, item_id, quantity) VALUES ($1, $2, $3)`, [id, item.id, item.quantity]);
    }
  }

  const updatedId = updateResult.rows[0].id;
  const result = await db.query(`
    SELECT
      tr.*, u.username AS assignee_username, u.department_id AS assignee_department_id, d.department_name AS assignee_department_name, sl.sl_number AS sl_number, a.account_name AS account_name
    FROM technical_recommendations tr
    LEFT JOIN users u ON tr.assignee = u.id
    LEFT JOIN departments d ON u.department_id = d.id
    LEFT JOIN sales_leads sl ON tr.sl_id = sl.id
    LEFT JOIN accounts a ON tr.account_id = a.id
    WHERE tr.id = $1`,
    [updatedId]
  );
  if (result.rows.length === 0) return null;
  const itemsRes = await db.query(`
    SELECT
      ti.*, i.name, i.model, i.description, i.brand, i.part_number, i.lead_time, i.unit, i.unit_price
    FROM tr_items ti
    LEFT JOIN items i ON ti.item_id = i.id
    WHERE ti.tr_id = $1`,
    [updatedId]
  );
  return { ...toCamel(result.rows[0]), items: toCamel(itemsRes.rows) };
}

export async function getItemsWithDetails(trId) {
  const itemsRes = await db.query(`SELECT * FROM tr_items WHERE tr_id = $1`, [trId]);
  const items = itemsRes.rows;
  const itemsWithDetails = await Promise.all(items.map(async (item) => {
    const q = await db.query(`SELECT ti.*, i.name, i.model, i.description, i.brand, i.part_number, i.lead_time, i.unit, i.unit_price FROM tr_items ti LEFT JOIN items i ON ti.item_id = i.id WHERE ti.id = $1`, [item.id]);
    return toCamel(q.rows[0]);
  }));
  return itemsWithDetails;
}

export default {
  listAll,
  getById,
  createTr,
  updateTr,
  getItemsWithDetails,
};
