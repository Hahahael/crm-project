// dbMock.js
import { newDb } from "pg-mem";
import { toJsonbArray } from "../helper/utils.js";

// import mock data...
import { users } from "./usersMock.js";
import { roles } from "./rolesMock.js";
import { departments } from "./departmentsMock.js";
import { statuses } from "./statusesMock.js";
import { accounts } from "./accountsMock.js";
import { workorders } from "./workordersMock.js";
import { salesLeads } from "./salesleadsMocks.js";
import { technicalRecommendations } from "./technicalrecommendationsMock.js";
import { rfqs } from "./rfqsMocks.js";
import { rfqItems } from "./rfqItemsMock.js";
import { rfqVendors } from "./rfqVendorsMock.js";
import { vendors } from "./vendorsMock.js";
import { rfqItemVendorQuotes } from "./rfqItemVendorQuotesMock.js";
import { workflowStages } from "./workflowstagesMocks.js";

let pool;

console.log("Loading database...");


console.log("⚡ Using pg-mem (in-memory Postgres)");
const mem = newDb({ autoCreateForeignKeyIndices: true });
const adapter = mem.adapters.createPg();

// Users, Roles, Departments, Statuses Table
mem.public.none(`
  -- USERS TABLE
  CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    avatar_url VARCHAR (255),
    first_name VARCHAR (100),
    last_name VARCHAR (100),
    username VARCHAR (100) UNIQUE,
    email VARCHAR (255) UNIQUE,
    phone_number VARCHAR (20),
    role VARCHAR (50),
    department VARCHAR (100),
    status VARCHAR (50),
    permissions JSONB,
    password_hash VARCHAR (255),
    joined_date TIMESTAMP,
    updated_at TIMESTAMP,
    last_login TIMESTAMP,
    created_by VARCHAR (100)
  );

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
`);

// Accounts Table
mem.public.none(`
  -- ACCOUNTS TABLE (commented out for now)
  CREATE TABLE accounts (
  id SERIAL PRIMARY KEY,
  account_id VARCHAR(20) UNIQUE NOT NULL,
  stage_status VARCHAR(20) DEFAULT 'draft',
    ref_number VARCHAR(20) UNIQUE,
    date_created TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    requested_by INT REFERENCES users(id) ON DELETE SET NULL,
    designation VARCHAR(100),
    department VARCHAR(100),
    validity_period VARCHAR(50),
    due_date DATE,
    account_name VARCHAR(255) NOT NULL,
    contract_period VARCHAR(50),
    industry VARCHAR(100),
    account_designation VARCHAR(100),
    product TEXT,
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
    annual_target_sales NUMERIC(12, 2) CHECK (annual_target_sales >= 0),
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
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
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
    account_name VARCHAR(255) NOT NULL,
    is_new_account BOOLEAN DEFAULT FALSE,
    industry VARCHAR(100),
    mode VARCHAR(50),
    product_brand VARCHAR(100),
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
  stage_status VARCHAR(20) DEFAULT 'draft',
  end_user VARCHAR(100),
  department VARCHAR(75),
  contact_no VARCHAR(20),
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
  quantity INT DEFAULT 1 CHECK (quantity > 0),
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
    title VARCHAR(255) NOT NULL,
    sl_id INT REFERENCES sales_leads(id) ON DELETE SET NULL,
  -- account_id INT REFERENCES accounts(id) ON DELETE SET NULL,
    account_id TEXT,
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
    quantity INT NOT NULL DEFAULT 1 CHECK (quantity > 0),
    unit_price NUMERIC(12, 2) CHECK (unit_price >= 0),
    total_price NUMERIC(12, 2)
  );
`);

