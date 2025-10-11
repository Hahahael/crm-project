import express from 'express';
import { spidbPoolPromise } from '../mssql.js';

const router = express.Router();

// Single, clean implementation for quotation endpoints only.
// This file intentionally focuses on spidb (inventory/vendor) operations.

async function resolveCustomerId(pool, candidateId, candidateName) {
  try {
    if (candidateId != null) {
      const r = await pool.request().input('cid', candidateId).query('SELECT Id FROM spidb.customer WHERE Id = @cid');
      if (r && r.recordset && r.recordset[0]) return r.recordset[0].Id;
    }
    if (candidateName) {
      const r2 = await pool.request().input('cname', `%${candidateName}%`).query("SELECT TOP (1) Id FROM spidb.customer WHERE [Name] LIKE @cname");
      if (r2 && r2.recordset && r2.recordset[0]) return r2.recordset[0].Id;
    }
    const r3 = await pool.request().query('SELECT TOP (1) Id FROM spidb.customer ORDER BY Id ASC');
    if (r3 && r3.recordset && r3.recordset[0]) return r3.recordset[0].Id;
    return null;
  } catch (err) {
    console.error('resolveCustomerId error:', err);
    return null;
  }
}

// GET /quotations - list
router.get('/quotations', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit, 10) || 200;
    const pool = await spidbPoolPromise;
    const r = await pool.request().input('limit', limit).query('SELECT TOP (@limit) * FROM spidb.quotation ORDER BY Id DESC');
    return res.json(r.recordset || []);
  } catch (err) {
    console.error('MSSQL /quotations error:', err);
    return res.status(500).json({ error: err.message });
  }
});

// GET /quotations/:id - detail
router.get('/quotations/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const pool = await spidbPoolPromise;
    const qRes = await pool.request().input('id', id).query('SELECT * FROM spidb.quotation WHERE Id = @id');
    if (!qRes.recordset || qRes.recordset.length === 0) return res.status(404).json({ error: 'Quotation not found' });
    const quotation = qRes.recordset[0];
    const detailsRes = await pool.request().input('quotation_id', id).query('SELECT * FROM spidb.quotation_details WHERE Quotation_Id = @quotation_id');
    quotation.details = detailsRes.recordset || [];
    return res.json(quotation);
  } catch (err) {
    console.error('MSSQL /quotations/:id error:', err);
    return res.status(500).json({ error: err.message });
  }
});

