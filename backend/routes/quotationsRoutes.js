import express from "express";
import db from "../db.js";
import { toSnake } from "../helper/utils.js";
import { poolPromise } from "../mssql.js";

const router = express.Router();

function buildInQuery(table, ids) {
  const placeholders = ids.map((_, i) => `$${i + 1}`).join(",");
  return {
    query: `SELECT * FROM ${table} WHERE id IN (${placeholders})`,
    params: ids.map(Number),
  };
}

router.get("/", async (req, res) => {
  try {
    const qRes = await db.query(`
      SELECT 
        q.*, 
        u.username AS username,
        a.account_name AS account_name
      FROM quotations q
      LEFT JOIN users u ON q.assignee = u.id
      LEFT JOIN accounts a ON q.account_id = a.id
      ORDER BY q.id ASC
    `);
    const quotations = qRes.rows;

    console.log(`Fetched ${quotations.length} quotations`);

    // Collect all related IDs (convert to numbers and filter out invalids)
    const rfqIds = [
      ...new Set(
        quotations.map((q) => Number(q.rfq_id || q.rfqId)).filter(Boolean),
      ),
    ];
    const trIds = [
      ...new Set(
        quotations.map((q) => Number(q.tr_id || q.trId)).filter(Boolean),
      ),
    ];
    const woIds = [
      ...new Set(
        quotations.map((q) => Number(q.wo_id || q.woId)).filter(Boolean),
      ),
    ];

    console.log("Collected RFQ IDs:", rfqIds);
    console.log("Collected TR IDs:", trIds);
    console.log("Collected Workorder IDs:", woIds);

    // Prepare batched queries dynamically
    const rfqQuery = rfqIds.length ? buildInQuery("rfqs", rfqIds) : null;
    const trQuery = trIds.length
      ? buildInQuery("technical_recommendations", trIds)
      : null;
    const woQuery = woIds.length ? buildInQuery("workorders", woIds) : null;

    // Execute all available queries in parallel
    const [rfqsRes, trsRes, wosRes] = await Promise.all([
      rfqQuery ? db.query(rfqQuery.query, rfqQuery.params) : { rows: [] },
      trQuery ? db.query(trQuery.query, trQuery.params) : { rows: [] },
      woQuery ? db.query(woQuery.query, woQuery.params) : { rows: [] },
    ]);

    console.log(
      `Fetched ${rfqsRes.rows.length} RFQs, ${trsRes.rows.length} TRs, ${wosRes.rows.length} Workorders`,
    );

    // Convert results to maps for fast lookups
    const rfqMap = Object.fromEntries(rfqsRes.rows.map((r) => [r.id, r]));
    const trMap = Object.fromEntries(trsRes.rows.map((r) => [r.id, r]));
    const woMap = Object.fromEntries(wosRes.rows.map((r) => [r.id, r]));

    // Enrich quotations with related data
    const enriched = quotations.map((q) => ({
      ...q,
      rfq: rfqMap[q.rfq_id || q.rfqId] || null,
      tr: trMap[q.tr_id || q.trId] || null,
      workorder: woMap[q.wo_id || q.woId] || null,
    }));

    // Enrich with MSSQL customer data
    try {
      // Collect account IDs that need customer enrichment
      const accountIds = [
        ...new Set(
          enriched
            .map((q) => Number(q.account_id || q.accountId))
            .filter(Boolean)
        ),
      ];

      if (accountIds.length > 0) {
        console.log("Enriching quotations with customer data for account IDs:", accountIds);
        
        // Get PostgreSQL accounts to find kristem_account_ids
        const accountsQuery = `SELECT id, kristem_account_id FROM accounts WHERE kristem_account_id IN (${accountIds.map((_, i) => `$${i + 1}`).join(",")})`;
        const accountsRes = await db.query(accountsQuery, accountIds);
        const accountsMap = accountsRes.rows;

        console.log("Fetched kristem_account_ids for accounts:", accountsMap);

        // Get kristem customer IDs
        const kristemIds = [
          ...new Set(
            Object.values(accountsMap)
              .map(id => Number(id))
              .filter(id => Number.isFinite(id))
          ),
        ];

        console.log("Collected kristem customer IDs for MSSQL query:", kristemIds);

        if (kristemIds.length > 0) {
          console.log("Fetching customer data from MSSQL for kristem IDs:", kristemIds);
          const spiPool = await poolPromise;
          const customerQuery = `SELECT * FROM spidb.customer WHERE Id IN (${kristemIds.join(",")})`;
          const customerRes = await spiPool.request().query(customerQuery);
          const customerMap = Object.fromEntries(
            customerRes.recordset.map((c) => [Number(c.Id), c])
          );

          console.log("Fetched customers from MSSQL:", customerRes.recordset);

          // Attach customer data to quotations
          enriched.forEach((q) => {
            console.log("Enriching quotation ID:", q);
            const accountId = q.account_id || q.accountId;
            if (accountId) {
              const kristemId = accountsMap[accountId];
              if (kristemId) {
                q.customer = customerMap[Number(kristemId)] || null;
              }
            }
          });

          console.log(`✅ Enriched ${enriched.length} quotations with customer data`);
        }
      }
    } catch (customerErr) {
      console.warn("Failed to enrich quotations with customer data:", customerErr.message);
    }

    console.log("✅ Enriched quotations:", enriched);
    return res.json(enriched);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Failed to fetch quotations" });
  }
});

