// routes/workordersRoutes.js
import express from "express";
import db from "../db.js";
// toSnake/toCamel removed: read camelCase from req.body directly
import { toSnake } from "../helper/utils.js";
import { poolPromise } from "../mssql.js";

const router = express.Router();

// Get all workorders
router.get("/", async (req, res) => {
  try {
    const workordersResult = await db.query(`
      SELECT 
        w.*, 
        u.username AS assignee_username
      FROM workorders w
      LEFT JOIN users u ON w.assignee = u.id
      ORDER BY w.id ASC
    `);

    const workorders = workordersResult.rows;

    // Attach latest module/stage for each workorder (batch)
    try {
      const woIds = workorders.map((w) => w.id).filter(Boolean);
      if (woIds.length > 0) {
        const latestRes = await db.query(
          `
            SELECT ws.wo_id, ws.stage_name
            FROM workflow_stages ws
            INNER JOIN (
              SELECT wo_id, MAX(created_at) AS max_created
              FROM workflow_stages
              -- WHERE wo_id = ANY($1::int[])
              GROUP BY wo_id
            ) latest ON ws.wo_id = latest.wo_id AND ws.created_at = latest.max_created
          `,
          [woIds],
        );
        console.log("Latest workflow stages result:", latestRes);
        const latestMap = new Map(
          (latestRes.rows || []).map((r) => [Number(r.wo_id ?? r.woId), r]),
        );
        for (const w of workorders) {
          const lr = latestMap.get(Number(w.id));
          w.stageName = lr?.stage_name ?? lr?.stageName ?? null; // back-compat
          w.currentStageName = w.stageName;
        }
      }
    } catch (stageErr) {
      console.warn("Failed to attach latest stage to workorders:", stageErr.message);
    }

    // Enrich with SPI account data in batch (crmdb.accounts deprecated)
    try {
      const ids = Array.from(
        new Set(
          workorders
            .map((w) => w.accountId ?? w.account_id)
            .filter((v) => v !== null && v !== undefined),
        ),
      );
      const numericIds = ids
        .map((x) => Number(x))
        .filter((n) => Number.isFinite(n));
      if (numericIds.length > 0) {
        const spiPool = await poolPromise;
        const custSql = `SELECT * FROM spidb.customer WHERE Id IN (${numericIds.join(",")})`;
        const custRes = await spiPool.request().query(custSql);
        const customers = custRes.recordset || [];
        const custMap = new Map(customers.map((c) => [Number(c.Id), c]));

        console.log(custRes);

        // Derive potential foreign keys from SPI customer rows using flexible field names
        const normId = (v) => {
          const n = Number(v);
          return Number.isFinite(n) ? n : null;
        };
        const brandIds = new Set();
        const industryIds = new Set();
        const deptIds = new Set();
        for (const c of customers) {
          const bId =
            normId(c.Product_Brand_Id) ??
            normId(c.ProductBrandId) ??
            normId(c.Brand_ID) ??
            normId(c.BrandId) ??
            null;
          const iId =
            normId(c.Customer_Industry_Group_Id) ??
            normId(c.Industry_Group_Id) ??
            normId(c.IndustryGroupId) ??
            null;
          const dId =
            normId(c.Department_Id) ??
            normId(c.DepartmentID) ??
            normId(c.DepartmentId) ??
            null;
          if (bId != null) brandIds.add(bId);
          if (iId != null) industryIds.add(iId);
          if (dId != null) deptIds.add(dId);
        }

        // Ensure fallback IDs are also fetched (brand=2, department=2)
        brandIds.add(2);
        deptIds.add(2);

        // Fetch lookups in bulk where possible
        const [brandRes, indRes, deptRes] = await Promise.all([
          brandIds.size
            ? spiPool
                .request()
                .query(
                  `SELECT * FROM spidb.brand WHERE ID IN (${Array.from(brandIds).join(",")})`,
                )
            : Promise.resolve({ recordset: [] }),
          industryIds.size
            ? spiPool
                .request()
                .query(
                  `SELECT * FROM spidb.Customer_Industry_Group WHERE Id IN (${Array.from(industryIds).join(",")})`,
                )
            : Promise.resolve({ recordset: [] }),
          deptIds.size
            ? spiPool
                .request()
                .query(
                  `SELECT * FROM spidb.CusDepartment WHERE Id IN (${Array.from(deptIds).join(",")})`,
                )
            : Promise.resolve({ recordset: [] }),
        ]);

        const brandMap = new Map((brandRes.recordset || []).map((b) => [Number(b.ID ?? b.Id), b]));
        const indMap = new Map((indRes.recordset || []).map((i) => [Number(i.Id), i]));
        const deptMap = new Map((deptRes.recordset || []).map((d) => [Number(d.Id), d]));

        for (const w of workorders) {
          const cid = Number(w.accountId ?? w.account_id);
          const cust = Number.isFinite(cid) ? custMap.get(cid) || null : null;
          if (!cust) {
            w.account = null;
            continue;
          }
          const bId =
            (normId(cust.Product_Brand_Id) ??
            normId(cust.ProductBrandId) ??
            normId(cust.Brand_ID) ??
            normId(cust.BrandId) ??
            2);
          const iId =
            normId(cust.Customer_Industry_Group_Id) ??
            normId(cust.Industry_Group_Id) ??
            normId(cust.IndustryGroupId) ??
            null;
          const dId =
            (normId(cust.Department_Id) ??
            normId(cust.DepartmentID) ??
            normId(cust.DepartmentId) ??
            2);
          w.account = {
            kristem: cust,
            brand: brandMap.get(bId) || null,
            industry: iId != null ? indMap.get(iId) || null : null,
            department: deptMap.get(dId) || null,
          };
        }
      }
    } catch (enrichErr) {
      console.warn(
        "Failed to enrich workorders with account data:",
        enrichErr.message,
      );
    }

    console.log("Fetched workorders:", workorders);

    return res.json(workorders);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Failed to fetch workorders" });
  }
});

