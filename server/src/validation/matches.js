import { z } from 'zod';

export const MATCH_STATUS = {
  SCHEDULED: 'scheduled',
  LIVE: 'live',
  FINISHED: 'finished',
};

// Strict ISO 8601 UTC format (e.g. 2023-08-17T12:34:56Z or with ms)
const isoRegex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z$/;

export const listMatchesQuerySchema = z.object({
  limit: z.coerce.number().int().positive().max(100).optional(),
});

export const matchIdParamSchema = z.object({
  id: z.coerce.number().int().positive(),
});

export const createMatchSchema = z
  .object({
    sport: z.string().min(1, 'sport is required'),
    homeTeam: z.string().min(1, 'homeTeam is required'),
    awayTeam: z.string().min(1, 'awayTeam is required'),
    startTime: z.string().refine((s) => isoRegex.test(s), {
      message: 'startTime must be a valid ISO 8601 UTC string',
    }),
    endTime: z.string().refine((s) => isoRegex.test(s), {
      message: 'endTime must be a valid ISO 8601 UTC string',
    }),
    homeScore: z.coerce.number().int().min(0).optional(),
    awayScore: z.coerce.number().int().min(0).optional(),
  })
  .superRefine((val, ctx) => {
    const start = Date.parse(val.startTime);
    const end = Date.parse(val.endTime);
    if (Number.isNaN(start) || Number.isNaN(end)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'startTime and endTime must be valid dates' });
      return;
    }
    if (end <= start) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['endTime'], message: 'endTime must be after startTime' });
    }
  });

export const updateScoreSchema = z.object({
  homeScore: z.coerce.number().int().min(0),
  awayScore: z.coerce.number().int().min(0),
});

export default {
  MATCH_STATUS,
  listMatchesQuerySchema,
  matchIdParamSchema,
  createMatchSchema,
  updateScoreSchema,
};
