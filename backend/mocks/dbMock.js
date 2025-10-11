// dbMock.js
import { newDb } from "pg-mem";
import { toJsonbArray } from "../helper/utils.js";

// import mock data...
import { users } from "./usersMock.js";
import { roles } from "./rolesMock.js";
import { departments } from "./departmentsMock.js";
import { statuses } from "./statusesMock.js";
import { accounts } from "./accountsMock.js";
import { accountsIndustries } from "./accountsIndustriesMock.js";
import { accountsProductBrands } from "./accountsProductBrandsMock.js";
import { accountsDepartments } from "./accountsDepartmentsMock.js";
import { workorders } from "./workordersMock.js";
import { salesLeads } from "./salesleadsMock.js";
import { technicalRecommendations } from "./technicalrecommendationsMock.js";
import { rfqs } from "./rfqsMock.js";
import { rfqItems } from "./rfqItemsMock.js";
import { rfqVendors } from "./rfqVendorsMock.js";
import { vendors } from "./vendorsMock.js";
import { items } from "./itemsMock.js";
import { rfqQuotations } from "./rfqQuotations.js";
import { workflowStages } from "./workflowstagesMocks.js";

let pool;

console.log("Loading database...");


console.log("⚡ Using pg-mem (in-memory Postgres)");
const mem = newDb({ autoCreateForeignKeyIndices: true });
const adapter = mem.adapters.createPg();

// Users, Roles, Departments, Statuses Table
mem.public.none(`

  -- ROLES TABLE
  CREATE TABLE roles (
    id SERIAL PRIMARY KEY,
    role_name TEXT
  );

  -- DEPARTMENTS TABLE
  CREATE TABLE departments (
    id SERIAL PRIMARY KEY,
    department_name TEXT
  );

  -- STATUSES TABLE
  CREATE TABLE statuses (
    id SERIAL PRIMARY KEY,
    status_name TEXT
  );

  -- USERS TABLE
  CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    avatar_url VARCHAR (255),
    first_name VARCHAR (100),
    last_name VARCHAR (100),
    username VARCHAR (100) UNIQUE,
    email VARCHAR (255) UNIQUE,
    phone_number VARCHAR (20),
    role_id INT REFERENCES roles(id) ON DELETE SET NULL,
    department_id INT REFERENCES departments(id) ON DELETE SET NULL,
    status_id INT REFERENCES statuses(id) ON DELETE SET NULL,
    permissions JSONB,
    password_hash VARCHAR (255),
    joined_date TIMESTAMP,
    updated_at TIMESTAMP,
    last_login TIMESTAMP,
    created_by VARCHAR (100)
  );
`);

mem.public.none(`
  CREATE TABLE vendors (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    contact_person VARCHAR(100),
    phone VARCHAR(20),
    email VARCHAR(100),
    address TEXT
  );
`);

mem.public.none(`
  CREATE TABLE items (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    model VARCHAR(100),
    brand VARCHAR(100),
    part_number VARCHAR(100),
    lead_time VARCHAR(100),
    description TEXT,
    unit VARCHAR(50),
    unit_price NUMERIC(12, 2)
  );
`);

