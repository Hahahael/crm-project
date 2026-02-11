import express from "express";
import { poolPromise } from "../mssql.js";
import db from "../db.js";

const router = express.Router();

// Helper: resolve a candidate Customer_Id against spidb.customer.
// If candidateId exists in MSSQL, return it. Otherwise, if candidateName provided,
// attempt to find a matching customer by name. If still not found, return the first
// available customer Id (to avoid FK constraint failures) or null if none exist.
async function resolveCustomerId(pool, candidateId, candidateName) {
  try {
    const req = pool.request();
    if (candidateId != null) {
      req.input("cid", candidateId);
      const r = await req.query(
        "SELECT Id FROM spidb.customer WHERE Id = @cid",
      );
      if (r && r.recordset && r.recordset.length > 0) return r.recordset[0].Id;
    }

    if (candidateName) {
      const req2 = pool.request();
      req2.input("cname", `%${candidateName}%`);
      const r2 = await req2.query(
        "SELECT TOP (1) Id FROM spidb.customer WHERE [Name] LIKE @cname",
      );
      if (r2 && r2.recordset && r2.recordset.length > 0)
        return r2.recordset[0].Id;
    }

    // fallback: return first customer Id available
    const r3 = await pool
      .request()
      .query("SELECT TOP (1) Id FROM spidb.customer ORDER BY Id ASC");
    if (r3 && r3.recordset && r3.recordset.length > 0)
      return r3.recordset[0].Id;
    return null;
  } catch (err) {
    console.error("resolveCustomerId error:", err);
    return null;
  }
}

// GET /api/mssql/quotations?limit=100&wo_id=123
router.get("/quotations", async (req, res) => {
  try {
    const limit = parseInt(req.query.limit, 10) || 200;
    const wo_id = req.query.wo_id;

    const pool = await poolPromise;
    let q = "SELECT TOP (@limit) * FROM spidb.quotation ORDER BY id DESC";
    // If wo_id provided, filter
    // if (wo_id) {
    //     q = 'SELECT * FROM quotation WHERE wo_id = @wo_id ORDER BY id DESC';
    // }

    const request = pool.request();
    request.input("limit", limit);
    if (wo_id) request.input("wo_id", wo_id);

    const result = await request.query(q);
    return res.json(result.recordset);
  } catch (err) {
    console.error("MSSQL /quotations error:", err);
    return res.status(500).json({ error: err.message });
  }
});

// GET /api/mssql/quotations/:id -> returns quotation and its details
router.get("/quotations/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const pool = await poolPromise;

    const qRes = await pool
      .request()
      .input("id", id)
      .query("SELECT * FROM quotation WHERE id = @id");
    if (!qRes.recordset || qRes.recordset.length === 0) {
      return res.status(404).json({ error: "Quotation not found" });
    }

    const quotation = qRes.recordset[0];

    const detailsRes = await pool
      .request()
      .input("quotation_id", id)
      .query(
        "SELECT * FROM quotation_details WHERE quotation_id = @quotation_id",
      );
    quotation.details = detailsRes.recordset || [];

    return res.json(quotation);
  } catch (err) {
    console.error("MSSQL /quotations/:id error:", err);
    return res.status(500).json({ error: err.message });
  }
});