// POST /quotations - create with details (transactional)
router.post('/quotations', async (req, res) => {
  const { quotation = {}, details = [] } = req.body || {};
  const allowedQuotationCols = [
    'Code','Customer_Id','TotalQty','VatType','TotalWithOutVAT','VAT','TotalWithVat','ValidityDate','ModifiedBy','DateModified','Status','isConvertedToSO','Notes','Validity','Discount','IsOverallDiscount','Customer_Attn_id','Customer_CC_id','DateConverted','DateCancelled','Discount_Amount','CurrencyId','Price_Basis_id','SalesAgentId','SalesAreaId','AreaManagerId','SalesClassificationId','SalesInquirySourceId','DepartmentId'
  ];
  const allowedDetailCols = [
    'Qty','Stock_Id','Quotation_Id','Amount','Discounted_Amount','Stock_Counter_Offer_id','Item_Availability_Id','Discount','Unit_Price','CustomerInquiry','ItemAvailability','Obsolete_Item_Id','ServiceChargeRate','isConvertedToSO','DateConvertedToSO'
  ];

  if (!quotation || Object.keys(quotation).length === 0) return res.status(400).json({ error: 'Quotation required' });

  const filteredQuotation = {};
  for (const k of Object.keys(quotation)) if (allowedQuotationCols.includes(k)) filteredQuotation[k] = quotation[k];

  const todayStr = new Date().toISOString().slice(0, 10);
  if (!filteredQuotation.ModifiedBy) filteredQuotation.ModifiedBy = 1;
  if (!filteredQuotation.ValidityDate) filteredQuotation.ValidityDate = filteredQuotation.ValidityDate || todayStr;

  if (Object.keys(filteredQuotation).length === 0) return res.status(400).json({ error: 'No valid quotation fields provided' });

  const pool = await spidbPoolPromise;
  const transaction = pool.transaction();
  try {
    await transaction.begin();
    const trxReq = transaction.request();

    // resolve customer
    if (filteredQuotation.Customer_Id == null && (quotation.CustomerName || quotation.Customer_Name || quotation.customerName)) {
      const resolved = await resolveCustomerId(pool, null, quotation.CustomerName || quotation.Customer_Name || quotation.customerName);
      if (resolved) filteredQuotation.Customer_Id = resolved;
    } else if (filteredQuotation.Customer_Id != null) {
      const resolved = await resolveCustomerId(pool, filteredQuotation.Customer_Id, null);
      if (resolved) filteredQuotation.Customer_Id = resolved;
    } else {
      const resolved = await resolveCustomerId(pool, null, null);
      if (resolved) filteredQuotation.Customer_Id = resolved;
    }

    const qKeys = Object.keys(filteredQuotation);
    const qCols = qKeys.map((k) => `[${k}]`).join(', ');
    const qParams = qKeys.map((_, i) => `@q${i}`).join(', ');
    qKeys.forEach((k, i) => trxReq.input(`q${i}`, filteredQuotation[k]));

    const insertQuotationSql = `INSERT INTO spidb.quotation (${qCols}) OUTPUT INSERTED.* VALUES (${qParams})`;
    const insertRes = await trxReq.query(insertQuotationSql);
    const insertedQuotation = insertRes.recordset && insertRes.recordset[0];
    if (!insertedQuotation) throw new Error('Failed to insert quotation');

    const insertedDetails = [];
    for (const detailRaw of details) {
      const detail = {};
      for (const k of Object.keys(detailRaw)) if (allowedDetailCols.includes(k)) detail[k] = detailRaw[k];
      detail.Quotation_Id = insertedQuotation.Id;
      const dk = Object.keys(detail);
      if (dk.length === 0) continue;
      const dCols = dk.map((k) => `[${k}]`).join(', ');
      const dParams = dk.map((_, i) => `@d${i}`).join(', ');
      const dReq = transaction.request();
      dk.forEach((k, i) => dReq.input(`d${i}`, detail[k]));
      const insertDetailSql = `INSERT INTO spidb.quotation_details (${dCols}) OUTPUT INSERTED.* VALUES (${dParams})`;
      const dRes = await dReq.query(insertDetailSql);
      if (dRes.recordset && dRes.recordset[0]) insertedDetails.push(dRes.recordset[0]);
    }

    await transaction.commit();
    insertedQuotation.details = insertedDetails;
    return res.status(201).json(insertedQuotation);
  } catch (err) {
    console.error('MSSQL POST /quotations error:', err);
    try { await transaction.rollback(); } catch (rerr) { console.error('Transaction rollback failed:', rerr); }
    return res.status(500).json({ error: err.message });
  }
});

