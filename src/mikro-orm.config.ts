import { __prod__ } from "./constants";
import { Post } from "./entities/Post";
import { MikroORM } from "@mikro-orm/core";
import path from "path";
import { User } from "./entities/User";

export default {
  migrations: {
    path: path.join(__dirname, "./migrations"),
    pattern: /^[\w-]+\d+\.[tj]s@/,
  },
  entities: [Post, User],
  dbName: "lireddit",
  type: "postgresql",
  debug: !__prod__,
  password: 'haris123',
  user: 'abdullah',
  allowGlobalContext: true,
} as Parameters<typeof MikroORM.init>[0];
// type x = Re<typeof MikroORM.init>
/* 

 TODO: How to login as user in postgres sell
* psql -U postgres
 TODO: How to create user in postgres
* createuser <username>
 TODO: How to create db in postgres
* createdb <dbname>
* alter user <username> with encrypted password '<set your password>'
* grant all privileges on database <databasename> to <username>


https://hevodata.com/learn/pgadmin-docker/
*/


/* 
docker run -p 5050:80 \
    -e "PGADMIN_DEFAULT_EMAIL=user@domain.com" \
    -e "PGADMIN_DEFAULT_PASSWORD=SuperSecret" \
    -d dpage/pgadmin4
*/