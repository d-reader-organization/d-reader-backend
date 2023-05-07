FROM node:18-slim AS builder
WORKDIR /app
ENV PORT 3005
EXPOSE 3005
HEALTHCHECK CMD curl -f http://localhost:3005/app/healthcheck || exit 1
LABEL org.opencontainers.image.source https://github.com/bdeak4/d-reader-backend

RUN apt-get update && apt-get install -y curl cron git && apt-get clean && rm -rf /var/lib/apt/lists/*

COPY package.json yarn.lock ./
COPY prisma ./prisma/

RUN yarn install --immutable && yarn cache clean

COPY . .

RUN yarn prebuild && yarn build

CMD [ "yarn", "start:prod" ]
