
import Joi from 'joi';
import { ApiError } from './error.js';

/**
 * Request validation with Joi.
 *
 * Validates params, query, and body.
 * Express 5 makes req.query read-only, so validated query
 * values are stored in res.locals.validatedQuery.
 */
export function validate(schemas) {
  return (req, res, next) => {
    const details = [];

    for (const part of ['params', 'query', 'body']) {
      const schema = schemas[part];

      if (!schema) continue;

      const { error, value } = schema.validate(req[part], {
        abortEarly: false,
        stripUnknown: true,
        convert: true,
      });

      if (error) {
        for (const d of error.details) {
          details.push({
            field: d.path.join('.'),
            message: d.message,
          });
        }
      } else if (part === 'query') {
        res.locals.validatedQuery = value;
      } else {
        req[part] = value;
      }
    }

    if (details.length > 0) {
      return next(
        ApiError.badRequest(
          'validation_error',
          'Request validation failed',
          details,
        ),
      );
    }

    return next();
  };
}

export const common = {
  slug: Joi.string()
    .pattern(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
    .max(80),

  page: Joi.number().integer().min(1).default(1),

  limit: Joi.number().integer().min(1).max(100).default(24),

  sort: Joi.string()
    .valid(
      'title',
      'order',
      'category',
      'difficulty',
      'created_at',
      'updated_at',
    )
    .default('order'),

  order: Joi.string()
    .valid('asc', 'desc')
    .default('asc'),
};

export default validate;