// Accounts Table
mem.public.none(`
  -- ACCOUNT INDUSTRY TABLE
  CREATE TABLE account_industries (
    id SERIAL PRIMARY KEY,
    industry_name TEXT
  );

  -- ACCOUNT PRODUCT BRAND TABLE
  CREATE TABLE account_product_brands (
    id SERIAL PRIMARY KEY,
    product_brand_name TEXT
  );

  -- ACCOUNT DEPARTMENT TABLE
  CREATE TABLE account_departments (
    id SERIAL PRIMARY KEY,
    department_name TEXT
  );

  -- ACCOUNTS TABLE (commented out for now)
  CREATE TABLE accounts (
  id SERIAL PRIMARY KEY,
  naef_number VARCHAR(20) UNIQUE,
  stage_status VARCHAR(20) DEFAULT 'draft',
    ref_number VARCHAR(20) UNIQUE,
    date_created TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    requested_by VARCHAR(100),
    designation VARCHAR(100),
    department_id INT REFERENCES account_departments(id) ON DELETE SET NULL,
    validity_period VARCHAR(50),
    due_date DATE,
    account_name VARCHAR(255) NOT NULL,
    contract_period VARCHAR(50),
    industry_id INT REFERENCES account_industries(id) ON DELETE SET NULL,
    account_designation VARCHAR(100),
    product_id INT REFERENCES account_product_brands(id) ON DELETE SET NULL,
    contact_number VARCHAR(20),
    location VARCHAR(255),
    email_address VARCHAR(100),
    address TEXT,
    buyer_incharge VARCHAR(100),
    trunkline VARCHAR(20),
    contract_number VARCHAR(50),
    process VARCHAR(100),
    secondary_email_address VARCHAR(100),
    machines TEXT,
    reason_to_apply TEXT,
    automotive_section TEXT,
    source_of_inquiry VARCHAR(100),
    commodity TEXT,
    business_activity VARCHAR(100),
    model VARCHAR(100),
    annual_target_sales NUMERIC(12, 2),
    population TEXT,
    source_of_target VARCHAR(100),
    existing_bellows TEXT,
    products_to_order TEXT,
    model_under TEXT,
    target_areas TEXT,
    analysis TEXT,
    from_date DATE,
    to_date DATE,
    activity_period VARCHAR(50),
    prepared_by INT REFERENCES users(id) ON DELETE SET NULL,
    noted_by INT REFERENCES users(id) ON DELETE SET NULL,
    approved_by INT REFERENCES users(id) ON DELETE SET NULL,
    received_by INT REFERENCES users(id) ON DELETE SET NULL,
    acknowledged_by INT REFERENCES users(id) ON DELETE SET NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_naef BOOLEAN DEFAULT FALSE
  );
`);

// CREATE NAEF TABLE
mem.public.none(`
  CREATE TABLE naef (
    id SERIAL PRIMARY KEY,
    department_id INT REFERENCES account_departments(id) ON DELETE SET NULL,
    industry_id INT REFERENCES account_industries(id) ON DELETE SET NULL,
    product_brand_id INT REFERENCES account_product_brands(id) ON DELETE SET NULL,
    naef_number VARCHAR(20) UNIQUE NOT NULL,
    account_name VARCHAR(100) NOT NULL,
    contact_person VARCHAR(100),
    contact_number VARCHAR(20),
    contact_email VARCHAR(100),
    project_name VARCHAR(100),
    project_description TEXT,
    project_value NUMERIC(12,2),
    project_start_date DATE,
    project_end_date DATE,
    wo_id INT,
    assignee INT REFERENCES users(id) ON DELETE SET NULL,
    stage_status VARCHAR(20) DEFAULT 'draft',
    title VARCHAR(255) DEFAULT '',
    week_number INT NOT NULL,
    update_description TEXT,
    probability VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  );
`);

// Workorders Table
mem.public.none(`
  -- WORKORDERS TABLE
  CREATE TABLE workorders (
  id SERIAL PRIMARY KEY,
  wo_number VARCHAR(20) UNIQUE,
  work_description TEXT NOT NULL,
  assignee INT REFERENCES users(id) ON DELETE SET NULL,
  status VARCHAR(50) DEFAULT 'Pending',
  stage_status VARCHAR(20) DEFAULT 'draft',
    
    -- Account Info
    account_id INT REFERENCES accounts(id) ON DELETE SET NULL,
    naef_id INT REFERENCES naef(id) ON DELETE SET NULL,
    is_new_account BOOLEAN DEFAULT FALSE,
    mode VARCHAR(50),
    contact_person VARCHAR(100),
    contact_number VARCHAR(20),

    -- Dates
    wo_date DATE NOT NULL,
    due_date DATE,
    from_time TIME,
    to_time TIME,
    actual_date DATE,
    actual_from_time TIME,
    actual_to_time TIME,

    -- Details
    objective TEXT,
    instruction TEXT,
    target_output TEXT,

    -- Flags for Sales Lead Type
    is_fsl BOOLEAN DEFAULT FALSE,
    is_esl BOOLEAN DEFAULT FALSE,

    -- Metadata
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by INT REFERENCES users(id) ON DELETE SET NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  );
`);

