import express from "express";
import * as TrController from "../controllers/technicalRecommendationsController.js";

const router = express.Router();

// Get all technical recommendations
router.get('/', TrController.listAll);

// Get single technical recommendation
router.get('/:id', TrController.getById);

// Create new technical recommendation
router.post('/', TrController.createTr);

// Update existing technical recommendation
router.put('/:id', TrController.updateTr);

router.get('/:id/items', TrController.getItems);

export default router;