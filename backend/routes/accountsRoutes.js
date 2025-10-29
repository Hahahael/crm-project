import express from "express";
import db from "../db.js";
import { toSnake } from "../helper/utils.js";
import { poolPromise } from "../mssql.js";

const router = express.Router();

// DANGER: Purge CRM accounts with id >= minId (MSSQL only)
// Usage:
//   DELETE /api/accounts/purge?minId=661&dryRun=true
//   DELETE /api/accounts/purge  { minId: 661, dryRun: false }
// Notes:
//   - Requires MSSQL CRM connection (poolCrmPromise)
//   - Uses a parameterized query to avoid injection
router.delete("/purge", async (req, res) => {
  try {
    const minIdRaw = req.body?.minId ?? req.query.minId ?? 661;
    const dryRunRaw = req.body?.dryRun ?? req.query.dryRun ?? "false";
    const minId = Number(minIdRaw);
    const dryRun = String(dryRunRaw).toLowerCase() === "true";

    if (!Number.isFinite(minId)) {
      return res.status(400).json({ error: "Invalid minId" });
    }

    const [crmPool] = await Promise.all([poolPromise]);

    if (dryRun) {
      const r = await crmPool
        .request()
        .input("minId", minId)
        .query("SELECT COUNT(*) AS cnt FROM spidb.customer WHERE id >= @minId");
      const count = r?.recordset?.[0]?.cnt ?? 0;
      return res.json({ dryRun: true, minId, toDelete: count });
    }

    const del = await crmPool
      .request()
      .input("minId", minId)
      .query("DELETE FROM spidb.customer WHERE id >= @minId");

    const affected = Array.isArray(del?.rowsAffected) ? del.rowsAffected[0] ?? 0 : 0;
    return res.json({ minId, deleted: affected });
  } catch (err) {
    console.error("DELETE /api/accounts/purge error:", err);
    return res.status(500).json({ error: err.message });
  }
});

