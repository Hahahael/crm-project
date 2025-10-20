import express from "express";
import db from "../mocks/dbMock.js";
// utils not needed in MSSQL-only routes
import { poolPromise, poolCrmPromise } from "../mssql.js";
import { generateNextNaefCode } from "../helper/spiCodeGen.js";
import { toSnake } from "../helper/utils.js";

const router = express.Router();

// GET all accounts (enriched with SPI lookups)
router.get("/", async (req, res) => {
  try {
    // 1) Connect to CRM + SPI
    const [crmPool, spiPool] = await Promise.all([poolCrmPromise, poolPromise]);

    // 2) Fetch all CRM accounts
    const accSql = `SELECT * FROM crmdb.accounts ORDER BY created_at DESC`;
    const accRes = await crmPool.request().query(accSql);
    const crmAccounts = accRes.recordset || [];
    if (crmAccounts.length === 0) return res.json([]);

    // 3) Collect lookup ids
    const kIds = [...new Set(crmAccounts.map((a) => a.kristem_customer_id).filter(Boolean))];
    const bIds = [...new Set(crmAccounts.map((a) => a.product_id).filter(Boolean))];
    const iIds = [...new Set(crmAccounts.map((a) => a.industry_id).filter(Boolean))];
    const dIds = [...new Set(crmAccounts.map((a) => a.department_id).filter(Boolean))];

    // 4) Fetch SPI lookups in batch
    const [custRes, brandRes, indRes, deptRes] = await Promise.all([
      kIds.length
        ? spiPool.request().query(`SELECT * FROM spidb.customer WHERE Id IN (${kIds.join(",")})`)
        : Promise.resolve({ recordset: [] }),
      bIds.length
        ? spiPool.request().query(`SELECT * FROM spidb.brand WHERE ID IN (${bIds.join(",")})`)
        : Promise.resolve({ recordset: [] }),
      iIds.length
        ? spiPool
            .request()
            .query(`SELECT * FROM spidb.Customer_Industry_Group WHERE Id IN (${iIds.join(",")})`)
        : Promise.resolve({ recordset: [] }),
      dIds.length
        ? spiPool.request().query(`SELECT * FROM spidb.Department WHERE Id IN (${dIds.join(",")})`)
        : Promise.resolve({ recordset: [] }),
    ]);

    // 5) Build maps
    const customerMap = new Map((custRes.recordset || []).map((c) => [String(c.Id), c]));
    const brandMap = new Map((brandRes.recordset || []).map((b) => [String(b.ID), b]));
    const industryMap = new Map((indRes.recordset || []).map((i) => [String(i.Id), i]));
    const departmentMap = new Map((deptRes.recordset || []).map((d) => [String(d.Id), d]));

    // 6) Enrich
    const enriched = crmAccounts.map((acc) => ({
      ...acc,
      kristem: acc.kristem_customer_id
        ? customerMap.get(String(acc.kristem_customer_id)) || null
        : null,
      brand: acc.product_id ? brandMap.get(String(acc.product_id)) || null : null,
      industry: acc.industry_id ? industryMap.get(String(acc.industry_id)) || null : null,
      department: acc.department_id ? departmentMap.get(String(acc.department_id)) || null : null,
    }));

    return res.json(enriched);
  } catch (err) {
    console.error("/api/accounts error:", err);
    return res.status(500).json({ error: err.message });
  }
});

