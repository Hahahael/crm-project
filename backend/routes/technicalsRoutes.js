import express from "express";
import db from "../db.js";
import { toSnake } from "../helper/utils.js";
import { poolPromise, poolCrmPromise } from "../mssql.js";

function logAttributes(label, obj) {
  try {
    if (!obj) return console.log(`${label}: <empty>`);
    if (Array.isArray(obj)) {
      const keys = new Set();
      obj.forEach((r) => {
        if (r && typeof r === "object")
          Object.keys(r).forEach((k) => keys.add(k));
      });
      return console.log(`${label} keys:`, Array.from(keys));
    }
    if (typeof obj === "object")
      return console.log(`${label} keys:`, Object.keys(obj));
    return console.log(`${label}:`, obj);
  } catch (err) {
    console.error("logAttributes error:", err);
  }
}

// Merge primary (detail) and parent objects. Primary wins; parent fields that collide are stored as <key>_secondary
function mergePrimaryWithParent(detail, parent) {
  if (!detail && !parent) return null;
  if (!parent) {
    // Only detail — suffix everything with _Detail
    return Object.fromEntries(
      Object.entries(detail).map(([k, v]) => [`${k}_Detail`, v]),
    );
  }
  if (!detail) return parent;

  const out = { ...parent }; // start with stock (parent)
  for (const [key, value] of Object.entries(detail)) {
    out[`${key}_Detail`] = value; // always suffix detail fields
  }
  return out;
}

const router = express.Router();

