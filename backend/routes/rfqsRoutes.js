import express from "express";
import { sql, crmPoolPromise } from "../mssql.js";
import { getStocksByIds, getStockDetailsByStockIds, getVendorsByIds } from "../mssqlClient.js";
import { toSnake } from "../helper/utils.js";

const router = express.Router();

// Get all RFQs
router.get("/", async (req, res) => {
  try {
    const pool = await crmPoolPromise;
    const q = `SELECT r.*, u.username AS assignee_username, sl.sl_number AS sl_number, a.account_name AS account_name
      FROM crmdb.rfqs r
      LEFT JOIN crmdb.users u ON r.assignee = u.id
      LEFT JOIN crmdb.sales_leads sl ON r.sl_id = sl.id
      LEFT JOIN crmdb.accounts a ON r.account_id = a.id
      ORDER BY r.id ASC`;
    const result = await pool.request().query(q);
    return res.json(toSnake(result.recordset || []));
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Failed to fetch RFQs" });
  }
});

// Get all vendors
router.get("/vendors", async (req, res) => {
  try {
    const pool = await crmPoolPromise;
    const result = await pool.request().query('SELECT * FROM crmdb.vendors ORDER BY id ASC');
    return res.json(toSnake(result.recordset || []));
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Failed to fetch vendors" });
  }
});