// POST /quotations/quick - helper quick insert
router.post('/quotations/quick', async (req, res) => {
  try {
    const body = req.body || {};
    const incomingQuotation = body.quotation || null;
    const incomingDetails = Array.isArray(body.details) ? body.details : body.details ? [body.details] : null;

    const sampleQuotation = {
      Code: `TEST-${Date.now() % 100000}`,
      Customer_Id: 225,
      TotalQty: 1,
      VatType: 1,
      TotalWithOutVAT: 100.0,
      VAT: 0.0,
      TotalWithVat: 100.0,
      ValidityDate: new Date().toISOString().slice(0, 10),
      ModifiedBy: 1,
      DateModified: new Date().toISOString(),
      Status: 0,
      Notes: 'Quick test insert',
      CurrencyId: 2,
      Price_Basis_id: 1,
      DepartmentId: 12,
    };

    const sampleDetails = [ { Qty: 1, Stock_Id: 4574, Amount: 100.0, Unit_Price: 100.0, Discount: 0 } ];

    const quotation = incomingQuotation && Object.keys(incomingQuotation).length > 0 ? incomingQuotation : sampleQuotation;
    const details = incomingDetails && incomingDetails.length > 0 ? incomingDetails : sampleDetails;

    const allowedQuotationCols = [ 'Code','Customer_Id','TotalQty','VatType','TotalWithOutVAT','VAT','TotalWithVat','ValidityDate','ModifiedBy','DateModified','Status','isConvertedToSO','Notes','Validity','Discount','IsOverallDiscount','Customer_Attn_id','Customer_CC_id','DateConverted','DateCancelled','Discount_Amount','CurrencyId','Price_Basis_id','SalesAgentId','SalesAreaId','AreaManagerId','SalesClassificationId','SalesInquirySourceId','DepartmentId' ];
    const allowedDetailCols = [ 'Qty','Stock_Id','Quotation_Id','Amount','Discounted_Amount','Stock_Counter_Offer_id','Item_Availability_Id','Discount','Unit_Price','CustomerInquiry','ItemAvailability','Obsolete_Item_Id','ServiceChargeRate','isConvertedToSO','DateConvertedToSO' ];

    const filteredQuotation = {};
    for (const k of Object.keys(quotation)) if (allowedQuotationCols.includes(k)) filteredQuotation[k] = quotation[k];

    const pool = await spidbPoolPromise;
    if (filteredQuotation.Customer_Id == null && (quotation.CustomerName || quotation.Customer_Name || quotation.customerName)) {
      const resolved = await resolveCustomerId(pool, null, quotation.CustomerName || quotation.Customer_Name || quotation.customerName);
      if (resolved) filteredQuotation.Customer_Id = resolved;
    } else if (filteredQuotation.Customer_Id != null) {
      const resolved = await resolveCustomerId(pool, filteredQuotation.Customer_Id, null);
      if (resolved) filteredQuotation.Customer_Id = resolved;
    } else {
      const resolved = await resolveCustomerId(pool, null, null);
      if (resolved) filteredQuotation.Customer_Id = resolved;
    }

    const transaction = pool.transaction();
    await transaction.begin();
    try {
      const trxReq = transaction.request();
      const qKeys = Object.keys(filteredQuotation);
      const qCols = qKeys.map((k) => `[${k}]`).join(', ');
      const qParams = qKeys.map((_, i) => `@q${i}`).join(', ');
      qKeys.forEach((k, i) => trxReq.input(`q${i}`, filteredQuotation[k]));

      const insertQuotationSql = `INSERT INTO spidb.quotation (${qCols}) OUTPUT INSERTED.* VALUES (${qParams})`;
      const insertRes = await trxReq.query(insertQuotationSql);
      const insertedQuotation = insertRes.recordset && insertRes.recordset[0];
      if (!insertedQuotation) throw new Error('Failed to insert quotation');

      const insertedDetails = [];
      for (const detailRaw of details) {
        const detail = {};
        for (const k of Object.keys(detailRaw)) if (allowedDetailCols.includes(k)) detail[k] = detailRaw[k];
        detail.Quotation_Id = insertedQuotation.Id;
        const dk = Object.keys(detail);
        if (dk.length === 0) continue;
        const dCols = dk.map((k) => `[${k}]`).join(', ');
        const dParams = dk.map((_, i) => `@d${i}`).join(', ');
        const dReq = transaction.request();
        dk.forEach((k, i) => dReq.input(`d${i}`, detail[k]));
        const insertDetailSql = `INSERT INTO spidb.quotation_details (${dCols}) OUTPUT INSERTED.* VALUES (${dParams})`;
        const dRes = await dReq.query(insertDetailSql);
        if (dRes.recordset && dRes.recordset[0]) insertedDetails.push(dRes.recordset[0]);
      }

      await transaction.commit();
      insertedQuotation.details = insertedDetails;
      return res.status(201).json(insertedQuotation);
    } catch (err) {
      await transaction.rollback();
      console.error('Quick insert transaction failed:', err);
      return res.status(500).json({ error: err.message });
    }
  } catch (err) {
    console.error('Quick insert error:', err);
    return res.status(500).json({ error: err.message });
  }
});