// Get all technical recommendations
router.get("/", async (req, res) => {
  try {
    const result = await db.query(`
      SELECT 
              tr.*, 
              u.username AS assignee_username,
              sl.sl_number AS sl_number
      FROM technical_recommendations tr
      LEFT JOIN users u ON tr.assignee = u.id
      LEFT JOIN sales_leads sl ON tr.sl_id = sl.id
      ORDER BY tr.id ASC
      `);
    const rows = result.rows;

    // Enrich with SPI account data (no crmdb)
    try {
      const ids = Array.from(
        new Set(
          rows
            .map((r) => r.accountId ?? r.account_id)
            .filter((v) => v !== null && v !== undefined),
        ),
      );
      console.log("🔍 Extracted account IDs from technical recommendations:", ids);
      console.log("🔍 Sample TR row:", rows[0] || "No TRs found");
      if (ids.length > 0) {
        const spiPool = await poolPromise;
        const numericIds = ids
          .map((x) => Number(x))
          .filter((n) => Number.isFinite(n));
        if (numericIds.length > 0) {
          // Load SPI customers by account ids
          console.log("🔍 Attempting to fetch customers for IDs:", numericIds);
          
          const custRes = await spiPool
            .request()
            .query(`SELECT * FROM spidb.customer WHERE Id IN (${numericIds.join(",")})`);
          const customers = custRes.recordset || [];
          console.log("✅ Successfully fetched customers:", customers.length, "records");
          console.log("🔍 Sample customer data:", customers[0] || "No customers found");
          const customerMap = new Map(customers.map((c) => [Number(c.Id), c]));

          const normId = (v) => {
            const n = Number(v);
            return Number.isFinite(n) ? n : null;
          };
          const bIds = new Set();
          const iIds = new Set();
          const dIds = new Set();
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
            if (bId != null) bIds.add(bId);
            if (iId != null) iIds.add(iId);
            if (dId != null) dIds.add(dId);
          }
          bIds.add(2);
          dIds.add(2);

          const [brandRes, indRes, deptRes] = await Promise.all([
            bIds.size
              ? spiPool
                  .request()
                  .query(`SELECT * FROM spidb.brand WHERE ID IN (${Array.from(bIds).join(",")})`)
              : Promise.resolve({ recordset: [] }),
            iIds.size
              ? spiPool
                  .request()
                  .query(`SELECT * FROM spidb.Customer_Industry_Group WHERE Id IN (${Array.from(iIds).join(",")})`)
              : Promise.resolve({ recordset: [] }),
            dIds.size
              ? spiPool
                  .request()
                  .query(`SELECT * FROM spidb.CusDepartment WHERE Id IN (${Array.from(dIds).join(",")})`)
              : Promise.resolve({ recordset: [] }),
          ]);

          const brandMap = new Map((brandRes.recordset || []).map((b) => [Number(b.ID ?? b.Id), b]));
          const industryMap = new Map((indRes.recordset || []).map((i) => [Number(i.Id), i]));
          const departmentMap = new Map((deptRes.recordset || []).map((d) => [Number(d.Id), d]));

          for (const tr of rows) {
            const aid = Number(tr.accountId ?? tr.account_id);
            const cust = Number.isFinite(aid) ? customerMap.get(aid) || null : null;
            if (!cust) {
              tr.account = null;
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
            tr.account = {
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
        "Failed to enrich technical recommendations with account data:",
        enrichErr.message,
      );
    }

    return res.json(rows);
  } catch (err) {
    console.error(err);
    return res
      .status(500)
      .json({ error: "Failed to fetch technical recommendations" });
  }
});

// Get single technical recommendation
router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const result = await db.query(
      `
        SELECT 
          tr.*, 
          u.username AS assignee_username,
          sl.sl_number AS sl_number
        FROM technical_recommendations tr
        LEFT JOIN users u ON tr.assignee = u.id
        LEFT JOIN sales_leads sl ON tr.sl_id = sl.id
        WHERE tr.id = $1
      `,
      [id],
    );
    if (result.rows.length === 0)
      return res.status(404).json({ error: "Not found" });

    // Fetch items assigned to this tr
    const itemsRes = await db.query(
      `
        SELECT
          ti.*
        FROM tr_items ti
        WHERE ti.tr_id = $1 ORDER BY ti.id ASC
      `,
      [id],
    );

    // Resolve MSSQL details for each tr_item and merge
    const pool = await poolPromise;
    const items = [];
    for (const ri of itemsRes.rows) {
      try {
        console.log("Resolving MSSQL item for tr_item:", ri);
        console.log("itemId:", ri.itemId);
        const sdRes = await pool
          .request()
          .input("id", ri.itemId)
          .query("SELECT * FROM spidb.stock_details WHERE Stock_Id = @id");
        const sRes = await pool
          .request()
          .input("id", ri.itemId)
          .query("SELECT * FROM spidb.stock WHERE Id = @id");
        logAttributes(
          `tr item stock_details (id=${ri.itemId})`,
          sdRes.recordset || [],
        );
        logAttributes(`tr item stock (id=${ri.itemId})`, sRes.recordset || []);
        const detailObj =
          sdRes && sdRes.recordset && sdRes.recordset[0]
            ? sdRes.recordset[0]
            : null;
        const parentObj =
          sRes && sRes.recordset && sRes.recordset[0]
            ? sRes.recordset[0]
            : null;
        const merged = mergePrimaryWithParent(detailObj, parentObj);
        const combined = {
          ...ri,
          ...merged,
        };
        items.push(combined);
      } catch (err) {
        console.error("Error resolving MSSQL item for tr_item", ri, err);
        items.push({ id: ri.id, itemId: ri.item_id, quantity: ri.quantity });
      }
    }

    console.log("Fetched items for technical recommendation:", items);

    const base = { ...result.rows[0], items };

    // Enrich single with SPI account
    try {
      const spiPool = await poolPromise;
      const accId = Number(base.accountId ?? base.account_id);
      console.log("🔍 Single TR - Account ID:", accId, "from base:", base.accountId, base.account_id);
      let customer = null;
      if (Number.isFinite(accId)) {
        console.log("🔍 Fetching single customer for ID:", accId);
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
            .query("SELECT TOP (1) * FROM spidb.CusDepartment WHERE Id = @did"),
        ]);

        const account = {
          kristem: customer,
          brand: bRes.recordset && bRes.recordset[0] ? bRes.recordset[0] : null,
          industry: iRes.recordset && iRes.recordset[0] ? iRes.recordset[0] : null,
          department: dRes.recordset && dRes.recordset[0] ? dRes.recordset[0] : null,
        };

        base.account = account;
        console.log("Fetched technical recommendation:", base);
        // return res.json(base);
      }
    } catch (enrichErr) {
      console.warn(
        "Failed to enrich technical recommendation account:",
        enrichErr.message,
      );
    }

    // Fetch attachments using PostgreSQL file IDs to query MSSQL
    try {
      const crmPool = await poolCrmPromise;
      let attachments = [];

      // Get file IDs from PostgreSQL attachments JSONB
      let fileIds = [];
      if (base.attachments) {
        try {
          const parsed = typeof base.attachments === 'string' 
            ? JSON.parse(base.attachments) 
            : base.attachments;
          fileIds = Array.isArray(parsed) ? parsed : [];
          console.log("Extracted file IDs from PostgreSQL attachments:", fileIds);
        } catch {
          console.warn("Failed to parse PostgreSQL attachments JSONB");
          fileIds = [];
        }
      }

      // If we have file IDs, fetch the actual file metadata from MSSQL
      if (fileIds.length > 0) {
        const placeholders = fileIds.map((_, index) => `@id${index}`).join(',');
        const request = crmPool.request();
        
        // Add parameters for each file ID
        fileIds.forEach((id, index) => {
          request.input(`id${index}`, id);
        });

        const attachmentsRes = await request.query(`
          SELECT Id, FileName, FileSize, FileType, UploadDate, UploadedBy
          FROM [crmdb].[FileStorage] 
          WHERE Id IN (${placeholders})
          ORDER BY UploadDate DESC
        `);
        
        attachments = attachmentsRes.recordset || [];
      }

      // If no file IDs in PostgreSQL, fallback to querying by TR ID
      if (attachments.length === 0) {
        const attachmentsRes = await crmPool
          .request()
          .input('tr_id', id)
          .query(`
            SELECT Id, FileName, FileSize, FileType, UploadDate, UploadedBy
            FROM [crmdb].[FileStorage] 
            WHERE TrId = @tr_id
            ORDER BY UploadDate DESC
          `);
        
        attachments = attachmentsRes.recordset || [];
      }

      base.attachments = attachments;
      console.log(`📁 Fetched ${attachments.length} attachments for TR ${id} using file IDs [${fileIds.join(', ')}]`);
      console.log("🔍 Raw attachment details:", attachments);
      console.log("🔍 Final base.attachments:", base.attachments);
      
    } catch (attachErr) {
      console.warn("Failed to fetch attachments for TR:", attachErr.message);
      base.attachments = [];
    }

    console.log("Fetched technical recommendation:", base);
    return res.json(base);
  } catch (err) {
    console.error(err);
    return res
      .status(500)
      .json({ error: "Failed to fetch technical recommendation" });
  }
});