// Get single RFQ
router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const pool = await crmPoolPromise;
    const q = `SELECT r.*, u.username AS assignee_username, sl.sl_number AS sl_number, a.account_name AS account_name
      FROM crmdb.rfqs r
      LEFT JOIN crmdb.users u ON r.assignee = u.id
      LEFT JOIN crmdb.sales_leads sl ON r.sl_id = sl.id
      LEFT JOIN crmdb.accounts a ON r.account_id = a.id
      WHERE r.id = @id`;
    const result = await pool.request().input('id', sql.Int, parseInt(id, 10)).query(q);
    if ((result.recordset || []).length === 0) return res.status(404).json({ error: 'Not found' });
    const rfq = toSnake(result.recordset[0]);

    // Get items with local rfq_items table
  const itemsRes = await pool.request().input('id', sql.Int, parseInt(id, 10)).query('SELECT * FROM crmdb.rfq_items WHERE rfq_id = @id ORDER BY id ASC');
  const items = itemsRes.recordset || [];
    // Enrich items with MSSQL stock info when item.item_id refers to stock id
    const stockIds = items.map(it => it.item_id).filter(Boolean);
    const stocks = await getStocksByIds(stockIds);
    const stockDetails = await getStockDetailsByStockIds(stockIds);
    const enrichedItems = items.map(item => {
      const stock = stocks.find(s => String(s.Id) === String(item.item_id)) || null;
      const details = stockDetails.filter(d => String(d.Stock_Id) === String(item.item_id));
      return { ...item, stock, stockDetails: details };
    });

    // Get RFQ vendors from local table, then enrich with MSSQL vendor data
  const vendorsRes = await pool.request().input('id', sql.Int, parseInt(id, 10)).query('SELECT * FROM crmdb.rfq_vendors WHERE rfq_id = @id ORDER BY id ASC');
  const rfqVendors = vendorsRes.recordset || [];
    const vendorIds = rfqVendors.map(v => v.vendor_id).filter(Boolean);
    const vendorRecords = await getVendorsByIds(vendorIds);
    const vendors = rfqVendors.map(rv => ({ ...rv, vendor: vendorRecords.find(v => v.Id === rv.vendor_id) || null, quotes: [] }));

    // Get quotations with item and vendor details
    const quotationsRes = await pool.request().input('id', sql.Int, parseInt(id, 10)).query('SELECT q.* FROM crmdb.rfq_quotations q WHERE q.rfq_id = @id ORDER BY q.id ASC');
    const quotations = quotationsRes.recordset || [];
    console.log("Fetched RFQ quotations:", quotations);

    // Map quotations to vendors
    // Map quotations to rfq vendor objects (matching by vendor_id)
    vendors.forEach(vendor => {
      vendor.quotes = quotations.filter(q => q.vendor_id === vendor.vendor_id);
    });

    // Set price & leadTime for items based on selected quote
    const finalItems = enrichedItems.map(item => {
      const selectedQuote = quotations.find(q => q.item_id === item.item_id && q.is_selected);
      if (selectedQuote) {
        return {
          ...item,
          unitPrice: selectedQuote.unit_price,
          leadTime: selectedQuote.lead_time
        };
      }
      return item;
    });

    console.log("Final items with prices and lead times:", items);
    console.log("Final vendors", vendors);
    vendors.forEach((v) => console.log("Vendor", v.vendorId, "with quotes:", v.quotes));

  rfq.items = finalItems;
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
  const pool = await crmPoolPromise;
  const transaction = pool.transaction();
  try {
    await transaction.begin();
    console.log("Creating new RFQ with data:", req.body);
    const body = toSnake(req.body);
    const { wo_id, assignee, due_date, account_id, stage_status, created_by, items } = body;

    const currentYear = new Date().getFullYear();
    const tr = transaction.request();
    const result = await tr.input('like', sql.NVarChar, `RFQ-${currentYear}-%`).query(`SELECT TOP (1) rfq_number FROM crmdb.rfqs WHERE rfq_number LIKE @like ORDER BY rfq_number DESC`);

    let newCounter = 1;
    const lastRow = (result.recordset || [])[0];
    if (lastRow) {
      const lastRfqNumber = lastRow.rfq_number || lastRow.rfqNumber || '';
      const lastCounter = parseInt((lastRfqNumber.split("-")[2] || '0'), 10) || 0;
      newCounter = lastCounter + 1;
    }

    const rfq_number = `RFQ-${currentYear}-${String(newCounter).padStart(4, "0")}`;

    let sl_id = null;
    const slRes = await tr.input('wo', sql.Int, parseInt(wo_id, 10)).query('SELECT TOP (1) id FROM crmdb.sales_leads WHERE wo_id = @wo');
    if ((slRes.recordset || []).length > 0) sl_id = slRes.recordset[0].id;

    // Insert RFQ within transaction
    tr.input('wo_id', sql.Int, wo_id == null ? null : parseInt(wo_id, 10));
    tr.input('assignee', sql.Int, assignee == null ? null : parseInt(assignee, 10));
    tr.input('rfq_number', sql.NVarChar, rfq_number);
    tr.input('stage_status', sql.NVarChar, stage_status || 'Draft');
    tr.input('due_date', sql.Date, due_date || null);
    tr.input('sl_id', sql.Int, sl_id == null ? null : parseInt(sl_id, 10));
    tr.input('account_id', sql.Int, account_id == null ? null : parseInt(account_id, 10));
    tr.input('created_by', sql.NVarChar, created_by || assignee || null);
    const insertResult = await tr.query(`INSERT INTO crmdb.rfqs (wo_id, assignee, rfq_number, stage_status, due_date, sl_id, account_id, created_at, created_by, updated_at)
      OUTPUT INSERTED.id
      VALUES (@wo_id, @assignee, @rfq_number, @stage_status, @due_date, @sl_id, @account_id, SYSUTCDATETIME(), @created_by, SYSUTCDATETIME())`);
    const newId = (insertResult.recordset || [])[0].id;

    // Upsert RFQ items within transaction
    if (items && Array.isArray(items)) {
      for (const item of items) {
        const itemExternalId = item.item_external_id || item.itemExternalId || item.item?.stock?.Id || null;
        try {
          const r = transaction.request();
          r.input('rfq_id', sql.Int, newId);
          r.input('item_id', sql.Int, item.itemId == null ? null : parseInt(item.itemId, 10));
          r.input('item_external_id', sql.NVarChar, itemExternalId || null);
          r.input('quantity', sql.Int, item.quantity == null ? null : parseInt(item.quantity, 10));
          r.input('unit_price', sql.Decimal(18,2), item.unitPrice == null ? null : item.unitPrice);
          await r.query('INSERT INTO crmdb.rfq_items (rfq_id, item_id, item_external_id, quantity, unit_price) OUTPUT INSERTED.id VALUES (@rfq_id, @item_id, @item_external_id, @quantity, @unit_price)');
        } catch (e) {
          console.error('Failed inserting rfq_item', e);
          await transaction.rollback();
          return res.status(500).json({ error: 'Failed inserting rfq_item' });
        }
      }
    }

    // Create workflow stage for new RFQ
    await tr.input('wo_id', sql.Int, wo_id == null ? null : parseInt(wo_id, 10)).input('stage_name', sql.NVarChar, 'RFQ').input('status', sql.NVarChar, 'Draft').input('assigned_to', sql.Int, assignee == null ? null : parseInt(assignee, 10)).query('INSERT INTO crmdb.workflow_stages (wo_id, stage_name, status, assigned_to, created_at, updated_at) VALUES (@wo_id, @stage_name, @status, @assigned_to, SYSUTCDATETIME(), SYSUTCDATETIME())');

    await transaction.commit();
    const final = await pool.request().input('id', sql.Int, newId).query(`SELECT r.*, u.username AS assignee_username, a.account_name AS account_name
       FROM crmdb.rfqs r
       LEFT JOIN crmdb.users u ON r.assignee = u.id
       LEFT JOIN crmdb.accounts a ON r.account_id = a.id
       WHERE r.id = @id`);
    return res.status(201).json(toSnake((final.recordset || [])[0] || {}));
  } catch (err) {
    console.error(err);
    try { await transaction.rollback(); } catch (e) { console.error('Rollback failed', e); }
    return res.status(500).json({ error: "Failed to create RFQ" });
  }
});