router.get("/assigned", async (req, res) => {
  try {
    const username = req.user.username;
    const result = await db.query(
      `
        SELECT 
          w.*, 
          u.username AS assignee_username
        FROM workorders w
        LEFT JOIN users u ON w.assignee = u.id
        WHERE u.username = $1
        ORDER BY w.id ASC
      `,
      [username],
    );
    return res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch assigned workorders" });
  }
});

router.get("/assigned/new", async (req, res) => {
  try {
    const username = req.user.username;
    const result = await db.query(
      `
        SELECT 
          w.*, 
          u.username AS assignee_username,
          u.department_id AS assignee_department_id,
          d.department_name AS assignee_department_name
        FROM workorders w
        LEFT JOIN users u ON w.assignee = u.id
        LEFT JOIN departments d ON u.department_id = d.id
        WHERE u.username = $1
          AND NOT EXISTS (
          SELECT 1 FROM workflow_stages ws
          WHERE ws.wo_id = w.id AND ws.stage_name = 'Sales Lead'
          )
        ORDER BY w.id ASC
      `,
      [username],
    );
    return res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch assigned workorders" });
  }
});

// Get single workorder
router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const result = await db.query(
      `
        SELECT 
          w.*, 
          u.username AS assignee_username
        FROM workorders w
        LEFT JOIN users u ON w.assignee = u.id
        WHERE w.id = $1
      `,
      [id],
    );
    if (result.rows.length === 0)
      return res.status(404).json({ error: "Not found" });
    const wo = result.rows[0];

    // Attach latest workflow stage for this workorder
    try {
      const wsRes = await db.query(
        `SELECT stage_name
           FROM workflow_stages
          WHERE wo_id = $1
          ORDER BY created_at DESC
          LIMIT 1`,
        [id],
      );
      console.log("Latest workflow stage result:", wsRes);
      if (wsRes.rows && wsRes.rows[0]) {
        wo.stageName = wsRes.rows[0].stage_name ?? wsRes.rows[0].stageName ?? null;
        wo.currentStageName = wo.stageName;
      }
    } catch (wserr) {
      console.warn("Failed to fetch latest stage for workorder", id, wserr.message);
    }

    // Enrich account details via MSSQL SPI only (crmdb.accounts deprecated)
    try {
      let baseAcc = {};
      const baseAccRes = await db.query(
        `SELECT * FROM accounts WHERE kristem_account_id = $1`,
        [wo.accountId],
      );
      if (baseAccRes.rows && baseAccRes.rows[0]) {
        baseAcc = baseAccRes.rows[0];
      }

      console.log("Base account fetch result for workorder", id, "with account_id:", wo.accountId, ":", baseAcc);

      const spiPool = await poolPromise;
      const accId = Number(wo.accountId ?? wo.account_id);
      let customer = null;
      if (Number.isFinite(accId)) {
        const custRes = await spiPool
          .request()
          .input("id", accId)
          .query("SELECT TOP (1) * FROM spidb.customer WHERE Id = @id");
        customer = custRes.recordset && custRes.recordset[0] ? custRes.recordset[0] : null;
      }

      console.log("SPI customer fetch result for workorder", id, ":", customer);

      if (customer) {
        let source = customer;
        if (Object.keys(baseAcc).length === 0) {
          source = baseAcc;
        }
        const normId = (v) => {
          const n = Number(v);
          return Number.isFinite(n) ? n : null;
        };
        const bId =
          (
            normId(source.productId) ??
            normId(source.Product_Brand_Id) ??
            normId(source.ProductBrandId) ??
            normId(source.Brand_ID) ??
            normId(source.BrandId) ??
            2
          );
        const iId =
          normId(source.industryId) ??
          normId(source.Customer_Industry_Group_Id) ??
          normId(source.Industry_Group_Id) ??
          normId(source.IndustryGroupId) ??
          null;
        const dId =
          (
            normId(source.departmentId) ??
            normId(source.Department_Id) ??
            normId(source.DepartmentID) ??
            normId(source.DepartmentId) ??
            2
          );

        const [bRes, iRes, dRes] = await Promise.all([
          spiPool
            .request()
            .input("bid", bId)
            .query("SELECT TOP (1) * FROM spidb.brand WHERE ID = @bid"),
          iId != null
            ? spiPool
                .request()
                .input("iid", iId)
                .query(
                  "SELECT TOP (1) * FROM spidb.Customer_Industry_Group WHERE Id = @iid",
                )
            : Promise.resolve({ recordset: [] }),
          spiPool
            .request()
            .input("did", dId)
            .query("SELECT TOP (1) * FROM spidb.CusDepartment WHERE Id = @did"),
        ]);

        baseAcc.kristem = customer;
        baseAcc.brand = bRes.recordset && bRes.recordset[0] ? bRes.recordset[0] : null;
        baseAcc.industry = iRes.recordset && iRes.recordset[0] ? iRes.recordset[0] : null;
        baseAcc.department = dRes.recordset && dRes.recordset[0] ? dRes.recordset[0] : null;
        return res.json({ ...wo, account: baseAcc });
      }
    } catch (enrichErr) {
      console.warn("Failed to enrich workorder account via MSSQL SPI:", enrichErr.message);
    }

    // Fallback: return workorder without MSSQL enrichment
    return res.json(wo);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Failed to fetch user" });
  }
});