// POST /quotations/search - paginated search
router.post('/quotations/search', async (req, res) => {
  try {
    const { page = 1, pageSize = 50, Code = '', CreatedBy = '', Name = '', Model = '' } = req.body || {};
    const offset = (page - 1) * pageSize;

    const pool = await spidbPoolPromise;
    const request = pool.request();
    request.input('Code', `%${Code}%`);
    request.input('CreatedBy', `%${CreatedBy}%`);
    request.input('Name', `%${Name}%`);
    request.input('Model', `%${Model}%`);
    request.input('pageSize', pageSize);
    request.input('offset', offset + 1);

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
    const rows = result.recordsets && result.recordsets[0] ? result.recordsets[0] : [];
    const total = result.recordsets && result.recordsets[1] && result.recordsets[1][0] ? result.recordsets[1][0].total : 0;

    return res.json({ page, pageSize, total, rows });
  } catch (err) {
    console.error('MSSQL /quotations/search error:', err);
    return res.status(500).json({ error: err.message });
  }
});

export default router;
import express from 'express';
import { spidbPoolPromise } from '../mssql.js';

const router = express.Router();

// Resolve customer helper
import express from 'express';
import { spidbPoolPromise } from '../mssql.js';

const router = express.Router();

// Helper: resolve a customer id by provided id or name, or fallback to first customer
async function resolveCustomerId(pool, candidateId, candidateName) {
  try {
    if (candidateId != null) {
      const r = await pool.request().input('cid', candidateId).query('SELECT Id FROM spidb.customer WHERE Id = @cid');
      if (r && r.recordset && r.recordset[0]) return r.recordset[0].Id;
    }
    if (candidateName) {
      const r2 = await pool.request().input('cname', `%${candidateName}%`).query("SELECT TOP (1) Id FROM spidb.customer WHERE [Name] LIKE @cname");
      if (r2 && r2.recordset && r2.recordset[0]) return r2.recordset[0].Id;
    }
    const r3 = await pool.request().query('SELECT TOP (1) Id FROM spidb.customer ORDER BY Id ASC');
    if (r3 && r3.recordset && r3.recordset[0]) return r3.recordset[0].Id;
    return null;
  } catch (err) {
    console.error('resolveCustomerId error:', err);
    return null;
  }
}

// GET list of quotations (simple)
router.get('/quotations', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit, 10) || 200;
    const pool = await spidbPoolPromise;
    const r = await pool.request().input('limit', limit).query('SELECT TOP (@limit) * FROM spidb.quotation ORDER BY Id DESC');
    return res.json(r.recordset || []);
  } catch (err) {
    console.error('MSSQL /quotations error:', err);
    return res.status(500).json({ error: err.message });
  }
});

// GET detail
router.get('/quotations/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const pool = await spidbPoolPromise;
    const qRes = await pool.request().input('id', id).query('SELECT * FROM spidb.quotation WHERE Id = @id');
    if (!qRes.recordset || qRes.recordset.length === 0) return res.status(404).json({ error: 'Quotation not found' });
    const quotation = qRes.recordset[0];
    const detailsRes = await pool.request().input('quotation_id', id).query('SELECT * FROM spidb.quotation_details WHERE Quotation_Id = @quotation_id');
    quotation.details = detailsRes.recordset || [];
    return res.json(quotation);
  } catch (err) {
    console.error('MSSQL /quotations/:id error:', err);
    return res.status(500).json({ error: err.message });
  }
});

