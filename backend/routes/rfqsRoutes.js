import express from "express";
import db from "../db.js";
import { toSnake } from "../helper/utils.js";

const router = express.Router();

// Get all RFQs
router.get("/", async (req, res) => {
  try {
    const result = await db.query(`
      SELECT 
        r.*, 
        u.username AS assignee_username,
        sl.sl_number AS sl_number,
        a.account_name AS account_name
      FROM rfqs r
      LEFT JOIN users u ON r.assignee = u.id
      LEFT JOIN sales_leads sl ON r.sl_id = sl.id
      LEFT JOIN accounts a ON r.account_id = a.id
      ORDER BY r.id ASC
    `);
    return res.json(result.rows);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Failed to fetch RFQs" });
  }
});

// Get all vendors
router.get("/vendors", async (req, res) => {
  try {
    const result = await db.query(`SELECT * FROM vendors ORDER BY id ASC`);
    return res.json(result.rows);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Failed to fetch vendors" });
  }
});

// Get single RFQ
router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const result = await db.query(`
      SELECT 
        r.*, 
        u.username AS assignee_username,
        sl.sl_number AS sl_number,
        a.account_name AS account_name
      FROM rfqs r
      LEFT JOIN users u ON r.assignee = u.id
      LEFT JOIN sales_leads sl ON r.sl_id = sl.id
      LEFT JOIN accounts a ON r.account_id = a.id
      WHERE r.id = $1
    `, [id]);
    if (result.rows.length === 0)
      return res.status(404).json({ error: "Not found" });
    const rfq = result.rows[0];

    // Get items with details (excluding price and leadTime)
    const itemsRes = await db.query(`
      SELECT ri.*, i.*
      FROM rfq_items ri
      LEFT JOIN items i ON ri.item_id = i.id
      WHERE ri.rfq_id = $1
      ORDER BY ri.id ASC
    `, [id]);
    console.log("Fetched RFQ items:", itemsRes.rows);
    let items = itemsRes.rows.map(item => {
      // Remove price and leadTime from item
      const { unitPrice1, leadTime1, id1, ...rest } = item;
      return { ...rest };
    });

    // Get vendors with details
    const vendorsRes = await db.query(`
      SELECT rv.*, v.*
      FROM rfq_vendors rv
      LEFT JOIN vendors v ON rv.vendor_id = v.id
      WHERE rv.rfq_id = $1
      ORDER BY rv.id ASC
    `, [id]);
    console.log("Fetched RFQ vendors:", vendorsRes.rows);
    let vendors = vendorsRes.rows.map(vendor => {
      const { id1, ...rest } = vendor;
      return { ...rest, quotes: [] };
    });

    // Get quotations with item and vendor details
    const quotationsRes = await db.query(`
      SELECT q.*, i.name AS name, i.model AS model, i.brand AS brand, i.part_number AS part_number, i.unit AS unit, i.description AS description
      FROM rfq_quotations q
      LEFT JOIN items i ON q.item_id = i.id
      LEFT JOIN vendors v ON q.vendor_id = v.id
      WHERE q.rfq_id = $1
      ORDER BY q.id ASC
    `, [id]);
    const quotations = quotationsRes.rows;
    console.log("Fetched RFQ quotations:", quotations);

    // Map quotations to vendors
    vendors.forEach(vendor => {
      vendor.quotes = quotations
        .filter(q => q.vendorId === vendor.vendorId);
    });

    // Set price & leadTime for items based on selected quote
    items = items.map(item => {
      // Find selected quote for this item
      const selectedQuote = quotations.find(q => q.itemId === item.itemId && q.isSelected);
      if (selectedQuote) {
        return {
          ...item,
          unitPrice: selectedQuote.unitPrice,
          leadTime: selectedQuote.leadTime
        };
      }
      return item;
    });

    console.log("Final items with prices and lead times:", items);
    console.log("Final vendors", vendors);
    vendors.forEach((v) => console.log("Vendor", v.vendorId, "with quotes:", v.quotes));

    rfq.items = items;
    rfq.vendors = vendors;
    // Optionally, you can remove rfq.quotations if not needed in response

    return res.json(rfq);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Failed to fetch RFQ" });
  }
});

