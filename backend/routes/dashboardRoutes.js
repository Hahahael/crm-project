import express from "express";
import db from "../db.js";

const router = express.Router();

// Helpers
async function tableExists(tableName) {
  // Use information_schema which pg-mem supports
  const q = `
    SELECT EXISTS (
      SELECT 1
      FROM information_schema.tables
      WHERE table_schema = 'public'
        AND lower(table_name) = lower($1)
    ) AS exists
  `;
  const r = await db.query(q, [tableName]);
  return !!(r.rows && r.rows[0] && r.rows[0].exists);
}

async function columnExists(tableName, columnName) {
  const q = `
    SELECT EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE lower(table_name) = lower($1)
        AND lower(column_name) = lower($2)
        AND table_schema = 'public'
    ) AS exists
  `;
  const r = await db.query(q, [tableName, columnName]);
  return !!(r.rows && r.rows[0] && r.rows[0].exists);
}

async function chooseTable() {
  if (await tableExists("workorders")) return "workorders";
  if (await tableExists("rfqs")) return "rfqs";
  return null;
}

/**
 * tryQuery:
 * - Run primarySql with params
 * - If it throws, and fallbackSql provided, run fallbackSql (with same params)
 * - If fallback also throws, rethrow the fallback error
 * - If neither present/works, return { rows: [] }
 */
async function tryQuery(primarySql, fallbackSql = null, params = []) {
  try {
    return await db.query(primarySql, params);
  } catch (errPrimary) {
    if (!fallbackSql) {
      // no fallback provided — rethrow original
      throw errPrimary;
    }
    try {
      return await db.query(fallbackSql, params);
    } catch (errFallback) {
      // Both failed. Return empty rows to keep callers safe.
      console.warn(
        "Both primary and fallback queries failed:",
        errPrimary?.message,
        errFallback?.message,
      );
      return { rows: [] };
    }
  }
}

