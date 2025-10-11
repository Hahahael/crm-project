# CRMDB_DEV MSSQL setup

This document describes how to create the CRMDB_DEV database and run the DDL script `create-crmdb-dev.sql` included in this repo.

Files:
- `dev-ops/create-crmdb-dev.sql` — full DDL for CRMDB_DEV.

## Run with sqlcmd (CLI)

Prerequisites:
- `sqlcmd` installed (comes with Microsoft ODBC Tools or mssql-tools package).

Example command (Windows / macOS / Linux):

```bash
# Linux/macOS example (using -S server and -U user -P password)
sqlcmd -S tcp:localhost,1433 -U sa -P 'YourStrong!Passw0rd' -i dev-ops/create-crmdb-dev.sql

# If using Integrated auth on Windows:
sqlcmd -S <your_server> -E -i dev-ops/create-crmdb-dev.sql
```

Replace host/port and credentials with your environment. If your server uses a different port, append `,PORT` to the host.

## Run with SSMS (GUI)

1. Open SQL Server Management Studio.
2. Connect to your SQL Server instance.
3. Right-click `Databases` -> `New Database...` (optional if script will create DB).
4. Open `dev-ops/create-crmdb-dev.sql` (File -> Open -> File) or paste contents into a new query window.
5. Ensure the selected database is `master` (so the script can CREATE DATABASE) or use the `USE CRMDB_DEV` line in the script.
6. Execute the script (F5). Review Messages pane for success/failure.

## Validation queries

Run the following queries to confirm the schema was created and key constraints/indexes exist.

```sql
USE [CRMDB_DEV];
GO

-- List tables
SELECT TABLE_SCHEMA, TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_TYPE='BASE TABLE' ORDER BY TABLE_NAME;

-- Check columns for rfq_items
SELECT COLUMN_NAME, DATA_TYPE, CHARACTER_MAXIMUM_LENGTH
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_SCHEMA='crmdb' AND TABLE_NAME='rfq_items'
ORDER BY ORDINAL_POSITION;

-- Check foreign keys referencing rfqs
SELECT fk.name AS FKName, tp.name AS ParentTable, cp.name AS ParentColumn, tr.name AS ReferencedTable, cr.name AS ReferencedColumn
FROM sys.foreign_key_columns fkc
JOIN sys.foreign_keys fk ON fkc.constraint_object_id = fk.object_id
JOIN sys.tables tp ON fkc.parent_object_id = tp.object_id
JOIN sys.columns cp ON fkc.parent_object_id = cp.object_id AND fkc.parent_column_id = cp.column_id
JOIN sys.tables tr ON fkc.referenced_object_id = tr.object_id
JOIN sys.columns cr ON fkc.referenced_object_id = cr.object_id AND fkc.referenced_column_id = cr.column_id
WHERE tr.name = 'rfqs'
ORDER BY fk.name;

-- Verify indexes
SELECT name, object_name(object_id) AS tableName FROM sys.indexes WHERE name LIKE 'IDX%';

-- Quick counts
SELECT 'users' AS tbl, COUNT(*) AS rows FROM crmdb.users;
SELECT 'rfqs' AS tbl, COUNT(*) AS rows FROM crmdb.rfqs;
SELECT 'rfq_items' AS tbl, COUNT(*) AS rows FROM crmdb.rfq_items;
SELECT 'rfq_vendors' AS tbl, COUNT(*) AS rows FROM crmdb.rfq_vendors;
SELECT 'rfq_quotations' AS tbl, COUNT(*) AS rows FROM crmdb.rfq_quotations;
```

## Mapping notes (Postgres -> MSSQL)

- SERIAL -> INT IDENTITY(1,1)
- TEXT/VARCHAR -> NVARCHAR(MAX) or NVARCHAR(length)
- TIMESTAMP -> DATETIME2
- JSONB -> NVARCHAR(MAX) (SQL Server has JSON functions but not a dedicated JSON type)
- BOOLEAN -> BIT (0/1)
- NUMERIC(12,2) -> DECIMAL(12,2)

## Timezone / Date handling

- SQL Server DATETIME2 has no timezone. Store timestamps in UTC and convert in the app if needed. Use `SYSUTCDATETIME()` for default UTC timestamps.

## Next steps

- If you want to preserve the Postgres mock seed data, write simple INSERT scripts that translate values to MSSQL datatypes and run them after creating the DB.
- If integrating with SPIDB_V49_UAT, ensure column names for stocks/vendors/quotations match exactly for any sync tooling.
