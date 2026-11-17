import { randomUUID } from 'crypto';
import { Request, Response, NextFunction } from 'express';

const REQUEST_ID_HEADER = 'x-request-id';

function getIncomingRequestId(req: Request): string | undefined {
  const value = req.headers[REQUEST_ID_HEADER];
  if (Array.isArray(value)) return value[0];
  return value;
}

export function requestIdMiddleware(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  const requestId = getIncomingRequestId(req) || randomUUID();

  req.requestId = requestId;
  res.locals.requestId = requestId;
  res.setHeader('X-Request-Id', requestId);

  next();
}