// GET all accounts (MSSQL customers + Approved PostgreSQL accounts, filtered)
router.get("/", async (req, res) => {
  try {
    // Get existing customers from MSSQL
    const spiPool = await poolPromise;
    const custRes = await spiPool
      .request()
      .query("SELECT * FROM spidb.customer ORDER BY Name");
    const customers = custRes.recordset || [];

    // Get approved PostgreSQL accounts only
    const pgResult = await db.query(`
      SELECT 
        a.*,
        u.username as prepared_by_username
      FROM accounts a
      LEFT JOIN users u ON a.prepared_by = u.id
      WHERE a.stage_status = 'Approved'
      ORDER BY a.created_at DESC
    `);

    // Get kristem_account_ids of unapproved PostgreSQL accounts (to exclude from MSSQL list)
    const unapprovedLinksResult = await db.query(`
      SELECT DISTINCT kristem_account_id 
      FROM accounts 
      WHERE kristem_account_id IS NOT NULL 
      AND stage_status != 'Approved'
    `);
    
    const excludeIds = new Set(
      unapprovedLinksResult.rows
        .map(row => Number(row.kristemAccountId))
        .filter(id => Number.isFinite(id))
    );
    const approvedAccounts = pgResult.rows;

    // Filter out MSSQL customers that are linked to unapproved PostgreSQL accounts
    const visibleCustomers = customers.filter(c => !excludeIds.has(Number(c.Id)));
    console.log(`🔍 Filtered ${customers.length - visibleCustomers.length} linked unapproved accounts from MSSQL customers`);

    // Get unique IDs for SPI lookups for enrichment
    const brandIds = new Set();
    const industryIds = new Set();
    const deptIds = new Set();

    for (const c of visibleCustomers) {
      const normId = (v) => {
        const n = Number(v);
        return Number.isFinite(n) ? n : null;
      };
      const bId = normId(c.Product_Brand_Id) ?? normId(c.ProductBrandId) ?? normId(c.Brand_ID) ?? normId(c.BrandId) ?? null;
      const iId = normId(c.Customer_Industry_Group_Id) ?? normId(c.Industry_Group_Id) ?? normId(c.IndustryGroupId) ?? null;
      const dId = normId(c.Department_Id) ?? normId(c.DepartmentID) ?? normId(c.DepartmentId) ?? null;
      
      if (bId != null) brandIds.add(bId);
      if (iId != null) industryIds.add(iId);
      if (dId != null) deptIds.add(dId);
    }

    // Ensure default fallback IDs
    brandIds.add(2);
    deptIds.add(2);

    // Fetch SPI lookups in batch
    const [brandRes, indRes, deptRes] = await Promise.all([
      brandIds.size
        ? spiPool.request().query(`SELECT * FROM spidb.brand WHERE ID IN (${Array.from(brandIds).join(",")})`)
        : Promise.resolve({ recordset: [] }),
      industryIds.size
        ? spiPool.request().query(`SELECT * FROM spidb.Customer_Industry_Group WHERE Id IN (${Array.from(industryIds).join(",")})`)
        : Promise.resolve({ recordset: [] }),
      deptIds.size
        ? spiPool.request().query(`SELECT * FROM spidb.CusDepartment WHERE Id IN (${Array.from(deptIds).join(",")})`)
        : Promise.resolve({ recordset: [] }),
    ]);

    const brandMap = new Map((brandRes.recordset || []).map((b) => [Number(b.ID ?? b.Id), b]));
    const industryMap = new Map((indRes.recordset || []).map((i) => [Number(i.Id), i]));
    const departmentMap = new Map((deptRes.recordset || []).map((d) => [Number(d.Id), d]));

    // Enrich visible MSSQL customers with lookups
    const enrichedCustomers = visibleCustomers.map((c) => {
      const normId = (v) => {
        const n = Number(v);
        return Number.isFinite(n) ? n : null;
      };
      const bId = normId(c.Product_Brand_Id) ?? normId(c.ProductBrandId) ?? normId(c.Brand_ID) ?? normId(c.BrandId) ?? 2;
      const iId = normId(c.Customer_Industry_Group_Id) ?? normId(c.Industry_Group_Id) ?? normId(c.IndustryGroupId) ?? null;
      const dId = normId(c.Department_Id) ?? normId(c.DepartmentID) ?? normId(c.DepartmentId) ?? 2;

      return {
        id: c.Id,
        kristem: c,
        brand: brandMap.get(bId) || null,
        industry: iId != null ? industryMap.get(iId) || null : null,
        department: departmentMap.get(dId) || null,
        account_name: c.Name,
        stage_status: 'Approved', // MSSQL customers are approved
        created_at: c.DateCreated || null,
        source: 'mssql'
      };
    });

    // Enrich completed PostgreSQL accounts with MSSQL data
    try {
      // Get accounts that have kristem_account_id for customer enrichment
      const kristemIds = approvedAccounts
        .map(a => a.kristemAccountId)
        .filter(id => id != null)
        .map(id => Number(id))
        .filter(id => Number.isFinite(id));
      
      // Get unique department, industry, and product IDs from PostgreSQL accounts
      const pgDeptIds = new Set();
      const pgIndustryIds = new Set();
      const pgProductIds = new Set();
      
      for (const account of approvedAccounts) {
        if (account.departmentId) pgDeptIds.add(Number(account.departmentId));
        if (account.industryId) pgIndustryIds.add(Number(account.industryId));
        if (account.productId) pgProductIds.add(Number(account.productId));
      }
      
      // Fetch PostgreSQL account enrichments in parallel
      const [pgCustomerRes, pgDeptRes, pgIndustryRes, pgBrandRes] = await Promise.all([
        kristemIds.length > 0
          ? spiPool.request().query(`SELECT * FROM spidb.customer WHERE Id IN (${kristemIds.join(",")})`)
          : Promise.resolve({ recordset: [] }),
        pgDeptIds.size
          ? spiPool.request().query(`SELECT * FROM spidb.CusDepartment WHERE Id IN (${Array.from(pgDeptIds).join(",")})`)
          : Promise.resolve({ recordset: [] }),
        pgIndustryIds.size
          ? spiPool.request().query(`SELECT * FROM spidb.Customer_Industry_Group WHERE Id IN (${Array.from(pgIndustryIds).join(",")})`)
          : Promise.resolve({ recordset: [] }),
        pgProductIds.size
          ? spiPool.request().query(`SELECT * FROM spidb.brand WHERE ID IN (${Array.from(pgProductIds).join(",")})`)
          : Promise.resolve({ recordset: [] }),
      ]);
      
      // Create lookup maps for PostgreSQL accounts
      const pgCustomerMap = new Map((pgCustomerRes.recordset || []).map(c => [Number(c.Id), c]));
      const pgDepartmentMap = new Map((pgDeptRes.recordset || []).map(d => [Number(d.Id), d]));
      const pgIndustryMap = new Map((pgIndustryRes.recordset || []).map(i => [Number(i.Id), i]));
      const pgBrandMap = new Map((pgBrandRes.recordset || []).map(b => [Number(b.ID ?? b.Id), b]));
      
      // Enrich each PostgreSQL account
      for (const account of approvedAccounts) {
        // Add kristem customer data if available
        if (account.kristemAccountId) {
          const kristemId = Number(account.kristemAccountId);
          if (Number.isFinite(kristemId)) {
            account.kristem = pgCustomerMap.get(kristemId) || null;
          }
        }
        
        // Add department lookup
        if (account.departmentId) {
          const deptId = Number(account.departmentId);
          if (Number.isFinite(deptId)) {
            account.department = pgDepartmentMap.get(deptId) || null;
          }
        }
        
        // Add industry lookup
        if (account.industryId) {
          const industryId = Number(account.industryId);
          if (Number.isFinite(industryId)) {
            account.industry = pgIndustryMap.get(industryId) || null;
          }
        }
        
        // Add brand/product lookup
        if (account.productId) {
          const productId = Number(account.productId);
          if (Number.isFinite(productId)) {
            account.brand = pgBrandMap.get(productId) || null;
          }
        }
      }
      
    } catch (pgEnrichErr) {
      console.warn("Failed to enrich PostgreSQL accounts with MSSQL data:", pgEnrichErr.message);
    }

    // Combine visible MSSQL customers + approved PostgreSQL accounts
    const allAccounts = [...enrichedCustomers, ...approvedAccounts.map(a => ({ ...a, source: 'postgresql' }))];

    console.log(`📊 Returning ${enrichedCustomers.length} MSSQL customers + ${approvedAccounts.length} approved PostgreSQL accounts`);
    return res.json(allAccounts);
  } catch (err) {
    console.error("/api/accounts error:", err);
    return res.status(500).json({ error: err.message });
  }
});

