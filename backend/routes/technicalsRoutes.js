import express from "express";
import { crmPoolPromise, sql } from "../mssql.js";
import { getStocksByIds, getStockDetailsByStockIds } from "../mssqlClient.js";
import { toSnake } from "../helper/utils.js";

const router = express.Router();

// Get all technical recommendations
router.get("/", async (req, res) => {
  try {
    const pool = await crmPoolPromise;
    const result = await pool.request().query(`SELECT tr.*, u.username AS assignee_username, u.department_id AS assignee_department_id, d.department_name AS assignee_department_name, sl.sl_number AS sl_number, a.account_name AS account_name FROM crmdb.technical_recommendations tr LEFT JOIN crmdb.users u ON tr.assignee = u.id LEFT JOIN crmdb.departments d ON u.department_id = d.id LEFT JOIN crmdb.sales_leads sl ON tr.sl_id = sl.id LEFT JOIN crmdb.accounts a ON tr.account_id = a.id ORDER BY tr.id ASC`);
    return res.json(result.recordset || []);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Failed to fetch technical recommendations" });
  }
});

// Get single technical recommendation
router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const pool = await crmPoolPromise;
    const result = await pool.request().input('id', sql.Int, parseInt(id, 10)).query(`SELECT tr.*, u.username AS assignee_username, u.department_id AS assignee_department_id, d.department_name AS assignee_department_name, sl.sl_number AS sl_number, a.account_name AS account_name FROM crmdb.technical_recommendations tr LEFT JOIN crmdb.users u ON tr.assignee = u.id LEFT JOIN crmdb.departments d ON u.department_id = d.id LEFT JOIN crmdb.sales_leads sl ON tr.sl_id = sl.id LEFT JOIN crmdb.accounts a ON tr.account_id = a.id WHERE tr.id = @id`);
    if (((result.recordset || []).length) === 0) return res.status(404).json({ error: 'Not found' });
    const row = result.recordset[0];
    const itemsRes = await pool.request().input('id', sql.Int, parseInt(id, 10)).query('SELECT * FROM crmdb.tr_items WHERE tr_id = @id ORDER BY id ASC');
    const items = itemsRes.recordset || [];
    const stockIds = items.map(it => it.item_id).filter(Boolean);
    const stocks = await getStocksByIds(stockIds);
    const stockDetails = await getStockDetailsByStockIds(stockIds);
    const enrichedItems = items.map(item => ({
      ...item,
      stock: stocks.find(s => String(s.Id) === String(item.item_id)) || null,
      stockDetails: stockDetails.filter(d => String(d.Stock_Id) === String(item.item_id))
    }));
    const response = { ...row, items: enrichedItems };
    return res.json(response);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Failed to fetch technical recommendation" });
  }
});

