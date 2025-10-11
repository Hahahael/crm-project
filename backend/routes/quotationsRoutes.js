import express from "express";
import { crmPoolPromise, sql } from "../mssql.js";
import { toSnake } from "../helper/utils.js";

const router = express.Router();

router.get("/", async (req, res) => {
  try {
    const pool = await crmPoolPromise;
    const qRes = await pool.request().query('SELECT * FROM crmdb.quotations ORDER BY id ASC');
    const rows = qRes.recordset || [];

    const enriched = await Promise.all(
      rows.map(async (quotation) => {
        const [rfqRes, trRes, woRes] = await Promise.all([
          quotation.rfq_id ? pool.request().input('rfqId', sql.Int, quotation.rfq_id).query('SELECT * FROM crmdb.rfqs WHERE id = @rfqId') : Promise.resolve({ recordset: [] }),
          quotation.tr_id ? pool.request().input('trId', sql.Int, quotation.tr_id).query('SELECT * FROM crmdb.technical_recommendations WHERE id = @trId') : Promise.resolve({ recordset: [] }),
          quotation.wo_id ? pool.request().input('woId', sql.Int, quotation.wo_id).query('SELECT * FROM crmdb.workorders WHERE id = @woId') : Promise.resolve({ recordset: [] }),
        ]);

        quotation.rfq = (rfqRes.recordset || [])[0] || null;
        quotation.tr = (trRes.recordset || [])[0] || null;
        quotation.workorder = (woRes.recordset || [])[0] || null;

        return quotation;
      })
    );

    return res.json(enriched);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Failed to fetch quotations" });
  }
});

router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const pool = await crmPoolPromise;
    const result = await pool.request().input('id', sql.Int, parseInt(id, 10)).query('SELECT * FROM crmdb.quotations WHERE id = @id');
    if (((result.recordset || []).length) === 0) return res.status(404).json({ error: 'Not found' });

    const quotation = result.recordset[0];

    const [rfqRes, trRes, woRes] = await Promise.all([
      quotation.rfq_id ? pool.request().input('rfqId', sql.Int, quotation.rfq_id).query('SELECT * FROM crmdb.rfqs WHERE id = @rfqId') : Promise.resolve({ recordset: [] }),
      quotation.tr_id ? pool.request().input('trId', sql.Int, quotation.tr_id).query('SELECT * FROM crmdb.technical_recommendations WHERE id = @trId') : Promise.resolve({ recordset: [] }),
      quotation.wo_id ? pool.request().input('woId', sql.Int, quotation.wo_id).query('SELECT * FROM crmdb.workorders WHERE id = @woId') : Promise.resolve({ recordset: [] }),
    ]);

    const rfq = (rfqRes.recordset || [])[0] || null;
    const tr = (trRes.recordset || [])[0] || null;
    const workorder = (woRes.recordset || [])[0] || null;

    quotation.rfq = rfq;
    quotation.tr = tr;
    quotation.workorder = workorder;

    return res.json(quotation);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Failed to fetch quotation" });
  }
});

// Get quotation by TR id
router.get("/by-tr/:trId", async (req, res) => {
  try {
    const { trId } = req.params;
    const pool = await crmPoolPromise;
    const result = await pool.request().input('trId', sql.Int, parseInt(trId, 10)).query(`SELECT tr.*, sl.sl_number, sl.account_id, sl.title AS sl_title, rfq.rfq_number, rfq.status AS rfq_status FROM crmdb.technical_recommendations tr LEFT JOIN crmdb.sales_leads sl ON tr.sl_id = sl.id LEFT JOIN crmdb.rfqs rfq ON tr.wo_id = rfq.wo_id WHERE tr.id = @trId`);
    if (((result.recordset || []).length) === 0) return res.status(404).json({ error: 'Quotation not found for this TR' });
    return res.json(result.recordset[0]);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Failed to fetch quotation by TR" });
  }
});

// Get quotation by RFQ id
router.get("/by-rfq/:rfqId", async (req, res) => {
  try {
    const { rfqId } = req.params;
    const pool = await crmPoolPromise;
    const result = await pool.request().input('rfqId', sql.Int, parseInt(rfqId, 10)).query(`SELECT rfq.*, tr.id AS tr_id, tr.status AS tr_status, sl.sl_number, sl.account_id, sl.title AS sl_title FROM crmdb.rfqs rfq LEFT JOIN crmdb.technical_recommendations tr ON rfq.wo_id = tr.wo_id LEFT JOIN crmdb.sales_leads sl ON tr.sl_id = sl.id WHERE rfq.id = @rfqId`);
    if (((result.recordset || []).length) === 0) return res.status(404).json({ error: 'Quotation not found for this RFQ' });
    return res.json(result.recordset[0]);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Failed to fetch quotation by RFQ" });
  }
});