// Create new technical recommendation
router.post("/", async (req, res) => {
  try {
    const body = toSnake(req.body);
    console.log("Creating technical recommendation with data:", body);
    // Only require wo_id and assignee for skeletal creation, status defaults to 'Draft'
    const wo_id = body.wo_id;
    const account_id = body.account_id;
    const assignee = body.assignee;
    const status = body.status || "Draft";
    const contact_person = body.contact_person || null;
    const contact_number = body.contact_number || null;
    const contact_email = body.contact_email || null;
    const issues = body.issues || null;
    const current = body.current || null;
    const due_date = body.due_date || null;

    // Generate TR number
    const currentYear = new Date().getFullYear();
    const result = await db.query(
      `SELECT tr_number 
                        FROM technical_recommendations 
                        WHERE tr_number LIKE $1
                        ORDER BY tr_number DESC
                        LIMIT 1`,
      [`TR-${currentYear}-%`],
    );
    let newCounter = 1;
    if (result.rows.length > 0) {
      const lastTrNumber = result.rows[0].trNumber;
      const lastCounter = parseInt(lastTrNumber.split("-")[2], 10);
      newCounter = lastCounter + 1;
    }
    const tr_number = `TR-${currentYear}-${String(newCounter).padStart(4, "0")}`;

    // Find sl_id from sales_leads using wo_id
    let sl_id = null;
    const slRes = await db.query(
      `SELECT id FROM sales_leads WHERE wo_id = $1 LIMIT 1`,
      [wo_id],
    );
    if (slRes.rows.length > 0) {
      sl_id = slRes.rows[0].id;
    }

    // Insert skeletal technical recommendation, all other fields default to null
    const insertResult = await db.query(
      `INSERT INTO technical_recommendations 
        (wo_id, account_id, assignee, tr_number, status,
        sl_id, contact_person, contact_number, contact_email, current_system_issues,
        current_system, created_at, created_by, updated_at, due_date)
      VALUES
        ($1, $2, $3, $4, $5,
        $6, $7, $8, $9, $10,
        $11, NOW(), $3, NOW(), $12)
      RETURNING id`,
      [
        wo_id,
        account_id,
        assignee,
        tr_number,
        status,
        sl_id,
        contact_person,
        contact_number,
        contact_email,
        issues,
        current,
        due_date,
      ],
    );
    const newId = insertResult.rows[0].id;

    // Create workflow stage for new technical recommendation (Draft)
    await db.query(
      `
        INSERT INTO workflow_stages (wo_id, stage_name, status, assigned_to, created_at, updated_at)
        VALUES ($1, $2, $3, $4, NOW(), NOW())
      `,
      [wo_id, "Technical Recommendation", "Draft", assignee],
    );

    // Handle file uploads if any new attachments
    if (body.new_attachments && Array.isArray(body.new_attachments) && body.new_attachments.length > 0) {
      try {
        const crmPool = await poolCrmPromise;
        const uploadedFileIds = []; // Array to collect MSSQL file IDs
        
        console.log(`📁 Processing ${body.new_attachments.length} new attachments for new TR ${newId}`);
        
        for (const file of body.new_attachments) {
          if (!file.name || !file.base64 || !file.type || !file.size) {
            console.warn("Skipping invalid file:", file);
            continue;
          }

          // Validate file size (10MB limit)
          if (file.size > 10 * 1024 * 1024) {
            console.warn(`File "${file.name}" exceeds 10MB limit, skipping`);
            continue;
          }

          // Convert base64 to binary
          const fileBuffer = Buffer.from(file.base64, 'base64');

          // Insert file into MSSQL and get the ID
          const result = await crmPool
            .request()
            .input('tr_id', newId)
            .input('filename', file.name)
            .input('file_size', file.size)
            .input('file_type', file.type)
            .input('file_data', fileBuffer)
            .input('uploaded_by', req.user?.id || null)
            .query(`
              INSERT INTO [crmdb].[FileStorage] 
              (TrId, FileName, FileSize, FileType, Content, UploadDate, UploadedBy)
              VALUES (@tr_id, @filename, @file_size, @file_type, @file_data, GETDATE(), @uploaded_by);
              SELECT SCOPE_IDENTITY() as id;
            `);

          // Collect the file ID for PostgreSQL storage
          if (result.recordset && result.recordset[0]) {
            uploadedFileIds.push(result.recordset[0].id);
            console.log(`✅ Uploaded file: ${file.name} (ID: ${result.recordset[0].id}) for new TR ${newId}`);
          }
        }

        // Update PostgreSQL attachments field with array of MSSQL file IDs
        if (uploadedFileIds.length > 0) {
          try {
            await db.query(
              `UPDATE technical_recommendations SET attachments = $1 WHERE id = $2`,
              [JSON.stringify(uploadedFileIds), newId]
            );

            console.log(`✅ Updated PostgreSQL attachments with file IDs [${uploadedFileIds.join(', ')}] for new TR ${newId}`);
          } catch (pgError) {
            console.error("PostgreSQL attachments update error:", pgError);
          }
        }

      } catch (fileError) {
        console.error("File upload error during TR creation:", fileError);
        // Don't fail the entire creation if file upload fails
      }
    }

    const final = await db.query(
      `
        SELECT tr.*,
                u.username AS assignee_username
        FROM technical_recommendations tr
        LEFT JOIN users u ON tr.assignee = u.id
        WHERE tr.id = $1
      `,
      [newId],
    );

    return res.status(201).json(final.rows[0]);
  } catch (err) {
    console.error(err);
    return res
      .status(500)
      .json({ error: "Failed to create technical recommendation" });
  }
});

