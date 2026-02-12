import express from "express";
import { sql, poolPromise } from "../mssql.js";

const router = express.Router();

// GET /mssql/inventory/vendors?limit=100&offset=0
router.get("/vendors", async (req, res) => {
  try {
    const limit = parseInt(req.query.limit, 10) || 1000;
    const offset = parseInt(req.query.offset, 10) || 0;
    const pool = await poolPromise;

    // Fetch vendors
    const vendorsResult = await pool
      .request()
      .input("limit", sql.Int, limit)
      .input("offset", sql.Int, offset).query(`
    SELECT Id, Code, Name, Address, PhoneNumber, FaxNumber, POPaymentTerm, Currency_Id
    FROM spidb.vendor
                ORDER BY Id
                OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY
            `);

    const vendorIds = vendorsResult.recordset.map((v) => v.Id);

    let details = [];
    if (vendorIds.length > 0) {
      // safe table-valued parameter-like approach: join via IN clause constructed from params
      const reqQ = pool.request();
      vendorIds.forEach((id, i) => reqQ.input(`id${i}`, sql.Int, id));
      const inClause = vendorIds.map((_, i) => `@id${i}`).join(",");
      const detailsQuery = `
                SELECT Id, Name, EmailAddress, Vendor_Id, Designation, IsActive
                FROM spidb.vendor_details
                WHERE Vendor_Id IN (${inClause})
                ORDER BY Vendor_Id, Id
            `;
      const detRes = await reqQ.query(detailsQuery);
      details = detRes.recordset;
    }
    
    // Fetch currencies and active forex rates for mapping
    const [currenciesRes, forexRes] = await Promise.all([
      pool.request().query(`SELECT ID, Code, Description FROM spidb.currency`),
      pool.request().query(`SELECT Id, currency_Id, Rate, Validity, IsActive FROM spidb.foreign_exchange WHERE IsActive = 1`),
    ]);

    const currenciesMap = new Map(
      currenciesRes.recordset.map((c) => [c.ID, c])
    );
    const forexMap = new Map(
      forexRes.recordset.map((fx) => [fx.currency_Id, { ...fx, currency: currenciesMap.get(fx.currency_Id) || null }])
    );

    // attach details, currency, and forex to vendors
    const vendors = vendorsResult.recordset.map((v) => ({
      ...v,
      details: details.find((d) => d.Vendor_Id === v.Id) || {},
      currency: currenciesMap.get(v.Currency_Id) || null,
      forex: forexMap.get(v.Currency_Id) || null,
    }));

    return res.json({ count: vendorsResult.recordset.length, rows: vendors });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Failed to fetch vendors" });
  }
});

// GET /mssql/inventory/stocks?limit=100&offset=0
router.get("/stocks", async (req, res) => {
  try {
    const limit = parseInt(req.query.limit, 10) || 1000;
    const offset = parseInt(req.query.offset, 10) || 0;
    const pool = await poolPromise;

    const stocksResult = await pool
      .request()
      .input("limit", sql.Int, limit)
      .input("offset", sql.Int, offset).query(`
                SELECT Id, Code, Description, ReOrderLevel, MOQPurchase, MOQSales, Stock_Type_Id, BOM_ID, BRAND_ID, Vendor_Id,
                        InventoryQty, AllocatedQty, AvailableQty, Status, Category_Id, SK_UOM, PUR_UOM, SALES_UOM,
                        ExpectedQty, MOQMultiplier, DesiredInvQty
                FROM spidb.stock
                ORDER BY Id
                OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY
            `);

    const stockIds = stocksResult.recordset.map((s) => s.Id);

    // Fetch stock_details
    let details = [];
    if (stockIds.length > 0) {
      const reqQ = pool.request();
      stockIds.forEach((id, i) => reqQ.input(`id${i}`, sql.BigInt, id));
      const inClause = stockIds.map((_, i) => `@id${i}`).join(",");
      const detailsQuery = `
                SELECT Id, Code, Description, Price, PriceValidity, ModifiedBy, DateModified, Stock_Id, LocalPrice, SourcePrice, Source_currency_Id, LeadTimeFrom, LeadTimeTo, LeadTimeUnit
                FROM spidb.stock_details
                WHERE Stock_Id IN (${inClause})
                ORDER BY Stock_Id, Id
            `;
      const detRes = await reqQ.query(detailsQuery);
      details = detRes.recordset;
    }

    // Fetch all brands, uoms, stock_types for mapping
    const [brandsRes, uomsRes, stockTypesRes] = await Promise.all([
      pool.request().query(`SELECT ID, Code, Description FROM spidb.brand`),
      pool.request().query(`SELECT Id, Code, Description FROM spidb.uom`),
      pool.request().query(`SELECT Id, Code, Description FROM spidb.stock_type`),
      pool.request().query(`SELECT Id, Code, Description FROM spidb.category`),
    ]);

    const brandsMap = new Map(brandsRes.recordset.map((b) => [b.ID, b]));
    const uomsMap = new Map(uomsRes.recordset.map((u) => [u.Id, u]));
    const stockTypesMap = new Map(stockTypesRes.recordset.map((st) => [st.Id, st]));
    const categoriesMap = new Map(stockTypesRes.recordset.map((c) => [c.Id, c]));

    const stocks = stocksResult.recordset.map((s) => ({
      ...s,
      details: details.find((d) => d.Stock_Id === s.Id) || {},
      brand: brandsMap.get(s.BRAND_ID) || null,
      uom: uomsMap.get(s.SK_UOM) || null,
      stockType: stockTypesMap.get(s.Stock_Type_Id) || null,
      category: categoriesMap.get(s.Category_Id) || null,
    }));

    return res.json({ count: stocksResult.recordset.length, rows: stocks });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Failed to fetch stocks" });
  }
});

