-- create-crmdb-dev.sql
-- Run this script in SQL Server (sqlcmd or SSMS) to create CRMDB_DEV schema compatible with Postgres mock and SPIDB_V49_UAT expectations.

SET NOCOUNT ON;

IF DB_ID(N'CRMDB_DEV') IS NULL
BEGIN
    CREATE DATABASE [CRMDB_DEV];
    PRINT 'Database CRMDB_DEV created.';
END
ELSE
    PRINT 'Database CRMDB_DEV already exists.';

USE [CRMDB_DEV];
GO

-- Create target schema `crmdb` (not dbo)
IF NOT EXISTS (SELECT * FROM sys.schemas WHERE name = N'crmdb')
BEGIN
    EXEC('CREATE SCHEMA [crmdb]');
    PRINT 'Schema crmdb created.';
END
GO

-- BASE: Roles, Departments, Statuses, Users, Vendors, Items, Account lookup tables
CREATE TABLE crmdb.roles (
    id INT IDENTITY(1,1) PRIMARY KEY,
    role_name NVARCHAR(255) NULL
);
GO

CREATE TABLE crmdb.departments (
    id INT IDENTITY(1,1) PRIMARY KEY,
    department_name NVARCHAR(255) NULL
);
GO

CREATE TABLE crmdb.statuses (
    id INT IDENTITY(1,1) PRIMARY KEY,
    status_name NVARCHAR(255) NULL
);
GO

CREATE TABLE crmdb.users (
    id INT IDENTITY(1,1) PRIMARY KEY,
    avatar_url NVARCHAR(255) NULL,
    first_name NVARCHAR(100) NULL,
    last_name NVARCHAR(100) NULL,
    username NVARCHAR(100) NULL UNIQUE,
    email NVARCHAR(255) NULL UNIQUE,
    phone_number NVARCHAR(20) NULL,
    role_id INT NULL,
    department_id INT NULL,
    status_id INT NULL,
    permissions NVARCHAR(MAX) NULL,
    password_hash NVARCHAR(255) NULL,
    joined_date DATETIME2 NULL,
    updated_at DATETIME2 NULL,
    last_login DATETIME2 NULL,
    created_by NVARCHAR(100) NULL,
    -- foreign keys moved to two-pass ALTER TABLE section at the end of this script
);
GO

CREATE TABLE crmdb.vendors (
    id INT IDENTITY(1,1) PRIMARY KEY,
    name NVARCHAR(255) NOT NULL,
    contact_person NVARCHAR(100) NULL,
    phone NVARCHAR(50) NULL,
    email NVARCHAR(255) NULL,
    address NVARCHAR(MAX) NULL
);
GO

CREATE TABLE crmdb.items (
    id INT IDENTITY(1,1) PRIMARY KEY,
    name NVARCHAR(255) NOT NULL,
    model NVARCHAR(100) NULL,
    brand NVARCHAR(100) NULL,
    part_number NVARCHAR(100) NULL,
    lead_time NVARCHAR(100) NULL,
    description NVARCHAR(MAX) NULL,
    unit NVARCHAR(50) NULL,
    unit_price DECIMAL(12,2) NULL
);
GO

CREATE TABLE crmdb.account_industries (
    id INT IDENTITY(1,1) PRIMARY KEY,
    industry_name NVARCHAR(255) NULL
);
GO

CREATE TABLE crmdb.account_product_brands (
    id INT IDENTITY(1,1) PRIMARY KEY,
    product_brand_name NVARCHAR(255) NULL
);
GO

CREATE TABLE crmdb.account_departments (
    id INT IDENTITY(1,1) PRIMARY KEY,
    department_name NVARCHAR(255) NULL
);
GO

CREATE TABLE crmdb.accounts (
    id INT IDENTITY(1,1) PRIMARY KEY,
    naef_number NVARCHAR(50) NULL,
    stage_status NVARCHAR(50) DEFAULT 'draft',
    ref_number NVARCHAR(50) NULL,
    date_created DATETIME2 DEFAULT SYSUTCDATETIME(),
    requested_by NVARCHAR(100) NULL,
    designation NVARCHAR(100) NULL,
    department_id INT NULL,
    validity_period NVARCHAR(50) NULL,
    due_date DATE NULL,
    account_name NVARCHAR(255) NOT NULL,
    contract_period NVARCHAR(50) NULL,
    industry_id INT NULL,
    account_designation NVARCHAR(100) NULL,
    product_id INT NULL,
    contact_number NVARCHAR(50) NULL,
    location NVARCHAR(255) NULL,
    email_address NVARCHAR(255) NULL,
    address NVARCHAR(MAX) NULL,
    buyer_incharge NVARCHAR(100) NULL,
    trunkline NVARCHAR(50) NULL,
    contract_number NVARCHAR(100) NULL,
    process NVARCHAR(100) NULL,
    secondary_email_address NVARCHAR(255) NULL,
    machines NVARCHAR(MAX) NULL,
    reason_to_apply NVARCHAR(MAX) NULL,
    automotive_section NVARCHAR(MAX) NULL,
    source_of_inquiry NVARCHAR(100) NULL,
    commodity NVARCHAR(100) NULL,
    business_activity NVARCHAR(100) NULL,
    model NVARCHAR(100) NULL,
    annual_target_sales DECIMAL(12,2) NULL,
    population NVARCHAR(MAX) NULL,
    source_of_target NVARCHAR(100) NULL,
    existing_bellows NVARCHAR(MAX) NULL,
    products_to_order NVARCHAR(MAX) NULL,
    model_under NVARCHAR(100) NULL,
    target_areas NVARCHAR(MAX) NULL,
    analysis NVARCHAR(MAX) NULL,
    from_date DATE NULL,
    to_date DATE NULL,
    activity_period NVARCHAR(50) NULL,
    prepared_by INT NULL,
    noted_by INT NULL,
    approved_by INT NULL,
    received_by INT NULL,
    acknowledged_by INT NULL,
    updated_at DATETIME2 DEFAULT SYSUTCDATETIME(),
    created_at DATETIME2 DEFAULT SYSUTCDATETIME(),
    is_naef BIT DEFAULT 0,
    -- foreign keys moved to two-pass ALTER TABLE section at the end of this script
);
GO

