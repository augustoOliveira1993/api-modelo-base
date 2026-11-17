import RoleController from '@modules/users/infra/https/controllers/RoleController';
import { defineRoutes } from '@shared/infra/https/routes/defineRoutes';
import { verifyToken } from '@shared/middlewares/authMiddleware';

const controller = new RoleController();

const rolesRouter = defineRoutes({
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
    { method: 'POST', path: '/', handler: controller.create },
    { method: 'GET', path: '/', handler: controller.findAll },
    { method: 'GET', path: '/:idRole', handler: controller.findById },
    { method: 'PUT', path: '/:idRole', handler: controller.update },
    { method: 'DELETE', path: '/:idRole', handler: controller.delete },
    { method: 'POST', path: '/:idRole/permissions', handler: controller.addPermissionByRoleId },
  ],
});

export default rolesRouter;
