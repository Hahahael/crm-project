import express from "express";
import db from "../db.js";
import { toSnake } from "../helper/utils.js";
import { poolPromise } from "../mssql.js";

const router = express.Router();

// (helper removed: was only used in commented debug)

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
    const result = await db.query(
      `
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
      `,
      [id],
    );
    if (result.rows.length === 0)
      return res.status(404).json({ error: "Not found" });
    const rfq = result.rows[0];

    // Get rfq_items rows (we'll resolve item details from MSSQL)
    const itemsRes = await db.query(
      `SELECT * FROM rfq_items WHERE rfq_id = $1 ORDER BY id ASC`,
      [id],
    );
    console.log("Fetched RFQ rfq_items:", itemsRes.rows);
    const pool = await poolPromise;
    let items = [];
    for (const ri of itemsRes.rows) {
      try {
        // ri may come from Postgres with snake_case (item_id) or camelCase (itemId)
        const itemKey = ri.item_id ?? ri.itemId ?? null;
        const sdRes = await pool
          .request()
          .input("id", Number(itemKey))
          .query("SELECT * FROM spidb.stock_details WHERE Stock_Id = @id");
        const sRes = await pool
          .request()
          .input("id", Number(itemKey))
          .query("SELECT * FROM spidb.stock WHERE Id = @id");
        // logAttributes(`rfq item stock_details (id=${ri.itemId})`, sdRes.recordset || []);
        // logAttributes(`rfq item stock (id=${ri.itemId})`, sRes.recordset || []);
        console.log(`rfq item sdRes (id=${ri.itemId})`, sdRes);
        console.log(`rfq item sRes (id=${ri.itemId})`, sRes);

        const detailObj =
          sdRes && sdRes.recordset && sdRes.recordset[0]
            ? sdRes.recordset[0]
            : null;
        const parentObj =
          sRes && sRes.recordset && sRes.recordset[0]
            ? sRes.recordset[0]
            : null;
        const merged = mergePrimaryWithParent(detailObj, parentObj);
        let itemToPush = { ...ri };
        // attach resolved MSSQL details when available
        if (merged) {
          itemToPush.details = merged;
        }
        // canonicalize item id fields for frontend convenience
        itemToPush.itemId =
          itemToPush.itemId ??
          itemToPush.item_id ??
          itemToPush.itemId ??
          itemToPush.id ??
          null;
        items.push(itemToPush);
      } catch (err) {
        console.error(
          "Error resolving/merging MSSQL item for rfq_item",
          ri,
          err,
        );
        items.push({
          id: ri.id,
          itemId: ri.itemId ?? ri.item_id ?? null,
          quantity: ri.quantity,
        });
      }
    }

    // Get rfq_vendors rows and resolve vendor details from MSSQL
    const vendorsRes = await db.query(
      `SELECT * FROM rfq_vendors WHERE rfq_id = $1 ORDER BY id ASC`,
      [id],
    );
    console.log("Fetched RFQ rfq_vendors:", vendorsRes.rows);
    const vendors = [];
    for (const rv of vendorsRes.rows) {
      try {
        // fetch parent vendor and its details
        // rv may have vendor_id (snake) or vendorId (camel) depending on DB wrapper
        const vendorKey =
          rv.vendor_id ?? rv.vendorId ?? rv.Vendor_Id ?? rv.id ?? null;
        const parentRes = await pool
          .request()
          .input("id", Number(vendorKey))
          .query("SELECT * FROM spidb.vendor WHERE Id = @id");
        const detailsRes = await pool
          .request()
          .input("vendor_id", Number(vendorKey))
          .query(
            "SELECT * FROM spidb.vendor_details WHERE Vendor_Id = @vendor_id",
          );
        // logAttributes(`rfq vendor parent (id=${rv.vendor_id})`, parentRes.recordset || []);
        // logAttributes(`rfq vendor details (vendor_id=${rv.vendor_id})`, detailsRes.recordset || []);

        const parent =
          parentRes && parentRes.recordset && parentRes.recordset[0]
            ? parentRes.recordset[0]
            : null;
        const detail =
          detailsRes && detailsRes.recordset && detailsRes.recordset[0]
            ? detailsRes.recordset[0]
            : null;
        const merged = mergePrimaryWithParent(detail, parent);
        let vendorToPush = { ...rv, ...parent };
        // if (merged) vendorToPush.details = merged;
        vendorToPush.details = detail;
        vendorToPush.items = items.map((it) => ({ price: null, leadTime: "", ...it }));
        // canonicalize vendor id fields
        vendorToPush.vendorId =
          vendorToPush.vendorId ??
          vendorToPush.vendor_id ??
          vendorToPush.Vendor_Id ??
          merged?.Id ??
          vendorToPush.id ??
          null;
        vendors.push(vendorToPush);
      } catch (err) {
        console.error("Error resolving MSSQL vendor for rfq_vendor", rv, err);
        vendors.push({
          id: rv.id,
          vendorId: rv.vendor_id ?? rv.vendorId ?? null,
          quotes: [],
        });
      }
    }

    console.log("Final items before quotations:", items);
    console.log("Final vendors before quotations:", vendors);

    // Get quotations with item and vendor details
    const quotationsRes = await db.query(
      `
                        SELECT q.*
                        FROM rfq_quotations q
                        WHERE q.rfq_id = $1
                        ORDER BY q.id ASC
                        `,
      [id],
    );
    const quotations = quotationsRes.rows;
    console.log("Fetched RFQ quotations:", quotations);

    // Map quotations to vendors (use canonical vendorId)
    vendors.forEach((vendor) => {
      const vId =
        vendor.vendorId ??
        vendor.vendor_id ??
        vendor.Vendor_Id ??
        vendor.Id ??
        null;
      vendor.quotes = quotations.filter(
        (q) => (q.vendorId ?? q.vendor_id) == vId,
      );
    });

    // Set price & leadTime for items based on selected quote
    // items = items.map((item) => {
    //         // Find selected quote for this item
    //         const selectedQuote = quotations.find((q) => q.itemId === item.itemId && q.isSelected);
    //         if (selectedQuote) {
    //                 return {
    //                         ...item,
    //                         unitPrice: selectedQuote.unitPrice,
    //                         leadTime: selectedQuote.leadTime,
    //                 };
    //         }
    //         return item;
    // });

    console.log("Final items with prices and lead times:", items);
    console.log("Final vendors", vendors);
    vendors.forEach((v) =>
      console.log("Vendor", v.vendorId, "with quotes:", v.quotes),
    );

    rfq.items = items;
    rfq.vendors = vendors;

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
      items,
      selected_vendors_by_item,
    } = body;

    // Generate TR number
    const currentYear = new Date().getFullYear();
    const result = await db.query(
      `
                        SELECT rfq_number
                        FROM rfqs
                        WHERE rfq_number LIKE $1
                        ORDER BY rfq_number DESC
                        LIMIT 1`,
      [`RFQ-${currentYear}-%`],
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
      [wo_id],
    );
    if (slRes.rows.length > 0) {
      sl_id = slRes.rows[0].id;
    }

    // Insert into DB
    const insertResult = await db.query(
      `
                        INSERT INTO rfqs 
                        (wo_id, assignee, rfq_number, stage_status, due_date, sl_id, account_id, selected_vendors_by_item, created_at, created_by, updated_at)
                        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,NOW(),$9,NOW())
                        RETURNING id`,
      [
        wo_id,
        assignee,
        rfq_number,
        stage_status || "Draft",
        due_date,
        sl_id,
        account_id,
        selected_vendors_by_item || null,
        assignee,
      ],
    );
    const newId = insertResult.rows[0].id;
    console.log("Created RFQ with ID:", newId);

    // Upsert RFQ items
    if (items && Array.isArray(items)) {
      console.log("Inserting RFQ items:", items);
      for (const item of items) {
        console.log("Inserting RFQ item:", item);
        let tempId = await db.query(
          `INSERT INTO rfq_items (rfq_id, item_id, quantity) VALUES ($1,$2,$3) RETURNING id`,
          [newId, item.item_id, item.quantity],
        );
        console.log("Inserted RFQ item with ID:", tempId.rows[0].id);
      }
    }

    // Create workflow stage for new technical recommendation (Draft)
    await db.query(
      `
                        INSERT INTO workflow_stages (wo_id, stage_name, status, assigned_to, created_at, updated_at)
                        VALUES ($1, $2, $3, $4, NOW(), NOW())`,
      [wo_id, "RFQ", "Draft", assignee],
    );

    const final = await db.query(
      `
                        SELECT r.*, u.username AS assignee_username, a.account_name AS account_name
                        FROM rfqs r
                        LEFT JOIN users u ON r.assignee = u.id
                        LEFT JOIN accounts a ON r.account_id = a.id
                        WHERE r.id = $1`,
      [newId],
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
    // Debug: log raw incoming body and headers before conversion
    try {
      console.log("[DEBUG] Incoming request headers:", {
        "content-type": req.get("content-type"),
        "content-length": req.get("content-length"),
      });
      console.log(
        "[DEBUG] raw req.body type:",
        Array.isArray(req.body) ? "array" : typeof req.body,
      );
      console.log("[DEBUG] raw req.body keys:", Object.keys(req.body || {}));
      console.log(
        "[DEBUG] raw req.body (stringified, truncated):",
        JSON.stringify(req.body || {}, null, 2).slice(0, 2000),
      );
    } catch (dbgErr) {
      console.error("[DEBUG] failed to stringify raw req.body", dbgErr);
    }

    const body = toSnake(req.body);
    console.log(
      "Updating RFQ ID:",
      id,
      "with data keys:",
      Object.keys(body || {}),
    );
    // Optional: log a truncated serialization to avoid huge logs
    console.log(
      "[DEBUG] converted body (truncated):",
      JSON.stringify(body || {}, null, 2).slice(0, 2000),
    );
    // Add all fields you want to update here
    // Ensure actual_date and actual_from_time are set if missing
    let actualDate = body.actual_date;
    let actualFromTime = body.actual_from_time;
    if (!actualDate) actualDate = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
    if (!actualFromTime)
      actualFromTime = new Date().toTimeString().split(" ")[0]; // HH:MM:SS

    const updateResult = await db.query(
      `UPDATE rfqs 
        SET 
          wo_id=$1, assignee=$2, rfq_number=$3, due_date=$4, description=$5,
          sl_id=$6, account_id=$7, payment_terms=$8, notes=$9, subtotal=$10,
          vat=$11, grand_total=$12, actual_date=$13, actual_from_time=$14, created_at=$15,
          selected_vendors_by_item=$17, updated_by=$16, updated_at=NOW()
        WHERE id=$18
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
        actualDate,
        actualFromTime,
        body.created_at,
        body.created_by,
        body.selected_vendors_by_item || null,
        id,
      ],
    );
    const updatedId = updateResult.rows[0].id;

    // Upsert RFQ items
    if (body.items && Array.isArray(body.items)) {
      // Delete items not in incoming
      const existingRes = await db.query(
        "SELECT * FROM rfq_items WHERE rfq_id = $1",
        [id],
      );
      const existing = toSnake(existingRes.rows);
      const existingIds = new Set(existing.map((i) => i.item_id));
      const incomingIds = new Set(
        body.items.filter((i) => i.item_id).map((i) => i.item_id),
      );
      console.log("Existing items:", existing);
      console.log("Body items:", body.items);
      for (const ex of existing) {
        if (!incomingIds.has(ex.item_id)) {
          await db.query(
            "DELETE FROM rfq_items WHERE item_id = $1 AND rfq_id = $2",
            [ex.item_id, id],
          );
        }
      }
      for (const item of body.items) {
        const unitPrice = item.unit_price === "" ? null : item.unit_price;
        const quantity = item.quantity === "" ? null : item.quantity;
        // If the incoming item provides an item_id that already exists for this RFQ, update the record
        if (item.item_id && existingIds.has(item.item_id)) {
          await db.query(
            `UPDATE rfq_items SET quantity = $1, unit_price = $2, lead_time = $3 WHERE item_id = $4 AND rfq_id = $5 RETURNING *`,
            [quantity, unitPrice, item.lead_time, item.item_id, id],
          );
        } else {
          await db.query(
            `INSERT INTO rfq_items (rfq_id, item_id, quantity, unit_price, lead_time) VALUES ($1,$2,$3,$4,$5) RETURNING *`,
            [id, item.item_id, quantity, unitPrice, item.lead_time],
          );
        }
      }
    }

    // Upsert RFQ vendors
    if (body.vendors && Array.isArray(body.vendors)) {
      const existingRes = await db.query(
        "SELECT * FROM rfq_vendors WHERE rfq_id = $1",
        [id],
      );
      const existing = toSnake(existingRes.rows);
      const existingIds = new Set(existing.map((v) => v.vendor_id));
      const incomingIds = new Set(
        body.vendors.filter((v) => v.vendor_id).map((v) => v.vendor_id),
      );
      console.log("Existing vendors:", existing);
      console.log("Body vendors:", body.vendors);
      // Delete vendors not in incoming
      for (const ex of existing) {
        if (!incomingIds.has(ex.vendor_id)) {
          await db.query(
            "DELETE FROM rfq_vendors WHERE vendor_id = $1 AND rfq_id = $2",
            [ex.vendor_id, id],
          );
        }
      }
      for (const vendor of body.vendors) {
        const validUntil = vendor.validUntil === "" ? null : vendor.validUntil;
        const paymentTerms =
          vendor.paymentTerms === "" ? null : vendor.paymentTerms;
        const notes = vendor.notes === "" ? null : vendor.notes;
        const subtotal = vendor.subtotal === "" ? null : vendor.subtotal;
        const vat = vendor.vat === "" ? null : vendor.vat;
        const grandTotal =
          vendor.grandTotal === "" ? null : vendor.grandTotal;
        const quoteDate =
          vendor.quoteDate === "" ? null : vendor.quoteDate;
        // If the incoming vendor provides a vendor_id that already exists for this RFQ, update the record
        if (vendor.vendor_id && existingIds.has(vendor.vendor_id)) {
          await db.query(
            `UPDATE rfq_vendors SET vendor_id=$1, valid_until=$2, payment_terms=$3, subtotal=$4, vat=$5, grand_total=$6, quote_date=$7, notes=$8 WHERE vendor_id=$9 AND rfq_id=$10`,
            [
              vendor.vendor_id,
              validUntil,
              paymentTerms,
              subtotal,
              vat,
              grandTotal,
              quoteDate,
              notes,
              vendor.vendor_id,
              id,
            ],
          );
        } else {
          await db.query(
            `INSERT INTO rfq_vendors (rfq_id, vendor_id, valid_until, payment_terms, subtotal, vat, grand_total, quote_date, notes) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
            [id, vendor.vendor_id, validUntil, paymentTerms, subtotal, vat, grandTotal, quoteDate, notes],
          );
        }
      }
    }

    // Flatten vendor quotes arrays into a single quotations array
    let allQuotations = [];
    if (body.vendors && Array.isArray(body.vendors)) {
      body.vendors.forEach((vendor) => {
        console.log("Quoting Vendor:", vendor);
        if (Array.isArray(vendor.quotes)) {
          allQuotations.push(...vendor.quotes);
        }
      });
    }
    console.log("quotations", allQuotations);
    // Track vendor changes (unit_price/lead_time) within this update request
    const vendorChanged = new Map(); // key: vendor_id, value: boolean
    if (allQuotations.length > 0) {
      const existingRes = await db.query(
        "SELECT * FROM rfq_quotations WHERE rfq_id = $1",
        [id],
      );
      const existing = toSnake(existingRes.rows);
      // Use a combination of vendor_id, item_id, and rfq_id to identify unique quotations
      const existingIds = new Set(
        existing.map((q) => `${q.vendor_id}-${q.item_id}-${q.rfq_id}`),
      );
      const incomingIds = new Set(
        allQuotations
          .filter((q) => q.vendor_id && q.item_id && q.rfq_id)
          .map((q) => `${q.vendor_id}-${q.item_id}-${q.rfq_id}`),
      );
      for (const ex of existing) {
        if (!incomingIds.has(`${ex.vendor_id}-${ex.item_id}-${ex.rfq_id}`)) {
          await db.query(
            "DELETE FROM rfq_quotations WHERE item_id = $1 AND vendor_id = $2 AND rfq_id = $3",
            [ex.item_id, ex.vendor_id, ex.rfq_id],
          );
          vendorChanged.set(ex.vendor_id, true);
        }
      }
      for (const q of allQuotations) {
        const quantity = q.quantity === "" ? null : q.quantity;
        const leadTime = q.lead_time === "" ? null : q.lead_time;
        const unitPrice = q.unit_price === "" ? null : q.unit_price;
        const isSelected = q.is_selected === "" ? null : q.is_selected;
        if (existingIds.has(`${q.vendor_id}-${q.item_id}-${q.rfq_id}`)) {
<<<<<<< HEAD
          // Detect change vs previous values
=======
          // detect change versus previous
>>>>>>> 90ec9e3 (Added updated routes for dashboards and summaries)
          try {
            const prev = existing.find(
              (e) => e.vendor_id === q.vendor_id && e.item_id === q.item_id && e.rfq_id === q.rfq_id,
            );
            if (prev) {
<<<<<<< HEAD
              if (prev.unit_price !== unitPrice || prev.lead_time !== leadTime) {
=======
              const prevUnit = prev.unit_price;
              const prevLead = prev.lead_time;
              if (prevUnit !== unitPrice || prevLead !== leadTime) {
>>>>>>> 90ec9e3 (Added updated routes for dashboards and summaries)
                vendorChanged.set(q.vendor_id, true);
              }
            }
          } catch {
<<<<<<< HEAD
            // ignore change detection errors
=======
            // ignore comparison failure
>>>>>>> 90ec9e3 (Added updated routes for dashboards and summaries)
          }
          await db.query(
            `UPDATE rfq_quotations SET item_id=$1, vendor_id=$2, quantity=$3, lead_time=$4, is_selected=$5, unit_price=$6 WHERE item_id=$7 AND vendor_id=$8 AND rfq_id=$9`,
            [
              q.item_id,
              q.vendor_id,
              quantity,
              leadTime,
              isSelected,
              unitPrice,
              q.item_id,
              q.vendor_id,
              id,
            ],
          );
        } else {
<<<<<<< HEAD
          // Treat insertion with meaningful values as a change
=======
>>>>>>> 90ec9e3 (Added updated routes for dashboards and summaries)
          if (q.vendor_id && (unitPrice != null || leadTime != null)) {
            vendorChanged.set(q.vendor_id, true);
          }
          await db.query(
            `INSERT INTO rfq_quotations (rfq_id, item_id, vendor_id, quantity, lead_time, is_selected, unit_price) VALUES ($1,$2,$3,$4,$5,$6,$7)`,
            [
              id,
              q.item_id,
              q.vendor_id,
              quantity,
              leadTime,
              isSelected,
              unitPrice,
            ],
          );
        }
      }
    }

<<<<<<< HEAD
    // After upserts, compute and set/update vendor quote_date
    try {
      // Vendors on this RFQ (need id, vendor_id, quote_date)
      const vendorsRes2 = await db.query(
        "SELECT id, vendor_id, quote_date FROM rfq_vendors WHERE rfq_id = $1",
        [id],
      );
      const rfqVendors = vendorsRes2.rows || [];

      // Get all item_ids for this RFQ to define completeness set
=======
    // Compute and set/update quoted_date for vendors
    try {
      // Get vendors on this RFQ (id, vendor_id, quoted_date)
      const vendorsRes = await db.query(
        "SELECT id, vendor_id, quoted_date FROM rfq_vendors WHERE rfq_id = $1",
        [id],
      );
      const rfqVendors = vendorsRes.rows || [];

      // Get all item_ids for this RFQ
>>>>>>> 90ec9e3 (Added updated routes for dashboards and summaries)
      const itemsRes2 = await db.query(
        "SELECT item_id FROM rfq_items WHERE rfq_id = $1",
        [id],
      );
      const itemIds = itemsRes2.rows.map((r) => r.item_id);

      for (const v of rfqVendors) {
<<<<<<< HEAD
        if (!itemIds || itemIds.length === 0) continue;
        // Count of items for which this vendor has both price and lead time
        const cntRes = await db.query(
          `SELECT COUNT(DISTINCT item_id) AS cnt
             FROM rfq_quotations
            WHERE rfq_id = $1
              AND vendor_id = $2
              AND item_id = ANY($3)
              AND unit_price IS NOT NULL
              AND lead_time IS NOT NULL`,
=======
        if (itemIds.length === 0) continue;
        // Count how many items have both price and lead time for this vendor
        const cntRes = await db.query(
          `SELECT COUNT(DISTINCT item_id) AS cnt
             FROM rfq_quotations
            WHERE rfq_id = $1 AND vendor_id = $2 AND unit_price IS NOT NULL AND lead_time IS NOT NULL
              AND item_id = ANY($3)`,
>>>>>>> 90ec9e3 (Added updated routes for dashboards and summaries)
          [id, v.vendor_id, itemIds],
        );
        const completeCount = Number(cntRes.rows?.[0]?.cnt || 0);
        const allComplete = completeCount === itemIds.length;

<<<<<<< HEAD
        if (v.quote_date == null && allComplete) {
          // First time vendor completed all items
          await db.query(
            `UPDATE rfq_vendors SET quote_date = NOW() WHERE id = $1`,
=======
        if (v.quoted_date == null && allComplete) {
          await db.query(
            `UPDATE rfq_vendors SET quoted_date = NOW() WHERE id = $1`,
>>>>>>> 90ec9e3 (Added updated routes for dashboards and summaries)
            [v.id],
          );
          continue;
        }

<<<<<<< HEAD
        if (v.quote_date != null && vendorChanged.get(v.vendor_id)) {
          // Vendor edited quotes after initial completion
          await db.query(
            `UPDATE rfq_vendors SET quote_date = NOW() WHERE id = $1`,
=======
        if (v.quoted_date != null && vendorChanged.get(v.vendor_id)) {
          await db.query(
            `UPDATE rfq_vendors SET quoted_date = NOW() WHERE id = $1`,
>>>>>>> 90ec9e3 (Added updated routes for dashboards and summaries)
            [v.id],
          );
        }
      }
<<<<<<< HEAD
    } catch (qdErr) {
      console.warn("Failed to compute/update quote_date:", qdErr.message);
=======
    } catch (e) {
      console.warn("Failed to update vendor quoted_date on RFQ PUT:", e.message);
>>>>>>> 90ec9e3 (Added updated routes for dashboards and summaries)
    }

    const result = await db.query(
      `SELECT r.*, u.username AS assignee_username, a.account_name AS account_name
                        FROM rfqs r
                        LEFT JOIN users u ON r.assignee = u.id
                        LEFT JOIN accounts a ON r.account_id = a.id
                        WHERE r.id = $1`,
      [updatedId],
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
      [id],
    );
    const items = itemsResult.rows;

    // For each item, get vendor quotes
    const itemsWithQuotes = await Promise.all(
      items.map(async (item) => {
        const quotesResult = await db.query(
          `SELECT q.*, v.name AS vendor_name, v.contact_person, v.phone, v.email, v.address
                 FROM rfq_quotations q
                 LEFT JOIN vendors v ON q.vendor_id = v.id
                 WHERE q.item_id = $1 AND q.rfq_id = $2
                 ORDER BY q.id ASC`,
          [item.item_id, id],
        );
        return {
          ...item,
          vendorQuotes: quotesResult.rows,
        };
      }),
    );
    return res.json(itemsWithQuotes);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Failed to fetch RFQ items" });
  }
});

// Get vendors associated with an RFQ
// Create RFQ items
router.post("/:id/items", async (req, res) => {
  try {
    const { id } = req.params;
    const itemsRaw = Array.isArray(req.body) ? req.body : [req.body];
    const items = itemsRaw.map(toSnake);
    // Fetch existing items
    const existingRes = await db.query(
      "SELECT * FROM rfq_items WHERE rfq_id = $1",
      [id],
    );
    const existing = existingRes.rows;
    const existingIds = new Set(existing.map((i) => i.id));
    const incomingIds = new Set(items.filter((i) => i.id).map((i) => i.id));

    // Delete items not in incoming
    for (const ex of existing) {
      if (!incomingIds.has(ex.id)) {
        await db.query("DELETE FROM rfq_items WHERE id = $1", [ex.id]);
      }
    }

  const upserted = [];
    for (const item of items) {
      if (item.id && existingIds.has(item.id)) {
        // Update
        const result = await db.query(
          `UPDATE rfq_items SET description=$1, brand=$2, part_number=$3, quantity=$4, unit=$5, lead_time=$6, unit_price=$7, amount=$8 WHERE id=$9 RETURNING *`,
          [
            item.description,
            item.brand,
            item.part_number,
            item.quantity,
            item.unit,
            item.lead_time,
            item.unit_price,
            item.amount,
            item.id,
          ],
        );
        upserted.push(result.rows[0]);
      } else {
        // Insert
        const result = await db.query(
          `INSERT INTO rfq_items (rfq_id, description, brand, part_number, quantity, unit, lead_time, unit_price, amount)
                     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
          [
            id,
            item.description,
            item.brand,
            item.part_number,
            item.quantity,
            item.unit,
            item.lead_time,
            item.unit_price,
            item.amount,
          ],
        );
        upserted.push(result.rows[0]);
      }
    }
    return res.status(201).json(upserted);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Failed to save RFQ items" });
  }
});

// Create RFQ vendors
router.post("/:id/vendors", async (req, res) => {
  try {
    const { id } = req.params;
    const vendorsRaw = Array.isArray(req.body) ? req.body : [req.body];
    const vendors = vendorsRaw.map(toSnake);
    // Fetch existing vendors
    const existingRes = await db.query(
      "SELECT * FROM rfq_vendors WHERE rfq_id = $1",
      [id],
    );
    const existing = existingRes.rows;
    const existingIds = new Set(existing.map((v) => v.id));
    const incomingIds = new Set(vendors.filter((v) => v.id).map((v) => v.id));

    // Delete vendors not in incoming
    for (const ex of existing) {
      if (!incomingIds.has(ex.id)) {
        await db.query("DELETE FROM rfq_vendors WHERE id = $1", [ex.id]);
      }
    }

    const upserted = [];
    for (const vendor of vendors) {
      if (vendor.id && existingIds.has(vendor.id)) {
        // Update
        const result = await db.query(
<<<<<<< HEAD
          `UPDATE rfq_vendors SET vendor_id=$1, contact_person=$2, status=$3, quote_date=$4, subtotal=$5, vat=$6, grand_total=$7, notes=$8 WHERE id=$9 RETURNING *`,
=======
          `UPDATE rfq_vendors SET vendor_id=$1, contact_person=$2, status=$3, quoted_date=$4, grand_total=$5, notes=$6 WHERE id=$7 RETURNING *`,
>>>>>>> 90ec9e3 (Added updated routes for dashboards and summaries)
          [
            vendor.vendor_id,
            vendor.contact_person,
            vendor.status,
<<<<<<< HEAD
            vendor.quote_date,
            vendor.subtotal,
            vendor.vat,
=======
            vendor.quoted_date,
>>>>>>> 90ec9e3 (Added updated routes for dashboards and summaries)
            vendor.grand_total,
            vendor.notes,
            vendor.id,
          ],
        );
        upserted.push(result.rows[0]);
      } else {
        // Insert
        const result = await db.query(
<<<<<<< HEAD
          `INSERT INTO rfq_vendors (rfq_id, vendor_id, contact_person, status, quote_date, subtotal, vat, grand_total, notes)
            VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
=======
          `INSERT INTO rfq_vendors (rfq_id, vendor_id, contact_person, status, quoted_date, grand_total, notes)
                     VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
>>>>>>> 90ec9e3 (Added updated routes for dashboards and summaries)
          [
            id,
            vendor.vendor_id,
            vendor.contact_person,
            vendor.status,
<<<<<<< HEAD
            vendor.quote_date,
            vendor.subtotal,
            vendor.vat,
=======
            vendor.quoted_date,
>>>>>>> 90ec9e3 (Added updated routes for dashboards and summaries)
            vendor.grand_total,
            vendor.notes,
          ],
        );
        upserted.push(result.rows[0]);
      }
    }
    return res.status(201).json(upserted);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Failed to save RFQ vendors" });
  }
});

// Create RFQ item vendor quotes
router.post("/:id/item-quotes", async (req, res) => {
  try {
    const { id } = req.params;
    const quotesRaw = Array.isArray(req.body) ? req.body : [req.body];
    const quotes = quotesRaw.map(toSnake);
    // Track vendor changes within this request (unit_price or lead_time changes)
    const vendorChanged = new Map(); // key: vendor_id, value: boolean
    // Fetch existing quotes for items in this RFQ
    // Get all item ids for this RFQ
    const itemsRes = await db.query(
      "SELECT id FROM rfq_items WHERE rfq_id = $1",
      [id],
    );
    const itemIds = itemsRes.rows.map((r) => r.id);
    const existingRes = await db.query(
      "SELECT * FROM rfq_item_vendor_quotes WHERE rfq_item_id = ANY($1)",
      [itemIds],
    );
    const existing = existingRes.rows;
    const existingIds = new Set(existing.map((q) => q.id));
    const incomingIds = new Set(quotes.filter((q) => q.id).map((q) => q.id));

    // Delete quotes not in incoming
    for (const ex of existing) {
      if (!incomingIds.has(ex.id)) {
        await db.query("DELETE FROM rfq_item_vendor_quotes WHERE id = $1", [
          ex.id,
        ]);
      }
    }

    const upserted = [];
    for (const quote of quotes) {
      if (quote.id && existingIds.has(quote.id)) {
        // Update
        // Check pre-update values to detect changes
        try {
          const prev = existing.find((q) => q.id === quote.id);
          const prevUnit = prev ? prev.unit_price : null;
          const prevLead = prev ? prev.lead_time : null;
          const newUnit = quote.unit_price === "" ? null : quote.unit_price;
          const newLead = quote.lead_time === "" ? null : quote.lead_time;
          if (prevUnit !== newUnit || prevLead !== newLead) {
            vendorChanged.set(quote.vendor_id, true);
          }
        } catch {
          // ignore read of previous values
        }
        const result = await db.query(
          `UPDATE rfq_item_vendor_quotes SET vendor_id=$1, unit_price=$2, total=$3, lead_time=$4, lead_time_color=$5, quote_date=$6, status=$7, notes=$8 WHERE id=$9 RETURNING *`,
          [
            quote.vendor_id,
            quote.unit_price,
            quote.total,
            quote.lead_time,
            quote.lead_time_color,
            quote.quote_date,
            quote.status,
            quote.notes,
            quote.id,
          ],
        );
        upserted.push(result.rows[0]);
      } else {
        // Insert
        // Treat insertion of either unit_price or lead_time as a change
        if (quote.vendor_id && (quote.unit_price != null || quote.lead_time != null)) {
          vendorChanged.set(quote.vendor_id, true);
        }
        const result = await db.query(
          `INSERT INTO rfq_item_vendor_quotes (rfq_item_id, vendor_id, unit_price, total, lead_time, lead_time_color, quote_date, status, notes)
                     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
          [
            quote.rfq_item_id,
            quote.vendor_id,
            quote.unit_price,
            quote.total,
            quote.lead_time,
            quote.lead_time_color,
            quote.quote_date,
            quote.status,
            quote.notes,
          ],
        );
        upserted.push(result.rows[0]);
      }
    }

    // After upserting quotes, compute quoted_date per vendor according to rules
    try {
      // Get all vendors on this RFQ
      const vendorsRes2 = await db.query(
        "SELECT id, vendor_id, quoted_date FROM rfq_vendors WHERE rfq_id = $1",
        [id],
      );
      const rfqVendors = vendorsRes2.rows || [];

      for (const v of rfqVendors) {
        // Get all items for this RFQ
        const itemsRes2 = await db.query(
          "SELECT id FROM rfq_items WHERE rfq_id = $1",
          [id],
        );
        const itemIds2 = itemsRes2.rows.map((r) => r.id);

        if (itemIds2.length === 0) continue;

        // Load all quotes for this vendor across the RFQ items
        const qRes2 = await db.query(
          `SELECT rfq_item_id, unit_price, lead_time FROM rfq_item_vendor_quotes WHERE vendor_id = $1 AND rfq_item_id = ANY($2)`,
          [v.vendor_id, itemIds2],
        );
        const qRows = qRes2.rows || [];

        // Rule A: If quoted_date is null and ALL items for this RFQ have both lead_time and unit_price for this vendor -> set quoted_date = now()
        const itemsQuotedCount = qRows.filter(
          (r) => r.lead_time != null && r.unit_price != null,
        ).length;
        const allItemsHaveQuotes = itemsQuotedCount === itemIds2.length;

        if (v.quoted_date == null && allItemsHaveQuotes) {
          await db.query(
            `UPDATE rfq_vendors SET quoted_date = NOW() WHERE id = $1`,
            [v.id],
          );
          continue;
        }

        // Rule B: If quoted_date already set, and we detected a change for this vendor during upsert -> update quoted_date = now()
        if (v.quoted_date != null && vendorChanged.get(v.vendor_id)) {
          await db.query(
            `UPDATE rfq_vendors SET quoted_date = NOW() WHERE id = $1`,
            [v.id],
          );
        }
      }
    } catch (qdErr) {
      console.warn("Failed to compute/update quoted_date:", qdErr.message);
    }
    return res.status(201).json(upserted);
  } catch (err) {
    console.error(err);
    return res
      .status(500)
      .json({ error: "Failed to save RFQ item vendor quotes" });
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
      [id],
    );
    return res.json(result.rows);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Failed to fetch RFQ vendors" });
  }
});

export default router;
