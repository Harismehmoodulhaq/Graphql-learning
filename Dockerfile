FROM node:18-alpine3.14
RUN apk add --update --no-cache \
    curl \
    git \
    nano \
    vim

RUN mkdir -p /home/node/app/node_modules && chown  -R node:node /home/node/app
USER node
WORKDIR /home/node/app
COPY package*.json .
COPY --chown=node:node . .
RUN yarn install
EXPOSE 4500
CMD [ "yarn", "dev" ]