// POST create quotation with details in a transaction
router.post('/quotations', async (req, res) => {
  const { quotation = {}, details = [] } = req.body || {};

  const allowedQuotationCols = [
    'Code','Customer_Id','TotalQty','VatType','TotalWithOutVAT','VAT','TotalWithVat','ValidityDate','ModifiedBy','DateModified','Status','isConvertedToSO','Notes','Validity','Discount','IsOverallDiscount','Customer_Attn_id','Customer_CC_id','DateConverted','DateCancelled','Discount_Amount','CurrencyId','Price_Basis_id','SalesAgentId','SalesAreaId','AreaManagerId','SalesClassificationId','SalesInquirySourceId','DepartmentId'
  ];

  const allowedDetailCols = [
    'Qty','Stock_Id','Quotation_Id','Amount','Discounted_Amount','Stock_Counter_Offer_id','Item_Availability_Id','Discount','Unit_Price','CustomerInquiry','ItemAvailability','Obsolete_Item_Id','ServiceChargeRate','isConvertedToSO','DateConvertedToSO'
  ];

  if (!quotation || Object.keys(quotation).length === 0) return res.status(400).json({ error: 'Quotation required' });

  const filteredQuotation = {};
  for (const k of Object.keys(quotation)) if (allowedQuotationCols.includes(k)) filteredQuotation[k] = quotation[k];

  const todayStr = new Date().toISOString().slice(0, 10);
  if (!filteredQuotation.ModifiedBy) filteredQuotation.ModifiedBy = 1;
  if (!filteredQuotation.ValidityDate) filteredQuotation.ValidityDate = filteredQuotation.ValidityDate || todayStr;

  if (Object.keys(filteredQuotation).length === 0) return res.status(400).json({ error: 'No valid quotation fields provided' });

  const pool = await spidbPoolPromise;
  const transaction = pool.transaction();
  try {
    await transaction.begin();
    const trxReq = transaction.request();

    // Resolve customer
    if (filteredQuotation.Customer_Id == null && (quotation.CustomerName || quotation.Customer_Name || quotation.customerName)) {
      const resolved = await resolveCustomerId(pool, null, quotation.CustomerName || quotation.Customer_Name || quotation.customerName);
      if (resolved) filteredQuotation.Customer_Id = resolved;
    } else if (filteredQuotation.Customer_Id != null) {
      const resolved = await resolveCustomerId(pool, filteredQuotation.Customer_Id, null);
      if (resolved) filteredQuotation.Customer_Id = resolved;
    } else {
      const resolved = await resolveCustomerId(pool, null, null);
      if (resolved) filteredQuotation.Customer_Id = resolved;
    }

    const qKeys = Object.keys(filteredQuotation);
    const qCols = qKeys.map((k) => `[${k}]`).join(', ');
    const qParams = qKeys.map((_, i) => `@q${i}`).join(', ');
    qKeys.forEach((k, i) => trxReq.input(`q${i}`, filteredQuotation[k]));

    const insertQuotationSql = `INSERT INTO spidb.quotation (${qCols}) OUTPUT INSERTED.* VALUES (${qParams})`;
    const insertRes = await trxReq.query(insertQuotationSql);
    const insertedQuotation = insertRes.recordset && insertRes.recordset[0];
    if (!insertedQuotation) throw new Error('Failed to insert quotation');

    const insertedDetails = [];
    for (const detailRaw of details) {
      const detail = {};
      for (const k of Object.keys(detailRaw)) if (allowedDetailCols.includes(k)) detail[k] = detailRaw[k];
      detail.Quotation_Id = insertedQuotation.Id;
      const dk = Object.keys(detail);
      if (dk.length === 0) continue;
      const dCols = dk.map((k) => `[${k}]`).join(', ');
      const dParams = dk.map((_, i) => `@d${i}`).join(', ');
      const dReq = transaction.request();
      dk.forEach((k, i) => dReq.input(`d${i}`, detail[k]));
      const insertDetailSql = `INSERT INTO spidb.quotation_details (${dCols}) OUTPUT INSERTED.* VALUES (${dParams})`;
      const dRes = await dReq.query(insertDetailSql);
      if (dRes.recordset && dRes.recordset[0]) insertedDetails.push(dRes.recordset[0]);
    }

    await transaction.commit();
    insertedQuotation.details = insertedDetails;
    return res.status(201).json(insertedQuotation);
  } catch (err) {
    console.error('MSSQL POST /quotations error:', err);
    try { await transaction.rollback(); } catch (rerr) { console.error('Transaction rollback failed:', rerr); }
    return res.status(500).json({ error: err.message });
  }
});

