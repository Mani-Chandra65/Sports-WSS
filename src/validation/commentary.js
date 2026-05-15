import { z } from 'zod';

export const listCommentaryQuerySchema = z.object({
  limit: z.coerce.number().int().positive().max(100).optional(),
});

export const createCommentarySchema = z.object({
  minute: z.coerce.number().int().min(0),
  sequence: z.coerce.number().int().min(0),
  period: z.string().min(1, 'period is required'),
  eventType: z.string().min(1, 'eventType is required'),
  actor: z.string().min(1, 'actor is required'),
  team: z.string().min(1, 'team is required'),
  message: z.string().min(1, 'message is required'),
  metadata: z.record(z.string(),z.any()).default({}),
  tags: z.array(z.string()).default({}),
});