// RFQs Table
mem.public.none(`
  -- RFQS
  CREATE TABLE rfqs (
  id SERIAL PRIMARY KEY,
  wo_id INT REFERENCES workorders(id) ON DELETE SET NULL,
  assignee INT REFERENCES users(id) ON DELETE SET NULL,
  rfq_number VARCHAR(20) UNIQUE NOT NULL,
  stage_status VARCHAR(20) DEFAULT 'draft',
    rfq_date DATE NOT NULL,
    due_date DATE,
    description TEXT,
    sl_id INT REFERENCES sales_leads(id) ON DELETE SET NULL,
  -- account_id INT REFERENCES accounts(id) ON DELETE SET NULL,
    account_id TEXT,
    payment_terms VARCHAR(100),
    notes TEXT,
    subtotal NUMERIC(12, 2) CHECK (subtotal >= 0),
    vat NUMERIC(12, 2) CHECK (vat >= 0),
    grand_total NUMERIC(12, 2) CHECK (grand_total >= 0),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by INT REFERENCES users(id) ON DELETE SET NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_by INT REFERENCES users(id) ON DELETE SET NULL
  );

  CREATE TABLE rfq_items (
    id SERIAL PRIMARY KEY,
    rfq_id INT REFERENCES rfqs(id) ON DELETE CASCADE,
    description TEXT NOT NULL,
    brand VARCHAR(100),
    part_number VARCHAR(100),
    quantity INT NOT NULL DEFAULT 1 CHECK (quantity > 0),
    unit VARCHAR(50),
    lead_time VARCHAR(100),
    unit_price NUMERIC(12, 2) CHECK (unit_price >= 0),
    amount NUMERIC(12, 2)
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
  CREATE TABLE rfq_vendors (
    id SERIAL PRIMARY KEY,
    rfq_id INT REFERENCES rfqs(id) ON DELETE CASCADE,
    vendor_id INT REFERENCES vendors(id) ON DELETE SET NULL,
    contact_person VARCHAR(100),
    status VARCHAR(50) DEFAULT 'Pending', -- Quoted, Pending, etc.
    quote_date DATE,
    grand_total NUMERIC(12,2) DEFAULT 0,
    notes TEXT
  );
`);

mem.public.none(`
  CREATE TABLE rfq_item_vendor_quotes (
    id SERIAL PRIMARY KEY,
    rfq_item_id INT REFERENCES rfq_items(id) ON DELETE CASCADE,
    vendor_id INT REFERENCES vendors(id) ON DELETE SET NULL,
    price NUMERIC(12,2) NOT NULL,
    total NUMERIC(12,2),
    lead_time VARCHAR(100),
    lead_time_color VARCHAR(30),
    quote_date DATE,
    status VARCHAR(50),
    notes TEXT
  );
`);

mem.public.none(`
  CREATE TABLE naef_timelines (
    id SERIAL PRIMARY KEY,
  -- account_id INT REFERENCES accounts(id) ON DELETE CASCADE,
    account_id TEXT,
    week_number INT NOT NULL,
    update_description TEXT,
    probability VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  );
`);

