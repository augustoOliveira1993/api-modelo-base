import UsersController from '@modules/users/infra/https/controllers/UsersController';
import { defineRoutes } from '@shared/infra/https/routes/defineRoutes';
import { verifyToken } from '@shared/middlewares/authMiddleware';

const controller = new UsersController();

const usersRouter = defineRoutes({
  authentication: [verifyToken],
  beforeMiddleware: [
    (_req, res, next) => {
      res.header(
        'Access-Control-Allow-Headers',
        'x-access-token, Origin, Content-Type, Accept',
      );
      next();
    },
  ],
  routes: [
    { method: 'POST', path: '/', auth: false, handler: controller.create },
    { method: 'GET', path: '/test/user', handler: controller.getUserAuth },
    { method: 'GET', path: '/', handler: controller.findAll },
    { method: 'GET', path: '/:id', handler: controller.findById },
    { method: 'PUT', path: '/:id', handler: controller.updateUser },
    { method: 'DELETE', path: '/:id', handler: controller.delete },
    { method: 'PUT', path: '/edit', handler: controller.update },
    { method: 'POST', path: '/:id/permissions', handler: controller.addPermissionByUserId },
    { method: 'DELETE', path: '/:id/permissions', handler: controller.removePermissionByUserId },
  ],
});

export default usersRouter;
