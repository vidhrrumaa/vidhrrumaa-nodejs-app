import express from 'express';
import emailController from '../controllers/email.controller';
import { validate } from '../middleware/validate.middleware';
import { requireTurnstile } from '../middleware/turnstile.middleware';
import { emailLimiter } from '../middleware/rateLimiter.middleware';
import { singleUpload } from '../middleware/upload.middleware';
import { contactSchema, careerSchema } from '../validators/email.validator';

const router = express.Router();

// TEMP DEBUG: requireKnownOrigin and requireCsrf removed to isolate the CORS
// edge header-stripping issue - these endpoints are CSRF-unprotected right
// now. Must be restored before this ships to production.

// Contact form. Attachment is optional (field: "attachment").
router.post(
  '/contact',
  emailLimiter,
  singleUpload('attachment'),
  requireTurnstile,
  validate(contactSchema),
  emailController.sendContact
);

// Careers form. Resume attachment (field: "resume").
router.post(
  '/careers',
  emailLimiter,
  singleUpload('resume'),
  requireTurnstile,
  validate(careerSchema),
  emailController.sendCareer
);

export default router;