// POST /api/mssql/quotations
// Body shape: { quotation: { ...fields }, details: [ { ...detailFields }, ... ] }
// This handler will insert the quotation and its related details inside a transaction.
router.post("/quotations", async (req, res) => {
  const { quotation = {}, details = [], contact = {} } = req.body || {};

  // Allowed columns for insertion (based on provided MSSQL schema). Exclude identity PK columns.
  const allowedQuotationCols = [
    "Code",
    "Customer_Id",
    "TotalQty",
    "VatType",
    "TotalWithOutVAT",
    "VAT",
    "TotalWithVat",
    "ValidityDate",
    "ModifiedBy",
    "DateModified",
    "Status",
    "isConvertedToSO",
    "Notes",
    "Validity",
    "Discount",
    "IsOverallDiscount",
    "Customer_Attn_id",
    "Customer_CC_id",
    "DateConverted",
    "DateCancelled",
    "Discount_Amount",
    "CurrencyId",
    "Price_Basis_id",
    "SalesAgentId",
    "SalesAreaId",
    "AreaManagerId",
    "SalesClassificationId",
    "SalesInquirySourceId",
    "DepartmentId",
  ];

  const allowedDetailCols = [
    "Qty",
    "Stock_Id",
    "Quotation_Id",
    "Amount",
    "Discounted_Amount",
    "Stock_Counter_Offer_id",
    "Item_Availability_Id",
    "Discount",
    "Unit_Price",
    "CustomerInquiry",
    "ItemAvailability",
    "Obsolete_Item_Id",
    "ServiceChargeRate",
    "isConvertedToSO",
    "DateConvertedToSO",
  ];

  if (!quotation || Object.keys(quotation).length === 0) {
    return res
      .status(400)
      .json({ error: "Quotation object is required in the request body" });
  }

  // Filter incoming objects to allowed columns only
  const filteredQuotation = {};
  for (const k of Object.keys(quotation)) {
    if (allowedQuotationCols.includes(k)) filteredQuotation[k] = quotation[k];
  }

  // Set default ValidityDate and ModifiedBy when not provided
  try {
    const todayIso = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
    if (!filteredQuotation.ValidityDate)
      filteredQuotation.ValidityDate = todayIso;
    if (!filteredQuotation.ModifiedBy) filteredQuotation.ModifiedBy = 50; // fixed for now
  } catch {
    // ignore if date formatting fails
  }

  if (Object.keys(filteredQuotation).length === 0) {
    return res
      .status(400)
      .json({ error: "No valid quotation fields provided" });
  }

  const pool = await poolPromise;
  const transaction = pool.transaction();
  try {
    await transaction.begin();
    const trxReq = transaction.request();

    // Ensure Customer_Id resolves to an existing spidb.customer.Id to avoid FK errors
    if (
      filteredQuotation.Customer_Id == null &&
      (quotation.CustomerName ||
        quotation.Customer_Name ||
        quotation.customerName)
    ) {
      const pool = await poolPromise;
      const resolved = await resolveCustomerId(
        pool,
        null,
        quotation.CustomerName ||
        quotation.Customer_Name ||
        quotation.customerName,
      );
      if (resolved) filteredQuotation.Customer_Id = resolved;
    } else if (filteredQuotation.Customer_Id != null) {
      const pool = await poolPromise;
      const resolved = await resolveCustomerId(
        pool,
        filteredQuotation.Customer_Id,
        null,
      );
      if (resolved) filteredQuotation.Customer_Id = resolved;
    } else {
      // try to fallback to first customer id if none provided
      const pool = await poolPromise;
      const resolved = await resolveCustomerId(pool, null, null);
      if (resolved) filteredQuotation.Customer_Id = resolved;
    }


    const trxCustAttn = transaction.request();
    const insertCustAttnSql = `INSERT INTO spidb.customer_contact(Contact_Type_Id,customer_Id,MobileNumber,EmailAddress,Name,isActive,Designation) OUTPUT INSERTED.* 
      VALUES ('${contact.contact_type_id || 2}','${contact.customer_id || filteredQuotation.Customer_Id || 0}','${contact.contact_number || ''}','${contact.email_address || ''}','${contact.contact_person || ''}',1,'')`;
    const CustAttn = await trxCustAttn.query(insertCustAttnSql);

    // console.log("CustAttn",CustAttn)

    // Build parameterized INSERT for quotation using allowed / filtered keys
    const qKeys = Object.keys(filteredQuotation);
    const qCols = qKeys.map((k) => `[${k}]`).join(", ");
    const qParams = qKeys.map((_, i) => `@q${i}`).join(", ");
    qKeys.forEach((k, i) => trxReq.input(`q${i}`, filteredQuotation[k]));

    const insertQuotationSql = `INSERT INTO spidb.quotation (${qCols},Customer_Attn_id) OUTPUT INSERTED.* VALUES (${qParams},${CustAttn.recordset[0].Id})`;

    const insertRes = await trxReq.query(insertQuotationSql);
    const insertedQuotation = insertRes.recordset && insertRes.recordset[0];

    if (!insertedQuotation) {
      throw new Error("Failed to insert quotation");
    }

    // Insert filtered details if any
    const insertedDetails = [];
    for (const detailRaw of details) {
      const detail = {};
      for (const k of Object.keys(detailRaw)) {
        if (allowedDetailCols.includes(k)) detail[k] = detailRaw[k];
      }

      // Ensure foreign key to quotation exists (insertedQuotation.Id is MSSQL PK)
      detail.Quotation_Id = insertedQuotation.Id;

      const trxQrStatus = transaction.request();
      const insertQRStatusSql = `INSERT INTO spidb.qr_status(QRId,qr_status_setup_id) OUTPUT INSERTED.* VALUES ('${insertedQuotation.Id}','1')`;
      await trxQrStatus.query(insertQRStatusSql);


      const trxUpdQuot = transaction.request();
      const updateQuotationSql = `UPDATE spidb.quotation SET isConvertedToSO=NULL,DateCancelled=NULL WHERE Id ='${insertedQuotation.Id}'`;
      await trxUpdQuot.query(updateQuotationSql);

      const dk = Object.keys(detail);
      if (dk.length === 0) continue; // nothing to insert for this detail

      const dCols = dk.map((k) => `[${k}]`).join(", ");
      const dParams = dk.map((_, i) => `@d${i}`).join(", ");
      const dReq = transaction.request();
      dk.forEach((k, i) => dReq.input(`d${i}`, detail[k]));

      // console.log("Inserting detail:", dParams, detail);
      const insertDetailSql = `INSERT INTO spidb.quotation_details (${dCols}) OUTPUT INSERTED.* VALUES (${dParams})`;
      // // console.log("INSERT TO DETAILS" , insertDetailSql, dReq )
      const dRes = await dReq.query(insertDetailSql);
      if (dRes.recordset && dRes.recordset[0])
        insertedDetails.push(dRes.recordset[0]);
    }

    await transaction.commit();

    // Attach details array to returned object
    insertedQuotation.details = insertedDetails;
    // console.log("Inserted quotation:", insertedQuotation);

    // Side-effect: mark linked Work Order as Completed if a WO context was provided upstream.
    // We expect the frontend to submit to Postgres first and know the wo_id. Since MSSQL schema
    // doesn't carry wo_id, we rely on a hint via Code or an explicit POSTGRES_WO_ID in the payload
    // when available. Best-effort update guarded in try/catch.
    const hintedWoId = req.body?.POSTGRES_WO_ID || null;
    if (hintedWoId) {
      try {
        await db.query(
          `UPDATE workorders SET stage_status = 'Completed', updated_at = NOW(), done_date = NOW() WHERE id = $1`,
          [hintedWoId],
        );
        await db.query(
          `UPDATE quotations SET stage_status = 'Completed', updated_at = NOW(), done_date = NOW() WHERE id = $1`,
          [hintedWoId],
        );
        // Record a workflow stage: Quotations -> Submitted (idempotent)
        const existing = await db.query(
          `SELECT * FROM workflow_stages WHERE wo_id = $1 AND stage_name = 'Quotations' ORDER BY created_at DESC LIMIT 1`,
          [hintedWoId],
        );
        const latest = existing.rows?.[0];
        if (!latest || String(latest.status) !== "Submitted") {
          await db.query(
            `INSERT INTO workflow_stages (wo_id, stage_name, status, assigned_to, notified, created_at, updated_at)
             VALUES ($1, $2, $3, $4, $5, NOW(), NOW())`,
            [hintedWoId, "Quotations", "Submitted", null, false],
          );
        }
      } catch (sideErr) {
        console.warn("Post-MSSQL completion side-effect failed:", sideErr.message);
      }
    }

    return res.status(201).json(insertedQuotation);
  } catch (err) {
    console.error("MSSQL POST /quotations error:", err);
    try {
      await transaction.rollback();
    } catch (rerr) {
      console.error("Transaction rollback failed:", rerr);
    }
    return res.status(500).json({ error: err.message });
  }
});

