import express from 'express';
import { farmController } from '../controllers/farmController.js';

const router = express.Router();

router.get('/profile', farmController.getProfile);
router.post('/message', farmController.handleMessage);
router.put('/profile', farmController.updateProfile);
router.post('/reset', farmController.resetProfile);

export default router;