mem.public.none(`
  ALTER TABLE naef
    ADD CONSTRAINT fk_wo_id FOREIGN KEY (wo_id) REFERENCES workorders(id) ON DELETE SET NULL;
`);

// Workflow Stages Table
mem.public.none(`
  -- WORKFLOW STAGES TABLE
  CREATE TABLE workflow_stages (
    id SERIAL PRIMARY KEY,
    wo_id INT NOT NULL REFERENCES workorders(id) ON DELETE CASCADE,
    stage_name VARCHAR(50) NOT NULL,  -- e.g. Work Order, Sales Lead, TR, RFQ, NAEF, Quotation
    status VARCHAR(50) DEFAULT 'Pending', -- Pending, Approved, Rejected, In Progress
    assigned_to INT REFERENCES users(id) ON DELETE SET NULL,
    notified BOOLEAN DEFAULT FALSE,
    remarks TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  );
`);

// Sales Leads Table
mem.public.none(`
  -- SALES LEADS TABLE (based on your requirements)
  CREATE TABLE sales_leads (
    id SERIAL PRIMARY KEY,
  sl_number VARCHAR(20) UNIQUE NOT NULL,
  wo_id INT NOT NULL REFERENCES workorders(id) ON DELETE SET NULL,
  assignee INT REFERENCES users(id) ON DELETE SET NULL,
  account_id INT REFERENCES accounts(id) ON DELETE SET NULL,
  stage_status VARCHAR(20) DEFAULT 'draft',
  end_user VARCHAR(100),
  department VARCHAR(75),
  contact_number VARCHAR(20),
  sales_stage VARCHAR(30) NOT NULL DEFAULT 'Sales Lead',
  designation VARCHAR(50),
  immediate_support VARCHAR(100),
  email_address VARCHAR(100),

  -- Application Details
  category VARCHAR(50),
  application VARCHAR(50),
  machine VARCHAR(100),
  machine_process VARCHAR(50),
  needed_product VARCHAR(100),
  existing_specifications TEXT,
  issues_with_existing TEXT,
  consideration TEXT,

  -- Support and Quotation
  support_needed TEXT,
  urgency VARCHAR(100) DEFAULT 'Medium',
  model_to_quote VARCHAR(100),
  quantity INT DEFAULT 1,
  quantity_attention VARCHAR(100),
  qr_cc VARCHAR(100),
  qr_email_to TEXT,
  next_followup_date DATE,
  due_date DATE,
  done_date DATE,

  -- Field Sales Lead Details
  account VARCHAR(100),
  industry VARCHAR(50),
  se_id INT REFERENCES users(id),
  sales_plan_rep VARCHAR(100),
  fsl_ref VARCHAR(20),
  fsl_date DATE DEFAULT CURRENT_DATE,
  fsl_time TIME,
  fsl_location VARCHAR(100),
  ww VARCHAR(20),

  -- Customer Actual/Setup
  requirement TEXT,
  requirement_category TEXT,
  deadline DATE,
  product_application TEXT,
  customer_issues TEXT,
  existing_setup_items TEXT,
  customer_suggested_setup TEXT,
  remarks TEXT,
    
  -- File uploads (store file metadata, files in separate table or storage)
  actual_picture JSONB,
  draft_design_layout JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  );

  -- SALES LEAD SUPPORT NEEDED (if multi-select, normalized)
  CREATE TABLE sales_lead_support_needed (
    sales_lead_id INT REFERENCES sales_leads(id) ON DELETE CASCADE,
    support_type VARCHAR(50) NOT NULL,
    PRIMARY KEY (sales_lead_id, support_type)
  );

  -- SALES LEAD FILES (if you want to store files separately)
  CREATE TABLE sales_lead_files (
    id SERIAL PRIMARY KEY,
    sales_lead_id INT REFERENCES sales_leads(id) ON DELETE CASCADE,
    file_type VARCHAR(30), -- 'actual_picture', 'draft_design_layout'
    file_url VARCHAR(255) NOT NULL,
    file_name VARCHAR(100),
    file_size INT,
    uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  );
`);