CREATE TABLE crmdb.naef (
    id INT IDENTITY(1,1) PRIMARY KEY,
    department_id INT NULL,
    industry_id INT NULL,
    product_brand_id INT NULL,
    naef_number NVARCHAR(50) NOT NULL,
    account_name NVARCHAR(255) NOT NULL,
    contact_person NVARCHAR(100) NULL,
    contact_number NVARCHAR(50) NULL,
    contact_email NVARCHAR(255) NULL,
    project_name NVARCHAR(255) NULL,
    project_description NVARCHAR(MAX) NULL,
    project_value DECIMAL(12,2) NULL,
    project_start_date DATE NULL,
    project_end_date DATE NULL,
    wo_id INT NULL,
    assignee INT NULL,
    stage_status NVARCHAR(50) DEFAULT 'draft',
    title NVARCHAR(255) DEFAULT '',
    week_number INT NULL,
    update_description NVARCHAR(MAX) NULL,
    probability NVARCHAR(50) NULL,
    created_at DATETIME2 DEFAULT SYSUTCDATETIME(),
    -- foreign keys moved to two-pass ALTER TABLE section at the end of this script
);
GO

CREATE TABLE crmdb.workorders (
    id INT IDENTITY(1,1) PRIMARY KEY,
    wo_number NVARCHAR(50) NULL UNIQUE,
    work_description NVARCHAR(MAX) NOT NULL,
    assignee INT NULL,
    status NVARCHAR(50) DEFAULT 'Pending',
    stage_status NVARCHAR(50) DEFAULT 'draft',
    account_id INT NULL,
    naef_id INT NULL,
    is_new_account BIT DEFAULT 0,
    mode NVARCHAR(50) NULL,
    contact_person NVARCHAR(100) NULL,
    contact_number NVARCHAR(50) NULL,
    wo_date DATE NOT NULL,
    due_date DATE NULL,
    from_time TIME NULL,
    to_time TIME NULL,
    actual_date DATE NULL,
    actual_from_time TIME NULL,
    actual_to_time TIME NULL,
    objective NVARCHAR(MAX) NULL,
    instruction NVARCHAR(MAX) NULL,
    target_output NVARCHAR(MAX) NULL,
    is_fsl BIT DEFAULT 0,
    is_esl BIT DEFAULT 0,
    created_at DATETIME2 DEFAULT SYSUTCDATETIME(),
    created_by INT NULL,
    updated_at DATETIME2 DEFAULT SYSUTCDATETIME(),
    -- foreign keys moved to two-pass ALTER TABLE section at the end of this script
);
GO

-- Add FK from naef.wo_id to workorders.id
-- (moved) FK from naef.wo_id to workorders.id will be created in the two-pass FK section below
-- ALTER removed to avoid creation-order issues
-- GO

CREATE TABLE crmdb.workflow_stages (
    id INT IDENTITY(1,1) PRIMARY KEY,
    wo_id INT NOT NULL,
    stage_name NVARCHAR(100) NOT NULL,
    status NVARCHAR(50) DEFAULT 'Pending',
    assigned_to INT NULL,
    notified BIT DEFAULT 0,
    remarks NVARCHAR(MAX) NULL,
    created_at DATETIME2 DEFAULT SYSUTCDATETIME(),
    updated_at DATETIME2 DEFAULT SYSUTCDATETIME(),
    -- foreign keys moved to two-pass ALTER TABLE section at the end of this script
);
GO

CREATE TABLE crmdb.sales_leads (
    id INT IDENTITY(1,1) PRIMARY KEY,
    sl_number NVARCHAR(50) NOT NULL UNIQUE,
    wo_id INT NULL,
    assignee INT NULL,
    account_id INT NULL,
    stage_status NVARCHAR(50) DEFAULT 'draft',
    end_user NVARCHAR(100) NULL,
    department NVARCHAR(75) NULL,
    contact_number NVARCHAR(50) NULL,
    sales_stage NVARCHAR(100) DEFAULT 'Sales Lead',
    designation NVARCHAR(50) NULL,
    immediate_support NVARCHAR(100) NULL,
    email_address NVARCHAR(255) NULL,
    category NVARCHAR(100) NULL,
    application NVARCHAR(100) NULL,
    machine NVARCHAR(255) NULL,
    machine_process NVARCHAR(100) NULL,
    needed_product NVARCHAR(255) NULL,
    existing_specifications NVARCHAR(MAX) NULL,
    issues_with_existing NVARCHAR(MAX) NULL,
    consideration NVARCHAR(MAX) NULL,
    support_needed NVARCHAR(MAX) NULL,
    urgency NVARCHAR(100) DEFAULT 'Medium',
    model_to_quote NVARCHAR(100) NULL,
    quantity INT DEFAULT 1,
    quantity_attention NVARCHAR(100) NULL,
    qr_cc NVARCHAR(100) NULL,
    qr_email_to NVARCHAR(MAX) NULL,
    next_followup_date DATE NULL,
    due_date DATE NULL,
    done_date DATE NULL,
    account NVARCHAR(100) NULL,
    industry NVARCHAR(100) NULL,
    se_id INT NULL,
    sales_plan_rep NVARCHAR(100) NULL,
    fsl_ref NVARCHAR(50) NULL,
    fsl_date DATE NULL,
    fsl_time TIME NULL,
    fsl_location NVARCHAR(255) NULL,
    ww NVARCHAR(50) NULL,
    requirement NVARCHAR(MAX) NULL,
    requirement_category NVARCHAR(100) NULL,
    deadline DATE NULL,
    product_application NVARCHAR(MAX) NULL,
    customer_issues NVARCHAR(MAX) NULL,
    existing_setup_items NVARCHAR(MAX) NULL,
    customer_suggested_setup NVARCHAR(MAX) NULL,
    remarks NVARCHAR(MAX) NULL,
    actual_picture NVARCHAR(MAX) NULL,
    draft_design_layout NVARCHAR(MAX) NULL,
    created_at DATETIME2 DEFAULT SYSUTCDATETIME(),
    updated_at DATETIME2 DEFAULT SYSUTCDATETIME(),
    -- foreign keys moved to two-pass ALTER TABLE section at the end of this script
);
GO

