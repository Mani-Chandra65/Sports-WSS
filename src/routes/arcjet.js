import arcjet, { detectBot,shield, slidingWindow } from '@arcjet/node';
import 'dotenv/config'

const arcjetKey = process.env.ARCJET_KEY;
const rawArcjetMode = process.env.ARCJET_MODE ?? "LIVE";
if (rawArcjetMode !== "LIVE" && rawArcjetMode !== "DRY_RUN") {
    throw new Error(`Invalid ARCJET_MODE: ${rawArcjetMode}`);
}
const arcjetMode = rawArcjetMode;
if(!arcjetKey) throw new Error('ARCJET KEY is missing');

export const httpArcjet =
    arcjet({
        key:arcjetKey,
        rules: [
            shield({ mode: arcjetMode}),
            detectBot({mode:arcjetMode, allow:['CATEGORY:SEARCH_ENGINE','CATEGORY:PREVIEW']}),
            slidingWindow({mode:arcjetMode, interval:'10s', max:50})
        ]
    });

export const wsArcjet = 
    arcjet({
        key:arcjetKey,
        rules: [
            shield({ mode: arcjetMode}),
            detectBot({mode:arcjetMode, allow:['CATEGORY:SEARCH_ENGINE','CATEGORY:PREVIEW']}),
            slidingWindow({mode:arcjetMode, interval:'2s', max:5})
        ]
    });

export function securityMiddleware(){
    return async (req,res,next) => {
        if(!httpArcjet) return next();

        try {
            const decision = await  httpArcjet.protect(req);
            if(decision.isDenied()){
                if(decision.reason.isRateLimit()){
                    return res.status(429).json({error:'Too many requests!'});
                }
                return res.status(403).json({error:'Forbidden!'});
            }
            if (decision.results.some(isSpoofedBot)) {
                return res.status(403).json({ error: 'Forbidden!' });
            }
        }catch(e){
            console.error('Arcjet Middleware error:',e);
            return res.status(503).json({error:'Service not available!'});
        }
        next();
    }
}