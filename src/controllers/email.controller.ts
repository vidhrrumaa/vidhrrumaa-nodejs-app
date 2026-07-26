import { Request, Response } from 'express';
import emailService from '../services/email.service';
import { asyncHandler } from '../utils/asyncHandler';
import logger from '../config/logger';

// POST /api/v1/email/contact
const sendContact = asyncHandler(async (req: Request, res: Response) => {
  const result = await emailService.sendContactMessage(req.body, req.file);
  logger.info('Contact message accepted', { requestId: req.id });
  res.status(202).json({
    success: true,
    message: 'Your message has been sent. We will get back to you shortly.',
    data: { reference: result.messageId },
  });
});

// POST /api/v1/email/careers
const sendCareer = asyncHandler(async (req: Request, res: Response) => {
  const result = await emailService.sendCareerApplication(req.body, req.file);
  logger.info('Career application accepted', { requestId: req.id });
  res.status(202).json({
    success: true,
    message: 'Your application has been submitted. Thank you for your interest.',
    data: { reference: result.messageId },
  });
});

export { sendContact, sendCareer };
export default { sendContact, sendCareer };
