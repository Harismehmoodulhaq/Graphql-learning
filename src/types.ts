import { EntityManager, IDatabaseDriver, Connection } from "@mikro-orm/core"
import { Response, Request } from "express";
import session from "express-session";
export interface UserSession {
    userId?:number
}
export type MyContext = {
    em: EntityManager<IDatabaseDriver<Connection>>;
    res: Response;
    req: Request & {session?: Partial<session.Session & session.SessionData> & UserSession};
}