// Get quotation by TR id
router.get("/by-tr/:trId", async (req, res) => {
  try {
    const { trId } = req.params;
    const result = await db.query(
      `
        SELECT tr.*, sl.sl_number, sl.account_id, sl.title AS sl_title, rfq.rfq_number, rfq.status AS rfq_status
        FROM technical_recommendations tr
        LEFT JOIN sales_leads sl ON tr.sl_id = sl.id
        LEFT JOIN rfqs rfq ON tr.wo_id = rfq.wo_id
        WHERE tr.id = $1
      `,
      [trId],
    );
    if (result.rows.length === 0)
      return res.status(404).json({ error: "Quotation not found for this TR" });
    
    const quotation = result.rows[0];

    // Enrich with customer data from MSSQL
    try {
      if (quotation.account_id) {
        const accountRes = await db.query(
          "SELECT kristem_account_id FROM accounts WHERE id = $1",
          [quotation.account_id]
        );
        
        if (accountRes.rows.length > 0 && accountRes.rows[0].kristemAccountId) {
          const kristemId = Number(accountRes.rows[0].kristemAccountId);
          
          if (Number.isFinite(kristemId)) {
            const spiPool = await poolPromise;
            const customerRes = await spiPool
              .request()
              .input("customerId", kristemId)
              .query("SELECT * FROM spidb.customer WHERE Id = @customerId");
            
            if (customerRes.recordset.length > 0) {
              quotation.customer = customerRes.recordset[0];
            }
          }
        }
      }
    } catch (customerErr) {
      console.warn("Failed to enrich quotation by TR with customer data:", customerErr.message);
    }

    return res.json(quotation);
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
      `
        SELECT rfq.*, tr.id AS tr_id, tr.status AS tr_status, sl.sl_number, sl.account_id, sl.title AS sl_title
          FROM rfqs rfq
          LEFT JOIN technical_recommendations tr ON rfq.wo_id = tr.wo_id
          LEFT JOIN sales_leads sl ON tr.sl_id = sl.id
          WHERE rfq.id = $1
      `,
      [rfqId],
    );
    if (result.rows.length === 0)
      return res
        .status(404)
        .json({ error: "Quotation not found for this RFQ" });
    
    const quotation = result.rows[0];

    // Enrich with customer data from MSSQL
    try {
      if (quotation.account_id) {
        const accountRes = await db.query(
          "SELECT kristem_account_id FROM accounts WHERE id = $1",
          [quotation.account_id]
        );
        
        if (accountRes.rows.length > 0 && accountRes.rows[0].kristemAccountId) {
          const kristemId = Number(accountRes.rows[0].kristemAccountId);
          
          if (Number.isFinite(kristemId)) {
            const spiPool = await poolPromise;
            const customerRes = await spiPool
              .request()
              .input("customerId", kristemId)
              .query("SELECT * FROM spidb.customer WHERE Id = @customerId");
            
            if (customerRes.recordset.length > 0) {
              quotation.customer = customerRes.recordset[0];
            }
          }
        }
      }
    } catch (customerErr) {
      console.warn("Failed to enrich quotation by RFQ with customer data:", customerErr.message);
    }

    return res.json(quotation);
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
        [trId],
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
        [rfqId],
      );
      if (rfqRes.rows.length > 0) rfqData = rfqRes.rows[0];
    }
    if (!trData && !rfqData) {
      return res
        .status(404)
        .json({ error: "No quotation data found for provided ids" });
    }
    // Merge logic: deduplicate attributes, keep both if values differ
    let merged = {};
    if (trData && rfqData) {
      // Merge keys
      const allKeys = new Set([
        ...Object.keys(trData),
        ...Object.keys(rfqData),
      ]);
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

    // Enrich with customer data from MSSQL
    try {
      if (merged.account_id) {
        const accountRes = await db.query(
          "SELECT kristem_account_id FROM accounts WHERE id = $1",
          [merged.account_id]
        );
        
        if (accountRes.rows.length > 0 && accountRes.rows[0].kristemAccountId) {
          const kristemId = Number(accountRes.rows[0].kristemAccountId);
          
          if (Number.isFinite(kristemId)) {
            const spiPool = await poolPromise;
            const customerRes = await spiPool
              .request()
              .input("customerId", kristemId)
              .query("SELECT * FROM spidb.customer WHERE Id = @customerId");
            
            if (customerRes.recordset.length > 0) {
              merged.customer = customerRes.recordset[0];
            }
          }
        }
      }
    } catch (customerErr) {
      console.warn("Failed to enrich merged quotation with customer data:", customerErr.message);
    }

    return res.json(merged);
  } catch (err) {
    console.error(err);
    return res
      .status(500)
      .json({ error: "Failed to fetch merged quotation data" });
  }
});