// GET all NAEF accounts (PostgreSQL only - for workflow management)
router.get("/naefs", async (req, res) => {
  try {
    console.log("Fetching NAEF accounts from PostgreSQL");
    
    // Get all NAEF accounts from PostgreSQL (including drafts, pending, etc.)
    const result = await db.query(`
      SELECT 
        a.*,
        u.username as prepared_by_username
      FROM accounts a
      LEFT JOIN users u ON a.prepared_by = u.id
      WHERE a.is_naef = true
      ORDER BY a.created_at DESC
    `);
    
    const naefAccounts = result.rows;
    
    // Enrich accounts with MSSQL data
    try {
      const spiPool = await poolPromise;
      
      // Get accounts that have kristem_account_id for customer enrichment
      const kristemIds = naefAccounts
        .map(a => a.kristemAccountId)
        .filter(id => id != null)
        .map(id => Number(id))
        .filter(id => Number.isFinite(id));
      
      // Get unique department, industry, and product IDs from PostgreSQL accounts
      const deptIds = new Set();
      const industryIds = new Set();
      const productIds = new Set();
      
      for (const account of naefAccounts) {
        if (account.departmentId) deptIds.add(Number(account.departmentId));
        if (account.industryId) industryIds.add(Number(account.industryId));
        if (account.productId) productIds.add(Number(account.productId));
      }
      
      // Add default fallback IDs
      deptIds.add(2);
      productIds.add(2);
      
      // Fetch all lookups in parallel
      const [customerRes, deptRes, industryRes, brandRes] = await Promise.all([
        kristemIds.length > 0
          ? spiPool.request().query(`SELECT * FROM spidb.customer WHERE Id IN (${kristemIds.join(",")})`)
          : Promise.resolve({ recordset: [] }),
        deptIds.size
          ? spiPool.request().query(`SELECT * FROM spidb.CusDepartment WHERE Id IN (${Array.from(deptIds).join(",")})`)
          : Promise.resolve({ recordset: [] }),
        industryIds.size
          ? spiPool.request().query(`SELECT * FROM spidb.Customer_Industry_Group WHERE Id IN (${Array.from(industryIds).join(",")})`)
          : Promise.resolve({ recordset: [] }),
        productIds.size
          ? spiPool.request().query(`SELECT * FROM spidb.brand WHERE ID IN (${Array.from(productIds).join(",")})`)
          : Promise.resolve({ recordset: [] }),
      ]);
      
      // Create lookup maps
      const customerMap = new Map((customerRes.recordset || []).map(c => [Number(c.Id), c]));
      const departmentMap = new Map((deptRes.recordset || []).map(d => [Number(d.Id), d]));
      const industryMap = new Map((industryRes.recordset || []).map(i => [Number(i.Id), i]));
      const brandMap = new Map((brandRes.recordset || []).map(b => [Number(b.ID ?? b.Id), b]));
      
      // Enrich each account
      for (const account of naefAccounts) {
        // Add kristem customer data if available
        if (account.kristemAccountId) {
          const kristemId = Number(account.kristemAccountId);
          if (Number.isFinite(kristemId)) {
            account.kristem = customerMap.get(kristemId) || null;
          }
        }
        
        // Add department lookup
        if (account.departmentId) {
          const deptId = Number(account.departmentId);
          if (Number.isFinite(deptId)) {
            account.department = departmentMap.get(deptId) || null;
          }
        }
        
        // Add industry lookup
        if (account.industryId) {
          const industryId = Number(account.industryId);
          if (Number.isFinite(industryId)) {
            account.industry = industryMap.get(industryId) || null;
          }
        }
        
        // Add brand/product lookup
        if (account.productId) {
          const productId = Number(account.productId);
          if (Number.isFinite(productId)) {
            account.brand = brandMap.get(productId) || null;
          }
        }
        
        // Mark as postgresql source
        account.source = 'postgresql';
      }
      
    } catch (enrichErr) {
      console.warn("Failed to enrich NAEF accounts with MSSQL data:", enrichErr.message);
    }
    
    console.log(`Found ${naefAccounts.length} NAEF accounts`);
    return res.json(naefAccounts);
  } catch (err) {
    console.error("/api/accounts/naefs error:", err);
    return res.status(500).json({ error: err.message });
  }
});