// GET all NAEF accounts (MSSQL only)
router.get("/naefs", async (req, res) => {
  try {
    console.log("Fetching NAEF records...");

    // 1️⃣ Connect to CRM + SPI databases
    const [crmPool, spiPool] = await Promise.all([poolCrmPromise, poolPromise]);

    // 2️⃣ Fetch CRM accounts with is_naef = 1
    const accSql = `SELECT * FROM crmdb.accounts WHERE is_naef = 1 ORDER BY created_at DESC`;
    const accRes = await crmPool.request().query(accSql);
    const crmAccounts = accRes.recordset || [];
    console.log("Fetched CRM accounts for NAEFs:", crmAccounts.length);

    if (crmAccounts.length === 0) {
      return res.json([]); // No NAEFs found
    }

    // 3️⃣ Collect distinct SPI lookup IDs
    const kIds = [...new Set(crmAccounts.map(a => a.kristem_customer_id).filter(Boolean))];
    const bIds = [...new Set(crmAccounts.map(a => a.product_id).filter(Boolean))];
    const iIds = [...new Set(crmAccounts.map(a => a.industry_id).filter(Boolean))];
    const dIds = [...new Set(crmAccounts.map(a => a.department_id).filter(Boolean))];

    // 4️⃣ Fetch SPI lookups in batch
    const [custRes, brandRes, indRes, deptRes] = await Promise.all([
      kIds.length
        ? spiPool.request().query(`SELECT * FROM spidb.customer WHERE Id IN (${kIds.join(",")})`)
        : Promise.resolve({ recordset: [] }),
      bIds.length
        ? spiPool.request().query(`SELECT * FROM spidb.brand WHERE ID IN (${bIds.join(",")})`)
        : Promise.resolve({ recordset: [] }),
      iIds.length
        ? spiPool
            .request()
            .query(
              `SELECT * FROM spidb.Customer_Industry_Group WHERE Id IN (${iIds.join(",")})`,
            )
        : Promise.resolve({ recordset: [] }),
      dIds.length
        ? spiPool.request().query(`SELECT * FROM spidb.Department WHERE Id IN (${dIds.join(",")})`)
        : Promise.resolve({ recordset: [] }),
    ]);

    console.log("Fetched SPI lookups for NAEF accounts");

    // 5️⃣ Build lookup maps
    const customerMap = new Map((custRes.recordset || []).map(c => [String(c.Id), c]));
    const brandMap = new Map((brandRes.recordset || []).map(b => [String(b.ID), b]));
    const industryMap = new Map((indRes.recordset || []).map(i => [String(i.Id), i]));
    const departmentMap = new Map((deptRes.recordset || []).map(d => [String(d.Id), d]));

    // 6️⃣ Enrich accounts
    const enrichedAccounts = crmAccounts.map(acc => ({
      ...acc,
      kristem: acc.kristem_customer_id
        ? customerMap.get(String(acc.kristem_customer_id)) || null
        : null,
      brand: acc.product_id ? brandMap.get(String(acc.product_id)) || null : null,
      industry: acc.industry_id ? industryMap.get(String(acc.industry_id)) || null : null,
      department: acc.department_id
        ? departmentMap.get(String(acc.department_id)) || null
        : null,
    }));

    console.log("Returning NAEF accounts:", enrichedAccounts.length);
    return res.json(enrichedAccounts);
  } catch (err) {
    console.error("/api/accounts/naefs error:", err);
    return res.status(500).json({ error: err.message });
  }
});

