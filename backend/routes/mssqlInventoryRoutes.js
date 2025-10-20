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

    // attach details to vendors
    const vendors = vendorsResult.recordset.map((v) => ({
      ...v,
      details: details.find((d) => d.Vendor_Id === v.Id) || {},
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

    const stocks = stocksResult.recordset.map((s) => ({
      ...s,
      details: details.find((d) => d.Stock_Id === s.Id) || {},
    }));

    return res.json({ count: stocksResult.recordset.length, rows: stocks });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Failed to fetch stocks" });
  }
});

export default router;