-- TECHNICAL RECOMMENDATIONS
CREATE TABLE crmdb.technical_recommendations (
    id INT IDENTITY(1,1) PRIMARY KEY,
    wo_id INT NULL,
    assignee INT NULL,
    tr_number NVARCHAR(50) NOT NULL,
    status NVARCHAR(50) DEFAULT 'Open',
    stage_status NVARCHAR(50) DEFAULT 'draft',
    priority NVARCHAR(50) DEFAULT 'Medium',
    title NVARCHAR(255) DEFAULT '',
    sl_id INT NULL,
    account_id INT NULL,
    contact_person NVARCHAR(100) NULL,
    contact_number NVARCHAR(50) NULL,
    contact_email NVARCHAR(255) NULL,
    current_system NVARCHAR(MAX) NULL,
    current_system_issues NVARCHAR(MAX) NULL,
    proposed_solution NVARCHAR(MAX) NULL,
    technical_justification NVARCHAR(MAX) NULL,
    installation_requirements NVARCHAR(MAX) NULL,
    training_requirements NVARCHAR(MAX) NULL,
    maintenance_requirements NVARCHAR(MAX) NULL,
    attachments NVARCHAR(MAX) NULL,
    additional_notes NVARCHAR(MAX) NULL,
    created_at DATETIME2 DEFAULT SYSUTCDATETIME(),
    created_by INT NULL,
    updated_at DATETIME2 DEFAULT SYSUTCDATETIME(),
    -- foreign keys moved to two-pass ALTER TABLE section at the end of this script
);
GO

-- TECHNICAL_RECOMMENDATIONS_ITEMS (formerly products)
CREATE TABLE crmdb.technical_recommendations_items (
    id INT IDENTITY(1,1) PRIMARY KEY,
    technical_recommendation_id INT NOT NULL,
    item_id INT NULL,
    product_name NVARCHAR(255) NULL,
    model NVARCHAR(100) NULL,
    description NVARCHAR(MAX) NULL,
    quantity INT DEFAULT 1,
    unit_price DECIMAL(12,2) NULL,
    total_price DECIMAL(12,2) NULL,
    -- foreign keys moved to two-pass ALTER TABLE section at the end of this script
);
GO

-- TR_ITEMS (compat layer if code references tr_items)
CREATE TABLE crmdb.tr_items (
    id INT IDENTITY(1,1) PRIMARY KEY,
    tr_id INT NULL,
    item_id INT NULL,
    quantity INT NULL,
    -- foreign keys moved to two-pass ALTER TABLE section at the end of this script
);
GO

-- RFQs and related tables
CREATE TABLE crmdb.rfqs (
    id INT IDENTITY(1,1) PRIMARY KEY,
    rfq_number NVARCHAR(100) NULL,
    due_date DATE NULL,
    description NVARCHAR(MAX) NULL,
    payment_terms NVARCHAR(MAX) NULL,
    notes NVARCHAR(MAX) NULL,
    wo_id INT NULL,
    assignee INT NULL,
    stage_status NVARCHAR(50) NULL,
    sl_id INT NULL,
    account_id INT NULL,
    subtotal DECIMAL(12,2) NULL,
    vat DECIMAL(12,2) NULL,
    grand_total DECIMAL(12,2) NULL,
    created_at DATETIME2 DEFAULT SYSUTCDATETIME(),
    created_by INT NULL,
    updated_at DATETIME2 DEFAULT SYSUTCDATETIME(),
    updated_by INT NULL,
    -- foreign keys moved to two-pass ALTER TABLE section at the end of this script
);
GO

CREATE TABLE crmdb.rfq_items (
    id INT IDENTITY(1,1) PRIMARY KEY,
    rfq_id INT NOT NULL,
    item_id INT NULL,
    item_external_id BIGINT NULL,
    selected_vendor INT NULL,
    lead_time NVARCHAR(100) NULL,
    quantity INT NOT NULL DEFAULT 1,
    unit_price DECIMAL(12,2) NULL,
    -- foreign keys moved to two-pass ALTER TABLE section at the end of this script
);
GO

CREATE TABLE crmdb.rfq_vendors (
    id INT IDENTITY(1,1) PRIMARY KEY,
    rfq_id INT NOT NULL,
    vendor_id INT NULL,
    vendor_external_id INT NULL,
    valid_until DATE NULL,
    payment_terms NVARCHAR(MAX) NULL,
    notes NVARCHAR(MAX) NULL,
    -- foreign keys moved to two-pass ALTER TABLE section at the end of this script
);
GO

