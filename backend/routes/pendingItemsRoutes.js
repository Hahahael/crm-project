import express from "express";
import db from "../db.js";
import { toCamel, toSnake } from "../helper/utils.js";

const router = express.Router();

// Get all pending items
router.get("/", async (req, res) => {
  try {
    const { status } = req.query;
    
    let query = "SELECT * FROM pending_items";
    let params = [];
    
    if (status) {
      query += " WHERE status = $1";
      params.push(status);
    }
    
    query += " ORDER BY created_at DESC";
    
    const result = await db.query(query, params);
    return res.json(result.rows);
  } catch (err) {
    console.error("Error fetching pending items:", err);
    return res.status(500).json({ error: "Failed to fetch pending items" });
  }
});

// Get pending item by ID
router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const result = await db.query(
      "SELECT * FROM pending_items WHERE id = $1",
      [id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Pending item not found" });
    }
    
    return res.json(result.rows[0]);
  } catch (err) {
    console.error("Error fetching pending item:", err);
    return res.status(500).json({ error: "Failed to fetch pending item" });
  }
});

// Create new pending item
router.post("/", async (req, res) => {
  try {
    const body = toSnake(req.body);
    console.log("📝 Creating pending item:", body);
    
    const {
      product_name,
      corrected_part_no,
      description,
      corrected_description,
      brand,
      unit_om,
      vendor,
      stock_type,
      supply_type,
      weight,
      moq,
      moq_by,
      is_active,
      is_common,
      buy_price,
      selling_price,
      created_by,
      rfq_id,
      rfq_item_id,
      remarks
    } = body;
    
    // Validate required fields
    if (!product_name || !corrected_part_no || !description || !corrected_description ||
        !brand || !unit_om || !vendor || !stock_type || !supply_type ||
        weight === undefined || !moq || !moq_by) {
      return res.status(400).json({ error: "Missing required fields for pending item" });
    }
    
    const result = await db.query(
      `INSERT INTO pending_items (
        product_name, corrected_part_no, description, corrected_description,
        brand, unit_om, vendor, stock_type, supply_type, weight,
        moq, moq_by, is_active, is_common, buy_price, selling_price,
        created_by, rfq_id, rfq_item_id, remarks, created_at, status
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,NOW(),'pending')
      RETURNING *`,
      [
        product_name, corrected_part_no, description, corrected_description,
        brand, unit_om, vendor, stock_type, supply_type, weight,
        moq, moq_by, is_active || true, is_common || false,
        buy_price, selling_price, created_by, rfq_id, rfq_item_id, remarks
      ]
    );
    
    const pendingItem = result.rows[0];
    console.log("✅ Created pending item:", pendingItem.id);
    
    // Link pending item to rfq_item
    if (rfq_item_id) {
      await db.query(
        "UPDATE rfq_items SET pending_item_id = $1 WHERE id = $2",
        [pendingItem.id, rfq_item_id]
      );
      console.log("✅ Linked pending item to rfq_item:", rfq_item_id);
    }
    
    return res.json(pendingItem);
  } catch (err) {
    console.error("Error creating pending item:", err);
    return res.status(500).json({ error: "Failed to create pending item" });
  }
});

// Update pending item
router.put("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const body = toSnake(req.body);
    
    const {
      product_name, corrected_part_no, description, corrected_description,
      brand, unit_om, vendor, stock_type, supply_type, weight,
      moq, moq_by, is_active, is_common, buy_price, selling_price, remarks
    } = body;
    
    const result = await db.query(
      `UPDATE pending_items SET
        product_name = COALESCE($1, product_name),
        corrected_part_no = COALESCE($2, corrected_part_no),
        description = COALESCE($3, description),
        corrected_description = COALESCE($4, corrected_description),
        brand = COALESCE($5, brand),
        unit_om = COALESCE($6, unit_om),
        vendor = COALESCE($7, vendor),
        stock_type = COALESCE($8, stock_type),
        supply_type = COALESCE($9, supply_type),
        weight = COALESCE($10, weight),
        moq = COALESCE($11, moq),
        moq_by = COALESCE($12, moq_by),
        is_active = COALESCE($13, is_active),
        is_common = COALESCE($14, is_common),
        buy_price = COALESCE($15, buy_price),
        selling_price = COALESCE($16, selling_price),
        remarks = COALESCE($17, remarks)
      WHERE id = $18
      RETURNING *`,
      [
        product_name, corrected_part_no, description, corrected_description,
        brand, unit_om, vendor, stock_type, supply_type, weight,
        moq, moq_by, is_active, is_common, buy_price, selling_price, remarks, id
      ]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Pending item not found" });
    }
    
    return res.json(result.rows[0]);
  } catch (err) {
    console.error("Error updating pending item:", err);
    return res.status(500).json({ error: "Failed to update pending item" });
  }
});

// Approve pending item (admin only)
router.post("/:id/approve", async (req, res) => {
  try {
    const { id } = req.params;
    const { approved_by } = toSnake(req.body);
    
    // TODO: Create item in MSSQL Kristem database
    // For now, just mark as approved
    
    const result = await db.query(
      `UPDATE pending_items 
       SET status = 'approved', approved_by = $1, approved_at = NOW()
       WHERE id = $2
       RETURNING *`,
      [approved_by, id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Pending item not found" });
    }
    
    const pendingItem = result.rows[0];
    
    // TODO: Update rfq_items.item_id with new Kristem ID once created
    
    return res.json({ message: "Item approved successfully", item: pendingItem });
  } catch (err) {
    console.error("Error approving pending item:", err);
    return res.status(500).json({ error: "Failed to approve pending item" });
  }
});

// Reject pending item
router.post("/:id/reject", async (req, res) => {
  try {
    const { id } = req.params;
    const { approved_by, remarks } = toSnake(req.body);
    
    const result = await db.query(
      `UPDATE pending_items 
       SET status = 'rejected', approved_by = $1, approved_at = NOW(), remarks = $2
       WHERE id = $3
       RETURNING *`,
      [approved_by, remarks, id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Pending item not found" });
    }
    
    return res.json({ message: "Item rejected", item: result.rows[0] });
  } catch (err) {
    console.error("Error rejecting pending item:", err);
    return res.status(500).json({ error: "Failed to reject pending item" });
  }
});

export default router;