// Update existing RFQ
router.put("/:id", async (req, res) => {
  const pool = await crmPoolPromise;
  let transaction;
  try {
    const { id } = req.params;
    transaction = pool.transaction();
    await transaction.begin();
    console.log("reqBody:", JSON.stringify(req.body, null, 5));
    const body = toSnake(req.body);
    console.log("Updating RFQ ID:", id, "with data:", JSON.stringify(body, null, 5));
    // Add all fields you want to update here
    const tr = transaction.request();
    tr.input('wo_id', sql.Int, body.wo_id == null ? null : parseInt(body.wo_id, 10));
    tr.input('assignee', sql.Int, body.assignee == null ? null : parseInt(body.assignee, 10));
    tr.input('rfq_number', sql.NVarChar, body.rfq_number || null);
    tr.input('due_date', sql.Date, body.due_date || null);
    tr.input('description', sql.NVarChar, body.description || null);
    tr.input('sl_id', sql.Int, body.sl_id == null ? null : parseInt(body.sl_id, 10));
    tr.input('account_id', sql.Int, body.account_id == null ? null : parseInt(body.account_id, 10));
    tr.input('payment_terms', sql.NVarChar, body.payment_terms || null);
    tr.input('notes', sql.NVarChar, body.notes || null);
    tr.input('subtotal', sql.Decimal(18,2), body.subtotal == null ? null : body.subtotal);
    tr.input('vat', sql.Decimal(18,2), body.vat == null ? null : body.vat);
    tr.input('grand_total', sql.Decimal(18,2), body.grand_total == null ? null : body.grand_total);
    tr.input('created_at', sql.DateTime, body.created_at || null);
    tr.input('updated_by', sql.NVarChar, body.created_by || null);
    tr.input('id', sql.Int, parseInt(id, 10));
    const updateResult = await tr.query(`UPDATE crmdb.rfqs SET wo_id=@wo_id, assignee=@assignee, rfq_number=@rfq_number, due_date=@due_date, description=@description, sl_id=@sl_id, account_id=@account_id, payment_terms=@payment_terms, notes=@notes, subtotal=@subtotal, vat=@vat, grand_total=@grand_total, created_at=@created_at, updated_by=@updated_by, updated_at=SYSUTCDATETIME() OUTPUT INSERTED.id WHERE id=@id`);
    const updatedId = (updateResult.recordset || [])[0].id;

    // Upsert RFQ items
    if (body.items && Array.isArray(body.items)) {
      // Delete items not in incoming
      const existingRes = await tr.input('id', sql.Int, parseInt(id, 10)).query('SELECT * FROM crmdb.rfq_items WHERE rfq_id = @id');
      const existing = toSnake(existingRes.recordset || []);
      const existingIds = new Set(existing.map(i => i.item_id));
      const incomingIds = new Set(body.items.filter(i => i.item_id).map(i => i.item_id));
      for (const ex of existing) {
        if (!incomingIds.has(ex.item_id)) {
          await tr.input('item_id', sql.Int, ex.item_id).input('id', sql.Int, parseInt(id, 10)).query('DELETE FROM crmdb.rfq_items WHERE item_id = @item_id AND rfq_id = @id');
        }
      }
      for (const item of body.items) {
        // Normalize item id: accept item_id, itemId, or nested MSSQL stock Id (item.stock?.Id)
        const itemId = item.item_id || item.itemId || item.item?.item_id || item.item?.stock?.Id || item.item?.Id || null;
        const itemExternalId = item.item_external_id || item.itemExternalId || item.item?.stock?.Id || item.item?.externalId || null;
        const unitPrice = item.unit_price === "" ? null : (item.unit_price ?? item.unitPrice ?? null);
        const quantity = item.quantity === "" ? null : (item.quantity ?? null);
        if (itemId && existingIds.has(itemId)) {
          await tr.input('item_id', sql.Int, itemId).input('item_external_id', sql.NVarChar, itemExternalId || null).input('quantity', sql.Int, quantity == null ? null : parseInt(quantity, 10)).input('unit_price', sql.Decimal(18,2), unitPrice == null ? null : unitPrice).input('id', sql.Int, parseInt(id, 10)).query('UPDATE crmdb.rfq_items SET item_id=@item_id, item_external_id=@item_external_id, quantity=@quantity, unit_price=@unit_price WHERE item_id=@item_id AND rfq_id=@id');
        } else {
          await tr.input('rfq_id', sql.Int, parseInt(id, 10)).input('item_id', sql.Int, itemId == null ? null : parseInt(itemId, 10)).input('item_external_id', sql.NVarChar, itemExternalId || null).input('quantity', sql.Int, quantity == null ? null : parseInt(quantity, 10)).input('unit_price', sql.Decimal(18,2), unitPrice == null ? null : unitPrice).query('INSERT INTO crmdb.rfq_items (rfq_id, item_id, item_external_id, quantity, unit_price) OUTPUT INSERTED.* VALUES (@rfq_id, @item_id, @item_external_id, @quantity, @unit_price)');
        }
      }
    }

    // Upsert RFQ vendors
    if (body.vendors && Array.isArray(body.vendors)) {
      const existingRes = await tr.input('id', sql.Int, parseInt(id, 10)).query('SELECT * FROM crmdb.rfq_vendors WHERE rfq_id = @id');
      const existing = toSnake(existingRes.recordset || []);
      const existingIds = new Set(existing.map(v => v.vendor_id));
      const incomingIds = new Set(body.vendors.filter(v => v.vendor_id).map(v => v.vendor_id));
      for (const ex of existing) {
        if (!incomingIds.has(ex.vendor_id)) {
          await pool.request().input('vendor_id', sql.Int, ex.vendor_id).input('id', sql.Int, parseInt(id, 10)).query('DELETE FROM crmdb.rfq_vendors WHERE vendor_id = @vendor_id AND rfq_id = @id');
        }
      }
      for (const vendor of body.vendors) {
        // Normalize vendor id coming from MSSQL or frontend shapes
  const incomingVendorId = vendor.vendor_id || vendor.vendorId || vendor.vendor?.Id || vendor.id || null;
  const vendorExternalId = vendor.vendor_external_id || vendor.vendorExternalId || vendor.vendor?.Id || vendor.id || null;
  const validUntil = vendor.validUntil === "" ? null : (vendor.validUntil || vendor.valid_until || null);
  const paymentTerms = vendor.paymentTerms === "" ? null : (vendor.paymentTerms || vendor.payment_terms || null);
  const notes = vendor.notes === "" ? null : (vendor.notes || null);
        if (incomingVendorId && existingIds.has(incomingVendorId)) {
          await pool.request().input('vendor_id', sql.Int, incomingVendorId).input('vendor_external_id', sql.NVarChar, vendorExternalId || null).input('valid_until', sql.Date, validUntil || null).input('payment_terms', sql.NVarChar, paymentTerms || null).input('notes', sql.NVarChar, notes || null).input('id', sql.Int, parseInt(id, 10)).query('UPDATE crmdb.rfq_vendors SET vendor_id=@vendor_id, vendor_external_id=@vendor_external_id, valid_until=@valid_until, payment_terms=@payment_terms, notes=@notes WHERE vendor_id=@vendor_id AND rfq_id=@id');
        } else {
          await pool.request().input('rfq_id', sql.Int, parseInt(id, 10)).input('vendor_id', sql.Int, incomingVendorId == null ? null : parseInt(incomingVendorId, 10)).input('vendor_external_id', sql.NVarChar, vendorExternalId || null).input('valid_until', sql.Date, validUntil || null).input('payment_terms', sql.NVarChar, paymentTerms || null).input('notes', sql.NVarChar, notes || null).query('INSERT INTO crmdb.rfq_vendors (rfq_id, vendor_id, vendor_external_id, valid_until, payment_terms, notes) VALUES (@rfq_id, @vendor_id, @vendor_external_id, @valid_until, @payment_terms, @notes)');
        }
      }
    }

    // Flatten vendor quotes arrays into a single quotations array and normalize ids
    let allQuotations = [];
    if (body.vendors && Array.isArray(body.vendors)) {
      body.vendors.forEach(vendor => {
        if (Array.isArray(vendor.quotes)) {
          // Some quotes may reference nested vendor or item objects. Normalize them here.
          vendor.quotes.forEach(q => {
            const normalized = {
              ...q,
              vendor_id: q.vendor_id || q.vendorId || q.vendor?.Id || vendor.vendor_id || vendor.vendorId || vendor.vendor?.Id || q.vendor?.vendorId || q.vendor?.id || null,
              vendor_external_id: q.vendor_external_id || q.vendorExternalId || q.vendor?.Id || null,
              item_id: q.item_id || q.itemId || q.item?.item_id || q.item?.itemId || q.item?.Id || q.itemId || q.item_id || null,
              item_external_id: q.item_external_id || q.itemExternalId || q.item?.stock?.Id || q.item?.externalId || null,
              quantity: q.quantity ?? q.qty ?? null,
              lead_time: q.lead_time ?? q.leadTime ?? null,
              unit_price: q.unit_price ?? q.unitPrice ?? null,
              is_selected: q.is_selected ?? q.isSelected ?? false,
              rfq_id: q.rfq_id || q.rfqId || id,
            };
            allQuotations.push(normalized);
          });
        }
      });
    }
    console.log("quotations", allQuotations);
    if (allQuotations.length > 0) {
      const existingRes = await tr.input('id', sql.Int, parseInt(id, 10)).query('SELECT * FROM crmdb.rfq_quotations WHERE rfq_id = @id');
      const existing = toSnake(existingRes.recordset || []);
      // Use a combination of vendor_id, item_id, and rfq_id to identify unique quotations
      const existingIds = new Set(existing.map(q => `${q.vendor_id}-${q.item_id}-${q.rfq_id}`));
      const incomingIds = new Set(allQuotations.filter(q => `${q.vendor_id}-${q.item_id}-${q.rfq_id}`).map(q => `${q.vendor_id}-${q.item_id}-${q.rfq_id}`));
      for (const ex of existing) {
        if (!incomingIds.has(`${ex.vendor_id}-${ex.item_id}-${ex.rfq_id}`)) {
          await tr.input('item_id', sql.Int, ex.item_id).input('vendor_id', sql.Int, ex.vendor_id).input('rfq_id', sql.Int, ex.rfq_id).query('DELETE FROM crmdb.rfq_quotations WHERE item_id = @item_id AND vendor_id = @vendor_id AND rfq_id = @rfq_id');
        }
      }
      for (const q of allQuotations) {
        const quantity = q.quantity === "" ? null : q.quantity;
        const leadTime = q.lead_time === "" ? null : q.lead_time;
        const unitPrice = q.unit_price === "" ? null : q.unit_price;
        const isSelected = q.is_selected === "" ? null : q.is_selected;
        const vendorId = q.vendor_id || q.vendorId || q.vendor?.Id || null;
        const vendorExternalId = q.vendor_external_id || q.vendorExternalId || q.vendor?.Id || null;
        const itemId = q.item_id || q.itemId || null;
        const itemExternalId = q.item_external_id || q.itemExternalId || null;
        if (existingIds.has(`${vendorId}-${itemId}-${q.rfq_id}`)) {
          await tr.input('item_id', sql.Int, itemId == null ? null : parseInt(itemId, 10)).input('item_external_id', sql.NVarChar, itemExternalId || null).input('vendor_id', sql.Int, vendorId == null ? null : parseInt(vendorId, 10)).input('vendor_external_id', sql.NVarChar, vendorExternalId || null).input('quantity', sql.Int, quantity == null ? null : parseInt(quantity, 10)).input('lead_time', sql.NVarChar, leadTime || null).input('is_selected', sql.Bit, isSelected ? 1 : 0).input('unit_price', sql.Decimal(18,2), unitPrice == null ? null : unitPrice).input('id', sql.Int, parseInt(id, 10)).query('UPDATE crmdb.rfq_quotations SET item_id=@item_id, item_external_id=@item_external_id, vendor_id=@vendor_id, vendor_external_id=@vendor_external_id, quantity=@quantity, lead_time=@lead_time, is_selected=@is_selected, unit_price=@unit_price WHERE item_id=@item_id AND vendor_id=@vendor_id AND rfq_id=@id');
        } else {
          await tr.input('rfq_id', sql.Int, parseInt(id, 10)).input('item_id', sql.Int, itemId == null ? null : parseInt(itemId, 10)).input('item_external_id', sql.NVarChar, itemExternalId || null).input('vendor_id', sql.Int, vendorId == null ? null : parseInt(vendorId, 10)).input('vendor_external_id', sql.NVarChar, vendorExternalId || null).input('quantity', sql.Int, quantity == null ? null : parseInt(quantity, 10)).input('lead_time', sql.NVarChar, leadTime || null).input('is_selected', sql.Bit, isSelected ? 1 : 0).input('unit_price', sql.Decimal(18,2), unitPrice == null ? null : unitPrice).query('INSERT INTO crmdb.rfq_quotations (rfq_id, item_id, item_external_id, vendor_id, vendor_external_id, quantity, lead_time, is_selected, unit_price) VALUES (@rfq_id, @item_id, @item_external_id, @vendor_id, @vendor_external_id, @quantity, @lead_time, @is_selected, @unit_price)');
        }
      }
    }

    await transaction.commit();
    const result = await pool.request().input('id', sql.Int, updatedId).query(`SELECT r.*, u.username AS assignee_username, a.account_name AS account_name FROM crmdb.rfqs r LEFT JOIN crmdb.users u ON r.assignee = u.id LEFT JOIN crmdb.accounts a ON r.account_id = a.id WHERE r.id = @id`);
    if (((result.recordset || []).length) === 0) {
      return res.status(404).json({ error: 'Not found' });
    }
    return res.json(toSnake(result.recordset[0]));
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Failed to update RFQ" });
  }
});