router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const result = await db.query("SELECT * FROM quotations WHERE id = $1", [
      id,
    ]);
    if (result.rows.length === 0)
      return res.status(404).json({ error: "Not found" });

    const quotation = result.rows[0];

    // Fetch associated RFQ, TR, and Workorder in parallel (if ids present)
    const [rfqRes, trRes, woRes] = await Promise.all([
      quotation.rfq_id
        ? db.query("SELECT * FROM rfqs WHERE id = $1", [quotation.rfq_id])
        : Promise.resolve({ rows: [] }),
      quotation.tr_id
        ? db.query("SELECT * FROM technical_recommendations WHERE id = $1", [
            quotation.tr_id,
          ])
        : Promise.resolve({ rows: [] }),
      quotation.wo_id
        ? db.query("SELECT * FROM workorders WHERE id = $1", [quotation.wo_id])
        : Promise.resolve({ rows: [] }),
    ]);

    const rfq = rfqRes.rows[0] || null;
    const tr = trRes.rows[0] || null;
    const workorder = woRes.rows[0] || null;

    // Attach related records directly onto the quotation object
    quotation.rfq = rfq;
    quotation.tr = tr;
    quotation.workorder = workorder;

    // Enrich with customer data from MSSQL
    try {
      if (quotation.account_id) {
        // Get PostgreSQL account to find kristem_account_id
        const accountRes = await db.query(
          "SELECT kristem_account_id FROM accounts WHERE id = $1",
          [quotation.account_id]
        );
        
        if (accountRes.rows.length > 0 && accountRes.rows[0].kristemAccountId) {
          const kristemId = Number(accountRes.rows[0].kristemAccountId);
          
          if (Number.isFinite(kristemId)) {
            const spiPool = await poolPromise;
            const customerRes = await spiPool
              .request()
              .input("customerId", kristemId)
              .query("SELECT * FROM spidb.customer WHERE Id = @customerId");
            
            if (customerRes.recordset.length > 0) {
              quotation.customer = customerRes.recordset[0];
              console.log("✅ Enriched quotation with customer data:", quotation.customer.Name);
            }
          }
        }
      }
    } catch (customerErr) {
      console.warn("Failed to enrich quotation with customer data:", customerErr.message);
    }

    return res.json(quotation);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Failed to fetch quotation" });
  }
});

