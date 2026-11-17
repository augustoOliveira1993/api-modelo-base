import SessionController from '@modules/session/infra/https/controllers/SessionController';
import { defineRoutes } from '@shared/infra/https/routes/defineRoutes';
import { verifyToken } from '@shared/middlewares/authMiddleware';

const controller = new SessionController();

const sessionRouter = defineRoutes({
  authentication: [verifyToken],
  routes: [
    { method: 'GET', path: '/', handler: controller.list },
    { method: 'GET', path: '/current', handler: controller.getCurrent },
    { method: 'DELETE', path: '/:sessionId', handler: controller.logout },
    { method: 'DELETE', path: '/', handler: controller.logoutAll },
  ],
});

export default sessionRouter;
