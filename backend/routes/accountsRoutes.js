import express from "express";
import { sql, crmPoolPromise } from "../mssql.js";
import { toSnake, toCamel } from "../helper/utils.js";

const router = express.Router();

// GET all accounts
router.get("/all", async (req, res) => {
  try {
    const pool = await crmPoolPromise;
    const q = `
      SELECT a.*, ai.industry_name AS industry_name, apb.product_brand_name AS product_brand_name, ad.department_name AS department_name
      FROM crmdb.accounts a
      LEFT JOIN crmdb.account_industries ai ON a.industry_id = ai.id
      LEFT JOIN crmdb.account_product_brands apb ON a.product_id = apb.id
      LEFT JOIN crmdb.account_departments ad ON a.department_id = ad.id
      ORDER BY a.id DESC`;
    const result = await pool.request().query(q);
    const rows = toCamel(result.recordset || []);
    console.log("Fetched accounts:", rows.length);
    return res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET all accounts
router.get("/", async (req, res) => {
  try {
    const pool = await crmPoolPromise;
    const q = `
      SELECT a.*, ai.industry_name AS industry_name, apb.product_brand_name AS product_brand_name, ad.department_name AS department_name
      FROM crmdb.accounts a
      LEFT JOIN crmdb.account_industries ai ON a.industry_id = ai.id
      LEFT JOIN crmdb.account_product_brands apb ON a.product_id = apb.id
      LEFT JOIN crmdb.account_departments ad ON a.department_id = ad.id
      WHERE a.is_naef = 1
      ORDER BY a.id DESC`;
    const result = await pool.request().query(q);
    const rows = toCamel(result.recordset || []);
    console.log("Fetched NAEF accounts:", rows.length);
    return res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET all account industries
router.get("/industries", async (req, res) => {
  try {
    const pool = await crmPoolPromise;
    const result = await pool.request().query('SELECT * FROM crmdb.account_industries');
    return res.json(toCamel(result.recordset || []));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET all accounts product brands
router.get("/product-brands", async (req, res) => {
  try {
    const pool = await crmPoolPromise;
    const result = await pool.request().query('SELECT * FROM crmdb.account_product_brands');
    return res.json(toCamel(result.recordset || []));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET all accounts departments
router.get("/departments", async (req, res) => {
  try {
    const pool = await crmPoolPromise;
    const result = await pool.request().query('SELECT * FROM crmdb.account_departments');
    return res.json(toCamel(result.recordset || []));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET single account by id
router.get("/:id", async (req, res) => {
  try {
    const pool = await crmPoolPromise;
    const q = 'SELECT * FROM crmdb.accounts WHERE id = @id';
    const result = await pool.request().input('id', sql.Int, parseInt(req.params.id, 10)).query(q);
    const rows = toCamel(result.recordset || []);
    if (rows.length === 0) return res.status(404).json({ error: "Account not found" });
    return res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ADD new account
router.post("/", async (req, res) => {
  try {
    // Convert camelCase to snake_case for DB
    const data = toSnake(req.body || {});
    const keys = Object.keys(data);
    if (keys.length === 0) return res.status(400).json({ error: 'No fields provided' });

    const pool = await crmPoolPromise;
    const reqBuilder = pool.request();
    // bind inputs as NVARCHAR by default
    keys.forEach(k => {
      const val = data[k] == null ? null : String(data[k]);
      reqBuilder.input(k, sql.NVarChar, val);
    });

    const cols = keys.map(k => `[${k}]`).join(', ');
    const params = keys.map(k => `@${k}`).join(', ');
    const insertSql = `INSERT INTO crmdb.accounts (${cols}) OUTPUT INSERTED.* VALUES (${params})`;
    const result = await reqBuilder.query(insertSql);
    const row = toCamel((result.recordset || [])[0] || {});
    res.status(201).json(row);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// UPDATE account
router.put("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const data = toSnake(req.body || {});
    const allowedFields = [
      "naef_number", "stage_status", "ref_number", "date_created", "requested_by", "designation", "department_id",
      "validity_period", "due_date", "account_name", "contract_period", "industry_id", "account_designation",
      "product_id", "contact_number", "location", "email_address", "address", "buyer_incharge", "trunkline",
      "contract_number", "process", "secondary_email_address", "machines", "reason_to_apply", "automotive_section",
      "source_of_inquiry", "commodity", "business_activity", "model", "annual_target_sales", "population",
      "source_of_target", "existing_bellows", "products_to_order", "model_under", "target_areas", "analysis",
      "from_date", "to_date", "activity_period", "prepared_by", "noted_by", "approved_by", "received_by",
      "acknowledged_by", "updated_at", "created_at", "is_naef"
    ];
    const filteredData = Object.fromEntries(
      Object.entries(data).filter(([key]) => allowedFields.includes(key))
    );
    console.log("UPDATING ACCOUNT", data);
    if (data.is_naef) {
      console.log("Generating ref_number and requestor for NAEF account (transaction)");
      const currentYear = new Date().getFullYear();
      const pool = await crmPoolPromise;
      const transaction = pool.transaction();
      await transaction.begin();
      try {
        const tr = transaction.request();
        const refNumberResult = await tr.input('like', sql.NVarChar, `REF-${currentYear}-%`).query(`SELECT TOP (1) ref_number FROM crmdb.accounts WHERE ref_number LIKE @like ORDER BY ref_number DESC`);
        let newCounter = 1;
        if ((refNumberResult.recordset || []).length > 0) {
          const lastRefNumber = refNumberResult.recordset[0].ref_number || '';
          const lastCounter = parseInt((lastRefNumber.split("-")[2] || '0'), 10) || 0;
          newCounter = lastCounter + 1;
        }
        const ref_number = `REF-${currentYear}-${String(newCounter).padStart(4, "0")}`;
        const requestorRes = await tr.input('accId', sql.Int, parseInt(id, 10)).query(`SELECT TOP (1) contact_person FROM crmdb.workorders WHERE account_id = @accId`);
        filteredData.ref_number = ref_number;
        filteredData.requested_by = (requestorRes.recordset || []).length > 0 ? requestorRes.recordset[0].contact_person : null;
        console.log("Generated ref_number:", ref_number);

        // Proceed to update the account inside transaction
        const keys = Object.keys(filteredData);
        const setClause = keys.map((k, i) => `[${k}] = @p${i}`).join(', ');
        const reqBuilder = tr;
        keys.forEach((k, i) => {
          const val = filteredData[k] == null ? null : String(filteredData[k]);
          reqBuilder.input(`p${i}`, sql.NVarChar, val);
        });
        reqBuilder.input('id', sql.Int, parseInt(id, 10));
        const updateSql = `UPDATE crmdb.accounts SET ${setClause} WHERE id = @id; SELECT * FROM crmdb.accounts WHERE id = @id;`;
        const updateResult = await reqBuilder.query(updateSql);
        const updated = toCamel(updateResult.recordset || [])[0];
        if (!updated) {
          await transaction.rollback();
          return res.status(404).json({ error: 'Account not found' });
        }

        // Check and insert workflow_stages if needed
        const stageCheck = await tr.input('wo', sql.Int, parseInt(wo_id || 0, 10)).query(`SELECT TOP (1) 1 as exists_flag FROM crmdb.workflow_stages WHERE wo_id = @wo AND stage_name = 'NAEF'`);
        const status = data?.status ? data.status : ((stageCheck.recordset || []).length === 0 ? 'Draft' : 'Pending');
        await tr.input('wo', sql.Int, parseInt(wo_id || 0, 10)).input('status', sql.NVarChar, status).input('assigned', sql.NVarChar, assignee == null ? null : String(assignee)).query(`INSERT INTO crmdb.workflow_stages (wo_id, stage_name, status, assigned_to, created_at, updated_at) VALUES (@wo, 'NAEF', @status, @assigned, SYSUTCDATETIME(), SYSUTCDATETIME())`);

        await transaction.commit();
        const finalUpdated = toCamel(updateResult.recordset || [])[0];
        finalUpdated.assignee = assignee;
        return res.json(finalUpdated);
      } catch (errInner) {
        console.error(errInner);
        try { await transaction.rollback(); } catch (e) { console.error('Rollback failed', e); }
        return res.status(500).json({ error: errInner.message });
      }
    }

    let wo_id = data.wo_id;
    let assignee = data.assignee;
    // Remove wo_id and assignee from data before updating
    delete data.wo_id;
    delete data.assignee;
    // If wo_id is not present, select it from workorders using accountId
    if (!wo_id) {
      const pool = await crmPoolPromise;
      const woResult = await pool.request().input('accId', sql.Int, parseInt(id, 10)).query(
        `SELECT TOP (1) id FROM crmdb.workorders WHERE account_id = @accId`
      );
      wo_id = (woResult.recordset || []).length > 0 ? woResult.recordset[0].id : null;
    }
    // If assignee is not present, select it from workflow_stages using wo_id and stage_name = 'NAEF'
    if (!assignee && wo_id) {
      const pool = await crmPoolPromise;
      const stageResult = await pool.request().input('wo', sql.Int, parseInt(wo_id, 10)).query(
        `SELECT TOP (1) assigned_to FROM crmdb.workflow_stages WHERE wo_id = @wo AND stage_name = 'NAEF'`
      );
      console.log("Fetched assignee from workflow_stages:", stageResult.recordset);
      assignee = (stageResult.recordset || []).length > 0 ? stageResult.recordset[0].assigned_to : null;
    }
    const keys = Object.keys(filteredData);
    const values = Object.values(filteredData);
    const setClause = keys.map((k, i) => `[${k}] = @p${i}`).join(", ");
    console.log("Set clause for UPDATE:", setClause);
    console.log("Values for UPDATE:", values);
    console.log("ID for UPDATE:", id);
    //
    const pool2 = await crmPoolPromise;
    const reqBuilder = pool2.request();
    keys.forEach((k, i) => {
      const val = filteredData[k] == null ? null : String(filteredData[k]);
      reqBuilder.input(`p${i}`, sql.NVarChar, val);
    });
    reqBuilder.input('id', sql.Int, parseInt(id, 10));
    const updateSql = `UPDATE crmdb.accounts SET ${setClause} WHERE id = @id; SELECT * FROM crmdb.accounts WHERE id = @id;`;
    console.log('Executing updateSql:', updateSql);
    const result = await reqBuilder.query(updateSql);
    const updated = toCamel(result.recordset || [])[0];
    if (!updated) return res.status(404).json({ error: 'Account not found' });

    // Check if workflow_stages already has a NAEF stage for this wo_id
    const stageCheck = await pool2.request().input('wo', sql.Int, parseInt(wo_id, 10)).query(
      `SELECT TOP (1) 1 as exists_flag FROM crmdb.workflow_stages WHERE wo_id = @wo AND stage_name = 'NAEF'`
    );
    const status = data?.status ? data.status : ((stageCheck.recordset || []).length === 0 ? 'Draft' : 'Pending');
    await pool2.request().input('wo', sql.Int, parseInt(wo_id, 10)).input('status', sql.NVarChar, status).input('assigned', sql.NVarChar, assignee == null ? null : String(assignee)).query(
      `INSERT INTO crmdb.workflow_stages (wo_id, stage_name, status, assigned_to, created_at, updated_at)
        VALUES (@wo, 'NAEF', @status, @assigned, SYSUTCDATETIME(), SYSUTCDATETIME())`
    );
    if (updated) {
      updated.assignee = assignee;
    }
    
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
