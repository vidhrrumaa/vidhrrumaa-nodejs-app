import { Request, Response, NextFunction } from 'express';
import { ObjectSchema } from 'joi';
import { ApiError } from '../utils/ApiError';

// Validates req.body against a Joi schema and replaces req.body with the
// sanitized value (unknown keys stripped, types coerced, strings trimmed).
export function validate(schema: ObjectSchema) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const { value, error } = schema.validate(req.body, {
      abortEarly: false,
      stripUnknown: true,
      convert: true,
    });

    if (error) {
      const details = error.details.map((d) => ({
        field: d.path.join('.'),
        message: d.message.replace(/["]/g, ''),
      }));
      return next(ApiError.badRequest('Validation failed', details));
    }

    req.body = value;
    return next();
  };
}

export default validate;