export default router;

// Quick test endpoint: POST /api/mssql/quotations/quick
// Inserts a minimal sample quotation and one or more details. Useful for testing until full mapping is wired.
router.post("/quotations/quick", async (req, res) => {
  try {
    const body = req.body || {};
    // If caller provided a quotation/details use them, otherwise build a sensible sample
    const incomingQuotation = body.quotation || null;
    const incomingDetails = Array.isArray(body.details)
      ? body.details
      : body.details
        ? [body.details]
        : null;

    const sampleQuotation = {
      Code: `TEST-${Date.now() % 100000}`,
      Customer_Id: 225,
      TotalQty: 1,
      VatType: 1,
      TotalWithOutVAT: 100.0,
      VAT: 0.0,
      TotalWithVat: 100.0,
      ValidityDate: new Date().toISOString().slice(0, 10),
      ModifiedBy: 50,
      DateModified: new Date().toISOString(),
      Status: 0,
      Notes: "Quick test insert",
      CurrencyId: 2,
      Price_Basis_id: 1,
      DepartmentId: 12,
    };

    const sampleDetails = [
      { Qty: 1, Stock_Id: 4574, Amount: 100.0, Unit_Price: 100.0, Discount: 0 },
    ];

    const quotation =
      incomingQuotation && Object.keys(incomingQuotation).length > 0
        ? incomingQuotation
        : sampleQuotation;
    const details =
      incomingDetails && incomingDetails.length > 0
        ? incomingDetails
        : sampleDetails;

    // Reuse existing allowed columns to filter
    const allowedQuotationCols = [
      "Code",
      "Customer_Id",
      "TotalQty",
      "VatType",
      "TotalWithOutVAT",
      "VAT",
      "TotalWithVat",
      "ValidityDate",
      "ModifiedBy",
      "DateModified",
      "Status",
      "isConvertedToSO",
      "Notes",
      "Validity",
      "Discount",
      "IsOverallDiscount",
      "Customer_Attn_id",
      "Customer_CC_id",
      "DateConverted",
      "DateCancelled",
      "Discount_Amount",
      "CurrencyId",
      "Price_Basis_id",
      "SalesAgentId",
      "SalesAreaId",
      "AreaManagerId",
      "SalesClassificationId",
      "SalesInquirySourceId",
      "DepartmentId",
    ];
    const allowedDetailCols = [
      "Qty",
      "Stock_Id",
      "Quotation_Id",
      "Amount",
      "Discounted_Amount",
      "Stock_Counter_Offer_id",
      "Item_Availability_Id",
      "Discount",
      "Unit_Price",
      "CustomerInquiry",
      "ItemAvailability",
      "Obsolete_Item_Id",
      "ServiceChargeRate",
      "isConvertedToSO",
      "DateConvertedToSO",
    ];

    const filteredQuotation = {};
    for (const k of Object.keys(quotation)) {
      if (allowedQuotationCols.includes(k)) filteredQuotation[k] = quotation[k];
    }

    // Ensure Customer_Id resolves to an existing spidb.customer.Id to avoid FK errors
    if (
      filteredQuotation.Customer_Id == null &&
      (quotation.CustomerName ||
        quotation.Customer_Name ||
        quotation.customerName)
    ) {
      const pool = await poolPromise;
      const resolved = await resolveCustomerId(
        pool,
        null,
        quotation.CustomerName ||
        quotation.Customer_Name ||
        quotation.customerName,
      );
      if (resolved) filteredQuotation.Customer_Id = resolved;
    } else if (filteredQuotation.Customer_Id != null) {
      const pool = await poolPromise;
      const resolved = await resolveCustomerId(
        pool,
        filteredQuotation.Customer_Id,
        null,
      );
      if (resolved) filteredQuotation.Customer_Id = resolved;
    } else {
      const pool = await poolPromise;
      const resolved = await resolveCustomerId(pool, null, null);
      if (resolved) filteredQuotation.Customer_Id = resolved;
    }

    const pool = await poolPromise;
    const transaction = pool.transaction();
    await transaction.begin();
    try {
      const trxReq = transaction.request();
      const qKeys = Object.keys(filteredQuotation);
      const qCols = qKeys.map((k) => `[${k}]`).join(", ");
      const qParams = qKeys.map((_, i) => `@q${i}`).join(", ");
      qKeys.forEach((k, i) => trxReq.input(`q${i}`, filteredQuotation[k]));

      const insertQuotationSql = `INSERT INTO spidb.quotation (${qCols}) OUTPUT INSERTED.* VALUES (${qParams})`;
      const insertRes = await trxReq.query(insertQuotationSql);
      const insertedQuotation = insertRes.recordset && insertRes.recordset[0];
      if (!insertedQuotation) throw new Error("Failed to insert quotation");

      const insertedDetails = [];
      for (const detailRaw of details) {
        const detail = {};
        for (const k of Object.keys(detailRaw)) {
          if (allowedDetailCols.includes(k)) detail[k] = detailRaw[k];
        }
        // Ensure FK
        detail.Quotation_Id = insertedQuotation.Id;

        const dk = Object.keys(detail);
        if (dk.length === 0) continue;

        const dCols = dk.map((k) => `[${k}]`).join(", ");
        const dParams = dk.map((_, i) => `@d${i}`).join(", ");
        const dReq = transaction.request();
        dk.forEach((k, i) => dReq.input(`d${i}`, detail[k]));
        const insertDetailSql = `INSERT INTO spidb.quotation_details (${dCols}) OUTPUT INSERTED.* VALUES (${dParams})`;
        const dRes = await dReq.query(insertDetailSql);
        if (dRes.recordset && dRes.recordset[0])
          insertedDetails.push(dRes.recordset[0]);
      }

      await transaction.commit();
      insertedQuotation.details = insertedDetails;
      return res.status(201).json(insertedQuotation);
    } catch (err) {
      await transaction.rollback();
      console.error("Quick insert transaction failed:", err);
      return res.status(500).json({ error: err.message });
    }
  } catch (err) {
    console.error("Quick insert error:", err);
    return res.status(500).json({ error: err.message });
  }
});

