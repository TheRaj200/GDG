import express from 'express';
import healthRoutes from './healthRoutes.js';
import sessionRoutes from './sessionRoutes.js';
import farmRoutes from './farmRoutes.js';
import soilRoutes from './soilRoutes.js';
import comparisonRoutes from './comparisonRoutes.js';
import planRoutes from './planRoutes.js';
import voiceRoutes from './voiceRoutes.js';
import mandiRoutes from './mandiRoutes.js';
import { sessionAuth } from '../middlewares/sessionAuth.js';

const router = express.Router();

// Health check does not require session
router.use('/health', healthRoutes);

// Apply session authentication to all api business routes
router.use('/session', sessionAuth, sessionRoutes);
router.use('/farm', sessionAuth, farmRoutes);
router.use('/soil', sessionAuth, soilRoutes);
router.use('/comparison', sessionAuth, comparisonRoutes);
router.use('/plan', sessionAuth, planRoutes);
router.use('/voice', sessionAuth, voiceRoutes);
router.use('/mandi-advice', sessionAuth, mandiRoutes);
router.use('/mandi', sessionAuth, mandiRoutes);

export default router;
