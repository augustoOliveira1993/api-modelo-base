import { z } from 'zod';

export const createLogSchema = z.object({
  action: z.string().min(1, 'Action é obrigatório'),
  category: z.string().min(1, 'Category é obrigatório'),
  message: z.string().optional(),
  created_by: z.string().nullable().optional(),
  updated_by: z.string().nullable().optional(),
});

export const updateLogSchema = createLogSchema.partial();
