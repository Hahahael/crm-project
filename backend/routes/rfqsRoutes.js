import express from "express";
import * as RfqsController from "../controllers/rfqsController.js";

const router = express.Router();

// Get all RFQs
router.get("/", RfqsController.listAll);

// Get all vendors
router.get("/vendors", RfqsController.listVendors);

// Get single RFQ
router.get('/:id', RfqsController.getById);

// Create new RFQ
router.post('/', RfqsController.createRfq);

// Update existing RFQ
router.put('/:id', RfqsController.updateRfq);

// Get items associated with an RFQ
router.get('/:id/items', RfqsController.getItems);

// Get vendors associated with an RFQ
// Create RFQ items
router.post('/:id/items', RfqsController.upsertItems);

// Create RFQ vendors
router.post('/:id/vendors', RfqsController.upsertVendors);

// Create RFQ item vendor quotes
router.post('/:id/item-quotes', RfqsController.upsertItemQuotes);

router.get('/:id/vendors', RfqsController.listVendorsForRfq);

export default router;