// seed data ...
const esc = (val) =>
  typeof val === "string" ? val.replace(/'/g, "''") : val;

for (const u of users) {
  mem.public.none(`
    INSERT INTO users (
      avatar_url, first_name, last_name, username, email,
      phone_number, role, department, status, permissions,
      password_hash, joined_date, updated_at, last_login, created_by
    )
    VALUES (
      '${esc(u.avatarUrl)}',
      '${esc(u.firstName)}',
      '${esc(u.lastName)}',
      '${esc(u.username)}',
      '${esc(u.email)}',
      '${esc(u.phoneNumber)}',
      '${esc(u.role)}',
      '${esc(u.department)}',
      '${esc(u.status)}',
      '${esc(toJsonbArray(u.permissions))}',
      '${esc(u.password_hash)}',
      '${u.joinedDate}',
      '${u.updatedAt}',
      '${u.lastLogin}',
      '${esc(u.createdBy)}'
    )
  `);
}

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

for (const account of accounts) {
  mem.public.none(`
    INSERT INTO accounts (
      account_id,
      ref_number,
      date_created,
      requested_by,
      designation,
      department,
      validity_period,
      due_date,
      account_name,
      contract_period,
      industry,
      account_designation,
      product,
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
      updated_at
    ) VALUES (
      '${esc(account.accountId)}',
      '${esc(account.refNumber)}',
      ${account.dateCreated ? `'${account.dateCreated}'` : 'NOW()'},
      ${account.requestedBy || 'NULL'},
      '${esc(account.designation)}',
      '${esc(account.department)}',
      '${esc(account.validityPeriod)}',
      ${account.dueDate ? `'${account.dueDate}'` : 'NULL'},
      '${esc(account.accountName)}',
      '${esc(account.contractPeriod)}',
      '${esc(account.industry)}',
      '${esc(account.accountDesignation)}',
      '${esc(account.product)}',
      '${esc(account.contactNumber)}',
      '${esc(account.location)}',
      '${esc(account.emailAddress)}',
      '${esc(account.address)}',
      '${esc(account.buyerIncharge)}',
      '${esc(account.trunkline)}',
      '${esc(account.contractNumber)}',
      '${esc(account.process)}',
      '${esc(account.secondaryEmailAddress)}',
      '${esc(account.machines)}',
      '${esc(account.reasonToApply)}',
      '${esc(account.automotiveSection)}',
      '${esc(account.sourceOfInquiry)}',
      '${esc(account.commodity)}',
      '${esc(account.businessActivity)}',
      '${esc(account.model)}',
      ${account.annualTargetSales || 0},
      '${esc(account.population)}',
      '${esc(account.sourceOfTarget)}',
      '${esc(account.existingBellows)}',
      '${esc(account.productsToOrder)}',
      '${esc(account.modelUnder)}',
      '${esc(account.targetAreas)}',
      '${esc(account.analysis)}',
      ${account.fromDate ? `'${account.fromDate}'` : 'NULL'},
      ${account.toDate ? `'${account.toDate}'` : 'NULL'},
      '${esc(account.activityPeriod)}',
      ${account.preparedBy || 'NULL'},
      ${account.notedBy || 'NULL'},
      ${account.approvedBy || 'NULL'},
      ${account.receivedBy || 'NULL'},
      ${account.acknowledgedBy || 'NULL'},
      ${account.updatedAt ? `'${account.updatedAt}'` : 'NOW()'}
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
      account_name,
      is_new_account,
      industry,
      mode,
      product_brand,
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
      '${esc(wo.accountName)}',
      ${wo.isNewAccount ? 'TRUE' : 'FALSE'},
      '${esc(wo.industry)}',
      '${esc(wo.mode)}',
      '${esc(wo.productBrand)}',
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
      wo_id,
      assignee,
      sales_stage,
      end_user,
      designation,
      department,
      immediate_support,
      contact_no,
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
      ${sl.woId},
      ${sl.assignee},
      '${esc(sl.salesStage)}',
      '${esc(sl.endUser)}',
      '${esc(sl.designation)}',
      '${esc(sl.department)}',
      '${esc(sl.immediateSupport)}',
      '${esc(sl.contactNo)}',
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
    `INSERT INTO rfqs 
    (wo_id, assignee, rfq_number, rfq_date, due_date, description, sl_id, account_id, payment_terms, notes, subtotal, vat, grand_total, created_at, created_by, updated_at)
    VALUES (
    ${r.woId},
    ${r.assignee},
    '${r.rfqNumber}',
    '${r.rfqDate}',
    '${r.dueDate}',
    '${r.description}',
    ${r.slId},
    ${r.accountId},
    '${r.paymentTerms}',
    '${r.notes}',
    ${r.subtotal},
    ${r.vat},
    ${r.grandTotal},
    NOW(),
    ${r.createdBy},
    NOW()
    )
    `
  );
}

for (const v of vendors) {
  mem.public.none(
    `INSERT INTO vendors (name, contact_person, phone, email, address)
     VALUES ('${esc(v.name)}', '${esc(v.contactPerson)}', '${esc(v.phone)}', '${esc(v.email)}', '${esc(v.address)}')`
  );
}

for (const item of rfqItems) {
  mem.public.none(
    `INSERT INTO rfq_items (rfq_id, description, brand, part_number, quantity, unit, lead_time, unit_price, amount)
     VALUES (
      ${item.rfqId},
      '${esc(item.description)}',
      '${esc(item.brand)}',
      '${esc(item.partNumber)}',
      ${item.quantity},
      '${esc(item.unit)}',
      '${esc(item.leadTime)}',
      ${item.unitPrice},
      ${item.amount}
     )`
  );
}

for (const q of rfqItemVendorQuotes) {
  mem.public.none(
    `INSERT INTO rfq_item_vendor_quotes (rfq_item_id, vendor_id, price, total, lead_time, lead_time_color, quote_date, status, notes)
     VALUES (
      ${q.rfqItemId},
      ${q.vendorId},
      ${q.price},
      ${q.total},
      '${esc(q.leadTime)}',
      '${esc(q.leadTimeColor)}',
      '${q.quoteDate}',
      '${esc(q.status)}',
      '${esc(q.notes)}'
     )`
  );
}

for (const rv of rfqVendors) {
  mem.public.none(
    `INSERT INTO rfq_vendors (rfq_id, vendor_id, contact_person, status, quote_date, grand_total, notes)
     VALUES (
      ${rv.rfqId},
      ${rv.vendorId},
      '${esc(rv.contactPerson)}',
      '${esc(rv.status)}',
      ${rv.quoteDate ? `'${rv.quoteDate}'` : 'NULL'},
      ${rv.grandTotal},
      '${esc(rv.notes)}'
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