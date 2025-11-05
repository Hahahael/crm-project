// routes/usersRoutes.js
import express from "express";
import db from "../db.js";
import { poolPromise } from "../mssql.js";

const router = express.Router();

// Helper to log attribute keys for objects or arrays of rows
function logAttributes(label, obj) {
  try {
    if (!obj) return console.log(`${label}: <empty>`);
    if (Array.isArray(obj)) {
      const keys = new Set();
      obj.forEach((r) => {
        if (r && typeof r === "object")
          Object.keys(r).forEach((k) => keys.add(k));
      });
      return console.log(`${label} keys:`, Array.from(keys));
    }
    if (typeof obj === "object")
      return console.log(`${label} keys:`, Object.keys(obj));
    return console.log(`${label}:`, obj);
  } catch (err) {
    console.error("logAttributes error:", err);
  }
}

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

// Get all vendors
router.get("/vendors", async (req, res) => {
  try {
    const result = await db.query(`SELECT * FROM vendors`);
    return res.json(result.rows); // ✅ camelCase
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Failed to fetch users" });
  }
});

// Get single vendor
router.get("/vendor/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const result = await db.query(`SELECT * FROM vendors WHERE id = $1`, [id]);
    if (result.rows.length === 0)
      return res.status(404).json({ error: "Not found" });
    return res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Failed to fetch user" });
  }
});

// Get all items
router.get("/items", async (req, res) => {
  try {
    const result = await db.query(`SELECT * FROM items`);
    return res.json(result.rows); // ✅ camelCase
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Failed to fetch users" });
  }
});

// Get single item
router.get("/items/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const result = await db.query(`SELECT * FROM items WHERE id = $1`, [id]);
    if (result.rows.length === 0)
      return res.status(404).json({ error: "Not found" });
    return res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Failed to fetch user" });
  }
});

export default router;

// MSSQL-backed inventory endpoints
// These endpoints query the SPIDB MSSQL instance for stock, stock_details, vendor and vendor_details
// Mounted at /api/inventory/mssql/*

// Get stocks (optionally limit)
router.get("/mssql/stocks", async (req, res) => {
  try {
    const limit = parseInt(req.query.limit, 10) || 200;
    const pool = await poolPromise;
    const request = pool.request();
    request.input("limit", limit);
    // Fetch from stock_details as primary source, then merge parent stock fields
    const sql =
      "SELECT TOP (@limit) * FROM spidb.stock_details WHERE price > 0 ORDER BY Id DESC";
    const sdRes = await request.query(sql);
    const details = sdRes.recordset || [];
    logAttributes("stock_details (fetched)", details);

    // collect parent stock ids and fetch parent stocks
    const stockIds = [
      ...new Set(details.map((d) => d.Stock_Id).filter(Boolean)),
    ];
    console.log("Unique stock IDs to fetch:", stockIds);
    let stocksMap = {};
    // if (stockIds.length > 0) {
    //   const stocksSql = `SELECT * FROM spidb.stock WHERE Id IN (${stockIds.join(",")})`;
    //   const stocksRes = await pool.request().query(stocksSql);
    //   const stocks = stocksRes.recordset || [];
    //   logAttributes("stock (parent fetched)", stocksRes.recordset || []);
    //   stocksMap = stocks.reduce((m, s) => {
    //     const id = s.Id || s.id;
    //     m[id] = s;
    //     return m;
    //   }, {});
    // }

    // ✅ Use the helper instead of inline merging logic
    const merged = details.map((detail) => {
      // const parent = stocksMap[detail.Stock_Id];
      return mergePrimaryWithParent(detail, detail);
    });

    return res.json(merged);
  } catch (err) {
    console.error("MSSQL /mssql/stocks error:", err);
    return res.status(500).json({ error: err.message });
  }
});

// Get single stock with its stock_details
router.get("/mssql/stocks/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const pool = await poolPromise;
    // Fetch stock details for this stock id (primary)
    const detailsRes = await pool
      .request()
      .input("id", id)
      .query("SELECT * FROM spidb.stock_details WHERE id = @id");
    const details = detailsRes.recordset || [];
    logAttributes(
      "stock_details for stock id " + id,
      detailsRes.recordset || [],
    );

    // Fetch parent stock
    // const stockRes = await pool
    //   .request()
    //   .input("id", id)
    //   .query("SELECT * FROM spidb.stock WHERE Id = @id");
    // if (!stockRes.recordset || stockRes.recordset.length === 0) {
    //   return res.status(404).json({ error: "Stock not found" });
    // }
    const stock = [];//stockRes.recordset[0];
    logAttributes("stock (parent for id " + id + ")", stockRes.recordset || []);

    // Merge parent into each detail
    const mergedDetails = details.map((d) => mergePrimaryWithParent(d, d));

    stock.details = mergedDetails;
    return res.json(stock);
  } catch (err) {
    console.error("MSSQL /mssql/stocks/:id error:", err);
    return res.status(500).json({ error: err.message });
  }
});