// Create new technical recommendation
router.post("/", async (req, res) => {
  const pool = await crmPoolPromise;
  const transaction = pool.transaction();
  try {
    await transaction.begin();
    const body = toSnake(req.body);
    console.log("Creating technical recommendation with data:", body);
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
    const tr = transaction.request();
    const result = await tr.input('like', sql.NVarChar, `TR-${currentYear}-%`).query('SELECT TOP (1) tr_number FROM crmdb.technical_recommendations WHERE tr_number LIKE @like ORDER BY tr_number DESC');
    let newCounter = 1;
    const lastRow = (result.recordset || [])[0];
    if (lastRow) {
      const lastTrNumber = lastRow.tr_number || lastRow.trNumber || '';
      const lastCounter = parseInt((lastTrNumber.split("-")[2] || '0'), 10) || 0;
      newCounter = lastCounter + 1;
    }
    const tr_number = `TR-${currentYear}-${String(newCounter).padStart(4, "0")}`;

    let sl_id = null;
    const slRes = await tr.input('wo', sql.Int, wo_id == null ? null : parseInt(wo_id, 10)).query('SELECT TOP (1) id FROM crmdb.sales_leads WHERE wo_id = @wo');
    if (((slRes.recordset || []).length) > 0) sl_id = slRes.recordset[0].id;

    const insert = await tr.input('wo_id', sql.Int, wo_id == null ? null : parseInt(wo_id, 10)).input('account_id', sql.Int, account_id == null ? null : parseInt(account_id, 10)).input('assignee', sql.Int, assignee == null ? null : parseInt(assignee, 10)).input('tr_number', sql.NVarChar, tr_number).input('status', sql.NVarChar, 'Open').input('stage_status', sql.NVarChar, status).input('sl_id', sql.Int, sl_id == null ? null : parseInt(sl_id, 10)).input('contact_person', sql.NVarChar, contact_person).input('contact_number', sql.NVarChar, contact_number).input('contact_email', sql.NVarChar, contact_email).input('current_system_issues', sql.NVarChar, issues).input('current_system', sql.NVarChar, current).query('INSERT INTO crmdb.technical_recommendations (wo_id, account_id, assignee, tr_number, status, stage_status, sl_id, contact_person, contact_number, contact_email, current_system_issues, current_system, created_at, created_by, updated_at) OUTPUT INSERTED.id VALUES (@wo_id, @account_id, @assignee, @tr_number, @status, @stage_status, @sl_id, @contact_person, @contact_number, @contact_email, @current_system_issues, @current_system, SYSUTCDATETIME(), @assignee, SYSUTCDATETIME())');
    const newId = (insert.recordset || [])[0].id;

    await tr.input('wo', sql.Int, newId).input('stage_name', sql.NVarChar, 'Technical Recommendation').input('status', sql.NVarChar, 'Draft').input('assigned_to', sql.Int, assignee == null ? null : parseInt(assignee, 10)).query('INSERT INTO crmdb.workflow_stages (wo_id, stage_name, status, assigned_to, created_at, updated_at) VALUES (@wo, @stage_name, @status, @assigned_to, SYSUTCDATETIME(), SYSUTCDATETIME())');

    await transaction.commit();
    const final = await pool.request().input('id', sql.Int, newId).query('SELECT tr.*, u.username AS assignee_username, u.department_id AS assignee_department_id, d.department_name AS assignee_department_name FROM crmdb.technical_recommendations tr LEFT JOIN crmdb.users u ON tr.assignee = u.id LEFT JOIN crmdb.departments d ON u.department_id = d.id WHERE tr.id = @id');
    return res.status(201).json(final.recordset[0]);
  } catch (err) {
    console.error(err);
    try { await transaction.rollback(); } catch (e) { console.error('Rollback failed', e); }
    return res.status(500).json({ error: "Failed to create technical recommendation" });
  }
});