CREATE TABLE crmdb.rfq_quotations (
    id INT IDENTITY(1,1) PRIMARY KEY,
    rfq_id INT NOT NULL,
    item_id INT NULL,
    item_external_id BIGINT NULL,
    vendor_id INT NULL,
    vendor_external_id INT NULL,
    lead_time INT NULL,
    unit_price DECIMAL(12,2) NULL,
    is_selected BIT DEFAULT 0,
    quantity INT NOT NULL DEFAULT 1,
    -- foreign keys moved to two-pass ALTER TABLE section at the end of this script
);
GO

-- QUOTATIONS (application-level aggregated quotations)
CREATE TABLE crmdb.quotations (
    id INT IDENTITY(1,1) PRIMARY KEY,
        quot_number NVARCHAR(50) NULL,
    rfq_id INT NULL,
    tr_id INT NULL,
    wo_id INT NULL,
    account_id INT NULL,
    assignee INT NULL,
    created_at DATETIME2 DEFAULT SYSUTCDATETIME(),
    created_by INT NULL,
    updated_at DATETIME2 DEFAULT SYSUTCDATETIME(),
    updated_by INT NULL,
    -- foreign keys moved to two-pass ALTER TABLE section at the end of this script
);
GO

-- Indexes (examples: add indexes you expect to query often)
CREATE INDEX IDX_items_part_number ON crmdb.items(part_number);
CREATE INDEX IDX_vendors_name ON crmdb.vendors(name);
CREATE INDEX IDX_rfqs_rfq_number ON crmdb.rfqs(rfq_number);
CREATE INDEX IDX_rfq_items_rfqid ON crmdb.rfq_items(rfq_id);
CREATE INDEX IDX_rfq_vendors_rfqid ON crmdb.rfq_vendors(rfq_id);
CREATE INDEX IDX_rfq_quotations_rfqid ON crmdb.rfq_quotations(rfq_id);
-- === Two-pass foreign key creation: add all FK constraints after all tables exist ===
-- This prevents creation-order or circular dependency errors when running the script end-to-end.

-- Users -> roles, departments, statuses
IF NOT EXISTS (SELECT * FROM sys.foreign_keys WHERE name = 'FK_users_role' AND parent_object_id = OBJECT_ID('crmdb.users'))
BEGIN
    ALTER TABLE crmdb.users ADD CONSTRAINT FK_users_role FOREIGN KEY (role_id) REFERENCES crmdb.roles(id) ON DELETE SET NULL;
END
IF NOT EXISTS (SELECT * FROM sys.foreign_keys WHERE name = 'FK_users_department' AND parent_object_id = OBJECT_ID('crmdb.users'))
BEGIN
    ALTER TABLE crmdb.users ADD CONSTRAINT FK_users_department FOREIGN KEY (department_id) REFERENCES crmdb.departments(id) ON DELETE SET NULL;
END
IF NOT EXISTS (SELECT * FROM sys.foreign_keys WHERE name = 'FK_users_status' AND parent_object_id = OBJECT_ID('crmdb.users'))
BEGIN
    ALTER TABLE crmdb.users ADD CONSTRAINT FK_users_status FOREIGN KEY (status_id) REFERENCES crmdb.statuses(id) ON DELETE SET NULL;
END

-- Accounts -> account lookups and user references
IF NOT EXISTS (SELECT * FROM sys.foreign_keys WHERE name = 'FK_accounts_department' AND parent_object_id = OBJECT_ID('crmdb.accounts'))
BEGIN
    ALTER TABLE crmdb.accounts ADD CONSTRAINT FK_accounts_department FOREIGN KEY (department_id) REFERENCES crmdb.account_departments(id) ON DELETE SET NULL;
END
IF NOT EXISTS (SELECT * FROM sys.foreign_keys WHERE name = 'FK_accounts_industry' AND parent_object_id = OBJECT_ID('crmdb.accounts'))
BEGIN
    ALTER TABLE crmdb.accounts ADD CONSTRAINT FK_accounts_industry FOREIGN KEY (industry_id) REFERENCES crmdb.account_industries(id) ON DELETE SET NULL;
END
IF NOT EXISTS (SELECT * FROM sys.foreign_keys WHERE name = 'FK_accounts_product' AND parent_object_id = OBJECT_ID('crmdb.accounts'))
BEGIN
    ALTER TABLE crmdb.accounts ADD CONSTRAINT FK_accounts_product FOREIGN KEY (product_id) REFERENCES crmdb.account_product_brands(id) ON DELETE SET NULL;
END
IF NOT EXISTS (SELECT * FROM sys.foreign_keys WHERE name = 'FK_accounts_prepared_by' AND parent_object_id = OBJECT_ID('crmdb.accounts'))
BEGIN
    ALTER TABLE crmdb.accounts ADD CONSTRAINT FK_accounts_prepared_by FOREIGN KEY (prepared_by) REFERENCES crmdb.users(id) ON DELETE SET NULL;
END
IF NOT EXISTS (SELECT * FROM sys.foreign_keys WHERE name = 'FK_accounts_noted_by' AND parent_object_id = OBJECT_ID('crmdb.accounts'))
BEGIN
    ALTER TABLE crmdb.accounts ADD CONSTRAINT FK_accounts_noted_by FOREIGN KEY (noted_by) REFERENCES crmdb.users(id) ON DELETE SET NULL;
END
IF NOT EXISTS (SELECT * FROM sys.foreign_keys WHERE name = 'FK_accounts_approved_by' AND parent_object_id = OBJECT_ID('crmdb.accounts'))
BEGIN
    ALTER TABLE crmdb.accounts ADD CONSTRAINT FK_accounts_approved_by FOREIGN KEY (approved_by) REFERENCES crmdb.users(id) ON DELETE SET NULL;
END
IF NOT EXISTS (SELECT * FROM sys.foreign_keys WHERE name = 'FK_accounts_received_by' AND parent_object_id = OBJECT_ID('crmdb.accounts'))
BEGIN
    ALTER TABLE crmdb.accounts ADD CONSTRAINT FK_accounts_received_by FOREIGN KEY (received_by) REFERENCES crmdb.users(id) ON DELETE SET NULL;