// Create new RFQ
router.post("/", async (req, res) => {
  try {
    console.log("Creating new RFQ with data:", req.body);
    const body = toSnake(req.body);
    const {
      wo_id,
      assignee,
      due_date,
      account_id,
      stage_status,
      created_by,
      items
    } = body;

    // Generate TR number
    const currentYear = new Date().getFullYear();
    const result = await db.query(
      `SELECT rfq_number
       FROM rfqs
       WHERE rfq_number LIKE $1
       ORDER BY rfq_number DESC
       LIMIT 1`,
      [`RFQ-${currentYear}-%`]
    );

    let newCounter = 1;
    if (result.rows.length > 0) {
      const lastRfqNumber = result.rows[0].rfqNumber;
      const lastCounter = parseInt(lastRfqNumber.split("-")[2], 10);
      newCounter = lastCounter + 1;
    }

    const rfq_number = `RFQ-${currentYear}-${String(newCounter).padStart(4, "0")}`;
    
    let sl_id = null;
    const slRes = await db.query(
      `SELECT id FROM sales_leads WHERE wo_id = $1 LIMIT 1`,
      [wo_id]
    );
    if (slRes.rows.length > 0) {
      sl_id = slRes.rows[0].id;
    }

    // Insert into DB
    const insertResult = await db.query(
      `INSERT INTO rfqs 
        (wo_id, assignee, rfq_number, stage_status, due_date, sl_id, account_id, created_at, created_by, updated_at)
        VALUES ($1,$2,$3,$4,$5,$6,NOW(),$7,NOW())
        RETURNING id`,
      [
        wo_id,
        assignee,
        rfq_number,
        stage_status || 'Draft',
        due_date,
        sl_id,
        account_id,
        assignee,
      ]
    );
    const newId = insertResult.rows[0].id;

    // Upsert RFQ items
    if (items && Array.isArray(items)) {
      for (const item of items) {
        let tempId = await db.query(
          `INSERT INTO rfq_items (rfq_id, item_id, quantity) VALUES ($1,$2,$3) RETURNING id`,
          [newId, item.itemId, item.quantity]
        );
        console.log("Inserted RFQ item with ID:", tempId.rows[0].id);
      }
    }

    // Create workflow stage for new technical recommendation (Draft)
    await db.query(
      `INSERT INTO workflow_stages (wo_id, stage_name, status, assigned_to, created_at, updated_at)
        VALUES ($1, $2, $3, $4, NOW(), NOW())`,
      [wo_id, 'RFQ', 'Draft', assignee]
    );

    const final = await db.query(
      `SELECT r.*, u.username AS assignee_username, a.account_name AS account_name
       FROM rfqs r
       LEFT JOIN users u ON r.assignee = u.id
       LEFT JOIN accounts a ON r.account_id = a.id
       WHERE r.id = $1`,
      [newId]
    );

    return res.status(201).json(final.rows[0]);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Failed to create RFQ" });
  }
});

