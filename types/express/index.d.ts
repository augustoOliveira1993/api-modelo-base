import { Response } from 'express';
import { Request } from 'express';

declare global {
  namespace Express {
    interface Request {
      userId?: string;
      userEmail?: string;
      is_admin?: boolean;
      estrutura_rm?: string;
      sessionId?: string;
      requestId?: string;
      abilities?: string[];
      /** Tenant ativo da requisição, populado pelo verifyToken a partir de `user.loja`. */
      lojaId?: string;
      /** Tenants aos quais o usuário tem acesso (`user.lojas_associadas`). */
      lojasUser?: any[];
    }

    interface Response {
      locals?: {
        cacheKey?: string;
        requestId?: string;
      };
    }
  }
}