// Quick test endpoint to insert a sample quotation + details
router.post('/quotations/quick', async (req, res) => {
  try {
    const body = req.body || {};
    const incomingQuotation = body.quotation || null;
    const incomingDetails = Array.isArray(body.details) ? body.details : body.details ? [body.details] : null;

    const sampleQuotation = {
      Code: `TEST-${Date.now() % 100000}`,
      Customer_Id: 225,
      TotalQty: 1,
      VatType: 1,
      TotalWithOutVAT: 100.0,
      VAT: 0.0,
      TotalWithVat: 100.0,
      ValidityDate: new Date().toISOString().slice(0, 10),
      ModifiedBy: 1,
      DateModified: new Date().toISOString(),
      Status: 0,
      Notes: 'Quick test insert',
      CurrencyId: 2,
      Price_Basis_id: 1,
      DepartmentId: 12,
    };

    const sampleDetails = [ { Qty: 1, Stock_Id: 4574, Amount: 100.0, Unit_Price: 100.0, Discount: 0 } ];

    const quotation = incomingQuotation && Object.keys(incomingQuotation).length > 0 ? incomingQuotation : sampleQuotation;
    const details = incomingDetails && incomingDetails.length > 0 ? incomingDetails : sampleDetails;

    const allowedQuotationCols = [ 'Code','Customer_Id','TotalQty','VatType','TotalWithOutVAT','VAT','TotalWithVat','ValidityDate','ModifiedBy','DateModified','Status','isConvertedToSO','Notes','Validity','Discount','IsOverallDiscount','Customer_Attn_id','Customer_CC_id','DateConverted','DateCancelled','Discount_Amount','CurrencyId','Price_Basis_id','SalesAgentId','SalesAreaId','AreaManagerId','SalesClassificationId','SalesInquirySourceId','DepartmentId' ];
    const allowedDetailCols = [ 'Qty','Stock_Id','Quotation_Id','Amount','Discounted_Amount','Stock_Counter_Offer_id','Item_Availability_Id','Discount','Unit_Price','CustomerInquiry','ItemAvailability','Obsolete_Item_Id','ServiceChargeRate','isConvertedToSO','DateConvertedToSO' ];

    const filteredQuotation = {};
    for (const k of Object.keys(quotation)) if (allowedQuotationCols.includes(k)) filteredQuotation[k] = quotation[k];

    const pool = await spidbPoolPromise;
    // resolve customer if needed
    if (filteredQuotation.Customer_Id == null && (quotation.CustomerName || quotation.Customer_Name || quotation.customerName)) {
      const resolved = await resolveCustomerId(pool, null, quotation.CustomerName || quotation.Customer_Name || quotation.customerName);
      if (resolved) filteredQuotation.Customer_Id = resolved;
    } else if (filteredQuotation.Customer_Id != null) {
      const resolved = await resolveCustomerId(pool, filteredQuotation.Customer_Id, null);
      if (resolved) filteredQuotation.Customer_Id = resolved;
    } else {
      const resolved = await resolveCustomerId(pool, null, null);
      if (resolved) filteredQuotation.Customer_Id = resolved;
    }

    const transaction = pool.transaction();
    await transaction.begin();
    try {
      const trxReq = transaction.request();
      const qKeys = Object.keys(filteredQuotation);
      const qCols = qKeys.map((k) => `[${k}]`).join(', ');
      const qParams = qKeys.map((_, i) => `@q${i}`).join(', ');
      qKeys.forEach((k, i) => trxReq.input(`q${i}`, filteredQuotation[k]));

      const insertQuotationSql = `INSERT INTO spidb.quotation (${qCols}) OUTPUT INSERTED.* VALUES (${qParams})`;
      const insertRes = await trxReq.query(insertQuotationSql);
      const insertedQuotation = insertRes.recordset && insertRes.recordset[0];
      if (!insertedQuotation) throw new Error('Failed to insert quotation');

      const insertedDetails = [];
      for (const detailRaw of details) {
        const detail = {};
        for (const k of Object.keys(detailRaw)) if (allowedDetailCols.includes(k)) detail[k] = detailRaw[k];
        detail.Quotation_Id = insertedQuotation.Id;
        const dk = Object.keys(detail);
        if (dk.length === 0) continue;
        const dCols = dk.map((k) => `[${k}]`).join(', ');
        const dParams = dk.map((_, i) => `@d${i}`).join(', ');
        const dReq = transaction.request();
        dk.forEach((k, i) => dReq.input(`d${i}`, detail[k]));
        const insertDetailSql = `INSERT INTO spidb.quotation_details (${dCols}) OUTPUT INSERTED.* VALUES (${dParams})`;
        const dRes = await dReq.query(insertDetailSql);
        if (dRes.recordset && dRes.recordset[0]) insertedDetails.push(dRes.recordset[0]);
      }

      await transaction.commit();
      insertedQuotation.details = insertedDetails;
      return res.status(201).json(insertedQuotation);
    } catch (err) {
      await transaction.rollback();
      console.error('Quick insert transaction failed:', err);
      return res.status(500).json({ error: err.message });
    }
  } catch (err) {
    console.error('Quick insert error:', err);
    return res.status(500).json({ error: err.message });
  }
});

