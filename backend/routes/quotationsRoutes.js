import express from "express";
import db from "../db.js";
import { toSnake } from "../helper/utils.js";

const router = express.Router();

router.get("/", async (req, res) => {
  try {
    const result = await db.query("SELECT * FROM quotations ORDER BY id ASC");
    return res.json(result.rows);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Failed to fetch quotations" });
  }
});

router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const result = await db.query("SELECT * FROM quotations WHERE id = $1", [id]);
    if (result.rows.length === 0)
      return res.status(404).json({ error: "Not found" });
    return res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Failed to fetch quotation" });
  }
});

// Get quotation by TR id
router.get("/by-tr/:trId", async (req, res) => {
  try {
    const { trId } = req.params;
    const result = await db.query(
      `SELECT tr.*, sl.sl_number, sl.account_id, sl.title AS sl_title, rfq.rfq_number, rfq.status AS rfq_status
       FROM technical_recommendations tr
       LEFT JOIN sales_leads sl ON tr.sl_id = sl.id
       LEFT JOIN rfqs rfq ON tr.wo_id = rfq.wo_id
       WHERE tr.id = $1`,
      [trId]
    );
    if (result.rows.length === 0)
      return res.status(404).json({ error: "Quotation not found for this TR" });
    return res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Failed to fetch quotation by TR" });
  }
});

// Get quotation by RFQ id
router.get("/by-rfq/:rfqId", async (req, res) => {
  try {
    const { rfqId } = req.params;
    const result = await db.query(
      `SELECT rfq.*, tr.id AS tr_id, tr.status AS tr_status, sl.sl_number, sl.account_id, sl.title AS sl_title
       FROM rfqs rfq
       LEFT JOIN technical_recommendations tr ON rfq.wo_id = tr.wo_id
       LEFT JOIN sales_leads sl ON tr.sl_id = sl.id
       WHERE rfq.id = $1`,
      [rfqId]
    );
    if (result.rows.length === 0)
      return res.status(404).json({ error: "Quotation not found for this RFQ" });
    return res.json(result.rows[0]);
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
    let trData = null;
    let rfqData = null;
    // Fetch TR data if trId is provided
    if (trId) {
      const trRes = await db.query(
        `SELECT tr.*, sl.sl_number, sl.account_id, sl.title AS sl_title
         FROM technical_recommendations tr
         LEFT JOIN sales_leads sl ON tr.sl_id = sl.id
         WHERE tr.id = $1`,
        [trId]
      );
      if (trRes.rows.length > 0) trData = trRes.rows[0];
    }
    // Fetch RFQ data if rfqId is provided
    if (rfqId) {
      const rfqRes = await db.query(
        `SELECT rfq.*, tr.id AS tr_id, tr.status AS tr_status, sl.sl_number, sl.account_id, sl.title AS sl_title
         FROM rfqs rfq
         LEFT JOIN technical_recommendations tr ON rfq.wo_id = tr.wo_id
         LEFT JOIN sales_leads sl ON tr.sl_id = sl.id
         WHERE rfq.id = $1`,
        [rfqId]
      );
      if (rfqRes.rows.length > 0) rfqData = rfqRes.rows[0];
    }
    if (!trData && !rfqData) {
      return res.status(404).json({ error: "No quotation data found for provided ids" });
    }
    // Merge logic: deduplicate attributes, keep both if values differ
    let merged = {};
    if (trData && rfqData) {
      // Merge keys
      const allKeys = new Set([...Object.keys(trData), ...Object.keys(rfqData)]);
      for (const key of allKeys) {
        if (trData[key] !== undefined && rfqData[key] !== undefined) {
          if (trData[key] === rfqData[key]) {
            merged[key] = trData[key];
          } else {
            merged[`tr_${key}`] = trData[key];
            merged[`rfq_${key}`] = rfqData[key];
          }
        } else if (trData[key] !== undefined) {
          merged[key] = trData[key];
        } else if (rfqData[key] !== undefined) {
          merged[key] = rfqData[key];
        }
      }
    } else {
      merged = trData || rfqData;
    }
    return res.json(merged);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Failed to fetch merged quotation data" });
  }
});

router.post("/", async (req, res) => {
  try {
    console.log("Received request to create quotation with body:", toSnake(req.body));
    const { wo_id, assignee, account_id, created_by, updated_by } = toSnake(req.body);

    // Find RFQ and TR for this WO
    const rfqRes = await db.query("SELECT id FROM rfqs WHERE wo_id = $1 LIMIT 1", [wo_id]);
    const trRes = await db.query("SELECT id FROM technical_recommendations WHERE wo_id = $1 LIMIT 1", [wo_id]);

    const rfq_id = rfqRes.rows[0]?.id || null;
    const tr_id = trRes.rows[0]?.id || null;

    if (!rfq_id || !tr_id) {
      return res.status(400).json({
        error: "Missing reference",
        rfq_id,
        tr_id
      });
    }

    const result = await db.query(
      `INSERT INTO quotations (rfq_id, tr_id, wo_id, assignee, account_id, created_at, created_by, updated_at, updated_by)
       VALUES ($1, $2, $3, $4, $5, NOW(), $6, NOW(), $7)
       RETURNING *`,
      [rfq_id, tr_id, wo_id, assignee, account_id, created_by, updated_by]
    );

    console.log("Created new quotation:", result.rows[0]);

    // Create workflow stage for new technical recommendation (Draft)
    await db.query(
      `INSERT INTO workflow_stages (wo_id, stage_name, status, assigned_to, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, NOW(), NOW())`,
      [wo_id, 'RFQ', 'Draft', assignee]
    );

    return res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Failed to save quotation" });
  }
});

export default router;
