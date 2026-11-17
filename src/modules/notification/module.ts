import { defineModule } from '@shared/modules/defineModule';
import notificationRouter from '@modules/notification/infra/https/routes/notificationRouter';

export default defineModule({
  name: 'notification',
  context: 'platform',
  routes: [{ path: '/notifications', router: notificationRouter }],
});
