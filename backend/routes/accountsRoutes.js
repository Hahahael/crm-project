import express from "express";
import db from "../mocks/dbMock.js";
import { toSnake, toCamel } from "../helper/utils.js";

const router = express.Router();

// GET all accounts
router.get("/all", async (req, res) => {
  try {
    const result = await db.query(`
      SELECT accounts.*, ai.industry_name AS industry_name, apb.product_brand_name AS product_brand_name, ad.department_name AS department_name
      FROM accounts
      LEFT JOIN account_industries ai ON accounts.industry_id = ai.id
      LEFT JOIN account_product_brands apb ON accounts.product_id = apb.id
      LEFT JOIN account_departments ad ON accounts.department_id = ad.id
    `);
    console.log("Fetched accounts:", result.rows);
    return res.json(result.rows); // ✅ camelCase
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET all accounts
router.get("/", async (req, res) => {
  try {
    const result = await db.query(`
      SELECT accounts.*, ai.industry_name AS industry_name, apb.product_brand_name AS product_brand_name, ad.department_name AS department_name
      FROM accounts
      LEFT JOIN account_industries ai ON accounts.industry_id = ai.id
      LEFT JOIN account_product_brands apb ON accounts.product_id = apb.id
      LEFT JOIN account_departments ad ON accounts.department_id = ad.id
      WHERE is_naef = TRUE
    `);
    console.log("Fetched accounts:", result.rows);
    return res.json(result.rows); // ✅ camelCase
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET all account industries
router.get("/industries", async (req, res) => {
  try {
    const result = await db.query("SELECT * FROM account_industries");
    console.log("Fetched account industries:", result.rows);
    return res.json(result.rows); // ✅ camelCase
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET all accounts product brands
router.get("/product-brands", async (req, res) => {
  try {
    const result = await db.query("SELECT * FROM account_product_brands");
    console.log("Fetched account product brands:", result.rows);
    return res.json(result.rows); // ✅ camelCase
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET all accounts departments
router.get("/departments", async (req, res) => {
  try {
    const result = await db.query("SELECT * FROM account_departments");
    console.log("Fetched account departments:", result.rows);
    return res.json(result.rows); // ✅ camelCase
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET single account by id
router.get("/:id", async (req, res) => {
  try {
    const result = await db.query("SELECT * FROM accounts WHERE id = $1", [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: "Account not found" });
    return res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ADD new account
router.post("/", async (req, res) => {
  try {
    // Convert camelCase to snake_case for DB
    const body = toSnake(req.body);
    console.log("Adding new account with data:", body);
    const keys = Object.keys(body);
    const values = Object.values(body);
    const params = keys.map((_, i) => `$${i + 1}`).join(", ");
    //
    const query = `INSERT INTO accounts  VALUES (${params}) RETURNING *`;
    const result = await db.query(query, values);
    res.status(201).json(toCamel(result.rows[0]));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// UPDATE account
router.put("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const data = toSnake(req.body);
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
    console.log("UPDATING ACCOUNT", data);
    if (data.is_naef) {
      console.log("Generating ref_number and requestor for NAEF account");
      const currentYear = new Date().getFullYear();
      const refNumberResult = await db.query(
        `SELECT ref_number
          FROM accounts
          WHERE ref_number LIKE $1
          ORDER BY ref_number DESC
          LIMIT 1`,
        [`REF-${currentYear}-%`]
      );

      console.log("Last ref_number query result:", refNumberResult.rows);
  
      let newCounter = 1;
      if (refNumberResult.rows.length > 0) {
        const lastRefNumber = refNumberResult.rows[0].refNumber;
        const lastCounter = parseInt(lastRefNumber.split("-")[2], 10);
        newCounter = lastCounter + 1;
      }

      console.log("New counter for ref_number:", newCounter);
  
      const ref_number = `REF-${currentYear}-${String(newCounter).padStart(4, "0")}`;

      const refUpdateQuery = await db.query(`UPDATE accounts SET ref_number=$1 WHERE id = $2 RETURNING *`, [ref_number, id]);
  
      const requestor = await db.query(
        `SELECT wo.contact_person
          FROM workorders wo
          WHERE wo.account_id = $1`,
        [id]
      );

      console.log("Requestor query result:", requestor.rows);
      console.log("Ref update query result:", refUpdateQuery.rows);
  
      data.ref_number = ref_number;
      data.requested_by = requestor.rows.length > 0 ? requestor.rows[0].contactPerson : null;

      console.log("Generated ref_number:", ref_number);
      console.log("Fetched requestor:", data.requested_by);
      console.log("Final data to update:", data);
    }

    const filteredData = Object.fromEntries(
      Object.entries(data).filter(([key]) => allowedFields.includes(key))
    );

    let wo_id = data.wo_id;
    let assignee = data.assignee;
    // Remove wo_id and assignee from data before updating
    delete data.wo_id;
    delete data.assignee;
    // If wo_id is not present, select it from workorders using accountId
    if (!wo_id) {
      const woResult = await db.query(
        `SELECT id FROM workorders WHERE account_id = $1 LIMIT 1`,
        [id]
      );
      wo_id = woResult.rows.length > 0 ? woResult.rows[0].id : null;
    }
    // If assignee is not present, select it from workflow_stages using wo_id and stage_name = 'NAEF'
    if (!assignee && wo_id) {
      const stageResult = await db.query(
        `SELECT assigned_to FROM workflow_stages WHERE wo_id = $1 AND stage_name = 'NAEF' LIMIT 1`,
        [wo_id]
      );
      console.log("Fetched assignee from workflow_stages:", stageResult.rows);
      assignee = stageResult.rows.length > 0 ? stageResult.rows[0].assignedTo : null;
    }
    const keys = Object.keys(filteredData);
    const values = Object.values(filteredData);
    const setClause = keys.map((k, i) => `${k} = $${i + 1}`).join(", ");
    console.log("Set clause for UPDATE:", setClause);
    console.log("Values for UPDATE:", values);
    console.log("ID for UPDATE:", id);
    //
    const query = `UPDATE accounts SET ${setClause} WHERE id = $${keys.length + 1} RETURNING *`;
    console.log("Executing query:", query);
    console.log("With values:", [...values, req.params.id]);
    //
    const result = await db.query(query, [...values, req.params.id]);
    console.log("Update result:", result.rows);
    if (result.rows.length === 0) return res.status(404).json({ error: "Account not found" });

    // Check if workflow_stages already has a NAEF stage for this wo_id
    const stageResult = await db.query(
      `SELECT 1 FROM workflow_stages WHERE wo_id = $1 AND stage_name = 'NAEF' LIMIT 1`,
      [wo_id]
    );
    
    const status =  data?.status ? data.status : stageResult.rows.length === 0 ? 'Draft' : 'Pending';
    
    await db.query(
      `INSERT INTO workflow_stages (wo_id, stage_name, status, assigned_to, created_at, updated_at)
        VALUES ($1, $2, $3, $4, NOW(), NOW())`,
      [wo_id, 'NAEF', status, assignee]
    );
    if (result.rows.length > 0) {
      result.rows[0].assignee = assignee;
    }
    
    res.json(toCamel(result.rows[0]));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
