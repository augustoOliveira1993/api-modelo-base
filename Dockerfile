FROM node:20-alpine AS dependencies

WORKDIR /app

COPY package.json yarn.lock* ./
RUN yarn install --frozen-lockfile

FROM node:20-alpine AS builder

WORKDIR /app

COPY --from=dependencies /app/node_modules ./node_modules
COPY . .
RUN yarn build

FROM node:20-alpine AS production

# tini como PID 1: sem ele o SIGTERM do `docker stop` não chega ao processo Node
# e o graceful shutdown (src/shared/infra/https/shutdown.ts) nunca executa.
RUN apk add --no-cache tini

WORKDIR /app

ENV NODE_ENV=production

COPY package.json yarn.lock* ./
RUN yarn install --frozen-lockfile --production && yarn cache clean

COPY --from=builder /app/dist ./dist

# `node` é um usuário sem privilégios já presente na imagem oficial.
RUN mkdir -p logs tmp && chown -R node:node /app
USER node

EXPOSE 4005

HEALTHCHECK --interval=30s --timeout=3s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||4005)+'/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

ENTRYPOINT ["/sbin/tini", "--"]
CMD ["node", "dist/shared/infra/https/server.js"]