END
IF NOT EXISTS (SELECT * FROM sys.foreign_keys WHERE name = 'FK_accounts_acknowledged_by' AND parent_object_id = OBJECT_ID('crmdb.accounts'))
BEGIN
    ALTER TABLE crmdb.accounts ADD CONSTRAINT FK_accounts_acknowledged_by FOREIGN KEY (acknowledged_by) REFERENCES crmdb.users(id) ON DELETE SET NULL;
END

-- NAEF -> account lookups
IF NOT EXISTS (SELECT * FROM sys.foreign_keys WHERE name = 'FK_naef_department' AND parent_object_id = OBJECT_ID('crmdb.naef'))
BEGIN
    ALTER TABLE crmdb.naef ADD CONSTRAINT FK_naef_department FOREIGN KEY (department_id) REFERENCES crmdb.account_departments(id) ON DELETE SET NULL;
END
IF NOT EXISTS (SELECT * FROM sys.foreign_keys WHERE name = 'FK_naef_industry' AND parent_object_id = OBJECT_ID('crmdb.naef'))
BEGIN
    ALTER TABLE crmdb.naef ADD CONSTRAINT FK_naef_industry FOREIGN KEY (industry_id) REFERENCES crmdb.account_industries(id) ON DELETE SET NULL;
END
IF NOT EXISTS (SELECT * FROM sys.foreign_keys WHERE name = 'FK_naef_brand' AND parent_object_id = OBJECT_ID('crmdb.naef'))
BEGIN
    ALTER TABLE crmdb.naef ADD CONSTRAINT FK_naef_brand FOREIGN KEY (product_brand_id) REFERENCES crmdb.account_product_brands(id) ON DELETE SET NULL;
END

-- naef -> workorders (wo_id)
IF NOT EXISTS (SELECT * FROM sys.foreign_keys WHERE name = 'FK_naef_wo' AND parent_object_id = OBJECT_ID('crmdb.naef'))
BEGIN
    ALTER TABLE crmdb.naef ADD CONSTRAINT FK_naef_wo FOREIGN KEY (wo_id) REFERENCES crmdb.workorders(id) ON DELETE SET NULL;
END

-- Workorders -> accounts, naef, users
IF NOT EXISTS (SELECT * FROM sys.foreign_keys WHERE name = 'FK_workorders_account' AND parent_object_id = OBJECT_ID('crmdb.workorders'))
BEGIN
    ALTER TABLE crmdb.workorders ADD CONSTRAINT FK_workorders_account FOREIGN KEY (account_id) REFERENCES crmdb.accounts(id) ON DELETE SET NULL;
END
IF NOT EXISTS (SELECT * FROM sys.foreign_keys WHERE name = 'FK_workorders_naef' AND parent_object_id = OBJECT_ID('crmdb.workorders'))
BEGIN
    ALTER TABLE crmdb.workorders ADD CONSTRAINT FK_workorders_naef FOREIGN KEY (naef_id) REFERENCES crmdb.naef(id) ON DELETE SET NULL;
END
IF NOT EXISTS (SELECT * FROM sys.foreign_keys WHERE name = 'FK_workorders_created_by' AND parent_object_id = OBJECT_ID('crmdb.workorders'))
BEGIN
    ALTER TABLE crmdb.workorders ADD CONSTRAINT FK_workorders_created_by FOREIGN KEY (created_by) REFERENCES crmdb.users(id) ON DELETE SET NULL;
END

-- Workflow stages -> workorders, users
IF NOT EXISTS (SELECT * FROM sys.foreign_keys WHERE name = 'FK_workflow_wo' AND parent_object_id = OBJECT_ID('crmdb.workflow_stages'))
BEGIN
    ALTER TABLE crmdb.workflow_stages ADD CONSTRAINT FK_workflow_wo FOREIGN KEY (wo_id) REFERENCES crmdb.workorders(id) ON DELETE NO ACTION;
END
IF NOT EXISTS (SELECT * FROM sys.foreign_keys WHERE name = 'FK_workflow_assigned_to' AND parent_object_id = OBJECT_ID('crmdb.workflow_stages'))
BEGIN
    ALTER TABLE crmdb.workflow_stages ADD CONSTRAINT FK_workflow_assigned_to FOREIGN KEY (assigned_to) REFERENCES crmdb.users(id) ON DELETE SET NULL;
END

-- Sales leads -> workorders, users, accounts
IF NOT EXISTS (SELECT * FROM sys.foreign_keys WHERE name = 'FK_sales_wo' AND parent_object_id = OBJECT_ID('crmdb.sales_leads'))
BEGIN
    ALTER TABLE crmdb.sales_leads ADD CONSTRAINT FK_sales_wo FOREIGN KEY (wo_id) REFERENCES crmdb.workorders(id) ON DELETE SET NULL;
END
IF NOT EXISTS (SELECT * FROM sys.foreign_keys WHERE name = 'FK_sales_assignee' AND parent_object_id = OBJECT_ID('crmdb.sales_leads'))
BEGIN
    ALTER TABLE crmdb.sales_leads ADD CONSTRAINT FK_sales_assignee FOREIGN KEY (assignee) REFERENCES crmdb.users(id) ON DELETE SET NULL;
END
IF NOT EXISTS (SELECT * FROM sys.foreign_keys WHERE name = 'FK_sales_account' AND parent_object_id = OBJECT_ID('crmdb.sales_leads'))
BEGIN
    ALTER TABLE crmdb.sales_leads ADD CONSTRAINT FK_sales_account FOREIGN KEY (account_id) REFERENCES crmdb.accounts(id) ON DELETE SET NULL;