// /api/dashboard/summary
router.get("/summary", async (req, res) => {
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
        // This would need to join with workflow_stages table or use a different approach
        whereConditions.push(`w.stage_status = $${paramIndex}`);
      }
      queryParams.push(statusValue);
      paramIndex++;
    }
    
    // Only add assignee filter if it's a non-empty string
    if (assignee && assignee.trim() !== '') {
      whereConditions.push(`u.username = $${paramIndex}`);
      queryParams.push(assignee.trim());
      paramIndex++;
    }
    
    if (startDate) {
      whereConditions.push(`w.created_at >= $${paramIndex}::timestamp`);
      queryParams.push(startDate);
      paramIndex++;
    }
    
    if (endDate) {
      whereConditions.push(`w.created_at <= $${paramIndex}::timestamp`);
      queryParams.push(endDate);
      paramIndex++;
    }
    
    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';
    
    const primarySql = `
      SELECT
        COUNT(*) AS total,
        SUM(CASE WHEN w.stage_status = 'Pending' THEN 1 ELSE 0 END) AS pending,
        SUM(CASE WHEN w.stage_status = 'In Progress' THEN 1 ELSE 0 END) AS "inProgress",
        SUM(CASE WHEN w.stage_status = 'Completed' THEN 1 ELSE 0 END) AS completed,
        SUM(CASE WHEN (DATE(w.due_date) < CURRENT_DATE AND w.done_date IS NULL) THEN 1 ELSE 0 END) AS overdue,
        SUM(CASE WHEN (DATE(w.due_date) BETWEEN CURRENT_DATE AND (CURRENT_DATE + INTERVAL '3 days') AND w.done_date IS NULL) THEN 1 ELSE 0 END) AS "dueSoon",
        SUM(CASE WHEN w.done_date IS NOT NULL AND DATE(w.done_date) <= DATE(w.due_date) THEN 1 ELSE 0 END) AS "onTimeCount"
      FROM workorders w
      LEFT JOIN users u ON w.assignee = u.id
      ${whereClause}
    `;

    const fallbackSql = `
      SELECT
        COUNT(*) AS total,
        SUM(CASE WHEN r.stage_status = 'Draft' THEN 1 ELSE 0 END) AS draft,
        SUM(CASE WHEN r.stage_status = 'In Progress' THEN 1 ELSE 0 END) AS "inProgress",
        SUM(CASE WHEN r.stage_status = 'Completed' THEN 1 ELSE 0 END) AS completed,
        SUM(CASE WHEN (DATE(r.due_date) < DATE(NOW()) AND (r.done_date IS NULL)) THEN 1 ELSE 0 END) AS overdue,
        SUM(CASE WHEN (DATE(r.due_date) >= DATE(NOW()) AND DATE(r.due_date) <= DATE(NOW() + INTERVAL '3 days') AND (r.done_date IS NULL)) THEN 1 ELSE 0 END) AS "dueSoon",
        SUM(CASE WHEN r.done_date IS NOT NULL AND DATE(r.done_date) <= DATE(r.due_date) THEN 1 ELSE 0 END) AS "onTimeCount"
      FROM rfqs r
      LEFT JOIN users u ON r.assignee = u.id
      ${whereClause.replace('w.', 'r.')}
    `;

    // console.log('Dashboard summary query:', primarySql, 'params:', queryParams);
    const result = await tryQuery(primarySql, fallbackSql, queryParams);
    let row = result.rows && result.rows[0] ? result.rows[0] : {};

    if (!row || Object.keys(row).length === 0) {
      const table = await chooseTable();
      if (table) {
        const simple = await db.query(`SELECT COUNT(*) AS total FROM ${table}`);
        row = simple.rows && simple.rows[0] ? simple.rows[0] : {};
      }
    }

    const total = Number(row.total) || 0;
    const onTimeCount = Number(row.onTimeCount) || 0;
    const onTimeRate = total > 0 ? (onTimeCount / total) * 100 : 0;

    return res.json({
      total,
      pending: Number(row.pending) || 0,
      inProgress: Number(row.inProgress) || 0,
      completed: Number(row.completed) || 0,
      overdue: Number(row.overdue) || 0,
      dueSoon: Number(row.dueSoon) || 0,
      wasUpdated: true,
      onTimeRate,
    });
  } catch (err) {
    console.error("Dashboard summary error:", err);
    return res
      .status(500)
      .json({ error: "Failed to compute dashboard summary" });
  }
});

