import { defineModule } from '@shared/modules/defineModule';
import logRouter from '@modules/log/infra/https/routes/logRouter';

export default defineModule({
  name: 'log',
  context: 'platform',
  routes: [{ path: '/logs', router: logRouter }],
});
