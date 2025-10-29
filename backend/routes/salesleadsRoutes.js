import express from "express";
import db from "../db.js";
import { toSnake } from "../helper/utils.js";
import { poolPromise } from "../mssql.js";

const router = express.Router();

// Get all sales leads
router.get("/", async (req, res) => {
  try {
    const result = await db.query(`
            SELECT 
                sl.*, 
                u.username AS se_username
            FROM sales_leads sl
            LEFT JOIN users u ON sl.se_id = u.id
            ORDER BY sl.id ASC
        `);
    const rows = result.rows;

    // Enrich account via SPI only (kristem, brand, industry, department)
    try {
      const ids = Array.from(
        new Set(
          rows
            .map((r) => r.accountId ?? r.account_id)
            .filter((v) => v !== null && v !== undefined),
        ),
      );
      if (ids.length > 0) {
        const spiPool = await poolPromise;
        const numericIds = ids
          .map((x) => Number(x))
          .filter((n) => Number.isFinite(n));
        if (numericIds.length > 0) {
          // Load SPI customers
          const custRes = await spiPool
            .request()
            .query(`SELECT * FROM spidb.customer WHERE Id IN (${numericIds.join(",")})`);
          const customers = custRes.recordset || [];
          const customerMap = new Map(customers.map((c) => [Number(c.Id), c]));

          const normId = (v) => {
            const n = Number(v);
            return Number.isFinite(n) ? n : null;
          };
          const brandIds = new Set();
          const indIds = new Set();
          const deptIds = new Set();
          for (const c of customers) {
            const bId =
              normId(c.Product_Brand_Id) ??
              normId(c.ProductBrandId) ??
              normId(c.Brand_ID) ??
              normId(c.BrandId) ??
              null;
            const iId =
              normId(c.Customer_Industry_Group_Id) ??
              normId(c.Industry_Group_Id) ??
              normId(c.IndustryGroupId) ??
              null;
            const dId =
              normId(c.Department_Id) ??
              normId(c.DepartmentID) ??
              normId(c.DepartmentId) ??
              null;
            if (bId != null) brandIds.add(bId);
            if (iId != null) indIds.add(iId);
            if (dId != null) deptIds.add(dId);
          }
          // ensure defaults
          brandIds.add(2);
          deptIds.add(2);

          const [brandRes, indRes, deptRes] = await Promise.all([
            brandIds.size
              ? spiPool
                  .request()
                  .query(`SELECT * FROM spidb.brand WHERE ID IN (${Array.from(brandIds).join(",")})`)
              : Promise.resolve({ recordset: [] }),
            indIds.size
              ? spiPool
                  .request()
                  .query(`SELECT * FROM spidb.Customer_Industry_Group WHERE Id IN (${Array.from(indIds).join(",")})`)
              : Promise.resolve({ recordset: [] }),
            deptIds.size
              ? spiPool
                  .request()
                  .query(`SELECT * FROM spidb.Department WHERE Id IN (${Array.from(deptIds).join(",")})`)
              : Promise.resolve({ recordset: [] }),
          ]);

          const brandMap = new Map((brandRes.recordset || []).map((b) => [Number(b.ID ?? b.Id), b]));
          const industryMap = new Map((indRes.recordset || []).map((i) => [Number(i.Id), i]));
          const departmentMap = new Map((deptRes.recordset || []).map((d) => [Number(d.Id), d]));

          for (const sl of rows) {
            const aid = Number(sl.accountId ?? sl.account_id);
            const cust = Number.isFinite(aid) ? customerMap.get(aid) || null : null;
            if (!cust) {
              sl.account = null;
              continue;
            }
            const bId =
              (normId(cust.Product_Brand_Id) ??
                normId(cust.ProductBrandId) ??
                normId(cust.Brand_ID) ??
                normId(cust.BrandId) ??
                2);
            const iId =
              normId(cust.Customer_Industry_Group_Id) ??
              normId(cust.Industry_Group_Id) ??
              normId(cust.IndustryGroupId) ??
              null;
            const dId =
              (normId(cust.Department_Id) ??
                normId(cust.DepartmentID) ??
                normId(cust.DepartmentId) ??
                2);
            sl.account = {
              kristem: cust,
              brand: brandMap.get(bId) || null,
              industry: iId != null ? industryMap.get(iId) || null : null,
              department: departmentMap.get(dId) || null,
            };
          }
        }
      }
    } catch (enrichErr) {
      console.warn(
        "Failed to enrich sales leads with account data:",
        enrichErr.message,
      );
    }

    return res.json(rows);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Failed to fetch sales leads" });
  }
});