// /api/dashboard/due-performance
router.get("/due-performance", async (req, res) => {
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
      whereConditions.push(`u.username = $${paramIndex}`);
      queryParams.push(assignee.trim());
      paramIndex++;
    }
    
    if (startDate) {
      whereConditions.push(`w.created_at >= $${paramIndex}::timestamp`);
      queryParams.push(startDate);
      paramIndex++;
    }
    
    if (endDate) {
      whereConditions.push(`w.created_at <= $${paramIndex}::timestamp`);
      queryParams.push(endDate);
      paramIndex++;
    }
    
    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';
    
    const primarySql = `
      SELECT
        SUM(CASE WHEN w.done_date IS NOT NULL AND CAST(w.done_date AS timestamp) < CAST(w.due_date AS timestamp) THEN 1 ELSE 0 END) AS early,
        SUM(CASE WHEN w.done_date IS NOT NULL AND CAST(w.done_date AS timestamp) = CAST(w.due_date AS timestamp) THEN 1 ELSE 0 END) AS onTime,
        SUM(CASE WHEN w.done_date IS NULL AND CAST(w.due_date AS timestamp) >= CAST(NOW() AS timestamp)
                AND CAST(w.due_date AS timestamp) <= CAST((NOW() + INTERVAL '3 days') AS timestamp) THEN 1 ELSE 0 END) AS dueSoon,
        SUM(CASE WHEN w.done_date IS NULL AND CAST(w.due_date AS timestamp) < CAST(NOW() AS timestamp) THEN 1 ELSE 0 END) AS overdue,
        SUM(CASE WHEN w.done_date IS NULL THEN 1 ELSE 0 END) AS notCompleted
      FROM workorders w
      LEFT JOIN users u ON w.assignee = u.id
      ${whereClause};
    `;

    const fallbackSql = `
      SELECT
        SUM(CASE WHEN r.done_date IS NOT NULL AND CAST(r.done_date AS timestamp) < CAST(r.due_date AS timestamp) THEN 1 ELSE 0 END) AS early,
        SUM(CASE WHEN r.done_date IS NOT NULL AND CAST(r.done_date AS timestamp) = CAST(r.due_date AS timestamp) THEN 1 ELSE 0 END) AS onTime,
        SUM(CASE WHEN r.done_date IS NULL AND CAST(r.due_date AS timestamp) >= CAST(NOW() AS timestamp)
                AND CAST(r.due_date AS timestamp) <= CAST((NOW() + INTERVAL '3 days') AS timestamp) THEN 1 ELSE 0 END) AS dueSoon,
        SUM(CASE WHEN r.done_date IS NULL AND CAST(r.due_date AS timestamp) < CAST(NOW() AS timestamp) THEN 1 ELSE 0 END) AS overdue,
        SUM(CASE WHEN r.done_date IS NULL THEN 1 ELSE 0 END) AS notCompleted
      FROM rfqs r
      LEFT JOIN users u ON r.assignee = u.id
      ${whereClause.replace('w.', 'r.')};
    `;

    // console.log('Dashboard due-performance query:', primarySql, 'params:', queryParams);
    const result = await tryQuery(primarySql, fallbackSql, queryParams);
    let row = result.rows && result.rows[0] ? result.rows[0] : {};

    // fallback logic
    if (!row || Object.keys(row).length === 0) {
      const table = await chooseTable();
      if (table) {
        const hasDue = await columnExists(table, "due_date");
        const hasDone = await columnExists(table, "done_date");

        if (hasDue) {
          let simpleSql;

          if (hasDone) {
            simpleSql = `
              SELECT
                SUM(CASE WHEN done_date IS NOT NULL THEN 1 ELSE 0 END) AS completed,
                SUM(CASE WHEN done_date IS NULL AND due_date::timestamp < (NOW()::timestamp) THEN 1 ELSE 0 END) AS overdue
              FROM ${table};
            `;
          } else {
            simpleSql = `
              SELECT
                0 AS completed,
                SUM(CASE WHEN due_date::timestamp < (NOW()::timestamp) THEN 1 ELSE 0 END) AS overdue
              FROM ${table};
            `;
          }

          const s = await db.query(simpleSql);
          row = s.rows && s.rows[0] ? s.rows[0] : {};
        }
      }
    }

    return res.json({
      early: Number(row.early) || 0,
      onTime: Number(row.onTime) || 0,
      dueSoon: Number(row.dueSoon) || 0,
      overdue: Number(row.overdue) || 0,
      notCompleted: Number(row.notCompleted) || 0,
      completed: Number(row.completed) || 0,
      wasUpdated: true,
    });
  } catch (err) {
    console.error("Dashboard due-performance error:", err);
    return res
      .status(500)
      .json({ error: "Failed to compute due-date performance" });
  }
});

// /api/dashboard/stage-distribution
router.get("/stage-distribution", async (req, res) => {
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
      whereConditions.push(`u.username = $${paramIndex}`);
      queryParams.push(assignee.trim());
      paramIndex++;
    }
    
    if (startDate) {
      whereConditions.push(`w.created_at >= $${paramIndex}::timestamp`);
      queryParams.push(startDate);
      paramIndex++;
    }
    
    if (endDate) {
      whereConditions.push(`w.created_at <= $${paramIndex}::timestamp`);
      queryParams.push(endDate);
      paramIndex++;
    }
    
    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';
    
    const primarySql = `
      SELECT w.stage_status AS stage, COUNT(*) AS count 
      FROM workorders w
      LEFT JOIN users u ON w.assignee = u.id
      ${whereClause}
      GROUP BY w.stage_status 
      ORDER BY count DESC
    `;
    
    const fallbackSql = `
      SELECT r.stage_status AS stage, COUNT(*) AS count 
      FROM rfqs r
      LEFT JOIN users u ON r.assignee = u.id
      ${whereClause.replace('w.', 'r.')}
      GROUP BY r.stage_status 
      ORDER BY count DESC
    `;
    
    // console.log('Dashboard stage-distribution query:', primarySql, 'params:', queryParams);
    const result = await tryQuery(primarySql, fallbackSql, queryParams);
    const rows = result.rows || [];
    const total = rows.reduce((s, r) => s + Number(r.count || 0), 0) || 0;
    const out = rows.map((r) => ({
      stage: r.stage || "Unknown",
      count: Number(r.count || 0),
      pct: total > 0 ? (Number(r.count || 0) / total) * 100 : 0,
    }));
    return res.json(out);
  } catch (err) {
    console.error("Dashboard stage-distribution error:", err);
    return res
      .status(500)
      .json({ error: "Failed to compute stage distribution" });
  }
});