// Update quotation (e.g., submit to Kristem)
router.put("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const body = toSnake(req.body);
    console.log("Received request to update quotation with body:", body);
    // Update allowed fields; minimally status and due_date
    const result = await db.query(
      `UPDATE quotations
        SET stage_status = $1,
          due_date = COALESCE($2, due_date),
          updated_at = NOW()
       WHERE id = $3
       RETURNING *`,
      [body.status, body.due_date, id],
    );
    if (result.rows.length === 0) return res.status(404).json({ error: "Not found" });
    const quotation = result.rows[0];

    console.log("Updated quotation:", quotation);

    // Note: Work Order is marked Completed only after successful MSSQL submission

    return res.json(quotation);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Failed to update quotation" });
  }
});

router.post("/", async (req, res) => {
  try {
    console.log(
      "Received request to create quotation with body:",
      toSnake(req.body),
    );
    const { wo_id, assignee, account_id, created_by, updated_by } = toSnake(
      req.body,
    );

    // Find RFQ and TR for this WO
    const rfqRes = await db.query(
      "SELECT id FROM rfqs WHERE wo_id = $1 LIMIT 1",
      [wo_id],
    );
    const trRes = await db.query(
      "SELECT id FROM technical_recommendations WHERE wo_id = $1 LIMIT 1",
      [wo_id],
    );

    console.log("Found RFQ and TR for WO:", {
      rfqRes: rfqRes.rows,
      trRes: trRes.rows,
    });

    const rfq_id = rfqRes.rows[0]?.id || null;
    const tr_id = trRes.rows[0]?.id || null;

    if (!rfq_id && !tr_id) {
      return res.status(400).json({
        error: "Missing reference",
        rfq_id,
        tr_id,
      });
    }

    // Generate TR number
    const currentYear = new Date().getFullYear();
    const qtNumRes = await db.query(
      `
        SELECT quotation_number
        FROM quotations
        WHERE quotation_number LIKE $1
        ORDER BY quotation_number DESC
        LIMIT 1
      `,
      [`QUOT-${currentYear}-%`],
    );

    console.log("Last quotation number for current year:", qtNumRes.rows);

    let newCounter = 1;
    if (qtNumRes.rows.length > 0) {
      const lastQuotationNumber = qtNumRes.rows[0].quotationNumber;
      const lastCounter = parseInt(lastQuotationNumber.split("-")[2], 10);
      newCounter = lastCounter + 1;
    }

    const quotation_number = `QUOT-${currentYear}-${String(newCounter).padStart(4, "0")}`;

    const result = await db.query(
      `
        INSERT INTO quotations (rfq_id, tr_id, wo_id, assignee, account_id, created_at, created_by, updated_at, updated_by, quotation_number, due_date)
        VALUES ($1, $2, $3, $4, $5, NOW(), $6, NOW(), $7, $8, $9)
        RETURNING *
      `,
      [
        rfq_id,
        tr_id,
        wo_id,
        assignee,
        account_id,
        created_by,
        updated_by,
        quotation_number,
        req.body.due_date || req.body.dueDate || null,
      ],
    );

    console.log("Created new quotation:", result.rows[0]);

    // Create workflow stage for new technical recommendation (Draft)
    await db.query(
      `
        INSERT INTO workflow_stages (wo_id, stage_name, status, assigned_to, created_at, updated_at)
        VALUES ($1, $2, $3, $4, NOW(), NOW())
      `,
      [wo_id, "Quotations", "Draft", assignee],
    );

    return res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Failed to save quotation" });
  }
});

export default router;