// Technical Recommendations Table
mem.public.none(`
  -- TECHNICAL RECOMMENDATIONS TABLE
  CREATE TABLE technical_recommendations (
  id SERIAL PRIMARY KEY,
  wo_id INT REFERENCES workorders(id) ON DELETE SET NULL,
  assignee INT NOT NULL REFERENCES users(id) ON DELETE SET NULL,
  tr_number VARCHAR(20) UNIQUE NOT NULL, -- TR-YYYY-NNNN, auto-generated
  status VARCHAR(50) DEFAULT 'Open',
  stage_status VARCHAR(20) DEFAULT 'draft',
  priority VARCHAR(50) DEFAULT 'Medium',
  title VARCHAR(255) DEFAULT '',
  sl_id INT REFERENCES sales_leads(id) ON DELETE SET NULL,
  account_id INT REFERENCES accounts(id) ON DELETE SET NULL,
  contact_person VARCHAR(100),
  contact_number VARCHAR(20),
  contact_email VARCHAR(100),
  current_system TEXT,
  current_system_issues TEXT,
  proposed_solution TEXT,
  technical_justification TEXT,
  installation_requirements TEXT,
  training_requirements TEXT,
  maintenance_requirements TEXT,
  attachments JSONB,
  additional_notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_by INT REFERENCES users(id) ON DELETE SET NULL,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  );

  -- TECHNICAL RECOMMENDATION PRODUCTS
  CREATE TABLE technical_recommendation_products (
    id SERIAL PRIMARY KEY,
    technical_recommendation_id INT REFERENCES technical_recommendations(id) ON DELETE CASCADE,
    product_name VARCHAR(100) NOT NULL,
    model VARCHAR(100),
    description TEXT,
    quantity INT NOT NULL DEFAULT 1,
    unit_price NUMERIC(12, 2),
    total_price NUMERIC(12, 2)
  );
`);

mem.public.none(`
  CREATE TABLE tr_items (
    id SERIAL PRIMARY KEY,
    tr_id INT REFERENCES technical_recommendations(id) ON DELETE CASCADE,
    item_id INT REFERENCES items(id) ON DELETE SET NULL,
    quantity INT
  );
`);

// RFQs Table
mem.public.none(`
  CREATE TABLE rfqs (
      id SERIAL PRIMARY KEY,
      rfq_number VARCHAR(50) NOT NULL,
      due_date DATE,
      description TEXT,
      payment_terms TEXT,
      notes TEXT,
      wo_id INT REFERENCES workorders(id),
      assignee INT REFERENCES users(id),
      stage_status VARCHAR(50),
      sl_id INT REFERENCES sales_leads(id),
      account_id INT REFERENCES accounts(id) ON DELETE SET NULL,
      subtotal NUMERIC(12,2),
      vat NUMERIC(12,2),
      grand_total NUMERIC(12,2),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      created_by INT REFERENCES users(id),
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_by INT REFERENCES users(id)
  );

  -- RFQ Items table
  CREATE TABLE rfq_items (
      id SERIAL PRIMARY KEY,
      rfq_id INT REFERENCES rfqs(id) ON DELETE CASCADE,
    item_id INT REFERENCES items(id),
    -- External MSSQL stock id (if this item references an inventory stock from MSSQL)
    item_external_id BIGINT,
      selected_vendor INT REFERENCES vendors(id),
      lead_time VARCHAR(100),
      quantity INT NOT NULL,
      unit_price NUMERIC(12,2)
  );

  -- RFQ Vendors table
  CREATE TABLE rfq_vendors (
      id SERIAL PRIMARY KEY,
      rfq_id INT REFERENCES rfqs(id) ON DELETE CASCADE,
    vendor_id INT REFERENCES vendors(id),
    -- External MSSQL vendor id (spidb.vendor.Id) when vendor is sourced from MSSQL
    vendor_external_id INT,
      valid_until DATE,
      payment_terms TEXT,
      notes TEXT
  );

  -- RFQ Quotations table
  CREATE TABLE rfq_quotations (
      id SERIAL PRIMARY KEY,
      rfq_id INT REFERENCES rfqs(id) ON DELETE CASCADE,
    item_id INT REFERENCES items(id),
    item_external_id BIGINT,
    vendor_id INT REFERENCES vendors(id),
    vendor_external_id INT,
    lead_time INT,
    unit_price NUMERIC(12, 2),
    is_selected BOOLEAN DEFAULT FALSE,
    quantity INT NOT NULL DEFAULT 1
);
`);

