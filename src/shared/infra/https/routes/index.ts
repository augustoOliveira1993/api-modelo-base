import { Router } from 'express';

import { buildModulesRouter } from '@shared/modules';

/**
 * Monta as rotas dos módulos instalados.
 *
 * O prefixo, os middlewares e o router de cada rota são declarados pelo próprio
 * módulo em `src/modules/<nome>/module.ts`. Este arquivo não cresce mais a cada
 * módulo novo — e os antigos `routes/domains/*.routes.ts` deixaram de existir
 * porque o agrupamento por domínio virou o campo `context` do manifesto.
 */
const routes = Router();

routes.use(buildModulesRouter());

export default routes;
