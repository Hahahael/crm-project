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
      ORDER BY r.updated_at ASC
    `);
    const rows = result.rows;

    // Enrich accounts from SPI (kristem, brand, industry, department)
    try {
      const ids = Array.from(
        new Set(
          rows
            .map((r) => r.accountId ?? r.account_id)
            .filter((v) => v !== null && v !== undefined),
        ),
      );
      const numericIds = ids.map((x) => Number(x)).filter((n) => Number.isFinite(n));
      if (numericIds.length > 0) {
        const spiPool = await poolPromise;
        const custRes = await spiPool
          .request()
          .query(`SELECT * FROM spidb.customer WHERE Id IN (${numericIds.join(",")})`);
        const customers = custRes.recordset || [];
        const custMap = new Map(customers.map((c) => [Number(c.Id), c]));

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

        for (const r of rows) {
          const aid = Number(r.accountId ?? r.account_id);
          const cust = Number.isFinite(aid) ? custMap.get(aid) || null : null;
          if (!cust) {
            r.account = null;
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
          r.account = {
            kristem: cust,
            brand: brandMap.get(bId) || null,
            industry: iId != null ? indMap.get(iId) || null : null,
            department: deptMap.get(dId) || null,
          };
        }
      }
    } catch (enrichErr) {
      console.warn("Failed to enrich RFQs with SPI account data:", enrichErr.message);
    }

    // Fetch vendor details from MSSQL for RFQs that have selected_vendor_id
    try {
      const rfqsWithVendors = rows.filter(rfq => rfq.selected_vendor_id || rfq.selectedVendorId);

      if (rfqsWithVendors.length > 0) {
        const vendorIds = rfqsWithVendors.map(rfq => rfq.selected_vendor_id || rfq.selectedVendorId);
        const uniqueVendorIds = [...new Set(vendorIds)].filter(id => id != null);

        if (uniqueVendorIds.length > 0) {
          const spiPool = await poolPromise;

          // Fetch vendors from MSSQL spidb.vendor table
          const vendorRes = await spiPool
            .request()
            .query(`SELECT * FROM spidb.vendor WHERE Id IN (${uniqueVendorIds.join(",")})`);
          const detailsRes = await spiPool
            .request()
            .input("vendor_id", Number(vendorKey))
            .query(
              "SELECT * FROM spidb.vendor_details WHERE Vendor_Id = @vendor_id",
            );

          const vendorMap = new Map();
          (vendorRes.recordset || []).forEach(vendor => {
            vendorMap.set(vendor.Id, vendor);
          });

          const detail =
            detailsRes && detailsRes.recordset && detailsRes.recordset[0]
              ? detailsRes.recordset[0]
              : null;

          // Add vendor details to each RFQ
          rows.forEach(rfq => {
            const vendorId = rfq.selected_vendor_id || rfq.selectedVendorId;
            if (vendorId && vendorMap.has(vendorId)) {
              rfq.vendor = vendorMap.get(vendorId);
              rfq.vendor.details = detail;
            }
          });

          console.log(`Enriched ${rfqsWithVendors.length} RFQs with selected vendor details from MSSQL`);
        }
      }
    } catch (vendorErr) {
      console.warn("Failed to enrich RFQs with vendor details from MSSQL:", vendorErr.message);
    }

    return res.json(rows);
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

    // Fetch all brands, uoms, stock_types, categories, currencies, forex for mapping
    const [brandsRes, uomsRes, stockTypesRes, categoriesRes, currenciesRes, forexRes] = await Promise.all([
      pool.request().query(`SELECT ID, Code, Description FROM spidb.brand`),
      pool.request().query(`SELECT Id, Code, Description FROM spidb.uom`),
      pool.request().query(`SELECT Id, Code, Description FROM spidb.stock_type`),
      pool.request().query(`SELECT Id, Code, Description FROM spidb.category`),
      pool.request().query(`SELECT ID, Code, Description FROM spidb.currency`),
      pool.request().query(`SELECT Id, currency_Id, Rate, Validity, IsActive FROM spidb.foreign_exchange WHERE IsActive = 1`),
    ]);
    const brandsMap = new Map(brandsRes.recordset.map((b) => [b.ID, b]));
    const uomsMap = new Map(uomsRes.recordset.map((u) => [u.Id, u]));
    const stockTypesMap = new Map(stockTypesRes.recordset.map((st) => [st.Id, st]));
    const categoriesMap = new Map(categoriesRes.recordset.map((c) => [c.Id, c]));
    const currenciesMap = new Map(currenciesRes.recordset.map((c) => [c.ID, c]));
    const forexMap = new Map(forexRes.recordset.map((fx) => [fx.currency_Id, { ...fx, currency: currenciesMap.get(fx.currency_Id) || null }]));

    let items = [];
    for (const ri of itemsRes.rows) {
      try {
        // ri may come from Postgres with snake_case (item_id) or camelCase (itemId)
        const itemKey = ri.item_id ?? ri.itemId ?? null;
        const sdRes = await pool
          .request()
          .input("id", Number(itemKey))
          .query("SELECT * FROM spidb.stock WHERE id = @id");
        // const sRes = await pool
        //   .request()
        //   .input("id", Number(itemKey))
        //   .query("SELECT * FROM spidb.stock WHERE Id = @id");
        // logAttributes(`rfq item stock_details (id=${ri.itemId})`, sdRes.recordset || []);
        // logAttributes(`rfq item stock (id=${ri.itemId})`, sRes.recordset || []);
        console.log(`rfq item sdRes (id=${ri.itemId})`, sdRes);
        // console.log(`rfq item sRes (id=${ri.itemId})`, sRes);

        const detailObj =
          sdRes && sdRes.recordset && sdRes.recordset[0]
            ? sdRes.recordset[0]
            : null;
        // const parentObj =
        //   sRes && sRes.recordset && sRes.recordset[0]
        //     ? sRes.recordset[0]
        //     : null;
        const merged = mergePrimaryWithParent(detailObj, detailObj);
        let itemToPush = { ...ri };
        // attach resolved MSSQL details when available
        if (merged) {
          itemToPush.details = merged;
        }
        // enrich with brand, uom, stockType from lookup maps
        if (detailObj) {
          itemToPush.brand_details = brandsMap.get(detailObj.BRAND_ID) || null;
          itemToPush.uom_details = uomsMap.get(detailObj.SK_UOM) || null;
          itemToPush.stockType_details = stockTypesMap.get(detailObj.Stock_Type_Id) || null;
          itemToPush.category_details = categoriesMap.get(detailObj.Category_Id) || null;
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
    // console.log("Fetched RFQ rfq_vendors:", vendorsRes.rows);
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
        // Enrich with currency and forex rate
        if (parent && parent.Currency_Id) {
          vendorToPush.currency = currenciesMap.get(parent.Currency_Id) || null;
          vendorToPush.forex = forexMap.get(parent.Currency_Id) || null;
        }
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

    // console.log("Final items before quotations:", items);
    // console.log("Final vendors before quotations:", vendors);

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

    // console.log("Final items with prices and lead times:", items);
    // console.log("Final vendors", vendors);
    // vendors.forEach((v) =>
    // console.log("Vendor", v.vendorId, "with quotes:", v.quotes),
    // );
 
    let xSubTotal = 0;
    items.forEach(item => {
      xSubTotal += item?.details?.Price * item.quantity;
    })

    rfq.items = items;
    rfq.subtotal = xSubTotal;
    rfq.vat = Number(xSubTotal || 0) * 0.5;
    rfq.grandTotal = Number(xSubTotal || 0) + Number(xSubTotal || 0) * 0.5;
    rfq.vendors = vendors;

    // Enrich RFQ account from SPI
    try {
      const spiPool = await poolPromise;
      const accId = Number(rfq.accountId ?? rfq.account_id);
      let customer = null;
      if (Number.isFinite(accId)) {
        const custRes = await spiPool
          .request()
          .input("id", accId)
          .query("SELECT TOP (1) * FROM spidb.customer WHERE Id = @id");
        customer = custRes.recordset && custRes.recordset[0] ? custRes.recordset[0] : null;
      }
      if (customer) {
        const normId = (v) => {
          const n = Number(v);
          return Number.isFinite(n) ? n : null;
        };
        const bId =
          (normId(customer.Product_Brand_Id) ??
            normId(customer.ProductBrandId) ??
            normId(customer.Brand_ID) ??
            normId(customer.BrandId) ??
            2);
        const iId =
          normId(customer.Customer_Industry_Group_Id) ??
          normId(customer.Industry_Group_Id) ??
          normId(customer.IndustryGroupId) ??
          null;
        const dId =
          (normId(customer.Department_Id) ??
            normId(customer.DepartmentID) ??
            normId(customer.DepartmentId) ??
            2);
        const [bRes, iRes, dRes] = await Promise.all([
          spiPool
            .request()
            .input("bid", bId)
            .query("SELECT TOP (1) * FROM spidb.brand WHERE ID = @bid"),
          iId != null
            ? spiPool
              .request()
              .input("iid", iId)
              .query(
                "SELECT TOP (1) * FROM spidb.Customer_Industry_Group WHERE Id = @iid",
              )
            : Promise.resolve({ recordset: [] }),
          spiPool
            .request()
            .input("did", dId)
            .query("SELECT TOP (1) * FROM spidb.CusDepartment WHERE Id = @did"),
        ]);
        rfq.account = {
          kristem: customer,
          brand: bRes.recordset && bRes.recordset[0] ? bRes.recordset[0] : null,
          industry: iRes.recordset && iRes.recordset[0] ? iRes.recordset[0] : null,
          department: dRes.recordset && dRes.recordset[0] ? dRes.recordset[0] : null,
        };
      }
    } catch (enrichErr) {
      console.warn("Failed to enrich RFQ account via SPI:", enrichErr.message);
    }

    // Fetch selected vendor details from MSSQL if selected_vendor_id exists
    if (rfq.selected_vendor_id || rfq.selectedVendorId) {
      try {
        const vendorId = rfq.selected_vendor_id || rfq.selectedVendorId;
        const spiPool = await poolPromise;

        // Fetch from MSSQL spidb.vendor table
        const vendorRes = await spiPool
          .request()
          .input("id", Number(vendorId))
          .query("SELECT * FROM spidb.vendor WHERE Id = @id");

        if (vendorRes.recordset && vendorRes.recordset.length > 0) {
          rfq.vendor = vendorRes.recordset[0];
          console.log(`Fetched selected vendor details from MSSQL for RFQ ${id}:`, rfq.vendor);
        } else {
          console.warn(`Selected vendor ID ${vendorId} not found in spidb.vendor table for RFQ ${id}`);
          rfq.vendor = null;
        }
      } catch (vendorErr) {
        console.warn("Failed to fetch selected vendor details from MSSQL:", vendorErr.message);
        rfq.vendor = null;
      }
    }
    

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
      selected_vendor_id,
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
                        (wo_id, assignee, rfq_number, stage_status, due_date, sl_id, account_id, selected_vendor_id, created_at, created_by, updated_at)
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
        selected_vendor_id || null,
        assignee,
      ],
    );
    const newId = insertResult.rows[0].id;
    console.log("✅ Created RFQ with ID:", newId);

    // Handle items/products based on source
    let rfqItems = [];
    
    if (wo_id) {
      // Find TR for this work order
      const trRes = await db.query(
        `SELECT id FROM technical_recommendations WHERE wo_id = $1 LIMIT 1`,
        [wo_id]
      );
      
      if (trRes.rows.length > 0) {
        const tr_id = trRes.rows[0].id;
        // Fetch products from TR with routing_type = 'rfq'
        console.log(`📦 Fetching RFQ products from TR ${tr_id} via WO ${wo_id}`);
        const trProductsRes = await db.query(
          `SELECT * FROM technical_recommendation_products 
           WHERE tr_id = $1 AND routing_type = 'rfq'`,
          [tr_id]
        );
        
        console.log(`📦 Found ${trProductsRes.rows.length} products marked for RFQ`);
        rfqItems = trProductsRes.rows;
      }
    }
    
    if (rfqItems.length === 0 && items && Array.isArray(items)) {
      // Legacy: Use provided items array
      console.log("📦 Using provided items array");
      rfqItems = items;
    }

    // Insert RFQ items
    if (rfqItems && rfqItems.length > 0) {
      console.log(`📦 Inserting ${rfqItems.length} RFQ items`);
      for (const item of rfqItems) {
        if (item.product_name || item.productName) {
          // New TR product-based item
          const mappedItemId = item.item_id || item.itemId || null;
          const mappedInTrApproval = mappedItemId ? true : false; // Track if mapping came from TR
          const isNewItem = item.is_new_item || item.isNewItem || false; // Track if marked as new item
          
          const insertedItem = await db.query(
            `INSERT INTO rfq_items 
             (rfq_id, tr_product_id, item_id, mapped_in_tr_approval, is_new_item, product_name, corrected_part_no, description, brand, unit_om, quantity) 
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING id`,
            [
              newId,
              item.id,
              mappedItemId,
              mappedInTrApproval,
              isNewItem,
              item.product_name || item.productName,
              item.corrected_part_no || item.correctedPartNo,
              item.description,
              item.brand,
              item.unit_om || item.unitOm,
              item.quantity,
            ],
          );
          const insertedId = insertedItem.rows[0].id;
          if (isNewItem) {
            console.log(`✅ Inserted RFQ item ${insertedId} (NEW ITEM - not in Kristem)`);
          } else if (mappedItemId) {
            console.log(`✅ Inserted RFQ item ${insertedId} (mapped to Kristem item ${mappedItemId})`);
          } else {
            console.log(`✅ Inserted RFQ item ${insertedId} (no Kristem mapping - manual entry)`);
          }
        } else if (item.item_id) {
          // Legacy item_id based
          const insertedItem = await db.query(
            `INSERT INTO rfq_items (rfq_id, item_id, quantity) VALUES ($1,$2,$3) RETURNING id`,
            [newId, item.item_id, item.quantity],
          );
          console.log("✅ Inserted legacy RFQ item with ID:", insertedItem.rows[0].id);
        }
      }
    } else {
      console.warn("⚠️ No items to insert for RFQ", newId);
    }

    // Create workflow stage for new RFQ (Draft)
    await db.query(
      `
        INSERT INTO workflow_stages (wo_id, stage_name, status, assigned_to, created_at, updated_at)
        VALUES ($1, $2, $3, $4, NOW(), NOW())
      `,
      [wo_id, "RFQ", "Draft", assignee],
    );

    const final = await db.query(
      `
        SELECT r.*, u.username AS assignee_username, a.account_name AS account_name
        FROM rfqs r
        LEFT JOIN users u ON r.assignee = u.id
        LEFT JOIN accounts a ON r.account_id = a.id
        WHERE r.id = $1
      `,
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
      console.log("[DEBUG] Incoming request headers:", { "content-type": req.get("content-type"), "content-length": req.get("content-length"), });
      console.log( "[DEBUG] raw req.body type:", Array.isArray(req.body) ? "array" : typeof req.body, );
      console.log("[DEBUG] raw req.body keys:", Object.keys(req.body || {}));
      console.log( "[DEBUG] raw req.body (stringified, truncated):", JSON.stringify(req.body || {}, null, 2).slice(0, 2000), );
    } catch (dbgErr) {
      console.error("[DEBUG] failed to stringify raw req.body", dbgErr);
    }

    const body = toSnake(req.body);
    console.log( "Updating RFQ ID:", id, "with data keys:", Object.keys(body || {}), );
    // Optional: log a truncated serialization to avoid huge logs
    console.log( "[DEBUG] converted body (truncated):", JSON.stringify(body || {}, null, 2).slice(0, 2000), );
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
          selected_vendor_id=$17, updated_by=$16, updated_at=NOW()
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
        body.selected_vendor_id || null,
        id,
      ],
    );
    const updatedId = updateResult.rows[0].id;

    
    // Upsert RFQ items
    if (body.items && Array.isArray(body.items)) {
      console.log("Processing RFQ items for RFQ ID:", id, "with items count:", body.items.length);
      // Delete items not in incoming
      const existingRes = await db.query(
        "SELECT * FROM rfq_items WHERE rfq_id = $1",
        [id],
      );
      const existing = toSnake(existingRes.rows);
      const existingIds = new Set(existing.map((i) => i.id));
      const incomingIds = new Set(
        body.items.filter((i) => i.id).map((i) => i.id),
      );
      console.log("Existing items:", existingIds);
      console.log("Incoming items:", incomingIds);
      for (const ex of existing) {
        if (!incomingIds.has(ex.id)) {
          console.log("Deleting RFQ item with id", ex.id);
          await db.query(
            "DELETE FROM rfq_items WHERE id = $1 AND rfq_id = $2",
            [ex.id, id],
          );
        }
      }
      for (const item of body.items) {
        console.log("Processing item for upsert with item.id:", item.id);
        const unitPrice = item.unit_price === "" ? null : item.unit_price;
        const quantity = item.quantity === "" ? null : item.quantity;
        
        // If the incoming item's already exists for this RFQ, update the record
        // New Items: non-existing in Kristem
        // Mapped Items: existing in Kristem, uses item_id for mapping
        if (item.is_new_item || item.isNewItem) {
          console.log("Processing as NEW ITEM");
          if (item.id && existingIds.has(item.id)) {
            console.log("Processing as UPDATE NEW ITEM");
            // Build dynamic update with all fields
            const updateFields = [];
            const updateValues = [];
            let paramCount = 1;
            
            if (quantity !== undefined) {
              updateFields.push(`quantity = $${paramCount++}`);
              updateValues.push(quantity);
            }
            if (unitPrice !== undefined) {
              updateFields.push(`unit_price = $${paramCount++}`);
              updateValues.push(unitPrice);
            }
            if (item.lead_time !== undefined) {
              updateFields.push(`lead_time = $${paramCount++}`);
              updateValues.push(item.lead_time);
            }
            
            // Add new item detail fields if present
            if (item.product_name !== undefined) {
              updateFields.push(`product_name = $${paramCount++}`);
              updateValues.push(item.product_name);
            }
            if (item.corrected_part_no !== undefined) {
              updateFields.push(`corrected_part_no = $${paramCount++}`);
              updateValues.push(item.corrected_part_no);
            }
            if (item.description !== undefined) {
              updateFields.push(`description = $${paramCount++}`);
              updateValues.push(item.description);
            }
            if (item.corrected_description !== undefined) {
              updateFields.push(`corrected_description = $${paramCount++}`);
              updateValues.push(item.corrected_description);
            }
            if (item.brand !== undefined) {
              updateFields.push(`brand = $${paramCount++}`);
              updateValues.push(item.brand);
            }
            if (item.unit_om !== undefined) {
              updateFields.push(`unit_om = $${paramCount++}`);
              updateValues.push(item.unit_om);
            }
            if (item.vendor !== undefined) {
              updateFields.push(`vendor = $${paramCount++}`);
              updateValues.push(item.vendor);
            }
            if (item.stock_type !== undefined) {
              updateFields.push(`stock_type = $${paramCount++}`);
              updateValues.push(item.stock_type);
            }
            if (item.supply_type !== undefined) {
              updateFields.push(`supply_type = $${paramCount++}`);
              updateValues.push(item.supply_type);
            }
            if (item.weight !== undefined) {
              updateFields.push(`weight = $${paramCount++}`);
              updateValues.push(item.weight === '' || item.weight === null ? null : parseFloat(item.weight));
            }
            if (item.moq !== undefined) {
              updateFields.push(`moq = $${paramCount++}`);
              updateValues.push(item.moq === '' || item.moq === null ? null : parseInt(item.moq));
            }
            if (item.moq_by !== undefined) {
              updateFields.push(`moq_by = $${paramCount++}`);
              updateValues.push(item.moq_by);
            }
            if (item.is_active !== undefined) {
              updateFields.push(`is_active = $${paramCount++}`);
              updateValues.push(item.is_active);
            }
            if (item.is_common !== undefined) {
              updateFields.push(`is_common = $${paramCount++}`);
              updateValues.push(item.is_common);
            }
            if (item.buy_price !== undefined) {
              updateFields.push(`buy_price = $${paramCount++}`);
              updateValues.push(item.buy_price === '' || item.buy_price === null ? null : parseFloat(item.buy_price));
            }
            if (item.selling_price !== undefined) {
              updateFields.push(`selling_price = $${paramCount++}`);
              updateValues.push(item.selling_price === '' || item.selling_price === null ? null : parseFloat(item.selling_price));
            }
            if (item.setup_status !== undefined) {
              updateFields.push(`setup_status = $${paramCount++}`);
              updateValues.push(item.setup_status);
            }

            updateValues.push(item.id, id);
            
            await db.query(
              `UPDATE rfq_items SET ${updateFields.join(', ')} WHERE id = $${paramCount++} AND rfq_id = $${paramCount++} RETURNING *`,
              updateValues,
            );
          } else {
            console.log("Processing as INSERT NEW ITEM");
            // Insert new item with all available fields
            const insertFields = ['rfq_id', 'item_id', 'quantity', 'unit_price', 'lead_time'];
            const insertValues = [id, item.item_id, quantity, unitPrice, item.lead_time];
            let paramCount = insertValues.length + 1;
            
            // Add optional fields if provided
            if (item.product_name !== undefined) {
              insertFields.push('product_name');
              insertValues.push(item.product_name);
            }
            if (item.corrected_part_no !== undefined) {
              insertFields.push('corrected_part_no');
              insertValues.push(item.corrected_part_no);
            }
            if (item.description !== undefined) {
              insertFields.push('description');
              insertValues.push(item.description);
            }
            if (item.corrected_description !== undefined) {
              insertFields.push('corrected_description');
              insertValues.push(item.corrected_description);
            }
            if (item.brand !== undefined) {
              insertFields.push('brand');
              insertValues.push(item.brand);
            }
            if (item.unit_om !== undefined) {
              insertFields.push('unit_om');
              insertValues.push(item.unit_om);
            }
            if (item.vendor !== undefined) {
              insertFields.push('vendor');
              insertValues.push(item.vendor);
            }
            if (item.stock_type !== undefined) {
              insertFields.push('stock_type');
              insertValues.push(item.stock_type);
            }
            if (item.supply_type !== undefined) {
              insertFields.push('supply_type');
              insertValues.push(item.supply_type);
            }
            if (item.weight !== undefined) {
              insertFields.push('weight');
              insertValues.push(item.weight === '' || item.weight === null ? null : parseFloat(item.weight));
            }
            if (item.moq !== undefined) {
              insertFields.push('moq');
              insertValues.push(item.moq === '' || item.moq === null ? null : parseInt(item.moq));
            }
            if (item.moq_by !== undefined) {
              insertFields.push('moq_by');
              insertValues.push(item.moq_by);
            }
            if (item.is_active !== undefined) {
              insertFields.push('is_active');
              insertValues.push(item.is_active);
            }
            if (item.is_common !== undefined) {
              insertFields.push('is_common');
              insertValues.push(item.is_common);
            }
            if (item.buy_price !== undefined) {
              insertFields.push('buy_price');
              insertValues.push(item.buy_price === '' || item.buy_price === null ? null : parseFloat(item.buy_price));
            }
            if (item.selling_price !== undefined) {
              insertFields.push('selling_price');
              insertValues.push(item.selling_price === '' || item.selling_price === null ? null : parseFloat(item.selling_price));
            }
            if (item.setup_status !== undefined) {
              insertFields.push('setup_status');
              insertValues.push(item.setup_status);
            }
            
            const placeholders = insertValues.map((_, i) => `$${i + 1}`).join(', ');
            
            await db.query(
              `INSERT INTO rfq_items (${insertFields.join(', ')}) VALUES (${placeholders}) RETURNING *`,
              insertValues,
            );
          }
        } else {
          // Legacy item without new item flag
          console.log("Processing as MAPPED ITEM");
          if (item.item_id && existingIds.has(item.id)) {
            console.log("Processing as UPDATE MAPPED ITEM");
            await db.query(
              `UPDATE rfq_items SET item_id = $1 WHERE id = $2 AND rfq_id = $3 RETURNING *`,
              [item.item_id, item.id, id],
            );
          } else {
            console.log("Processing as INSERT MAPPED ITEM");
            await db.query(
              `INSERT INTO rfq_items (rfq_id, item_id) VALUES ($1,$2) RETURNING *`,
              [id, item.item_id],
            );
          }
        }
      }
    }


    // Upsert RFQ vendors
    if (body.vendors && Array.isArray(body.vendors)) {
      console.log("Processing RFQ vendors for RFQ ID:", id, "with vendors count:", body.vendors.length);
      const existingRes = await db.query(
        "SELECT * FROM rfq_vendors WHERE rfq_id = $1",
        [id],
      );
      const existing = toSnake(existingRes.rows);
      const existingIds = new Set(existing.map((v) => v.vendor_id));
      const incomingIds = new Set(
        body.vendors.filter((v) => v.vendor_id).map((v) => v.vendor_id),
      );
      // console.log("Existing vendors:", existing);
      // console.log("Body vendors:", body.vendors);
      // Delete vendors not in incoming
      for (const ex of existing) {
        if (!incomingIds.has(ex.vendor_id)) {
          console.log("Deleting RFQ vendor with vendor_id", ex.vendor_id);
          await db.query(
            "DELETE FROM rfq_vendors WHERE vendor_id = $1 AND rfq_id = $2",
            [ex.vendor_id, id],
          );
        }
      }
      for (const vendor of body.vendors) {
        console.log("Processing RFQ vendor:", vendor);
        const validUntil = (vendor.valid_until ?? vendor.validUntil) || null;
        const paymentTerms = (vendor.payment_terms ?? vendor.paymentTerms) || null;
        const notes = (vendor.notes) || null;
        const subtotal = (vendor.subtotal) || null;
        const vat = (vendor.vat) || null;
        const grandTotal = (vendor.grand_total ?? vendor.grandTotal) || null;
        const quoteDate = (vendor.quote_date ?? vendor.quoteDate) || null;
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
    // console.log("quotations", allQuotations);
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
          // Detect change vs previous values
          try {
            const prev = existing.find(
              (e) => e.vendor_id === q.vendor_id && e.item_id === q.item_id && e.rfq_id === q.rfq_id,
            );
            if (prev) {
              const prevUnit = prev.unit_price;
              const prevLead = prev.lead_time;
              if (prevUnit !== unitPrice || prevLead !== leadTime) {
                vendorChanged.set(q.vendor_id, true);
              }
            }
          } catch {
            // ignore change detection errors
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
          // Treat insertion with meaningful values as a change
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

    // After upserts, compute and set/update vendor quote_date
    try {
      // Vendors on this RFQ (need id, vendor_id, quote_date)
      const vendorsRes2 = await db.query(
        "SELECT id, vendor_id, quote_date FROM rfq_vendors WHERE rfq_id = $1",
        [id],
      );
      const rfqVendors = vendorsRes2.rows || [];

      // Get all item_ids for this RFQ to define completeness set
      const itemsRes2 = await db.query(
        "SELECT item_id FROM rfq_items WHERE rfq_id = $1",
        [id],
      );
      const itemIds = itemsRes2.rows.map((r) => r.item_id);

      for (const v of rfqVendors) {
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
          [id, v.vendor_id, itemIds],
        );
        const completeCount = Number(cntRes.rows?.[0]?.cnt || 0);
        const allComplete = completeCount === itemIds.length;

        if (v.quote_date == null && allComplete) {
          // First time vendor completed all items
          await db.query(
            `UPDATE rfq_vendors SET quote_date = NOW() WHERE id = $1`,
            [v.id],
          );
          continue;
        }

        if (v.quote_date != null && vendorChanged.get(v.vendor_id)) {
          // Vendor edited quotes after initial completion
          await db.query(
            `UPDATE rfq_vendors SET quote_date = NOW() WHERE id = $1`,
            [v.id],
          );
        }
      }
    } catch (qdErr) {
      console.warn("Failed to compute/update quote_date:", qdErr.message);
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
          `UPDATE rfq_vendors SET vendor_id=$1, contact_person=$2, status=$3, quote_date=$4, subtotal=$5, vat=$6, grand_total=$7, notes=$8 WHERE id=$9 RETURNING *`,
          [
            vendor.vendor_id,
            vendor.contact_person,
            vendor.status,
            vendor.quote_date,
            vendor.subtotal,
            vendor.vat,
            vendor.grand_total,
            vendor.notes,
            vendor.id,
          ],
        );
        upserted.push(result.rows[0]);
      } else {
        // Insert
        const result = await db.query(
          `INSERT INTO rfq_vendors (rfq_id, vendor_id, contact_person, status, quote_date, subtotal, vat, grand_total, notes)
            VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
          [
            id,
            vendor.vendor_id,
            vendor.contact_person,
            vendor.status,
            vendor.quote_date,
            vendor.subtotal,
            vendor.vat,
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
