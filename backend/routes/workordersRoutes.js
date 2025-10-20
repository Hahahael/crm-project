// routes/workordersRoutes.js
import express from "express";
import db from "../db.js";
// toSnake/toCamel removed: read camelCase from req.body directly
import { toSnake } from "../helper/utils.js";
import { poolPromise, poolCrmPromise } from "../mssql.js";

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

    // For each workorder, get the latest stage
    for (const w of workorders) {
      const wsRes = await db.query(
        `
          SELECT stage_name
          FROM workflow_stages
          WHERE wo_id = $1
          ORDER BY created_at DESC
          LIMIT 1
        `,
        [w.id],
      );

      // Append stage_name (null if no workflow_stages)
      w.stageName = wsRes.rows[0]?.stageName || null;
    }

    // Enrich with CRM + SPI account data in batch
    try {
      const ids = Array.from(
        new Set(
          workorders
            .map((w) => w.accountId ?? w.account_id)
            .filter((v) => v !== null && v !== undefined),
        ),
      );
      if (ids.length > 0) {
        const [crmPool, spiPool] = await Promise.all([
          poolCrmPromise,
          poolPromise,
        ]);

        // Fetch CRM accounts in one query
        const numericIds = ids
          .map((x) => Number(x))
          .filter((n) => Number.isFinite(n));
        let accountMap = new Map();
        if (numericIds.length > 0) {
          const accSql = `SELECT * FROM crmdb.accounts WHERE id IN (${numericIds.join(",")})`;
          const accRes = await crmPool.request().query(accSql);
          const accounts = accRes.recordset || [];
          accountMap = new Map(accounts.map((a) => [a.id, a]));

          // Build unique lookup id sets
          const kIds = Array.from(
            new Set(
              accounts
                .map((a) => a.kristem_customer_id)
                .filter((v) => v !== null && v !== undefined),
            ),
          );
          const bIds = Array.from(
            new Set(
              accounts
                .map((a) => a.product_id)
                .filter((v) => v !== null && v !== undefined),
            ),
          );
          const iIds = Array.from(
            new Set(
              accounts
                .map((a) => a.industry_id)
                .filter((v) => v !== null && v !== undefined),
            ),
          );
          const dIds = Array.from(
            new Set(
              accounts
                .map((a) => a.department_id)
                .filter((v) => v !== null && v !== undefined),
            ),
          );

          // Fetch lookups with IN clauses when possible
          const [custRes, brandRes, indRes, deptRes] = await Promise.all([
            kIds.length
              ? spiPool
                  .request()
                  .query(`SELECT * FROM spidb.customer WHERE Id IN (${kIds
                    .map((x) => Number(x))
                    .filter((n) => Number.isFinite(n))
                    .join(",")})`)
              : Promise.resolve({ recordset: [] }),
            bIds.length
              ? spiPool
                  .request()
                  .query(`SELECT * FROM spidb.brand WHERE ID IN (${bIds
                    .map((x) => Number(x))
                    .filter((n) => Number.isFinite(n))
                    .join(",")})`)
              : Promise.resolve({ recordset: [] }),
            iIds.length
              ? spiPool
                  .request()
                  .query(
                    `SELECT * FROM spidb.Customer_Industry_Group WHERE Id IN (${iIds
                      .map((x) => Number(x))
                      .filter((n) => Number.isFinite(n))
                      .join(",")})`,
                  )
              : Promise.resolve({ recordset: [] }),
            dIds.length
              ? spiPool
                  .request()
                  .query(`SELECT * FROM spidb.Department WHERE Id IN (${dIds
                    .map((x) => Number(x))
                    .filter((n) => Number.isFinite(n))
                    .join(",")})`)
              : Promise.resolve({ recordset: [] }),
          ]);

          const custMap = new Map(
            (custRes.recordset || []).map((c) => [c.Id, c]),
          );
          const brandMap = new Map(
            (brandRes.recordset || []).map((b) => [b.ID, b]),
          );
          const indMap = new Map(
            (indRes.recordset || []).map((i) => [i.Id, i]),
          );
          const deptMap = new Map(
            (deptRes.recordset || []).map((d) => [d.Id, d]),
          );

          console.log("Customer Map:", custMap);
          console.log("Brand Map:", brandMap);
          console.log("Industry Map:", indMap);
          console.log("Department Map:", deptMap);

          // Attach enriched account to each workorder
          for (const w of workorders) {
            const aid = w.accountId ?? w.account_id;
            if (aid != null && accountMap.has(Number(aid))) {
              const acc = accountMap.get(Number(aid));
              w.account = {
                ...acc,
                kristem: acc.kristem_customer_id
                  ? custMap.get(String(acc.kristem_customer_id)) || null
                  : null,
                brand: acc.product_id
                  ? brandMap.get(String(acc.product_id)) || null
                  : null,
                industry: acc.industry_id
                  ? indMap.get(String(acc.industry_id)) || null
                  : null,
                department: acc.department_id
                  ? deptMap.get(String(acc.department_id)) || null
                  : null,
              };
            } else {
              w.account = null;
            }

            console.log(`Enriched workorder ${w.id}:`, w);
          }
        }
      }
    } catch (enrichErr) {
      console.warn(
        "Failed to enrich workorders with account data:",
        enrichErr.message,
      );
    }

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
        WHERE user.username = $1
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

    // Enrich account details via MSSQL like accountsRoutes
    try {
      const [crmPool, spiPool] = await Promise.all([poolCrmPromise, poolPromise]);
      const accId = wo.accountId ?? wo.account_id;
      let account = null;
      if (accId != null) {
        const accRes = await crmPool
          .request()
          .input("id", accId)
          .query("SELECT TOP (1) * FROM crmdb.accounts WHERE id = @id");
        account = accRes.recordset && accRes.recordset[0] ? accRes.recordset[0] : null;
      }

      if (account) {
        const kristemId = account.kristem_customer_id ?? null;
        const productId = account.product_id ?? null;
        const industryId = account.industry_id ?? null;
        const departmentId = account.department_id ?? null;

        const tasks = [
          kristemId != null
            ? spiPool
                .request()
                .input("kid", kristemId)
                .query("SELECT TOP (1) * FROM spidb.customer WHERE Id = @kid")
            : Promise.resolve(null),
          productId != null
            ? spiPool
                .request()
                .input("bid", productId)
                .query("SELECT TOP (1) * FROM spidb.brand WHERE ID = @bid")
            : Promise.resolve(null),
          industryId != null
            ? spiPool
                .request()
                .input("iid", industryId)
                .query(
                  "SELECT TOP (1) * FROM spidb.Customer_Industry_Group WHERE Id = @iid",
                )
            : Promise.resolve(null),
          departmentId != null
            ? spiPool
                .request()
                .input("did", departmentId)
                .query("SELECT TOP (1) * FROM spidb.Department WHERE Id = @did")
            : Promise.resolve(null),
        ];

        const [kRes, bRes, iRes, dRes] = await Promise.all(tasks);
        const enrichedAccount = {
          ...account,
          kristem: kRes?.recordset?.[0] || null,
          brand: bRes?.recordset?.[0] || null,
          industry: iRes?.recordset?.[0] || null,
          department: dRes?.recordset?.[0] || null,
        };

        return res.json({ ...wo, account: enrichedAccount });
      }
    } catch (enrichErr) {
      console.warn("Failed to enrich workorder account via MSSQL:", enrichErr.message);
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
          (wo_number, work_description, assignee, account_id, is_new_account, mode, contact_person, contact_number, wo_date, due_date, from_time, to_time, actual_date, actual_from_time, actual_to_time, objective, instruction, target_output, is_fsl, is_esl, created_at, created_by, updated_at)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,NOW(),$21,NOW())
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
        created_by,
      ],
    );

    const newId = insertResult.rows[0].id;

    const updateAccountQuery = `UPDATE accounts SET wo_source_id=$1 WHERE id = $2`;
    await db.query(updateAccountQuery, [
      insertResult.rows[0].id,
      finalAccountId,
    ]);

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
          mode=$6, contact_person=$7, contact_number=$8, wo_date=$9, due_date=$10,
          from_time=$11, to_time=$12, actual_date=$13, actual_from_time=$14, actual_to_time=$15, objective=$16,
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
    const result = await db.query(`
      SELECT
        COUNT(*) AS total,
        SUM(CASE WHEN status = 'Pending' THEN 1 ELSE 0 END) AS pending,
        SUM(CASE WHEN status = 'In Progress' THEN 1 ELSE 0 END) AS in_progress,
        SUM(CASE WHEN status = 'Completed' THEN 1 ELSE 0 END) AS completed
      FROM workorders;
    `);

    return res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Failed to fetch status summary" });
  }
});

export default router;
