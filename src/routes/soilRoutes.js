import express from 'express';
import multer from 'multer';
import { soilController } from '../controllers/soilController.js';

const router = express.Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf' || file.originalname.endsWith('.pdf')) {
      cb(null, true);
    } else {
      cb(new Error('Sirf PDF file accept ki jati hai.'));
    }
  },
});

router.post('/upload', upload.single('soilPdf'), soilController.uploadPdf);
router.post('/confirm', soilController.confirmSoilData);

export default router;