// GET all account industries
router.get("/industries", async (req, res) => {
  try {
    // Prefer MSSQL Customer_Industry_Group as the source of truth
    try {
      const pool = await poolPromise;
      const r = await pool
        .request()
        .query(
          "SELECT Id, Code, Description, Industry_Group_Id, isActive FROM spidb.Customer_Industry_Group ORDER BY Description",
        );
      const rows = r.recordset || [];
      console.log("Fetched MSSQL industries:", rows.length);
      return res.json(rows);
    } catch (merr) {
      console.warn("MSSQL industries fetch failed, falling back to PSQL:", merr.message);
      const result = await db.query("SELECT * FROM account_industries");
      return res.json(result.rows);
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET all accounts product brands
router.get("/product-brands", async (req, res) => {
  try {
    try {
      const pool = await poolPromise;
      const r = await pool
        .request()
        .query(
          "SELECT ID, Code, [Description], ModifiedBy, DateModified, commrate FROM spidb.brand ORDER BY [Description]",
        );
      const rows = r.recordset || [];
      console.log("Fetched MSSQL brands:", rows.length);
      return res.json(rows);
    } catch (merr) {
      console.warn("MSSQL brands fetch failed, falling back to PSQL:", merr.message);
      const result = await db.query("SELECT * FROM account_product_brands");
      return res.json(result.rows);
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET all accounts departments
router.get("/departments", async (req, res) => {
  try {
    try {
      const pool = await poolPromise;
      const r = await pool
        .request()
        .query(
          "SELECT Id, Department, Code FROM spidb.Department ORDER BY Department",
        );
      const rows = r.recordset || [];
      console.log("Fetched MSSQL departments:", rows.length);
      return res.json(rows);
    } catch (merr) {
      console.warn("MSSQL departments fetch failed, falling back to PSQL:", merr.message);
      const result = await db.query("SELECT * FROM account_departments");
      return res.json(result.rows);
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET single account by id
router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    console.log("Fetching account by id:", id);
    const [crmPool, spiPool] = await Promise.all([poolCrmPromise, poolPromise]);

    // 1) Fetch the CRM account by id
    const accRes = await crmPool
      .request()
      .input("id", id)
      .query("SELECT TOP (1) * FROM crmdb.accounts WHERE id = @id");
    const account = accRes.recordset && accRes.recordset[0];
    if (!account) return res.status(404).json({ error: "Account not found" });

    console.log("Fetched CRM account:", account);

    // 2) Prepare lookups
    const kristemId = account.kristem_customer_id ?? null;
    const productId = account.product_id ?? null;
    const industryId = account.industry_id ?? null;
    const departmentId = account.department_id ?? null;

    let kristem = null;
    let brand = null;
    let industry = null;
    let department = null;

    try {
      const tasks = [];
      if (kristemId != null) {
        tasks.push(
          spiPool
            .request()
            .input("kid", kristemId)
            .query("SELECT TOP (1) * FROM spidb.customer WHERE Id = @kid"),
        );
      } else tasks.push(Promise.resolve(null));

      if (productId != null) {
        tasks.push(
          spiPool
            .request()
            .input("bid", productId)
            .query("SELECT TOP (1) * FROM spidb.brand WHERE ID = @bid"),
        );
      } else tasks.push(Promise.resolve(null));

      if (industryId != null) {
        tasks.push(
          spiPool
            .request()
            .input("iid", industryId)
            .query(
              "SELECT TOP (1) * FROM spidb.Customer_Industry_Group WHERE Id = @iid",
            ),
        );
      } else tasks.push(Promise.resolve(null));

      if (departmentId != null) {
        tasks.push(
          spiPool
            .request()
            .input("did", departmentId)
            .query(
              "SELECT TOP (1) * FROM spidb.Department WHERE Id = @did",
            ),
        );
      } else tasks.push(Promise.resolve(null));

      const [kRes, bRes, iRes, dRes] = await Promise.all(tasks);
      kristem = kRes && kRes.recordset && kRes.recordset[0] ? kRes.recordset[0] : null;
      brand = bRes && bRes.recordset && bRes.recordset[0] ? bRes.recordset[0] : null;
      industry = iRes && iRes.recordset && iRes.recordset[0] ? iRes.recordset[0] : null;
      department = dRes && dRes.recordset && dRes.recordset[0] ? dRes.recordset[0] : null;
    } catch (lkErr) {
      console.warn("Lookup fetch failed for single account:", lkErr.message);
    }

    console.log("Returning account with lookups:", id);
    console.log("Account with lookups:", { ...account, kristem, brand, industry, department });

    return res.json({ ...account, kristem, brand, industry, department });
  } catch (err) {
    console.error("/api/accounts/:id error:", err);
    res.status(500).json({ error: err.message });
  }
});

// ADD new account
router.post("/", async (req, res) => {
  console.log("POST /api/accounts called");
  console.log("Request body:", req.body);
  // Expected body shape:
  // { spi: { ...spidb.customer columns... }, crm: { ...crmdb.accounts columns... } }
  // We'll insert SPI first, then CRM (adding kristem_customer_id if missing), using separate transactions.
  try {
    const spiInput = {
      Name: req.body?.accountName ?? "NOT_SET",
      Address: "NOT_SET",
      PhoneNumber: "NOT_SET",
      EmailAddress: "NOT_SET",
      VAT_Type_Id: -1,
      Price_Basis_Id: -1,
      PaymentTerms: -1,
      Currency_Id: -1,
    };
    const crmInput = {
      stage_status: "New",
      date_created: new Date(),
      requested_by: req.body?.contact_person || "system",
      department_id: req.body?.department_id || null,
      account_name: req.body?.accountName || "NOT_SET",
      industry_id: req.body?.industry_id || null,
      product_id: req.body?.product_id || null,
    };

    if (!spiInput || Object.keys(spiInput).length === 0) {
      return res.status(400).json({ error: "spi payload is required" });
    }

    // Allowed columns for spidb.customer
    const SPI_ALLOWED = new Set([
      "Code",
      "Name",
      "Address",
      "PhoneNumber",
      "EmailAddress",
      "VAT_Type_Id",
      "Price_Basis_Id",
      "Customer_Location_Id",
      "PaymentTerms",
      "Currency_Id",
      "Customer_Industry_Group_Id",
      "Sales_Agent_Id",
      "ChargeTo",
      "TinNo",
      "Customer_Market_Segment_Group_Id",
      "Category",
    ]);

    // Filter SPI input
    const spiData = Object.fromEntries(
      Object.entries(spiInput).filter(([k]) => SPI_ALLOWED.has(k)),
    );
    if (!spiData.Name && !spiData.Code) {
      return res
        .status(400)
        .json({ error: "SPI customer requires at least Name or Code" });
    }

    console.log("Preparing to create new account with SPI data:", spiData);

    const [crmPool, spiPool] = await Promise.all([poolCrmPromise, poolPromise]);

    const spiTx = spiPool.transaction();

    console.log("Preparing to create new account with CRM data:", crmInput);

    const crmTx = crmPool.transaction();

    console.log("Starting transactions...");

    let insertedSpi = null;
    let insertedCrm = null;

    console.log("Beginning transactions for account creation...");

    try {
      // Begin both transactions
      await spiTx.begin();
      await crmTx.begin();

      // SPI insert (ensure Code)
      const spiReq = spiTx.request();
      const spiCols = Object.keys(spiData);
      const spiParams = spiCols.map((_, i) => `@s${i}`);
      spiCols.forEach((k, i) => spiReq.input(`s${i}`, spiData[k]));
      // Auto-generate Code if missing or not matching expected pattern
      if (!spiData.Code || !/^NAEF-\d{4}-\d{4}$/.test(String(spiData.Code))) {
        const { code } = await generateNextNaefCode(spiTx, new Date().getFullYear());
        spiCols.push("Code");
        spiParams.push("@s_code");
        spiReq.input("s_code", code);
      }
      const spiSql = `INSERT INTO spidb.customer (${spiCols
        .map((c) => `[${c}]`)
        .join(", ")}) OUTPUT INSERTED.* VALUES (${spiParams.join(", ")})`;
      const spiRes = await spiReq.query(spiSql);
      insertedSpi = spiRes.recordset?.[0] || null;
      if (!insertedSpi) throw new Error("Failed to insert SPI customer");

      // CRM insert (ensure kristem_customer_id present)
      const crmData = { ...crmInput };
      if (insertedSpi?.Id != null && crmData.kristem_customer_id == null) {
        crmData.kristem_customer_id = insertedSpi.Id;
      }
      const crmReq = crmTx.request();
      const crmCols = Object.keys(crmData);
      if (crmCols.length === 0) {
        throw new Error("CRM payload is required to create CRM account");
      }
      const crmParams = crmCols.map((_, i) => `@c${i}`);
      crmCols.forEach((k, i) => crmReq.input(`c${i}`, crmData[k]));
      const crmSql = `INSERT INTO crmdb.accounts (${crmCols
        .map((c) => `[${c}]`)
        .join(", ")}) OUTPUT INSERTED.* VALUES (${crmParams.join(", ")})`;
      const crmRes = await crmReq.query(crmSql);
      insertedCrm = crmRes.recordset?.[0] || null;
      if (!insertedCrm) throw new Error("Failed to insert CRM account");

      // Commit both (commit CRM first)
      await crmTx.commit();
      await spiTx.commit();
    } catch (innerErr) {
      // Rollback both transactions on failure
      try {
        if (crmTx._aborted !== true) await crmTx.rollback();
      } catch (r1) {
        console.warn("CRM transaction rollback error:", r1?.message || r1);
      }
      try {
        if (spiTx._aborted !== true) await spiTx.rollback();
      } catch (r2) {
        console.warn("SPI transaction rollback error:", r2?.message || r2);
      }
      throw innerErr;
    }

    return res.status(201).json({ ...insertedCrm, kristem: insertedSpi });
  } catch (err) {
    console.error("POST /api/accounts error:", err);
    return res.status(500).json({ error: err.message });
  }
});

// UPDATE CRM account and linked NAEF
router.put("/naef/:id", async (req, res) => {
  try {
    const { id } = req.params; // CRM account Id
    console.log("PUT /api/accounts/naef/:id called for CRM id:", id);
    console.log("Request body:", req.body);
    let body = toSnake(req.body);
    // Expected body shape (selected fields):
    // CRM updates: requested_by, departmentId, industryId, productBrandId, stageStatus, dueDate, prepared_by
    // NAEF updates: naefId or woId, stageStatus, assignee, contactPerson, contactNumber, contactEmail, title, dueDate
    const crmInput = {
      requested_by: req.body?.requested_by || "system",
      stage_status: req.body?.stage_status ?? undefined,
      due_date: req.body?.due_date ?? undefined,
      prepared_by: req.body?.prepared_by ?? undefined,
      validity_period: req.body?.validity_period ?? undefined,
      designation: req.body?.designation ?? undefined,
      contract_period: req.body?.contract_period ?? undefined,
      account_designation: req.body?.account_designation ?? undefined,
      contact_number: req.body?.contact_number ?? undefined,
      location: req.body?.location ?? undefined,
      email_address: req.body?.email_address ?? undefined,
      address: req.body?.address ?? undefined,
      buyer_incharge: req.body?.buyer_incharge ?? undefined,
      trunkline: req.body?.trunkline ?? undefined,
      contract_number: req.body?.contract_number ?? undefined,
      process: req.body?.process ?? undefined,
      secondary_email_address: req.body?.secondary_email_address ?? undefined,
      machines: req.body?.machines ?? undefined,
      reason_to_apply: req.body?.reason_to_apply ?? undefined,
      automotive_section: req.body?.automotive_section ?? undefined,
      source_of_inquiry: req.body?.source_of_inquiry ?? undefined,
      commodity: req.body?.commodity ?? undefined,
      business_activity: req.body?.business_activity ?? undefined,
      model: req.body?.model ?? undefined,
      annual_target_sales: req.body?.annual_target_sales ?? undefined,
      population: req.body?.population ?? undefined,
      source_of_target: req.body?.source_of_target ?? undefined,
      existing_bellows: req.body?.existing_bellows ?? undefined,
      products_to_order: req.body?.products_to_order ?? undefined,
      model_under: req.body?.model_under ?? undefined,
      target_areas: req.body?.target_areas ?? undefined,
      analysis: req.body?.analysis ?? undefined,
      from_date: req.body?.from_date ?? undefined,
      to_date: req.body?.to_date ?? undefined,
      activity_period: req.body?.activity_period ?? undefined,
      noted_by: req.body?.noted_by ?? undefined,
      approved_by: req.body?.approved_by ?? undefined,
      received_by: req.body?.received_by ?? undefined,
      acknowledged_by: req.body?.acknowledged_by ?? undefined,
      updated_at: new Date()
    };

    const [crmPool] = await Promise.all([poolCrmPromise]);

    const crmTx = crmPool.transaction();

    let updatedCrm = null;
    let kristemId = null;

    try {
      await crmTx.begin();

      // 1) Update CRM account (if fields provided). Always fetch current to know kristem id
      const currentCrmRes = await crmTx
        .request()
        .input("id", id)
        .query("SELECT TOP (1) * FROM crmdb.accounts WHERE id = @id");
      const currentCrm = currentCrmRes.recordset?.[0] || null;
      if (!currentCrm) throw new Error("Account not found");

      kristemId = currentCrm.kristem_customer_id ?? null;

      // Filter undefined values out of crmInput
      const filteredCrm = Object.fromEntries(
        Object.entries(crmInput).filter(([, v]) => v !== undefined),
      );
      if (filteredCrm && Object.keys(filteredCrm).length > 0) {
        const cols = Object.keys(filteredCrm);
        const reqC = crmTx.request();
        const set = cols.map((k, i) => `[${k}] = @c${i}`);
        cols.forEach((k, i) => reqC.input(`c${i}`, filteredCrm[k]));
        reqC.input("id", id);
        const sqlC = `UPDATE crmdb.accounts SET ${set.join(", ")} OUTPUT INSERTED.* WHERE id = @id`;
        const uRes = await reqC.query(sqlC);
        updatedCrm = uRes.recordset?.[0] || currentCrm;
        kristemId = updatedCrm.kristem_customer_id ?? kristemId;
      } else {
        updatedCrm = currentCrm;
      }
      await crmTx.commit();
    } catch (innerErr) {
      try {
        if (crmTx._aborted !== true) await crmTx.rollback();
      } catch (r1) {
        console.warn("CRM rollback error:", r1?.message || r1);
      }
      throw innerErr;
    }

    // 2) Enrich like GET /:id
    const spiReq = (await poolPromise).request();
    const pid = updatedCrm.product_id ?? null;
    const iid = updatedCrm.industry_id ?? null;
    const did = updatedCrm.department_id ?? null;

    const lookups = await Promise.all([
      kristemId
        ? spiReq.input("kid2", kristemId).query("SELECT TOP (1) * FROM spidb.customer WHERE Id = @kid2")
        : Promise.resolve(null),
      pid
        ? (await poolPromise)
            .request()
            .input("bid2", pid)
            .query("SELECT TOP (1) * FROM spidb.brand WHERE ID = @bid2")
        : Promise.resolve(null),
      iid
        ? (await poolPromise)
            .request()
            .input("iid2", iid)
            .query("SELECT TOP (1) * FROM spidb.Customer_Industry_Group WHERE Id = @iid2")
        : Promise.resolve(null),
      did
        ? (await poolPromise)
            .request()
            .input("did2", did)
            .query("SELECT TOP (1) * FROM spidb.Department WHERE Id = @did2")
        : Promise.resolve(null),
    ]);

    const kristem = lookups[0]?.recordset?.[0] || null;
    const brand = lookups[1]?.recordset?.[0] || null;
    const industry = lookups[2]?.recordset?.[0] || null;
    const department = lookups[3]?.recordset?.[0] || null;

    // 3) Update NAEF row if naefId or woId provided
    const naefId = body.naefId || null;
    const woId = body.woId || null;
    const naefStageStatus = body.stageStatus;
    const naefAssignee = body.assignee;
    const contactPerson = body.contactPerson;
    const contactNumber = body.contactNumber;
    const contactEmail = body.contactEmail;
    const title = body.title;
    const projectEndDate = body.dueDate;

    let updatedNaef = null;
    try {
      if (naefId || woId) {
        const sets = [];
        const vals = [];
        if (naefStageStatus !== undefined) {
          sets.push(`stage_status = $${sets.length + 1}`);
          vals.push(naefStageStatus);
        }
        if (naefAssignee !== undefined) {
          sets.push(`assignee = $${sets.length + 1}`);
          vals.push(naefAssignee);
        }
        if (contactPerson !== undefined) {
          sets.push(`contact_person = $${sets.length + 1}`);
          vals.push(contactPerson);
        }
        if (contactNumber !== undefined) {
          sets.push(`contact_number = $${sets.length + 1}`);
          vals.push(contactNumber);
        }
        if (contactEmail !== undefined) {
          sets.push(`contact_email = $${sets.length + 1}`);
          vals.push(contactEmail);
        }
        if (title !== undefined) {
          sets.push(`title = $${sets.length + 1}`);
          vals.push(title);
        }
        if (projectEndDate !== undefined) {
          sets.push(`project_end_date = $${sets.length + 1}`);
          vals.push(projectEndDate);
        }

        if (sets.length > 0) {
          let whereClause = "";
          if (naefId) {
            whereClause = `id = $${sets.length + 1}`;
            vals.push(naefId);
          } else {
            whereClause = `wo_id = $${sets.length + 1}`;
            vals.push(woId);
          }
          const sql = `UPDATE naef SET ${sets.join(", ")} WHERE ${whereClause} RETURNING *`;
          const u = await db.query(sql, vals);
          updatedNaef = u.rows?.[0] || null;
        }
      }
    } catch (nErr) {
      console.warn("Failed to update NAEF row:", nErr.message);
    }

    return res.json({ ...updatedCrm, kristem, brand, industry, department, naef: updatedNaef });
  } catch (err) {
    console.error("PUT /api/accounts/:id error:", err);
    return res.status(500).json({ error: err.message });
  }
});

// UPDATE account from approval module
router.put("/approval/:id", async (req, res) => {
  try {
    console.log("PUT /api/accounts/approval/:id called");
    const { id } = req.params; // CRM account Id
    console.log("Request body:", req.body);
    // Expected body shape:
    // { spi: { ...spidb.customer columns... }, crm: { ...crmdb.accounts columns... } }
    // We'll update CRM first, then SPI (using kristem_customer_id), using separate transactions.
    const crmInput = {
      is_naef: req.body?.isNaef || true,
      stage_status: req.body?.stageStatus || "Draft",
      due_date: req.body?.dueDate || null,
      wo_id: req.body?.woId || null,
      prepared_by: req.body?.assignee || null,
    };

    const [crmPool] = await Promise.all([poolCrmPromise]);

    const crmTx = crmPool.transaction();

  let updatedCrm = null;
    let kristemId = null;

    try {
      await crmTx.begin();

      // 1) Update CRM account (if fields provided). Always fetch current to know kristem id
      const currentCrmRes = await crmTx
        .request()
        .input("id", id)
        .query("SELECT TOP (1) * FROM crmdb.accounts WHERE id = @id");
      const currentCrm = currentCrmRes.recordset?.[0] || null;
      if (!currentCrm) throw new Error("Account not found");

      kristemId = currentCrm.kristem_customer_id ?? null;

      if (crmInput && Object.keys(crmInput).length > 0) {
        const cols = Object.keys(crmInput);
        const reqC = crmTx.request();
        const set = cols.map((k, i) => `[${k}] = @c${i}`);
        cols.forEach((k, i) => reqC.input(`c${i}`, crmInput[k]));
        reqC.input("id", id);
        const sqlC = `UPDATE crmdb.accounts SET ${set.join(", ")} OUTPUT INSERTED.* WHERE id = @id`;
        const uRes = await reqC.query(sqlC);
        updatedCrm = uRes.recordset?.[0] || currentCrm;
        kristemId = updatedCrm.kristem_customer_id ?? kristemId;
      } else {
        updatedCrm = currentCrm;
      }

      await crmTx.commit();
    } catch (innerErr) {
      try {
        if (crmTx._aborted !== true) await crmTx.rollback();
      } catch (r1) {
        console.warn("CRM rollback error:", r1?.message || r1);
      }
      throw innerErr;
    }

  // 3) Enrich like GET /:id
    const spiReq = (await poolPromise).request();
    const pid = updatedCrm.product_id ?? null;
    const iid = updatedCrm.industry_id ?? null;
    const did = updatedCrm.department_id ?? null;

    const lookups = await Promise.all([
      kristemId
        ? spiReq.input("kid2", kristemId).query("SELECT TOP (1) * FROM spidb.customer WHERE Id = @kid2")
        : Promise.resolve(null),
      pid
        ? (await poolPromise)
            .request()
            .input("bid2", pid)
            .query("SELECT TOP (1) * FROM spidb.brand WHERE ID = @bid2")
        : Promise.resolve(null),
      iid
        ? (await poolPromise)
            .request()
            .input("iid2", iid)
            .query("SELECT TOP (1) * FROM spidb.Customer_Industry_Group WHERE Id = @iid2")
        : Promise.resolve(null),
      did
        ? (await poolPromise)
            .request()
            .input("did2", did)
            .query("SELECT TOP (1) * FROM spidb.Department WHERE Id = @did2")
        : Promise.resolve(null),
    ]);

    const kristem = lookups[0]?.recordset?.[0] || null;
    const brand = lookups[1]?.recordset?.[0] || null;
    const industry = lookups[2]?.recordset?.[0] || null;
    const department = lookups[3]?.recordset?.[0] || null;

    return res.json({ ...updatedCrm, kristem, brand, industry, department });
  } catch (err) {
    console.error("PUT /api/accounts/:id error:", err);
    return res.status(500).json({ error: err.message });
  }
});

// UPDATE account
router.put("/:id", async (req, res) => {
  try {
    const { id } = req.params; // CRM account Id
    console.log("PUT /api/accounts/:id called for id:", id);
    console.log("Request body:", req.body);
    // Expected body shape:
    // { spi: { ...spidb.customer columns... }, crm: { ...crmdb.accounts columns... } }
    // We'll update CRM first, then SPI (using kristem_customer_id), using separate transactions.
    const spiInput = {
      Name: req.body?.account_name ?? "NOT_SET"
    };
    const crmInput = {
      requested_by: req.body?.contact_person || "system",
      department_id: req.body?.department_id || null,
      industry_id: req.body?.industry_id || null,
      product_id: req.body?.product_id || null,
    };

    const [crmPool, spiPool] = await Promise.all([poolCrmPromise, poolPromise]);

    const crmTx = crmPool.transaction();
    const spiTx = spiPool.transaction();

  let updatedCrm = null;
    let kristemId = null;

    try {
      await crmTx.begin();
      await spiTx.begin();

      // 1) Update CRM account (if fields provided). Always fetch current to know kristem id
      const currentCrmRes = await crmTx
        .request()
        .input("id", id)
        .query("SELECT TOP (1) * FROM crmdb.accounts WHERE id = @id");
      const currentCrm = currentCrmRes.recordset?.[0] || null;
      if (!currentCrm) throw new Error("Account not found");

      kristemId = currentCrm.kristem_customer_id ?? null;

      if (crmInput && Object.keys(crmInput).length > 0) {
        const cols = Object.keys(crmInput);
        const reqC = crmTx.request();
        const set = cols.map((k, i) => `[${k}] = @c${i}`);
        cols.forEach((k, i) => reqC.input(`c${i}`, crmInput[k]));
        reqC.input("id", id);
        const sqlC = `UPDATE crmdb.accounts SET ${set.join(", ")} OUTPUT INSERTED.* WHERE id = @id`;
        const uRes = await reqC.query(sqlC);
        updatedCrm = uRes.recordset?.[0] || currentCrm;
        kristemId = updatedCrm.kristem_customer_id ?? kristemId;
      } else {
        updatedCrm = currentCrm;
      }

      // 2) Update SPI customer if spi payload provided
      if (spiInput && Object.keys(spiInput).length > 0) {
        const SPI_ALLOWED = new Set([
          "Code",
          "Name",
          "Address",
          "PhoneNumber",
          "EmailAddress",
          "VAT_Type_Id",
          "Price_Basis_Id",
          "Customer_Location_Id",
          "PaymentTerms",
          "Currency_Id",
          "Customer_Industry_Group_Id",
          "Sales_Agent_Id",
          "ChargeTo",
          "TinNo",
          "Customer_Market_Segment_Group_Id",
          "Category",
        ]);
        const spiFiltered = Object.fromEntries(
          Object.entries(spiInput).filter(([k]) => SPI_ALLOWED.has(k)),
        );
        // Resolve SPI target Id
        const spiId = spiInput.Id ?? kristemId;
        if (!spiId) throw new Error("SPI target Id not found for update");

        const colsS = Object.keys(spiFiltered);
        if (colsS.length > 0) {
          const reqS = spiTx.request();
          const setS = colsS.map((k, i) => `[${k}] = @s${i}`);
          colsS.forEach((k, i) => reqS.input(`s${i}`, spiFiltered[k]));
          reqS.input("id", spiId);
          const sqlS = `UPDATE spidb.customer SET ${setS.join(", ")} OUTPUT INSERTED.* WHERE Id = @id`;
          await reqS.query(sqlS);
        }
      }

      await crmTx.commit();
      await spiTx.commit();
    } catch (innerErr) {
      try {
        if (crmTx._aborted !== true) await crmTx.rollback();
      } catch (r1) {
        console.warn("CRM rollback error:", r1?.message || r1);
      }
      try {
        if (spiTx._aborted !== true) await spiTx.rollback();
      } catch (r2) {
        console.warn("SPI rollback error:", r2?.message || r2);
      }
      throw innerErr;
    }

    // 3) Enrich like GET /:id
    const spiReq = (await poolPromise).request();
    const pid = updatedCrm.product_id ?? null;
    const iid = updatedCrm.industry_id ?? null;
    const did = updatedCrm.department_id ?? null;

    const lookups = await Promise.all([
      kristemId
        ? spiReq.input("kid2", kristemId).query("SELECT TOP (1) * FROM spidb.customer WHERE Id = @kid2")
        : Promise.resolve(null),
      pid
        ? (await poolPromise)
            .request()
            .input("bid2", pid)
            .query("SELECT TOP (1) * FROM spidb.brand WHERE ID = @bid2")
        : Promise.resolve(null),
      iid
        ? (await poolPromise)
            .request()
            .input("iid2", iid)
            .query("SELECT TOP (1) * FROM spidb.Customer_Industry_Group WHERE Id = @iid2")
        : Promise.resolve(null),
      did
        ? (await poolPromise)
            .request()
            .input("did2", did)
            .query("SELECT TOP (1) * FROM spidb.Department WHERE Id = @did2")
        : Promise.resolve(null),
    ]);

    const kristem = lookups[0]?.recordset?.[0] || null;
    const brand = lookups[1]?.recordset?.[0] || null;
    const industry = lookups[2]?.recordset?.[0] || null;
    const department = lookups[3]?.recordset?.[0] || null;

    return res.json({ ...updatedCrm, kristem, brand, industry, department });
  } catch (err) {
    console.error("PUT /api/accounts/:id error:", err);
    return res.status(500).json({ error: err.message });
  }
});

export default router;
