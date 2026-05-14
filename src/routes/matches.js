import { Router } from "express";
import { createMatchSchema, listMatchesQuerySchema } from "../validation/matches.js";
import { matches } from "../db/schema.js";
import { db } from "../db/db.js";
import { getMatchStatus } from "../utils/match-status.js";
import { desc } from "drizzle-orm";


export const matchRouter = Router();

const MAX_LIM = 100;

matchRouter.get('/',async (req,res) => {
    const parseddata = listMatchesQuerySchema.safeParse(req.query);

    if(!parseddata.success){
        return res.status(400).json({error:"Invalid Query",details:parseddata.error.issues});
    }
    const limit = Math.min(parseddata.data.limit ?? 50 , MAX_LIM);
    try{
        const data = await db
                        .select()
                        .from(matches)
                        .orderBy(desc(matches.createdAt))
                        .limit(limit)

        res.status(200).json(data);
    }catch(e){
        res.status(500).json({message:"Failed to load matches."})
    }
})

matchRouter.post('/',async (req,res) => {
    const parseddata = createMatchSchema.safeParse(req.body);

    if(!parseddata.success){
        return res.status(400).json({error:"Invalid Payload",details:parseddata.error.issues});
    }

    try{
        const { startTime, endTime, homeScore, awayScore } = parseddata.data;
        
        const [event] = await db.insert(matches).values({
            ...parseddata.data,
            startTime: new Date(startTime),
            endTime: new Date(endTime),
            homeScore: homeScore ?? 0,
            awayScore: awayScore ?? 0,
            status: getMatchStatus(startTime,endTime)
        }).returning();

        if(res.app.locals.broadcastMatchCreated){
            res.app.locals.broadcastMatchCreated(event);
        }

        res.status(201).json({data:event});
    }catch(e){
        res.status(500).json({message:"Failed to create match."})
    }
})