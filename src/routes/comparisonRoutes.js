import express from 'express';
import { comparisonController } from '../controllers/comparisonController.js';

const router = express.Router();

router.get('/', comparisonController.getComparison);

export default router;