// Update existing technical recommendation
router.put("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const body = toSnake(req.body);
    console.log("Updating technical recommendation id", id, "with data:", body);
    const actual_date = body.actual_date || null;
    const actual_from_time = body.actual_from_time || null;
    const actual_to_time = body.actual_to_time || null;
    // Add all fields you want to update here
    console.log("Attachments field on update:", body.attachments);
    const updateResult = await db.query(
      `
        UPDATE technical_recommendations 
        SET 
          status=$1, priority=$2, title=$3, account_id=$4, contact_person=$5,
          contact_number=$6, contact_email=$7, current_system=$8, current_system_issues=$9, proposed_solution=$10,
          technical_justification=$11, installation_requirements=$12, training_requirements=$13,
          maintenance_requirements=$14, additional_notes=$15, updated_at=NOW(), actual_date=$16,
          actual_from_time=$17, actual_to_time=$18
        WHERE id=$19
        RETURNING id
      `,
      [
        body.status || "In Progress",
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
        body.additional_notes,
        actual_date,
        actual_from_time,
        actual_to_time,
        id,
      ],
    );

    // --- Update tr_items robustly ---
    // 1. Fetch all existing items for this tr_id
    const existingItemsRes = await db.query(
      `SELECT id FROM tr_items WHERE tr_id = $1`,
      [id],
    );
    const existingItemIds = new Set(existingItemsRes.rows.map((row) => row.id));

    // 2. Get incoming items from request
    const incomingItems = body.items || [];
    const incomingItemIds = new Set(
      incomingItems.filter((it) => it.id).map((it) => it.id),
    );
    console.log("Existing item IDs:", existingItemsRes.rows);
    console.log("Incoming item IDs:", incomingItems);

    // 3. Delete items that exist in DB but not in incoming
    for (const dbId of existingItemIds) {
      if (!incomingItemIds.has(dbId)) {
        await db.query(`DELETE FROM tr_items WHERE id = $1`, [dbId]);
      }
    }

    // 4. Upsert incoming items
    for (const item of incomingItems) {
      console.log("Upserting item:", item);
      if (item.id && existingItemIds.has(item.id)) {
        // Update existing item
        await db.query(`UPDATE tr_items SET quantity=$1 WHERE id=$2`, [
          item.quantity,
          item.id,
        ]);
      } else {
        // Insert new item
        await db.query(
          `INSERT INTO tr_items (tr_id, item_id, quantity) VALUES ($1, $2, $3)`,
          [id, item.id, item.quantity],
        );
      }
    }

    const updatedId = updateResult.rows[0].id;
    const result = await db.query(
      `
        SELECT
          tr.*,
          u.username AS assignee_username,
          sl.sl_number AS sl_number
        FROM technical_recommendations tr
        LEFT JOIN users u ON tr.assignee = u.id
        LEFT JOIN sales_leads sl ON tr.sl_id = sl.id
        WHERE tr.id = $1
      `,
      [updatedId],
    );
    if (result.rows.length === 0)
      return res.status(404).json({ error: "Not found" });

    // Fetch items assigned to this tr
    const itemsRes = await db.query(
      `
        SELECT
          ti.*,
          i.*
        FROM tr_items ti
        LEFT JOIN items i ON ti.item_id = i.id
        WHERE ti.tr_id = $1
      `,
      [updatedId],
    );

    // Handle file uploads if any new attachments
    if (body.new_attachments && Array.isArray(body.new_attachments) && body.new_attachments.length > 0) {
      try {
        const crmPool = await poolCrmPromise;
        const newFileIds = []; // Array to collect new MSSQL file IDs
        
        console.log(`📁 Processing ${body.new_attachments.length} new attachments for TR ${updatedId}`);
        
        for (const file of body.new_attachments) {
          if (!file.name || !file.base64 || !file.type || !file.size) {
            console.warn("Skipping invalid file:", file);
            continue;
          }

          // Validate file size (10MB limit)
          if (file.size > 10 * 1024 * 1024) {
            console.warn(`File "${file.name}" exceeds 10MB limit, skipping`);
            continue;
          }

          // Convert base64 to binary
          const fileBuffer = Buffer.from(file.base64, 'base64');

          // Insert file into MSSQL and get the ID
          const result = await crmPool
            .request()
            .input('tr_id', updatedId)
            .input('filename', file.name)
            .input('file_size', file.size)
            .input('file_type', file.type)
            .input('file_data', fileBuffer)
            .input('uploaded_by', req.user?.id || null)
            .query(`
              INSERT INTO [crmdb].[FileStorage] 
              (TrId, FileName, FileSize, FileType, Content, UploadDate, UploadedBy)
              VALUES (@tr_id, @filename, @file_size, @file_type, @file_data, GETDATE(), @uploaded_by);
              SELECT SCOPE_IDENTITY() as id;
            `);

          // Collect the file ID for PostgreSQL storage
          if (result.recordset && result.recordset[0]) {
            newFileIds.push(result.recordset[0].id);
            console.log(`✅ Uploaded file: ${file.name} (ID: ${result.recordset[0].id}) for TR ${updatedId}`);
          }
        }

        // Update PostgreSQL attachments field with MSSQL file IDs (append to existing)
        if (newFileIds.length > 0) {
          try {
            // Get current attachment IDs from PostgreSQL
            const currentTrRes = await db.query(
              `SELECT attachments FROM technical_recommendations WHERE id = $1`,
              [updatedId]
            );
            
            let currentFileIds = [];
            if (currentTrRes.rows[0]?.attachments) {
              // Parse existing attachment IDs (should be array of integers)
              try {
                const parsed = JSON.parse(currentTrRes.rows[0].attachments);
                currentFileIds = Array.isArray(parsed) ? parsed : [];
              } catch {
                currentFileIds = [];
              }
            }

            // Append new file IDs to existing ones
            const updatedFileIds = [...currentFileIds, ...newFileIds];

            console.log("Current file IDs:", currentFileIds);
            console.log("New file IDs:", newFileIds);
            console.log("Updated combined file IDs:", updatedFileIds);

            // Update PostgreSQL attachments field with combined file IDs
            const trAttachmentsRes = await db.query(
              `UPDATE technical_recommendations SET attachments = $1 WHERE id = $2 RETURNING *`,
              [JSON.stringify(updatedFileIds), updatedId]
            );

            console.log("Post attachments update result:", trAttachmentsRes.rows[0]);

            console.log(`✅ Updated PostgreSQL attachments with file IDs [${updatedFileIds.join(', ')}] for TR ${updatedId}`);
          } catch (pgError) {
            console.error("PostgreSQL attachments update error:", pgError);
          }
        }

      } catch (fileError) {
        console.error("File upload error during TR update:", fileError);
        // Don't fail the entire update if file upload fails
      }
    }

    const response = { ...result.rows[0], items: itemsRes.rows };
    
    const base = { ...result.rows[0], items: itemsRes.rows };

    // Enrich single with SPI account
    try {
      const spiPool = await poolPromise;
      const accId = base.accountId ?? base.account_id;
      console.log("🔍 PUT TR - Account ID:", accId, "from base:", base.accountId, base.account_id);
      let customer = null;
      if (accId != null) {
        console.log("🔍 PUT - Fetching single customer for ID:", Number(accId));
        const custRes = await spiPool
          .request()
          .input("id", Number(accId))
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
            .query("SELECT TOP (1) * FROM spidb.CusDepartment WHERE Id = @did"),
        ]);

        const account = {
          kristem: customer,
          brand: bRes.recordset && bRes.recordset[0] ? bRes.recordset[0] : null,
          industry: iRes.recordset && iRes.recordset[0] ? iRes.recordset[0] : null,
          department: dRes.recordset && dRes.recordset[0] ? dRes.recordset[0] : null,
        };

        const response = { ...base, account };
        console.log("Fetched technical recommendation:", response);
        return res.json(response);
      }
    } catch (enrichErr) {
      console.warn(
        "Failed to enrich technical recommendation account (SPI):",
        enrichErr.message,
      );
    }
    return res.json(response);
  } catch (err) {
    console.error(err);
    return res
      .status(500)
      .json({ error: "Failed to update technical recommendation" });
  }
});

