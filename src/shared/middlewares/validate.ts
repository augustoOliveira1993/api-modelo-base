import { Request, Response, NextFunction } from 'express';
import { ZodType } from 'zod';

import { BadRequestError } from '@shared/errors/AppError';

type ValidationTarget = 'body' | 'query' | 'params';

export const validate =
  (schema: ZodType, target: ValidationTarget = 'body') =>
  (req: Request, _res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req[target]);

    if (!result.success) {
      const message = result.error.issues
        .map(issue => `${issue.path.join('.') || target}: ${issue.message}`)
        .join('; ');

      throw new BadRequestError({
        title: 'Dados inválidos!',
        message,
      });
    }

    (req as any)[target] = result.data;
    next();
  };

export default validate;
