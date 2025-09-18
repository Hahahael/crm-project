// dbMock.js
import { newDb } from "pg-mem";

// import mock data...
import { users } from "./usersMock.js";
import { roles } from "./rolesMock.js";
import { departments } from "./departmentsMock.js";
import { statuses } from "./statusesMock.js";
import { workorders } from "./workordersMock.js";
import { toJsonbArray } from "../helper/utils.js";

let pool;

console.log("Loading database...");


console.log("⚡ Using pg-mem (in-memory Postgres)");
const mem = newDb({ autoCreateForeignKeyIndices: true });
const adapter = mem.adapters.createPg();

// Schema creation
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

  -- WORKORDERS TABLE
  CREATE TABLE workorders (
    id SERIAL PRIMARY KEY,
    wo_number VARCHAR(20) UNIQUE,
    work_description TEXT NOT NULL,
    assignee INT REFERENCES users(id) ON DELETE SET NULL,
    status VARCHAR(50) DEFAULT 'Pending',
    
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

  -- WORKFLOW STAGES TABLE
  CREATE TABLE workflow_stages (
    stage_id SERIAL PRIMARY KEY,
    wo_id INT NOT NULL REFERENCES workorders(id) ON DELETE CASCADE,
    stage_name VARCHAR(50) NOT NULL,  -- e.g. Work Order, Sales Lead, TR, RFQ, NAEF, Quotation
    status VARCHAR(50) DEFAULT 'Pending', -- Pending, Approved, Rejected, In Progress
    assigned_to INT REFERENCES users(id) ON DELETE SET NULL,
    notified BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  );

  -- SALES LEADS TABLE (based on your requirements)
  CREATE TABLE sales_leads (
    id SERIAL PRIMARY KEY,
    sl_number VARCHAR(20) UNIQUE NOT NULL, -- FSL-YYYY-NNNN, auto-generated
    end_user VARCHAR(100) NOT NULL,
    department VARCHAR(50) NOT NULL,
    contact_no VARCHAR(20) NOT NULL,
    sales_stage VARCHAR(30) NOT NULL DEFAULT 'Sales Lead',
    designation VARCHAR(50) NOT NULL,
    immediate_support VARCHAR(100),
    email_address VARCHAR(100) NOT NULL,

    -- Application Details
    category VARCHAR(50) NOT NULL,
    application VARCHAR(50) NOT NULL,
    machine VARCHAR(100) NOT NULL,
    machine_process VARCHAR(50) NOT NULL,
    needed_product VARCHAR(100) NOT NULL,
    existing_specifications TEXT,
    issues_with_existing TEXT,
    consideration TEXT,

    -- Support and Quotation
    support_needed TEXT NOT NULL,
    urgency VARCHAR(20) NOT NULL DEFAULT 'Medium',
    model_to_quote VARCHAR(100) NOT NULL,
    quantity INT NOT NULL DEFAULT 1 CHECK (quantity > 0),
    quantity_attention VARCHAR(100),
    qr_cc VARCHAR(100),
    qr_email_to TEXT NOT NULL,
    next_followup_date DATE NOT NULL,
    due_date DATE NOT NULL,
    done_date DATE,

    -- Field Sales Lead Details
    account VARCHAR(100) NOT NULL,
    industry VARCHAR(50) NOT NULL,
    se_id INT NOT NULL REFERENCES users(id),
    sales_plan_rep VARCHAR(100),
    fsl_ref VARCHAR(20),
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    time TIME NOT NULL,
    location VARCHAR(100) NOT NULL,
    ww VARCHAR(20),

    -- Customer Actual/Setup
    requirement TEXT NOT NULL,
    requirement_category TEXT NOT NULL,
    deadline DATE NOT NULL,
    customer_machine VARCHAR(100) NOT NULL,
    customer_machine_process VARCHAR(50) NOT NULL,
    product_application TEXT NOT NULL,
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

  -- Indexes for performance
  CREATE INDEX idx_workorders_wo_number ON workorders(wo_number);
  CREATE INDEX idx_sales_leads_sl_number ON sales_leads(sl_number);
  CREATE INDEX idx_sales_leads_se_id ON sales_leads(se_id);
`);

// seed data ...
const esc = (val) =>
  typeof val === "string" ? val.replace(/'/g, "''") : val;

for (const u of users) {
  mem.public.none(`
    INSERT INTO users (
      id, avatar_url, first_name, last_name, username, email,
      phone_number, role, department, status, permissions,
      password_hash, joined_date, updated_at, last_login, created_by
    )
    VALUES (
      ${u.id},
      '${esc(u.avatarUrl)}',
      '${esc(u.firstName)}',
      '${esc(u.lastName)}',
      '${esc(u.username)}',
      '${esc(u.email)}',
      '${esc(u.phomeNumber)}',
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
    `INSERT INTO roles (id, role_name) VALUES (${r.id}, '${esc(r.roleName)}')`
  );
}
for (const d of departments) {
  mem.public.none(
    `INSERT INTO departments (id, department_name) VALUES (${d.id}, '${esc(d.departmentName)}')`
  );
}
for (const s of statuses) {
  mem.public.none(
    `INSERT INTO statuses (id, status_name) VALUES (${s.id}, '${esc(s.statusName)}')`
  );
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

pool = new adapter.Pool();

export default pool;