// Get technical recommendations status summary
router.get("/summary/status", async (req, res) => {
  try {
    const result = await db.query(`
      SELECT
        COUNT(*) AS total,
        SUM(CASE WHEN stage_status IN ('Draft', 'Pending') THEN 1 ELSE 0 END) AS in_pending_fix,
        SUM(CASE WHEN stage_status = 'In Progress' THEN 1 ELSE 0 END) AS in_progress,
        SUM(CASE WHEN stage_status = 'Completed' THEN 1 ELSE 0 END) AS completed,
        SUM(CASE WHEN stage_status = 'Approved' THEN 1 ELSE 0 END) AS approved,
        SUM(CASE WHEN stage_status = 'Submitted' THEN 1 ELSE 0 END) AS submitted
      FROM technical_recommendations;
    `);

    // Back-compat: expose 'pending' key (alias) for frontend consumption
    const row = result.rows[0] || {};
    row.pending = row.in_pending_fix ?? row.inPendingFix ?? 0;
    delete row.in_pending_fix;
    delete row.inPendingFix;
    return res.json(row);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Failed to fetch status summary" });
  }
});

// File upload endpoint for technical recommendations
router.post("/:id/attachments", async (req, res) => {
  try {
    const { id: trId } = req.params;
    const { files } = req.body;

    if (!files || !Array.isArray(files) || files.length === 0) {
      return res.status(400).json({ error: "No files provided" });
    }

    const crmPool = await poolCrmPromise;
    const uploadedFiles = [];
    const newFileIds = [];

    for (const file of files) {
      // Validate file data
      if (!file.name || !file.base64 || !file.type || !file.size) {
        console.warn("Skipping invalid file:", file);
        continue;
      }

      // Validate file size (10MB limit)
      if (file.size > 10 * 1024 * 1024) {
        return res.status(400).json({ 
          error: `File "${file.name}" exceeds 10MB limit` 
        });
      }

      // Convert base64 to binary
      const fileBuffer = Buffer.from(file.base64, 'base64');

      // Insert file into MSSQL
      const result = await crmPool
        .request()
        .input('tr_id', trId)
        .input('filename', file.name)
        .input('file_size', file.size)
        .input('file_type', file.type)
        .input('file_data', fileBuffer)
        .input('uploaded_by', req.user?.id || null)
        .query(`
          INSERT INTO [crmdb].[FileStorage] 
          (TrId, FileName, FileSize, FileType, Content, UploadDate, UploadedBy)
          VALUES (@tr_id, @filename, @file_size, @file_type, @file_data, GETDATE(), @uploaded_by);
          SELECT SCOPE_IDENTITY() as id;
        `);

      if (result.recordset && result.recordset[0]) {
        const fileId = result.recordset[0].id;
        newFileIds.push(fileId);
        
        uploadedFiles.push({
          Id: fileId,
          FileName: file.name,
          FileSize: file.size,
          FileType: file.type,
          UploadDate: new Date().toISOString()
        });
      }
    }

    // Update PostgreSQL attachments field with new file IDs (append to existing)
    if (newFileIds.length > 0) {
      try {
        // Get current file IDs from PostgreSQL
        const currentTrRes = await db.query(
          `SELECT attachments FROM technical_recommendations WHERE id = $1`,
          [trId]
        );
        
        let currentFileIds = [];
        if (currentTrRes.rows[0]?.attachments) {
          try {
            const parsed = JSON.parse(currentTrRes.rows[0].attachments);
            currentFileIds = Array.isArray(parsed) ? parsed : [];
          } catch {
            currentFileIds = [];
          }
        }

        // Append new file IDs to existing ones
        const updatedFileIds = [...currentFileIds, ...newFileIds];

        // Update PostgreSQL attachments field
        await db.query(
          `UPDATE technical_recommendations SET attachments = $1 WHERE id = $2`,
          [JSON.stringify(updatedFileIds), trId]
        );

        console.log(`✅ Updated PostgreSQL attachments with file IDs [${updatedFileIds.join(', ')}] for TR ${trId}`);
      } catch (pgError) {
        console.warn("Failed to update PostgreSQL attachments:", pgError.message);
      }
    }

    console.log(`✅ Uploaded ${uploadedFiles.length} files for TR ${trId}`);
    
    res.json({
      message: `Successfully uploaded ${uploadedFiles.length} files`,
      files: uploadedFiles
    });

  } catch (error) {
    console.error("File upload error:", error);
    return res.status(500).json({ error: "Failed to upload files" });
  }
});

