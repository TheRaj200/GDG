import express from 'express';
import { isDbConnected } from '../config/db.js';
import { geminiService } from '../services/geminiService.js';

const router = express.Router();

router.get('/', (req, res) => {
  res.json({
    status: 'ok',
    service: 'Kisan Ai API',
    coverage: 'Pan-India (Dynamic Geocoding & Open-Meteo Live Weather)',
    dbConnected: isDbConnected(),
    geminiConfigured: geminiService.isAvailable(),
    timestamp: new Date().toISOString(),
  });
});

export default router;
