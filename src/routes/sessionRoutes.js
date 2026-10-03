import express from 'express';
import { sessionController } from '../controllers/sessionController.js';

const router = express.Router();

router.get('/init', sessionController.initSession);

export default router;