// Get stock detail by id
router.get("/mssql/stock-details/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const pool = await poolPromise;
    const resDetail = await pool
      .request()
      .input("id", id)
      .query("SELECT * FROM spidb.stock_details WHERE Id = @id");
    if (!resDetail.recordset || resDetail.recordset.length === 0)
      return res.status(404).json({ error: "Not found" });
    const detail = resDetail.recordset[0];
    logAttributes("stock_detail (single) id " + id, resDetail.recordset || []);

    // fetch parent stock
    // if (detail.stockId) {
    //   const stockId =
    //     detail.Stock_Id || detail.stockId || detail.StockId || detail.stock_id;

    //   const parentRes = await pool
    //     .request()
    //     .input("id", stockId)
    //     .query("SELECT * FROM spidb.stock WHERE Id = @id");

    //   if (parentRes.recordset && parentRes.recordset.length > 0) {
    //     const parent = parentRes.recordset[0];
    //     const merged = mergePrimaryWithParent(detail, parent);
    //     return res.json(merged);
    //   }
    // }

    return res.json(detail);
  } catch (err) {
    console.error("MSSQL /mssql/stock-details/:id error:", err);
    return res.status(500).json({ error: err.message });
  }
});

// Get vendors
router.get("/mssql/vendors", async (req, res) => {
  try {
    const limit = parseInt(req.query.limit, 10) || 200;
    const pool = await poolPromise;
    const request = pool.request();
    request.input("limit", limit);
    // Fetch vendor_details as primary source, then merge parent vendor fields
    const sql =
      "SELECT TOP (@limit) * FROM spidb.vendor_details ORDER BY Id DESC";
    const vdRes = await request.query(sql);
    const details = vdRes.recordset || [];
    logAttributes("vendor_details (fetched)", vdRes.recordset || []);

    const vendorIds = [
      ...new Set(details.map((d) => d.Vendor_Id).filter(Boolean)),
    ];
    let vendorsMap = {};

    if (vendorIds.length > 0) {
      const vendorsSql = `SELECT * FROM spidb.vendor WHERE Id IN (${vendorIds.join(",")})`;
      const vendorsRes = await pool.request().query(vendorsSql);
      const vendors = vendorsRes.recordset || [];
      logAttributes("vendor (parent fetched)", vendorsRes.recordset || []);
      vendorsMap = vendors.reduce((m, v) => {
        const id = v.Id || v.id;
        m[id] = v;
        return m;
      }, {});
    }

    const merged = details.map((d) => {
      const parent =
        vendorsMap[d.Vendor_Id || d.vendorId || d.vendor_id || d.VendorId];
      if (!parent) return d;
      return mergePrimaryWithParent(d, parent);
    });

    return res.json(merged);
  } catch (err) {
    console.error("MSSQL /mssql/vendors error:", err);
    return res.status(500).json({ error: err.message });
  }
});

// Get single vendor with details
router.get("/mssql/vendors/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const pool = await poolPromise;
    // Fetch vendor details (primary) and parent vendor
    const detailsRes = await pool
      .request()
      .input("vendor_id", id)
      .query("SELECT * FROM spidb.vendor_details WHERE Vendor_Id = @vendor_id");
    const details = detailsRes.recordset || [];
    logAttributes(
      "vendor_details for vendor id " + id,
      detailsRes.recordset || [],
    );

    const vendorRes = await pool
      .request()
      .input("id", id)
      .query("SELECT * FROM spidb.vendor WHERE Id = @id");
    if (!vendorRes.recordset || vendorRes.recordset.length === 0)
      return res.status(404).json({ error: "Vendor not found" });
    const vendor = vendorRes.recordset[0];
    logAttributes(
      "vendor (parent for id " + id + ")",
      vendorRes.recordset || [],
    );

    const mergedDetails = details.map((d) => {
      return mergePrimaryWithParent(d, vendor);
    });

    vendor.details = mergedDetails;
    return res.json(vendor);
  } catch (err) {
    console.error("MSSQL /mssql/vendors/:id error:", err);
    return res.status(500).json({ error: err.message });
  }
});
