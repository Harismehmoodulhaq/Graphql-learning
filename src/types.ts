import { Request, Response } from "express";
import session from "express-session";
import Redis from "ioredis";
export interface UserSession {
    userId?:number
}
export type MyContext = {
    res: Response;
    redis: Redis;
    req: Request & {session?: Partial<session.Session & session.SessionData> & UserSession};
}