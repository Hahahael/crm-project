import express from "express";
import { sql, poolPromise } from "../mssql.js";

const router = express.Router();

// GET /api/mssql/accounts
// Query params: limit, offset, q (search by Code/Name/Email)
router.get("/", async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit, 10) || 100, 1000);
    const offset = parseInt(req.query.offset, 10) || 0;
    const q = (req.query.q || "").trim();

    const pool = await poolPromise;
    const request = pool.request();
    request.input("limit", sql.Int, limit);
    request.input("offset", sql.Int, offset);

    let where = "";
    if (q) {
      request.input("q", sql.NVarChar, `%${q}%`);
      where = "WHERE Code LIKE @q OR [Name] LIKE @q OR EmailAddress LIKE @q";
    }

    const sqlText = `
      SELECT 
        Id,
        Code,
        [Name] AS Name,
        Address,
        PhoneNumber,
        EmailAddress,
        VAT_Type_Id,
        Price_Basis_Id,
        Customer_Location_Id,
        PaymentTerms,
        Currency_Id,
        Customer_Industry_Group_Id,
        Sales_Agent_Id,
        ChargeTo,
        TinNo,
        Customer_Market_Segment_Group_Id,
        Category
      FROM spidb.customer
      ${where}
      ORDER BY Id
      OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY`;

    const result = await request.query(sqlText);

    // Return a count of the page and the rows; full count would need an extra COUNT(*) query if desired
    return res.json({ count: result.recordset.length, rows: result.recordset });
  } catch (err) {
    console.error("MSSQL /accounts error:", err);
    return res.status(500).json({ error: "Failed to fetch customers" });
  }
});

// GET /api/mssql/accounts/:id
router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const pool = await poolPromise;
    const r = await pool
      .request()
      .input("id", sql.Int, id)
      .query(`
        SELECT 
          Id,
          Code,
          [Name] AS Name,
          Address,
          PhoneNumber,
          EmailAddress,
          VAT_Type_Id,
          Price_Basis_Id,
          Customer_Location_Id,
          PaymentTerms,
          Currency_Id,
          Customer_Industry_Group_Id,
          Sales_Agent_Id,
          ChargeTo,
          TinNo,
          Customer_Market_Segment_Group_Id,
          Category
        FROM spidb.customer
        WHERE Id = @id`);

    const row = r.recordset && r.recordset[0];
    if (!row) return res.status(404).json({ error: "Customer not found" });
    return res.json(row);
  } catch (err) {
    console.error("MSSQL /accounts/:id error:", err);
    return res.status(500).json({ error: "Failed to fetch customer" });
  }
});

export default router;