// Get attachments for a technical recommendation
router.get("/:id/attachments", async (req, res) => {
  try {
    const { id: trId } = req.params;
    const crmPool = await poolCrmPromise;

    const result = await crmPool
      .request()
      .input('tr_id', trId)
      .query(`
        SELECT Id, FileName, FileSize, FileType, UploadDate, UploadedBy
        FROM [crmdb].[FileStorage] 
        WHERE TrId = @tr_id
        ORDER BY UploadDate DESC
      `);

    res.json(result.recordset);

  } catch (error) {
    console.error("Get attachments error:", error);
    return res.status(500).json({ error: "Failed to get attachments" });
  }
});

// Download a specific attachment
router.get("/:id/attachments/:attachmentId/download", async (req, res) => {
  try {
    const { attachmentId } = req.params;
    const crmPool = await poolCrmPromise;

    console.log(`🔍 Downloading attachment ID ${attachmentId} for TR ${req.params.id}`);

    const result = await crmPool
      .request()
      .input('attachment_id', attachmentId)
      .query(`
        SELECT FileName, FileType, Content
        FROM [crmdb].[FileStorage] 
        WHERE Id = @attachment_id
      `);

    if (result.recordset.length === 0) {
      return res.status(404).json({ error: "File not found" });
    }

    const file = result.recordset[0];
    
    res.set({
      'Content-Type': file.FileType,
      'Content-Disposition': `attachment; filename="${file.FileName}"`,
      'Content-Length': file.Content.length
    });

    console.log(`✅ Serving download for file: ${file.FileName} (Type: ${file.FileType}, Size: ${file.Content.length} bytes)`);

    res.send(file.Content);

  } catch (error) {
    console.error("File download error:", error);
    return res.status(500).json({ error: "Failed to download file" });
  }
});