// Create new workorder
router.post("/", async (req, res) => {
  try {
    console.log("Creating workorder with data:", req.body);
    const body = toSnake(req.body);
    let {
      work_description,
      assignee,
      account_id,
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
      created_by
    } = body;

    let finalAccountId = account_id;

    // 1️⃣ Figure out the current year
    const currentYear = new Date().getFullYear();

    // 2️⃣ Find the latest counter for this year
    const result = await db.query(
      `
        SELECT wo_number 
        FROM workorders 
        WHERE wo_number LIKE $1
        ORDER BY wo_number DESC
        LIMIT 1
      `,
      [`WO-${currentYear}-%`],
    );

    let newCounter = 1;
    if (result.rows.length > 0) {
      const lastWoNumber = result.rows[0].woNumber; // e.g. "WO-2025-0042"
      const lastCounter = parseInt(lastWoNumber.split("-")[2], 10);
      newCounter = lastCounter + 1;
    }

    // 3️⃣ Generate new WO number
    const woNumber = `WO-${currentYear}-${String(newCounter).padStart(4, "0")}`;

    // 4️⃣ Insert into DB
    const insertResult = await db.query(
      `
        INSERT INTO workorders 
          (wo_number, work_description, assignee, account_id, is_new_account, mode, contact_person, contact_number, wo_date, due_date, from_time, to_time, actual_date, actual_from_time, actual_to_time, objective, instruction, target_output, is_fsl, is_esl, stage_status, created_at, created_by, updated_at)
        VALUES (
          $1,$2,$3,$4,$5,$6,$7,$8,
          $9::date,
          $10::date,
          $11::time,
          $12::time,
          $13::date,
          $14::time,
          $15::time,
          $16,$17,$18,$19,$20,$21,NOW(),$22,NOW()
        )
        RETURNING id
      `,
      [
        woNumber,
        work_description,
        assignee,
        finalAccountId, // 👈 draft or existing account
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
        "Draft",
        created_by,
      ],
    );

    const newId = insertResult.rows[0].id;

    const updateAccountQuery = `UPDATE accounts SET wo_source_id=$1 WHERE kristem_account_id = $2 RETURNING *`;
    const updatedAccount = await db.query(updateAccountQuery, [
      insertResult.rows[0].id,
      finalAccountId,
    ]);

    console.log("Updated account after workorder creation:", updatedAccount.rows[0]);

    // 5️⃣ Return new row with assignee details
    const final = await db.query(
      `
        SELECT w.*, u.username AS assignee_username
        FROM workorders w
        LEFT JOIN users u ON w.assignee = u.id
        WHERE w.id = $1
      `,
      [newId],
    );

    return res.status(201).json(final.rows[0]);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Failed to create workorder" });
  }
});