END

-- Technical recommendations -> workorders, users, sales_leads, accounts
IF NOT EXISTS (SELECT * FROM sys.foreign_keys WHERE name = 'FK_tr_wo' AND parent_object_id = OBJECT_ID('crmdb.technical_recommendations'))
BEGIN
    ALTER TABLE crmdb.technical_recommendations ADD CONSTRAINT FK_tr_wo FOREIGN KEY (wo_id) REFERENCES crmdb.workorders(id) ON DELETE SET NULL;
END
IF NOT EXISTS (SELECT * FROM sys.foreign_keys WHERE name = 'FK_tr_assignee' AND parent_object_id = OBJECT_ID('crmdb.technical_recommendations'))
BEGIN
    ALTER TABLE crmdb.technical_recommendations ADD CONSTRAINT FK_tr_assignee FOREIGN KEY (assignee) REFERENCES crmdb.users(id) ON DELETE SET NULL;
END
IF NOT EXISTS (SELECT * FROM sys.foreign_keys WHERE name = 'FK_tr_sl' AND parent_object_id = OBJECT_ID('crmdb.technical_recommendations'))
BEGIN
    ALTER TABLE crmdb.technical_recommendations ADD CONSTRAINT FK_tr_sl FOREIGN KEY (sl_id) REFERENCES crmdb.sales_leads(id) ON DELETE SET NULL;
END
IF NOT EXISTS (SELECT * FROM sys.foreign_keys WHERE name = 'FK_tr_account' AND parent_object_id = OBJECT_ID('crmdb.technical_recommendations'))
BEGIN
    ALTER TABLE crmdb.technical_recommendations ADD CONSTRAINT FK_tr_account FOREIGN KEY (account_id) REFERENCES crmdb.accounts(id) ON DELETE SET NULL;
END

-- Technical recommendation items -> tr, items
IF NOT EXISTS (SELECT * FROM sys.foreign_keys WHERE name = 'FK_tri_tr' AND parent_object_id = OBJECT_ID('crmdb.technical_recommendations_items'))
BEGIN
    ALTER TABLE crmdb.technical_recommendations_items ADD CONSTRAINT FK_tri_tr FOREIGN KEY (technical_recommendation_id) REFERENCES crmdb.technical_recommendations(id) ON DELETE NO ACTION;
END
IF NOT EXISTS (SELECT * FROM sys.foreign_keys WHERE name = 'FK_tri_item' AND parent_object_id = OBJECT_ID('crmdb.technical_recommendations_items'))
BEGIN
    ALTER TABLE crmdb.technical_recommendations_items ADD CONSTRAINT FK_tri_item FOREIGN KEY (item_id) REFERENCES crmdb.items(id) ON DELETE SET NULL;
END

-- TR items compatibility table -> tr, items
IF NOT EXISTS (SELECT * FROM sys.foreign_keys WHERE name = 'FK_tritems_tr' AND parent_object_id = OBJECT_ID('crmdb.tr_items'))
BEGIN
    ALTER TABLE crmdb.tr_items ADD CONSTRAINT FK_tritems_tr FOREIGN KEY (tr_id) REFERENCES crmdb.technical_recommendations(id) ON DELETE NO ACTION;
END
IF NOT EXISTS (SELECT * FROM sys.foreign_keys WHERE name = 'FK_tritems_item' AND parent_object_id = OBJECT_ID('crmdb.tr_items'))
BEGIN
    ALTER TABLE crmdb.tr_items ADD CONSTRAINT FK_tritems_item FOREIGN KEY (item_id) REFERENCES crmdb.items(id) ON DELETE SET NULL;
END

-- RFQs and related tables
IF NOT EXISTS (SELECT * FROM sys.foreign_keys WHERE name = 'FK_rfqs_wo' AND parent_object_id = OBJECT_ID('crmdb.rfqs'))
BEGIN
    ALTER TABLE crmdb.rfqs ADD CONSTRAINT FK_rfqs_wo FOREIGN KEY (wo_id) REFERENCES crmdb.workorders(id) ON DELETE SET NULL;
END
IF NOT EXISTS (SELECT * FROM sys.foreign_keys WHERE name = 'FK_rfqs_assignee' AND parent_object_id = OBJECT_ID('crmdb.rfqs'))
BEGIN
    ALTER TABLE crmdb.rfqs ADD CONSTRAINT FK_rfqs_assignee FOREIGN KEY (assignee) REFERENCES crmdb.users(id) ON DELETE SET NULL;
END
IF NOT EXISTS (SELECT * FROM sys.foreign_keys WHERE name = 'FK_rfqs_sl' AND parent_object_id = OBJECT_ID('crmdb.rfqs'))
BEGIN
    ALTER TABLE crmdb.rfqs ADD CONSTRAINT FK_rfqs_sl FOREIGN KEY (sl_id) REFERENCES crmdb.sales_leads(id) ON DELETE SET NULL;
END
IF NOT EXISTS (SELECT * FROM sys.foreign_keys WHERE name = 'FK_rfqs_account' AND parent_object_id = OBJECT_ID('crmdb.rfqs'))
BEGIN
    ALTER TABLE crmdb.rfqs ADD CONSTRAINT FK_rfqs_account FOREIGN KEY (account_id) REFERENCES crmdb.accounts(id) ON DELETE SET NULL;
END
IF NOT EXISTS (SELECT * FROM sys.foreign_keys WHERE name = 'FK_rfqs_created_by' AND parent_object_id = OBJECT_ID('crmdb.rfqs'))
BEGIN
    ALTER TABLE crmdb.rfqs ADD CONSTRAINT FK_rfqs_created_by FOREIGN KEY (created_by) REFERENCES crmdb.users(id) ON DELETE SET NULL;
