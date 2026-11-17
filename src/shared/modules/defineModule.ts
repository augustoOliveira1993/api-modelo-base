import { IModuleManifest } from '@shared/modules/IModuleManifest';

/**
 * Declara o manifesto de um módulo.
 *
 * Existe em arquivo próprio, sem importar o registry, para que o `module.ts` de
 * cada módulo possa ser carregado pelo loader sem ciclo de require.
 *
 * @example
 * export default defineModule({
 *   name: 'bairro',
 *   context: 'cadastros',
 *   routes: [{ path: '/bairros', middlewares: [verifyToken], router: bairroRouter }],
 * });
 */
export function defineModule(manifest: IModuleManifest): IModuleManifest {
  return manifest;
}

export default defineModule;
