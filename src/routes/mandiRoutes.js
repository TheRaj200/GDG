import express from 'express';
import { mandiController } from '../controllers/mandiController.js';

const router = express.Router();

router.post('/', mandiController.getMandiAdvice);
router.post('/advice', mandiController.getMandiAdvice);


export default router;
