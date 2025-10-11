// routes/workordersRoutes.js
import express from "express";
import { crmPoolPromise, sql } from "../mssql.js";
import { toSnake } from "../helper/utils.js";

const router = express.Router();
// Create new workorder
router.post("/", async (req, res) => {
  const pool = await crmPoolPromise;
  const transaction = pool.transaction();
  try {
    await transaction.begin();
    const body = toSnake(req.body); // convert camelCase -> snake_case
    let {
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

    // Coalesce null/undefined text fields to empty string to avoid inserting nulls
    work_description = work_description ?? "";
    contact_person = contact_person ?? "";
    contact_number = contact_number ?? "";
    objective = objective ?? "";
    instruction = instruction ?? "";
    target_output = target_output ?? "";
    mode = mode ?? "";
    account_name = account_name ?? "";
    created_by = created_by ?? null;

    const trReq = transaction.request();

    let finalAccountId = account_id;
    if (is_new_account) {
      const resolvedDepartmentId = department_id ?? 1;
      const resolvedIndustryId = industry_id ?? 1;
      const resolvedProductId = product_brand_id ?? 1;
      const draftAccount = await trReq.input('account_name', sql.NVarChar, account_name).input('department_id', sql.Int, resolvedDepartmentId).input('industry_id', sql.Int, resolvedIndustryId).input('product_id', sql.Int, resolvedProductId).query("INSERT INTO crmdb.accounts (account_name, department_id, industry_id, product_id, stage_status, created_at, updated_at, is_naef) OUTPUT INSERTED.id VALUES (@account_name, @department_id, @industry_id, @product_id, 'Draft', SYSUTCDATETIME(), SYSUTCDATETIME(), 1)");
      finalAccountId = (draftAccount.recordset || [])[0].id;
    }

    const currentYear = new Date().getFullYear();
    const likeRes = await trReq.input('like', sql.NVarChar, `WO-${currentYear}-%`).query('SELECT TOP (1) wo_number FROM crmdb.workorders WHERE wo_number LIKE @like ORDER BY wo_number DESC');
    let newCounter = 1;
    if ((likeRes.recordset || []).length > 0) {
      const lastWoNumber = likeRes.recordset[0].wo_number || '';
      const lastCounter = parseInt((lastWoNumber.split("-")[2] || '0'), 10) || 0;
      newCounter = lastCounter + 1;
    }
    const woNumber = `WO-${currentYear}-${String(newCounter).padStart(4, "0")}`;

    const insertResult = await trReq.input('wo_number', sql.NVarChar, woNumber).input('work_description', sql.NVarChar, work_description).input('assignee', sql.Int, assignee == null ? null : parseInt(assignee, 10)).input('account_id', sql.Int, finalAccountId == null ? null : parseInt(finalAccountId, 10)).input('is_new_account', sql.Bit, is_new_account ? 1 : 0).input('mode', sql.NVarChar, mode).input('contact_person', sql.NVarChar, contact_person).input('contact_number', sql.NVarChar, contact_number).input('wo_date', sql.DateTime, wo_date).input('due_date', sql.DateTime, due_date).input('from_time', sql.NVarChar, from_time).input('to_time', sql.NVarChar, to_time).input('actual_date', sql.DateTime, actual_date).input('actual_from_time', sql.NVarChar, actual_from_time).input('actual_to_time', sql.NVarChar, actual_to_time).input('objective', sql.NVarChar, objective).input('instruction', sql.NVarChar, instruction).input('target_output', sql.NVarChar, target_output).input('is_fsl', sql.Bit, is_fsl ? 1 : 0).input('is_esl', sql.Bit, is_esl ? 1 : 0).input('created_by', sql.Int, created_by == null ? null : parseInt(created_by, 10)).query('INSERT INTO crmdb.workorders (wo_number, work_description, assignee, account_id, is_new_account, mode, contact_person, contact_number, wo_date, due_date, from_time, to_time, actual_date, actual_from_time, actual_to_time, objective, instruction, target_output, is_fsl, is_esl, created_at, created_by, updated_at) OUTPUT INSERTED.id VALUES (@wo_number,@work_description,@assignee,@account_id,@is_new_account,@mode,@contact_person,@contact_number,@wo_date,@due_date,@from_time,@to_time,@actual_date,@actual_from_time,@actual_to_time,@objective,@instruction,@target_output,@is_fsl,@is_esl,SYSUTCDATETIME(),@created_by,SYSUTCDATETIME())');

    const newId = (insertResult.recordset || [])[0].id;

    await transaction.commit();

    const final = await pool.request().input('id', sql.Int, newId).query('SELECT w.*, u.username AS assignee_username, u.department_id AS assignee_department_id, d.department_name AS assignee_department_name FROM crmdb.workorders w LEFT JOIN crmdb.users u ON w.assignee = u.id LEFT JOIN crmdb.departments d ON u.department_id = d.id WHERE w.id = @id');

    return res.status(201).json(final.recordset[0]);
  } catch (err) {
    console.error(err);
    try { await transaction.rollback(); } catch (e) { console.error('Rollback failed', e); }
    return res.status(500).json({ error: "Failed to create workorder" });
  }
});

// Update existing workorder
router.put("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const body = toSnake(req.body);
    let {
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

    work_description = work_description ?? "";
    contact_person = contact_person ?? "";
    contact_number = contact_number ?? "";
    objective = objective ?? "";
    instruction = instruction ?? "";
    target_output = target_output ?? "";
    mode = mode ?? "";

    const pool = await crmPoolPromise;
    const reqq = pool.request();
    reqq.input('wo_number', sql.NVarChar, wo_number);
    reqq.input('work_description', sql.NVarChar, work_description);
    reqq.input('assignee', sql.Int, assignee == null ? null : parseInt(assignee, 10));
    reqq.input('account_id', sql.Int, account_id == null ? null : parseInt(account_id, 10));
    reqq.input('is_new_account', sql.Bit, is_new_account ? 1 : 0);
    reqq.input('mode', sql.NVarChar, mode);
    reqq.input('contact_person', sql.NVarChar, contact_person);
    reqq.input('contact_number', sql.NVarChar, contact_number);
    reqq.input('wo_date', sql.DateTime, wo_date);
    reqq.input('due_date', sql.DateTime, due_date);
    reqq.input('from_time', sql.NVarChar, from_time);
    reqq.input('to_time', sql.NVarChar, to_time);
    reqq.input('actual_date', sql.DateTime, actual_date);
    reqq.input('actual_from_time', sql.NVarChar, actual_from_time);
    reqq.input('actual_to_time', sql.NVarChar, actual_to_time);
    reqq.input('objective', sql.NVarChar, objective);
    reqq.input('instruction', sql.NVarChar, instruction);
    reqq.input('target_output', sql.NVarChar, target_output);
    reqq.input('is_fsl', sql.Bit, is_fsl ? 1 : 0);
    reqq.input('is_esl', sql.Bit, is_esl ? 1 : 0);
    reqq.input('id', sql.Int, parseInt(id, 10));
    const updateResult = await reqq.query('UPDATE crmdb.workorders SET wo_number=@wo_number, work_description=@work_description, assignee=@assignee, account_id=@account_id, is_new_account=@is_new_account, mode=@mode, contact_person=@contact_person, contact_number=@contact_number, wo_date=@wo_date, due_date=@due_date, from_time=@from_time, to_time=@to_time, actual_date=@actual_date, actual_from_time=@actual_from_time, actual_to_time=@actual_to_time, objective=@objective, instruction=@instruction, target_output=@target_output, is_fsl=@is_fsl, is_esl=@is_esl, updated_at=SYSUTCDATETIME() OUTPUT INSERTED.id WHERE id=@id');

    if (!updateResult || !updateResult.recordset || updateResult.recordset.length === 0) {
      return res.status(404).json({ error: "Not found" });
    }

    const updatedId = updateResult.recordset[0].id;

    const result = await pool.request().input('id', sql.Int, updatedId).query('SELECT w.*, u.username AS assignee_username, a.account_name AS account_name, ad.department_name AS department, ai.industry_name AS industry, apb.product_brand_name AS product_brand FROM crmdb.workorders w LEFT JOIN crmdb.users u ON w.assignee = u.id LEFT JOIN crmdb.accounts a ON w.account_id = a.id LEFT JOIN crmdb.account_departments ad ON a.department_id = ad.id LEFT JOIN crmdb.account_industries ai ON a.industry_id = ai.id LEFT JOIN crmdb.account_product_brands apb ON a.product_id = apb.id WHERE w.id = @id');

    if (((result.recordset || []).length) === 0)
      return res.status(404).json({ error: "Not found" });
    return res.json(result.recordset[0]);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Failed to update workorder" });
  }
});

// Get workorder status summary
router.get("/summary/status", async (req, res) => {
  try {
    const pool = await crmPoolPromise;
    const result = await pool.request().query(`SELECT COUNT(*) AS total, SUM(CASE WHEN status = 'Pending' THEN 1 ELSE 0 END) AS pending, SUM(CASE WHEN status = 'In Progress' THEN 1 ELSE 0 END) AS in_progress, SUM(CASE WHEN status = 'Completed' THEN 1 ELSE 0 END) AS completed FROM crmdb.workorders`);
    
    return res.json((result.recordset || [])[0]);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Failed to fetch status summary" });
  }
});

export default router;