// ADD new account (Dual creation: MSSQL + PostgreSQL)
router.post("/", async (req, res) => {
  console.log("POST /api/accounts called - Dual creation mode");
  console.log("Request body:", req.body);
  
  try {
    const body = toSnake(req.body);
    
    // Generate NAEF number
    const currentYear = new Date().getFullYear();
    const naefResult = await db.query(
      `SELECT naef_number FROM accounts 
       WHERE naef_number LIKE $1 
       ORDER BY naef_number DESC LIMIT 1`,
      [`NAEF-${currentYear}-%`]
    );
    
    let newCounter = 1;
    if (naefResult.rows.length > 0) {
      const lastNaef = naefResult.rows[0].naefNumber;
      const lastCounter = parseInt(lastNaef.split("-")[2], 10);
      newCounter = lastCounter + 1;
    }
    const naef_number = `NAEF-${currentYear}-${String(newCounter).padStart(4, "0")}`;
    
    // Step 1: Create MSSQL customer (for immediate referencing)
    console.log("🔍 Creating MSSQL customer for immediate referencing...");
    const spiPool = await poolPromise;
    const mssqlResult = await spiPool.request()
      .input('code', naef_number)
      .input('name', body.account_name || 'NAEF Account')
      .input('address', body.address || '')
      .input('phone', body.contact_number || '')
      .input('email', body.email_address || '')
      .input('industryId', body.industry_id || null)
      .input('locationId', body.customer_location_id || '')
      .input('chargeTo', body.charge_to || '')
      .input('tinNo', body.tin_no || '')
      .input('segmentId', body.customer_market_segment_group_id || null)
      .input('category', body.category || '')
      .query(`
        INSERT INTO spidb.customer (
          Code, Name, Address, PhoneNumber, EmailAddress,
          Customer_Industry_Group_Id, VAT_Type_Id, Price_Basis_Id, 
          Customer_Location_Id, PaymentTerms, Currency_Id, Sales_Agent_Id,
          ChargeTo, TinNo, Customer_Market_Segment_Group_Id, Category
        ) OUTPUT INSERTED.Id VALUES (
          @code, @name, @address, @phone, @email,
          @industryId, -1, -1, 
          @locationId, -1, -1, -1,
          @chargeTo, @tinNo, @segmentId, @category
        )
      `);
    
    const kristemId = mssqlResult.recordset[0].Id;
    console.log("✅ Created MSSQL customer with ID:", kristemId);
    
    // Step 2: Create PostgreSQL account with kristem_account_id link
    console.log("🔍 Creating PostgreSQL account with kristem link...");
    const insertResult = await db.query(`
      INSERT INTO accounts (
        naef_number, kristem_account_id, stage_status, ref_number, date_created, requested_by,
        designation, department_id, validity_period, due_date, account_name,
        contract_period, industry_id, account_designation, product_id,
        contact_number, location, email_address, address, buyer_incharge,
        trunkline, contract_number, process, secondary_email_address,
        machines, reason_to_apply, automotive_section, source_of_inquiry,
        commodity, business_activity, model, annual_target_sales,
        population, source_of_target, existing_bellows, products_to_order,
        model_under, target_areas, analysis, from_date, to_date,
        activity_period, prepared_by, noted_by, approved_by, received_by,
        acknowledged_by, is_naef, wo_source_id, created_at, updated_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11,
        $12, $13, $14, $15, $16, $17, $18, $19, $20, $21,
        $22, $23, $24, $25, $26, $27, $28, $29, $30, $31,
        $32, $33, $34, $35, $36, $37, $38, $39, $40, $41,
        $42, $43, $44, $45, $46, $47, $48, $49, NOW(), NOW()
      ) RETURNING *
    `, [
      naef_number,
      kristemId, // Link to MSSQL customer
      body.stage_status || 'Draft',
      body.ref_number,
      body.date_created || new Date(),
      body.requested_by,
      body.designation,
      body.department_id,
      body.validity_period,
      body.due_date,
      body.account_name,
      body.contract_period,
      body.industry_id,
      body.account_designation,
      body.product_id,
      body.contact_number,
      body.location,
      body.email_address,
      body.address,
      body.buyer_incharge,
      body.trunkline,
      body.contract_number,
      body.process,
      body.secondary_email_address,
      body.machines,
      body.reason_to_apply,
      body.automotive_section,
      body.source_of_inquiry,
      body.commodity,
      body.business_activity,
      body.model,
      body.annual_target_sales,
      body.population,
      body.source_of_target,
      body.existing_bellows,
      body.products_to_order,
      body.model_under,
      body.target_areas,
      body.analysis,
      body.from_date,
      body.to_date,
      body.activity_period,
      body.prepared_by,
      body.noted_by,
      body.approved_by,
      body.received_by,
      body.acknowledged_by,
      body.is_naef || true,
      body.wo_source_id
    ]);
    
    const newAccount = insertResult.rows[0];
    console.log("✅ Created PostgreSQL account with kristem_account_id:", newAccount.kristemAccountId);
    
    // Add kristem data to response for immediate use
    newAccount.kristem_id = kristemId; // For other modules to reference
    
    return res.status(201).json(newAccount);
  } catch (err) {
    console.error("POST /api/accounts error:", err);
    return res.status(500).json({ error: err.message });
  }
});