END
IF NOT EXISTS (SELECT * FROM sys.foreign_keys WHERE name = 'FK_rfqs_updated_by' AND parent_object_id = OBJECT_ID('crmdb.rfqs'))
BEGIN
    ALTER TABLE crmdb.rfqs ADD CONSTRAINT FK_rfqs_updated_by FOREIGN KEY (updated_by) REFERENCES crmdb.users(id) ON DELETE SET NULL;
END

-- RFQ items
IF NOT EXISTS (SELECT * FROM sys.foreign_keys WHERE name = 'FK_rfq_items_rfq' AND parent_object_id = OBJECT_ID('crmdb.rfq_items'))
BEGIN
    ALTER TABLE crmdb.rfq_items ADD CONSTRAINT FK_rfq_items_rfq FOREIGN KEY (rfq_id) REFERENCES crmdb.rfqs(id) ON DELETE NO ACTION;
END
IF NOT EXISTS (SELECT * FROM sys.foreign_keys WHERE name = 'FK_rfq_items_item' AND parent_object_id = OBJECT_ID('crmdb.rfq_items'))
BEGIN
    ALTER TABLE crmdb.rfq_items ADD CONSTRAINT FK_rfq_items_item FOREIGN KEY (item_id) REFERENCES crmdb.items(id) ON DELETE SET NULL;
END
IF NOT EXISTS (SELECT * FROM sys.foreign_keys WHERE name = 'FK_rfq_items_selected_vendor' AND parent_object_id = OBJECT_ID('crmdb.rfq_items'))
BEGIN
    ALTER TABLE crmdb.rfq_items ADD CONSTRAINT FK_rfq_items_selected_vendor FOREIGN KEY (selected_vendor) REFERENCES crmdb.vendors(id) ON DELETE SET NULL;
END

-- RFQ vendors
IF NOT EXISTS (SELECT * FROM sys.foreign_keys WHERE name = 'FK_rfq_vendors_rfq' AND parent_object_id = OBJECT_ID('crmdb.rfq_vendors'))
BEGIN
    ALTER TABLE crmdb.rfq_vendors ADD CONSTRAINT FK_rfq_vendors_rfq FOREIGN KEY (rfq_id) REFERENCES crmdb.rfqs(id) ON DELETE NO ACTION;
END
IF NOT EXISTS (SELECT * FROM sys.foreign_keys WHERE name = 'FK_rfq_vendors_vendor' AND parent_object_id = OBJECT_ID('crmdb.rfq_vendors'))
BEGIN
    ALTER TABLE crmdb.rfq_vendors ADD CONSTRAINT FK_rfq_vendors_vendor FOREIGN KEY (vendor_id) REFERENCES crmdb.vendors(id) ON DELETE SET NULL;
END

-- RFQ quotations
IF NOT EXISTS (SELECT * FROM sys.foreign_keys WHERE name = 'FK_rfq_quotations_rfq' AND parent_object_id = OBJECT_ID('crmdb.rfq_quotations'))
BEGIN
    ALTER TABLE crmdb.rfq_quotations ADD CONSTRAINT FK_rfq_quotations_rfq FOREIGN KEY (rfq_id) REFERENCES crmdb.rfqs(id) ON DELETE NO ACTION;
END
IF NOT EXISTS (SELECT * FROM sys.foreign_keys WHERE name = 'FK_rfq_quotations_item' AND parent_object_id = OBJECT_ID('crmdb.rfq_quotations'))
BEGIN
    ALTER TABLE crmdb.rfq_quotations ADD CONSTRAINT FK_rfq_quotations_item FOREIGN KEY (item_id) REFERENCES crmdb.items(id) ON DELETE SET NULL;
END
IF NOT EXISTS (SELECT * FROM sys.foreign_keys WHERE name = 'FK_rfq_quotations_vendor' AND parent_object_id = OBJECT_ID('crmdb.rfq_quotations'))
BEGIN
    ALTER TABLE crmdb.rfq_quotations ADD CONSTRAINT FK_rfq_quotations_vendor FOREIGN KEY (vendor_id) REFERENCES crmdb.vendors(id) ON DELETE SET NULL;
END

-- Quotations
IF NOT EXISTS (SELECT * FROM sys.foreign_keys WHERE name = 'FK_quotations_rfq' AND parent_object_id = OBJECT_ID('crmdb.quotations'))
BEGIN
    ALTER TABLE crmdb.quotations ADD CONSTRAINT FK_quotations_rfq FOREIGN KEY (rfq_id) REFERENCES crmdb.rfqs(id) ON DELETE NO ACTION;
END
IF NOT EXISTS (SELECT * FROM sys.foreign_keys WHERE name = 'FK_quotations_tr' AND parent_object_id = OBJECT_ID('crmdb.quotations'))
BEGIN
    ALTER TABLE crmdb.quotations ADD CONSTRAINT FK_quotations_tr FOREIGN KEY (tr_id) REFERENCES crmdb.technical_recommendations(id) ON DELETE SET NULL;
END
IF NOT EXISTS (SELECT * FROM sys.foreign_keys WHERE name = 'FK_quotations_wo' AND parent_object_id = OBJECT_ID('crmdb.quotations'))
BEGIN
    ALTER TABLE crmdb.quotations ADD CONSTRAINT FK_quotations_wo FOREIGN KEY (wo_id) REFERENCES crmdb.workorders(id) ON DELETE SET NULL;
END
IF NOT EXISTS (SELECT * FROM sys.foreign_keys WHERE name = 'FK_quotations_account' AND parent_object_id = OBJECT_ID('crmdb.quotations'))
BEGIN
    ALTER TABLE crmdb.quotations ADD CONSTRAINT FK_quotations_account FOREIGN KEY (account_id) REFERENCES crmdb.accounts(id) ON DELETE SET NULL;
