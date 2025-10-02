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
        sl.sl_number AS sl_number
      FROM rfqs r
      LEFT JOIN users u ON r.assignee = u.id
      LEFT JOIN sales_leads sl ON r.sl_id = sl.id
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
        u.department AS assignee_department,
        sl.sl_number AS sl_number
      FROM rfqs r
      LEFT JOIN users u ON r.assignee = u.id
      LEFT JOIN sales_leads sl ON r.sl_id = sl.id
      WHERE r.id = $1
    `, [id]);
    if (result.rows.length === 0)
      return res.status(404).json({ error: "Not found" });
    return res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Failed to fetch RFQ" });
  }
});

// Create new RFQ
router.post("/", async (req, res) => {
  try {
    const body = toSnake(req.body);
    const {
      wo_id,
      assignee,
      rfq_date,
      due_date,
      account_id,
      created_by,
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

    console.log("Latest RFQ number query result:", result.rows);

    let newCounter = 1;
    if (result.rows.length > 0) {
      const lastRfqNumber = result.rows[0].rfq_number;
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
        (wo_id, assignee, rfq_number, rfq_date, due_date, sl_id, account_id, created_at, created_by, updated_at)
        VALUES ($1,$2,$3,$4,$5,$6,$7,NOW(),$8,NOW())
        RETURNING id`,
      [
        wo_id,
        assignee,
        rfq_number,
        rfq_date || new Date().toISOString().split('T')[0],
        due_date,
        sl_id,
        account_id,
        assignee,
      ]
    );
    const newId = insertResult.rows[0].id;

    // Create workflow stage for new technical recommendation (Draft)
    await db.query(
      `INSERT INTO workflow_stages (wo_id, stage_name, status, assigned_to, created_at, updated_at)
        VALUES ($1, $2, $3, $4, NOW(), NOW())`,
      [newId, 'RFQ', 'Draft', assignee]
    );

    const final = await db.query(
      `SELECT r.*, u.username AS assignee_username
       FROM rfqs r
       LEFT JOIN users u ON r.assignee = u.id
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
    const body = toSnake(req.body);
    // Add all fields you want to update here
    const updateResult = await db.query(
      `UPDATE rfqs 
       SET 
        wo_id=$1, assignee=$2, rfq_number=$3, rfq_date=$4, due_date=$5, description=$6, sl_id=$7, account_id=$8, payment_terms=$9, notes=$10, subtotal=$11, vat=$12, grand_total=$13, created_at=$14, created_by=$15, updated_at=NOW()
       WHERE id=$16
       RETURNING id`,
      [
        body.wo_id,
        body.assignee,
        body.rfq_number,
        body.rfq_date,
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
    const result = await db.query(
      `SELECT r.*, u.username AS assignee_username
       FROM rfqs r
       LEFT JOIN users u ON r.assignee = u.id
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
         FROM rfq_item_vendor_quotes q
         LEFT JOIN vendors v ON q.vendor_id = v.id
         WHERE q.rfq_item_id = $1
         ORDER BY q.id ASC`,
        [item.id]
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
          `UPDATE rfq_item_vendor_quotes SET vendor_id=$1, price=$2, total=$3, lead_time=$4, lead_time_color=$5, quote_date=$6, status=$7, notes=$8 WHERE id=$9 RETURNING *`,
          [quote.vendor_id, quote.price, quote.total, quote.lead_time, quote.lead_time_color, quote.quote_date, quote.status, quote.notes, quote.id]
        );
        upserted.push(result.rows[0]);
      } else {
        // Insert
        const result = await db.query(
          `INSERT INTO rfq_item_vendor_quotes (rfq_item_id, vendor_id, price, total, lead_time, lead_time_color, quote_date, status, notes)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
          [quote.rfq_item_id, quote.vendor_id, quote.price, quote.total, quote.lead_time, quote.lead_time_color, quote.quote_date, quote.status, quote.notes]
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