// Delete an attachment
router.delete("/:id/attachments/:attachmentId", async (req, res) => {
  try {
    const { attachmentId } = req.params;
    const crmPool = await poolCrmPromise;

    const result = await crmPool
      .request()
      .input('attachment_id', attachmentId)
      .query(`
        DELETE FROM [crmdb].[FileStorage] 
        WHERE Id = @attachment_id;
        SELECT @@ROWCOUNT as deleted_count;
      `);

    if (result.recordset[0].deleted_count === 0) {
      return res.status(404).json({ error: "File not found" });
    }

    // Also update PostgreSQL JSONB to remove the deleted file ID
    try {
      const { id: trId } = req.params;
      
      // Get current file IDs from PostgreSQL
      const currentTrRes = await db.query(
        `SELECT attachments FROM technical_recommendations WHERE id = $1`,
        [trId]
      );
      
      if (currentTrRes.rows[0]?.attachments) {
        let currentFileIds = [];
        try {
          const parsed = JSON.parse(currentTrRes.rows[0].attachments);
          currentFileIds = Array.isArray(parsed) ? parsed : [];
        } catch {
          currentFileIds = [];
        }

        // Filter out the deleted file ID
        const updatedFileIds = currentFileIds.filter(id => 
          String(id) !== String(attachmentId)
        );

        // Update PostgreSQL attachments field with remaining file IDs
        await db.query(
          `UPDATE technical_recommendations SET attachments = $1 WHERE id = $2`,
          [JSON.stringify(updatedFileIds), trId]
        );

        console.log(`✅ Updated PostgreSQL attachments, removed file ID ${attachmentId} from TR ${trId}`);
      }
    } catch (pgError) {
      console.warn("Failed to update PostgreSQL attachments after delete:", pgError.message);
      // Don't fail the delete operation if PostgreSQL update fails
    }

    res.json({ message: "File deleted successfully" });

  } catch (error) {
    console.error("File delete error:", error);
    return res.status(500).json({ error: "Failed to delete file" });
  }
});

export default router;