END
IF NOT EXISTS (SELECT * FROM sys.foreign_keys WHERE name = 'FK_quotations_assignee' AND parent_object_id = OBJECT_ID('crmdb.quotations'))
BEGIN
    ALTER TABLE crmdb.quotations ADD CONSTRAINT FK_quotations_assignee FOREIGN KEY (assignee) REFERENCES crmdb.users(id) ON DELETE SET NULL;
END
IF NOT EXISTS (SELECT * FROM sys.foreign_keys WHERE name = 'FK_quotations_created_by' AND parent_object_id = OBJECT_ID('crmdb.quotations'))
BEGIN
    ALTER TABLE crmdb.quotations ADD CONSTRAINT FK_quotations_created_by FOREIGN KEY (created_by) REFERENCES crmdb.users(id) ON DELETE SET NULL;
END
-- Additional schema refinements
-- 1) Unique constraints for identifiers
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'UQ_tr_tr_number')
BEGIN
    ALTER TABLE crmdb.technical_recommendations ADD CONSTRAINT UQ_tr_tr_number UNIQUE (tr_number);
END

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'UQ_rfqs_rfq_number')
BEGIN
    ALTER TABLE crmdb.rfqs ADD CONSTRAINT UQ_rfqs_rfq_number UNIQUE (rfq_number);
END

-- 2) Check constraints and non-negative price checks
IF NOT EXISTS (SELECT * FROM sys.check_constraints WHERE name = 'CHK_items_unit_price_nonnegative')
BEGIN
    ALTER TABLE crmdb.items ADD CONSTRAINT CHK_items_unit_price_nonnegative CHECK (unit_price IS NULL OR unit_price >= 0);
END

IF NOT EXISTS (SELECT * FROM sys.check_constraints WHERE name = 'CHK_rfq_items_quantity_positive')
BEGIN
    ALTER TABLE crmdb.rfq_items ADD CONSTRAINT CHK_rfq_items_quantity_positive CHECK (quantity > 0);
END

IF NOT EXISTS (SELECT * FROM sys.check_constraints WHERE name = 'CHK_rfq_items_unit_price_nonnegative')
BEGIN
    ALTER TABLE crmdb.rfq_items ADD CONSTRAINT CHK_rfq_items_unit_price_nonnegative CHECK (unit_price IS NULL OR unit_price >= 0);
END

IF NOT EXISTS (SELECT * FROM sys.check_constraints WHERE name = 'CHK_rfq_quotations_quantity_positive')
BEGIN
    ALTER TABLE crmdb.rfq_quotations ADD CONSTRAINT CHK_rfq_quotations_quantity_positive CHECK (quantity > 0);
END

IF NOT EXISTS (SELECT * FROM sys.check_constraints WHERE name = 'CHK_rfq_quotations_unit_price_nonnegative')
BEGIN
    ALTER TABLE crmdb.rfq_quotations ADD CONSTRAINT CHK_rfq_quotations_unit_price_nonnegative CHECK (unit_price IS NULL OR unit_price >= 0);
END

-- 3) Indexes on external id columns for faster lookups
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IDX_rfq_items_item_external_id')
BEGIN
    CREATE INDEX IDX_rfq_items_item_external_id ON crmdb.rfq_items(item_external_id);
END

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IDX_rfq_vendors_vendor_external_id')
BEGIN
    CREATE INDEX IDX_rfq_vendors_vendor_external_id ON crmdb.rfq_vendors(vendor_external_id);
END

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IDX_rfq_quotations_item_vendor_external')
BEGIN
    CREATE INDEX IDX_rfq_quotations_item_vendor_external ON crmdb.rfq_quotations(item_external_id, vendor_external_id);
END

-- Enforce unique quotation numbers when present (supports PREFIX-YYYY-XXXX format)
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'UQ_quotations_quot_number')
BEGIN
    CREATE UNIQUE INDEX UQ_quotations_quot_number ON crmdb.quotations(quot_number) WHERE quot_number IS NOT NULL;
END

-- 4) Optional: Enforce JSON columns where used (ISJSON checks) — add as a check if you expect JSON
-- Example: enforce permissions to be valid JSON if provided
IF EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA='crmdb' AND TABLE_NAME='users' AND COLUMN_NAME='permissions')
BEGIN
    IF NOT EXISTS (SELECT * FROM sys.check_constraints WHERE name = 'CHK_users_permissions_isjson')
    BEGIN
        ALTER TABLE crmdb.users ADD CONSTRAINT CHK_users_permissions_isjson CHECK (permissions IS NULL OR ISJSON(permissions) = 1);
    END
END

-- 5) Triggers to auto-update updated_at on changes (simple pattern)
IF OBJECT_ID('crmdb.trg_update_timestamp_generic', 'TR') IS NULL
BEGIN
    EXEC('CREATE TRIGGER crmdb.trg_update_timestamp_generic
    ON crmdb.rfqs
    AFTER UPDATE
    AS
    BEGIN
        SET NOCOUNT ON;
        UPDATE crmdb.rfqs SET updated_at = SYSUTCDATETIME() WHERE id IN (SELECT DISTINCT id FROM inserted);
    END');
END

-- You can create similar triggers per-table or handle updated_at in application logic.
GO

-- 6) Sequences and default generators for *_number formats
-- Create per-entity sequences used for the iterative part (XXXX)
-- Number generation and per-year reset are implemented in `dev-ops/yearly-seqs.sql`.
-- That file creates a per-year counter table, an atomic stored procedure, and AFTER INSERT triggers
-- that will populate the *_number columns with values like PREFIX-YYYY-XXXX, resetting the counter each year.
-- Run `dev-ops/yearly-seqs.sql` after running this DDL to enable per-year numbering.
