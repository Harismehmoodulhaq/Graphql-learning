import { MikroORM } from "@mikro-orm/core";
import express from 'express';
import "reflect-metadata";
import { COOKIE_NAME, __prod__ } from "./constants";
import { Post } from "./entities/Post";
import microConfig from "./mikro-orm.config";
// import https from 'https';
// import fs from 'fs';
import { ApolloServer } from 'apollo-server-express';
import connectRedis from "connect-redis";
import session from "express-session";
import { createClient } from "redis";
import Redis from "ioredis"
import { buildSchema } from "type-graphql";
import { HelloResolver } from "./resolvers/hello";
import { PostResolver } from "./resolvers/post";
import { UserResolver } from "./resolvers/user";

import { ApolloServerPluginLandingPageGraphQLPlayground } from 'apollo-server-core';
import { MyContext } from "./types";
// import path from "path";
import cors from "cors";
// import { User } from "./entities/User";

const main = async () => {
  const orm = await MikroORM.init(microConfig);
  // await orm.em.nativeDelete(User, {})
  await orm.getMigrator().up();
  const app = express();



  app.set("trust proxy", true);

  app.set("Access-Control-Allow-Origin", 'https://studio.apollographql.com')
  app.set("Access-Control-Allow-Credentials", true)

  const RedisStore = connectRedis(session);
  const redisClient = createClient({
    url: 'redis://127.0.0.1', legacyMode: true,
  })
  const redis = new Redis();


  await redisClient.connect();

  app.use(
    cors({
      origin: "http://localhost:3000",
      credentials: true
    })
  )

  app.use(
    session({
      name: COOKIE_NAME,
      store: new RedisStore({ client: redisClient, disableTouch: true, disableTTL: true }),
      secret: "keyboard cat",
      resave: false,
      saveUninitialized: false,
      cookie: {
        maxAge: 1000 * 60 * 60 * 24 * 365 * 10, // 10 years
        httpOnly: true,
        sameSite: "lax",
        secure: __prod__,
      },
    })
  )


  // const Cors = cors({
  //   credentials: true,
  //   origin: ['https://studio.apollographql.com']
  // }) 

  // const httpsServer = https.createServer({
  //   key: fs.readFileSync(path.join(__dirname, 'server.key'), 'utf-8'),
  //   cert: fs.readFileSync(path.join(__dirname, 'server.cert'), 'utf-8')
  // }, app)

  const apolloServer = new ApolloServer({

    plugins: [ApolloServerPluginLandingPageGraphQLPlayground({
      // options

    })],
    schema: await buildSchema({
      resolvers: [HelloResolver, PostResolver, UserResolver],
      validate: false,
    }),
    context: ({ res, req }): MyContext => {
      return { em: orm.em, res, req, redis }
    }
  })

  await apolloServer.start();
  apolloServer.applyMiddleware({ app, cors: false });



  app.listen(4000, () => {
    console.log('server started')
  })

  // const post = orm.em.create(Post, {title: 'my first post'} as Post);
  // await orm.em.persistAndFlush(post);

  const posts = await orm.em.find(Post, {});
  console.log(posts);
};

main().catch(err => {
  console.error(err)
});
