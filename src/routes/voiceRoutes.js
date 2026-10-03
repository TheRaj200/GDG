import express from 'express';
import multer from 'multer';
import { voiceController } from '../controllers/voiceController.js';

const router = express.Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
});

router.post('/transcribe', upload.single('audio'), voiceController.transcribeAudio);
router.post('/synthesize', voiceController.synthesizeSpeech);

export default router;
