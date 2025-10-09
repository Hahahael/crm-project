import express from 'express';
import * as controller from '../controllers/workflowStagesController.js';

const router = express.Router();

router.get('/latest-submitted', controller.latestSubmitted);
router.get('/', controller.listAll);
router.get('/workorder/:woId', controller.listByWorkorder);
router.get('/:id', controller.getById);
router.post('/', controller.createStage);
router.put('/:id', controller.updateStage);
router.delete('/:id', controller.deleteStage);
// Support both query and param for stageName
router.get('/assigned/latest/:id', controller.latestAssigned);
router.get('/assigned/latest/:id/:stageName', controller.latestAssigned);

export default router;