// Quotations Table
mem.public.none(`
  -- Quotations table
  CREATE TABLE quotations (
      id SERIAL PRIMARY KEY,
      rfq_id INT REFERENCES rfqs(id) ON DELETE CASCADE,
      tr_id INT REFERENCES technical_recommendations(id),
      wo_id INT REFERENCES workorders(id),
      account_id INT REFERENCES accounts(id) ON DELETE SET NULL,
      assignee INT REFERENCES users(id),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      created_by INT REFERENCES users(id),
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_by INT REFERENCES users(id)
);
`);

// seed data ...
const esc = (val) =>
  typeof val === "string" ? val.replace(/'/g, "''") : val;

for (const r of roles) {
  mem.public.none(
    `INSERT INTO roles (role_name) VALUES ('${esc(r.roleName)}')`
  );
}
for (const d of departments) {
  mem.public.none(
    `INSERT INTO departments (department_name) VALUES ('${esc(d.departmentName)}')`
  );
}
for (const s of statuses) {
  mem.public.none(
    `INSERT INTO statuses (status_name) VALUES ('${esc(s.statusName)}')`
  );
}

for (const u of users) {
  mem.public.none(`
    INSERT INTO users (
      avatar_url, first_name, last_name, username, email,
      phone_number, role_id, department_id, status_id, permissions,
      password_hash, joined_date, updated_at, last_login, created_by
    )
    VALUES (
      '${esc(u.avatarUrl)}',
      '${esc(u.firstName)}',
      '${esc(u.lastName)}',
      '${esc(u.username)}',
      '${esc(u.email)}',
      '${esc(u.phoneNumber)}',
      '${esc(u.roleId)}',
      '${esc(u.departmentId)}',
      '${esc(u.statusId)}',
      '${esc(toJsonbArray(u.permissions))}',
      '${esc(u.password_hash)}',
      '${u.joinedDate}',
      '${u.updatedAt}',
      '${u.lastLogin}',
      '${esc(u.createdBy)}'
    )
  `);
}

for (const v of vendors) {
  mem.public.none(
    `INSERT INTO vendors (name, contact_person, phone, email, address)
     VALUES ('${esc(v.name)}', '${esc(v.contactPerson)}', '${esc(v.phone)}', '${esc(v.email)}', '${esc(v.address)}')`
  );
}

for (const i of items) {
  mem.public.none(
    `INSERT INTO items (name, model, brand, part_number, lead_time, description, unit, unit_price)
     VALUES ('${esc(i.name)}', '${esc(i.model)}', '${esc(i.brand)}', '${esc(i.partNumber)}', '${esc(i.leadTime)}', '${esc(i.description)}', '${esc(i.unit)}', ${i.unitPrice})`
  );
}

for (const i of accountsIndustries) {
  mem.public.none(
    `INSERT INTO account_industries (industry_name) VALUES ('${esc(i.industryName)}')`
  );
}

for (const pb of accountsProductBrands) {
  mem.public.none(
    `INSERT INTO account_product_brands (product_brand_name) VALUES ('${esc(pb.productBrandName)}')`
  );
}

for (const d of accountsDepartments) {
  mem.public.none(
    `INSERT INTO account_departments (department_name) VALUES ('${esc(d.departmentName)}')`
  );
}

for (const account of accounts) {
  mem.public.none(`
    INSERT INTO accounts (
      ref_number,
      date_created,
      requested_by,
      designation,
      department_id,
      validity_period,
      due_date,
      account_name,
      contract_period,
      industry_id,
      account_designation,
      product_id,
      contact_number,
      location,
      email_address,
      address,
      buyer_incharge,
      trunkline,
      contract_number,
      process,
      secondary_email_address,
      machines,
      reason_to_apply,
      automotive_section,
      source_of_inquiry,
      commodity,
      business_activity,
      model,
      annual_target_sales,
      population,
      source_of_target,
      existing_bellows,
      products_to_order,
      model_under,
      target_areas,
      analysis,
      from_date,
      to_date,
      activity_period,
      prepared_by,
      noted_by,
      approved_by,
      received_by,
      acknowledged_by,
      updated_at,
      is_naef
    ) VALUES (
      '${esc(account.refNumber || '')}',
      ${account.dateCreated ? `'${account.dateCreated}'` : 'NOW()'},
      ${account.requestedBy ? `'${esc(account.requestedBy)}'` : 'NULL'},
      '${esc(account.designation || '')}',
      ${account.departmentId ? `'${esc(account.departmentId)}'` : 'NULL'},
      '${esc(account.validityPeriod || '')}',
      ${account.dueDate ? `'${account.dueDate}'` : 'NULL'},
      '${esc(account.accountName || '')}',
      '${esc(account.contractPeriod || '')}',
      ${account.industryId ? `'${esc(account.industryId)}'` : 'NULL'},
      '${esc(account.accountDesignation || '')}',
      ${account.productId ? `'${esc(account.productId)}'` : 'NULL'},
      '${esc(account.contactNumber || '')}',
      '${esc(account.location || '')}',
      '${esc(account.emailAddress || '')}',
      '${esc(account.address || '')}',
      '${esc(account.buyerIncharge || '')}',
      '${esc(account.trunkline || '')}',
      '${esc(account.contractNumber || '')}',
      '${esc(account.process || '')}',
      '${esc(account.secondaryEmailAddress || '')}',
      '${esc(account.machines || '')}',
      '${esc(account.reasonToApply || '')}',
      '${esc(account.automotiveSection || '')}',
      '${esc(account.sourceOfInquiry || '')}',
      '${esc(account.commodity || '')}',
      '${esc(account.businessActivity || '')}',
      '${esc(account.model || '')}',
      ${account.annualTargetSales || 0},
      '${esc(account.population || '')}',
      '${esc(account.sourceOfTarget || '')}',
      '${esc(account.existingBellows || '')}',
      '${esc(account.productsToOrder || '')}',
      '${esc(account.modelUnder || '')}',
      '${esc(account.targetAreas || '')}',
      '${esc(account.analysis || '')}',
      ${account.fromDate ? `'${account.fromDate}'` : 'NULL'},
      ${account.toDate ? `'${account.toDate}'` : 'NULL'},
      '${esc(account.activityPeriod || '')}',
      ${account.preparedBy ? `'${esc(account.preparedBy)}'` : 'NULL'},
      ${account.notedBy ? `'${esc(account.notedBy)}'` : 'NULL'},
      ${account.approvedBy ? `'${esc(account.approvedBy)}'` : 'NULL'},
      ${account.receivedBy ? `'${esc(account.receivedBy)}'` : 'NULL'},
      ${account.acknowledgedBy ? `'${esc(account.acknowledgedBy)}'` : 'NULL'},
      ${account.updatedAt ? `'${account.updatedAt}'` : 'NOW()'},
      FALSE
    )
  `);
}

for (const wo of workorders) {
  mem.public.none(
    `
    INSERT INTO workorders (
      wo_number,
      work_description,
      assignee,
      status,
      account_id,
      naef_id,
      is_new_account,
      mode,
      contact_person,
      contact_number,
      wo_date,
      due_date,
      from_time,
      to_time,
      actual_date,
      actual_from_time,
      actual_to_time,
      objective,
      instruction,
      target_output,
      is_fsl,
      is_esl,
      created_at,
      created_by,
      updated_at
    ) VALUES (
      '${esc(wo.woNumber)}',
      '${esc(wo.workDescription)}',
      '${wo.assignee}',
      '${wo.status}',
      '${esc(wo.accountId)}',
      ${esc(wo.naefId) || 'NULL'},
      ${wo.isNewAccount ? 'TRUE' : 'FALSE'},
      '${esc(wo.mode)}',
      '${esc(wo.contactPerson)}',
      '${esc(wo.contactNumber)}',
      '${wo.woDate}',
      ${wo.dueDate ? `'${wo.dueDate}'` : 'NULL'},
      ${wo.fromTime ? `'${wo.fromTime}'` : 'NULL'},
      ${wo.toTime ? `'${wo.toTime}'` : 'NULL'},
      ${wo.actualDate ? `'${wo.actualDate}'` : 'NULL'},
      ${wo.actualFromTime ? `'${wo.actualFromTime}'` : 'NULL'},
      ${wo.actualToTime ? `'${wo.actualToTime}'` : 'NULL'},
      '${esc(wo.objective)}',
      '${esc(wo.instruction)}',
      '${esc(wo.targetOutput)}',
      ${wo.isFSL ? 'TRUE' : 'FALSE'},
      ${wo.isESL ? 'TRUE' : 'FALSE'},
      NOW(),
      ${wo.createdBy},
      NOW())`);
}

for (const sl of salesLeads) {
  mem.public.none(
    `
    INSERT INTO sales_leads (
      sl_number,
      account_id,
      wo_id,
      assignee,
      sales_stage,
      end_user,
      designation,
      department,
      immediate_support,
      contact_number,
      email_address,
      category,
      application,
      machine,
      machine_process,
      needed_product,
      existing_specifications,
      issues_with_existing,
      consideration,
      support_needed,
      urgency,
      model_to_quote,
      quantity,
      quantity_attention,
      qr_cc,
      qr_email_to,
      next_followup_date,
      due_date,
      done_date,
      account,
      industry,
      se_id,
      sales_plan_rep,
      fsl_ref,
      fsl_date,
      fsl_time,
      fsl_location,
      ww,
      requirement,
      requirement_category,
      deadline,
      product_application,
      customer_issues,
      existing_setup_items,
      customer_suggested_setup,
      remarks,
      actual_picture,
      draft_design_layout,
      created_at,
      updated_at
    ) VALUES (
      '${esc(sl.slNumber)}',
      ${sl.accountId},
      ${sl.woId},
      ${sl.assignee},
      '${esc(sl.salesStage)}',
      '${esc(sl.endUser)}',
      '${esc(sl.designation)}',
      '${esc(sl.department)}',
      '${esc(sl.immediateSupport)}',
      '${esc(sl.contactNumber)}',
      '${esc(sl.emailAddress)}',
      '${esc(sl.category)}',
      '${esc(sl.application)}',
      '${esc(sl.machine)}',
      '${esc(sl.machineProcess)}',
      '${esc(sl.neededProduct)}',
      '${esc(sl.existingSpecifications)}',
      '${esc(sl.issuesWithExisting)}',
      '${esc(sl.consideration)}',
      '${esc(sl.supportNeeded)}',
      '${esc(sl.urgency)}',
      '${esc(sl.modelToQuote)}',
      ${sl.quantity},
      '${esc(sl.quantityAttention)}',
      '${esc(sl.qrCc)}',
      '${esc(sl.qrEmailTo)}',
      ${sl.nextFollowupDate ? `'${sl.nextFollowupDate}'` : 'NULL'},
      ${sl.dueDate ? `'${sl.dueDate}'` : 'NULL'},
      ${sl.doneDate ? `'${sl.doneDate}'` : 'NULL'},
      '${esc(sl.account)}',
      '${esc(sl.industry)}',
      ${sl.seId},
      '${esc(sl.salesPlanRep)}',
      '${esc(sl.fslRef)}',
      '${sl.fslDate}',
      '${sl.fslTime}',
      '${esc(sl.fslLocation)}',
      '${esc(sl.ww)}',
      '${esc(sl.requirement)}',
      '${esc(sl.requirementCategory)}',
      '${sl.deadline}',
      '${esc(sl.productApplication)}',
      '${esc(sl.customerIssues)}',
      '${esc(sl.existingSetupItems)}',
      '${esc(sl.customerSuggestedSetup)}',
      '${esc(sl.remarks)}',
      NULL,
      NULL,
      '${sl.createdAt}',
      '${sl.updatedAt}'
    )
    `
  );
}

for (const tr of technicalRecommendations) {
  mem.public.none(
    `
    INSERT INTO technical_recommendations (
      wo_id, assignee, tr_number, status, priority, title, sl_id, account_id,
      contact_person, contact_number, contact_email, current_system, current_system_issues,
      proposed_solution, technical_justification, installation_requirements, training_requirements,
      maintenance_requirements, attachments, additional_notes, created_at, created_by, updated_at
    ) VALUES (
      ${tr.woId},
      ${tr.assignee},
      '${tr.trNumber}',
      '${tr.status}',
      '${tr.priority}',
      '${tr.title}',
      ${tr.slId},
      ${tr.accountId},
      '${tr.contactPerson}',
      '${tr.contactNumber}',
      '${tr.contactEmail}',
      '${tr.currentSystem}',
      '${tr.currentSystemIssues}',
      '${tr.proposedSolution}',
      '${tr.technicalJustification}',
      '${tr.installationRequirements}',
      '${tr.trainingRequirements}',
      '${tr.maintenanceRequirements}',
      ${tr.attachments ? `'${tr.attachments}'` : 'NULL'},
      '${tr.additionalNotes}',
      '${tr.createdAt}',
      ${tr.createdBy},
      '${tr.updatedAt}'
    )
    `
  );
}

for (const r of rfqs) {
  mem.public.none(
    `INSERT INTO rfqs (
  wo_id,
  assignee,
  rfq_number,
  due_date,
  sl_id,
  account_id,
  created_at,
  created_by,
  updated_at,
  description,
  payment_terms,
  notes,
  stage_status,
  updated_by
)
    VALUES (
    ${r.woId},
    ${r.assignee},
    '${r.rfqNumber}',
    '${r.dueDate}',
    ${r.slId},
    ${r.accountId},
    '${r.createdAt}',
    ${r.createdBy},
    '${r.updatedAt}',
    '${r.description}',
    '${r.paymentTerms}',
    '${r.notes}',
    '${r.stageStatus}',
    ${r.updatedBy}
    )`
  );
}

for (const item of rfqItems) {
  mem.public.none(
    `INSERT INTO rfq_items (
  rfq_id,
  item_id,
  item_external_id,
  selected_vendor,
  quantity,
  lead_time,
  unit_price
)
     VALUES (
      ${item.rfqId},
      ${item.itemId},
      ${item.itemExternalId ?? 'NULL'},
      ${item.selectedVendor || 'NULL'},
      ${item.quantity},
      '${esc(item.leadTime)}',
      ${item.unitPrice}
     )`
  );
}

for (const rv of rfqVendors) {
  mem.public.none(
    `INSERT INTO rfq_vendors (rfq_id, vendor_id, valid_until, payment_terms, notes)
      VALUES (
      ${rv.rfqId},
      ${rv.vendorId},
      ${rv.vendorExternalId ?? 'NULL'},
      '${esc(rv.validUntil)}',
      '${esc(rv.paymentTerms)}',
      '${esc(rv.notes)}'
      )`
  );
}

for (const rv of rfqQuotations) {
  mem.public.none(
    `INSERT INTO rfq_quotations (rfq_id, item_id, item_external_id, vendor_id, vendor_external_id, is_selected, lead_time, unit_price, quantity)
      VALUES (
      ${rv.rfqId},
      ${rv.itemId},
      ${rv.itemExternalId ?? 'NULL'},
      ${rv.vendorId},
      ${rv.vendorExternalId ?? 'NULL'},
      ${rv.isSelected ? 'TRUE' : 'FALSE'},
      '${esc(rv.leadTime)}',
      ${rv.unitPrice},
      ${rv.quantity}
      )`
  );
}

for (const ws of workflowStages) {
  mem.public.none(
    `
    INSERT INTO workflow_stages (
      wo_id, stage_name, status, assigned_to, notified, created_at, updated_at
    ) VALUES (
      ${ws.woId},
      '${ws.stageName}',
      '${ws.status}',
      ${ws.assignedTo},
      ${ws.notified ? 'TRUE' : 'FALSE'},
      '${ws.createdAt}',
      '${ws.updatedAt}'
    )
    `
  );
}

pool = new adapter.Pool();

export default pool;