// Get merged quotation data by trId and/or rfqId
router.get("/merged/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const [trId, rfqId] = id.split("_");
    const pool = await crmPoolPromise;
    let trData = null;
    let rfqData = null;
    if (trId) {
      const trRes = await pool.request().input('trId', sql.Int, parseInt(trId, 10)).query(`SELECT tr.*, sl.sl_number, sl.account_id, sl.title AS sl_title FROM crmdb.technical_recommendations tr LEFT JOIN crmdb.sales_leads sl ON tr.sl_id = sl.id WHERE tr.id = @trId`);
      if (((trRes.recordset || []).length) > 0) trData = trRes.recordset[0];
    }
    if (rfqId) {
      const rfqRes = await pool.request().input('rfqId', sql.Int, parseInt(rfqId, 10)).query(`SELECT rfq.*, tr.id AS tr_id, tr.status AS tr_status, sl.sl_number, sl.account_id, sl.title AS sl_title FROM crmdb.rfqs rfq LEFT JOIN crmdb.technical_recommendations tr ON rfq.wo_id = tr.wo_id LEFT JOIN crmdb.sales_leads sl ON tr.sl_id = sl.id WHERE rfq.id = @rfqId`);
      if (((rfqRes.recordset || []).length) > 0) rfqData = rfqRes.recordset[0];
    }
    if (!trData && !rfqData) return res.status(404).json({ error: 'No quotation data found for provided ids' });
    let merged = {};
    if (trData && rfqData) {
      const allKeys = new Set([...Object.keys(trData), ...Object.keys(rfqData)]);
      for (const key of allKeys) {
        if (trData[key] !== undefined && rfqData[key] !== undefined) {
          if (trData[key] === rfqData[key]) merged[key] = trData[key];
          else {
            merged[`tr_${key}`] = trData[key];
            merged[`rfq_${key}`] = rfqData[key];
          }
        } else if (trData[key] !== undefined) merged[key] = trData[key];
        else if (rfqData[key] !== undefined) merged[key] = rfqData[key];
      }
    } else merged = trData || rfqData;
    return res.json(merged);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Failed to fetch merged quotation data" });
  }
});

router.post("/", async (req, res) => {
  const pool = await crmPoolPromise;
  const transaction = pool.transaction();
  try {
    await transaction.begin();
    const body = toSnake(req.body);
    console.log("Received request to create quotation with body:", body);
    const { wo_id, assignee, account_id, created_by, updated_by } = body;

    const tr = transaction.request();
    // find rfq and tr ids within the transaction
    const rfqRes = await tr.input('wo', sql.Int, wo_id == null ? null : parseInt(wo_id, 10)).query('SELECT TOP (1) id FROM crmdb.rfqs WHERE wo_id = @wo');
    const trRes = await tr.input('wo_tr', sql.Int, wo_id == null ? null : parseInt(wo_id, 10)).query('SELECT TOP (1) id FROM crmdb.technical_recommendations WHERE wo_id = @wo_tr');

    const rfq_id = (rfqRes.recordset || [])[0]?.id || null;
    const tr_id = (trRes.recordset || [])[0]?.id || null;

    if (!rfq_id && !tr_id) {
      await transaction.rollback();
      return res.status(400).json({ error: 'Missing reference', rfq_id, tr_id });
    }

    const insertRes = await tr.input('rfq_id', sql.Int, rfq_id == null ? null : parseInt(rfq_id, 10)).input('tr_id', sql.Int, tr_id == null ? null : parseInt(tr_id, 10)).input('wo_id', sql.Int, wo_id == null ? null : parseInt(wo_id, 10)).input('assignee', sql.Int, assignee == null ? null : parseInt(assignee, 10)).input('account_id', sql.Int, account_id == null ? null : parseInt(account_id, 10)).input('created_by', sql.NVarChar, created_by || null).input('updated_by', sql.NVarChar, updated_by || null).query('INSERT INTO crmdb.quotations (rfq_id, tr_id, wo_id, assignee, account_id, created_at, created_by, updated_at, updated_by) OUTPUT INSERTED.* VALUES (@rfq_id, @tr_id, @wo_id, @assignee, @account_id, SYSUTCDATETIME(), @created_by, SYSUTCDATETIME(), @updated_by)');

    const createdQuotation = (insertRes.recordset || [])[0];
    console.log('Created new quotation (transaction):', createdQuotation);

    await tr.input('wo', sql.Int, wo_id == null ? null : parseInt(wo_id, 10)).input('stage_name', sql.NVarChar, 'Quotations').input('status', sql.NVarChar, 'Draft').input('assigned_to', sql.Int, assignee == null ? null : parseInt(assignee, 10)).query('INSERT INTO crmdb.workflow_stages (wo_id, stage_name, status, assigned_to, created_at, updated_at) VALUES (@wo, @stage_name, @status, @assigned_to, SYSUTCDATETIME(), SYSUTCDATETIME())');

    await transaction.commit();
    return res.status(201).json(createdQuotation);
  } catch (err) {
    console.error(err);
    try { await transaction.rollback(); } catch (e) { console.error('Rollback failed', e); }
    return res.status(500).json({ error: "Failed to save quotation" });
  }
});

export default router;
