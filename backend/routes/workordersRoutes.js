// routes/workordersRoutes.js
import express from "express";
import * as controller from "../controllers/workordersController.js";

const router = express.Router();

// Get all workorders
router.get("/", controller.listAll);

router.get("/assigned", controller.listAssigned);

router.get("/assigned/new", controller.listAssignedNew);

// Get single workorder
router.get("/:id", controller.getById);

// Create new workorder
router.post("/", controller.create);

// Update existing workorder
router.put("/:id", controller.update);

// Get workorder status summary
router.get("/summary/status", controller.statusSummary);

export default router;