// Update existing RFQ
router.put("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    console.log("reqBody:", JSON.stringify(req.body, null, 5));
    const body = toSnake(req.body);
    console.log("Updating RFQ ID:", id, "with data:", JSON.stringify(body, null, 5));
    // Add all fields you want to update here
    const updateResult = await db.query(
      `UPDATE rfqs 
       SET 
        wo_id=$1, assignee=$2, rfq_number=$3, due_date=$4, description=$5, sl_id=$6, account_id=$7, payment_terms=$8, notes=$9, subtotal=$10, vat=$11, grand_total=$12, created_at=$13, updated_by=$14, updated_at=NOW()
       WHERE id=$15
       RETURNING id`,
      [
        body.wo_id,
        body.assignee,
        body.rfq_number,
        body.due_date,
        body.description,
        body.sl_id,
        body.account_id,
        body.payment_terms,
        body.notes,
        body.subtotal,
        body.vat,
        body.grand_total,
        body.created_at,
        body.created_by,
        id
      ]
    );
    const updatedId = updateResult.rows[0].id;

    // Upsert RFQ items
    if (body.items && Array.isArray(body.items)) {
      // Delete items not in incoming
      const existingRes = await db.query('SELECT * FROM rfq_items WHERE rfq_id = $1', [id]);
      const existing = toSnake(existingRes.rows);
      const existingIds = new Set(existing.map(i => i.item_id));
      const incomingIds = new Set(body.items.filter(i => i.item_id).map(i => i.item_id));
      for (const ex of existing) {
        if (!incomingIds.has(ex.item_id)) {
          await db.query('DELETE FROM rfq_items WHERE item_id = $1 AND rfq_id = $2', [ex.item_id, id]);
        }
      }
      for (const item of body.items) {
        const unitPrice = item.unit_price === "" ? null : item.unit_price;
        const quantity = item.quantity === "" ? null : item.quantity;
        if (item.item_id && existingIds.has(item.item_id)) {
          await db.query(
            `UPDATE rfq_items SET item_id=$1, quantity=$2, unit_price=$3 WHERE item_id=$4 AND rfq_id=$5`,
            [item.item_id, quantity, unitPrice, item.item_id, id]
          );
        } else {
          await db.query(
            `INSERT INTO rfq_items (rfq_id, item_id, quantity, unit_price) VALUES ($1,$2,$3,$4)`,
            [id, item.item_id, quantity, unitPrice]
          );
        }
      }
    }

    // Upsert RFQ vendors
    if (body.vendors && Array.isArray(body.vendors)) {
      const existingRes = await db.query('SELECT * FROM rfq_vendors WHERE rfq_id = $1', [id]);
      const existing = toSnake(existingRes.rows);
      const existingIds = new Set(existing.map(v => v.vendor_id));
      const incomingIds = new Set(body.vendors.filter(v => v.vendor_id).map(v => v.vendor_id));
      for (const ex of existing) {
        if (!incomingIds.has(ex.vendor_id)) {
          await db.query('DELETE FROM rfq_vendors WHERE vendor_id = $1 AND rfq_id = $2', [ex.vendor_id, id]);
        }
      }
      for (const vendor of body.vendors) {
        const validUntil = vendor.validUntil === "" ? null : vendor.validUntil;
        const paymentTerms = vendor.paymentTerms === "" ? null : vendor.paymentTerms;
        const notes = vendor.notes === "" ? null : vendor.notes;
        if (vendor.vendor_id && existingIds.has(vendor.vendor_id)) {
          await db.query(
            `UPDATE rfq_vendors SET vendor_id=$1, valid_until=$2, payment_terms=$3, notes=$4 WHERE vendor_id=$5 AND rfq_id=$6`,
            [vendor.vendor_id, validUntil, paymentTerms, notes, vendor.vendor_id, id]
          );
        } else {
          await db.query(
            `INSERT INTO rfq_vendors (rfq_id, vendor_id, valid_until, payment_terms, notes) VALUES ($1,$2,$3,$4,$5)`,
            [id, vendor.vendor_id, validUntil, paymentTerms, notes]
          );
        }
      }
    }

    // Flatten vendor quotes arrays into a single quotations array
    let allQuotations = [];
    if (body.vendors && Array.isArray(body.vendors)) {
      body.vendors.forEach(vendor => {
        console.log("Quoting Vendor:", vendor);
        if (Array.isArray(vendor.quotes)) {
          allQuotations.push(...vendor.quotes);
        }
      });
    }
    console.log("quotations", allQuotations);
    if (allQuotations.length > 0) {
      const existingRes = await db.query('SELECT * FROM rfq_quotations WHERE rfq_id = $1', [id]);
      const existing = toSnake(existingRes.rows);
      // Use a combination of vendor_id, item_id, and rfq_id to identify unique quotations
      const existingIds = new Set(existing.map(q => `${q.vendor_id}-${q.item_id}-${q.rfq_id}`));
      const incomingIds = new Set(allQuotations.filter(q => `${q.vendor_id}-${q.item_id}-${q.rfq_id}`).map(q => `${q.vendor_id}-${q.item_id}-${q.rfq_id}`));
      for (const ex of existing) {
        if (!incomingIds.has(`${ex.vendor_id}-${ex.item_id}-${ex.rfq_id}`)) {
          await db.query('DELETE FROM rfq_quotations WHERE item_id = $1 AND vendor_id = $2 AND rfq_id = $3', [ex.item_id, ex.vendor_id, ex.rfq_id]);
        }
      }
      for (const q of allQuotations) {
        const quantity = q.quantity === "" ? null : q.quantity;
        const leadTime = q.lead_time === "" ? null : q.lead_time;
        const unitPrice = q.unit_price === "" ? null : q.unit_price;
        const isSelected = q.is_selected === "" ? null : q.is_selected;
        if (existingIds.has(`${q.vendor_id}-${q.item_id}-${q.rfq_id}`)) {
          await db.query(
            `UPDATE rfq_quotations SET item_id=$1, vendor_id=$2, quantity=$3, lead_time=$4, is_selected=$5, unit_price=$6 WHERE item_id=$7 AND vendor_id=$8 AND rfq_id=$9`,
            [q.item_id, q.vendor_id, quantity, leadTime, isSelected, unitPrice, q.item_id, q.vendor_id, id]
          );
        } else {
          await db.query(
            `INSERT INTO rfq_quotations (rfq_id, item_id, vendor_id, quantity, lead_time, is_selected, unit_price) VALUES ($1,$2,$3,$4,$5,$6,$7)`,
            [id, q.item_id, q.vendor_id, quantity, leadTime, isSelected, unitPrice]
          );
        }
      }
    }

    const result = await db.query(
      `SELECT r.*, u.username AS assignee_username, a.account_name AS account_name
       FROM rfqs r
       LEFT JOIN users u ON r.assignee = u.id
       LEFT JOIN accounts a ON r.account_id = a.id
       WHERE r.id = $1`,
      [updatedId]
    );
    if (result.rows.length === 0)
      return res.status(404).json({ error: "Not found" });
    return res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Failed to update RFQ" });
  }
});

