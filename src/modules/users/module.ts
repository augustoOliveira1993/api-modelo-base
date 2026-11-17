import { defineModule } from '@shared/modules/defineModule';
import authRouter from '@modules/users/infra/https/routes/authRouter';
import usersRouter from '@modules/users/infra/https/routes/usersRouter';
import rolesRouter from '@modules/users/infra/https/routes/rolesRouter';
import permissaoRouter from '@modules/users/infra/https/routes/permissaoRouter';
import permissaoGrupoRouter from '@modules/users/infra/https/routes/permissaoGrupoRouter';

export default defineModule({
  name: 'users',
  context: 'platform',
  dependsOn: ['session'],
  routes: [
    { path: '/auth', router: authRouter },
    { path: '/users', router: usersRouter },
    { path: '/roles', router: rolesRouter },
    { path: '/permissoes', router: permissaoRouter },
    { path: '/permissao-grupos', router: permissaoGrupoRouter },
  ],
});
