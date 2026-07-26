import Joi from 'joi';

// Multi-select fields (domains, softwareExpertise) may arrive as a real
// array, a comma-separated string, or a JSON string - multipart/form-data
// always sends arrays as strings, so we accept all three and normalize.
const multiSelect = Joi.alternatives()
  .try(
    Joi.array().items(Joi.string().trim().max(100)),
    Joi.string().custom((value: string, helpers) => {
      let arr: unknown[];
      try {
        const parsed = JSON.parse(value);
        arr = Array.isArray(parsed) ? parsed : String(value).split(',');
      } catch (e) {
        arr = String(value).split(',');
      }
      const cleaned = arr.map((s) => String(s).trim()).filter(Boolean);
      if (cleaned.length === 0) return helpers.error('array.min');
      return cleaned;
    })
  )
  .messages({ 'array.min': 'must contain at least one value' });

export const contactSchema = Joi.object({
  fullName: Joi.string().trim().min(2).max(120).required(),
  email: Joi.string().trim().email().max(254).required(),
  message: Joi.string().trim().min(5).max(5000).required(),
  // Honeypot: real users never fill this in; bots often do.
  website: Joi.string().allow('').max(0).optional(),
});

export const careerSchema = Joi.object({
  firstName: Joi.string().trim().min(1).max(80).required(),
  lastName: Joi.string().trim().min(1).max(80).required(),
  email: Joi.string().trim().email().max(254).required(),
  contactNumber: Joi.string()
    .trim()
    .pattern(/^[+]?[\d\s()-]{7,20}$/)
    .required()
    .messages({ 'string.pattern.base': 'must be a valid phone number' }),
  areaOfInterest: Joi.string().trim().min(2).max(120).required(),
  yearsOfExperience: Joi.number().min(0).max(60).required(),
  domains: multiSelect.required(),
  softwareExpertise: multiSelect.required(),
  coverLetter: Joi.string().trim().min(0).max(8000).allow('').optional(),
  website: Joi.string().allow('').max(0).optional(), // honeypot
});

export default { contactSchema, careerSchema };
