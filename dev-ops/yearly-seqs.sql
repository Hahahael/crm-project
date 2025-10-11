-- yearly-seqs.sql
-- Adds per-year counter table and triggers to generate PREFIX-YYYY-XXXX numbers that reset each year.

USE [CRMDB_DEV];
GO

-- Ensure schema exists
IF NOT EXISTS (SELECT * FROM sys.schemas WHERE name = N'crmdb')
BEGIN
    EXEC('CREATE SCHEMA [crmdb]');
END
GO

-- Table to store last value per prefix and year
IF OBJECT_ID('crmdb.yearly_counters', 'U') IS NULL
BEGIN
    CREATE TABLE crmdb.yearly_counters (
        prefix NVARCHAR(50) NOT NULL,
        yr INT NOT NULL,
        last_value INT NOT NULL,
        CONSTRAINT PK_yearly_counters PRIMARY KEY (prefix, yr)
    );
END
GO

-- Stored procedure to atomically get next value for a prefix and current year
IF OBJECT_ID('crmdb.get_next_yearly_seq', 'P') IS NULL
BEGIN
    EXEC('CREATE PROCEDURE crmdb.get_next_yearly_seq @prefix NVARCHAR(50), @next INT OUTPUT AS
    BEGIN
        SET NOCOUNT ON;
        DECLARE @yr INT = YEAR(SYSUTCDATETIME());
        DECLARE @existing INT;
        BEGIN TRANSACTION;
        SELECT @existing = last_value FROM crmdb.yearly_counters WITH (UPDLOCK, HOLDLOCK) WHERE prefix = @prefix AND yr = @yr;
        IF @existing IS NULL
        BEGIN
            INSERT INTO crmdb.yearly_counters (prefix, yr, last_value) VALUES (@prefix, @yr, 1);
            SET @next = 1;
        END
        ELSE
        BEGIN
            UPDATE crmdb.yearly_counters SET last_value = last_value + 1 WHERE prefix = @prefix AND yr = @yr;
            SET @next = @existing + 1;
        END
        COMMIT TRANSACTION;
    END');
END
GO

-- Triggers to generate the formatted numbers for various tables
-- NAEF
IF OBJECT_ID('crmdb.trg_naef_generate_number', 'TR') IS NULL
BEGIN
EXEC('CREATE TRIGGER crmdb.trg_naef_generate_number
ON crmdb.naef
AFTER INSERT
AS
BEGIN
    SET NOCOUNT ON;
    DECLARE @id INT; DECLARE @next INT; DECLARE @prefix NVARCHAR(10) = ''NAEF'';
    DECLARE cur CURSOR LOCAL FAST_FORWARD FOR SELECT id FROM inserted WHERE naef_number IS NULL OR naef_number = '''';
    OPEN cur; FETCH NEXT FROM cur INTO @id;
    WHILE @@FETCH_STATUS = 0
    BEGIN
        EXEC crmdb.get_next_yearly_seq @prefix, @next OUTPUT;
        UPDATE crmdb.naef SET naef_number = @prefix + ''-'' + CONVERT(varchar(4), YEAR(SYSUTCDATETIME())) + ''-'' + RIGHT(''0000'' + CAST(@next AS VARCHAR(10)),4) WHERE id = @id;
        FETCH NEXT FROM cur INTO @id;
    END
    CLOSE cur; DEALLOCATE cur;
END');
END
GO

-- WORKORDERS
IF OBJECT_ID('crmdb.trg_workorders_generate_number', 'TR') IS NULL
BEGIN
EXEC('CREATE TRIGGER crmdb.trg_workorders_generate_number
ON crmdb.workorders
AFTER INSERT
AS
BEGIN
    SET NOCOUNT ON;
    DECLARE @id INT; DECLARE @next INT; DECLARE @prefix NVARCHAR(10) = ''WO'';
    DECLARE cur CURSOR LOCAL FAST_FORWARD FOR SELECT id FROM inserted WHERE wo_number IS NULL OR wo_number = '''';
    OPEN cur; FETCH NEXT FROM cur INTO @id;
    WHILE @@FETCH_STATUS = 0
    BEGIN
        EXEC crmdb.get_next_yearly_seq @prefix, @next OUTPUT;
        UPDATE crmdb.workorders SET wo_number = @prefix + ''-'' + CONVERT(varchar(4), YEAR(SYSUTCDATETIME())) + ''-'' + RIGHT(''0000'' + CAST(@next AS VARCHAR(10)),4) WHERE id = @id;
        FETCH NEXT FROM cur INTO @id;
    END
    CLOSE cur; DEALLOCATE cur;
END');
END
GO

-- SALES LEADS
IF OBJECT_ID('crmdb.trg_sales_leads_generate_number', 'TR') IS NULL
BEGIN
EXEC('CREATE TRIGGER crmdb.trg_sales_leads_generate_number
ON crmdb.sales_leads
AFTER INSERT
AS
BEGIN
    SET NOCOUNT ON;
    DECLARE @id INT; DECLARE @next INT; DECLARE @prefix NVARCHAR(10) = ''SL'';
    DECLARE cur CURSOR LOCAL FAST_FORWARD FOR SELECT id FROM inserted WHERE sl_number IS NULL OR sl_number = '''';
    OPEN cur; FETCH NEXT FROM cur INTO @id;
    WHILE @@FETCH_STATUS = 0
    BEGIN
        EXEC crmdb.get_next_yearly_seq @prefix, @next OUTPUT;
        UPDATE crmdb.sales_leads SET sl_number = @prefix + ''-'' + CONVERT(varchar(4), YEAR(SYSUTCDATETIME())) + ''-'' + RIGHT(''0000'' + CAST(@next AS VARCHAR(10)),4) WHERE id = @id;
        FETCH NEXT FROM cur INTO @id;
    END
    CLOSE cur; DEALLOCATE cur;
END');
END
GO

-- TECHNICAL RECOMMENDATIONS
IF OBJECT_ID('crmdb.trg_tr_generate_number', 'TR') IS NULL
BEGIN
EXEC('CREATE TRIGGER crmdb.trg_tr_generate_number
ON crmdb.technical_recommendations
AFTER INSERT
AS
BEGIN
    SET NOCOUNT ON;
    DECLARE @id INT; DECLARE @next INT; DECLARE @prefix NVARCHAR(10) = ''TR'';
    DECLARE cur CURSOR LOCAL FAST_FORWARD FOR SELECT id FROM inserted WHERE tr_number IS NULL OR tr_number = '''';
    OPEN cur; FETCH NEXT FROM cur INTO @id;
    WHILE @@FETCH_STATUS = 0
    BEGIN
        EXEC crmdb.get_next_yearly_seq @prefix, @next OUTPUT;
        UPDATE crmdb.technical_recommendations SET tr_number = @prefix + ''-'' + CONVERT(varchar(4), YEAR(SYSUTCDATETIME())) + ''-'' + RIGHT(''0000'' + CAST(@next AS VARCHAR(10)),4) WHERE id = @id;
        FETCH NEXT FROM cur INTO @id;
    END
    CLOSE cur; DEALLOCATE cur;
END');
END
GO

-- RFQs
IF OBJECT_ID('crmdb.trg_rfqs_generate_number', 'TR') IS NULL
BEGIN
EXEC('CREATE TRIGGER crmdb.trg_rfqs_generate_number
ON crmdb.rfqs
AFTER INSERT
AS
BEGIN
    SET NOCOUNT ON;
    DECLARE @id INT; DECLARE @next INT; DECLARE @prefix NVARCHAR(10) = ''RFQ'';
    DECLARE cur CURSOR LOCAL FAST_FORWARD FOR SELECT id FROM inserted WHERE rfq_number IS NULL OR rfq_number = '''';
    OPEN cur; FETCH NEXT FROM cur INTO @id;
    WHILE @@FETCH_STATUS = 0
    BEGIN
        EXEC crmdb.get_next_yearly_seq @prefix, @next OUTPUT;
        UPDATE crmdb.rfqs SET rfq_number = @prefix + ''-'' + CONVERT(varchar(4), YEAR(SYSUTCDATETIME())) + ''-'' + RIGHT(''0000'' + CAST(@next AS VARCHAR(10)),4) WHERE id = @id;
        FETCH NEXT FROM cur INTO @id;
    END
    CLOSE cur; DEALLOCATE cur;
END');
END
GO

-- QUOTATIONS
IF OBJECT_ID('crmdb.trg_quotations_generate_number', 'TR') IS NULL
BEGIN
EXEC('CREATE TRIGGER crmdb.trg_quotations_generate_number
ON crmdb.quotations
AFTER INSERT
AS
BEGIN
    SET NOCOUNT ON;
    DECLARE @id INT; DECLARE @next INT; DECLARE @prefix NVARCHAR(10) = ''QUOT'';
    DECLARE cur CURSOR LOCAL FAST_FORWARD FOR SELECT id FROM inserted WHERE quot_number IS NULL OR quot_number = '''';
    OPEN cur; FETCH NEXT FROM cur INTO @id;
    WHILE @@FETCH_STATUS = 0
    BEGIN
        EXEC crmdb.get_next_yearly_seq @prefix, @next OUTPUT;
        UPDATE crmdb.quotations SET quot_number = @prefix + ''-'' + CONVERT(varchar(4), YEAR(SYSUTCDATETIME())) + ''-'' + RIGHT(''0000'' + CAST(@next AS VARCHAR(10)),4) WHERE id = @id;
        FETCH NEXT FROM cur INTO @id;
    END
    CLOSE cur; DEALLOCATE cur;
END');
END
GO