// UPDATE account
router.put("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const body = toSnake(req.body);
    console.log("Updating account id", id, "with data:", body);
    
    // Update PostgreSQL account
    const updateResult = await db.query(`
      UPDATE accounts SET
        stage_status = $1,
        ref_number = $2,
        requested_by = $3,
        designation = $4,
        department_id = $5,
        validity_period = $6,
        due_date = $7,
        account_name = $8,
        contract_period = $9,
        industry_id = $10,
        account_designation = $11,
        product_id = $12,
        contact_number = $13,
        location = $14,
        email_address = $15,
        address = $16,
        buyer_incharge = $17,
        trunkline = $18,
        contract_number = $19,
        process = $20,
        secondary_email_address = $21,
        machines = $22,
        reason_to_apply = $23,
        automotive_section = $24,
        source_of_inquiry = $25,
        commodity = $26,
        business_activity = $27,
        model = $28,
        annual_target_sales = $29,
        population = $30,
        source_of_target = $31,
        existing_bellows = $32,
        products_to_order = $33,
        model_under = $34,
        target_areas = $35,
        analysis = $36,
        from_date = $37,
        to_date = $38,
        activity_period = $39,
        prepared_by = $40,
        noted_by = $41,
        approved_by = $42,
        received_by = $43,
        acknowledged_by = $44,
        updated_at = NOW()
      WHERE id = $45
      RETURNING *
    `, [
      body.stage_status,
      body.ref_number,
      body.requested_by,
      body.designation,
      body.department_id,
      body.validity_period,
      body.due_date,
      body.account_name,
      body.contract_period,
      body.industry_id,
      body.account_designation,
      body.product_id,
      body.contact_number,
      body.location,
      body.email_address,
      body.address,
      body.buyer_incharge,
      body.trunkline,
      body.contract_number,
      body.process,
      body.secondary_email_address,
      body.machines,
      body.reason_to_apply,
      body.automotive_section,
      body.source_of_inquiry,
      body.commodity,
      body.business_activity,
      body.model,
      body.annual_target_sales,
      body.population,
      body.source_of_target,
      body.existing_bellows,
      body.products_to_order,
      body.model_under,
      body.target_areas,
      body.analysis,
      body.from_date,
      body.to_date,
      body.activity_period,
      body.prepared_by,
      body.noted_by,
      body.approved_by,
      body.received_by,
      body.acknowledged_by,
      id
    ]);
    
    if (updateResult.rows.length === 0) {
      return res.status(404).json({ error: "Account not found" });
    }
    
    const updatedAccount = updateResult.rows[0];
    
    // If account was approved, sync to MSSQL
    if (body.stage_status === 'Approved' && !updatedAccount.kristemAccountId) {
      try {
        await syncAccountToMSSQL(updatedAccount);
      } catch (syncErr) {
        console.warn("Failed to sync approved account to MSSQL:", syncErr.message);
      }
    }
    
    return res.json(updatedAccount);
  } catch (err) {
    console.error("PUT /api/accounts/:id error:", err);
    return res.status(500).json({ error: err.message });
  }
});

