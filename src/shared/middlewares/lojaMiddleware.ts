import { Request, Response, NextFunction } from 'express';

export const setLojaByUserBody = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  if (req.body && !req?.body?.loja) {
    req.body = { ...req.body, loja: req.lojaId?.toString() || '' };
  }
  next();
};