// Get items associated with an RFQ
router.get("/:id/items", async (req, res) => {
  try {
    const { id } = req.params;
    const pool = await crmPoolPromise;
    // Get items and their vendor quotes
    const itemsResult = await pool.request().input('id', sql.Int, parseInt(id, 10)).query('SELECT * FROM crmdb.rfq_items WHERE rfq_id = @id ORDER BY id ASC');
    const items = itemsResult.recordset || [];

    // Fetch all quotations for this RFQ and enrich vendor info from MSSQL
    const quotationsRes = await pool.request().input('id', sql.Int, parseInt(id, 10)).query('SELECT q.* FROM crmdb.rfq_quotations q WHERE q.rfq_id = @id ORDER BY q.id ASC');
    const quotations = quotationsRes.recordset || [];

    // Batch fetch MSSQL vendor records referenced by quotations
    const vendorIds = [...new Set(quotations.map(q => q.vendor_id).filter(Boolean))];
    const vendorRecords = vendorIds.length > 0 ? await getVendorsByIds(vendorIds) : [];
    const vendorMap = new Map((vendorRecords || []).map(v => [v.Id, v]));

    const itemsWithQuotes = items.map(item => {
      const quotesForItem = quotations
        .filter(q => q.item_id === item.item_id)
        .map(q => ({ ...q, vendor: vendorMap.get(q.vendor_id) || null }));
      return { ...item, vendorQuotes: quotesForItem };
    });

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
    const pool = await crmPoolPromise;
    const { id } = req.params;
    const itemsRaw = Array.isArray(req.body) ? req.body : [req.body];
    const items = itemsRaw.map(toSnake);
    // Fetch existing items
    const existingRes = await pool.request().input('id', sql.Int, parseInt(id, 10)).query('SELECT * FROM crmdb.rfq_items WHERE rfq_id = @id');
    const existing = existingRes.recordset || [];
    const existingIds = new Set(existing.map(i => i.id));
    const incomingIds = new Set(items.filter(i => i.id).map(i => i.id));

    // Delete items not in incoming
    for (const ex of existing) {
      if (!incomingIds.has(ex.id)) {
        await pool.request().input('id', sql.Int, ex.id).query('DELETE FROM crmdb.rfq_items WHERE id = @id');
      }
    }

    const upserted = [];
    for (const item of items) {
        if (item.id && existingIds.has(item.id)) {
        // Update
        const r = await pool.request().input('description', sql.NVarChar, item.description || null).input('brand', sql.NVarChar, item.brand || null).input('part_number', sql.NVarChar, item.part_number || null).input('quantity', sql.Int, item.quantity == null ? null : parseInt(item.quantity, 10)).input('unit', sql.NVarChar, item.unit || null).input('lead_time', sql.NVarChar, item.lead_time || null).input('unit_price', sql.Decimal(18,2), item.unit_price == null ? null : item.unit_price).input('amount', sql.Decimal(18,2), item.amount == null ? null : item.amount).input('id', sql.Int, item.id).query('UPDATE crmdb.rfq_items SET description=@description, brand=@brand, part_number=@part_number, quantity=@quantity, unit=@unit, lead_time=@lead_time, unit_price=@unit_price, amount=@amount WHERE id=@id; SELECT * FROM crmdb.rfq_items WHERE id=@id');
        upserted.push(toSnake((r.recordset || [])[0] || {}));
      } else {
        // Insert
        const ins = await pool.request().input('rfq_id', sql.Int, parseInt(id, 10)).input('description', sql.NVarChar, item.description || null).input('brand', sql.NVarChar, item.brand || null).input('part_number', sql.NVarChar, item.part_number || null).input('quantity', sql.Int, item.quantity == null ? null : parseInt(item.quantity, 10)).input('unit', sql.NVarChar, item.unit || null).input('lead_time', sql.NVarChar, item.lead_time || null).input('unit_price', sql.Decimal(18,2), item.unit_price == null ? null : item.unit_price).input('amount', sql.Decimal(18,2), item.amount == null ? null : item.amount).input('item_external_id', sql.NVarChar, item.item_external_id || item.itemExternalId || null).query('INSERT INTO crmdb.rfq_items (rfq_id, description, brand, part_number, quantity, unit, lead_time, unit_price, amount, item_external_id) OUTPUT INSERTED.* VALUES (@rfq_id, @description, @brand, @part_number, @quantity, @unit, @lead_time, @unit_price, @amount, @item_external_id)');
        upserted.push(toSnake((ins.recordset || [])[0] || {}));
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
    const pool = await crmPoolPromise;
    const { id } = req.params;
    const vendorsRaw = Array.isArray(req.body) ? req.body : [req.body];
    const vendors = vendorsRaw.map(toSnake);
    // Fetch existing vendors
    const existingRes = await pool.request().input('id', sql.Int, parseInt(id, 10)).query('SELECT * FROM crmdb.rfq_vendors WHERE rfq_id = @id');
    const existing = existingRes.recordset || [];
    const existingIds = new Set(existing.map(v => v.id));
    const incomingIds = new Set(vendors.filter(v => v.id).map(v => v.id));

    // Delete vendors not in incoming
    for (const ex of existing) {
      if (!incomingIds.has(ex.id)) {
        await pool.request().input('id', sql.Int, ex.id).query('DELETE FROM crmdb.rfq_vendors WHERE id = @id');
      }
    }

    const upserted = [];
    for (const vendor of vendors) {
        if (vendor.id && existingIds.has(vendor.id)) {
        // Update
        const r = await pool.request().input('vendor_id', sql.Int, vendor.vendor_id == null ? null : parseInt(vendor.vendor_id, 10)).input('contact_person', sql.NVarChar, vendor.contact_person || null).input('status', sql.NVarChar, vendor.status || null).input('quote_date', sql.Date, vendor.quote_date || null).input('grand_total', sql.Decimal(18,2), vendor.grand_total == null ? null : vendor.grand_total).input('notes', sql.NVarChar, vendor.notes || null).input('id', sql.Int, vendor.id).query('UPDATE crmdb.rfq_vendors SET vendor_id=@vendor_id, contact_person=@contact_person, status=@status, quote_date=@quote_date, grand_total=@grand_total, notes=@notes WHERE id=@id; SELECT * FROM crmdb.rfq_vendors WHERE id=@id');
        upserted.push(toSnake((r.recordset || [])[0] || {}));
      } else {
        // Insert
        const ins = await pool.request().input('rfq_id', sql.Int, parseInt(id, 10)).input('vendor_id', sql.Int, vendor.vendor_id == null ? null : parseInt(vendor.vendor_id, 10)).input('vendor_external_id', sql.NVarChar, vendor.vendor_external_id || vendor.vendorExternalId || vendor.vendor?.Id || null).input('contact_person', sql.NVarChar, vendor.contact_person || null).input('status', sql.NVarChar, vendor.status || null).input('quote_date', sql.Date, vendor.quote_date || null).input('grand_total', sql.Decimal(18,2), vendor.grand_total == null ? null : vendor.grand_total).input('notes', sql.NVarChar, vendor.notes || null).query('INSERT INTO crmdb.rfq_vendors (rfq_id, vendor_id, vendor_external_id, contact_person, status, quote_date, grand_total, notes) OUTPUT INSERTED.* VALUES (@rfq_id, @vendor_id, @vendor_external_id, @contact_person, @status, @quote_date, @grand_total, @notes)');
        upserted.push(toSnake((ins.recordset || [])[0] || {}));
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
    const pool = await crmPoolPromise;
    const { id } = req.params;
    const quotesRaw = Array.isArray(req.body) ? req.body : [req.body];
    const quotes = quotesRaw.map(toSnake);
    // Fetch existing quotes for items in this RFQ
    // Get all item ids for this RFQ
    const itemsRes = await pool.request().input('id', sql.Int, parseInt(id, 10)).query('SELECT id FROM crmdb.rfq_items WHERE rfq_id = @id');
    const itemIds = (itemsRes.recordset || []).map(r => r.id);
    let existing = [];
    if (itemIds.length > 0) {
      // Build a simple IN clause
      const idsParam = itemIds.join(',');
      const existingRes = await pool.request().query(`SELECT * FROM crmdb.rfq_item_vendor_quotes WHERE rfq_item_id IN (${idsParam})`);
      existing = existingRes.recordset || [];
    }
    const existingIds = new Set(existing.map(q => q.id));
    const incomingIds = new Set(quotes.filter(q => q.id).map(q => q.id));

    // Delete quotes not in incoming
    for (const ex of existing) {
      if (!incomingIds.has(ex.id)) {
        await pool.request().input('id', sql.Int, ex.id).query('DELETE FROM crmdb.rfq_item_vendor_quotes WHERE id = @id');
      }
    }

    const upserted = [];
    for (const quote of quotes) {
      // Normalize ids: rfq_item_id may be provided as rfq_item_id or rfqItemId; vendor may be nested
      const rfqItemId = quote.rfq_item_id || quote.rfqItemId || quote.rfq_item || null;
      const vendorId = quote.vendor_id || quote.vendorId || quote.vendor?.Id || quote.vendor?.Id || null;
      const qId = quote.id || null;
        if (qId && existingIds.has(qId)) {
        // Update
        const r = await pool.request().input('vendor_id', sql.Int, vendorId == null ? null : parseInt(vendorId, 10)).input('unit_price', sql.Decimal(18,2), quote.unit_price == null ? null : quote.unit_price).input('total', sql.Decimal(18,2), quote.total == null ? null : quote.total).input('lead_time', sql.NVarChar, quote.lead_time || null).input('lead_time_color', sql.NVarChar, quote.lead_time_color || null).input('quote_date', sql.Date, quote.quote_date || null).input('status', sql.NVarChar, quote.status || null).input('notes', sql.NVarChar, quote.notes || null).input('id', sql.Int, qId).query('UPDATE crmdb.rfq_item_vendor_quotes SET vendor_id=@vendor_id, unit_price=@unit_price, total=@total, lead_time=@lead_time, lead_time_color=@lead_time_color, quote_date=@quote_date, status=@status, notes=@notes WHERE id=@id; SELECT * FROM crmdb.rfq_item_vendor_quotes WHERE id=@id');
        upserted.push(toSnake((r.recordset || [])[0] || {}));
      } else {
        // Insert
        const ins = await pool.request().input('rfq_item_id', sql.Int, rfqItemId == null ? null : parseInt(rfqItemId, 10)).input('vendor_id', sql.Int, vendorId == null ? null : parseInt(vendorId, 10)).input('unit_price', sql.Decimal(18,2), quote.unit_price == null ? null : quote.unit_price).input('total', sql.Decimal(18,2), quote.total == null ? null : quote.total).input('lead_time', sql.NVarChar, quote.lead_time || null).input('lead_time_color', sql.NVarChar, quote.lead_time_color || null).input('quote_date', sql.Date, quote.quote_date || null).input('status', sql.NVarChar, quote.status || null).input('notes', sql.NVarChar, quote.notes || null).query('INSERT INTO crmdb.rfq_item_vendor_quotes (rfq_item_id, vendor_id, unit_price, total, lead_time, lead_time_color, quote_date, status, notes) OUTPUT INSERTED.* VALUES (@rfq_item_id, @vendor_id, @unit_price, @total, @lead_time, @lead_time_color, @quote_date, @status, @notes)');
        upserted.push(toSnake((ins.recordset || [])[0] || {}));
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
    const pool = await crmPoolPromise;
    const result = await pool.request().input('id', sql.Int, parseInt(id, 10)).query('SELECT rv.* FROM crmdb.rfq_vendors rv WHERE rv.rfq_id = @id ORDER BY rv.id ASC');
    const rows = result.recordset || [];
    // Batch fetch MSSQL vendor enrichment for any vendor_id present
    const vendorIds = [...new Set(rows.map(r => r.vendor_id).filter(Boolean))];
    const vendorRecords = vendorIds.length > 0 ? await getVendorsByIds(vendorIds) : [];
    const vendorMap = new Map((vendorRecords || []).map(v => [v.Id, v]));

    // Attach normalized local fields and MSSQL vendor row
    const enriched = rows.map(r => ({
      ...r,
      name: r.name || vendorMap.get(r.vendor_id)?.Name || null,
      phone: r.phone || vendorMap.get(r.vendor_id)?.PhoneNumber || null,
      email: r.email || vendorMap.get(r.vendor_id)?.details?.[0]?.EmailAddress || null,
      address: r.address || vendorMap.get(r.vendor_id)?.Address || null,
      vendor: vendorMap.get(r.vendor_id) || null
    }));
    return res.json(enriched);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Failed to fetch RFQ vendors" });
  }
});

export default router;