// POST /api/mssql/quotations/search
// Body: { page = 1, pageSize = 50, Code, CreatedBy, Name, Model }
router.post("/quotations/search", async (req, res) => {
  try {
    const {
      page = 1,
      pageSize = 50,
      Code = "",
      CreatedBy = "",
      Name = "",
      Model = "",
    } = req.body || {};
    const offset = (page - 1) * pageSize;

    const pool = await poolPromise;
    const request = pool.request();
    // sanitize inputs through parameterization
    request.input("Code", `%${Code}%`);
    request.input("CreatedBy", `%${CreatedBy}%`);
    request.input("Name", `%${Name}%`);
    request.input("Model", `%${Model}%`);
    request.input("pageSize", pageSize);
    request.input("offset", offset + 1); // 1-based rn start

    // Build query using ROW_NUMBER for pagination
    const sql = `
            SELECT rn, * FROM (
                SELECT ROW_NUMBER() OVER (ORDER BY s.id DESC) AS rn, s.*
                FROM (
                    SELECT DISTINCT
                        q.Id,
                        q.Code AS QuotationNo,
                        c.[Name] AS CustomerName,
                        CONVERT(varchar, q.ValidityDate, 101) AS ValidityDate,
                        CONVERT(varchar, q.DateModified, 101) AS DateCreated,
                        u.Createdby AS CreatedBy,
                        u.Id AS ModifiedBy,
                        qrs.qr_status_setup_id,
                        CONVERT(varchar, qrs.next_ff, 101) AS next_ff
                    FROM spidb.quotation q
                        INNER JOIN (SELECT LEFT(firstname,1) + '. ' + Lastname AS Createdby, * FROM spidb.users) u
                            ON q.ModifiedBy = u.Id
                        INNER JOIN spidb.customer c ON q.Customer_Id = c.Id
                        INNER JOIN spidb.quotation_details qd ON q.Id = qd.[Quotation_Id]
                        LEFT JOIN (SELECT Quotation_Id, COUNT(1) ctr FROM spidb.quotation_details GROUP BY Quotation_Id) qod
                            ON qod.Quotation_Id = q.Id
                        INNER JOIN (SELECT Id, Stock_id, Code AS PartNumber FROM spidb.stock_details) std
                            ON qd.Stock_Id = std.Id
                        INNER JOIN spidb.stock s ON s.Id = std.Stock_Id
                        INNER JOIN (SELECT ID, [Description] AS Model FROM spidb.brand) b ON s.BRAND_ID = b.ID
                        LEFT JOIN spidb.qr_status qrs ON q.Id = qrs.QRId
                    WHERE q.isConvertedToSO IS NULL
                        AND q.DateCancelled IS NULL
                        AND (@Code = '%%' OR q.Code LIKE @Code)
                        AND (@CreatedBy = '%%' OR u.Createdby LIKE @CreatedBy)
                        AND (@Name = '%%' OR c.[Name] LIKE @Name)
                        AND (@Model = '%%' OR b.Model LIKE @Model)
                ) s
            ) t
            WHERE rn BETWEEN @offset AND (@offset + @pageSize - 1)
            ORDER BY rn;

            -- total count
            SELECT COUNT(1) AS total FROM (
                SELECT DISTINCT q.Id
                FROM spidb.quotation q
                    INNER JOIN (SELECT LEFT(firstname,1) + '. ' + Lastname AS Createdby, * FROM spidb.users) u
                        ON q.ModifiedBy = u.Id
                    INNER JOIN spidb.customer c ON q.Customer_Id = c.Id
                    INNER JOIN spidb.quotation_details qd ON q.Id = qd.[Quotation_Id]
                    INNER JOIN (SELECT Id, Stock_id FROM spidb.stock_details) std ON qd.Stock_Id = std.Id
                    INNER JOIN spidb.stock s ON s.Id = std.Stock_Id
                    INNER JOIN (SELECT ID, [Description] AS Model FROM spidb.brand) b ON s.BRAND_ID = b.ID
                    LEFT JOIN spidb.qr_status qrs ON q.Id = qrs.QRId
                WHERE q.isConvertedToSO IS NULL
                    AND q.DateCancelled IS NULL
                    AND (@Code = '%%' OR q.Code LIKE @Code)
                    AND (@CreatedBy = '%%' OR u.Createdby LIKE @CreatedBy)
                    AND (@Name = '%%' OR c.[Name] LIKE @Name)
                    AND (@Model = '%%' OR b.Model LIKE @Model)
            ) c;
        `;

    const result = await request.query(sql);

    // result.recordsets[0] -> paged rows, result.recordsets[1] -> total count
    const rows =
      result.recordsets && result.recordsets[0] ? result.recordsets[0] : [];
    const total =
      result.recordsets && result.recordsets[1] && result.recordsets[1][0]
        ? result.recordsets[1][0].total
        : 0;

    return res.json({ page, pageSize, total, rows });
  } catch (err) {
    console.error("MSSQL /quotations/search error:", err);
    return res.status(500).json({ error: err.message });
  }
});