// /api/dashboard/assignees
router.get("/assignees", async (req, res) => {
  try {
    const limit = parseInt(req.query.limit, 10) || 10;
    const { startDate, endDate } = req.query;
    
    // Build WHERE conditions (excluding assignee filter since this endpoint is about assignees)
    let whereConditions = ['COALESCE(w.assigned_to, w.assignee) IS NOT NULL'];
    let queryParams = [];
    let paramIndex = 1;
    
    if (startDate) {
      whereConditions.push(`w.created_at >= $${paramIndex}::timestamp`);
      queryParams.push(startDate);
      paramIndex++;
    }
    
    if (endDate) {
      whereConditions.push(`w.created_at <= $${paramIndex}::timestamp`);
      queryParams.push(endDate);
      paramIndex++;
    }
    
    // Add limit parameter
    queryParams.push(limit);
    const limitParam = `$${paramIndex}`;
    
    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';
    
    // Primary tries to use workorders + users; fallback uses rfqs
    const primarySql = `
      SELECT u.id AS assignee_id,
        COALESCE(u.username, (u.first_name || ' ' || u.last_name)) AS assignee_name,
        COUNT(*) AS count
      FROM workorders w
      LEFT JOIN users u ON u.id = COALESCE(w.assigned_to, w.assignee)
      ${whereClause}
      GROUP BY u.id, u.username, u.first_name, u.last_name
      ORDER BY count DESC
      LIMIT ${limitParam}
    `;
    
    // Adjust fallback query conditions
    const fallbackWhereConditions = ['r.assignee IS NOT NULL'];
    if (startDate) {
      fallbackWhereConditions.push(`r.created_at >= $${queryParams.length - 1}`); // startDate param
    }
    if (endDate) {
      fallbackWhereConditions.push(`r.created_at <= $${queryParams.length}`); // endDate param  
    }
    const fallbackWhereClause = fallbackWhereConditions.length > 0 ? `WHERE ${fallbackWhereConditions.join(' AND ')}` : '';
    
    const fallbackSql = `
      SELECT r.assignee AS assignee_id, NULL AS assignee_name, COUNT(*) AS count
      FROM rfqs r
      ${fallbackWhereClause}
      GROUP BY r.assignee
      ORDER BY count DESC
      LIMIT ${limitParam}
    `;
    
    // // console.log('Dashboard assignees query:', primarySql, 'params:', queryParams);
    const result = await tryQuery(primarySql, fallbackSql, queryParams);
    const rows = result.rows || [];
    return res.json({
      totalActive: rows.length,
      top: rows.map((r) => ({
        assignee: r.assignee_name || r.assignee_id || r.assignee,
        count: Number(r.count || 0),
      })),
    });
  } catch (err) {
    console.error("Dashboard assignees error:", err);
    return res.status(500).json({ error: "Failed to compute assignee stats" });
  }
});