// GET /mssql/inventory/brands?limit=100&offset=0
router.get("/brands", async (req, res) => {
  try {
    const limit = parseInt(req.query.limit, 10) || 500;
    const offset = parseInt(req.query.offset, 10) || 0;
    const pool = await poolPromise;

    const result = await pool
      .request()
      .input("limit", sql.Int, limit)
      .input("offset", sql.Int, offset).query(`
        SELECT ID, Code, Description, ModifiedBy, DateModified, commrate
        FROM spidb.brand
        ORDER BY Code
        OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY
      `);

    return res.json({ count: result.recordset.length, rows: result.recordset });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Failed to fetch brands" });
  }
});

// GET /mssql/inventory/uoms?limit=100&offset=0
router.get("/uoms", async (req, res) => {
  try {
    const limit = parseInt(req.query.limit, 10) || 500;
    const offset = parseInt(req.query.offset, 10) || 0;
    const pool = await poolPromise;

    const result = await pool
      .request()
      .input("limit", sql.Int, limit)
      .input("offset", sql.Int, offset).query(`
        SELECT Id, Code, Description
        FROM spidb.uom
        ORDER BY Code
        OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY
      `);

    return res.json({ count: result.recordset.length, rows: result.recordset });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Failed to fetch UOMs" });
  }
});

// GET /mssql/inventory/stock-types
router.get("/stock-types", async (req, res) => {
  try {
    const pool = await poolPromise;
    const result = await pool.request().query(`
      SELECT TOP (1000) [Id], [Code], [Description]
      FROM spidb.stock_type
      ORDER BY [Description]
    `);
    return res.json({ count: result.recordset.length, rows: result.recordset });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Failed to fetch stock types" });
  }
});

// GET /mssql/inventory/supply-type/:stockTypeId
// Returns default supply type for a given stock_type_id using the spidb.Get_StockSupplyType function
router.get("/supply-type/:stockTypeId", async (req, res) => {
  try {
    const stockTypeId = parseInt(req.params.stockTypeId, 10);
    if (!Number.isFinite(stockTypeId)) {
      return res.status(400).json({ error: "Invalid stock type ID" });
    }
    const pool = await poolPromise;
    const result = await pool
      .request()
      .input("Stock_type_id", sql.Int, stockTypeId)
      .query(`SELECT [spidb].[Get_StockSupplyType](@Stock_type_id) AS SupplyType`);
    const supplyType = result.recordset?.[0]?.SupplyType ?? null;
    return res.json({ stockTypeId, supplyType });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Failed to fetch supply type" });
  }
});

// GET /mssql/inventory/currencies
router.get("/currencies", async (req, res) => {
  try {
    const pool = await poolPromise;
    const result = await pool.request().query(`
      SELECT Id, Code, Description
      FROM spidb.currency
      ORDER BY Code
    `);
    return res.json({ count: result.recordset.length, rows: result.recordset });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Failed to fetch currencies" });
  }
});

// GET /mssql/inventory/forex
router.get("/forex", async (req, res) => {
  try {
    const pool = await poolPromise;

    const [forexRes, currenciesRes] = await Promise.all([
      pool.request().query(`
        SELECT Id, currency_Id, Rate, Validity, IsActive
        FROM spidb.foreign_exchange
        ORDER BY currency_Id
      `),
      pool.request().query(`
        SELECT Id, Code, Description
        FROM spidb.currency
      `),
    ]);

    const currencyMap = new Map(currenciesRes.recordset.map((c) => [c.Id, c]));

    const rows = forexRes.recordset.map((fx) => ({
      ...fx,
      currency: currencyMap.get(fx.currency_Id) || null,
    }));

    return res.json({ count: rows.length, rows });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Failed to fetch forex rates" });
  }
});

export default router;