// Update approved account in MSSQL spidb.customer (dual creation mode)
async function syncAccountToMSSQL(account) {
  console.log("🚀 Updating approved account in MSSQL:", account.id);
  
  try {
    if (!account.kristemAccountId) {
      console.warn("⚠️ Account has no kristem_account_id - skipping MSSQL update");
      return;
    }
    
    const spiPool = await poolPromise;
    
    // UPDATE existing MSSQL customer with final data
    await spiPool.request()
      .input('id', Number(account.kristemAccountId))
      .input('code', account.naefNumber || account.kristemAccountId)
      .input('name', account.accountName || 'Unknown')
      .input('address', account.address || '')
      .input('phone', account.contactNumber || '')
      .input('email', account.emailAddress || '')
      .input('industryId', account.industryId || null)
      .input('locationId', account.customerLocationId || '')
      .input('chargeTo', account.chargeTo || '')
      .input('tinNo', account.tinNo || '')
      .input('segmentId', account.customerMarketSegmentGroupId || null)
      .input('category', account.category || '')
      .query(`
        UPDATE spidb.customer SET
          Code = @code,
          Name = @name,
          Address = @address,
          PhoneNumber = @phone,
          EmailAddress = @email,
          Customer_Industry_Group_Id = @industryId,
          Customer_Location_Id = @locationId,
          ChargeTo = @chargeTo,
          TinNo = @tinNo,
          Customer_Market_Segment_Group_Id = @segmentId,
          Category = @category
        WHERE Id = @id
      `);
    
    console.log("✅ Updated MSSQL customer ID:", account.kristemAccountId, "with final approved data");
    
  } catch (err) {
    console.error("❌ Failed to update account in MSSQL:", err);
    throw err;
  }
}