// Update existing technical recommendation
router.put("/:id", async (req, res) => {
  const pool = await crmPoolPromise;
  const transaction = pool.transaction();
  try {
    await transaction.begin();
    const { id } = req.params;
    const body = toSnake(req.body);
    const trReq = transaction.request();
    trReq.input('status', sql.NVarChar, body.status || null);
    trReq.input('priority', sql.NVarChar, body.priority || null);
    trReq.input('title', sql.NVarChar, body.title || null);
    trReq.input('account_id', sql.Int, body.account_id == null ? null : parseInt(body.account_id, 10));
    trReq.input('contact_person', sql.NVarChar, body.contact_person || null);
    trReq.input('contact_number', sql.NVarChar, body.contact_number || null);
    trReq.input('contact_email', sql.NVarChar, body.contact_email || null);
    trReq.input('current_system', sql.NVarChar, body.current_system || null);
    trReq.input('current_system_issues', sql.NVarChar, body.current_system_issues || null);
    trReq.input('proposed_solution', sql.NVarChar, body.proposed_solution || null);
    trReq.input('technical_justification', sql.NVarChar, body.technical_justification || null);
    trReq.input('installation_requirements', sql.NVarChar, body.installation_requirements || null);
    trReq.input('training_requirements', sql.NVarChar, body.training_requirements || null);
    trReq.input('maintenance_requirements', sql.NVarChar, body.maintenance_requirements || null);
    trReq.input('attachments', sql.NVarChar, body.attachments || null);
    trReq.input('additional_notes', sql.NVarChar, body.additional_notes || null);
    trReq.input('id', sql.Int, parseInt(id, 10));
    const updateResult = await trReq.query('UPDATE crmdb.technical_recommendations SET status=@status, priority=@priority, title=@title, account_id=@account_id, contact_person=@contact_person, contact_number=@contact_number, contact_email=@contact_email, current_system=@current_system, current_system_issues=@current_system_issues, proposed_solution=@proposed_solution, technical_justification=@technical_justification, installation_requirements=@installation_requirements, training_requirements=@training_requirements, maintenance_requirements=@maintenance_requirements, attachments=@attachments, additional_notes=@additional_notes, updated_at=SYSUTCDATETIME() OUTPUT INSERTED.id WHERE id=@id');
    // tr_items handling
    const existingItemsRes = await trReq.input('id', sql.Int, parseInt(id, 10)).query('SELECT id FROM crmdb.tr_items WHERE tr_id = @id');
    const existingItemIds = new Set((existingItemsRes.recordset || []).map(r => r.id));
    const incomingItems = body.items || [];
    const incomingItemIds = new Set(incomingItems.filter(it => it.id).map(it => it.id));
    for (const dbId of existingItemIds) {
      if (!incomingItemIds.has(dbId)) {
        await trReq.input('id', sql.Int, dbId).query('DELETE FROM crmdb.tr_items WHERE id = @id');
      }
    }
    for (const item of incomingItems) {
      if (item.id && existingItemIds.has(item.id)) {
        await trReq.input('quantity', sql.Int, item.quantity == null ? null : parseInt(item.quantity, 10)).input('id', sql.Int, item.id).query('UPDATE crmdb.tr_items SET quantity=@quantity WHERE id=@id');
      } else {
        await trReq.input('tr_id', sql.Int, parseInt(id, 10)).input('item_id', sql.Int, item.id == null ? null : parseInt(item.id, 10)).input('quantity', sql.Int, item.quantity == null ? null : parseInt(item.quantity, 10)).query('INSERT INTO crmdb.tr_items (tr_id, item_id, quantity) VALUES (@tr_id, @item_id, @quantity)');
      }
    }
    const updatedId = (updateResult.recordset || [])[0].id;
    await transaction.commit();
    const result = await pool.request().input('id', sql.Int, updatedId).query(`SELECT tr.*, u.username AS assignee_username, u.department_id AS assignee_department_id, d.department_name AS assignee_department_name, sl.sl_number AS sl_number, a.account_name AS account_name FROM crmdb.technical_recommendations tr LEFT JOIN crmdb.users u ON tr.assignee = u.id LEFT JOIN crmdb.departments d ON u.department_id = d.id LEFT JOIN crmdb.sales_leads sl ON tr.sl_id = sl.id LEFT JOIN crmdb.accounts a ON tr.account_id = a.id WHERE tr.id = @id`);
    if (((result.recordset || []).length) === 0) return res.status(404).json({ error: 'Not found' });
    const itemsRes2 = await pool.request().input('id', sql.Int, updatedId).query('SELECT * FROM crmdb.tr_items WHERE tr_id = @id ORDER BY id ASC');
    const items = itemsRes2.recordset || [];
    const stockIds = items.map(it => it.item_id).filter(Boolean);
    const stocks = await getStocksByIds(stockIds);
    const stockDetails = await getStockDetailsByStockIds(stockIds);
    const enrichedItems = items.map(item => ({
      ...item,
      stock: stocks.find(s => String(s.Id) === String(item.item_id)) || null,
      stockDetails: stockDetails.filter(d => String(d.Stock_Id) === String(item.item_id))
    }));
    const response = { ...result.recordset[0], items: enrichedItems };
    return res.json(response);
  } catch (err) {
    console.error(err);
    try { await transaction.rollback(); } catch (e) { console.error('Rollback failed', e); }
    return res.status(500).json({ error: "Failed to update technical recommendation" });
  }
});

export default router;