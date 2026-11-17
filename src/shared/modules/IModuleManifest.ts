import { RequestHandler, Router } from 'express';

/**
 * Uma montagem de router feita por um módulo.
 *
 * `path` é o prefixo dentro de `/api`. `middlewares` roda antes do router e
 * substitui o que antes ficava escrito à mão em `routes/domains/*.routes.ts`.
 */
export interface IModuleRoute {
  path: string;
  router: Router;
  middlewares?: RequestHandler[];
}

/**
 * Contrato de instalação de um módulo.
 *
 * Cada diretório em `src/modules` declara o seu em `module.ts`. É o que permite
 * ligar e desligar módulos por configuração (`modules.json` ou `MODULES=`) sem
 * editar nenhum arquivo de `shared/`.
 *
 * O registro de DI continua sendo feito por `container/index.ts` do módulo, que
 * o loader importa por convenção antes de qualquer router — não declare aqui.
 */
export interface IModuleManifest {
  /** Precisa ser igual ao nome do diretório em `src/modules`. */
  name: string;

  /** Contexto delimitado a que o módulo pertence (ver boundaries.config.json). */
  context: string;

  /** Uma linha sobre o que o módulo faz. Aparece em `yarn modules:list`. */
  description?: string;

  /**
   * Outros módulos que este importa. Se um deles não estiver instalado, o
   * loader falha no boot dizendo o que falta — em vez de quebrar em runtime.
   */
  dependsOn?: string[];

  /** Routers montados sob `/api`. Módulo sem rota pública omite. */
  routes?: IModuleRoute[];
}