router.put("/calendar/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { due_date, from_time, to_time } = toSnake(req.body);

    console.log("Updating workorder (calendar) ", {
      id,
      due_date,
      from_time,
      to_time,
    });

    const updateResult = await db.query(
      `
        UPDATE workorders 
        SET 
          due_date=$1,
          updated_at=NOW()
        WHERE id=$2
        RETURNING id
      `,
      [due_date, id],
    );

    if (!updateResult || !updateResult.rows || updateResult.rows.length === 0) {
      return res.status(404).json({ error: "Not found" });
    }

    const updatedId = updateResult.rows[0].id;

    const result = await db.query(
      `
        SELECT 
          w.*, 
          u.username AS assignee_username
        FROM workorders w
        LEFT JOIN users u ON w.assignee = u.id
        WHERE w.id = $1
      `,
      [updatedId],
    );

    console.log("Updated workorder (calendar) result:", result);

    if (result.rows.length === 0)
      return res.status(404).json({ error: "Not found" });
    return res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Failed to update workorder" });
  }
});

// Update existing workorder
router.put("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const body = toSnake(req.body);
    let {
      wo_number,
      work_description,
      assignee,
      account_id,
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
    } = body;

    console.log("Updating workorder", { id, ...body });

    const updateResult = await db.query(
      `
        UPDATE workorders 
        SET 
          wo_number=$1, work_description=$2, assignee=$3, account_id=$4, is_new_account=$5,
          mode=$6, contact_person=$7, contact_number=$8, wo_date=$9::date, due_date=$10::date,
          from_time=$11::time, to_time=$12::time, actual_date=$13::date, actual_from_time=$14::time, actual_to_time=$15::time, objective=$16,
          instruction=$17, target_output=$18, is_fsl=$19, is_esl=$20, updated_at=NOW()
        WHERE id=$21
        RETURNING id
      `,
      [
        wo_number,
        work_description,
        assignee,
        account_id,
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
        id,
      ],
    );

    if (!updateResult || !updateResult.rows || updateResult.rows.length === 0) {
      return res.status(404).json({ error: "Not found" });
    }

    const updatedId = updateResult.rows[0].id;

    const result = await db.query(
      `
        SELECT 
          w.*, 
          u.username AS assignee_username
        FROM workorders w
        LEFT JOIN users u ON w.assignee = u.id
        WHERE w.id = $1
      `,
      [updatedId],
    );

    if (result.rows.length === 0)
      return res.status(404).json({ error: "Not found" });
    return res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Failed to update workorder" });
  }
});

