import { EntityManager, IDatabaseDriver, Connection } from "@mikro-orm/core"
import { Response, Request } from "express";
import session from "express-session";
import Redis from "ioredis";
export interface UserSession {
    userId?:number
}
export type MyContext = {
    em: EntityManager<IDatabaseDriver<Connection>>;
    res: Response;
    redis: Redis;
    req: Request & {session?: Partial<session.Session & session.SessionData> & UserSession};
}