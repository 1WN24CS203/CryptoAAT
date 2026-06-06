import express from 'express';
import {
  register,
  login,
  forgotPassword,
  verifyOtp,
  resetPassword,
  getProfile,
  testAnalyzer,
  jtrRecover,
  jtrAudit,
} from '../controllers/authController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

router.post('/register', register);
router.post('/login', login);
router.post('/forgot-password', forgotPassword);
router.post('/verify-otp', verifyOtp);
router.post('/reset-password', resetPassword);
router.post('/jtr-recover', jtrRecover);
router.post('/jtr-audit', protect, jtrAudit);
router.get('/profile', protect, getProfile);
router.post('/analyze-test', testAnalyzer);

export default router;