// Get single sales lead
router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const result = await db.query(
      `
            SELECT 
                sl.*, 
                u.username AS se_username
            FROM sales_leads sl
            LEFT JOIN users u ON sl.se_id = u.id
            WHERE sl.id = $1
        `,
      [id],
    );
    if (result.rows.length === 0)
      return res.status(404).json({ error: "Not found" });
    const sl = result.rows[0];

    // Enrich single with SPI only
    try {
      const spiPool = await poolPromise;
      const accId = Number(sl.accountId ?? sl.account_id);
      let customer = null;
      if (Number.isFinite(accId)) {
        const custRes = await spiPool
          .request()
          .input("id", accId)
          .query("SELECT TOP (1) * FROM spidb.customer WHERE Id = @id");
        customer = custRes.recordset && custRes.recordset[0] ? custRes.recordset[0] : null;
      }

      if (customer) {
        const normId = (v) => {
          const n = Number(v);
          return Number.isFinite(n) ? n : null;
        };
        const bId =
          (normId(customer.Product_Brand_Id) ??
            normId(customer.ProductBrandId) ??
            normId(customer.Brand_ID) ??
            normId(customer.BrandId) ??
            2);
        const iId =
          normId(customer.Customer_Industry_Group_Id) ??
          normId(customer.Industry_Group_Id) ??
          normId(customer.IndustryGroupId) ??
          null;
        const dId =
          (normId(customer.Department_Id) ??
            normId(customer.DepartmentID) ??
            normId(customer.DepartmentId) ??
            2);

        const [bRes, iRes, dRes] = await Promise.all([
          spiPool
            .request()
            .input("bid", bId)
            .query("SELECT TOP (1) * FROM spidb.brand WHERE ID = @bid"),
          iId != null
            ? spiPool
                .request()
                .input("iid", iId)
                .query(
                  "SELECT TOP (1) * FROM spidb.Customer_Industry_Group WHERE Id = @iid",
                )
            : Promise.resolve({ recordset: [] }),
          spiPool
            .request()
            .input("did", dId)
            .query("SELECT TOP (1) * FROM spidb.Department WHERE Id = @did"),
        ]);

        const account = {
          kristem: customer,
          brand: bRes.recordset && bRes.recordset[0] ? bRes.recordset[0] : null,
          industry: iRes.recordset && iRes.recordset[0] ? iRes.recordset[0] : null,
          department: dRes.recordset && dRes.recordset[0] ? dRes.recordset[0] : null,
        };

        return res.json({ ...sl, account });
      }
    } catch (enrichErr) {
      console.warn(
        "Failed to enrich sales lead account via MSSQL SPI:",
        enrichErr.message,
      );
    }

    return res.json(sl);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Failed to fetch sales lead" });
  }
});

// Check if a sales lead exists for a given workorder
router.get("/exists/workorder/:woId", async (req, res) => {
  try {
    const { woId } = req.params;
    const result = await db.query(
      `SELECT id FROM sales_leads WHERE wo_id = $1 LIMIT 1`,
      [woId],
    );
    return res.json({ exists: result.rows.length > 0 });
  } catch (err) {
    console.error(err);
    return res
      .status(500)
      .json({ error: "Failed to check sales lead existence" });
  }
});

