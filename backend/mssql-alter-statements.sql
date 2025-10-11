-- Validation and ALTER statements for spidb (MSSQL)
-- Run the validation queries first. If they return rows, investigate orphans before applying the ALTERs.

-- 1) Validate vendor_details references
SELECT TOP 20 vd.*
FROM spidb.vendor_details vd
LEFT JOIN spidb.vendor v ON vd.Vendor_Id = v.Id
WHERE v.Id IS NULL;

-- If the above returns rows, those vd rows reference missing vendors.
-- OPTION: Investigate or delete/repair those rows before adding FK.

-- Safe ALTER to add FK (only run after validation & cleanup):




-- 2) Validate stock_details references
SELECT TOP 20 sd.*
FROM spidb.stock_details sd
LEFT JOIN spidb.stock s ON sd.Stock_Id = s.Id
WHERE s.Id IS NULL;

-- Safe ALTER to add FK (only run after validation & cleanup):




-- 3) Optional: Add indexes on vendor.Id and stock.Id if they are not primary keys
-- (Check first if these already exist)
-- CREATE NONCLUSTERED INDEX IX_vendor_Id ON spidb.vendor(Id);
-- CREATE NONCLUSTERED INDEX IX_stock_Id ON spidb.stock(Id);

-- Notes:
-- - Do not run the ALTER statements until you've reviewed the validation queries and cleaned orphan rows.
-- - Consider running these commands during maintenance windows on production systems.
-- - If the vendor and stock tables are large, build indexes with ONLINE=ON (Enterprise) or create during low traffic.
