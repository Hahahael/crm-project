import express from "express";
import db from "../db.js";
import { toSnake } from "../helper/utils.js";
import { poolPromise, poolCrmPromise } from "../mssql.js";

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

    // Enrich account: attach CRM + SPI (kristem, brand, industry, department)
    try {
      const ids = Array.from(
        new Set(
          rows
            .map((r) => r.accountId ?? r.account_id)
            .filter((v) => v !== null && v !== undefined),
        ),
      );
      if (ids.length > 0) {
        const [crmPool, spiPool] = await Promise.all([
          poolCrmPromise,
          poolPromise,
        ]);
        const numericIds = ids
          .map((x) => Number(x))
          .filter((n) => Number.isFinite(n));
        let accountMap = new Map();
        if (numericIds.length > 0) {
          const accSql = `SELECT * FROM crmdb.accounts WHERE id IN (${numericIds.join(",")})`;
          const accRes = await crmPool.request().query(accSql);
          const accounts = accRes.recordset || [];
          accountMap = new Map(accounts.map((a) => [a.id, a]));

          const kIds = Array.from(
            new Set(
              accounts
                .map((a) => a.kristem_customer_id)
                .filter((v) => v !== null && v !== undefined),
            ),
          );
          const bIds = Array.from(
            new Set(
              accounts
                .map((a) => a.product_id)
                .filter((v) => v !== null && v !== undefined),
            ),
          );
          const iIds = Array.from(
            new Set(
              accounts
                .map((a) => a.industry_id)
                .filter((v) => v !== null && v !== undefined),
            ),
          );
          const dIds = Array.from(
            new Set(
              accounts
                .map((a) => a.department_id)
                .filter((v) => v !== null && v !== undefined),
            ),
          );

          const [custRes, brandRes, indRes, deptRes] = await Promise.all([
            kIds.length
              ? spiPool
                  .request()
                  .query(`SELECT * FROM spidb.customer WHERE Id IN (${kIds
                    .map((x) => Number(x))
                    .filter((n) => Number.isFinite(n))
                    .join(",")})`)
              : Promise.resolve({ recordset: [] }),
            bIds.length
              ? spiPool
                  .request()
                  .query(`SELECT * FROM spidb.brand WHERE ID IN (${bIds
                    .map((x) => Number(x))
                    .filter((n) => Number.isFinite(n))
                    .join(",")})`)
              : Promise.resolve({ recordset: [] }),
            iIds.length
              ? spiPool
                  .request()
                  .query(
                    `SELECT * FROM spidb.Customer_Industry_Group WHERE Id IN (${iIds
                      .map((x) => Number(x))
                      .filter((n) => Number.isFinite(n))
                      .join(",")})`,
                  )
              : Promise.resolve({ recordset: [] }),
            dIds.length
              ? spiPool
                  .request()
                  .query(`SELECT * FROM spidb.Department WHERE Id IN (${dIds
                    .map((x) => Number(x))
                    .filter((n) => Number.isFinite(n))
                    .join(",")})`)
              : Promise.resolve({ recordset: [] }),
          ]);

          const custMap = new Map(
            (custRes.recordset || []).map((c) => [String(c.Id), c]),
          );
          const brandMap = new Map(
            (brandRes.recordset || []).map((b) => [String(b.ID), b]),
          );
          const indMap = new Map(
            (indRes.recordset || []).map((i) => [String(i.Id), i]),
          );
          const deptMap = new Map(
            (deptRes.recordset || []).map((d) => [String(d.Id), d]),
          );

          for (const sl of rows) {
            const aid = sl.accountId ?? sl.account_id;
            if (aid != null && accountMap.has(Number(aid))) {
              const acc = accountMap.get(Number(aid));
              sl.account = {
                ...acc,
                kristem: acc.kristem_customer_id
                  ? custMap.get(String(acc.kristem_customer_id)) || null
                  : null,
                brand: acc.product_id
                  ? brandMap.get(String(acc.product_id)) || null
                  : null,
                industry: acc.industry_id
                  ? indMap.get(String(acc.industry_id)) || null
                  : null,
                department: acc.department_id
                  ? deptMap.get(String(acc.department_id)) || null
                  : null,
              };
            } else {
              sl.account = null;
            }
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

    // Enrich single with CRM + SPI
    try {
      const [crmPool, spiPool] = await Promise.all([
        poolCrmPromise,
        poolPromise,
      ]);
      const accId = sl.accountId ?? sl.account_id;
      let account = null;
      if (accId != null) {
        const accRes = await crmPool
          .request()
          .input("id", accId)
          .query("SELECT TOP (1) * FROM crmdb.accounts WHERE id = @id");
        account = accRes.recordset && accRes.recordset[0]
          ? accRes.recordset[0]
          : null;
      }

      if (account) {
        const kristemId = account.kristem_customer_id ?? null;
        const productId = account.product_id ?? null;
        const industryId = account.industry_id ?? null;
        const departmentId = account.department_id ?? null;

        const tasks = [
          kristemId != null
            ? spiPool
                .request()
                .input("kid", kristemId)
                .query("SELECT TOP (1) * FROM spidb.customer WHERE Id = @kid")
            : Promise.resolve(null),
          productId != null
            ? spiPool
                .request()
                .input("bid", productId)
                .query("SELECT TOP (1) * FROM spidb.brand WHERE ID = @bid")
            : Promise.resolve(null),
          industryId != null
            ? spiPool
                .request()
                .input("iid", industryId)
                .query(
                  "SELECT TOP (1) * FROM spidb.Customer_Industry_Group WHERE Id = @iid",
                )
            : Promise.resolve(null),
          departmentId != null
            ? spiPool
                .request()
                .input("did", departmentId)
                .query("SELECT TOP (1) * FROM spidb.Department WHERE Id = @did")
            : Promise.resolve(null),
        ];

        const [kRes, bRes, iRes, dRes] = await Promise.all(tasks);
        const enrichedAccount = {
          ...account,
          kristem: kRes?.recordset?.[0] || null,
          brand: bRes?.recordset?.[0] || null,
          industry: iRes?.recordset?.[0] || null,
          department: dRes?.recordset?.[0] || null,
        };

        return res.json({ ...sl, account: enrichedAccount });
      }
    } catch (enrichErr) {
      console.warn(
        "Failed to enrich sales lead account via MSSQL:",
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
