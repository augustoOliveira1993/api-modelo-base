import { z } from 'zod';
import {
  EActionType,
  EActionStyle,
  ETypeNotification,
  ENotificationActionMethod,
} from '@modules/notification/dto/INotificationDTO';

const notificationActionSchema = z.object({
  type: z.nativeEnum(EActionType),
  label: z.string(),
  action: z.string().optional(),
  url: z.string().optional(),
  method: z.nativeEnum(ENotificationActionMethod).optional(),
  payload: z.record(z.string(), z.any()).optional(),
  style: z.nativeEnum(EActionStyle).optional(),
});

export const createNotificationSchema = z.object({
  user: z.string().optional(),
  title: z.string().optional(),
  message: z.string().optional(),
  type: z.nativeEnum(ETypeNotification).optional(),
  icon: z.string().optional(),
  is_read: z.boolean().optional(),
  expiresAt: z.coerce.date().optional(),
  metadata: z.any().optional(),
  actions: z.array(notificationActionSchema).optional(),
  updated_by: z.string().optional(),
  created_by: z.string().optional(),
});

export const updateNotificationSchema = createNotificationSchema.partial();
