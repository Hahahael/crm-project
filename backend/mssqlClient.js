import { sql, poolPromise } from './mssql.js';

// Helper functions to fetch inventory data from MSSQL (spidb)
export async function getStocksByIds(ids = []) {
  if (!ids || ids.length === 0) return [];
  const pool = await poolPromise;
  const req = pool.request();
  ids.forEach((id, i) => req.input(`id${i}`, sql.BigInt, id));
  const inClause = ids.map((_, i) => `@id${i}`).join(',');
  const q = `
    SELECT Id, Code, Description, ReOrderLevel, MOQPurchase, MOQSales, Stock_Type_Id, BOM_ID, BRAND_ID, Vendor_Id,
           InventoryQty, AllocatedQty, AvailableQty, Status, Category_Id, SK_UOM, PUR_UOM, SALES_UOM,
           ExpectedQty, MOQMultiplier, DesiredInvQty
    FROM spidb.dbo.stock
    WHERE Id IN (${inClause})
  `;
  const res = await req.query(q);
  return res.recordset || [];
}

export async function getStockDetailsByStockIds(ids = []) {
  if (!ids || ids.length === 0) return [];
  const pool = await poolPromise;
  const req = pool.request();
  ids.forEach((id, i) => req.input(`id${i}`, sql.BigInt, id));
  const inClause = ids.map((_, i) => `@id${i}`).join(',');
  const q = `
    SELECT Id, Code, Description, Price, PriceValidity, ModifiedBy, DateModified, Stock_Id, LocalPrice, SourcePrice, Source_currency_Id, LeadTimeFrom, LeadTimeTo, LeadTimeUnit
    FROM spidb.dbo.stock_details
    WHERE Stock_Id IN (${inClause})
  `;
  const res = await req.query(q);
  return res.recordset || [];
}

export async function getVendorsByIds(ids = []) {
  if (!ids || ids.length === 0) return [];
  const pool = await poolPromise;
  const req = pool.request();
  ids.forEach((id, i) => req.input(`id${i}`, sql.Int, id));
  const inClause = ids.map((_, i) => `@id${i}`).join(',');
  const q = `
    SELECT Id, Code, Name, Address, PhoneNumber, FaxNumber, POPaymentTerm, Currency_Id
    FROM spidb.dbo.vendor
    WHERE Id IN (${inClause})
  `;
  const res = await req.query(q);
  const vendors = res.recordset || [];

  // fetch details
  const vendorIds = vendors.map(v => v.Id);
  let details = [];
  if (vendorIds.length > 0) {
    const req2 = pool.request();
    vendorIds.forEach((id, i) => req2.input(`id${i}`, sql.Int, id));
    const inClause2 = vendorIds.map((_, i) => `@id${i}`).join(',');
  const q2 = `SELECT Id, Name, EmailAddress, Vendor_Id, Designation, IsActive FROM spidb.vendor_details WHERE Vendor_Id IN (${inClause2})`;
    const dres = await req2.query(q2);
    details = dres.recordset || [];
  }

  return vendors.map(v => ({ ...v, details: details.filter(d => d.Vendor_Id === v.Id) }));
}