// Get workorder status summary
router.get("/summary/status", async (req, res) => {
  try {
    // Extract filter parameters
    const { status, assignee, startDate, endDate } = req.query;
    
    // Build WHERE conditions
    let whereConditions = [];
    let queryParams = [];
    let paramIndex = 1;
    
    // Only add status filter if it's a non-empty string
    if (status && status.trim() !== '') {
      // Handle different status types
      const statusValue = status.trim();
      if (statusValue === 'Pending' || statusValue === 'Completed') {
        // Work order statuses - filter by workorders.stage_status
        whereConditions.push(`w.stage_status = $${paramIndex}`);
      } else {
        // Detailed statuses - filter by workflow stage status
        whereConditions.push(`w.stage_status = $${paramIndex}`);
      }
      queryParams.push(statusValue);
      paramIndex++;
    }
    
    // Only add assignee filter if it's a non-empty string
    if (assignee && assignee.trim() !== '') {
      // Filter by assignee username - join with users table
      whereConditions.push(`u.username = $${paramIndex}`);
      queryParams.push(assignee.trim());
      paramIndex++;
    }
    
    if (startDate && startDate.trim() !== '') {
      whereConditions.push(`w.created_at >= $${paramIndex}::timestamp`);
      queryParams.push(startDate.trim());
      paramIndex++;
    }
    
    if (endDate && endDate.trim() !== '') {
      whereConditions.push(`w.created_at <= $${paramIndex}::timestamp`);
      queryParams.push(endDate.trim());
      paramIndex++;
    }
    
    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';
    
    const query = `
      SELECT
        COUNT(*) AS total,
        SUM(CASE WHEN w.stage_status IN ('Draft', 'Pending') THEN 1 ELSE 0 END) AS in_pending_fix,
        SUM(CASE WHEN w.stage_status = 'In Progress' THEN 1 ELSE 0 END) AS in_progress,
        SUM(CASE WHEN w.stage_status = 'Completed' THEN 1 ELSE 0 END) AS completed,
        SUM(
          CASE
            WHEN w.stage_status IN ('Draft', 'Pending', 'In Progress')
              AND w.due_date < CURRENT_DATE
            THEN 1 ELSE 0
          END
        ) AS overdue,
        SUM(
          CASE
            WHEN w.stage_status IN ('Draft', 'Pending', 'In Progress')
              AND w.due_date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '3 days'
            THEN 1 ELSE 0
          END
        ) AS due_soon
      FROM workorders w
      LEFT JOIN users u ON w.assignee = u.id
      ${whereClause};
    `;
    
    console.log('Work orders summary query:', query, 'params:', queryParams);
    const result = await db.query(query, queryParams);

    // Back-compat: expose 'pending' key (alias) for frontend consumption
    const row = result.rows[0] || {};
    row.pending = row.in_pending_fix ?? row.inPendingFix ?? 0;
    delete row.in_pending_fix;
    delete row.inPendingFix;
    return res.json(row);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Failed to fetch status summary" });
  }
});

router.get("/summary/counts", async (req, res) => {
  try {
    const result = await db.query(`
      SELECT
        COUNT(*) AS total,
        SUM(CASE WHEN (due_date::date < CURRENT_DATE AND done_date IS NULL) THEN 1 ELSE 0 END) AS overdue,
        SUM(CASE WHEN (due_date::date BETWEEN CURRENT_DATE AND (CURRENT_DATE + INTERVAL '3 days') AND done_date IS NULL) THEN 1 ELSE 0 END) AS due_soon,
        SUM(CASE WHEN done_date IS NOT NULL AND done_date::date <= due_date::date THEN 1 ELSE 0 END) AS on_time_count
      FROM workorders;
    `);

    const row = result.rows[0] || {};
    const total = Number(row.total) || 0;
    const onTimeCount = Number(row.on_time_count) || 0;
    const onTimeRate = total > 0 ? (onTimeCount / total) * 100 : 0;

    return res.json({
      total,
      overdue: Number(row.overdue) || 0,
      dueSoon: Number(row.due_soon) || 0,
      onTimeRate,
    });
  } catch (err) {
    console.error(err);
    return res
      .status(500)
      .json({ error: "Failed to fetch due performance summary" });
  }
});

export default router;