// Create new sales lead
router.post("/", async (req, res) => {
  try {
    const body = toSnake(req.body);
    console.log("Creating skeletal sales lead with data:", body);
    // Only require wo_id and assignee, set sales_stage to 'Draft' by default
    const wo_id = body.wo_id;
    const assignee = body.assignee;
    const account_id = body.account_id;
    const sales_stage = body.sales_stage || "Draft";
    const contact_person = body.contact_person || null;
    const contact_number = body.contact_number || null;

    // Generate SL number
    const currentYear = new Date().getFullYear();
    const result = await db.query(
      `SELECT sl_number 
                                FROM sales_leads 
                                WHERE sl_number LIKE $1
                                ORDER BY sl_number DESC
                                LIMIT 1`,
      [`FSL-${currentYear}-%`],
    );

    let newCounter = 1;
    if (result.rows.length > 0) {
      const lastSlNumber = result.rows[0].slNumber;
      const lastCounter = parseInt(lastSlNumber.split("-")[2], 10);
      newCounter = lastCounter + 1;
    }

    const sl_number = `FSL-${currentYear}-${String(newCounter).padStart(4, "0")}`;

    // Insert skeletal sales lead, all other fields default to null
    const insertResult = await db.query(
      `INSERT INTO sales_leads 
                                (sl_number, sales_stage, wo_id, assignee, created_at, updated_at, account_id, immediate_support, contact_number)
                                VALUES ($1, $2, $3, $4, NOW(), NOW(), $5, $6, $7)
                                RETURNING id`,
      [
        sl_number,
        sales_stage,
        wo_id,
        assignee,
        account_id,
        contact_person,
        contact_number,
      ],
    );
    const newId = insertResult.rows[0].id;

    // Update linked Work Order stage_status to 'In Progress'
    if (wo_id) {
      try {
        await db.query(
          `UPDATE workorders SET stage_status = $1, updated_at = NOW() WHERE id = $2`,
          ["In Progress", wo_id],
        );
      } catch (woErr) {
        console.warn("Failed to update workorder stage_status to In Progress:", woErr.message);
      }
    }

    // Return the new skeletal sales lead
    const final = await db.query(
      `SELECT sl.*, u.username AS se_username
                                FROM sales_leads sl
                                LEFT JOIN users u ON sl.se_id = u.id
                                WHERE sl.id = $1`,
      [newId],
    );

    return res.status(201).json(final.rows[0]);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Failed to create sales lead" });
  }
});

// Update existing sales lead
router.put("/approved/:id", async (req, res) => {
  try {
    const { id } = req.params;
    // Add all fields you want to update here
    const updateResult = await db.query(
      `UPDATE sales_leads 
                        SET 
                                done_date=NOW()
                        WHERE id=$1
                        RETURNING id`,
      [id],
    );
    const updatedId = updateResult.rows[0].id;
    const result = await db.query(
      `SELECT sl.*, u.username AS se_username
        FROM sales_leads sl
        LEFT JOIN users u ON sl.se_id = u.id
        WHERE sl.id = $1`,
      [updatedId],
    );
    if (result.rows.length === 0)
      return res.status(404).json({ error: "Not found" });
    return res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Failed to update sales lead" });
  }
});

// Update existing sales lead
router.put("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const body = toSnake(req.body);
    console.log("Updating sales lead ID", id, "with data:", body);
    // Add all fields you want to update here
    const updateResult = await db.query(
      `UPDATE sales_leads 
        SET 
          stage_status = COALESCE($1, stage_status),
          contact_number = $2,
          sales_stage = $3,
          designation = $4,
          immediate_support = $5,
          email_address = $6,
          category = $7,
          application = $8,
          machine = $9,
          machine_process = $10,
          needed_product = $11,
          existing_specifications = $12,
          issues_with_existing = $13,
          consideration = $14,
          support_needed = $15,
          urgency = $16,
          model_to_quote = $17,
          quantity = $18,
          quantity_attention = $19,
          qr_cc = $20,
          qr_email_to = $21,
          next_followup_date = $22,
          due_date = $23,
          fsl_date = $24,
          fsl_time = $25,
          fsl_location = $26,
          ww = $27,
          requirement = $28,
          requirement_category = $29,
          deadline = $30,
          product_application = $31,
          customer_issues = $32,
          existing_setup_items = $33,
          customer_suggested_setup = $34,
          remarks = $35,
          updated_at = NOW()
        WHERE id=$36
        RETURNING id`,
      [
        body.stage_status || null,
        body.contact_number,
        body.sales_stage,
        body.designation,
        body.immediate_support,
        body.email_address,
        body.category,
        body.application,
        body.machine,
        body.machine_process,
        body.needed_product,
        body.existing_specifications,
        body.issues_with_existing,
        body.consideration,
        body.support_needed,
        body.urgency,
        body.model_to_quote,
        body.quantity,
        body.quantity_attention,
        body.qr_cc,
        body.qr_email_to,
        body.next_followup_date,
        body.due_date,
        body.fsl_date,
        body.fsl_time,
        body.fsl_location,
        body.ww,
        body.requirement,
        body.requirement_category,
        body.deadline,
        body.product_application,
        body.customer_issues,
        body.existing_setup_items,
        body.customer_suggested_setup,
        body.remarks,
        id,
      ],
    );
    const updatedId = updateResult.rows[0].id;
    const result = await db.query(
      `SELECT sl.*, u.username AS se_username
                                FROM sales_leads sl
                                LEFT JOIN users u ON sl.se_id = u.id
                                WHERE sl.id = $1`,
      [updatedId],
    );
    if (result.rows.length === 0)
      return res.status(404).json({ error: "Not found" });
    return res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Failed to update sales lead" });
  }
});

export default router;
