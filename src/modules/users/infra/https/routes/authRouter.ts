import UsersController from '@modules/users/infra/https/controllers/UsersController';
import SessionController from '@modules/session/infra/https/controllers/SessionController';
import { defineRoutes } from '@shared/infra/https/routes/defineRoutes';
import { verifyToken } from '@shared/middlewares/authMiddleware';
import verifySignUp from '../../../middleware/verifySignup';

const usersController = new UsersController();
const sessionController = new SessionController();

const authRouter = defineRoutes({
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
    { method: 'POST', path: '/signup', auth: false, middleware: [verifySignUp.checkDuplicateUsernameOrEmail], handler: usersController.signup },
    { method: 'POST', path: '/signin', auth: false, handler: usersController.signin },
    { method: 'POST', path: '/refresh', auth: false, handler: usersController.refreshToken },
    { method: 'GET', path: '/me', handler: usersController.getMe },
    { method: 'GET', path: '/abilities', handler: usersController.getAbilityUserAuth },
    { method: 'GET', path: '/sessions', handler: sessionController.list },
    { method: 'GET', path: '/sessions/current', handler: sessionController.getCurrent },
    { method: 'DELETE', path: '/logout', handler: sessionController.logout },
    { method: 'DELETE', path: '/logout-all', handler: sessionController.logoutAll },
  ],
});

export default authRouter;
