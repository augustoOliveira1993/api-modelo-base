import { defineModule } from '@shared/modules/defineModule';

// Sem rotas próprias: os endpoints de sessão são servidos pelo authRouter
// de users (/auth/sessions, /auth/logout). O sessionRouter deste módulo
// existe mas nunca foi montado — ver docs/MODULES.md.
export default defineModule({
  name: 'session',
  context: 'platform',
  dependsOn: ['log'],
});
