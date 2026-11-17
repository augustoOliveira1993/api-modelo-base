import PermissaoGrupoController from '@modules/users/infra/https/controllers/PermissaoGrupoController';
import { defineRoutes } from '@shared/infra/https/routes/defineRoutes';
import { verifyToken } from '@shared/middlewares/authMiddleware';

const controller = new PermissaoGrupoController();

const permissaoGruposRouter = defineRoutes({
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
    { method: 'GET', path: '/:id', handler: controller.findById },
    { method: 'PUT', path: '/:id', handler: controller.update },
    { method: 'DELETE', path: '/:id', handler: controller.delete },
  ],
});

export default permissaoGruposRouter;