router.get("/summary/latest", async (req, res) => {
  try {
    // Extract filter parameters
    const { assignee, startDate, endDate } = req.query;
    
    // Build WHERE conditions for filtering
    let whereConditions = [];
    let queryParams = [];
    let paramIndex = 1;
    
    // Only add assignee filter if it's a non-empty string
    if (assignee && assignee.trim() !== '') {
      // Filter by assignee username - join with users table
      whereConditions.push(`u.username = $${paramIndex}`);
      queryParams.push(assignee.trim());
      paramIndex++;
    }
    
    if (startDate) {
      whereConditions.push(`ws.created_at >= $${paramIndex}`);
      queryParams.push(startDate);
      paramIndex++;
    }
    
    if (endDate) {
      whereConditions.push(`ws.created_at <= $${paramIndex}`);
      queryParams.push(endDate);
      paramIndex++;
    }
    
    // Build separate WHERE clauses for outer and inner queries
    const outerWhereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';
    
    // Build inner query WHERE clause (replace table aliases)
    let innerWhereConditions = [];
    let innerParamIndex = 1;
    
    // Only add assignee filter if it's a non-empty string
    if (assignee && assignee.trim() !== '') {
      innerWhereConditions.push(`u2.username = $${innerParamIndex}`);
      innerParamIndex++;
    }
    
    if (startDate) {
      innerWhereConditions.push(`ws2.created_at >= $${innerParamIndex}`);
      innerParamIndex++;
    }
    
    if (endDate) {
      innerWhereConditions.push(`ws2.created_at <= $${innerParamIndex}`);
      innerParamIndex++;
    }
    
    const innerWhereClause = innerWhereConditions.length > 0 ? `WHERE ${innerWhereConditions.join(' AND ')}` : '';
    
    // Build base query using CTE to get latest created_at per wo_id with filters
    const sql = `
      SELECT
        ws.id,
        ws.wo_id,
        ws.stage_name,
        ws.status,
        ws.assigned_to,
        ws.remarks,
        ws.created_at,
        ws.updated_at
      FROM workflow_stages ws
      LEFT JOIN users u ON ws.assigned_to = u.id
      INNER JOIN (
        SELECT wo_id, MAX(created_at) AS max_created
        FROM workflow_stages ws2
        ${assignee && assignee.trim() !== '' ? 'LEFT JOIN users u2 ON ws2.assigned_to = u2.id' : ''}
        ${innerWhereClause}
        GROUP BY wo_id
      ) latest
        ON ws.wo_id = latest.wo_id
        AND ws.created_at = latest.max_created
      ${outerWhereClause}
      ORDER BY ws.created_at DESC;
    `;
    
    // // console.log('Dashboard summary/latest query:', sql, 'params:', queryParams);

    const result = await db.query(sql, queryParams);
    const rows = result.rows || [];
    for (const row of rows) {
      // console.log("Fetching details for row:", row);
      let rowQuery = "";
      if (row.stageName.toLowerCase().includes("work order")) {
        rowQuery = `SELECT * FROM workorders WHERE id = $1`;
      } else if (row.stageName.toLowerCase().includes("sales lead")) {
        rowQuery = `SELECT * FROM sales_leads WHERE wo_id = $1`;
      } else if (row.stageName.toLowerCase().includes("technical")) {
        rowQuery = `SELECT * FROM technical_recommendations WHERE wo_id = $1`;
      } else if (row.stageName.toLowerCase().includes("rfq")) {
        rowQuery = `SELECT * FROM rfqs WHERE id = $1`;
      } else if (row.stageName.toLowerCase().includes("naef") || row.stageName.toLowerCase().includes("accounts")) {
        rowQuery = `SELECT * FROM accounts WHERE wo_source_id = $1`;
      } else if (row.stageName.toLowerCase().includes("quotation")) {
        rowQuery = `SELECT * FROM quotations WHERE wo_id = $1`;
      }

      if (rowQuery) {
        try {
          const rowResult = await db.query(rowQuery, [row.woId]);
          row.details = rowResult.rows[0] || null;
        } catch (err) {
          console.error("Failed to fetch row details:", err);
        }
      }
    }

    return res.json(rows || []);
  } catch (err) {
    console.error("Failed to fetch summary latest workflow stages:", err);
    return res.status(500).json({ error: "Failed to fetch summary" });
  }
});

export default router;
