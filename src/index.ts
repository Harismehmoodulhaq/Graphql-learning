import "reflect-metadata";
import { MikroORM } from "@mikro-orm/core";
import { __prod__ } from "./constants";
import { Post } from "./entities/Post";
import microConfig from "./mikro-orm.config";
import express from 'express';
// import https from 'https';
// import fs from 'fs';
import { ApolloServer } from 'apollo-server-express'
import { buildSchema } from "type-graphql";
import { HelloResolver } from "./resolvers/hello";
import { PostResolver } from "./resolvers/post";
import { UserResolver } from "./resolvers/user";
import { createClient } from "redis";
import session from "express-session";
import connectRedis from "connect-redis"

import { MyContext } from "./types";
import { ApolloServerPluginLandingPageGraphQLPlayground } from 'apollo-server-core';

// console.log(process.cwd())

const main = async () => {
  const orm = await MikroORM.init(microConfig);
  await orm.getMigrator().up();
  const app = express();

  app.set("trust proxy", true);

  app.set("Access-Control-Allow-Origin", 'https://studio.apollographql.com')
  app.set("Access-Control-Allow-Credentials", true)

  const RedisStore = connectRedis(session);
  const redisClient = createClient({
    url: 'redis://127.0.0.1', legacyMode: true,
  })


  await redisClient.connect();



  app.use(
    session({
      name: "qid",
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
    
    plugins: [ ApolloServerPluginLandingPageGraphQLPlayground({
      // options
      
    })],
    schema: await buildSchema({
      resolvers: [HelloResolver, PostResolver, UserResolver],
      validate: false,
    }),
    context: ({ res, req }): MyContext => ({ em: orm.em, res, req }) 
  })

  await apolloServer.start();
  apolloServer.applyMiddleware({ app });

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