// Get items associated with an RFQ
router.get("/:id/items", async (req, res) => {
  try {
    const { id } = req.params;
    // Get items and their vendor quotes
    const itemsResult = await db.query(
      `SELECT * FROM rfq_items WHERE rfq_id = $1 ORDER BY id ASC`,
      [id]
    );
    const items = itemsResult.rows;

    // For each item, get vendor quotes
    const itemsWithQuotes = await Promise.all(items.map(async (item) => {
      const quotesResult = await db.query(
        `SELECT q.*, v.name AS vendor_name, v.contact_person, v.phone, v.email, v.address
         FROM rfq_quotations q
         LEFT JOIN vendors v ON q.vendor_id = v.id
         WHERE q.item_id = $1 AND q.rfq_id = $2
         ORDER BY q.id ASC`,
        [item.item_id, id]
      );
      return {
        ...item,
        vendorQuotes: quotesResult.rows
      };
    }));
    return res.json(itemsWithQuotes);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Failed to fetch RFQ items" });
  }
});

// Get vendors associated with an RFQ
// Create RFQ items
router.post('/:id/items', async (req, res) => {
  try {
    const { id } = req.params;
    const itemsRaw = Array.isArray(req.body) ? req.body : [req.body];
    const items = itemsRaw.map(toSnake);
    // Fetch existing items
    const existingRes = await db.query('SELECT * FROM rfq_items WHERE rfq_id = $1', [id]);
    const existing = existingRes.rows;
    const existingIds = new Set(existing.map(i => i.id));
    const incomingIds = new Set(items.filter(i => i.id).map(i => i.id));

    // Delete items not in incoming
    for (const ex of existing) {
      if (!incomingIds.has(ex.id)) {
        await db.query('DELETE FROM rfq_items WHERE id = $1', [ex.id]);
      }
    }

    const upserted = [];
    for (const item of items) {
      if (item.id && existingIds.has(item.id)) {
        // Update
        const result = await db.query(
          `UPDATE rfq_items SET description=$1, brand=$2, part_number=$3, quantity=$4, unit=$5, lead_time=$6, unit_price=$7, amount=$8 WHERE id=$9 RETURNING *`,
          [item.description, item.brand, item.part_number, item.quantity, item.unit, item.lead_time, item.unit_price, item.amount, item.id]
        );
        upserted.push(result.rows[0]);
      } else {
        // Insert
        const result = await db.query(
          `INSERT INTO rfq_items (rfq_id, description, brand, part_number, quantity, unit, lead_time, unit_price, amount)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
          [id, item.description, item.brand, item.part_number, item.quantity, item.unit, item.lead_time, item.unit_price, item.amount]
        );
        upserted.push(result.rows[0]);
      }
    }
    return res.status(201).json(upserted);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Failed to save RFQ items' });
  }
});

// Create RFQ vendors
router.post('/:id/vendors', async (req, res) => {
  try {
    const { id } = req.params;
    const vendorsRaw = Array.isArray(req.body) ? req.body : [req.body];
    const vendors = vendorsRaw.map(toSnake);
    // Fetch existing vendors
    const existingRes = await db.query('SELECT * FROM rfq_vendors WHERE rfq_id = $1', [id]);
    const existing = existingRes.rows;
    const existingIds = new Set(existing.map(v => v.id));
    const incomingIds = new Set(vendors.filter(v => v.id).map(v => v.id));

    // Delete vendors not in incoming
    for (const ex of existing) {
      if (!incomingIds.has(ex.id)) {
        await db.query('DELETE FROM rfq_vendors WHERE id = $1', [ex.id]);
      }
    }

    const upserted = [];
    for (const vendor of vendors) {
      if (vendor.id && existingIds.has(vendor.id)) {
        // Update
        const result = await db.query(
          `UPDATE rfq_vendors SET vendor_id=$1, contact_person=$2, status=$3, quote_date=$4, grand_total=$5, notes=$6 WHERE id=$7 RETURNING *`,
          [vendor.vendor_id, vendor.contact_person, vendor.status, vendor.quote_date, vendor.grand_total, vendor.notes, vendor.id]
        );
        upserted.push(result.rows[0]);
      } else {
        // Insert
        const result = await db.query(
          `INSERT INTO rfq_vendors (rfq_id, vendor_id, contact_person, status, quote_date, grand_total, notes)
           VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
          [id, vendor.vendor_id, vendor.contact_person, vendor.status, vendor.quote_date, vendor.grand_total, vendor.notes]
        );
        upserted.push(result.rows[0]);
      }
    }
    return res.status(201).json(upserted);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Failed to save RFQ vendors' });
  }
});

