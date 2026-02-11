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
        u.username AS assignee_username,
        a.account_name AS account_name
      FROM quotations q
      LEFT JOIN users u ON q.assignee = u.id
      LEFT JOIN accounts a ON q.account_id = a.id
      ORDER BY q.id ASC
    `);
    const quotations = qRes.rows;

    // console.log(`Fetched ${quotations.length} quotations`);

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

    // console.log("Collected RFQ IDs:", rfqIds);
    // console.log("Collected TR IDs:", trIds);
    // console.log("Collected Workorder IDs:", woIds);

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

    // console.log(
    //   `Fetched ${rfqsRes.rows.length} RFQs, ${trsRes.rows.length} TRs, ${wosRes.rows.length} Workorders`,
    // );

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
      // console.log("Starting enrichment of quotations with customer data from MSSQL");
      // Collect account IDs that need customer enrichment
      const accountIds = [
        ...new Set(
          enriched
            .map((q) => Number(q.account_id || q.accountId))
            .filter(Boolean)
        ),
      ];

      if (accountIds.length > 0) {
        const spiPool = await poolPromise;
        const custRes = await spiPool
          .request()
          .query(`SELECT * FROM spidb.customer WHERE Id IN (${accountIds.join(",")})`);
        const customers = custRes.recordset || [];
        const custMap = new Map(customers.map((c) => [Number(c.Id), c]));
        // console.log(`Fetched ${customers.length} customers from MSSQL for enrichment`);

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
            2;
          const iId =
            normId(c.Customer_Industry_Group_Id) ??
            normId(c.Industry_Group_Id) ??
            normId(c.IndustryGroupId) ??
            null;
          const dId =
            normId(c.Department_Id) ??
            normId(c.DepartmentID) ??
            normId(c.DepartmentId) ??
            2;
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
        const indMap = new Map((indRes.recordset || []).map((i) => [Number(i.Id), i]));
        const deptMap = new Map((deptRes.recordset || []).map((d) => [Number(d.Id), d]));

        for (const q of enriched) {
          const aid = Number(q.accountId ?? q.account_id);
          const cust = Number.isFinite(aid) ? custMap.get(aid) || null : null;
          if (!cust) {
            q.account = null;
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
          q.account = {
            kristem: cust,
            brand: brandMap.get(bId) || null,
            industry: iId != null ? indMap.get(iId) || null : null,
            department: deptMap.get(dId) || null,
          };
          // console.log("Quotation: ", q);
        }
      }

      // if (accountIds.length > 0) {
      //   // console.log("Enriching quotations with customer data for account IDs:", accountIds);
        
      //   // Get PostgreSQL accounts to find kristem_account_ids
      //   // const accountsQuery = `SELECT id, kristem_account_id FROM accounts WHERE kristem_account_id IN (${accountIds.map((_, i) => `$${i + 1}`).join(",")})`;
      //   // const accountsRes = await db.query(accountsQuery, accountIds);
      //   // const accountsMap = accountsRes.rows;

      //   // // console.log("Fetched kristem_account_ids for accounts:", accountsMap);

      //   // // Get kristem customer IDs
      //   // const kristemIds = [
      //   //   ...new Set(
      //   //     accountsMap
      //   //       .map(acc => Number(acc.kristemAccountId))
      //   //       .filter(Number.isFinite)
      //   //   ),
      //   // ];

      //   // const accountsMapObj = Object.fromEntries(
      //   //   accountsMap.map(acc => [Number(acc.id), Number(acc.kristemAccountId)])
      //   // );

      //   if (accountIds.length > 0) {
      //     const spiPool = await poolPromise;
      //     const customerQuery = `SELECT * FROM spidb.customer WHERE Id IN (${accountIds.join(",")})`;
      //     const customerRes = await spiPool.request().query(customerQuery);
      //     const customerMap = Object.fromEntries(
      //       customerRes.recordset.map((c) => [Number(c.Id), c])
      //     );

      //     // console.log("Fetched customers from MSSQL:", customerRes.recordset);

      //     // Attach customer data to quotations
      //     enriched.forEach((q) => {
      //       // console.log("Enriching quotation ID:", q.id);
      //       const accountId = q.account_id || q.accountId;
      //       if (accountId) {
      //         // console.log("Account ID for enrichment:", accountId);
      //         q.account = customerMap[accountId];
      //       }
      //     });

      //     // console.log(`✅ Enriched ${enriched.length} quotations with customer data`);
      //   }
      // }
    } catch (customerErr) {
      console.warn("Failed to enrich quotations with customer data:", customerErr.message);
    }

    // // console.log("✅ Enriched quotations:", enriched);
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
              // console.log("✅ Enriched quotation with customer data:", quotation.customer.Name);
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
    // console.log("Received request to update quotation with body:", body);
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

    // console.log("Updated quotation:", quotation);

    // Note: Work Order is marked Completed only after successful MSSQL submission

    return res.json(quotation);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Failed to update quotation" });
  }
});

router.post("/", async (req, res) => {
  try {
    // console.log(
    //   "Received request to create quotation with body:",
    //   toSnake(req.body),
    // );
    const { wo_id, assignee, account_id, created_by, updated_by, rfq_id: provided_rfq_id, source_module } = toSnake(
      req.body,
    );

    // Find RFQ and TR for this WO (or use provided IDs)
    let rfq_id = provided_rfq_id || null;
    let tr_id = null;
    
    if (!rfq_id && wo_id) {
      const rfqRes = await db.query(
        "SELECT id FROM rfqs WHERE wo_id = $1 LIMIT 1",
        [wo_id],
      );
      rfq_id = rfqRes.rows[0]?.id || null;
    }
    
    // Find TR by wo_id
    if (wo_id) {
      const trRes = await db.query(
        "SELECT id FROM technical_recommendations WHERE wo_id = $1 LIMIT 1",
        [wo_id],
      );
      tr_id = trRes.rows[0]?.id || null;
    }
    
    // console.log("📋 Quotation source analysis:");
    // console.log("  - wo_id:", wo_id);
    // console.log("  - rfq_id:", rfq_id);
    // console.log("  - tr_id:", tr_id);
    // console.log("  - source_module:", source_module || 'rfq (default)');
    
    // Find TR by wo_id
    if (wo_id) {
      const trRes = await db.query(
        "SELECT id FROM technical_recommendations WHERE wo_id = $1 LIMIT 1",
        [wo_id],
      );
      tr_id = trRes.rows[0]?.id || null;
    }

    // console.log("Quotation references:", { rfq_id, tr_id, wo_id });

    if (!rfq_id && !tr_id) {
      return res.status(400).json({
        error: "Missing reference: At least one of rfq_id or tr_id is required",
      });
    }

    // Generate quotation number
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

    // console.log("Last quotation number for current year:", qtNumRes.rows);

    let newCounter = 1;
    if (qtNumRes.rows.length > 0) {
      const lastQuotationNumber = qtNumRes.rows[0].quotationNumber;
      const lastCounter = parseInt(lastQuotationNumber.split("-")[2], 10);
      newCounter = lastCounter + 1;
    }

    const quotation_number = `QUOT-${currentYear}-${String(newCounter).padStart(4, "0")}`;

    const result = await db.query(
      `
        INSERT INTO quotations (rfq_id, tr_id, wo_id, assignee, account_id, source_module, created_at, created_by, updated_at, updated_by, quotation_number, due_date)
        VALUES ($1, $2, $3, $4, $5, $6, NOW(), $7, NOW(), $8, $9, $10)
        RETURNING *
      `,
      [
        rfq_id,
        tr_id,
        wo_id,
        assignee,
        account_id,
        source_module || 'rfq', // Default to 'rfq' if not provided
        created_by,
        updated_by,
        quotation_number,
        req.body.due_date || req.body.dueDate || null,
      ],
    );

    // console.log("Created new quotation:", result.rows[0]);
    const quotation_id = result.rows[0].id;

    // Populate quotation with products based on source
    const quotationProducts = [];
    
    if (rfq_id) {
      // Scenario A: From RFQ - Get RFQ items (already priced from vendor selection)
      // console.log(`📦 Fetching products from RFQ ${rfq_id}`);
      const rfqItemsRes = await db.query(
        `SELECT * FROM rfq_items WHERE rfq_id = $1`,
        [rfq_id]
      );
      // console.log(`📦 Found ${rfqItemsRes.rows.length} RFQ items`);
      
      // Add RFQ items to quotation products list
      for (const rfqItem of rfqItemsRes.rows) {
        quotationProducts.push({
          source: 'rfq',
          rfq_item_id: rfqItem.id,
          tr_product_id: rfqItem.trProductId || rfqItem.tr_product_id,
          product_name: rfqItem.productName || rfqItem.product_name,
          corrected_part_no: rfqItem.correctedPartNo || rfqItem.corrected_part_no,
          description: rfqItem.description,
          brand: rfqItem.brand,
          unit_om: rfqItem.unitOm || rfqItem.unit_om,
          // Pricing from RFQ vendor selection would be here
        });
      }
    }
    
    if (tr_id) {
      // Get direct_quotation products from TR
      // console.log(`📦 Fetching direct quotation products from TR ${tr_id}`);
      const trDirectProductsRes = await db.query(
        `SELECT * FROM technical_recommendation_products 
         WHERE tr_id = $1 AND routing_type = 'direct_quotation'`,
        [tr_id]
      );
      // console.log(`📦 Found ${trDirectProductsRes.rows.length} products marked for direct quotation`);
      
      // Add TR direct products to quotation products list
      for (const trProduct of trDirectProductsRes.rows) {
        quotationProducts.push({
          source: 'tr_direct',
          tr_product_id: trProduct.id,
          product_name: trProduct.productName || trProduct.product_name,
          corrected_part_no: trProduct.correctedPartNo || trProduct.corrected_part_no,
          description: trProduct.description,
          brand: trProduct.brand,
          unit_om: trProduct.unitOm || trProduct.unit_om,
        });
      }
    }
    
    // Insert all quotation products
    // console.log(`📦 Inserting ${quotationProducts.length} total products into quotation ${quotation_id}`);
    for (const product of quotationProducts) {
      await db.query(
        `INSERT INTO quotation_items 
         (quotation_id, tr_product_id, rfq_item_id, product_name, corrected_part_no, description, brand, unit_om, source) 
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [
          quotation_id,
          product.tr_product_id,
          product.rfq_item_id || null,
          product.product_name,
          product.corrected_part_no,
          product.description,
          product.brand,
          product.unit_om,
          product.source,
        ]
      );
    }
    // console.log(`✅ Successfully populated quotation ${quotation_id} with products`);

    // Create workflow stage for new quotation (Draft)
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