// Get account lookup data
router.get("/industries", async (req, res) => {
  try {
    const spiPool = await poolPromise;
    const result = await spiPool.request().query("SELECT * FROM spidb.Customer_Industry_Group ORDER BY Code");
    return res.json(result.recordset || []);
  } catch (err) {
    console.error("/api/accounts/industries error:", err);
    return res.status(500).json({ error: err.message });
  }
});

router.get("/departments", async (req, res) => {
  try {
    const spiPool = await poolPromise;
    const result = await spiPool.request().query("SELECT * FROM spidb.CusDepartment ORDER BY Code");
    return res.json(result.recordset || []);
  } catch (err) {
    console.error("/api/accounts/departments error:", err);
    return res.status(500).json({ error: err.message });
  }
});

router.get("/product-brands", async (req, res) => {
  try {
    const spiPool = await poolPromise;
    const result = await spiPool.request().query("SELECT * FROM spidb.brand ORDER BY Code");
    return res.json(result.recordset || []);
  } catch (err) {
    console.error("/api/accounts/product-brands error:", err);
    return res.status(500).json({ error: err.message });
  }
});

// GET single account by id
router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    console.log("Fetching account by id:", id);
    
    // First try PostgreSQL (for draft/pending accounts)
    const pgResult = await db.query(`
      SELECT 
        a.*,
        u.username as prepared_by_username
      FROM accounts a
      LEFT JOIN users u ON a.prepared_by = u.id
      WHERE a.id = $1
    `, [id]);
    
    if (pgResult.rows.length > 0) {
      const account = pgResult.rows[0];
      account.source = 'postgresql';
      
      // Enrich with MSSQL data
      try {
        const spiPool = await poolPromise;
        
        const enrichmentPromises = [];
        
        // Add kristem customer data if available
        if (account.kristemAccountId) {
          enrichmentPromises.push(
            spiPool.request()
              .input("custId", Number(account.kristemAccountId))
              .query("SELECT TOP (1) * FROM spidb.customer WHERE Id = @custId")
              .then(res => ({ type: 'customer', data: res.recordset[0] || null }))
          );
        }
        
        // Add department lookup
        if (account.departmentId) {
          enrichmentPromises.push(
            spiPool.request()
              .input("deptId", Number(account.departmentId))
              .query("SELECT TOP (1) * FROM spidb.CusDepartment WHERE Id = @deptId")
              .then(res => ({ type: 'department', data: res.recordset[0] || null }))
          );
        }
        
        // Add industry lookup
        if (account.industryId) {
          enrichmentPromises.push(
            spiPool.request()
              .input("indId", Number(account.industryId))
              .query("SELECT TOP (1) * FROM spidb.Customer_Industry_Group WHERE Id = @indId")
              .then(res => ({ type: 'industry', data: res.recordset[0] || null }))
          );
        }
        
        // Add brand/product lookup
        if (account.productId) {
          enrichmentPromises.push(
            spiPool.request()
              .input("prodId", Number(account.productId))
              .query("SELECT TOP (1) * FROM spidb.brand WHERE ID = @prodId")
              .then(res => ({ type: 'brand', data: res.recordset[0] || null }))
          );
        }
        
        // Execute all lookups in parallel
        const enrichments = await Promise.all(enrichmentPromises);
        
        // Apply enrichments to account
        for (const enrichment of enrichments) {
          if (enrichment.data) {
            account[enrichment.type] = enrichment.data;
            if (enrichment.type === 'customer') {
              account.kristem = enrichment.data;
            }
          }
        }
        
      } catch (spiErr) {
        console.warn("Failed to enrich with SPI data:", spiErr.message);
      }
      
      return res.json(account);
    }
    
    // If not found in PostgreSQL, try MSSQL (for existing customers)
    try {
      const spiPool = await poolPromise;
      const custRes = await spiPool
        .request()
        .input("id", Number(id))
        .query("SELECT TOP (1) * FROM spidb.customer WHERE Id = @id");
      
      const customer = custRes.recordset && custRes.recordset[0];
      if (!customer) {
        return res.status(404).json({ error: "Account not found" });
      }

      // Enrich with brand/industry/department data
      const normId = (v) => {
        const n = Number(v);
        return Number.isFinite(n) ? n : null;
      };
      const bId = normId(customer.Product_Brand_Id) ?? normId(customer.ProductBrandId) ?? normId(customer.Brand_ID) ?? normId(customer.BrandId) ?? 2;
      const iId = normId(customer.Customer_Industry_Group_Id) ?? normId(customer.Industry_Group_Id) ?? normId(customer.IndustryGroupId) ?? null;
      const dId = normId(customer.Department_Id) ?? normId(customer.DepartmentID) ?? normId(customer.DepartmentId) ?? 2;

      const [bRes, iRes, dRes] = await Promise.all([
        spiPool.request().input("bid", bId).query("SELECT TOP (1) * FROM spidb.brand WHERE ID = @bid"),
        iId != null ? spiPool.request().input("iid", iId).query("SELECT TOP (1) * FROM spidb.Customer_Industry_Group WHERE Id = @iid") : Promise.resolve({ recordset: [] }),
        spiPool.request().input("did", dId).query("SELECT TOP (1) * FROM spidb.CusDepartment WHERE Id = @did"),
      ]);

      const account = {
        id: customer.Id,
        kristem: customer,
        brand: bRes.recordset && bRes.recordset[0] ? bRes.recordset[0] : null,
        industry: iRes.recordset && iRes.recordset[0] ? iRes.recordset[0] : null,
        department: dRes.recordset && dRes.recordset[0] ? dRes.recordset[0] : null,
        account_name: customer.Name,
        stage_status: 'Approved',
        created_at: customer.DateCreated || null,
        source: 'mssql'
      };
      
      return res.json(account);
    } catch (spiErr) {
      console.error("Failed to fetch from MSSQL:", spiErr.message);
      return res.status(404).json({ error: "Account not found" });
    }
  } catch (err) {
    console.error("/api/accounts/:id error:", err);
    res.status(500).json({ error: err.message });
  }
});

export default router;