// Create RFQ item vendor quotes
router.post('/:id/item-quotes', async (req, res) => {
  try {
    const { id } = req.params;
    const quotesRaw = Array.isArray(req.body) ? req.body : [req.body];
    const quotes = quotesRaw.map(toSnake);
    // Fetch existing quotes for items in this RFQ
    // Get all item ids for this RFQ
    const itemsRes = await db.query('SELECT id FROM rfq_items WHERE rfq_id = $1', [id]);
    const itemIds = itemsRes.rows.map(r => r.id);
    const existingRes = await db.query('SELECT * FROM rfq_item_vendor_quotes WHERE rfq_item_id = ANY($1)', [itemIds]);
    const existing = existingRes.rows;
    const existingIds = new Set(existing.map(q => q.id));
    const incomingIds = new Set(quotes.filter(q => q.id).map(q => q.id));

    // Delete quotes not in incoming
    for (const ex of existing) {
      if (!incomingIds.has(ex.id)) {
        await db.query('DELETE FROM rfq_item_vendor_quotes WHERE id = $1', [ex.id]);
      }
    }

    const upserted = [];
    for (const quote of quotes) {
      if (quote.id && existingIds.has(quote.id)) {
        // Update
        const result = await db.query(
          `UPDATE rfq_item_vendor_quotes SET vendor_id=$1, unit_price=$2, total=$3, lead_time=$4, lead_time_color=$5, quote_date=$6, status=$7, notes=$8 WHERE id=$9 RETURNING *`,
          [quote.vendor_id, quote.unit_price, quote.total, quote.lead_time, quote.lead_time_color, quote.quote_date, quote.status, quote.notes, quote.id]
        );
        upserted.push(result.rows[0]);
      } else {
        // Insert
        const result = await db.query(
          `INSERT INTO rfq_item_vendor_quotes (rfq_item_id, vendor_id, unit_price, total, lead_time, lead_time_color, quote_date, status, notes)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
          [quote.rfq_item_id, quote.vendor_id, quote.unit_price, quote.total, quote.lead_time, quote.lead_time_color, quote.quote_date, quote.status, quote.notes]
        );
        upserted.push(result.rows[0]);
      }
    }
    return res.status(201).json(upserted);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Failed to save RFQ item vendor quotes' });
  }
});

router.get("/:id/vendors", async (req, res) => {
  try {
    const { id } = req.params;
    const result = await db.query(
      `SELECT rv.*, v.name, v.phone, v.email, v.address
       FROM rfq_vendors rv
       LEFT JOIN vendors v ON rv.vendor_id = v.id
       WHERE rv.rfq_id = $1
       ORDER BY rv.id ASC`,
      [id]
    );
    return res.json(result.rows);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Failed to fetch RFQ vendors" });
  }
});

export default router;