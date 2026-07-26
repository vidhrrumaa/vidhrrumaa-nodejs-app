import express from 'express';
import emailController from '../controllers/email.controller';
import { validate } from '../middleware/validate.middleware';
import { requireCsrf } from '../middleware/csrf.middleware';
import { requireKnownOrigin } from '../middleware/originCheck.middleware';
import { requireTurnstile } from '../middleware/turnstile.middleware';
import { emailLimiter } from '../middleware/rateLimiter.middleware';
import { singleUpload } from '../middleware/upload.middleware';
import { contactSchema, careerSchema } from '../validators/email.validator';

const router = express.Router();

// Contact form. Attachment is optional (field: "attachment").
router.post(
  '/contact',
  emailLimiter,
  requireKnownOrigin,
  requireCsrf,
  singleUpload('attachment'),
  requireTurnstile,
  validate(contactSchema),
  emailController.sendContact
);

// Careers form. Resume attachment (field: "resume").
router.post(
  '/careers',
  emailLimiter,
  requireKnownOrigin,
  requireCsrf,
  singleUpload('resume'),
  requireTurnstile,
  validate(careerSchema),
  emailController.sendCareer
);

export default router;
