import NotificationController from '@modules/notification/infra/https/controllers/NotificationController';
import { defineRoutes } from '@shared/infra/https/routes/defineRoutes';

const controller = new NotificationController();

const notificationRouter = defineRoutes({
  routes: [
    { method: 'POST', path: '/mark-all-read', auth: false, handler: controller.redAllNotify },
    { method: 'POST', path: '/', auth: false, handler: controller.create },
    { method: 'POST', path: '/created-end-notify', auth: false, handler: controller.createAndNotify },
    { method: 'GET', path: '/', auth: false, handler: controller.findAll },
    { method: 'GET', path: '/:id', auth: false, handler: controller.findById },
    { method: 'POST', path: '/:id/read', auth: false, handler: controller.redNotify },
    { method: 'PUT', path: '/:id', auth: false, handler: controller.update },
    { method: 'DELETE', path: '/:id', auth: false, handler: controller.delete },
  ],
});

export default notificationRouter;
