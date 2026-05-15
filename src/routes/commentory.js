import { Router } from "express";
import { matchIdParamSchema } from "../validation/matches.js";
import { listCommentaryQuerySchema, createCommentarySchema } from "../validation/commentary.js";
import { commentary } from "../db/schema.js";
import { db } from "../db/db.js";
import { desc, eq } from "drizzle-orm";

export const commentoryRouter = Router({ mergeParams: true });

const MAX_LIM = 100;

commentoryRouter.get('/', async (req, res) => {
    const parsedParams = matchIdParamSchema.safeParse(req.params);

    if (!parsedParams.success) {
        return res.status(400).json({ error: "Invalid Params", details: parsedParams.error.issues });
    }

    const parsedQuery = listCommentaryQuerySchema.safeParse(req.query);

    if (!parsedQuery.success) {
        return res.status(400).json({ error: "Invalid Query", details: parsedQuery.error.issues });
    }

    try {
        const { id: matchId } = parsedParams.data;
        const limit = Math.min(parsedQuery.data.limit ?? 100, MAX_LIM);

        const data = await db
            .select()
            .from(commentary)
            .where(eq(commentary.matchId, matchId))
            .orderBy(desc(commentary.createdAt))
            .limit(limit);

        res.status(200).json({data:data});
    } catch (e) {
        console.error('Commentary fetch error:', e);
        res.status(500).json({ message: "Failed to load commentary." });
    }
})

commentoryRouter.post('/', async (req, res) => {
    const parsedParams = matchIdParamSchema.safeParse(req.params);

    if (!parsedParams.success) {
        return res.status(400).json({ error: "Invalid Params", details: parsedParams.error.issues });
    }

    const parsedBody = createCommentarySchema.safeParse(req.body);

    if (!parsedBody.success) {
        return res.status(400).json({ error: "Invalid Payload", details: parsedBody.error.issues });
    }

    try {
        const { id: matchId } = parsedParams.data;
        const {
            minute,
            sequence,
            period,
            eventType,
            actor,
            team,
            message,
            metadata,
            tags,
        } = parsedBody.data;

        const [result] = await db
            .insert(commentary)
            .values({
                matchId,
                minute,
                sequence,
                period,
                eventType,
                actor,
                team,
                message,
                metadata,
                tags,
            })
            .returning();

        res.status(201).json(result);
    } catch (e) {
        console.error('Commentary creation error:', e);
        res.status(500).json({ message: "Failed to create commentary." });
    }
})