// POST search with pagination
router.post('/quotations/search', async (req, res) => {
  try {
    const { page = 1, pageSize = 50, Code = '', CreatedBy = '', Name = '', Model = '' } = req.body || {};
    const offset = (page - 1) * pageSize;

    const pool = await spidbPoolPromise;
    const request = pool.request();
    request.input('Code', `%${Code}%`);
    request.input('CreatedBy', `%${CreatedBy}%`);
    request.input('Name', `%${Name}%`);
    request.input('Model', `%${Model}%`);
    request.input('pageSize', pageSize);
    request.input('offset', offset + 1);

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
    const rows = result.recordsets && result.recordsets[0] ? result.recordsets[0] : [];
    const total = result.recordsets && result.recordsets[1] && result.recordsets[1][0] ? result.recordsets[1][0].total : 0;

    return res.json({ page, pageSize, total, rows });
  } catch (err) {
    console.error('MSSQL /quotations/search error:', err);
    return res.status(500).json({ error: err.message });
  }
});

export default router;

    // Insert filtered details if any
    const insertedDetails = [];
    for (const detailRaw of details) {
      const detail = {};
      for (const k of Object.keys(detailRaw)) {
        if (allowedDetailCols.includes(k)) detail[k] = detailRaw[k];
      }

      // Ensure foreign key to quotation exists (insertedQuotation.Id is MSSQL PK)
      detail.Quotation_Id = insertedQuotation.Id;

      const dk = Object.keys(detail);
      if (dk.length === 0) continue; // nothing to insert for this detail

      const dCols = dk.map((k) => `[${k}]`).join(', ');
      const dParams = dk.map((_, i) => `@d${i}`).join(', ');
      const dReq = transaction.request();
      dk.forEach((k, i) => dReq.input(`d${i}`, detail[k]));

      const insertDetailSql = `INSERT INTO spidb.quotation_details (${dCols}) OUTPUT INSERTED.* VALUES (${dParams})`;
      const dRes = await dReq.query(insertDetailSql);
      if (dRes.recordset && dRes.recordset[0]) insertedDetails.push(dRes.recordset[0]);
    }

    await transaction.commit();

    // Attach details array to returned object
    insertedQuotation.details = insertedDetails;

    return res.status(201).json(insertedQuotation);
  } catch (err) {
    console.error('MSSQL POST /quotations error:', err);
    try {
      await transaction.rollback();
    } catch (rerr) {
      console.error('Transaction rollback failed:', rerr);
    }
    return res.status(500).json({ error: err.message });
  }
});
    }
  }
});
router.post('/quotations/quick', async (req, res) => {
  try {
    const body = req.body || {};
    // If caller provided a quotation/details use them, otherwise build a sensible sample
    const incomingQuotation = body.quotation || null;
    const incomingDetails = Array.isArray(body.details) ? body.details : body.details ? [body.details] : null;

    const sampleQuotation = {
      Code: `TEST-${Date.now() % 100000}`,
      Customer_Id: 225,
      TotalQty: 1,
      VatType: 1,
      TotalWithOutVAT: 100.0,
      VAT: 0.0,
      TotalWithVat: 100.0,
      ValidityDate: new Date().toISOString().slice(0, 10),
      ModifiedBy: 1,
      DateModified: new Date().toISOString(),
      Status: 0,
      Notes: 'Quick test insert',
      CurrencyId: 2,
      Price_Basis_id: 1,
      DepartmentId: 12,
    };

    const sampleDetails = [
      { Qty: 1, Stock_Id: 4574, Amount: 100.0, Unit_Price: 100.0, Discount: 0 },
    ];

    const quotation = incomingQuotation && Object.keys(incomingQuotation).length > 0 ? incomingQuotation : sampleQuotation;
    const details = incomingDetails && incomingDetails.length > 0 ? incomingDetails : sampleDetails;

    // Reuse existing allowed columns to filter
    const allowedQuotationCols = [
      'Code','Customer_Id','TotalQty','VatType','TotalWithOutVAT','VAT','TotalWithVat','ValidityDate','ModifiedBy','DateModified','Status','isConvertedToSO','Notes','Validity','Discount','IsOverallDiscount','Customer_Attn_id','Customer_CC_id','DateConverted','DateCancelled','Discount_Amount','CurrencyId','Price_Basis_id','SalesAgentId','SalesAreaId','AreaManagerId','SalesClassificationId','SalesInquirySourceId','DepartmentId'
    ];
    const allowedDetailCols = [
      'Qty','Stock_Id','Quotation_Id','Amount','Discounted_Amount','Stock_Counter_Offer_id','Item_Availability_Id','Discount','Unit_Price','CustomerInquiry','ItemAvailability','Obsolete_Item_Id','ServiceChargeRate','isConvertedToSO','DateConvertedToSO'
    ];

    const filteredQuotation = {};
    for (const k of Object.keys(quotation)) {
      if (allowedQuotationCols.includes(k)) filteredQuotation[k] = quotation[k];
    }

    // Ensure Customer_Id resolves to an existing spidb.customer.Id to avoid FK errors
    if (filteredQuotation.Customer_Id == null && (quotation.CustomerName || quotation.Customer_Name || quotation.customerName)) {
      const pool = await poolPromise;
      const resolved = await resolveCustomerId(pool, null, quotation.CustomerName || quotation.Customer_Name || quotation.customerName);
      if (resolved) filteredQuotation.Customer_Id = resolved;
    } else if (filteredQuotation.Customer_Id != null) {
      const pool = await poolPromise;
      const resolved = await resolveCustomerId(pool, filteredQuotation.Customer_Id, null);
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
      const qCols = qKeys.map((k) => `[${k}]`).join(', ');
      const qParams = qKeys.map((_, i) => `@q${i}`).join(', ');
      qKeys.forEach((k, i) => trxReq.input(`q${i}`, filteredQuotation[k]));

      const insertQuotationSql = `INSERT INTO spidb.quotation (${qCols}) OUTPUT INSERTED.* VALUES (${qParams})`;
      const insertRes = await trxReq.query(insertQuotationSql);
      const insertedQuotation = insertRes.recordset && insertRes.recordset[0];
      if (!insertedQuotation) throw new Error('Failed to insert quotation');

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

        const dCols = dk.map((k) => `[${k}]`).join(', ');
        const dParams = dk.map((_, i) => `@d${i}`).join(', ');
        const dReq = transaction.request();
        dk.forEach((k, i) => dReq.input(`d${i}`, detail[k]));
        const insertDetailSql = `INSERT INTO spidb.quotation_details (${dCols}) OUTPUT INSERTED.* VALUES (${dParams})`;
        const dRes = await dReq.query(insertDetailSql);
        if (dRes.recordset && dRes.recordset[0]) insertedDetails.push(dRes.recordset[0]);
      }

      await transaction.commit();
      insertedQuotation.details = insertedDetails;
      return res.status(201).json(insertedQuotation);
    } catch (err) {
      await transaction.rollback();
      console.error('Quick insert transaction failed:', err);
      return res.status(500).json({ error: err.message });
    }
  } catch (err) {
    console.error('Quick insert error:', err);
    return res.status(500).json({ error: err.message });
  }
});

// POST /api/mssql/quotations/search
// Body: { page = 1, pageSize = 50, Code, CreatedBy, Name, Model }
router.post('/quotations/search', async (req, res) => {
  try {
    const { page = 1, pageSize = 50, Code = '', CreatedBy = '', Name = '', Model = '' } = req.body || {};
    const offset = (page - 1) * pageSize;

    const pool = await poolPromise;
    const request = pool.request();
    // sanitize inputs through parameterization
    request.input('Code', `%${Code}%`);
    request.input('CreatedBy', `%${CreatedBy}%`);
    request.input('Name', `%${Name}%`);
    request.input('Model', `%${Model}%`);
    request.input('pageSize', pageSize);
    request.input('offset', offset + 1); // 1-based rn start

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
    const rows = result.recordsets && result.recordsets[0] ? result.recordsets[0] : [];
    const total = result.recordsets && result.recordsets[1] && result.recordsets[1][0] ? result.recordsets[1][0].total : 0;

    return res.json({ page, pageSize, total, rows });
  } catch (err) {
    console.error('MSSQL /quotations/search error:', err);
    return res.status(500).json({ error: err.message });
  }
});

export default router;

