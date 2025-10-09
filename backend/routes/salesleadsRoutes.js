import express from "express";
import * as controller from "../controllers/salesLeadsController.js";

const router = express.Router();

// Get all sales leads
router.get("/", controller.listAll);

// Get single sales lead
router.get("/:id", controller.getById);

// Check if a sales lead exists for a given workorder
router.get("/exists/workorder/:woId", controller.existsForWorkorder);

// Create new sales lead
router.post("/", controller.create);

// Update existing sales lead
router.put("/:id", controller.update);

export default router;
