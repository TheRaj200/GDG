import express from 'express';
import { planController } from '../controllers/planController.js';

const router = express.Router();

router.get('/active', planController.getActivePlan);
router.post('/select', planController.selectCropAndCreatePlan);
router.post('/followup', planController.handleFollowUp);

export default router;
