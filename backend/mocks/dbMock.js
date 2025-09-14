// dbMock.js
import { newDb } from "pg-mem";

// import mock data...
import { users } from "./usersMock.js";
import { roles } from "./rolesMock.js";
import { departments } from "./departmentsMock.js";
import { statuses } from "./statusesMock.js";

let pool;

console.log("Loading database...");


console.log("⚡ Using pg-mem (in-memory Postgres)");
const mem = newDb({ autoCreateForeignKeyIndices: true });
const adapter = mem.adapters.createPg();

// Schema creation
mem.public.none(`
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

  CREATE TABLE roles (
    id SERIAL PRIMARY KEY,
    role_name TEXT
  );

  CREATE TABLE departments (
    id SERIAL PRIMARY KEY,
    department_name TEXT
  );

  CREATE TABLE statuses (
    id SERIAL PRIMARY KEY,
    status_name TEXT
  );

  CREATE TABLE work_orders (
    wo_id SERIAL PRIMARY KEY,
    wo_number VARCHAR(20) UNIQUE,
    work_description TEXT NOT NULL,
    assignee INT REFERENCES users(id) ON DELETE SET NULL,
    
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
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE workflow_stages (
    stage_id SERIAL PRIMARY KEY,
    wo_id INT NOT NULL REFERENCES work_orders(wo_id) ON DELETE CASCADE,
    stage_name VARCHAR(50) NOT NULL,  -- e.g. Work Order, Sales Lead, TR, RFQ, NAEF, Quotation
    status VARCHAR(50) DEFAULT 'Pending', -- Pending, Approved, Rejected, In Progress
    assigned_to INT REFERENCES users(id) ON DELETE SET NULL,
    notified BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  );
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
      '${esc(u.avatar_url)}',
      '${esc(u.first_name)}',
      '${esc(u.last_name)}',
      '${esc(u.username)}',
      '${esc(u.email)}',
      '${esc(u.phone_number)}',
      '${esc(u.role)}',
      '${esc(u.department)}',
      '${esc(u.status)}',
      '${esc(JSON.stringify(u.permissions))}',
      '${esc(u.password_hash)}',
      '${u.joined_date}',
      '${u.updated_at}',
      '${u.last_login}',
      '${esc(u.created_by)}'
    )
  `);
}

for (const r of roles) {
  mem.public.none(
    `INSERT INTO roles (id, role_name) VALUES (${r.id}, '${esc(r.role_name)}')`
  );
}
for (const d of departments) {
  mem.public.none(
    `INSERT INTO departments (id, department_name) VALUES (${d.id}, '${esc(d.department_name)}')`
  );
}
for (const s of statuses) {
  mem.public.none(
    `INSERT INTO statuses (id, status_name) VALUES (${s.id}, '${esc(s.status_name)}')`
  );
}

pool = new adapter.Pool();

export default pool;